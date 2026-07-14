const { Hono } = require('hono');
const { cors } = require('hono/cors');
const connectDB = require('./config/database');
const { setGlobalEnv, dbStorage } = require('./config/dbCompat');
const { toHonoHandler } = require('./config/expressCompat');

// ---- Route Imports --------------------------------------------------------
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const taskRoutes = require('./routes/tasks');
const reminderRoutes = require('./routes/reminders');
const oauthRoutes = require('./routes/oauth');
const googleAuthRoutes = require('./routes/googleAuth');
const gmailRoutes = require('./routes/gmail');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const ragRoutes = require('./routes/rag');
const imageRoutes = require('./routes/image');

const app = new Hono();

// ============================================================
// CORS Configuration
// ============================================================
app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || process.env.FRONTEND_URL;
    const origins = [
      'http://localhost:3000',
      'https://localhost:3000'
    ];
    if (frontendUrl) origins.push(frontendUrl);

    if (origin && (origins.includes(origin) || origin.endsWith('.vercel.app'))) {
      return origin;
    }
    return origins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600,
}));

// ============================================================
// Database & Env Bindings Middleware
// ============================================================
let dbConnected = false;

app.use('*', async (c, next) => {
  // Bind Hono Context environment secrets to global process.env
  setGlobalEnv(c.env);

  const store = { db: null, client: null };
  return dbStorage.run(store, async () => {
    // Lazily connect to MongoDB if not connected
    if (!dbConnected) {
      try {
        await connectDB();
        dbConnected = true;
      } catch (e) {
        console.error('[Database Lazy Connect Failed]:', e.message);
      }
    }

    try {
      await next();
    } finally {
      if (store.client) {
        try {
          await store.client.close();
        } catch (e) {
          console.error('[Database Context Cleanup Failed]:', e.message);
        }
      }
    }
  });
});

// Simple Request Logger
app.use('*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path}`);
  await next();
});

// ============================================================
// Mount Express Route Mocks
// ============================================================
const mountRouter = (honoInstance, routePath, expressRouter) => {
  const routerSub = new Hono();

  for (const r of expressRouter.honoRoutes) {
    const { method, path, handlers } = r;
    const honoHandlers = handlers.map(h => toHonoHandler(h));

    if (method === 'use') {
      routerSub.use(path, ...honoHandlers);
    } else {
      routerSub[method](path, ...honoHandlers);
    }
  }

  honoInstance.route(routePath, routerSub);
};

mountRouter(app, '/api/auth', authRoutes);
mountRouter(app, '/api/auth/google', googleAuthRoutes);
mountRouter(app, '/api/chat', chatRoutes);
mountRouter(app, '/api/tasks', taskRoutes);
mountRouter(app, '/api/reminders', reminderRoutes);
mountRouter(app, '/api/oauth', oauthRoutes);
mountRouter(app, '/api/gmail', gmailRoutes);
mountRouter(app, '/api/admin', adminRoutes);
mountRouter(app, '/api/user', userRoutes);
mountRouter(app, '/api/rag', ragRoutes);
mountRouter(app, '/api/image', imageRoutes);

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    message: '🤖 TOM.AI backend is running.',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.notFound((c) => {
  return c.json({ success: false, message: 'Route not found.' }, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err);

  let status = err.status || err.statusCode || 500;
  let success = false;
  let message = err.message || 'An unexpected server error occurred.';
  let errors = undefined;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    errors = Object.values(err.errors || {}).map((e) => e.message);
  } else if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Invalid or expired authentication token.';
  } else if (err.message && err.message.toLowerCase().includes('cors')) {
    status = 403;
    message = 'CORS policy violation.';
  } else if (status === 404) {
    message = err.message || 'Resource not found.';
  }

  // Check environment to determine if we should return actual error details
  const isDev = (c.env.NODE_ENV || process.env.NODE_ENV) === 'development';
  if (isDev) {
    message = `${err.message || err}`;
    errors = err.stack ? err.stack.split('\n') : undefined;
  } else {
    // Check if the message contains sensitive API strings
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes('api_key') ||
      lowerMsg.includes('api key') ||
      lowerMsg.includes('apikey') ||
      lowerMsg.includes('gemini') ||
      lowerMsg.includes('google')
    ) {
      message = 'AI brain not working, please wait.';
    }
  }

  // Explicitly apply CORS headers on error response
  const originHeader = c.req.header('Origin');
  const frontendUrl = c.env.FRONTEND_URL || process.env.FRONTEND_URL;
  const origins = [
    'http://localhost:3000',
    'https://localhost:3000',
  ];
  if (frontendUrl) origins.push(frontendUrl);
  let allowedOrigin = '*';
  if (originHeader) {
    if (origins.includes(originHeader) || originHeader.endsWith('.vercel.app')) {
      allowedOrigin = originHeader;
    }
  }
  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return c.json({ success, message, ...(errors && { errors }) }, status);
});

// ============================================================
// Worker Export Definition
// ============================================================
const workerExport = {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    // Bind Hono Context environment secrets to global process.env
    setGlobalEnv(env);

    // Connect to DB for the scheduled task
    try {
      await connectDB();
    } catch (e) {
      console.error('[Scheduled Trigger DB Connect Failed]:', e.message);
    }

    const { checkReminders, cleanupOldTasks } = require('./services/cronJobs');
    if (event.cron === "0 0 * * *") {
      await cleanupOldTasks();
    } else {
      await checkReminders();
    }
  }
};

export default workerExport;
