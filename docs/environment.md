# Environment variables

## Backend (Worker secrets / `.dev.vars`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `DB_NAME` | No | Database name (default `tom-ai-db`) |
| `JWT_SECRET` | Yes | Signs user JWTs; admin secret is this + `-admin` |
| `GEMINI_API_KEY` | Yes | Chat, embeddings, image prompt enhance |
| `GOOGLE_CLIENT_ID` | For Google | OAuth client id |
| `GOOGLE_CLIENT_SECRET` | For Google | OAuth client secret |
| `GOOGLE_SIGNIN_REDIRECT_URI` | Recommended | Sign-in callback URL |
| `GOOGLE_CONNECT_REDIRECT_URI` | Recommended | Connect callback URL |
| `GOOGLE_REDIRECT_URI` | Fallback | Shared redirect if separate URIs unset |
| `FRONTEND_URL` | Recommended | CORS allowlist origin |
| `ADMIN_PASSWORD` | For admin | Enables admin login |
| `ADMIN_USERNAME` | No | Default `admin@tomai.com` |
| `SENDGRID_API_KEY` | For email | Preferred mail transport |
| `RESEND_API_KEY` | For email | Fallback / alternative mail |
| `RESEND_FROM` | With Resend | From address |
| `OPENAI_API_KEY` | Optional | Enable GPT models |
| `ANTHROPIC_API_KEY` | Optional | Enable Claude models |
| `NODE_ENV` | No | Error verbosity |

## Frontend (`.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `REACT_APP_API_URL` | Recommended | API base; defaults to `/api` if unset |
| `REACT_APP_GOOGLE_CLIENT_ID` | For Google UI | Sign-in button |
| `REACT_APP_GOOGLE_SIGNIN_REDIRECT_URI` | Recommended | Must match Google Console + backend |
| `REACT_APP_GOOGLE_CONNECT_REDIRECT_URI` | Recommended | Connect flow redirect |
| `REACT_APP_GOOGLE_REDIRECT_URI` | Fallback | Shared redirect |
| `REACT_APP_USE_3D` | No | Enable 3D assets |
| `REACT_APP_LOGO_*` / `REACT_APP_HERO_MODEL` | No | Custom logo / hero GLB paths |

See [Custom assets](./assets.md) for asset-related env flags.

## Local example snippets

**Backend `.dev.vars` (do not commit secrets):**

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=long-random-string
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000
ADMIN_PASSWORD=...
```

**Frontend `.env`:**

```env
REACT_APP_API_URL=http://localhost:8787/api
REACT_APP_GOOGLE_CLIENT_ID=...
REACT_APP_GOOGLE_SIGNIN_REDIRECT_URI=http://localhost:3000/auth/google/callback
REACT_APP_GOOGLE_CONNECT_REDIRECT_URI=http://localhost:3000/auth/google/callback
```
