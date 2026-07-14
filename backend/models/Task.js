const mongoose = require('../config/dbCompat');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskName: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
      maxlength: [200, 'Task name must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
    },
    dueDate: {
      type: Date,
      index: true,
    },
    /** Reminder time in HH:MM format (24-hour) */
    reminderTime: {
      type: String,
      match: [/^\d{2}:\d{2}$/, 'Reminder time must be in HH:MM format'],
    },
    reminderSet: {
      type: Boolean,
      default: false,
    },
    notified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true } // createdAt + updatedAt auto-managed
);

// ---- Instance method: check if overdue ----------------------------------------
taskSchema.methods.isOverdue = function () {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
};

// ---- Instance method: mark task as complete -----------------------------------
taskSchema.methods.markComplete = async function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
