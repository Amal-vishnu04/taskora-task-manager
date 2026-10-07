const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', () => {
  console.error('Unexpected error on idle PostgreSQL client');
});

module.exports = pool;