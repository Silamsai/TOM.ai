/**
 * Global error-handling middleware for TOM.AI backend.
 * Must be registered AFTER all routes in server.js.
 */
const errorHandler = (err, req, res, next) => {
  // Always log to console for debugging
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // ---- Mongoose validation errors (e.g. required field missing) ------------
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages,
    });
  }

  // ---- Mongoose duplicate key error (e.g. duplicate email) -----------------
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  // ---- JWT errors ----------------------------------------------------------
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }

  // ---- CORS errors ---------------------------------------------------------
  if (err.message && err.message.toLowerCase().includes('cors')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation.',
    });
  }

  // ---- Custom 404 ----------------------------------------------------------
  if (err.status === 404 || err.statusCode === 404) {
    return res.status(404).json({
      success: false,
      message: err.message || 'Resource not found.',
    });
  }

  // ---- Default 500 ---------------------------------------------------------
  let clientMessage = err.message || 'An unexpected server error occurred.';

  // Mask API key and sensitive service errors
  const lowerMsg = clientMessage.toLowerCase();
  if (
    lowerMsg.includes('api_key') ||
    lowerMsg.includes('api key') ||
    lowerMsg.includes('apikey') ||
    lowerMsg.includes('gemini') ||
    lowerMsg.includes('google')
  ) {
    clientMessage = 'Error occurred, please wait.';
  }

  res.status(err.status || 500).json({
    success: false,
    message: clientMessage,
  });
};

module.exports = errorHandler;
