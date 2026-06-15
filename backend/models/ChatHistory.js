const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userMessage: {
      type: String,
      required: true,
    },
    claudeResponse: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    tokens: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
    },
    /** Unique ID for each message exchange */
    messageId: {
      type: String,
      unique: true,
      default: () => randomUUID(),
    },
    /** Optional: group messages into a conversation session */
    conversationId: {
      type: String,
      default: null,
    },
    /** The AI model used for this exchange */
    model: {
      type: String,
      default: 'gemini-2.5-flash',
    },
    attachments: [
      {
        inlineData: {
          data: { type: String },
          mimeType: { type: String }
        },
        fileName: { type: String }
      }
    ]
  },
  { timestamps: false } // manual timestamp field `timestamp` is used
);

// Compound index: efficient per-user sorted queries
chatHistorySchema.index({ userId: 1, timestamp: -1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
module.exports = ChatHistory;
