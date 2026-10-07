const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { once } = require('node:events');
const express = require('express');
const cloudinary = require('../src/config/cloudinary');
const pool = require('../src/config/db');
const taskController = require('../src/controllers/taskController');
const uploadMiddleware = require('../src/middleware/uploadMiddleware');
const { getTaskCloudinaryPublicId } = require('../src/utils/cloudinaryUtils');

const originalCloudinaryConfig = cloudinary.config;
const originalDestroy = cloudinary.uploader.destroy;
const originalConnect = pool.connect;
const originalQuery = pool.query;
const taskImage = 'https://res.cloudinary.com/taskflow-test/image/upload/v123/taskflow/tasks/example.jpg';

afterEach(() => {
  cloudinary.config = originalCloudinaryConfig;
  cloudinary.uploader.destroy = originalDestroy;
  pool.connect = originalConnect;
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

function stubTaskUpdate(options = {}) {
  const oldImage = Object.hasOwn(options, 'oldImage') ? options.oldImage : taskImage;
  const updateFails = options.updateFails || false;
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql === 'SELECT image_url FROM tasks WHERE id = $1 AND owner_id = $2 FOR UPDATE') {
        return oldImage === undefined ? { rowCount: 0, rows: [] } : { rowCount: 1, rows: [{ image_url: oldImage }] };
      }
      if (sql.includes('UPDATE tasks')) {
        if (updateFails) throw new Error('database failure');
        return {
          rowCount: 1,
          rows: [{ id: 42, imageUrl: params[10] ? params[11] : oldImage }],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  pool.connect = async () => client;
  return calls;
}

async function updateTask(body, userId = 7) {
  const response = createResponse();
  await taskController.updateTask({ params: { id: '42' }, userId, body }, response);
  return response;
}

test('maps only this configured Cloudinary task folder to a public ID', () => {
  cloudinary.config = () => ({ cloud_name: 'taskflow-test' });
  assert.equal(getTaskCloudinaryPublicId(taskImage), 'taskflow/tasks/example');
  assert.equal(
    getTaskCloudinaryPublicId('https://res.cloudinary.com/other-cloud/image/upload/v123/taskflow/tasks/example.jpg'),
    null,
  );
  assert.equal(getTaskCloudinaryPublicId('https://images.example.test/taskflow/tasks/example.jpg'), null);
  assert.equal(
    getTaskCloudinaryPublicId('https://res.cloudinary.com/taskflow-test/image/upload/c_fill,w_200/v123/taskflow/tasks/example.jpg'),
    'taskflow/tasks/example',
  );
});

test('omitting the image field preserves the existing URL and performs no cleanup', async () => {
  const calls = stubTaskUpdate();
  let deletions = 0;
  cloudinary.uploader.destroy = async () => { deletions += 1; return { result: 'ok' }; };

  const response = await updateTask({ title: 'Updated title' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.task.imageUrl, taskImage);
  assert.equal(calls.find(call => call.sql.includes('UPDATE tasks')).params[10], false);
  assert.equal(deletions, 0);
});

test('explicit null removes the image and attempts old asset cleanup after commit', async () => {
  stubTaskUpdate();
  cloudinary.config = () => ({ cloud_name: 'taskflow-test' });
  let deletedPublicId;
  cloudinary.uploader.destroy = async publicId => {
    deletedPublicId = publicId;
    return { result: 'ok' };
  };

  const response = await updateTask({ image_url: null });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.task.imageUrl, null);
  assert.equal(deletedPublicId, 'taskflow/tasks/example');
});

test('does not delete the asset when a replacement URL maps to the same public ID', async () => {
  stubTaskUpdate();
  cloudinary.config = () => ({ cloud_name: 'taskflow-test' });
  let deletions = 0;
  cloudinary.uploader.destroy = async () => { deletions += 1; return { result: 'ok' }; };

  const response = await updateTask({
    imageUrl: 'https://res.cloudinary.com/taskflow-test/image/upload/c_fill,w_200/v123/taskflow/tasks/example.jpg',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(deletions, 0);
});

test('cleanup failure does not undo a committed removal', async () => {
  stubTaskUpdate();
  cloudinary.config = () => ({ cloud_name: 'taskflow-test' });
  cloudinary.uploader.destroy = async () => { throw new Error('cleanup failed'); };
  const originalConsoleError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);

  try {
    const response = await updateTask({ image_url: null });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.task.imageUrl, null);
    assert.equal(logged[0][0], 'Cloudinary task image cleanup failed');
    assert.deepEqual(logged[0][1], { taskId: 42 });
  } finally {
    console.error = originalConsoleError;
  }
});

test('rejects invalid and empty image URLs before accessing the database', async () => {
  let connects = 0;
  pool.connect = async () => { connects += 1; throw new Error('unexpected database access'); };

  for (const imageUrl of ['', 'not a URL', 'ftp://files.example.test/image.png']) {
    const response = await updateTask({ image_url: imageUrl });
    assert.equal(response.statusCode, 400);
  }

  assert.equal(connects, 0);
});

test('owner-scoped lookup prevents updates to another user task', async () => {
  const calls = stubTaskUpdate({ oldImage: undefined });

  const response = await updateTask({ image_url: null }, 99);

  assert.equal(response.statusCode, 404);
  assert.equal(calls.some(call => call.sql.includes('UPDATE tasks')), false);
  assert.deepEqual(calls.find(call => call.sql.startsWith('SELECT image_url')).params, [42, 99]);
});

test('creates tasks with and without an image using the authenticated owner ID', async (context) => {
  for (const imageUrl of [undefined, taskImage, 'http://images.example.test/task.jpg']) {
    await context.test(imageUrl ? `with image ${new URL(imageUrl).protocol}` : 'without image', async () => {
      let insert;
      pool.query = async (sql, params) => {
        insert = { sql, params };
        return { rows: [{ id: 8, imageUrl: params[4] ?? null }] };
      };
      const response = createResponse();
      const body = { title: 'Create regression task' };
      if (imageUrl) body.imageUrl = imageUrl;

      await taskController.createTask({ body, userId: 17 }, response);

      assert.equal(response.statusCode, 201);
      assert.equal(insert.params[4] ?? null, imageUrl ?? null);
      assert.equal(insert.params[5], 17);
    });
  }
});

test('removing an already empty image succeeds without Cloudinary cleanup', async () => {
  stubTaskUpdate({ oldImage: null });
  let deletions = 0;
  cloudinary.uploader.destroy = async () => { deletions += 1; return { result: 'ok' }; };

  const response = await updateTask({ image_url: null });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.task.imageUrl, null);
  assert.equal(deletions, 0);
});

test('replacing an image deletes only the old Cloudinary asset after commit', async () => {
  stubTaskUpdate();
  cloudinary.config = () => ({ cloud_name: 'taskflow-test' });
  let deletedPublicId;
  cloudinary.uploader.destroy = async publicId => {
    deletedPublicId = publicId;
    return { result: 'ok' };
  };

  const newImage = 'https://res.cloudinary.com/taskflow-test/image/upload/v456/taskflow/tasks/replacement.png';
  const response = await updateTask({ imageUrl: newImage });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.task.imageUrl, newImage);
  assert.equal(deletedPublicId, 'taskflow/tasks/example');
});

test('does not delete an external URL when removing it', async () => {
  stubTaskUpdate({ oldImage: 'https://images.example.test/external.jpg' });
  let deletions = 0;
  cloudinary.uploader.destroy = async () => { deletions += 1; return { result: 'ok' }; };

  const response = await updateTask({ image_url: null });

  assert.equal(response.statusCode, 200);
  assert.equal(deletions, 0);
});

test('owner-scoped delete prevents deleting another user task', async () => {
  let query;
  pool.query = async (sql, params) => {
    query = { sql, params };
    return { rowCount: 0 };
  };
  const response = createResponse();

  await taskController.deleteTask({ params: { id: '42' }, userId: 99 }, response);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(query.params, [42, 99]);
  assert.match(query.sql, /owner_id = \$2/);
});

test('unsupported image uploads return a safe 400 response', async (context) => {
  const app = express();
  app.post('/upload', uploadMiddleware, (req, res) => res.json({ success: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());

  const form = new FormData();
  form.append('image', new Blob(['not an image'], { type: 'text/plain' }), 'invalid.txt');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, {
    method: 'POST',
    body: form,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'A supported image file is required',
  });
});