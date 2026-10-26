from django.db import models
import uuid
from django.contrib.auth import get_user_model
from pgvector.django import VectorField

from workspace.models import Workspace

User = get_user_model()

class DocumentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    READY = "ready", "Ready"
    FAILED = "failed", "Failed"

class Document(models.Model):


    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="documents")
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name="documents")
    filename = models.CharField(max_length=255)
    mime = models.CharField(max_length=100)
    size_bytes = models.PositiveIntegerField()
    storage_key = models.CharField(max_length=512)   # path in storage
    status = models.CharField(max_length=16, choices=DocumentStatus.choices, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    error = models.TextField(blank=True) 
    class Meta:
        indexes = [
            models.Index(fields=["workspace", "owner"]),
            models.Index(fields=["status"]),
        ]

class DocumentChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.IntegerField()
    content = models.TextField()
    embedding = VectorField(dimensions=768)
    class Meta:
        unique_together = ("document", "chunk_index")
        indexes = [models.Index(fields=["document"])]


class RequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"
    NOT_FOUND = "not_found", "Not found in documents"
class Request(models.Model):


    user = models.ForeignKey(User,on_delete=models.PROTECT, related_name="requests")
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="requests")
    question = models.TextField()
    answer = models.TextField(blank=True)
    retrieved_chunk_ids = models.JSONField(default=list, blank=True)
    excluded_document_ids = models.JSONField(default=list, blank=True)
    tokens_in  = models.PositiveIntegerField(default=0)
    tokens_out = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=RequestStatus.choices, default=RequestStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

class UsageEvent(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT,related_name="usage")
    request = models.ForeignKey(Request, on_delete=models.PROTECT, related_name="usage")
    tokens = models.PositiveIntegerField()
    occurred_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ("request",)