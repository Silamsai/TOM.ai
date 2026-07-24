const express = require('../config/expressCompat');
const jwt = require('jsonwebtoken');
const router = express.Router();

const getAdminUsername = () => (process.env.ADMIN_USERNAME || 'admin@tomai.com').toLowerCase().trim();
const getAdminSecret = () => (process.env.JWT_SECRET || 'secret') + '-admin';
const User = require('../models/User');
const TempOTP = require('../models/TempOTP');
const { sendOTPEmail, sendPasswordResetEmail, sendConfirmationEmail } = require('../services/emailService');
const { generateOTP, calculateOTPExpiry } = require('../utils/helpers');
const { validateEmail, validatePassword, validateOTP } = require('../utils/validators');
const { ERRORS } = require('../config/constants');

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Attempt to send email, but in development fall back gracefully.
 * Returns { sent: boolean, devOTP?: string }
 */
const trySendOTP = async (sendFn, email, otp) => {
  try {
    await sendFn(email, otp);
    return { sent: true };
  } catch (err) {
    console.error('[Auth Service] Detailed Send Email Error:', err);
    if (IS_DEV) {
      // ⚡ DEV MODE: log OTP to console so you can test without email config
      console.warn(`\n⚡ [DEV MODE] Email failed — OTP for ${email}: ${otp}\n`);
      return { sent: false, devOTP: otp };
    }
    throw new Error(`Failed to send OTP email: ${err.message}`);
  }
};

// ============================================================
// POST /api/auth/signup-send-otp
// ============================================================
router.post('/signup-send-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: ERRORS.EMAIL_REQUIRED });
    if (!validateEmail(email)) return res.status(400).json({ success: false, message: ERRORS.EMAIL_INVALID });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ success: false, message: ERRORS.EMAIL_EXISTS });

    await TempOTP.deleteMany({ email: normalizedEmail, type: 'signup' });

    const otp = generateOTP();
    const expiresAt = calculateOTPExpiry();
    await TempOTP.create({ email: normalizedEmail, otp: Number(otp), type: 'signup', expiresAt });

    const { sent, devOTP } = await trySendOTP(sendOTPEmail, normalizedEmail, otp);

    res.status(200).json({
      success: true,
      message: sent
        ? `OTP sent to ${normalizedEmail}. Valid for 10 minutes.`
        : `[DEV] Email not configured — your OTP is shown below.`,
      ...(devOTP && { devOTP }), // only included in dev when email fails
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/signup-verify-otp
// ============================================================
router.post('/signup-verify-otp', async (req, res, next) => {
  try {
    const { email, otp, password, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: ERRORS.EMAIL_REQUIRED });
    if (!validateEmail(email)) return res.status(400).json({ success: false, message: ERRORS.EMAIL_INVALID });
    if (!validateOTP(otp)) return res.status(400).json({ success: false, message: ERRORS.OTP_INVALID_FORMAT });
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: ERRORS.NAME_REQUIRED });

    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) return res.status(400).json({ success: false, message: pwValidation.message });

    const normalizedEmail = email.toLowerCase().trim();
    const tempOTP = await TempOTP.findOne({ email: normalizedEmail, type: 'signup' });
    if (!tempOTP) return res.status(400).json({ success: false, message: ERRORS.OTP_MISMATCH });
    if (tempOTP.otp !== Number(otp)) return res.status(400).json({ success: false, message: ERRORS.OTP_MISMATCH });
    if (new Date() > tempOTP.expiresAt) return res.status(400).json({ success: false, message: ERRORS.OTP_EXPIRED });

    const user = await User.create({ email: normalizedEmail, password, name: name.trim(), emailVerified: true });
    await TempOTP.deleteMany({ email: normalizedEmail, type: 'signup' });

    const token = user.generateJWT();
    res.status(201).json({ success: true, message: 'Account created successfully!', data: { token, user: user.toJSON() } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ success: false, message: ERRORS.EMAIL_REQUIRED });
    if (!password) return res.status(400).json({ success: false, message: ERRORS.PASSWORD_REQUIRED });

    const normalizedEmail = email.toLowerCase().trim();
    const targetAdminUsername = getAdminUsername();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

    // Check if logging in as admin
    if (normalizedEmail === targetAdminUsername && password === ADMIN_PASSWORD) {
      const adminToken = jwt.sign({ role: 'admin', username: normalizedEmail }, getAdminSecret(), { expiresIn: '7d' });
      return res.status(200).json({
        success: true,
        message: 'Admin login successful!',
        data: {
          token: adminToken,
          admin: true,
          user: {
            email: targetAdminUsername,
            name: 'Admin User',
            role: 'admin'
          }
        }
      });
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ success: false, message: ERRORS.INVALID_CREDENTIALS });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: ERRORS.INVALID_CREDENTIALS });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.generateJWT();
    res.status(200).json({ success: true, message: 'Login successful!', data: { token, user: user.toJSON(), admin: false } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: ERRORS.EMAIL_INVALID });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    let devOTP;
    if (user) {
      const otp = generateOTP();
      user.resetOTP = Number(otp);
      user.resetOTPExpiry = calculateOTPExpiry();
      await user.save({ validateBeforeSave: false });

      const result = await trySendOTP(sendPasswordResetEmail, normalizedEmail, otp);
      if (result.devOTP) devOTP = result.devOTP;
    }

    res.status(200).json({
      success: true,
      message: devOTP
        ? `[DEV] Email not configured. Your OTP is shown below.`
        : 'If that email exists, a reset OTP has been sent.',
      ...(devOTP && { devOTP }),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/verify-reset-otp
// ============================================================
router.post('/verify-reset-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !validateEmail(email)) return res.status(400).json({ success: false, message: ERRORS.EMAIL_INVALID });
    if (!validateOTP(otp)) return res.status(400).json({ success: false, message: ERRORS.OTP_INVALID_FORMAT });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.resetOTP !== Number(otp))
      return res.status(400).json({ success: false, message: ERRORS.OTP_MISMATCH });
    if (new Date() > user.resetOTPExpiry)
      return res.status(400).json({ success: false, message: ERRORS.OTP_EXPIRED });

    res.status(200).json({ success: true, message: 'OTP verified. You may now reset your password.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/reset-password
// ============================================================
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !validateEmail(email)) return res.status(400).json({ success: false, message: ERRORS.EMAIL_INVALID });
    if (!validateOTP(otp)) return res.status(400).json({ success: false, message: ERRORS.OTP_INVALID_FORMAT });

    const pwValidation = validatePassword(newPassword);
    if (!pwValidation.valid) return res.status(400).json({ success: false, message: pwValidation.message });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.resetOTP !== Number(otp))
      return res.status(400).json({ success: false, message: ERRORS.OTP_MISMATCH });
    if (new Date() > user.resetOTPExpiry)
      return res.status(400).json({ success: false, message: ERRORS.OTP_EXPIRED });

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    // Confirmation email is best-effort
    const runSend = trySendOTP(sendConfirmationEmail, normalizedEmail, '').catch(() => { });
    if (typeof req.waitUntil === 'function') {
      req.waitUntil(runSend);
    }

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
