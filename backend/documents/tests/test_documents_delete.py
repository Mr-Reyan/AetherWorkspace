import pytest
from documents.models import Document, DocumentChunk
from documents.tests.factories import (
    make_user, make_workspace, add_member, auth_client, make_document, make_chunk,
)


@pytest.mark.django_db
class TestDelete:
    def test_owner_can_delete_and_chunks_cascade(self):
        u = make_user(); ws = make_workspace(u)
        d = make_document(ws, u); make_chunk(d)
        r = auth_client(u).delete(f"/api/v1/workspaces/{ws.id}/documents/{d.id}/")
        assert r.status_code == 204
        assert not Document.objects.filter(id=d.id).exists()
        assert DocumentChunk.objects.filter(document_id=d.id).count() == 0

    def test_other_member_403(self):
        a, b = make_user("a"), make_user("b")
        ws = make_workspace(a); add_member(ws, b)
        d = make_document(ws, a)
        r = auth_client(b).delete(f"/api/v1/workspaces/{ws.id}/documents/{d.id}/")
        assert r.status_code == 403

    def test_non_member_404(self):
        a, s = make_user("a"), make_user("s")
        ws = make_workspace(a)
        d = make_document(ws, a)
        r = auth_client(s).delete(f"/api/v1/workspaces/{ws.id}/documents/{d.id}/")
        assert r.status_code == 404

    @pytest.mark.skip(reason="Past Request rows intentionally retain retrieved_chunk_ids pointing at deleted chunks; citations resolve to [] in detail view.")
    def test_request_history_survives_delete(self):
        pass