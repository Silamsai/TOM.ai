const jwt = require('jsonwebtoken');
const { ERRORS } = require('../config/constants');

/**
 * Authentication middleware.
 * Extracts and verifies the Bearer JWT from the Authorization header.
 * Attaches `req.userId` and `req.user` on success.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: ERRORS.NO_TOKEN });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: ERRORS.INVALID_TOKEN });
  }
};

module.exports = authMiddleware;
