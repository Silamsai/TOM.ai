# Deployment

## Backend — Cloudflare Workers

Config: `backend/wrangler.toml`  
App name: `tom-ai-backend`  
Runtime flags: `nodejs_compat` + cron triggers.

### 1. Install & login

```bash
cd backend
npm install
npx wrangler login
```

### 2. Set secrets

```bash
npx wrangler secret put MONGODB_URI
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SENDGRID_API_KEY
npx wrangler secret put RESEND_API_KEY
```

Optional:

```bash
npx wrangler secret put RESEND_FROM
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
```

### 3. Non-secret vars

`DB_NAME` is already in `wrangler.toml`. Also set (via dashboard or `[vars]`) as needed:

- `FRONTEND_URL`
- `GOOGLE_SIGNIN_REDIRECT_URI`
- `GOOGLE_CONNECT_REDIRECT_URI`

### 4. Dry run & deploy

```bash
npx wrangler deploy --dry-run
npm run deploy
```

`npm run deploy` runs `wrangler deploy`.

### Local backend

```bash
cd backend
npm run dev
```

Uses Wrangler dev (often `http://localhost:8787`). Put secrets in `.dev.vars` for local use.

Agent-oriented short checklist also lives at `.agent/workflows/deploy-cloudflare.md`.

---

## Frontend — static host (Vercel-oriented)

`frontend/vercel.json` only rewrites SPA routes to `index.html` (no API proxy).

1. Build with production API URL:

```env
REACT_APP_API_URL=https://your-worker.workers.dev/api
REACT_APP_GOOGLE_CLIENT_ID=...
REACT_APP_GOOGLE_SIGNIN_REDIRECT_URI=https://your-frontend.vercel.app/auth/google/callback
REACT_APP_GOOGLE_CONNECT_REDIRECT_URI=https://your-frontend.vercel.app/auth/google/callback
```

2. Deploy the `frontend` build output to Vercel (or any static host).

3. Ensure Worker CORS allows your frontend origin (`FRONTEND_URL` / `*.vercel.app` handling in `server.js`).

### Local frontend

```bash
cd frontend
npm install
npm start
```

Point `REACT_APP_API_URL` at local or deployed backend.

---

## Post-deploy checks

- `GET /api/health`
- Admin login (if `ADMIN_PASSWORD` set)
- Google OAuth redirect URIs match Google Cloud Console
- Upload a small PDF in Personal RAG
- Confirm cron: reminders need email keys configured
