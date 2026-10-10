const pool = require('../config/db');

async function logActivity(
  { userId, taskId = null, taskTitle, action, details = null },
  executor = pool,
) {
  try {
    await executor.query(
      `INSERT INTO task_activity (user_id, task_id, task_title, action, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        taskId,
        String(taskTitle || 'Untitled task').slice(0, 255),
        action,
        details ? JSON.stringify(details) : null,
      ],
    );
    return true;
  } catch {
    console.error('Activity logging failed', { action });
    return false;
  }
}

function toTime(value) {
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function buildUpdateEvents(before, after) {
  const events = [];
  const changed = [];

  if (before.title !== undefined && before.title !== after.title) {
    changed.push('title');
  }
  if (before.description !== undefined && (before.description || '') !== (after.description || '')) {
    changed.push('description');
  }
  if (before.dueDate !== undefined && toTime(before.dueDate) !== toTime(after.dueDate)) {
    changed.push('due date');
  }

  if (changed.length > 0) {
    events.push({ action: 'task_updated', details: { fields: changed } });
  }

  if (before.status !== undefined && before.status !== after.status) {
    if (after.status === 'completed') {
      events.push({ action: 'task_completed', details: { from: before.status } });
    } else if (before.status === 'completed') {
      events.push({ action: 'task_reopened', details: { to: after.status } });
    } else {
      events.push({ action: 'status_changed', details: { from: before.status, to: after.status } });
    }
  }

  return events;
}

module.exports = { logActivity, buildUpdateEvents };
