import uuid
import logging
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils.text import get_valid_filename

from ..models import Document, DocumentStatus

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
ALLOWED = {
    "application/pdf": ("pdf", b"%PDF-"),
    "text/plain":      ("txt", None),
}


def _detect_and_validate(uploaded_file):
    """Returns (mime, ext). Raises ValueError with a message on any problem."""
    if uploaded_file.size > MAX_UPLOAD_BYTES:
        raise ValueError(f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.")
    if uploaded_file.size == 0:
        raise ValueError("File is empty.")

    declared = (uploaded_file.content_type or "").lower()
    if declared not in ALLOWED:
        raise ValueError(f"Unsupported content type: {declared or 'unknown'}.")

    ext, magic = ALLOWED[declared]

    head = uploaded_file.read(8)
    uploaded_file.seek(0)
    if magic is not None and not head.startswith(magic):
        raise ValueError("File content does not match declared type.")
    if magic is None:
        try:
            uploaded_file.read().decode("utf-8")
        except UnicodeDecodeError:
            raise ValueError("Text file must be UTF-8 encoded.")
        finally:
            uploaded_file.seek(0)

    return declared, ext


@transaction.atomic
def create_document(*, workspace, user, uploaded_file):
    mime, ext = _detect_and_validate(uploaded_file)

    doc_id = uuid.uuid4()
    storage_key = f"documents/{workspace.id}/{doc_id}.{ext}"

    saved_path = default_storage.save(storage_key, ContentFile(uploaded_file.read()))

    doc = Document.objects.create(
        id=doc_id,
        workspace=workspace,
        owner=user,
        filename=get_valid_filename(uploaded_file.name)[:255],
        mime=mime,
        size_bytes=uploaded_file.size,
        storage_key=saved_path,
        status=DocumentStatus.PENDING,
    )

    transaction.on_commit(lambda: _enqueue_ingestion(doc.id))
    return doc


def _enqueue_ingestion(document_id):
    import threading
    from .ingestion import ingest_document
    t = threading.Thread(target=ingest_document, args=(document_id,), daemon=True)
    t.start()