import logging
import os
import requests

logger = logging.getLogger(__name__)


def rerank(query: str, candidates: list[dict], top_k: int = 3) -> tuple[list[dict], bool]:
    if not candidates:
        return [], False

    api_key = os.getenv("JINA_API_KEY")
    if not api_key:
        return candidates[:top_k], False

    try:
        resp = requests.post(
            "https://api.jina.ai/v1/rerank",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "jina-reranker-v2-base-multilingual",
                "query": query,
                "documents": [c["content"] for c in candidates],
                "top_n": min(top_k, len(candidates)),
            },
            timeout=8,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        out = []
        for r in results:
            c = dict(candidates[r["index"]])
            c["rerank_score"] = round(float(r.get("relevance_score", 0.0)), 4)
            out.append(c)
        return (out, True) if out else (candidates[:top_k], False)
    except Exception as e:
        logger.warning("rerank failed: %s", e)
        return candidates[:top_k], False