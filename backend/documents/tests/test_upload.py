import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from documents.models import Document, DocumentStatus
from documents.tests.factories import make_user, make_workspace, add_member, auth_client


def pdf_bytes(text="Hello world"):
    # Minimal valid PDF with one text page
    return (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R>>endobj\n"
        b"4 0 obj<</Length " + str(len(text) + 30).encode() + b">>stream\n"
        b"BT /F1 12 Tf 20 100 Td (" + text.encode() + b") Tj ET\nendstream endobj\n"
        b"xref\n0 5\n0000000000 65535 f \ntrailer<</Root 1 0 R/Size 5>>\nstartxref\n0\n%%EOF\n"
    )


@pytest.mark.django_db
class TestUploadAuth:
    def test_non_member_404(self):
        owner = make_user("o"); stranger = make_user("s")
        ws = make_workspace(owner)
        f = SimpleUploadedFile("a.pdf", pdf_bytes(), content_type="application/pdf")
        r = auth_client(stranger).post(f"/api/v1/workspaces/{ws.id}/documents/", {"file": f})
        assert r.status_code == 404

    def test_requires_auth(self):
        f = SimpleUploadedFile("a.pdf", pdf_bytes(), content_type="application/pdf")
        r = APIClient().post("/api/v1/workspaces/00000000-0000-0000-0000-000000000000/documents/", {"file": f})
        assert r.status_code == 401


@pytest.mark.django_db
class TestUploadValidation:
    def setup_method(self):
        self.u = make_user()
        self.ws = make_workspace(self.u)
        self.c = auth_client(self.u)

    def _post(self, name, content, ct):
        f = SimpleUploadedFile(name, content, content_type=ct)
        return self.c.post(f"/api/v1/workspaces/{self.ws.id}/documents/", {"file": f})

    def test_positive_pdf(self):
        r = self._post("a.pdf", pdf_bytes(), "application/pdf")
        assert r.status_code == 201
        assert r.data["status"] == DocumentStatus.PENDING
        assert Document.objects.filter(workspace=self.ws, owner=self.u).exists()

    def test_positive_txt(self):
        r = self._post("a.txt", b"plain text content", "text/plain")
        assert r.status_code == 201

    def test_negative_missing_file(self):
        r = self.c.post(f"/api/v1/workspaces/{self.ws.id}/documents/", {})
        assert r.status_code == 400
        assert "file" in r.data

    def test_negative_unsupported_type(self):
        r = self._post("a.exe", b"MZ...", "application/octet-stream")
        assert r.status_code == 400

    def test_negative_oversize(self):
        big = b"x" * (21 * 1024 * 1024)
        r = self._post("a.txt", big, "text/plain")
        assert r.status_code == 400

    def test_negative_empty_file(self):
        r = self._post("a.txt", b"", "text/plain")
        assert r.status_code == 400

    def test_negative_pdf_content_type_but_not_pdf_bytes(self):
        r = self._post("fake.pdf", b"not actually a pdf", "application/pdf")
        assert r.status_code == 400

    def test_negative_txt_not_utf8(self):
        r = self._post("a.txt", b"\xff\xfe\x00garbage", "text/plain")
        assert r.status_code == 400

    def test_upload_schedules_ingestion(self):
        from django.test import TestCase
        from unittest.mock import patch

        u = make_user("A_USER")
        ws = make_workspace(u)
        f = SimpleUploadedFile("a.pdf", pdf_bytes(), content_type="application/pdf")

        with patch("documents.services.upload._enqueue_ingestion") as enq:
            # Capture on_commit callbacks scheduled during the request
            with TestCase.captureOnCommitCallbacks(execute=True):
                r = auth_client(u).post(f"/api/v1/workspaces/{ws.id}/documents/", {"file": f})
            assert r.status_code == 201
            enq.assert_called_once()
            assert str(enq.call_args.args[0]) == r.data["id"]