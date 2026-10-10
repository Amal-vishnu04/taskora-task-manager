require('dotenv').config();
const pool = require('../src/config/db');
const { findReminderCandidates } = require('../src/services/reminderService');

(async () => {
  try {
    const rows = await findReminderCandidates(pool);
    console.log('now (UTC):', new Date().toISOString());
    console.log('reminders that WOULD be sent (nothing is sent by this script):', rows.length);
    console.table(
      rows.map((row) => ({
        taskId: row.id,
        title: row.title,
        kind: row.kind,
        due: row.dueKey,
        to: String(row.email).replace(/^(.).*(@.*)$/, '$1***$2'),
      })),
    );
  } catch (error) {
    console.error('ERR', error.code, error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
