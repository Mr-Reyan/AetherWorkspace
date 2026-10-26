import logging
from django.db import connection
from .embeddings import embed_one
from .rerank import rerank

logger = logging.getLogger(__name__)


def retrieve_context(
    *,
    workspace_id,
    user_id,
    query: str,
    excluded_document_ids: list[str] | None = None,
    top_k: int = 3,
    candidate_limit: int = 8,
) -> tuple[list[dict], list[dict], bool]:
    """
    Vector search scoped to (workspace_id, user_id) and optionally excluding
    specific document IDs. Returns (top_chunks, raw_candidates, reranked_flag).
    """
    excluded_document_ids = excluded_document_ids or []
    query_vector = embed_one(query)

    sql = """
        SELECT c.id, c.content, c.chunk_index,
               d.id AS document_id, d.filename,
               (1 - (c.embedding <=> %s::vector)) AS similarity
        FROM documents_documentchunk c
        JOIN documents_document d ON d.id = c.document_id
        WHERE d.workspace_id = %s
          AND d.owner_id = %s
          AND d.status = 'ready'
    """
    params = [query_vector, str(workspace_id), str(user_id)]

    if excluded_document_ids:
        sql += " AND d.id <> ALL(%s::uuid[])"
        params.append([str(x) for x in excluded_document_ids])

    sql += " ORDER BY c.embedding <=> %s::vector LIMIT %s"
    params.extend([query_vector, candidate_limit])

    with connection.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    raw = [
        {
            "chunk_id": str(r[0]),
            "content": r[1],
            "chunk_index": r[2],
            "document_id": str(r[3]),
            "document_name": r[4],
            "similarity": round(float(r[5]), 4),
        }
        for r in rows
    ]
    if not raw:
        return [], [], False

    top, reranked_flag = rerank(query, raw, top_k=top_k)
    return top, raw, reranked_flag