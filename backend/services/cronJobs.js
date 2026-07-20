const Task = require('../models/Task');
const Reminder = require('../models/Reminder');
const { sendTaskReminderEmail } = require('./emailService');

const checkReminders = async () => {
  try {
    const now = new Date();
    // Indian Standard Time (IST, Asia/Kolkata)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const currentHHMM = `${hour}:${minute}`;

    console.log(`[Cron] Checking reminders for local IST time: ${currentHHMM} (Server UTC: ${now.toISOString()})`);

    const dueTasks = await Task.find({
      status: 'pending',
      reminderSet: true,
      reminderTime: currentHHMM,
      notified: false
    }).populate('userId');

    for (const task of dueTasks) {
      if (!task.userId || !task.userId.email) continue;

      try {
        await sendTaskReminderEmail(task.userId.email, task);
        task.notified = true;
        await task.save();
        console.log(`[Cron] Sent reminder for task: "${task.taskName}" to ${task.userId.email}`);
      } catch (err) {
        console.error(`[Cron] Failed to send reminder for task: ${task._id}`, err);
      }
    }
  } catch (err) {
    console.error('[Cron] Error running reminder job:', err);
  }
};

const cleanupOldTasks = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldTasks = await Task.find({ createdAt: { $lt: sevenDaysAgo } }, '_id');
    const oldTaskIds = oldTasks.map(t => t._id);

    if (oldTaskIds.length > 0) {
      await Reminder.deleteMany({ taskId: { $in: oldTaskIds } });
      const result = await Task.deleteMany({ _id: { $in: oldTaskIds } });
      console.log(`[Cron] Cleaned up ${result.deletedCount} old tasks (older than 7 days).`);
    }
  } catch (err) {
    console.error('[Cron] Error cleaning up 7-day old tasks:', err);
  }
};

const startCronJobs = () => {
  console.log('⏰ Running in Cloudflare Worker environment: node-cron loops bypassed, Scheduled Cron Triggers active.');
};

module.exports = {
  checkReminders,
  cleanupOldTasks,
  startCronJobs
};
