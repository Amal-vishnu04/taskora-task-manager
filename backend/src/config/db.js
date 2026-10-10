const { Pool, types, defaults } = require('pg');

// Store and read "timestamp without time zone" values as UTC, same as the Vercel server.
defaults.parseInputDatesAsUTC = true;
types.setTypeParser(1114, (value) => new Date(`${value.replace(' ', 'T')}Z`));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', () => {
  console.error('Unexpected error on idle PostgreSQL client');
});

module.exports = pool;