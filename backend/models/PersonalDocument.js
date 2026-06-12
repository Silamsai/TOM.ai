const mongoose = require('mongoose');

const personalDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for user query isolation
personalDocumentSchema.index({ userId: 1, createdAt: -1 });

const PersonalDocument = mongoose.model('PersonalDocument', personalDocumentSchema);
module.exports = PersonalDocument;
