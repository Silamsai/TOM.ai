# Tech stack

What each technology is used for in TOM.ai.

## Frontend

| Technology | Version (approx.) | Used for |
|------------|-------------------|----------|
| React | 18.x | UI components and app state |
| React Router | 6.x | Client-side routes |
| Create React App (`react-scripts`) | 5.x | Local build/dev tooling |
| Axios | 1.x | HTTP client to `/api` |
| Framer Motion | 11.x | Page transitions and motion |
| Lucide React | 1.x | UI icons |
| Three.js + R3F + Drei | 0.172 / 8.x / 9.x | Optional 3D logo / scenes |
| jsPDF | 2.x | PDF export where needed |
| Vercel | hosting | SPA deploy; `vercel.json` history fallback |

**Key paths:** `frontend/src/App.jsx`, `frontend/src/services/api.js`, `frontend/src/pages/`

## Backend

| Technology | Version (approx.) | Used for |
|------------|-------------------|----------|
| Cloudflare Workers | via Wrangler 4.x | Serverless API runtime |
| Hono | 4.x | HTTP framework on Workers |
| MongoDB Node driver | 6.x | Database access |
| jsonwebtoken | 9.x | User & admin JWTs |
| bcryptjs | 2.x | Password hashing |
| `@google/generative-ai` | 0.24.x | Chat, embeddings, prompt enhance |
| Axios | 1.x | Google OAuth / OpenAI / Anthropic / SendGrid HTTP |
| Resend | 6.x | Transactional email (fallback/primary) |
| pdf-parse | 1.x | Extract text from uploaded PDFs |
| Wrangler | 4.x | `dev` and `deploy` |

**Key paths:** `backend/server.js`, `backend/routes/`, `backend/services/`

## AI & retrieval

| Technology | Used for |
|------------|----------|
| Google Gemini | Default chat models, tool calling, embeddings (`gemini-embedding-001`, 768-d) |
| OpenAI API | Optional when model id is `gpt-*` and key is set |
| Anthropic API | Optional when model id is `claude-*` and key is set |
| MongoDB vector docs | Store embeddings + chunk text for RAG search |
| Cosine similarity (in-app) | Retrieve relevant chunks for Personal / standard RAG |

## Auth & Google

| Technology | Used for |
|------------|----------|
| Email + OTP | Signup and password reset |
| Google OAuth (openid/profile/email) | Sign-in with Google |
| Google OAuth (Gmail/Calendar/Tasks scopes) | Connect integrations after login |
| JWT Bearer tokens | Session for API routes |

## Media & email

| Technology | Used for |
|------------|----------|
| Pollinations.ai | Image generation endpoint used by `/api/image` |
| SendGrid | Preferred email transport when key present |
| Resend | Email fallback / alternative |

## Why this mix

- **Workers + Hono** — edge deploy, cron, no long-running Node server
- **MongoDB** — flexible documents for chat, tasks, and embeddings
- **Gemini-first** — chat + embeddings in one ecosystem; other providers optional via admin keys
- **SPA frontend** — simple Vercel (or any static host) + CORS to Worker URL
