const pool = require('../config/db');
const { logActivity } = require('../services/activityService');

const MAX_SUBTASKS_PER_TASK = 50;
const subtaskColumns = `id, task_id AS "taskId", title, completed,
  completed_at AS "completedAt", created_at AS "createdAt"`;

function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

function parseTitle(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const title = value.trim();
  return title.length >= 1 && title.length <= 255 ? title : null;
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function findOwnedTask(taskId, userId) {
  const result = await pool.query(
    'SELECT id, title FROM tasks WHERE id = $1 AND owner_id = $2',
    [taskId, userId],
  );
  return result.rows[0] || null;
}

async function listSubtasks(req, res) {
  const taskId = parseId(req.params.taskId);
  if (taskId === null) {
    return badRequest(res, 'Invalid task ID');
  }

  try {
    if (!(await findOwnedTask(taskId, req.userId))) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const result = await pool.query(
      `SELECT ${subtaskColumns} FROM subtasks WHERE task_id = $1 ORDER BY id`,
      [taskId],
    );
    return res.status(200).json({ success: true, subtasks: result.rows });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to retrieve subtasks' });
  }
}

async function createSubtask(req, res) {
  const taskId = parseId(req.params.taskId);
  if (taskId === null) {
    return badRequest(res, 'Invalid task ID');
  }

  const title = parseTitle(req.body?.title);
  if (title === null) {
    return badRequest(res, 'Subtask title must be between 1 and 255 characters');
  }

  try {
    const task = await findOwnedTask(taskId, req.userId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const count = await pool.query(
      'SELECT COUNT(*)::int AS count FROM subtasks WHERE task_id = $1',
      [taskId],
    );
    if (count.rows[0].count >= MAX_SUBTASKS_PER_TASK) {
      return badRequest(res, `A task can have at most ${MAX_SUBTASKS_PER_TASK} subtasks`);
    }

    const result = await pool.query(
      `INSERT INTO subtasks (task_id, title) VALUES ($1, $2) RETURNING ${subtaskColumns}`,
      [taskId, title],
    );

    await logActivity({
      userId: req.userId,
      taskId,
      taskTitle: task.title,
      action: 'subtask_created',
      details: { title },
    });

    return res.status(201).json({ success: true, subtask: result.rows[0] });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to create subtask' });
  }
}

async function updateSubtask(req, res) {
  const taskId = parseId(req.params.taskId);
  const subtaskId = parseId(req.params.subtaskId);
  if (taskId === null || subtaskId === null) {
    return badRequest(res, 'Invalid ID');
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const allowed = new Set(['title', 'completed']);
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) {
    return badRequest(res, 'Only title and completed can be updated');
  }

  let nextTitle;
  if (Object.hasOwn(body, 'title')) {
    nextTitle = parseTitle(body.title);
    if (nextTitle === null) {
      return badRequest(res, 'Subtask title must be between 1 and 255 characters');
    }
  }
  if (Object.hasOwn(body, 'completed') && typeof body.completed !== 'boolean') {
    return badRequest(res, 'completed must be true or false');
  }

  try {
    const task = await findOwnedTask(taskId, req.userId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const existing = await pool.query(
      'SELECT title, completed FROM subtasks WHERE id = $1 AND task_id = $2',
      [subtaskId, taskId],
    );
    const current = existing.rows[0];
    if (!current) {
      return res.status(404).json({ success: false, message: 'Subtask not found' });
    }

    const title = nextTitle ?? current.title;
    const completed = Object.hasOwn(body, 'completed') ? body.completed : current.completed;

    const result = await pool.query(
      `UPDATE subtasks
       SET title = $3,
           completed = $4,
           completed_at = CASE WHEN $4::boolean THEN COALESCE(completed_at, NOW()) ELSE NULL END
       WHERE id = $1 AND task_id = $2
       RETURNING ${subtaskColumns}`,
      [subtaskId, taskId, title, completed],
    );

    if (title !== current.title) {
      await logActivity({
        userId: req.userId,
        taskId,
        taskTitle: task.title,
        action: 'subtask_updated',
        details: { title, previousTitle: current.title },
      });
    }
    if (completed !== current.completed) {
      await logActivity({
        userId: req.userId,
        taskId,
        taskTitle: task.title,
        action: completed ? 'subtask_completed' : 'subtask_reopened',
        details: { title },
      });
    }

    return res.status(200).json({ success: true, subtask: result.rows[0] });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to update subtask' });
  }
}

async function deleteSubtask(req, res) {
  const taskId = parseId(req.params.taskId);
  const subtaskId = parseId(req.params.subtaskId);
  if (taskId === null || subtaskId === null) {
    return badRequest(res, 'Invalid ID');
  }

  try {
    const task = await findOwnedTask(taskId, req.userId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const result = await pool.query(
      'DELETE FROM subtasks WHERE id = $1 AND task_id = $2 RETURNING title',
      [subtaskId, taskId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Subtask not found' });
    }

    await logActivity({
      userId: req.userId,
      taskId,
      taskTitle: task.title,
      action: 'subtask_deleted',
      details: { title: result.rows[0].title },
    });

    return res.status(200).json({ success: true, message: 'Subtask deleted' });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to delete subtask' });
  }
}

async function getSubtaskSummary(req, res) {
  try {
    const result = await pool.query(
      `SELECT s.task_id AS "taskId",
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE s.completed)::int AS completed
         FROM subtasks s
         JOIN tasks t ON t.id = s.task_id
        WHERE t.owner_id = $1
        GROUP BY s.task_id`,
      [req.userId],
    );

    const summary = {};
    for (const row of result.rows) {
      summary[row.taskId] = { total: row.total, completed: row.completed };
    }
    return res.status(200).json({ success: true, summary });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to retrieve subtask summary' });
  }
}

module.exports = {
  listSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  getSubtaskSummary,
};
