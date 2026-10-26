import logging
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from workspace.models import Workspace
from .models import Document, DocumentChunk, Request, RequestStatus, UsageEvent, DocumentStatus
from .serializers import (
    AskRequestSerializer, AskResponseSerializer, ChunkRefSerializer,
    RequestHistorySerializer,UsageSummarySerializer, RequestDetailSerializer, DocumentSerializer
)
from .services import (
    retrieve_context, build_rag_prompt, generate_llm_response,check_usage_limit,UsageLimitExceeded,get_usage_summary
)

logger = logging.getLogger(__name__)

# Below this, treat as no answer without calling the LLM.
MIN_SIMILARITY = 0.30

from datetime import datetime
from django.utils import timezone
from django.utils.timezone import is_aware, make_aware
from django.core.files.storage import default_storage

from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from .services.upload import create_document



def _seconds_until_reset(resets_at_iso: str) -> str:
    resets = datetime.fromisoformat(resets_at_iso)
    if not is_aware(resets):
        resets = make_aware(resets)
    delta = (resets - timezone.now()).total_seconds()
    return str(max(0, int(delta)))

class AskView(APIView):
    """
    POST /api/v1/workspaces/<uuid:id>/ask/
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(request=AskRequestSerializer, responses={200: AskResponseSerializer})
    def post(self, request, id):
        ws = get_object_or_404(Workspace, id=id, members__user=request.user)

        ser = AskRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        question = ser.validated_data["question"]
        excluded = [str(x) for x in ser.validated_data.get("excluded_document_ids", [])]


        try:
            check_usage_limit(request.user)
        except UsageLimitExceeded as e:
            logger.info("usage limit blocked ask user=%s used=%s limit=%s",
                        request.user.id, e.summary["used_tokens"], e.summary["limit_tokens"])
            return Response(
                {
                    "detail": "Usage limit exceeded. Try again when your window resets.",
                    "usage": e.summary,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": _seconds_until_reset(e.summary["resets_at"])},
            )

        # Validate exclusion ownership (defense in depth — retrieval also filters)
        if excluded:
            owned = set(
                Document.objects
                .filter(workspace=ws, owner=request.user, id__in=excluded)
                .values_list("id", flat=True)
            )
            if {str(x) for x in owned} != set(excluded):
                return Response(
                    {"excluded_document_ids": ["One or more IDs are invalid or not yours."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        req = Request.objects.create(
            user=request.user, workspace=ws, question=question,
            answer="", excluded_document_ids=excluded,
            status=RequestStatus.PENDING,
        )

        try:
            chunks, raw, reranked_flag = retrieve_context(
                workspace_id=ws.id, user_id=request.user.id,
                query=question, excluded_document_ids=excluded,
                top_k=3, candidate_limit=8,
            )

            # Groundedness gate: nothing relevant → NOT_FOUND, do NOT call LLM
            if not chunks or max(c["similarity"] for c in chunks) < MIN_SIMILARITY:
                req.status = RequestStatus.NOT_FOUND
                req.answer = "I couldn't find this in your documents."
                req.save(update_fields=["status", "answer"])
                return Response({
                    "request_id": str(req.id),
                    "answer": req.answer,
                    "status": req.status,
                    "citations": [],
                    "tokens_in": 0, "tokens_out": 0,
                    "retrieval_used": False, "reranked": False,
                })

            prompt = build_rag_prompt(question=question, chunks=chunks)
            answer, usage = generate_llm_response(prompt)

            chunk_ids = [c["chunk_id"] for c in chunks]
            req.answer = answer
            req.status = RequestStatus.SUCCESS
            req.retrieved_chunk_ids = chunk_ids
            req.tokens_in = usage["input"]
            req.tokens_out = usage["output"]
            req.save(update_fields=["answer", "status", "retrieved_chunk_ids",
                                     "tokens_in", "tokens_out"])

            UsageEvent.objects.create(user=request.user, request=req, tokens=usage["total"])

            citations = ChunkRefSerializer(
                DocumentChunk.objects.filter(id__in=chunk_ids), many=True
            ).data

            return Response({
                "request_id": str(req.id),
                "answer": answer,
                "status": req.status,
                "citations": citations,
                "tokens_in": usage["input"],
                "tokens_out": usage["output"],
                "retrieval_used": True,
                "reranked": reranked_flag,
            })

        except Exception as e:
            logger.exception("ask failed")
            req.status = RequestStatus.FAILED
            req.answer = ""
            req.save(update_fields=["status", "answer"])
            return Response({"detail": "Generation failed."}, status=500)


class RequestHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=RequestHistorySerializer(many=True))
    def get(self, request, id):
        ws = get_object_or_404(Workspace, id=id, members__user=request.user)
        qs = (
            Request.objects
            .filter(workspace=ws, user=request.user)   # per-user history
            .order_by("-created_at")
        )
        return Response(RequestHistorySerializer(qs, many=True).data)


class UsageSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UsageSummarySerializer)
    def get(self, request):
        return Response(get_usage_summary(request.user))


class RequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=RequestDetailSerializer)
    def get(self, request, id, request_id):
        ws = get_object_or_404(Workspace, id=id, members__user=request.user)
        req = get_object_or_404(
            Request, id=request_id, workspace=ws, user=request.user,
        )
        return Response(RequestDetailSerializer(req).data)


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={204: None})
    def delete(self, request, id, doc_id):
        ws = get_object_or_404(Workspace, id=id, members__user=request.user)
        doc = get_object_or_404(Document, id=doc_id, workspace=ws)
        if doc.owner_id != request.user.id:
            return Response(
                {"detail": "Only the uploader can delete this document."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Chunks cascade via FK on_delete=CASCADE
        storage_key = doc.storage_key
        doc.delete()
        try:
            default_storage.delete(storage_key)
        except Exception:
            logger.warning("orphan file on disk: %s", storage_key)
        return Response(status=status.HTTP_204_NO_CONTENT)



class DocumentListCreateView(APIView):
    """
    GET  /api/v1/workspaces/<uuid:id>/documents/   — list documents in the workspace
    POST /api/v1/workspaces/<uuid:id>/documents/   — upload a PDF or TXT (multipart, field `file`)
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(responses=DocumentSerializer(many=True))
    def get(self, request, id):
        ws = get_object_or_404(Workspace, id=id, members__user=request.user)
        qs = ws.documents.select_related("owner").order_by("-created_at")
        return Response(DocumentSerializer(qs, many=True).data)

    @extend_schema(
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {"file": {"type": "string", "format": "binary"}},
                "required": ["file"],
            }
        },
        responses={201: DocumentSerializer},
    )
    def post(self, request, id):
        ws = get_object_or_404(Workspace, id=id, members__user=request.user)

        uploaded = request.FILES.get("file")
        if not uploaded:
            raise ValidationError({"file": ["This field is required."]})

        try:
            doc = create_document(workspace=ws, user=request.user, uploaded_file=uploaded)
        except ValueError as e:
            return Response({"file": [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)