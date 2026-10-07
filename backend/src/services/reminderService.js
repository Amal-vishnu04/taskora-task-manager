const pool = require('../config/db');
const { sendDueDateReminderEmail } = require('./emailService');

const REMINDER_BATCH_LIMIT = 100;

async function processDueDateReminders({
  databasePool = pool,
  sendEmail = sendDueDateReminderEmail,
} = {}) {
  const client = await databasePool.connect();
  const summary = { sent: 0, failed: 0, skipped: 0 };

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT t.id, t.title, t.description, t.status, t.due_date AS "dueDate",
              t.owner_id AS "ownerId", u.name, u.email
       FROM tasks t
       JOIN users u ON u.id = t.owner_id
       WHERE t.reminder_sent = FALSE
         AND t.status <> 'completed'
         AND t.due_date BETWEEN NOW()::timestamp + INTERVAL '23 hours'
                            AND NOW()::timestamp + INTERVAL '25 hours'
       ORDER BY t.due_date, t.id
       LIMIT ${REMINDER_BATCH_LIMIT}
       FOR UPDATE OF t SKIP LOCKED`,
    );

    for (const task of result.rows) {
      try {
        await sendEmail({
          name: task.name,
          email: task.email,
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            dueDate: task.dueDate,
          },
        });

        const update = await client.query(
          `UPDATE tasks
           SET reminder_sent = TRUE
           WHERE id = $1 AND owner_id = $2 AND reminder_sent = FALSE`,
          [task.id, task.ownerId],
        );
        if (update.rowCount === 1) {
          summary.sent += 1;
        } else {
          summary.skipped += 1;
        }
      } catch {
        summary.failed += 1;
        console.error('Due-date reminder delivery failed');
      }
    }

    await client.query('COMMIT');
    return summary;
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error('Unable to process due-date reminders');
  } finally {
    client.release();
  }
}

module.exports = { processDueDateReminders };