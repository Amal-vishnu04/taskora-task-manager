const { processDueDateReminders } = require('./reminderService');

const REMINDER_INTERVAL_MS = 60 * 60 * 1000;
let schedulerInterval;
let processing = false;

async function runScheduledReminders() {
  if (processing) {
    return;
  }

  processing = true;
  try {
    const result = await processDueDateReminders();
    console.info('Due-date reminder run completed', result);
  } catch {
    console.error('Due-date reminder run failed');
  } finally {
    processing = false;
  }
}

function startReminderScheduler() {
  if (schedulerInterval) {
    return schedulerInterval;
  }

  void runScheduledReminders();
  schedulerInterval = setInterval(runScheduledReminders, REMINDER_INTERVAL_MS);
  schedulerInterval.unref?.();
  return schedulerInterval;
}

module.exports = { startReminderScheduler };