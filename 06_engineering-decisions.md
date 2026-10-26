# Engineering Decisions: AI SaaS Workspace

Status key: **Implemented** = in the code today. **Proposed** = not built; described so trade-offs are explicit.

## 1. Retrieval design (RAG)
- **Alternatives:** (a) send whole documents to the LLM; (b) keyword search only; (c) vector search with optional reranking; (d) fine-tune a model.
- **Chosen:** (c). Chunk text (800 chars, 100 overlap, recursive splitting at paragraph, line, sentence, word boundaries), embed to 1024 dimensions, store in pgvector, retrieve the 8 nearest chunks by cosine distance, rerank to 3.
- **Why:** Whole documents exceed context limits and cost more per question; keyword search misses paraphrases; fine-tuning does not give citations or handle changing uploads.
- **Tables in PDFs:** extracted separately and turned into sentences ("On X, Y scored Z") so table facts survive chunking. Limitation: assumes a header row and a label in the first column.
- **Status:** Implemented.

## 2. Grounding and unsupported answers
- **Chosen:** two layers. (1) If the best chunk's similarity is below 0.30, the request is marked `not_found` and the LLM is not called (saves cost and prevents guessing). (2) The prompt tells the model to answer only from the supplied context and otherwise reply with a fixed sentence.
- **Trade-off:** 0.30 is a fixed threshold, not tuned per embedding model; too high rejects valid questions, too low lets weak matches through. It should be tuned on sample questions.
- **Status:** Implemented. Threshold tuning: Proposed.

## 3. Model provider: API vs open source
- **Alternatives:** OpenAI-style hosted API; self-hosted open-source model via Ollama.
- **Chosen:** support both behind two functions (`embed_texts`, `generate_llm_response`). Hosted API is used when `OPENAI_API_KEY` is set, otherwise Ollama.
- **Why:** Hosted API gives quality and no GPU to run; Ollama allows local development with no per-token cost and keeps data on our infrastructure.
- **Risks:** Embedding dimension must be 1024 for both (checked for Ollama, requested explicitly for OpenAI); switching embedding model requires re-embedding all documents. Ollama token counts come from its own tokenizer and are not comparable with OpenAI's for limit purposes.
- **Status:** Implemented. GPU/inference cost comparison: see `08_cost-and-scaling.xlsx`.

## 4. Data isolation
- **Alternatives:** shared documents across a workspace; per-user private documents.
- **Chosen:** private per user. Every retrieval query filters on `workspace_id`, `owner_id` and `status='ready'`; history queries filter on workspace and user; non-members get 404 not 403.
- **Why:** Prevents one member's documents from leaking into another's answers. Exclusion IDs are checked for ownership before use.
- **Trade-off:** members cannot share knowledge inside a workspace.
- **Status:** Implemented and covered by isolation tests (retrieval, ask, history).

## 5. Background ingestion
- **Alternatives:** process inside the upload request; background thread; task queue (Celery/RQ/Django-Q) with a worker.
- **Chosen:** background thread started in `transaction.on_commit`.
- **Why:** Simple, no extra infrastructure for an MVP; upload returns immediately.
- **Risks:** not durable (restart loses in-flight work, document stays `pending`), no retries, no concurrency control, runs in the web process.
- **Mitigations in place:** ingestion is idempotent (old chunks deleted before insert, in one transaction) and failures are written to `Document.error`.
- **Status:** Thread: Implemented. Queue with retries and a sweeper for stuck `pending` documents: **Proposed**.

## 6. Usage limits
- **Chosen:** rolling 30-day token budget per user, from `UsageEvent` rows (one per successful request, unique per request). Over the limit returns 429 with `Retry-After`.
- **Why:** token spend is the real cost driver, so limit tokens rather than request count.
- **Risk:** check-then-act race lets concurrent requests overshoot. Failed and not-found requests record no usage.
- **Status:** Implemented. Atomic reservation (lock the user row or reserve estimated tokens first): **Proposed**.

## 7. Authentication
- **Chosen:** JWT (15-minute access, 7-day refresh, rotation and blacklist on logout), login throttled to 10/minute, default permission is authenticated.
- **Trade-off:** access tokens cannot be revoked before expiry. Short lifetime limits exposure.
- **Status:** Implemented.

## 8. File upload controls
- Size limit 20 MB, empty files rejected, allow-list of two content types, PDF magic bytes checked, text must be UTF-8, stored under a server-generated name (`documents/<workspace>/<uuid>.<ext>`), filename sanitised.
- **Gap:** content type is the client-declared one; extension is not cross-checked. No malware scanning.
- **Status:** Implemented with the gaps noted.

## 9. Security
| Risk | Current control | Gap / proposal |
|---|---|---|
| Cross-user data access | Query-level filters; tests | None known |
| Prompt injection via document text | Instruction to use only context | Delimit context, strip instructions, test with adversarial PDFs (Proposed) |
| Secrets | Read from environment variables | Use a secrets manager in production |
| Brute-force login | Throttle 10/min per scope | Account lockout, monitoring |
| SQL injection | ORM; parameterised raw SQL in retrieval; UUIDs validated | None known |
| Transport | Not configured in app | TLS at proxy; set secure cookie/HSTS settings |

## 10. Reliability and failure handling
- Provider failure during ask: request marked `failed`, HTTP 500, no usage recorded. Reranker failure: falls back to vector order (8 s timeout).
- Embedding failures during ingestion mark the document `failed` with the error.
- **Proposed:** provider retries with backoff, a fallback provider, structured logging and alerting, scheduled database backups and storage versioning, health-check endpoint.

## 11. Constraints and assumptions
Single region, single database, local file storage in development, max 20 MB per file, answers limited to 800 generated tokens (OpenAI path), prompt context window 4096 (Ollama path).

## 12. Implemented vs proposed (summary)
| Implemented | Proposed |
|---|---|
| Auth, workspaces, invites, upload, ingestion, retrieval, rerank, history, usage limit, isolation | Durable job queue, ANN index, atomic usage reservation, prompt-injection hardening, monitoring, backups, object storage, production deployment |
