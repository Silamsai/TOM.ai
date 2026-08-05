# API reference

Base URL: `REACT_APP_API_URL` (e.g. `https://tom-ai-backend.<account>.workers.dev/api` or `http://localhost:8787/api` in Wrangler dev).

Unless noted, protected routes need:

```http
Authorization: Bearer <user_jwt>
```

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Liveness check |

## Auth — `routes/auth.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup-send-otp` | No | Email OTP for signup |
| POST | `/api/auth/signup-verify-otp` | No | Verify OTP, create user, return JWT |
| POST | `/api/auth/login` | No | Email/password (or admin shortcut) |
| POST | `/api/auth/forgot-password` | No | Send reset OTP |
| POST | `/api/auth/verify-reset-otp` | No | Verify reset OTP |
| POST | `/api/auth/reset-password` | No | Set new password |

## Google sign-in — `routes/googleAuth.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google/url` | No | Auth URL helper (if used) |
| POST | `/api/auth/google/callback` | No | Exchange code → user + JWT |

Frontend usually builds the Google URL client-side (`frontend/src/utils/googleAuth.js`) then posts the code to the callback.

## Google connect — `routes/oauth.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/oauth/google/connect-url` | Yes | URL with Gmail/Calendar/Tasks scopes |
| POST | `/api/oauth/google/connect-callback` | Yes | Store integration tokens |
| POST | `/api/oauth/revoke/gmail` | Yes | Revoke Gmail |
| POST | `/api/oauth/revoke/calendar` | Yes | Revoke Calendar |
| POST | `/api/oauth/revoke/tasks` | Yes | Revoke Tasks |
| POST | `/api/oauth/revoke/all-google` | Yes | Revoke all Google integrations |

## Chat — `routes/chat.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/message` | Yes | Send message (model, mode, attachments) |
| GET | `/api/chat/history` | Yes | Conversation history |
| DELETE | `/api/chat/...` | Yes | Delete conversation (see route file) |

## Tasks — `routes/tasks.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tasks/create` | Yes | Create task |
| GET | `/api/tasks/list` | Yes | List tasks |
| GET/PUT/DELETE | `/api/tasks/...` | Yes | Get / update / delete / complete |

## Reminders — `routes/reminders.js`

Create / list / delete reminder records (alongside task reminder fields).

## RAG — `routes/rag.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/rag/upload` | Yes | Multipart file upload (max **100 MB**) |
| GET | `/api/rag/documents` | Yes | List personal documents |
| DELETE | `/api/rag/documents/:id` | Yes | Delete doc + vectors |

## Image — `routes/image.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/image/generate` | Yes* | Generate image via Pollinations |
| GET | `/api/image/...` | — | Models / styles catalogue |

\*Confirm auth requirements in route file for your deploy.

## User — `routes/user.js`

Profile, access flags, storage info, clear chat history, etc.

## Gmail — `routes/gmail.js`

List messages when Gmail is connected.

## Admin — `routes/admin.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/login` | No | Admin JWT |
| GET | `/api/admin/ai-models-public` | No | Models for providers with keys |
| GET/PUT | `/api/admin/...` | Admin JWT | Config, MCPs, AI keys, RAG, profile |

Admin JWT uses a different secret and is rejected by normal user middleware.

## Frontend client

All Axios wrappers: `frontend/src/services/api.js`.
