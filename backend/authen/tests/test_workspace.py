import pytest
from rest_framework.test import APIClient
from workspace.models import Workspace, WorkspaceMember
from documents.tests.factories import make_user, make_workspace, add_member, auth_client


@pytest.mark.django_db
class TestWorkspaceCreate:
    def test_positive_creator_is_member_and_owner(self):
        u = make_user()
        r = auth_client(u).post("/api/v1/workspaces/", {"name": "Alpha"})
        assert r.status_code == 201
        assert r.data["role"] == "owner"
        assert r.data["member_count"] == 1
        ws = Workspace.objects.get(id=r.data["id"])
        assert ws.created_by_id == u.id
        assert WorkspaceMember.objects.filter(workspace=ws, user=u).exists()

    def test_negative_missing_name(self):
        u = make_user()
        r = auth_client(u).post("/api/v1/workspaces/", {})
        assert r.status_code == 400
        assert "name" in r.data

    def test_negative_whitespace_name(self):
        u = make_user()
        r = auth_client(u).post("/api/v1/workspaces/", {"name": "   "})
        assert r.status_code == 400

    def test_negative_name_too_long(self):
        u = make_user()
        r = auth_client(u).post("/api/v1/workspaces/", {"name": "x" * 51})
        assert r.status_code == 400

    def test_requires_auth(self):
        assert APIClient().post("/api/v1/workspaces/", {"name": "A"}).status_code == 401


@pytest.mark.django_db
class TestWorkspaceList:
    def test_only_returns_my_workspaces(self):
        a, b = make_user("a"), make_user("b")
        wa = make_workspace(a, "A-ws")
        wb = make_workspace(b, "B-ws")
        r = auth_client(a).get("/api/v1/workspaces/")
        assert r.status_code == 200
        ids = [x["id"] for x in r.data]
        assert str(wa.id) in ids
        assert str(wb.id) not in ids

    def test_includes_workspaces_i_was_invited_to(self):
        owner = make_user("o")
        invitee = make_user("i")
        ws = make_workspace(owner)
        add_member(ws, invitee)
        r = auth_client(invitee).get("/api/v1/workspaces/")
        assert any(x["id"] == str(ws.id) for x in r.data)
        # invited user's role is member, not owner
        row = next(x for x in r.data if x["id"] == str(ws.id))
        assert row["role"] == "member"


@pytest.mark.django_db
class TestWorkspaceDetail:
    def test_member_can_view(self):
        owner = make_user("o"); member = make_user("m")
        ws = make_workspace(owner); add_member(ws, member)
        r = auth_client(member).get(f"/api/v1/workspaces/{ws.id}/")
        assert r.status_code == 200

    def test_non_member_gets_404_not_403(self):
        owner = make_user("o"); stranger = make_user("s")
        ws = make_workspace(owner)
        r = auth_client(stranger).get(f"/api/v1/workspaces/{ws.id}/")
        assert r.status_code == 404

    def test_nonexistent_workspace_404(self):
        u = make_user()
        r = auth_client(u).get("/api/v1/workspaces/00000000-0000-0000-0000-000000000000/")
        assert r.status_code == 404