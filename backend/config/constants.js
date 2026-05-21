/**
 * Application-wide constants for TOM.AI backend.
 * Centralising these avoids magic numbers scattered across the codebase.
 */

// ---- OTP ------------------------------------------------------------------
/** How long (minutes) an OTP remains valid */
const OTP_VALIDITY_MINUTES = 10;

// ---- JWT ------------------------------------------------------------------
/** JWT token lifetime (passed to jsonwebtoken's `expiresIn`) */
const JWT_EXPIRY = '7d';

// ---- Validation -----------------------------------------------------------
/** Minimum allowed length for user passwords */
const PASSWORD_MIN_LENGTH = 8;

// ---- Chat -----------------------------------------------------------------
/** Maximum number of chat history items returned per query */
const MAX_CHAT_HISTORY = 50;

// ---- Tasks ----------------------------------------------------------------
/** Maximum tasks a single user can create */
const MAX_TASKS_PER_USER = 1000;

// ---- Error Messages -------------------------------------------------------
const ERRORS = {
  // Auth
  EMAIL_REQUIRED: 'Email address is required.',
  EMAIL_INVALID: 'Please provide a valid email address.',
  EMAIL_EXISTS: 'An account with this email already exists.',
  EMAIL_NOT_FOUND: 'No account found with this email address.',
  PASSWORD_REQUIRED: 'Password is required.',
  PASSWORD_TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  PASSWORD_WEAK: 'Password must contain at least one uppercase letter, one number, and one special character.',
  PASSWORDS_MISMATCH: 'Passwords do not match.',
  NAME_REQUIRED: 'Name is required.',
  OTP_REQUIRED: 'OTP is required.',
  OTP_INVALID_FORMAT: 'OTP must be exactly 6 digits.',
  OTP_MISMATCH: 'Invalid OTP. Please check and try again.',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  OTP_SEND_FAIL: 'Failed to send OTP email. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',

  // Auth middleware
  NO_TOKEN: 'Access denied. No token provided.',
  INVALID_TOKEN: 'Invalid or expired token.',

  // Tasks
  TASK_NAME_REQUIRED: 'Task name is required.',
  TASK_NAME_TOO_LONG: 'Task name must not exceed 200 characters.',
  TASK_NOT_FOUND: 'Task not found.',
  TASK_LIMIT_REACHED: `You have reached the maximum limit of ${MAX_TASKS_PER_USER} tasks.`,

  // Chat
  MESSAGE_REQUIRED: 'Message cannot be empty.',
  CLAUDE_ERROR: 'Failed to get a response from Claude. Please try again.',

  // General
  SERVER_ERROR: 'An unexpected server error occurred. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORISED: 'You are not authorised to perform this action.',
};

module.exports = {
  OTP_VALIDITY_MINUTES,
  JWT_EXPIRY,
  PASSWORD_MIN_LENGTH,
  MAX_CHAT_HISTORY,
  MAX_TASKS_PER_USER,
  ERRORS,
};
