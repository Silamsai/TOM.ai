const mongoose = require('../config/dbCompat');

const vectorDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number], // 768 dimensions for Gemini text-embedding-004
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

// Compound index for fast queries per-user
vectorDocumentSchema.index({ userId: 1, 'metadata.type': 1 });

const VectorDocument = mongoose.model('VectorDocument', vectorDocumentSchema);
module.exports = VectorDocument;
