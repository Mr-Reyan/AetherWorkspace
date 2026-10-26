from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema

from .models import Workspace, WorkspaceMember
from .serializers import WorkspaceSerializer, WorkspaceCreateSerializer, InviteSerializer, InviteCreateSerializer, WorkspaceMemberSerializer, InviteCreateSerializer, InviteSerializer
from .services import create_workspace, create_invite, redeem_invite

from rest_framework.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError




class WorkspaceListCreateView(APIView):
    """
    GET  /api/v1/workspaces/   — list workspaces the current user belongs to
    POST /api/v1/workspaces/   — create a workspace (creator becomes member + owner)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=WorkspaceSerializer(many=True))
    def get(self, request):
        qs = (
            Workspace.objects
            .filter(members__user=request.user)
            .select_related("created_by")
            .prefetch_related("members")
            .order_by("-created_at")
        )
        data = WorkspaceSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

    @extend_schema(request=WorkspaceCreateSerializer, responses={201: WorkspaceSerializer})
    def post(self, request):
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ws = create_workspace(user=request.user, name=serializer.validated_data["name"])

        return Response(
            WorkspaceSerializer(ws, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class WorkspaceDetailView(APIView):
    """
    GET /api/v1/workspaces/<uuid:id>/
    Only members can view.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=WorkspaceSerializer)
    def get(self, request, id):
        ws = get_object_or_404(
            Workspace.objects.select_related("created_by").prefetch_related("members"),
            id=id,
            members__user=request.user,      # <-- authorization baked into the query
        )
        return Response(WorkspaceSerializer(ws, context={"request": request}).data)



class WorkspaceInviteCreateView(APIView):
    """
    POST /api/v1/workspaces/<uuid:id>/invites/
    Owner only.
    """
    permission_classes=[IsAuthenticated]

    @extend_schema(request=InviteCreateSerializer, responses={201: InviteSerializer})
    def post(self, request, id):
        ws = get_object_or_404(Workspace, id= id, members__user=request.user)

        if ws.created_by_id != request.user.id:
            raise PermissionDenied("Only the workspace owner can create invites.")
        serializer = InviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            invite = create_invite(
                workspace=ws,
                created_by=request.user,
                expires_at=serializer.validated_data.get("expires_at"),
                max_uses=serializer.validated_data.get("max_uses", 1),
            )
        except DjangoValidationError as e:
            return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            InviteSerializer(invite, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

class JoinWorkspaceView(APIView):
    """
    POST /api/v1/workspaces/join/<str:token>/
    Idempotent. Any authenticated user can redeem.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: WorkspaceSerializer})
    def post(self, request, token):
        try:
            ws, already_member = redeem_invite(token=token, user=request.user)
        except DjangoValidationError as e:
            # Map messages to a semantic status where possible
            msg = e.messages[0]
            if "invalid" in msg.lower():
                return Response({"detail": msg}, status=status.HTTP_404_NOT_FOUND)
            return Response({"detail": msg}, status=status.HTTP_410_GONE)

        return Response(
            WorkspaceSerializer(ws, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )