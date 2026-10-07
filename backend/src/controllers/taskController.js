const pool = require('../config/db');
const { deleteCloudinaryImage } = require('../services/cloudinaryService');
const { getTaskCloudinaryPublicId } = require('../utils/cloudinaryUtils');

const allowedStatuses = new Set(['pending', 'in_progress', 'completed']);
const taskColumns = 'id, title, description, status, due_date AS "dueDate", image_url AS "imageUrl", owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseTaskId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

function parseDueDate(value) {
  if (value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string' || !value.trim()) {
    return { valid: false };
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? { valid: false }
    : { valid: true, value: date };
}

function isValidImageUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function hasOnlyFields(body, allowedFields) {
  return Object.keys(body).every((field) => allowedFields.has(field));
}

function invalidInput(res, message) {
  return res.status(400).json({
    success: false,
    message,
  });
}

async function createTask(req, res) {
  const body = req.body;
  const createFields = new Set(['title', 'description', 'status', 'dueDate', 'imageUrl', 'image_url']);

  if (!isObject(body) || !hasOnlyFields(body, createFields)) {
    return invalidInput(res, 'Invalid task fields');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 255) {
    return invalidInput(res, 'Title is required and must be at most 255 characters');
  }

  const description = body.description === undefined ? null : body.description;
  if (description !== null && typeof description !== 'string') {
    return invalidInput(res, 'Description must be a string or null');
  }

  const status = body.status === undefined ? 'pending' : body.status;
  if (typeof status !== 'string' || !allowedStatuses.has(status)) {
    return invalidInput(res, 'Status must be pending, in_progress, or completed');
  }

  const dueDate = body.dueDate === undefined ? { valid: true, value: null } : parseDueDate(body.dueDate);
  if (!dueDate.valid) {
    return invalidInput(res, 'Due date must be a valid date and time');
  }

  if (Object.hasOwn(body, 'imageUrl') && Object.hasOwn(body, 'image_url')) {
    return invalidInput(res, 'Provide only one image URL field');
  }

  const imageUrlProvided = Object.hasOwn(body, 'imageUrl') || Object.hasOwn(body, 'image_url');
  const imageUrl = body.imageUrl === undefined ? body.image_url : body.imageUrl;
  if (imageUrlProvided && !isValidImageUrl(imageUrl)) {
    return invalidInput(res, 'Image URL must be a valid HTTP or HTTPS URL');
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, due_date, image_url, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${taskColumns}`,
      [title, description, status, dueDate.value, imageUrl ?? null, req.userId],
    );

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: result.rows[0],
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Unable to create task',
    });
  }
}

async function getTasks(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${taskColumns}
       FROM tasks
       WHERE owner_id = $1
       ORDER BY created_at DESC, id DESC`,
      [req.userId],
    );

    return res.status(200).json({
      success: true,
      tasks: result.rows,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve tasks',
    });
  }
}

async function getTask(req, res) {
  const taskId = parseTaskId(req.params.id);
  if (taskId === null) {
    return invalidInput(res, 'Invalid task ID');
  }

  try {
    const result = await pool.query(
      `SELECT ${taskColumns}
       FROM tasks
       WHERE id = $1 AND owner_id = $2
       LIMIT 1`,
      [taskId, req.userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    return res.status(200).json({
      success: true,
      task: result.rows[0],
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve task',
    });
  }
}

async function updateTask(req, res) {
  const taskId = parseTaskId(req.params.id);
  if (taskId === null) {
    return invalidInput(res, 'Invalid task ID');
  }

  const body = req.body;
  const updateFields = new Set(['title', 'description', 'status', 'dueDate', 'imageUrl', 'image_url']);
  if (!isObject(body) || !hasOnlyFields(body, updateFields) || Object.keys(body).length === 0) {
    return invalidInput(res, 'Provide valid task fields to update');
  }

  const titleProvided = Object.hasOwn(body, 'title');
  const descriptionProvided = Object.hasOwn(body, 'description');
  const statusProvided = Object.hasOwn(body, 'status');
  const dueDateProvided = Object.hasOwn(body, 'dueDate');
  const camelImageUrlProvided = Object.hasOwn(body, 'imageUrl');
  const snakeImageUrlProvided = Object.hasOwn(body, 'image_url');
  if (camelImageUrlProvided && snakeImageUrlProvided) {
    return invalidInput(res, 'Provide only one image URL field');
  }
  const imageUrlProvided = camelImageUrlProvided || snakeImageUrlProvided;

  let title = null;
  if (titleProvided) {
    title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 255) {
      return invalidInput(res, 'Title must not be empty and must be at most 255 characters');
    }
  }

  const description = descriptionProvided ? body.description : null;
  if (descriptionProvided && description !== null && typeof description !== 'string') {
    return invalidInput(res, 'Description must be a string or null');
  }

  const status = statusProvided ? body.status : null;
  if (statusProvided && (typeof status !== 'string' || !allowedStatuses.has(status))) {
    return invalidInput(res, 'Status must be pending, in_progress, or completed');
  }

  const dueDate = dueDateProvided ? parseDueDate(body.dueDate) : { valid: true, value: null };
  if (!dueDate.valid) {
    return invalidInput(res, 'Due date must be a valid date and time');
  }

  const imageUrl = camelImageUrlProvided ? body.imageUrl : body.image_url;
  if (imageUrlProvided && imageUrl !== null && !isValidImageUrl(imageUrl)) {
    return invalidInput(res, 'Image URL must be a valid HTTP or HTTPS URL');
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const existingTask = await client.query(
      'SELECT image_url FROM tasks WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [taskId, req.userId],
    );

    if (existingTask.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const previousImageUrl = existingTask.rows[0].image_url;
    const result = await client.query(
      `UPDATE tasks
       SET title = CASE WHEN $3::boolean THEN $4::varchar ELSE title END,
           description = CASE WHEN $5::boolean THEN $6::text ELSE description END,
           status = CASE WHEN $7::boolean THEN $8::varchar ELSE status END,
           due_date = CASE WHEN $9::boolean THEN $10::timestamp ELSE due_date END,
           reminder_sent = CASE
             WHEN $9::boolean AND $10::timestamp IS DISTINCT FROM due_date THEN FALSE
             ELSE reminder_sent
           END,
           image_url = CASE WHEN $11::boolean THEN $12::varchar ELSE image_url END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND owner_id = $2
       RETURNING ${taskColumns}`,
      [
        taskId,
        req.userId,
        titleProvided,
        title,
        descriptionProvided,
        description,
        statusProvided,
        status,
        dueDateProvided,
        dueDate.value,
        imageUrlProvided,
        imageUrl,
      ],
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await client.query('COMMIT');

    if (imageUrlProvided && previousImageUrl && previousImageUrl !== imageUrl) {
      const publicId = getTaskCloudinaryPublicId(previousImageUrl);
      const replacementPublicId = typeof imageUrl === 'string'
        ? getTaskCloudinaryPublicId(imageUrl)
        : null;
      if (publicId && publicId !== replacementPublicId) {
        try {
          await deleteCloudinaryImage(publicId);
        } catch {
          console.error('Cloudinary task image cleanup failed', { taskId });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: result.rows[0],
    });
  } catch {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to update task',
    });
  } finally {
    client?.release();
  }
}

async function deleteTask(req, res) {
  const taskId = parseTaskId(req.params.id);
  if (taskId === null) {
    return invalidInput(res, 'Invalid task ID');
  }

  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND owner_id = $2',
      [taskId, req.userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Unable to delete task',
    });
  }
}

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask };