import io
import logging
import pdfplumber
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def _read_bytes(storage_key: str) -> bytes:
    with default_storage.open(storage_key, "rb") as f:
        return f.read()


def _extract_pdf_text_and_tables(data: bytes) -> tuple[str, list[str]]:
    full_text_parts, table_sentences = [], []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            tables = page.find_tables()
            bboxes = [t.bbox for t in tables]
            for table in tables:
                rows = table.extract()
                if not rows or len(rows) < 2:
                    continue
                header = [str(h).strip() if h else "" for h in rows[0]]
                for row in rows[1:]:
                    row = [str(c).strip() if c else "" for c in row]
                    if not any(row):
                        continue
                    label = row[0]
                    pairs = [f"{header[i]} scored {row[i]}" for i in range(1, len(row)) if row[i]]
                    if pairs:
                        table_sentences.append(f"On {label}, " + ", ".join(pairs) + ".")
            page_text = page.filter(
                lambda obj: not any(
                    b[0] <= obj.get("x0", -1) <= b[2] and b[1] <= obj.get("top", -1) <= b[3]
                    for b in bboxes
                )
            ).extract_text() or ""
            full_text_parts.append(page_text)
    return "\n\n".join(full_text_parts), table_sentences


def extract_text(document) -> tuple[str, list[str]]:
    """
    Returns (prose, table_sentences).
    Raises ValueError for unsupported mime or empty PDFs.
    """
    data = _read_bytes(document.storage_key)
    if document.mime == "application/pdf":
        prose, tables = _extract_pdf_text_and_tables(data)
        if not prose.strip() and not tables:
            raise ValueError("PDF contains no extractable text or tables (scanned image?).")
        return prose, tables
    if document.mime == "text/plain":
        text = data.decode("utf-8", errors="replace")
        if not text.strip():
            raise ValueError("Text file is empty.")
        return text, []
    raise ValueError(f"Unsupported mime: {document.mime}")