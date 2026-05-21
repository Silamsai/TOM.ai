# 🤖 TOM.AI — Intelligent Personal Assistant

> AI-powered personal assistant that helps you manage tasks, emails, and calendar through natural language chat with Tom.

---

## 🚀 Features

- **Email OTP Verification** – Secure signup & password reset flow
- **Natural Language Chat** – Powered by Anthropic Claude API
- **Gmail Integration** – Read, search & summarize emails via MCP
- **Google Calendar** – View & create events via MCP
- **Smart To-Do List** – Tasks with priorities, due dates & reminders
- **RAG System** – Vector database (Pinecone) for context-aware responses
- **Multi-user Support** – Fully isolated data per user via JWT auth

---

## 🏗️ Tech Stack

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React, React Router, Axios                   |
| Backend     | Node.js, Express, MongoDB (Mongoose)          |
| AI          | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Auth        | JWT, bcryptjs, OTP via Nodemailer            |
| MCP Servers | Gmail, Google Calendar, Google Tasks         |
| Vector DB   | Pinecone + OpenAI Embeddings (Phase 3)       |
| Deployment  | Vercel (frontend) + Railway (backend)         |

---

## 📁 Project Structure

```
tom-ai/
├── tom-ai-backend/        # Express + MongoDB API
├── tom-ai-frontend/       # React SPA
├── tom-ai-mcp-servers/    # MCP integration servers
│   ├── gmail-mcp/
│   ├── calendar-mcp/
│   └── tasks-mcp/
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js >= 16
- MongoDB Atlas account (or local MongoDB)
- Anthropic API key
- Gmail account (for sending OTP emails)

### 1. Backend Setup

```bash
cd tom-ai-backend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

### 2. Frontend Setup

```bash
cd tom-ai-frontend
npm install
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:5000/api
npm start
```

### 3. MCP Servers (Phase 2)

```bash
cd tom-ai-mcp-servers/gmail-mcp
npm install
node server.js
```

---

## 🔐 Environment Variables

### Backend `.env`
| Variable          | Description                            |
|-------------------|----------------------------------------|
| `MONGODB_URI`     | MongoDB connection string              |
| `JWT_SECRET`      | Secret key for JWT (min 32 chars)      |
| `GMAIL_USER`      | Gmail address for sending OTP          |
| `GMAIL_PASS`      | Gmail App Password (not regular pass)  |
| `ANTHROPIC_API_KEY` | Claude API key                       |
| `PORT`            | Server port (default: 5000)            |
| `FRONTEND_URL`    | Frontend URL for CORS                  |

### Frontend `.env`
| Variable             | Description           |
|----------------------|-----------------------|
| `REACT_APP_API_URL`  | Backend API base URL  |

---

## 📌 API Endpoints

### Auth
| Method | Endpoint                  | Description             |
|--------|---------------------------|-------------------------|
| POST   | `/api/auth/signup-send-otp`   | Send signup OTP         |
| POST   | `/api/auth/signup-verify-otp` | Verify OTP & create user|
| POST   | `/api/auth/login`             | Login                   |
| POST   | `/api/auth/forgot-password`   | Send reset OTP          |
| POST   | `/api/auth/verify-reset-otp`  | Verify reset OTP        |
| POST   | `/api/auth/reset-password`    | Reset password          |

### Chat
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| POST   | `/api/chat/message` | Send message to AI   |
| GET    | `/api/chat/history` | Get chat history     |

### Tasks
| Method | Endpoint                 | Description     |
|--------|--------------------------|-----------------|
| POST   | `/api/tasks/create`      | Create task     |
| GET    | `/api/tasks/list`        | List tasks      |
| GET    | `/api/tasks/:id`         | Get task        |
| PUT    | `/api/tasks/update/:id`  | Update task     |
| PUT    | `/api/tasks/complete/:id`| Complete task   |
| DELETE | `/api/tasks/delete/:id`  | Delete task     |

---

## 🔄 Development Phases

| Phase | Focus                          | Weeks  |
|-------|--------------------------------|--------|
| 1     | Core Backend + Frontend Auth   | 1–5    |
| 2     | MCP Server Integrations        | 6–9    |
| 3     | RAG Implementation             | 10–13  |
| 4     | Testing & Deployment           | 14–16  |

---

## 🔑 Admin Test Credentials (Dev Only)

> ⚠️ **For development/testing only. Change before deploying to production.**

- **Email:** `test@example.com`
- **Password:** `Test@1234`

---

## 📝 License

MIT © TOM.AI
