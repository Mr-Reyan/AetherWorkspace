from django.db import transaction
from .models import Workspace, WorkspaceMember


@transaction.atomic
def create_workspace(*, user, name: str) -> Workspace:
    ws = Workspace.objects.create(name=name, created_by=user)
    WorkspaceMember.objects.create(workspace=ws, user=user)
    return ws

import secrets
from datetime import timedelta
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import WorkspaceMember, Workspace, WorkspaceInvite

INVITE_MAX_TTL_DAYS = 30
INVITE_DEFAULT_TTL_DAYS = 7

def create_invite(*, workspace, created_by, expires_at=None, max_uses: int = 1) -> WorkspaceInvite:
    now = timezone.now()
    if expires_at is None:
        expires_at = now + timedelta(days=INVITE_DEFAULT_TTL_DAYS)

    if expires_at <= now:
        raise ValidationError("expires_at must be in the future.")

    if expires_at>now+timedelta(days=INVITE_MAX_TTL_DAYS):
        raise ValidationError(f"expires_at cannot be more than {INVITE_MAX_TTL_DAYS} days out.")
    if not (1<=max_uses<=100):
        raise ValidationError("max_uses must be between 1 and 100.")

    return WorkspaceInvite.objects.create(
        workspace=workspace,
        created_by=created_by,
        token=secrets.token_urlsafe(32),
        expires_at=expires_at,
        max_uses=max_uses,
    )


@transaction.atomic
def redeem_invite(*, token: str, user):
    """
    Returns (workspace, was_already_member: bool).
    Raises ValidationError on invalid/expired/exhausted token.
    """
    try:
        invite = (
            WorkspaceInvite.objects
            .select_for_update()
            .select_related("workspace")
            .get(token=token)
        )
    except WorkspaceInvite.DoesNotExist:
        raise ValidationError("Invite token is invalid.")

    now = timezone.now()
    if invite.expires_at <= now:
        raise ValidationError("Invite token has expired.")
    if invite.uses >= invite.max_uses:
        raise ValidationError("Invite token has been fully used.")

    # Idempotent: already a member → return without burning a use
    if WorkspaceMember.objects.filter(workspace=invite.workspace, user=user).exists():
        return invite.workspace, True

    # ── THIS WAS MISSING ────────────────────────────────────────────────
    WorkspaceMember.objects.create(workspace=invite.workspace, user=user)
    # ────────────────────────────────────────────────────────────────────

    invite.uses += 1
    invite.save(update_fields=["uses"])
    return invite.workspace, False