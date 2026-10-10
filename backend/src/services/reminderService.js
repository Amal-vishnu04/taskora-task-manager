const pool = require('../config/db');
const { sendTaskReminderEmail } = require('./emailService');

const REMINDER_BATCH_LIMIT = 100;

// due_soon: due within the next 24h. overdue: became overdue within the last 24h.
// A task is skipped when a notification already exists for the same type and due date.
const candidateSql = `
  WITH candidates AS (
    SELECT t.id, t.title, t.description, t.status, t.due_date AS "dueDate",
           t.owner_id AS "ownerId", u.name, u.email,
           CASE WHEN t.due_date > (NOW() AT TIME ZONE 'UTC') THEN 'due_soon' ELSE 'overdue' END AS kind,
           to_char(t.due_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS "dueKey"
    FROM tasks t
    JOIN users u ON u.id = t.owner_id
    WHERE t.status <> 'completed'
      AND t.due_date IS NOT NULL
      AND t.due_date >  (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours'
      AND t.due_date <= (NOW() AT TIME ZONE 'UTC') + INTERVAL '24 hours'
      AND NOT (t.reminder_sent = TRUE AND t.due_date > (NOW() AT TIME ZONE 'UTC'))
  )
  SELECT c.*
  FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1 FROM task_notifications n
    WHERE n.task_id = c.id AND n.type = c.kind AND n.dedupe_key = c."dueKey"
  )
  ORDER BY c."dueDate", c.id
  LIMIT $1`;

function buildTaskUrl(taskId) {
  const base = String(process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  return base ? `${base}/dashboard?task=${taskId}` : null;
}

async function findReminderCandidates(databasePool = pool) {
  const result = await databasePool.query(candidateSql, [REMINDER_BATCH_LIMIT]);
  return result.rows;
}

async function processDueDateReminders({
  databasePool = pool,
  sendEmail = sendTaskReminderEmail,
} = {}) {
  const summary = { sent: 0, failed: 0, skipped: 0, dueSoon: 0, overdue: 0 };

  let candidates;
  try {
    candidates = await findReminderCandidates(databasePool);
  } catch {
    throw new Error('Unable to process due-date reminders');
  }

  for (const task of candidates) {
    let claimId = null;

    try {
      const claim = await databasePool.query(
        `INSERT INTO task_notifications (task_id, user_id, type, dedupe_key)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (task_id, type, dedupe_key) DO NOTHING
         RETURNING id`,
        [task.id, task.ownerId, task.kind, task.dueKey],
      );
      if (claim.rowCount === 0) {
        summary.skipped += 1;
        continue;
      }
      claimId = claim.rows[0].id;

      await sendEmail({
        name: task.name,
        email: task.email,
        kind: task.kind,
        taskUrl: buildTaskUrl(task.id),
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          dueDate: task.dueDate,
        },
      });

      summary.sent += 1;
      if (task.kind === 'overdue') {
        summary.overdue += 1;
      } else {
        summary.dueSoon += 1;
      }
    } catch {
      summary.failed += 1;
      console.error('Due-date reminder delivery failed');
      if (claimId) {
        await databasePool
          .query('DELETE FROM task_notifications WHERE id = $1', [claimId])
          .catch(() => {});
      }
    }
  }

  return summary;
}

module.exports = { processDueDateReminders, findReminderCandidates };
