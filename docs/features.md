# Features

Product capabilities and the tech that powers each.

## Guest chat

- Try the assistant without an account.
- Answers are generated **in the browser** (`frontend/src/utils/guestAI.js`).
- No JWT, no Gemini call, limited capability.

## Authenticated chat

- Full conversational AI via `POST /api/chat/message`.
- Default model: Gemini Flash family; admin can expose OpenAI/Anthropic models when keys exist.
- Modes:
  - **Chat (standard)** — general assistant; may use broader RAG context
  - **Personal** — answers grounded in the user’s uploaded documents
- Optional Google tools when Gmail/Calendar/Tasks are connected.

**Tech:** Gemini (`geminiService.js`), ChatHistory model, Axios client.

## Personal RAG (Knowledge Base)

- Upload PDF / TXT / Markdown (up to **100 MB** per file).
- Documents are chunked, embedded, and stored per user.
- Personal mode retrieves only that user’s docs.

**Tech:** `ragService.js`, pdf-parse, Gemini embeddings, `PersonalDocument` + `VectorDocument`.  
Details: [Personal RAG](./rag.md).

## Tasks & reminders

- Create, list, complete, and delete tasks (`/todos`).
- Optional daily reminder time (HH:MM, IST matching in cron).
- Chat can create tasks from conversation.
- Emails for task created / reminder when email provider is configured.

**Tech:** Task model, `/api/tasks`, Worker cron `checkReminders`.

## Google integrations

| Integration | Scope purpose |
|-------------|----------------|
| Gmail | Read mail (assistant tools) |
| Calendar | Read/create events |
| Tasks | Google Tasks access |

Connect flow is separate from Google sign-in.  
**Tech:** `/api/oauth`, stored tokens on User, Gemini function/tool calling.

## Image generation

- Dedicated page `/image-gen` and chat “Generate Image” helper.
- Backend calls Pollinations; optional Gemini prompt enhancement.

**Tech:** `/api/image`, Pollinations HTTP API.

## Auth & account

- Email signup with OTP verification
- Login / forgot password
- Google sign-in
- Settings: profile, connected apps, storage/history controls
- Terms of Service & Privacy Policy linked from auth screens

**Tech:** JWT, bcrypt, TempOTP, emailService, Google OAuth.

## Admin panel

- `/admin` — configure AI providers/keys, MCP stubs, RAG flags, profile.
- Separate admin password (`ADMIN_PASSWORD`); login disabled if unset.
- Public model list for chat: `GET /api/admin/ai-models-public`.

**Tech:** Admin JWT, Mongo `configs` document.

## Scheduled jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Reminders | Every minute | Email users whose task reminder time matches |
| Task cleanup | Daily | Remove old completed/cancelled tasks (30+ days) |

## Legal

- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- Shown on Welcome, Login, Signup, and auth modal
