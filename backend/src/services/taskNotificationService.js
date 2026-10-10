const pool = require('../config/db');
const { sendTaskImageUploadedEmail } = require('./emailService');

const IMAGE_UPLOADED = 'image_uploaded';

function buildTaskUrl(taskId) {
  const base = String(process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  return base ? `${base}/dashboard?task=${taskId}` : null;
}

async function notifyImageUploaded({ task, userId }) {
  let claimId = null;

  try {
    if (!task?.id || !task.imageUrl) {
      return false;
    }

    const userResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId],
    );
    const user = userResult.rows[0];
    if (!user?.email) {
      return false;
    }

    const claim = await pool.query(
      `INSERT INTO task_notifications (task_id, user_id, type, dedupe_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id, type, dedupe_key) DO NOTHING
       RETURNING id`,
      [task.id, userId, IMAGE_UPLOADED, task.imageUrl],
    );
    if (claim.rowCount === 0) {
      return false;
    }
    claimId = claim.rows[0].id;

    await sendTaskImageUploadedEmail({
      name: user.name,
      email: user.email,
      task,
      taskUrl: buildTaskUrl(task.id),
    });
    return true;
  } catch {
    console.error('Image upload notification failed', { taskId: task?.id });
    if (claimId) {
      await pool
        .query('DELETE FROM task_notifications WHERE id = $1', [claimId])
        .catch(() => {});
    }
    return false;
  }
}

module.exports = { notifyImageUploaded };
