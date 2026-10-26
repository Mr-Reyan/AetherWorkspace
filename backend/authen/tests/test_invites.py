import pytest
from datetime import timedelta
from django.utils import timezone
from workspace.models import WorkspaceInvite, WorkspaceMember
from documents.tests.factories import make_user, make_workspace, add_member, auth_client


@pytest.mark.django_db
class TestInviteCreate:
    def test_owner_can_create(self):
        owner = make_user(); ws = make_workspace(owner)
        r = auth_client(owner).post(f"/api/v1/workspaces/{ws.id}/invites/", {"max_uses": 3})
        assert r.status_code == 201
        assert r.data["max_uses"] == 3 and r.data["uses"] == 0
        assert r.data["token"]
        assert r.data["redeem_url"].endswith(r.data["token"] + "/")

    def test_member_not_owner_403(self):
        owner = make_user("o"); member = make_user("m")
        ws = make_workspace(owner); add_member(ws, member)
        r = auth_client(member).post(f"/api/v1/workspaces/{ws.id}/invites/", {})
        assert r.status_code == 403

    def test_non_member_404(self):
        owner = make_user("o"); stranger = make_user("s")
        ws = make_workspace(owner)
        r = auth_client(stranger).post(f"/api/v1/workspaces/{ws.id}/invites/", {})
        assert r.status_code == 404

    def test_max_uses_out_of_range(self):
        owner = make_user(); ws = make_workspace(owner)
        r = auth_client(owner).post(f"/api/v1/workspaces/{ws.id}/invites/", {"max_uses": 0})
        assert r.status_code == 400
        r = auth_client(owner).post(f"/api/v1/workspaces/{ws.id}/invites/", {"max_uses": 999})
        assert r.status_code == 400

    def test_expires_in_past_rejected(self):
        owner = make_user(); ws = make_workspace(owner)
        past = (timezone.now() - timedelta(days=1)).isoformat()
        r = auth_client(owner).post(f"/api/v1/workspaces/{ws.id}/invites/", {"expires_at": past})
        assert r.status_code == 400

    def test_expires_too_far_future_rejected(self):
        owner = make_user(); ws = make_workspace(owner)
        far = (timezone.now() + timedelta(days=100)).isoformat()
        r = auth_client(owner).post(f"/api/v1/workspaces/{ws.id}/invites/", {"expires_at": far})
        assert r.status_code == 400


@pytest.mark.django_db
class TestInviteRedeem:
    def _make_invite(self, owner, ws, **kwargs):
        data = {"max_uses": 1}
        data.update(kwargs)
        return WorkspaceInvite.objects.create(
            workspace=ws, created_by=owner,
            token="test-token-abc",
            expires_at=timezone.now() + timedelta(days=7),
            **{k: v for k, v in data.items() if k != "token"},
        )

    def test_positive_joins(self):
        owner = make_user("o"); invitee = make_user("i")
        ws = make_workspace(owner)
        inv = self._make_invite(owner, ws)
        r = auth_client(invitee).post(f"/api/v1/workspaces/join/{inv.token}/")
        assert r.status_code == 200
        assert WorkspaceMember.objects.filter(workspace=ws, user=invitee).exists()
        inv.refresh_from_db()
        assert inv.uses == 1

    def test_idempotent_redeem_does_not_burn_use(self):
        owner = make_user("o"); invitee = make_user("i")
        ws = make_workspace(owner)
        inv = self._make_invite(owner, ws, max_uses=2)
        c = auth_client(invitee)
        r1 = c.post(f"/api/v1/workspaces/join/{inv.token}/")
        r2 = c.post(f"/api/v1/workspaces/join/{inv.token}/")
        assert r1.status_code == 200 and r2.status_code == 200
        inv.refresh_from_db()
        assert inv.uses == 1
        assert WorkspaceMember.objects.filter(workspace=ws, user=invitee).count() == 1

    def test_expired_returns_410(self):
        owner = make_user("o"); invitee = make_user("i")
        ws = make_workspace(owner)
        inv = self._make_invite(owner, ws)
        inv.expires_at = timezone.now() - timedelta(seconds=1)
        inv.save()
        r = auth_client(invitee).post(f"/api/v1/workspaces/join/{inv.token}/")
        assert r.status_code == 410

    def test_exhausted_returns_410(self):
        owner = make_user("o"); a = make_user("a"); b = make_user("b")
        ws = make_workspace(owner)
        inv = self._make_invite(owner, ws, max_uses=1)
        auth_client(a).post(f"/api/v1/workspaces/join/{inv.token}/")
        r = auth_client(b).post(f"/api/v1/workspaces/join/{inv.token}/")
        assert r.status_code == 410

    def test_invalid_token_404(self):
        u = make_user()
        r = auth_client(u).post("/api/v1/workspaces/join/does-not-exist/")
        assert r.status_code == 404

    def test_requires_auth(self):
        from rest_framework.test import APIClient
        r = APIClient().post("/api/v1/workspaces/join/x/")
        assert r.status_code == 401