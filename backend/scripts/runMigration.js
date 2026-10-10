require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/db');

const file = process.argv[2];

if (!file) {
  console.error('Usage: node scripts/runMigration.js db/migrations/001_task_notifications.sql');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, '');

pool
  .query(sql)
  .then(() => console.log('Migration applied:', path.basename(file)))
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
