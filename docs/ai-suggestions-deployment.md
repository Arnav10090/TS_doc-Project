# AI Suggestions Deployment Guide

This guide covers the runtime setup for Groq-backed AI Suggestions and historical document retrieval.

## Required Services

- PostgreSQL database from the existing `docker-compose.yml`.
- FastAPI backend with outbound network access to the Groq API.
- React frontend.
- Read-only `ts_documents` volume mounted into the backend container.

## Environment Variables

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | empty | Yes for AI calls | Server-side Groq API key. Never expose this in the frontend. |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | No | Groq model name used by the backend. |
| `GROQ_MAX_TOKENS` | `2048` | No | Maximum generated tokens for a suggestion. |
| `GROQ_TIMEOUT_SECONDS` | `30` | No | Provider timeout per Groq call. |
| `TS_DOCUMENTS_DIR` | `/app/ts_documents` | No | Container path for historical TS documents and context files. |

## Local Docker Setup

1. Put historical documents under `./ts_documents` using the documented category structure.
2. Add reviewed `context.txt` files only where category guidance is ready.
3. Provide Groq configuration to the backend container.

Recommended compose environment entries for the backend service:

```yaml
environment:
  DATABASE_URL: postgresql+asyncpg://ts_user:ts_password@db:5432/ts_generator
  SYNC_DATABASE_URL: postgresql://ts_user:ts_password@db:5432/ts_generator
  UPLOAD_DIR: /app/uploads
  TEMPLATE_PATH: /app/templates/TS_Template_jinja.docx
  GROQ_API_KEY: ${GROQ_API_KEY:-}
  GROQ_MODEL: ${GROQ_MODEL:-llama-3.3-70b-versatile}
  GROQ_MAX_TOKENS: ${GROQ_MAX_TOKENS:-2048}
  GROQ_TIMEOUT_SECONDS: ${GROQ_TIMEOUT_SECONDS:-30}
  TS_DOCUMENTS_DIR: /app/ts_documents
volumes:
  - ./backend:/app
  - backend_uploads:/app/uploads
  - ./ts_documents:/app/ts_documents:ro
```

Start locally:

```bash
GROQ_API_KEY=<server-side-key> docker-compose up --build
```

On Windows PowerShell:

```powershell
$env:GROQ_API_KEY = "<server-side-key>"
docker-compose up --build
```

## Historical Document Setup

- `context.txt` is optional but preferred.
- Supported retrieval document formats are `.docx`, `.txt`, and `.md`.
- Files named exactly `context.txt` are excluded from the historical document list and loaded separately.
- The backend mounts `./ts_documents` read-only at `/app/ts_documents`.
- Do not put credentials, secrets, private contacts, or unapproved commercial data in historical documents or context files.

## Verification Checklist

1. Start the backend and frontend.
2. Open `http://localhost:8000/docs`.
3. Call `GET /api/v1/ai-suggestions/status` and verify `groq_configured` is `true`.
4. Call `GET /api/v1/ts-types` and confirm all category values are present.
5. Create a project with a non-empty `ts_type`.
6. Open an eligible section and click AI Suggestions.
7. Confirm the suggestion panel appears and no raw prompt or raw response content appears in logs.
8. For a Gantt section, generate Draw.io XML and confirm the XML is non-empty.
9. Import a suggestion, edit it, click SAVE, and verify preview/export behavior remains unchanged.

## Rollback Procedure

AI Suggestions is additive and does not create new database tables.

1. Remove or unset `GROQ_API_KEY` to disable provider calls.
2. Restart the backend.
3. Verify `GET /api/v1/ai-suggestions/status` returns `groq_configured: false`.
4. Keep `ts_documents` mounted; it is read-only and harmless when AI Suggestions is unavailable.
5. If a deployment introduced unrelated frontend issues, redeploy the previous frontend bundle. Existing saved section data remains compatible because AI-generated content is stored through the same section save endpoint as manual content.

## Operational Notes

- The backend returns `503` when Groq is not configured.
- The backend returns `504` when Groq times out.
- Historical context missing or empty is non-fatal; suggestions proceed with project metadata, saved sections, draft content, embedded product context, and LLM knowledge.
- Keep `GROQ_API_KEY` in server-side secrets only.
- Ensure the deployment network can reach the Groq API endpoint.
