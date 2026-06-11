const express = require('express');
const router = express.Router();
const ChatHistory = require('../models/ChatHistory');
const User = require('../models/User');
const { sendMessage } = require('../services/geminiService');
const authMiddleware = require('../middleware/auth');
const { ERRORS, MAX_CHAT_HISTORY } = require('../config/constants');

// All chat routes require authentication
router.use(authMiddleware);

// ============================================================
// POST /api/chat/message
// ============================================================
router.post('/message', async (req, res, next) => {
  try {
    const { message, attachments, conversationId, model } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: ERRORS.MESSAGE_REQUIRED });
    }

    // Fetch user info for personalised Claude prompt
    const user = await User.findById(req.userId).select('name email aiPersona');
    if (!user) return res.status(404).json({ success: false, message: ERRORS.NOT_FOUND });

    // Send message to Gemini AI (or selected model)
    let payload = message.trim();
    if (attachments && attachments.length > 0) {
      payload = { text: message.trim(), attachments };
    }
    const { response, usage } = await sendMessage(req.userId, payload, user, model);

    // Persist conversation to database
    const chat = await ChatHistory.create({
      userId: req.userId,
      userMessage: message.trim(),
      claudeResponse: response,
      tokens: { input: usage.input, output: usage.output },
      conversationId: conversationId || null,
      model: model || 'gemini-2.5-flash',
    });

    // Index chat in RAG Vector Store
    try {
      const { indexChatMessage } = require('../services/ragService');
      indexChatMessage(req.userId, message.trim(), response).catch(e => console.error('[RAG] Index chat error:', e));
    } catch (e) {
      console.error('[RAG] Index import error:', e);
    }

    res.status(200).json({
      success: true,
      message: 'Message sent successfully.',
      data: {
        messageId: chat.messageId,
        userMessage: chat.userMessage,
        botResponse: chat.claudeResponse,
        timestamp: chat.timestamp,
        tokens: chat.tokens,
        conversationId: chat.conversationId,
      },
    });
  } catch (error) {
    console.error('[Chat] Error:', error.message);
    const errMsg = error.message || '';
    if (
      errMsg.toLowerCase().includes('api_key') ||
      errMsg.toLowerCase().includes('api key') ||
      errMsg.toLowerCase().includes('apikey') ||
      errMsg.toLowerCase().includes('gemini') ||
      errMsg.toLowerCase().includes('google')
    ) {
      return res.status(500).json({
        success: false,
        message: 'AI brain not working, please wait.'
      });
    }
    next(error);
  }
});

// ============================================================
// GET /api/chat/history
// ============================================================
router.get('/history', async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    const filter = { userId: req.userId };
    if (conversationId) {
      filter.conversationId = conversationId;
    }

    const history = await ChatHistory.find(filter)
      .sort({ timestamp: -1 })
      .limit(MAX_CHAT_HISTORY)
      .lean();

    // Return in chronological order for display
    res.status(200).json({
      success: true,
      message: 'Chat history retrieved.',
      data: history.reverse(),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE /api/chat/conversation/:conversationId
// ============================================================
router.delete('/conversation/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const result = await ChatHistory.deleteMany({ userId: req.userId, conversationId });
    res.status(200).json({
      success: true,
      message: 'Conversation deleted.',
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
