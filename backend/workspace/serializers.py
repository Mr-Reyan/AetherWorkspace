from rest_framework import serializers
from .models import Workspace, WorkspaceMember, WorkspaceInvite

class WorkspaceMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only = True)
    user_id = serializers.UUIDField(source="user.id", read_only = True)

    class Meta:
        model = WorkspaceMember
        fields = ["user_id", "username", "joined_at"]

class WorkspaceSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username",read_only=True)
    member_count = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id", "name", "created_by", "created_by_username",
            "member_count", "role", "created_at",
        ]
        read_only_fields = fields

    def get_member_count(self, obj):
        return obj.members.count()

    def get_role(self, obj):
        request = self.context.get("request")
        if request and obj.created_by_id == request.user.id:
            return "owner"
        return "member"

class WorkspaceCreateSerializer(serializers.Serializer):
    """Write serializer — only `name` is client-controlled."""
    name = serializers.CharField(
        max_length=50,
        trim_whitespace=True,
        allow_blank=False,
    )

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Workspace name cannot be empty.")
        return value





class InviteCreateSerializer(serializers.Serializer):
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    max_uses = serializers.IntegerField(required=False, default=1, min_value=1, max_value=100)


class InviteSerializer(serializers.ModelSerializer):
    redeem_url = serializers.SerializerMethodField()

    class Meta:
        model = WorkspaceInvite
        fields = ["id", "token", "expires_at", "max_uses", "uses", "created_at", "redeem_url"]
        read_only_fields = fields

    def get_redeem_url(self, obj):
        # Absolute URL so the frontend can share it directly
        request = self.context.get("request")
        path = f"/api/v1/workspaces/join/{obj.token}/"
        return request.build_absolute_uri(path) if request else path