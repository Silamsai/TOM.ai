const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ============================================================
// POST /api/reminders/create
// ============================================================
router.post('/create', async (req, res, next) => {
  try {
    const { message, scheduledTime, taskId, notificationType } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Reminder message is required.' });
    }
    if (!scheduledTime) {
      return res.status(400).json({ success: false, message: 'Scheduled time is required.' });
    }

    const reminder = await Reminder.create({
      userId: req.userId,
      taskId: taskId || null,
      message: message.trim(),
      scheduledTime: new Date(scheduledTime),
      notificationType: notificationType || 'email',
    });

    res.status(201).json({ success: true, message: 'Reminder created.', data: reminder });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/reminders/list
// ============================================================
router.get('/list', async (req, res, next) => {
  try {
    const reminders = await Reminder.find({
      userId: req.userId,
      sent: false,
      status: 'pending',
    })
      .sort({ scheduledTime: 1 })
      .populate('taskId', 'taskName')
      .lean();

    res.status(200).json({ success: true, data: reminders });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE /api/reminders/delete/:id
// ============================================================
router.delete('/delete/:id', async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.userId });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });

    await Reminder.deleteOne({ _id: reminder._id });

    res.status(200).json({ success: true, message: 'Reminder deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
