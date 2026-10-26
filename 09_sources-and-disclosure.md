# Sources and Disclosure: AI SaaS Workspace

## 1. Open-source dependencies
Licenses are listed from general knowledge. **Verify each against the package's repository or PyPI page before submitting** and correct any entry that differs.

| Package | Use | License (verify) | URL |
|---|---|---|---|
| Django | Web framework | BSD-3-Clause | https://pypi.org/project/Django/ |
| djangorestframework | REST API | BSD-3-Clause | https://pypi.org/project/djangorestframework/ |
| djangorestframework-simplejwt | JWT auth, blacklist | MIT | https://pypi.org/project/djangorestframework-simplejwt/ |
| drf-spectacular | OpenAPI schema | BSD-3-Clause | https://pypi.org/project/drf-spectacular/ |
| django-cors-headers | CORS | MIT | https://pypi.org/project/django-cors-headers/ |
| dj-database-url | DB config from env | BSD-3-Clause | https://pypi.org/project/dj-database-url/ |
| python-dotenv | Load `.env` | BSD-3-Clause | https://pypi.org/project/python-dotenv/ |
| pgvector (Postgres extension) | Vector storage and search | PostgreSQL License | https://github.com/pgvector/pgvector |
| pgvector (Python) | Django `VectorField` | MIT | https://pypi.org/project/pgvector/ |
| pdfplumber | PDF text and table extraction | MIT | https://pypi.org/project/pdfplumber/ |
| langchain-text-splitters | Recursive chunking | MIT | https://pypi.org/project/langchain-text-splitters/ |
| requests | HTTP calls to Ollama/Jina | Apache-2.0 | https://pypi.org/project/requests/ |
| openai | OpenAI client | Apache-2.0 | https://pypi.org/project/openai/ |
| pytest, pytest-django | Testing | MIT / BSD-3-Clause | https://pypi.org/project/pytest/ , https://pypi.org/project/pytest-django/ |

## 2. External services
| Service | Role | Used in |
|---|---|---|
| OpenAI API | Embeddings, answer generation | Real when `OPENAI_API_KEY` set |
| Ollama (self-hosted) | Embeddings, answer generation | Real when no OpenAI key |
| Jina Reranker API | Reranking | Real when `JINA_API_KEY` set |

Pricing sources: see `08_cost-and-scaling.xlsx` (each price has its URL and date accessed).

## 3. Reused code and modifications

## 4. AI-use disclosure
AI assistance (Claude, by Anthropic) was used on this project for:
- Generating `05_test-cases.xlsx` from the author's own test files and pytest output
- Drafting `01_README.md`, `03_schema.sql`, `06_engineering-decisions.md`, `08_cost-and-scaling.xlsx`, `09_sources-and-disclosure.md`,`10_submission-index.md`,`02_architecture.pdf`, `03_database-design.pdf`, `04_api-workflows.pdf`, `05_test-cases.xlsx`, Backend Helper Functions were made from single whole block views, and this file from the author's source code



**Independent verification:** Ran the tests and all passed. went through the whole API and endpoints and checked for bugs and errors. Went through the whole flow and made sure it works as expected. 

