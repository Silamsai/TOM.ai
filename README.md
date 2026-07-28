# TOM.AI

TOM.AI is a React-based personal assistant with guest chat, authenticated chat, Google integrations, task management, personal-document RAG, image generation, and an admin panel for model/provider configuration.

## Current architecture

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
- Optional OpenAI and Anthropic routing exists when API keys are configured
- Google OAuth is used for sign-in and for Gmail / Calendar / Tasks integrations
- Personal documents are chunked, embedded, and stored in MongoDB for RAG retrieval

### Email and scheduled jobs
- Email delivery uses SendGrid or Resend
- Worker cron triggers are defined in `backend/wrangler.toml`
- Reminder and cleanup jobs live in `backend/services/cronJobs.js`

## Repo layout

```text
TOM.ai/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/
│   ├── public/
│   └── src/
└── README.md
```

## Running locally

### Option 1: frontend + local backend

Use this when you want full local development.

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Configure backend environment variables:
   ```env
   MONGODB_URI=your_mongodb_connection_uri
   DB_NAME=tom-ai-db
   JWT_SECRET=your_long_secure_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   FRONTEND_URL=http://localhost:3000
   ADMIN_PASSWORD=choose_a_strong_admin_password
   SENDGRID_API_KEY=optional
   RESEND_API_KEY=optional
   RESEND_FROM=optional
   GOOGLE_SIGNIN_REDIRECT_URI=http://localhost:3000/auth/google/callback
   GOOGLE_CONNECT_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```
3. Start the backend:
   ```bash
   npm run dev
   ```
4. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
5. Configure the frontend:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   REACT_APP_GOOGLE_SIGNIN_REDIRECT_URI=http://localhost:3000/auth/google/callback
   REACT_APP_GOOGLE_CONNECT_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```
6. Start the frontend:
   ```bash
   npm start
   ```

### Option 2: frontend only against a deployed backend

Use this when the backend is already deployed to Cloudflare Workers.

```env
REACT_APP_API_URL=https://your-deployed-backend.example.com/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id
REACT_APP_GOOGLE_SIGNIN_REDIRECT_URI=http://localhost:3000/auth/google/callback
REACT_APP_GOOGLE_CONNECT_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

Then run:

```bash
cd frontend
npm install
npm start
```

Notes:
- The frontend now defaults to `/api` when no explicit API URL is provided, which is useful for hosted same-origin setups.
- For local `npm start`, set `REACT_APP_API_URL` explicitly unless your frontend is being served behind a proxy that already exposes `/api`.

## Deployment notes

### Backend
- Deploy with Wrangler from `backend`
- Required Worker secrets include:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GEMINI_API_KEY`
  - `ADMIN_PASSWORD`
  - email provider secrets if email is needed

### Frontend
- `frontend/vercel.json` only handles SPA history fallback
- For hosted frontend deployments, prefer setting `REACT_APP_API_URL` to the deployed backend instead of relying on a hardcoded rewrite target

## Main API areas

- `POST /api/auth/login`
- `POST /api/auth/google/callback`
- `GET /api/oauth/google/connect-url`
- `POST /api/oauth/google/connect-callback`
- `POST /api/chat/message`
- `GET /api/chat/history`
- `POST /api/tasks/create`
- `GET /api/tasks/list`
- `POST /api/rag/upload`
- `GET /api/rag/documents`
- `POST /api/image/generate`
- `GET /api/admin/ai-models-public`

## Important operational notes

- Admin login is disabled unless `ADMIN_PASSWORD` is configured.
- Google sign-in and Google integration connect flows can use separate redirect URI environment variables.
- Task cleanup only removes completed or cancelled tasks that have been inactive for 30+ days.
