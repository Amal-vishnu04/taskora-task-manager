const pool = require('../config/db');
const { computeAnalytics } = require('../services/analyticsService');

async function getAnalytics(req, res) {
  const requestedDays = Number.parseInt(req.query.days, 10);
  const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 1), 90) : 14;
  const timeZone = typeof req.query.tz === 'string' ? req.query.tz : 'UTC';

  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.status, t.due_date AS "dueDate", t.updated_at AS "updatedAt",
              (SELECT MAX(a.created_at)
                 FROM task_activity a
                WHERE a.task_id = t.id
                  AND a.user_id = t.owner_id
                  AND a.action = 'task_completed') AS "completedAt"
         FROM tasks t
        WHERE t.owner_id = $1`,
      [req.userId],
    );

    const analytics = computeAnalytics(result.rows, { now: new Date(), timeZone, days });
    return res.status(200).json({ success: true, analytics });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve analytics',
    });
  }
}

module.exports = { getAnalytics };
