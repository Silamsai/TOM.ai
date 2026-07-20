const express = require('../config/expressCompat');
const router = express.Router();
const Task = require('../models/Task');
const Reminder = require('../models/Reminder');
const authMiddleware = require('../middleware/auth');
const { validateTaskName } = require('../utils/validators');
const { ERRORS, MAX_TASKS_PER_USER } = require('../config/constants');

router.use(authMiddleware);

// ============================================================
// POST /api/tasks/create
// ============================================================
router.post('/create', async (req, res, next) => {
  try {
    const { taskName, description, dueDate, reminderTime, priority, tags } = req.body;

    const nameValidation = validateTaskName(taskName);
    if (!nameValidation.valid) {
      return res.status(400).json({ success: false, message: nameValidation.message });
    }

    // Enforce task limit
    const taskCount = await Task.countDocuments({ userId: req.userId, status: { $ne: 'cancelled' } });
    if (taskCount >= MAX_TASKS_PER_USER) {
      return res.status(400).json({ success: false, message: ERRORS.TASK_LIMIT_REACHED });
    }

    const task = await Task.create({
      userId: req.userId,
      taskName: taskName.trim(),
      description: description?.trim(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      reminderTime: reminderTime || undefined,
      reminderSet: !!reminderTime,
      priority: priority || 'medium',
      tags: tags || [],
    });

    // Index task in RAG
    try {
      const { indexTask } = require('../services/ragService');
      const promise = indexTask(req.userId, task).catch(e => console.error('[RAG] Index task error:', e));
      if (typeof req.waitUntil === 'function') {
        req.waitUntil(promise);
      }
    } catch (e) {
      console.error('[RAG] Index task import error:', e);
    }

    res.status(201).json({ success: true, message: 'Task created successfully.', data: task });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/tasks/list
// ============================================================
router.get('/list', async (req, res, next) => {
  try {
    const { status, priority, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const filter = { userId: req.userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: 'Tasks retrieved.',
      data: { tasks, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/tasks/:id
// ============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ success: false, message: ERRORS.TASK_NOT_FOUND });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PUT /api/tasks/update/:id
// ============================================================
router.put('/update/:id', async (req, res, next) => {
  try {
    const { taskName, description, dueDate, reminderTime, priority, status, tags } = req.body;

    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ success: false, message: ERRORS.TASK_NOT_FOUND });

    if (taskName !== undefined) {
      const nameValidation = validateTaskName(taskName);
      if (!nameValidation.valid) return res.status(400).json({ success: false, message: nameValidation.message });
      task.taskName = taskName.trim();
    }
    if (description !== undefined) task.description = description.trim();
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (reminderTime !== undefined) {
      task.reminderTime = reminderTime || null;
      task.reminderSet = !!reminderTime;
    }
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (tags !== undefined) task.tags = tags;

    await task.save();

    // Index updated task in RAG
    try {
      const { indexTask } = require('../services/ragService');
      const promise = indexTask(req.userId, task).catch(e => console.error('[RAG] Index task error:', e));
      if (typeof req.waitUntil === 'function') {
        req.waitUntil(promise);
      }
    } catch (e) {
      console.error('[RAG] Index task import error:', e);
    }

    res.status(200).json({ success: true, message: 'Task updated.', data: task });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PUT /api/tasks/complete/:id
// ============================================================
router.put('/complete/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ success: false, message: ERRORS.TASK_NOT_FOUND });

    await task.markComplete();

    // Index completed task in RAG
    try {
      const { indexTask } = require('../services/ragService');
      const promise = indexTask(req.userId, task).catch(e => console.error('[RAG] Index task error:', e));
      if (typeof req.waitUntil === 'function') {
        req.waitUntil(promise);
      }
    } catch (e) {
      console.error('[RAG] Index task import error:', e);
    }

    res.status(200).json({ success: true, message: 'Task marked as completed! 🎉', data: task });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE /api/tasks/delete/:id
// ============================================================
router.delete('/delete/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ success: false, message: ERRORS.TASK_NOT_FOUND });

    // Also remove associated reminders and RAG vector
    const VectorDocument = require('../models/VectorDocument');
    await Promise.all([
      Task.deleteOne({ _id: task._id }),
      Reminder.deleteMany({ taskId: task._id }),
      VectorDocument.deleteOne({ userId: req.userId, 'metadata.sourceId': String(task._id) }),
    ]);

    res.status(200).json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
