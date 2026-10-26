from django.db import models
import uuid
from django.contrib.auth import get_user_model
from pgvector.django import VectorField

User = get_user_model()



class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="workspaces")
    name = models.CharField(max_length=50,default="Untitled Workspace")
    created_at = models.DateTimeField(auto_now_add=True)

class WorkspaceMember(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="workspace_members")
    joined_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ("workspace", "user")
class WorkspaceInvite(models.Model):
    workspace = models.ForeignKey(Workspace,on_delete=models.CASCADE, related_name="invites")
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT,related_name="invites")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    max_uses = models.PositiveIntegerField(default=1)
    uses = models.PositiveIntegerField(default=0)

