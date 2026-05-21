const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    message: {
      type: String,
      required: [true, 'Reminder message is required'],
      trim: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    notificationType: {
      type: String,
      enum: ['email', 'browser'],
      default: 'email',
    },
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    retries: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: false }
);

// Compound index for efficient pending reminder lookups per user
reminderSchema.index({ userId: 1, sent: 1, scheduledTime: 1 });

// TTL index — MongoDB auto-deletes reminders 7 days after their scheduledTime
reminderSchema.index(
  { scheduledTime: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

const Reminder = mongoose.model('Reminder', reminderSchema);
module.exports = Reminder;
