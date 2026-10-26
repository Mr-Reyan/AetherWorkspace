import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _generate_openai(prompt: str) -> tuple[str, dict]:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model=settings.OPENAI_LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=800,
    )
    text = (resp.choices[0].message.content or "").strip()
    u = resp.usage
    return text, {
        "input": getattr(u, "prompt_tokens", 0),
        "output": getattr(u, "completion_tokens", 0),
        "total": getattr(u, "total_tokens", 0),
    }


def _generate_ollama(prompt: str) -> tuple[str, dict]:
    url = settings.OLLAMA_URL.rstrip("/")
    resp = requests.post(
        f"{url}/api/generate",
        json={
            "model": settings.OLLAMA_LLM_MODEL,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "30m",
            "options": {"num_ctx": 4096, "temperature": 0.1},
        },
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    text = (data.get("response") or "").strip()
    inp = data.get("prompt_eval_count", 0) or 0
    out = data.get("eval_count", 0) or 0
    return text, {"input": inp, "output": out, "total": inp + out}


def generate_llm_response(prompt: str) -> tuple[str, dict]:
    if getattr(settings, "OPENAI_API_KEY", None):
        return _generate_openai(prompt)
    return _generate_ollama(prompt)