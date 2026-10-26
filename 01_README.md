# AI SaaS Workspace (Project 1)

A multi-user workspace where members upload PDF/TXT documents and ask questions that are answered **only from their own uploaded content**, with citations, per-user request history and a per-user token budget.

## Why it exists
Teams want answers from their own documents without the model guessing. The product answers from retrieved text, says so plainly when the documents do not contain the answer, and limits how many tokens each user can spend.

## Stack
- Backend: Python, Django 5.2, Django REST Framework, SimpleJWT (with token blacklist), drf-spectacular (OpenAPI at `/api/docs/`)
- Database: PostgreSQL with the pgvector extension (1024-dimension embeddings)
- Storage: Django default file storage (local `media/` in development)
- AI: OpenAI **or** Ollama for embeddings and answer generation (OpenAI is used when `OPENAI_API_KEY` is set); optional Jina reranker
- Text handling: pdfplumber (PDF text and tables), LangChain `RecursiveCharacterTextSplitter` (800-character chunks, 100 overlap)
- Frontend: Nextjs

## Scope
**In scope (implemented)**
- Register, login, refresh, logout (refresh token blacklisted), current user
- Create workspaces; invite members by expiring, use-limited invite links; join via link
- Upload PDF or TXT (max 20 MB, type and content checks); background ingestion (extract, chunk, embed, store)
- Ask questions over your own documents in a workspace; citations returned; unsupported questions return "not found" without calling the LLM
- Request history and detail per user; delete own documents
- Per-user rolling 30-day token limit with HTTP 429 and `Retry-After`

**Out of scope**
Billing and payments, document sharing between members, OCR for scanned PDFs, streaming answers, admin UI beyond Django admin, role management beyond owner/member.

## Users and roles
| Role | How determined | Can do |
|---|---|---|
| Owner | `Workspace.created_by` | Everything a member can, plus create invites |
| Member | Row in `WorkspaceMember` | Upload, ask, view own history, delete own documents |
| Non-member | No row | Gets 404 for the workspace (existence is not revealed) |

## Assumptions
- Documents are private to the uploader, even inside a shared workspace; retrieval filters by workspace **and** owner.
- One workspace owner; ownership cannot be transferred.
- Token usage is counted only for answers that reach the LLM.

## Main user journey (end to end)
1. Register and log in, receiving access and refresh tokens.
2. Create a workspace (becomes owner and member).
3. Upload a PDF; the API returns `pending` immediately.
4. Ingestion runs in the background and the document becomes `ready` (or `failed` with an error message).
5. `POST /ask/` with a question: the question is embedded, the closest chunks of the user's ready documents are retrieved and reranked, an answer is generated from them, and the response includes citations and token counts.
6. View the request in history; check remaining budget at `/api/v1/usage/`.

**Failure paths:** question not covered by documents (status `not_found`, LLM skipped); LLM or embedding provider failure (status `failed`, HTTP 500); usage limit reached (HTTP 429); invalid upload (HTTP 400).

Acceptance criteria and API details: see `04_api-spec.md`. Schema: `03_schema.sql`.

## Implemented vs mocked
| Capability | Status |
|---|---|
| Auth, workspaces, invites, upload, retrieval, history, usage limits | Implemented and tested |
| Embeddings and generation | Real calls to OpenAI or Ollama; **mocked in the automated tests** |
| Reranking | Real Jina call when `JINA_API_KEY` is set; otherwise falls back to vector order |
| Background ingestion | Implemented with a Python thread (not a durable queue) |
| Billing | Not implemented |

## Setup
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the values below
python manage.py migrate    # database must have the pgvector extension available
python manage.py runserver
```
API docs: http://localhost:8000/api/docs/

### Environment variables (names only; no credentials in the repo)
`SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `USAGE_TOKEN_LIMIT_30D`, `OPENAI_API_KEY`, `OPENAI_EMBED_MODEL`, `OPENAI_LLM_MODEL`, `OLLAMA_URL`, `OLLAMA_EMBED_MODEL`, `OLLAMA_LLM_MODEL`, `JINA_API_KEY` (optional)

## Tests
```bash
cd backend
pytest -v --reuse-db
```
Latest run: 75 collected, 74 passed, 1 skipped. Results and evidence are in `05_test-cases.xlsx`.

## Known gaps
- Ingestion runs in a daemon thread; a restart can leave documents stuck in `pending`.
- The usage limit is checked before generation and recorded after, so simultaneous requests can slightly exceed the limit.
- Retrieved text is placed directly into the prompt; there is no dedicated prompt-injection defence beyond the instruction to answer only from context.
- No ANN (HNSW/IVFFlat) vector index yet; search is exact.
- Existing members who use an exhausted or expired invite receive an error rather than an idempotent success.
- No monitoring, rate limits beyond DRF throttles, or automated backups configured.

## Repository, demo, links
- Repository: [CONFIRM URL]
- 3–5 minute demo: [CONFIRM URL]
