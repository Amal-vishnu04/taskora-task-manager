const assert = require('node:assert/strict');
const { test } = require('node:test');
const { processDueDateReminders } = require('../src/services/reminderService');

const candidate = {
  id: 5,
  title: 'Report',
  description: null,
  status: 'pending',
  dueDate: new Date('2026-10-11T10:00:00Z'),
  ownerId: 7,
  name: 'Amal',
  email: 'owner@example.com',
  kind: 'due_soon',
  dueKey: '2026-10-11T10:00:00',
};

function createPool({ claimed = true } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('FROM candidates')) return { rows: [candidate] };
      if (sql.includes('INSERT INTO task_notifications')) {
        return claimed ? { rowCount: 1, rows: [{ id: 9 }] } : { rowCount: 0, rows: [] };
      }
      return { rowCount: 1, rows: [] };
    },
  };
}

test('sends one reminder to the task owner and records it', async () => {
  const databasePool = createPool();
  const sent = [];

  const summary = await processDueDateReminders({
    databasePool,
    sendEmail: async (payload) => { sent.push(payload); },
  });

  assert.equal(summary.sent, 1);
  assert.equal(summary.dueSoon, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, 'owner@example.com');
  assert.equal(sent[0].kind, 'due_soon');
  const claim = databasePool.calls.find((call) => call.sql.includes('INSERT INTO task_notifications'));
  assert.deepEqual(claim.params, [5, 7, 'due_soon', '2026-10-11T10:00:00']);
});

test('does not send again when the reminder was already recorded', async () => {
  const databasePool = createPool({ claimed: false });
  let emails = 0;

  const summary = await processDueDateReminders({
    databasePool,
    sendEmail: async () => { emails += 1; },
  });

  assert.equal(emails, 0);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.sent, 0);
});

test('a failed delivery releases the record so the next run can retry', async () => {
  const databasePool = createPool();

  const summary = await processDueDateReminders({
    databasePool,
    sendEmail: async () => { throw new Error('delivery failed'); },
  });

  assert.equal(summary.failed, 1);
  assert.equal(summary.sent, 0);
  assert.ok(databasePool.calls.some((call) => call.sql.includes('DELETE FROM task_notifications')));
});
