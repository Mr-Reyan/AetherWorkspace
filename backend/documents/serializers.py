from rest_framework import serializers
from .models import Document, DocumentChunk, Request, UsageEvent


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.CharField(source="owner.username", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)
    chunk_count = serializers.IntegerField(source="chunks.count", read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "workspace_id",
            "filename",
            "mime",
            "size_bytes",
            "status",
            "error",
            "uploaded_by",
            "owner_username",
            "owner_id",
            "chunk_count",
            "created_at",
        ]
        read_only_fields = fields


class ChunkRefSerializer(serializers.ModelSerializer):
    document_name = serializers.CharField(source="document.filename", read_only=True)
    class Meta:
        model = DocumentChunk
        fields = ["id", "chunk_index", "content", "document_name"]
        read_only_fields = fields


class AskRequestSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=2000, trim_whitespace=True)
    excluded_document_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )


class AskResponseSerializer(serializers.Serializer):
    request_id = serializers.UUIDField()
    answer = serializers.CharField()
    status = serializers.CharField()
    citations = ChunkRefSerializer(many=True)
    tokens_in = serializers.IntegerField()
    tokens_out = serializers.IntegerField()
    retrieval_used = serializers.BooleanField()
    reranked = serializers.BooleanField()


class RequestHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields = ["id", "question", "answer", "status", "tokens_in", "tokens_out",
                  "retrieved_chunk_ids", "created_at"]
        read_only_fields = fields

class UsageSummarySerializer(serializers.Serializer):
    used_tokens = serializers.IntegerField()
    limit_tokens = serializers.IntegerField()
    remaining_tokens = serializers.IntegerField()
    window_days = serializers.IntegerField()
    resets_at = serializers.DateTimeField()
    is_exceeded = serializers.BooleanField()


class RequestDetailSerializer(serializers.ModelSerializer):
    citations = serializers.SerializerMethodField()
    class Meta:
        model = Request
        fields = ["id", "question", "answer", "status",
                  "tokens_in", "tokens_out", "citations", "created_at"]
        read_only_fields = fields

    def get_citations(self, obj):
        ids = obj.retrieved_chunk_ids or []
        if not ids:
            return []
        chunks = DocumentChunk.objects.filter(id__in=ids).select_related("document")
        # Preserve the original ranking order
        by_id = {str(c.id): c for c in chunks}
        return [
            {
                "chunk_id": cid,
                "chunk_index": by_id[cid].chunk_index,
                "document_name": by_id[cid].document.filename,
                "content": by_id[cid].content,
            }
            for cid in ids if cid in by_id
        ]