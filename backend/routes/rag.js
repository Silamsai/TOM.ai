const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const PersonalDocument = require('../models/PersonalDocument');
const { indexPersonalDocument, deletePersonalDocument } = require('../services/ragService');

// Multer memory storage configuration (keeps files in RAM buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/octet-stream', // some raw text files are read as octet-stream
    ];
    // Allow plain text extensions regardless of mimetype quirks
    const isTextExt = /\.(txt|md|markdown|json)$/i.test(file.originalname);
    if (allowedMimeTypes.includes(file.mimetype) || isTextExt) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, or Markdown documents are supported.'));
    }
  },
});

// All RAG routes require authentication
router.use(authMiddleware);

// ============================================================
// POST /api/rag/upload
// ============================================================
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }

    console.log(`[RAG Upload] Indexing file: ${req.file.originalname} (${req.file.size} bytes) for user ${req.userId}`);
    const doc = await indexPersonalDocument(req.userId, req.file);

    res.status(200).json({
      success: true,
      message: 'Document uploaded and indexed successfully.',
      data: doc,
    });
  } catch (error) {
    console.error('[RAG Upload Error]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse and index document.',
    });
  }
});

// ============================================================
// GET /api/rag/documents
// ============================================================
router.get('/documents', async (req, res, next) => {
  try {
    const docs = await PersonalDocument.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: 'Retrieved RAG documents.',
      data: docs,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE /api/rag/documents/:id
// ============================================================
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verify document exists and belongs to the user
    const doc = await PersonalDocument.findOne({ _id: id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    console.log(`[RAG Delete] Deleting file: ${doc.fileName} (ID: ${id}) for user ${req.userId}`);
    await deletePersonalDocument(req.userId, id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully from knowledge base.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
