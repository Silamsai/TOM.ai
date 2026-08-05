# Backend services

Business logic lives under `backend/services/`. Routes call these modules.

## `geminiService.js`

**Role:** Core AI orchestration for authenticated chat.

- Selects provider by model id (Gemini default; `gpt-*` → OpenAI; `claude-*` → Anthropic)
- Builds system prompts and conversation history
- Attaches **Google tools** when the user has connected Gmail / Calendar / Tasks
- Injects **RAG context** for personal or standard modes
- Can parse replies into task creation and trigger related emails
- Image-related system guidance (Pollinations markdown) where applicable

**Used by:** `routes/chat.js`, image prompt enhancement.

## `ragService.js`

**Role:** Document and vector pipeline.

- Parse uploads (PDF via `pdf-parse`, plain text/markdown)
- Chunk text (~2000 chars, 200 overlap)
- Embed with Gemini (`gemini-embedding-001`, 768 dimensions)
- Store / delete `PersonalDocument` + `VectorDocument` rows
- Cosine similarity search for chat context
- Also indexes chat messages / other content helpers used by the product

**Used by:** `routes/rag.js`, chat path inside `geminiService`.

## `googleAuthService.js`

**Role:** Google OAuth helpers for **sign-in**.

- Build authorization URLs (`openid profile email`)
- Exchange authorization code for tokens
- Fetch Google userinfo to create/link local users

**Used by:** `routes/googleAuth.js`.

## `emailService.js`

**Role:** Transactional email on Workers (no SMTP).

Priority:

1. SendGrid (if `SENDGRID_API_KEY`)
2. Resend (if `RESEND_API_KEY`)
3. Fail gracefully / log if neither is configured

**Sends:** signup OTP, password reset OTP, confirmations, task created, task reminders.

**Used by:** `routes/auth.js`, task/reminder flows, `cronJobs.js`.

## `cronJobs.js`

**Role:** Scheduled Worker handlers.

| Export | Behavior |
|--------|----------|
| `checkReminders` | Find pending tasks with reminder set; match current IST HH:MM; send email; mark notified |
| `cleanupOldTasks` | Delete completed/cancelled tasks inactive for 30+ days |

Wired from `server.js` `scheduled` event + `wrangler.toml` crons.

## Supporting config modules

| File | Role |
|------|------|
| `config/database.js` | Connect to MongoDB |
| `config/dbCompat.js` | Mongoose-like API over native driver |
| `config/expressCompat.js` | Express-style routers on Hono (incl. multipart → `req.file`) |
| `config/constants.js` | OTP validity, JWT expiry, etc. |
| `middleware/auth.js` | Verify user JWT; reject admin tokens on user routes |

## Models (persistence)

| Model | Service consumers |
|-------|-------------------|
| `User` | Auth, OAuth, tools, settings |
| `ChatHistory` | Chat |
| `Task` / `Reminder` | Tasks, cron |
| `TempOTP` | Signup |
| `PersonalDocument` / `VectorDocument` | RAG |
