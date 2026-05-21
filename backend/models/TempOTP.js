const mongoose = require('mongoose');
const { OTP_VALIDITY_MINUTES } = require('../config/constants');

const tempOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['signup', 'password_reset'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => {
      const d = new Date();
      d.setMinutes(d.getMinutes() + OTP_VALIDITY_MINUTES);
      return d;
    },
  },
});

// TTL index: MongoDB auto-removes documents once `expiresAt` is reached
tempOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TempOTP = mongoose.model('TempOTP', tempOTPSchema);
module.exports = TempOTP;
