import pytest
from unittest.mock import patch
from documents.models import Request

from documents.tests.factories import (
    make_user, make_workspace, auth_client, make_document, make_chunk,
)


@pytest.mark.django_db
class TestUsageLimit:
    def setup_method(self):
        self.u = make_user()
        self.ws = make_workspace(self.u)
        doc = make_document(self.ws, self.u); make_chunk(doc, content="answer")
        self.c = auth_client(self.u)

    @patch("documents.services.retrieval.embed_one", return_value=[0.9] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    @patch("documents.views.generate_llm_response",
           return_value=("ok", {"input": 100, "output": 100, "total": 200}))
    def test_second_ask_returns_429(self, _gen, _rr, _emb, settings):
        settings.USAGE_TOKEN_LIMIT_30D = 200
        r1 = self.c.post(f"/api/v1/workspaces/{self.ws.id}/ask/", {"question": "q1"})
        assert r1.status_code == 200

        r2 = self.c.post(f"/api/v1/workspaces/{self.ws.id}/ask/", {"question": "q2"})
        assert r2.status_code == 429
        assert "Retry-After" in r2.headers
        assert r2.data["usage"]["is_exceeded"] is True
        assert Request.objects.filter(user=self.u).count() == 1

    @patch("documents.services.retrieval.embed_one", return_value=[0.9] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    @patch("documents.views.generate_llm_response",
           return_value=("ok", {"input": 50, "output": 50, "total": 100}))
    def test_usage_endpoint_reflects_usage(self, _gen, _rr, _emb, settings):
        settings.USAGE_TOKEN_LIMIT_30D = 200
        self.c.post(f"/api/v1/workspaces/{self.ws.id}/ask/", {"question": "q1"})
        r = self.c.get("/api/v1/usage/")
        assert r.status_code == 200
        assert r.data["used_tokens"] == 100
        assert r.data["limit_tokens"] == 200
        assert r.data["is_exceeded"] is False

@pytest.mark.django_db
class TestUsagePerUser:
    @patch("documents.services.retrieval.embed_one", return_value=[0.9] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    @patch("documents.views.generate_llm_response",
           return_value=("ok", {"input": 10, "output": 10, "total": 20}))
    def test_user_a_usage_does_not_affect_user_b(self, _gen, _rr, _emb):
        a, b = make_user("a"), make_user("b")
        ws = make_workspace(a); from documents.tests.factories import add_member
        add_member(ws, b)
        doc_a = make_document(ws, a); make_chunk(doc_a, content="a's answer")
        doc_b = make_document(ws, b); make_chunk(doc_b, content="b's answer")

        auth_client(a).post(f"/api/v1/workspaces/{ws.id}/ask/", {"question": "q"})
        r = auth_client(b).get("/api/v1/usage/")
        assert r.data["used_tokens"] == 0