import pytest
from unittest.mock import patch
from documents.models import Request
from documents.tests.factories import (
    make_user, make_workspace, add_member, auth_client,
    make_document, make_chunk,
)


@pytest.mark.django_db
class TestHistory:
    def test_only_own_requests_visible(self):
        a, b = make_user("a"), make_user("b")
        ws = make_workspace(a); add_member(ws, b)
        Request.objects.create(user=a, workspace=ws, question="a's q",
                               answer="a", status="success")
        Request.objects.create(user=b, workspace=ws, question="b's q",
                               answer="b", status="success")
        r = auth_client(a).get(f"/api/v1/workspaces/{ws.id}/requests/")
        assert r.status_code == 200
        qs = [x["question"] for x in r.data]
        assert "a's q" in qs and "b's q" not in qs

    def test_detail_404_for_other_users_request(self):
        a, b = make_user("a"), make_user("b")
        ws = make_workspace(a); add_member(ws, b)
        req_a = Request.objects.create(user=a, workspace=ws, question="a's q",
                                       answer="a", status="success")
        r = auth_client(b).get(f"/api/v1/workspaces/{ws.id}/requests/{req_a.id}/")
        assert r.status_code == 404

    def test_detail_resolves_citations(self):
        a = make_user("a")
        ws = make_workspace(a)
        doc = make_document(ws, a)
        chunk = make_chunk(doc, content="evidence", index=0)
        req = Request.objects.create(user=a, workspace=ws, question="q",
                                     answer="a", status="success",
                                     retrieved_chunk_ids=[str(chunk.id)])
        r = auth_client(a).get(f"/api/v1/workspaces/{ws.id}/requests/{req.id}/")
        assert r.status_code == 200
        assert r.data["citations"][0]["content"] == "evidence"