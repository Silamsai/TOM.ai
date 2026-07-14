const mongoose = require('../config/dbCompat');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_EXPIRY } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      // Not required for Google OAuth users
      minlength: 8,
    },
    name: {
      type: String,
      trim: true,
    },
    lastLogin: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // OTP for signup verification
    verificationOTP: { type: Number },
    verificationOTPExpiry: { type: Date },
    // OTP for password reset
    resetOTP: { type: Number },
    resetOTPExpiry: { type: Date },
    // ---- Google Sign-In fields ------------------------------------------
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
    },
    googleToken: { type: String, default: null },
    googleRefreshToken: { type: String, default: null },
    picture: { type: String, default: null }, // profile picture URL from Google
    signupMethod: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    lastLoginMethod: { type: String, enum: ['email', 'google'], default: 'email' },
    // ---- OAuth tokens for 3rd-party integrations (Phase 2) ---------------
    tokens: {
      gmail: { type: String, default: null },
      calendar: { type: String, default: null },
      tasks: { type: String, default: null },
    },
    permissions: {
      gmail: { type: Boolean, default: false },
      calendar: { type: Boolean, default: false },
      tasks: { type: Boolean, default: false },
    },
    aiPersona: {
      type: String,
      enum: ['professional', 'creative', 'sarcastic', 'empathetic'],
      default: 'professional',
    },
    dailyBriefTime: {
      type: String,
      default: 'disabled',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt automatically
  }
);

// ---- Indexes ----------------------------------------------------------------
userSchema.index({ createdAt: -1 });
// Note: googleId index is already defined inline (unique: true, sparse: true)

// ---- Pre-save hook: hash password if modified (skip for Google users) -------
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ---- Instance method: compare plain-text password with hash ----------------
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ---- Instance method: generate a signed JWT --------------------------------
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    { userId: this._id, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// ---- toJSON: strip sensitive fields before serialising ---------------------
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationOTP;
  delete obj.verificationOTPExpiry;
  delete obj.resetOTP;
  delete obj.resetOTPExpiry;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
