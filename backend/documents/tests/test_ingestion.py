import pytest
from unittest.mock import patch
from documents.models import Document, DocumentChunk, DocumentStatus
from documents.services.ingestion import ingest_document
from documents.tests.factories import make_user, make_workspace, make_document


@pytest.mark.django_db
class TestIngestion:
    def setup_method(self):
        self.u = make_user(); self.ws = make_workspace(self.u)

    def test_positive_txt_creates_chunks_and_ready(self):
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile

        doc = make_document(self.ws, self.u, filename="a.txt", mime="text/plain",
                            storage_key="documents/tests/a.txt",
                            status=DocumentStatus.PENDING)
        default_storage.save("documents/tests/a.txt", ContentFile(b"Hello world. " * 100))

        def fake_embed(texts):
            return [[0.1] * 1024 for _ in texts]   # one per chunk

        with patch("documents.services.ingestion.embed_texts", side_effect=fake_embed):
            ingest_document(doc.id)

        doc.refresh_from_db()
        assert doc.status == DocumentStatus.READY
        assert doc.chunks.count() > 0

    def test_empty_pdf_marks_failed(self):
        doc = make_document(self.ws, self.u, storage_key="documents/tests/empty.pdf",
                            status=DocumentStatus.PENDING)
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        # A PDF with no text layer
        default_storage.save("documents/tests/empty.pdf", ContentFile(b"%PDF-1.4\n%%EOF\n"))

        with patch("documents.services.ingestion.embed_texts", return_value=[]):
            ingest_document(doc.id)

        doc.refresh_from_db()
        assert doc.status == DocumentStatus.FAILED
        assert doc.error

    def test_embedding_count_mismatch_marks_failed(self):
        doc = make_document(self.ws, self.u, filename="a.txt", mime="text/plain",
                            storage_key="documents/tests/mismatch.txt",
                            status=DocumentStatus.PENDING)
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        default_storage.save("documents/tests/mismatch.txt",
                             ContentFile(b"Long enough text. " * 200))

        # Simulate a backend returning fewer vectors than chunks
        with patch("documents.services.ingestion.embed_texts",
                   return_value=[[0.1] * 1024 for _ in range(1)]):
            ingest_document(doc.id)

        doc.refresh_from_db()
        assert doc.status == DocumentStatus.FAILED

    def test_embed_backend_exception_marks_failed(self):
        doc = make_document(self.ws, self.u, filename="a.txt", mime="text/plain",
                            storage_key="documents/tests/exc.txt",
                            status=DocumentStatus.PENDING)
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        default_storage.save("documents/tests/exc.txt", ContentFile(b"text " * 50))

        with patch("documents.services.ingestion.embed_texts",
                   side_effect=RuntimeError("OpenAI down")):
            ingest_document(doc.id)

        doc.refresh_from_db()
        assert doc.status == DocumentStatus.FAILED
        assert "OpenAI down" in doc.error

    def test_reingest_is_idempotent(self):
        doc = make_document(self.ws, self.u, filename="a.txt", mime="text/plain",
                            storage_key="documents/tests/idem.txt",
                            status=DocumentStatus.PENDING)
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        default_storage.save("documents/tests/idem.txt", ContentFile(b"idem " * 100))

        with patch("documents.services.ingestion.embed_texts",
                   return_value=[[0.1] * 1024 for _ in range(50)]):
            ingest_document(doc.id)
            n1 = DocumentChunk.objects.filter(document=doc).count()
            ingest_document(doc.id)
            n2 = DocumentChunk.objects.filter(document=doc).count()

        assert n1 == n2   # delete-before-insert makes it idempotent