import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

EMBED_DIM = 768          # must match VectorField(dimensions=768)


def _embed_backend() -> str:
    """Return 'openai' if configured, else 'ollama'."""
    if getattr(settings, "OPENAI_API_KEY", None):
        return "openai"
    return "ollama"


def _embed_openai(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.embeddings.create(
        model=settings.OPENAI_EMBED_MODEL,   # e.g. "text-embedding-3-small"
        input=texts,
        dimensions=EMBED_DIM,
    )
    return [d.embedding for d in resp.data]


def _embed_ollama(texts: list[str]) -> list[list[float]]:
    url = settings.OLLAMA_URL.rstrip("/")
    model = settings.OLLAMA_EMBED_MODEL
    resp = requests.post(
        f"{url}/api/embed",
        json={"model": model, "input": texts},
        timeout=60,
    )
    resp.raise_for_status()
    print('embedding done!')
    data = resp.json()
    vectors = data.get("embeddings") or []
    if len(vectors) != len(texts):
        # Older Ollama only supports /api/embeddings (single input)
        vectors = []
        for t in texts:
            r = requests.post(
                f"{url}/api/embeddings",
                json={"model": model, "prompt": t},
                timeout=60,
            )
            r.raise_for_status()
            vectors.append(r.json()["embedding"])
    for v in vectors:
        if not isinstance(v, list) or len(v) != EMBED_DIM:
            raise RuntimeError(
                f"Embedding dimension mismatch: got {len(v)}, expected {EMBED_DIM}"
            )
    return vectors


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embed. Raises on empty input or backend failure."""
    if not texts:
        raise ValueError("embed_texts called with empty list.")
    if any(not t.strip() for t in texts):
        raise ValueError("embed_texts received an empty/whitespace string.")

    backend = _embed_backend()
    logger.info("embedding %d texts via %s", len(texts), backend)
    if backend == "openai":
        return _embed_openai(texts)
    return _embed_ollama(texts)


def embed_one(text: str) -> list[float]:
    return embed_texts([text])[0]