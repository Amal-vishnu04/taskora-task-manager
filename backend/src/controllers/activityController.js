const pool = require('../config/db');

const activityColumns = `a.id, a.action, a.details, a.task_id AS "taskId",
  a.task_title AS "taskTitle", a.created_at AS "createdAt", u.name AS "userName"`;

function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

async function getTaskActivity(req, res) {
  const taskId = parseId(req.params.id);
  if (taskId === null) {
    return res.status(400).json({ success: false, message: 'Invalid task ID' });
  }

  try {
    const owned = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND owner_id = $2',
      [taskId, req.userId],
    );
    if (owned.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const result = await pool.query(
      `SELECT ${activityColumns}
       FROM task_activity a
       JOIN users u ON u.id = a.user_id
       WHERE a.task_id = $1 AND a.user_id = $2
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 100`,
      [taskId, req.userId],
    );

    return res.status(200).json({ success: true, activity: result.rows });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to retrieve activity' });
  }
}

async function getRecentActivity(req, res) {
  const requested = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 50) : 20;

  try {
    const result = await pool.query(
      `SELECT ${activityColumns}
       FROM task_activity a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $2`,
      [req.userId, limit],
    );

    return res.status(200).json({ success: true, activity: result.rows });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to retrieve activity' });
  }
}

module.exports = { getTaskActivity, getRecentActivity };
