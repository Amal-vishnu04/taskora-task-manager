const assert = require('node:assert/strict');
const { test } = require('node:test');
const { computeAnalytics } = require('../src/services/analyticsService');

const now = new Date('2026-10-11T10:00:00Z');
const rows = [
  { id: 1, title: 'Late', status: 'pending', dueDate: new Date('2026-10-10T00:00:00Z') },
  { id: 2, title: 'Soon', status: 'in_progress', dueDate: new Date('2026-10-12T00:00:00Z') },
  {
    id: 3,
    title: 'Done late night',
    status: 'completed',
    dueDate: new Date('2026-10-09T00:00:00Z'),
    completedAt: new Date('2026-10-10T19:00:00Z'),
  },
  {
    id: 4,
    title: 'Done old',
    status: 'completed',
    dueDate: null,
    completedAt: null,
    updatedAt: new Date('2026-10-09T05:00:00Z'),
  },
  { id: 5, title: 'No deadline', status: 'pending', dueDate: null },
];

test('counts, overdue and completion rate come from the rows', () => {
  const result = computeAnalytics(rows, { now, days: 3, timeZone: 'UTC' });

  assert.equal(result.total, 5);
  assert.equal(result.completed, 2);
  assert.equal(result.pending, 2);
  assert.equal(result.inProgress, 1);
  assert.equal(result.overdue, 1);
  assert.equal(result.completionRate, 40);
  assert.deepEqual(result.upcomingDeadlines.map((task) => task.id), [2]);
});

test('completed tasks are bucketed by the viewer time zone', () => {
  const utc = computeAnalytics(rows, { now, days: 3, timeZone: 'UTC' });
  assert.deepEqual(utc.completedOverTime, [
    { date: '2026-10-09', count: 1 },
    { date: '2026-10-10', count: 1 },
    { date: '2026-10-11', count: 0 },
  ]);

  const india = computeAnalytics(rows, { now, days: 3, timeZone: 'Asia/Kolkata' });
  assert.deepEqual(india.completedOverTime, [
    { date: '2026-10-09', count: 1 },
    { date: '2026-10-10', count: 0 },
    { date: '2026-10-11', count: 1 },
  ]);
});

test('empty data and invalid time zones are handled safely', () => {
  const result = computeAnalytics([], { now, days: 2, timeZone: 'Not/AZone' });

  assert.equal(result.total, 0);
  assert.equal(result.completionRate, 0);
  assert.equal(result.timeZone, 'UTC');
  assert.equal(result.upcomingDeadlines.length, 0);
});
