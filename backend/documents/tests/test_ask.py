import pytest
from unittest.mock import patch
from documents.models import Request, RequestStatus, UsageEvent, DocumentStatus
from documents.tests.factories import (
    make_user, make_workspace, add_member, auth_client,
    make_document, make_chunk,
)


@pytest.fixture
def setup(django_db_setup):
    owner = make_user("owner")
    ws = make_workspace(owner, "ws")
    doc = make_document(ws, owner, filename="a.pdf")
    make_chunk(doc, content="The capital of Togo is Lomé.", index=0)
    client = auth_client(owner)
    return {"owner": owner, "ws": ws, "doc": doc, "client": client}


@pytest.mark.django_db
class TestAskSuccess:
    @patch("documents.services.retrieval.embed_one", return_value=[0.9] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    @patch("documents.views.generate_llm_response",
           return_value=("Lomé is the capital.", {"input": 100, "output": 20, "total": 120}))
    def test_positive_writes_request_and_usage(self, _gen, _rr, _emb, setup):
        r = setup["client"].post(f"/api/v1/workspaces/{setup['ws'].id}/ask/",
                                 {"question": "What is the capital of Togo?"})
        assert r.status_code == 200
        assert r.data["status"] == RequestStatus.SUCCESS
        assert "Lomé" in r.data["answer"]
        req = Request.objects.get(id=r.data["request_id"])
        assert req.tokens_in == 100 and req.tokens_out == 20
        assert UsageEvent.objects.filter(request=req, user=setup["owner"]).count() == 1

    @patch("documents.views.retrieve_context",
       return_value=([{"chunk_id": "x", "content": "", "document_name": "",
                       "chunk_index": 0, "similarity": 0.05}], [], False))
    def test_low_similarity_skips_llm_and_marks_not_found(self, _retrieval, setup):
        with patch("documents.views.generate_llm_response") as gen:
            r = setup["client"].post(f"/api/v1/workspaces/{setup['ws'].id}/ask/",
                                    {"question": "unrelated question"})
        assert r.status_code == 200
        assert r.data["status"] == RequestStatus.NOT_FOUND
        gen.assert_not_called()

    @patch("documents.services.retrieval.embed_one", return_value=[0.9] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    @patch("documents.views.generate_llm_response",
           side_effect=RuntimeError("LLM down"))
    def test_llm_failure_marks_failed(self, _gen, _rr, _emb, setup):
        r = setup["client"].post(f"/api/v1/workspaces/{setup['ws'].id}/ask/",
                                 {"question": "anything"})
        assert r.status_code == 500
        req = Request.objects.order_by("-created_at").first()
        assert req.status == RequestStatus.FAILED


@pytest.mark.django_db
class TestAskIsolation:
    @patch("documents.services.retrieval.embed_one", return_value=[0.9] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    @patch("documents.views.generate_llm_response",
           return_value=("I couldn't find this in your documents.",
                         {"input": 10, "output": 5, "total": 15}))
    def test_member_cannot_query_other_members_docs(self, _gen, _rr, _emb):
        a = make_user("a"); b = make_user("b")
        ws = make_workspace(a); add_member(ws, b)
        doc_a = make_document(ws, a)
        make_chunk(doc_a, content="A's secret")

        # b asks; retrieval should return nothing because owner filter applies
        r = auth_client(b).post(f"/api/v1/workspaces/{ws.id}/ask/",
                                {"question": "A's secret?"})
        assert r.status_code == 200
        assert r.data["status"] == RequestStatus.NOT_FOUND


@pytest.mark.django_db
class TestAskExclusions:
    @patch("documents.services.retrieval.embed_one", return_value=[0.9] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    def test_excluding_own_document_returns_not_found(self, _rr, _emb):
        u = make_user(); ws = make_workspace(u)
        d = make_document(ws, u); make_chunk(d, content="answer text")
        with patch("documents.views.generate_llm_response") as gen:
            r = auth_client(u).post(f"/api/v1/workspaces/{ws.id}/ask/",
                                    {"question": "anything",
                                     "excluded_document_ids": [str(d.id)]})
        assert r.data["status"] == RequestStatus.NOT_FOUND
        gen.assert_not_called()

    def test_cannot_exclude_other_users_document(self):
        a = make_user("a"); b = make_user("b")
        ws = make_workspace(a); add_member(ws, b)
        doc_a = make_document(ws, a)
        r = auth_client(b).post(f"/api/v1/workspaces/{ws.id}/ask/",
                                {"question": "anything",
                                 "excluded_document_ids": [str(doc_a.id)]})
        assert r.status_code == 400

    def test_malicious_uuid_payload_rejected(self):
        u = make_user(); ws = make_workspace(u)
        r = auth_client(u).post(f"/api/v1/workspaces/{ws.id}/ask/",
                                {"question": "x",
                                 "excluded_document_ids": ["'; DROP TABLE"]})
        assert r.status_code == 400