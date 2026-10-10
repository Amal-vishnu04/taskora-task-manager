const DAY_MS = 24 * 60 * 60 * 1000;

function resolveTimeZone(value) {
  if (typeof value !== 'string' || !value) {
    return 'UTC';
  }
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

function dayKey(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function computeAnalytics(rows, options = {}) {
  const now = options.now || new Date();
  const days = options.days || 14;
  const upcomingLimit = options.upcomingLimit || 5;
  const timeZone = resolveTimeZone(options.timeZone);
  const nowMs = now.getTime();

  const counts = { pending: 0, in_progress: 0, completed: 0 };
  const upcoming = [];
  const completedByDay = new Map();
  const dayKeys = [];
  let overdue = 0;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dayKey(new Date(nowMs - offset * DAY_MS), timeZone);
    if (!completedByDay.has(key)) {
      completedByDay.set(key, 0);
      dayKeys.push(key);
    }
  }

  for (const row of rows) {
    if (Object.hasOwn(counts, row.status)) {
      counts[row.status] += 1;
    }

    const due = toDate(row.dueDate);

    if (row.status === 'completed') {
      const completedAt = toDate(row.completedAt) || toDate(row.updatedAt);
      if (completedAt) {
        const key = dayKey(completedAt, timeZone);
        if (completedByDay.has(key)) {
          completedByDay.set(key, completedByDay.get(key) + 1);
        }
      }
    } else if (due) {
      if (due.getTime() < nowMs) {
        overdue += 1;
      } else {
        upcoming.push({
          id: row.id,
          title: row.title,
          status: row.status,
          dueDate: due.toISOString(),
        });
      }
    }
  }

  upcoming.sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));

  const total = rows.length;
  const completionRate = total > 0 ? Math.round((counts.completed / total) * 1000) / 10 : 0;

  return {
    total,
    completed: counts.completed,
    pending: counts.pending,
    inProgress: counts.in_progress,
    overdue,
    completionRate,
    statusDistribution: [
      { status: 'pending', count: counts.pending },
      { status: 'in_progress', count: counts.in_progress },
      { status: 'completed', count: counts.completed },
    ],
    completedOverTime: dayKeys.map((date) => ({ date, count: completedByDay.get(date) })),
    upcomingDeadlines: upcoming.slice(0, upcomingLimit),
    timeZone,
  };
}

module.exports = { computeAnalytics, resolveTimeZone };
