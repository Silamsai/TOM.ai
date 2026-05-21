# 🤖 TOM.AI — RAG-Powered Intelligent Personal Assistant

TOM.AI is a highly optimized, production-grade personal assistant application that integrates a custom **Retrieval-Augmented Generation (RAG)** pipeline with native Google services, task scheduling, and an administrative panel. It operates as a personal productivity hub, allowing users to converse, search, and manage their files, calendar events, tasks, and emails using simple conversational natural language.

---

## 🧠 Core Architecture Highlights

### 1. Zero-Dependency RAG Pipeline
Rather than relying on expensive external vector database subscriptions, TOM.AI integrates a cost-free, high-performance semantic memory system:
* **Vector Embeddings**: Leverages Google Gemini's **`text-embedding-004`** model to convert user documents (emails, tasks, chats, calendar metadata) into 768-dimensional vector representations.
* **Storage**: Keeps vectors embedded natively alongside document schema in **MongoDB** using a `VectorDocument` collection.
* **Search Mechanics**: Performs dynamic **Cosine Similarity** scanning directly on the database query side with an optimized threshold cutoff (`> 0.65`) to retrieve relevant context.
* **Prompt Grounding**: Automatically matches queries against the user's vector store, building a RAG context snippet injected dynamically into the LLM system prompt.

### 2. Dual-Model Resilient Chat & Media Engine
* **Model Orchestration**: Utilizes **Gemini 2.5 Flash**, **Gemini 2.0 Flash**, and **Gemini 2.0 Flash Lite** with a progressive fallback policy if a model rate limit or quota is exhausted.
* **Polished Chat Experience**: Maintains persistent conversation history (MongoDB) and incorporates advanced prompt engineering that supports user requests for specific response types (e.g., *sheet-style tables* or *executive report formats*).
* **AI Image Generation**: Built-in system routing intercepts image generation commands, instantly returning rich high-fidelity visual representations via Pollinations AI markdown injection.

### 3. Integrated Google Workspace Engine
* **Google OAuth 2.0**: Native sign-in flow that securely authorizes the application to fetch personal resources.
* **Gmail API Integration**: Accesses the Gmail API using secure OAuth refresh tokens. Fetched emails are automatically parsed and indexed into the RAG vector store for instant AI query recall.

### 4. Scheduled Tasks & Reminders
* **Background Services**: Runs background scheduling routines powered by **node-cron**.
* **Task Management**: Implements structured tasks with priority sorting, target due dates, and completion status.
* **Notification Flow**: Periodically evaluates deadlines and fires off automated email reminders and OTP verification codes via Nodemailer SMTP.

### 5. Premium Admin Panel
* **Admin Dashboard**: Dedicated dashboard containing administrative insights, real-time analytics (active users, total database documents, token usages), system configurations, and user management features.
* **Route Protection**: Fully fortified with custom middleware handling JWT validation and role-based permissions (User vs. Admin).

---

## 🏗️ Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, React Router v6, Axios, Custom CSS Modules (Dark Theme glassmorphism, responsive views) |
| **Backend** | Node.js, Express, MongoDB (Mongoose ORM) |
| **AI / RAG** | Google Generative AI SDK, `text-embedding-004`, Cosine Similarity Engine |
| **Integrations** | Google OAuth 2.0, Gmail REST API |
| **Background Jobs** | Node-Cron, Nodemailer (SMTP OTP & Reminders) |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |

---

## 📁 Directory Structure

```
tom-ai/
├── backend/               # Express REST API, Services, & Database Models
│   ├── config/            # Database and static constants configuration
│   ├── middleware/        # JWT validator, admin rights check, error handlers
│   ├── models/            # Mongoose Schemas (User, Task, ChatHistory, VectorDocument)
│   ├── routes/            # Route controllers (Auth, Chat, Tasks, Gmail, Admin)
│   ├── services/          # Gemini API, RAG, OAuth, Cron Jobs, Email SMTP
│   └── utils/             # Helpers and validation functions
├── frontend/              # React SPA
│   ├── public/            # Static assets and main HTML entry
│   └── src/               # React components, custom hooks, and pages
└── README.md              # Project Documentation
```

---

## ⚡ Setup & Installation

### Prerequisites
* **Node.js** (v16.0.0 or higher)
* **MongoDB** (Atlas cluster or a local community server instance)
* **Google Gemini API Key** (Obtain for free at [Google AI Studio](https://aistudio.google.com/))
* **Google Cloud Console Credentials** (With Gmail API enabled and OAuth Web Client credentials set up)
* **Gmail Account & App Password** (For sending OTP and reminder emails via SMTP)

---

### Step 1: Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```
4. Fill in the `.env` parameters:
   ```env
   MONGODB_URI=your_mongodb_connection_uri
   DB_NAME=tom-ai-db
   JWT_SECRET=your_long_secure_jwt_secret
   GMAIL_USER=your_smtp_sender_email@gmail.com
   GMAIL_PASS=your_16_char_gmail_app_password
   GEMINI_API_KEY=your_gemini_studio_api_key
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   ```
5. Spin up the backend server in development mode:
   ```bash
   npm run dev
   ```

---

### Step 2: Frontend Configuration

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install the necessary frontend dependencies:
   ```bash
   npm install
   ```
3. Set up the local environment variable:
   ```bash
   cp .env.example .env
   ```
4. Configure the API endpoint in `frontend/.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```
5. Launch the React development server:
   ```bash
   npm start
   ```

---

## 📌 Principal API Endpoints

### 🔐 Authentication & Accounts
* `POST /api/auth/signup-send-otp` — Initiates sign-up flow, emails verification code.
* `POST /api/auth/signup-verify-otp` — Confirms verification code and registers new profile.
* `POST /api/auth/login` — Normal password sign-in (returns JWT).
* `POST /api/auth/forgot-password` — Dispatches account recovery code.
* `POST /api/auth/reset-password` — Authenticates recovery code and applies new password.

### 🌐 Google OAuth & Integration
* `GET /api/auth/google` — Triggers Google sign-in & permissions screen.
* `GET /api/gmail/emails` — Fetches current inbox items via OAuth and triggers background RAG indexing.

### 💬 Chat & AI Agent
* `POST /api/chat/message` — Dispatches chat text/assets, runs RAG matching, queries Gemini, indexes message.
* `GET /api/chat/history` — Retraces the user's personal conversation history log.

### 📝 Tasks & Todo
* `POST /api/tasks/create` — Creates a task (priority levels, due dates) and embeds it to vector store.
* `GET /api/tasks/list` — Queries custom filters (pending vs. complete).
* `PUT /api/tasks/update/:id` — Standard fields editor.
* `PUT /api/tasks/complete/:id` — Flags task complete.
* `DELETE /api/tasks/delete/:id` — Removes task and references.

### 👑 Administrative Operations
* `GET /api/admin/stats` — Fetches global server and database counts.
* `GET /api/admin/users` — Lists profiles with deletion/moderation capability.

---

## 🛡️ License

This project is licensed under the MIT License. Feel free to clone, modify, and distribute as desired!
