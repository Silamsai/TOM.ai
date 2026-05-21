const cron = require('node-cron');
const Task = require('../models/Task');
const { sendTaskReminderEmail } = require('./emailService');

const startCronJobs = () => {
  console.log('⏰ Starting Cron Jobs for Task Reminders...');
  
  // Run every minute at the 0th second
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Current HH:MM in IST timezone, since the user is likely setting the time in their local time
      // But let's assume server local time is what they meant.
      const currentHHMM = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

      // Find tasks that are pending, not notified, and have a reminderTime matching currentHHMM
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
      console.error('[Cron] Error running reminder cron job:', err);
    }
  });

  // Run every night at midnight to delete tasks older than 7 days
  cron.schedule('0 0 * * *', async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Also clean up associated reminders before deleting tasks
      const oldTasks = await Task.find({ createdAt: { $lt: sevenDaysAgo } }, '_id');
      const oldTaskIds = oldTasks.map(t => t._id);

      if (oldTaskIds.length > 0) {
        const mongoose = require('mongoose');
        await mongoose.model('Reminder').deleteMany({ taskId: { $in: oldTaskIds } });
        const result = await Task.deleteMany({ _id: { $in: oldTaskIds } });
        console.log(`[Cron] Cleaned up ${result.deletedCount} old tasks (older than 7 days).`);
      }
    } catch (err) {
      console.error('[Cron] Error cleaning up 7-day old tasks:', err);
    }
  });
};

module.exports = { startCronJobs };
