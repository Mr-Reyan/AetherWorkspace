import logging
from django.db import transaction
from ..models import Document, DocumentChunk, DocumentStatus
from .extraction import extract_text
from .chunking import chunk_text
from .embeddings import embed_texts

logger = logging.getLogger(__name__)

EMBED_BATCH = 16


def ingest_document(document_id) -> None:
    try:
        doc = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.warning("ingest: document %s vanished", document_id)
        return

    try:
        prose, tables = extract_text(doc)
        chunks = chunk_text(prose) + tables
        if not chunks:
            raise ValueError("No extractable content.")

        vectors = []
        for i in range(0, len(chunks), EMBED_BATCH):
            vectors.extend(embed_texts(chunks[i:i + EMBED_BATCH]))

        if len(vectors) != len(chunks):
            raise RuntimeError(
                f"Embedding count mismatch: {len(vectors)} vectors for {len(chunks)} chunks"
            )

        with transaction.atomic():
            DocumentChunk.objects.filter(document=doc).delete()
            DocumentChunk.objects.bulk_create(
                [
                    DocumentChunk(
                        document=doc,
                        chunk_index=i,
                        content=chunks[i],
                        embedding=vectors[i],
                    )
                    for i in range(len(chunks))
                ],
                batch_size=100,
            )
            doc.status = DocumentStatus.READY
            doc.error = ""
            doc.save(update_fields=["status", "error"])

        logger.info("ingested %s: %d chunks", document_id, len(chunks))

    except Exception as e:
        logger.exception("ingest failed for %s", document_id)
        Document.objects.filter(id=document_id).update(
            status=DocumentStatus.FAILED,
            error=str(e)[:2000],
        )