const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const pool = require('../src/config/db');
const subtaskController = require('../src/controllers/subtaskController');

const originalQuery = pool.query;

afterEach(() => {
  pool.query = originalQuery;
});

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('creating a subtask on another user task returns 404 and inserts nothing', async () => {
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    return { rowCount: 0, rows: [] };
  };
  const response = createResponse();

  await subtaskController.createSubtask(
    { params: { taskId: '42' }, userId: 99, body: { title: 'Step one' } },
    response,
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(queries[0].params, [42, 99]);
  assert.equal(queries.some((query) => query.sql.includes('INSERT INTO subtasks')), false);
});

test('an empty subtask title is rejected before touching the database', async () => {
  pool.query = async () => {
    throw new Error('database should not be used');
  };
  const response = createResponse();

  await subtaskController.createSubtask(
    { params: { taskId: '42' }, userId: 7, body: { title: '   ' } },
    response,
  );

  assert.equal(response.statusCode, 400);
});

test('updating a subtask rejects unknown fields', async () => {
  pool.query = async () => {
    throw new Error('database should not be used');
  };
  const response = createResponse();

  await subtaskController.updateSubtask(
    { params: { taskId: '42', subtaskId: '3' }, userId: 7, body: { title: 'Ok', taskId: 1 } },
    response,
  );

  assert.equal(response.statusCode, 400);
});

test('summary is built per task for the authenticated user only', async () => {
  let captured;
  pool.query = async (sql, params) => {
    captured = params;
    return { rowCount: 1, rows: [{ taskId: 5, total: 5, completed: 3 }] };
  };
  const response = createResponse();

  await subtaskController.getSubtaskSummary({ userId: 7 }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(captured, [7]);
  assert.deepEqual(response.body.summary, { 5: { total: 5, completed: 3 } });
});
