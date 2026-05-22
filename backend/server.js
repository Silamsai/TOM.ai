require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// ---- Route Imports --------------------------------------------------------
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const taskRoutes = require('./routes/tasks');
const reminderRoutes = require('./routes/reminders');
const oauthRoutes = require('./routes/oauth');
const googleAuthRoutes = require('./routes/googleAuth');
const gmailRoutes = require('./routes/gmail');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Start Background Jobs ------------------------------------------------
const { startCronJobs } = require('./services/cronJobs');
startCronJobs();


// ============================================================
// Middleware
// ============================================================
const allowedOrigins = [
  'http://localhost:3000',
  'https://tom-ai-one.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // or return callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: '🤖 TOM.AI backend is running.', timestamp: new Date().toISOString() });
});

// 404 handler (must be after all routes)
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`\n🤖 TOM.AI Backend`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API: http://localhost:${PORT}/api\n`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000); // Force exit after 10s
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
