import pytest
from unittest.mock import patch
from documents.models import DocumentStatus
from documents.services.retrieval import retrieve_context
from documents.tests.factories import (
    make_user, make_workspace, add_member, make_document, make_chunk,
)


@pytest.mark.django_db
class TestRetrievalIsolation:
    def setup_method(self):
        self.a = make_user("a"); self.b = make_user("b")
        self.ws = make_workspace(self.a); add_member(self.ws, self.b)

        self.doc_a = make_document(self.ws, self.a, filename="a.pdf")
        self.chunk_a = make_chunk(self.doc_a, content="secret-A", index=0)

        self.doc_b = make_document(self.ws, self.b, filename="b.pdf")
        self.chunk_b = make_chunk(self.doc_b, content="secret-B", index=0)

    @patch("documents.services.retrieval.embed_one", return_value=[0.1] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    def test_a_only_sees_a_chunks(self, _rerank, _embed):
        chunks, raw, _ = retrieve_context(
            workspace_id=self.ws.id, user_id=self.a.id, query="secret",
        )
        contents = [c["content"] for c in raw]
        assert "secret-A" in contents
        assert "secret-B" not in contents

    @patch("documents.services.retrieval.embed_one", return_value=[0.1] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    def test_b_only_sees_b_chunks(self, _rerank, _embed):
        chunks, raw, _ = retrieve_context(
            workspace_id=self.ws.id, user_id=self.b.id, query="secret",
        )
        contents = [c["content"] for c in raw]
        assert "secret-B" in contents
        assert "secret-A" not in contents

    @patch("documents.services.retrieval.embed_one", return_value=[0.1] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    def test_other_workspace_never_visible(self, _rerank, _embed):
        other_ws = make_workspace(make_user("z"))
        other_doc = make_document(other_ws, make_user("z2"), filename="z.pdf")
        make_chunk(other_doc, content="foreign")
        _, raw, _ = retrieve_context(
            workspace_id=self.ws.id, user_id=self.a.id, query="x",
        )
        assert "foreign" not in [c["content"] for c in raw]

    @patch("documents.services.retrieval.embed_one", return_value=[0.1] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    def test_excluded_document_removed(self, _rerank, _embed):
        _, raw, _ = retrieve_context(
            workspace_id=self.ws.id, user_id=self.a.id, query="secret",
            excluded_document_ids=[str(self.doc_a.id)],
        )
        assert raw == []

    @patch("documents.services.retrieval.embed_one", return_value=[0.1] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    def test_pending_document_not_retrieved(self, _rerank, _embed):
        self.doc_a.status = DocumentStatus.PENDING
        self.doc_a.save()
        _, raw, _ = retrieve_context(
            workspace_id=self.ws.id, user_id=self.a.id, query="secret",
        )
        assert raw == []

    @patch("documents.services.retrieval.embed_one", return_value=[0.1] * 1024)
    @patch("documents.services.retrieval.rerank",
           side_effect=lambda q, c, top_k: (c[:top_k], False))
    def test_failed_document_not_retrieved(self, _rerank, _embed):
        self.doc_a.status = DocumentStatus.FAILED
        self.doc_a.save()
        _, raw, _ = retrieve_context(
            workspace_id=self.ws.id, user_id=self.a.id, query="secret",
        )
        assert raw == []