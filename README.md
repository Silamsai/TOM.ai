# TOM.AI

TOM.AI is a React-based personal assistant with guest chat, authenticated chat, Google integrations, task management, personal-document RAG, image generation, and an admin panel for model/provider configuration.

## Documentation

Full technical docs live in **[`docs/`](./docs/README.md)**:

| Topic | Link |
|-------|------|
| How it works | [docs/architecture.md](./docs/architecture.md) |
| Tech stack | [docs/tech-stack.md](./docs/tech-stack.md) |
| Features | [docs/features.md](./docs/features.md) |
| Backend services | [docs/services.md](./docs/services.md) |
| API | [docs/api.md](./docs/api.md) |
| Auth | [docs/auth.md](./docs/auth.md) |
| Personal RAG | [docs/rag.md](./docs/rag.md) |
| Deployment | [docs/deployment.md](./docs/deployment.md) |
| Environment variables | [docs/environment.md](./docs/environment.md) |
| Custom assets | [docs/assets.md](./docs/assets.md) |

## Current architecture (short)

### Frontend
- React 18 SPA in `frontend`
- Routing in `frontend/src/App.jsx`
- API client in `frontend/src/services/api.js`
- Google sign-in redirect built in `frontend/src/utils/googleAuth.js`

### Backend
- Cloudflare Workers app using `Hono` in `backend/server.js`
- MongoDB access through a custom Mongoose-compatible layer in `backend/config/dbCompat.js`
- Worker deploy/dev config in `backend/wrangler.toml`
- API groups in `backend/routes`

### AI and integrations
- Gemini is the primary chat and embedding provider
- Optional OpenAI and Anthropic routing when API keys are configured
- Google OAuth for sign-in and for Gmail / Calendar / Tasks
- Personal documents are chunked, embedded, and stored in MongoDB for RAG

### Email and scheduled jobs
- Email via SendGrid or Resend
- Worker cron triggers in `backend/wrangler.toml`
- Reminder and cleanup jobs in `backend/services/cronJobs.js`

## Repo layout

```text
TOM.ai/
├── backend/
├── frontend/
├── docs/          ← technical documentation
└── README.md
```

## Running locally

### Option 1: frontend + local backend

1. Backend:
   ```bash
   cd backend
   npm install
   # configure .dev.vars — see docs/environment.md
   npm run dev
   ```
2. Frontend:
   ```bash
   cd frontend
   npm install
   # configure .env — see docs/environment.md
   npm start
   ```

### Option 2: frontend against a deployed backend

Set `REACT_APP_API_URL` to the Worker `/api` URL, then `npm start` in `frontend`.

## Deploy backend

```bash
cd backend
npm run deploy
```

Details: [docs/deployment.md](./docs/deployment.md).

## Main API areas

- `POST /api/auth/login`
- `POST /api/auth/google/callback`
- `GET /api/oauth/google/connect-url`
- `POST /api/chat/message`
- `POST /api/tasks/create`
- `POST /api/rag/upload`
- `POST /api/image/generate`
- `GET /api/admin/ai-models-public`

Full list: [docs/api.md](./docs/api.md).

## Important operational notes

- Admin login is disabled unless `ADMIN_PASSWORD` is configured.
- Google sign-in and Google connect can use separate redirect URI env vars.
- Personal RAG uploads allow up to **100 MB** per file.
- Task cleanup removes completed/cancelled tasks inactive for 30+ days.
