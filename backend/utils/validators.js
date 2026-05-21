const { PASSWORD_MIN_LENGTH } = require('../config/constants');

/**
 * Validates email format using RFC-5322 simplified regex.
 * @param {string} email
 * @returns {boolean}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
};

/**
 * Validates password complexity.
 * Requires: min length, uppercase, number, special character.
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }
  return { valid: true };
};

/**
 * Validates that an OTP is exactly 6 numeric digits.
 * @param {string|number} otp
 * @returns {boolean}
 */
const validateOTP = (otp) => {
  if (otp === undefined || otp === null) return false;
  return /^\d{6}$/.test(String(otp).trim());
};

/**
 * Validates a task name.
 * @param {string} taskName
 * @returns {{ valid: boolean, message?: string }}
 */
const validateTaskName = (taskName) => {
  if (!taskName || typeof taskName !== 'string' || taskName.trim().length === 0) {
    return { valid: false, message: 'Task name is required.' };
  }
  if (taskName.trim().length > 200) {
    return { valid: false, message: 'Task name must not exceed 200 characters.' };
  }
  return { valid: true };
};

/**
 * Sanitises a string input to prevent basic injection attacks.
 * Trims whitespace and strips dangerous HTML/script characters.
 * @param {string} input
 * @returns {string}
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;');
};

module.exports = {
  validateEmail,
  validatePassword,
  validateOTP,
  validateTaskName,
  sanitizeInput,
};
