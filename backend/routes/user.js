const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ChatHistory = require('../models/ChatHistory');
const Task = require('../models/Task');
const VectorDocument = require('../models/VectorDocument');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/user/me
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/user/profile
router.patch('/profile', async (req, res, next) => {
  try {
    const { name, aiPersona, dailyBriefTime } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name !== undefined) {
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
      }
      user.name = String(name).trim();
    }

    if (aiPersona !== undefined) {
      if (!['professional', 'creative', 'sarcastic', 'empathetic'].includes(aiPersona)) {
        return res.status(400).json({ success: false, message: 'Invalid AI Persona choice.' });
      }
      user.aiPersona = aiPersona;
    }

    if (dailyBriefTime !== undefined) {
      user.dailyBriefTime = String(dailyBriefTime).trim();
    }

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Profile updated.', data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/access
router.get('/access', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('permissions tokens googleId signupMethod');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({
      success: true,
      data: {
        signupMethod: user.signupMethod,
        googleConnected: !!user.googleId,
        permissions: user.permissions || {},
        integrations: {
          gmail: { enabled: !!user.permissions?.gmail, connected: !!user.tokens?.gmail || !!user.googleId },
          calendar: { enabled: !!user.permissions?.calendar, connected: !!user.tokens?.calendar },
          tasks: { enabled: !!user.permissions?.tasks, connected: !!user.tokens?.tasks },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/storage
router.get('/storage', async (req, res, next) => {
  try {
    const [chatCount, taskCount, vectorCount] = await Promise.all([
      ChatHistory.countDocuments({ userId: req.userId }),
      Task.countDocuments({ userId: req.userId }),
      VectorDocument.countDocuments({ userId: req.userId }),
    ]);

    res.json({
      success: true,
      data: {
        chatMessages: chatCount,
        tasks: taskCount,
        ragDocuments: vectorCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/chat-history
router.delete('/chat-history', async (req, res, next) => {
  try {
    const result = await ChatHistory.deleteMany({ userId: req.userId });
    res.json({
      success: true,
      message: 'Server chat history cleared.',
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
