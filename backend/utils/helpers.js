const { OTP_VALIDITY_MINUTES } = require('../config/constants');

/**
 * Generates a cryptographically random 6-digit OTP.
 * @returns {string} 6-digit OTP string (padded with leading zeros if needed)
 */
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return String(otp);
};

/**
 * Builds a standard error response object.
 * @param {Error|string} error
 * @returns {{ success: false, message: string }}
 */
const formatErrorResponse = (error) => ({
  success: false,
  message: typeof error === 'string' ? error : error?.message || 'An unexpected error occurred.',
});

/**
 * Builds a standard success response object.
 * @param {*} data
 * @param {string} message
 * @returns {{ success: true, message: string, data: * }}
 */
const formatSuccessResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data,
});

/**
 * Returns the current datetime as an ISO 8601 string.
 * @returns {string}
 */
const getCurrentDateTime = () => new Date().toISOString();

/**
 * Calculates the OTP expiry timestamp.
 * @returns {Date} expiry time (OTP_VALIDITY_MINUTES from now)
 */
const calculateOTPExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_VALIDITY_MINUTES);
  return expiry;
};

module.exports = {
  generateOTP,
  formatErrorResponse,
  formatSuccessResponse,
  getCurrentDateTime,
  calculateOTPExpiry,
};
