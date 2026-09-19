const { Pool } = require('pg');
const config = require('../config/env');

// Configure PostgreSQL connection pool
const pool = new Pool({
  host: config.pgHost,
  port: config.pgPort,
  user: config.pgUser,
  password: config.pgPassword,
  database: config.pgDatabase,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('🚨 Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Execute a query returning multiple rows
 */
async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Execute a query returning a single row
 */
async function get(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows[0] || null;
}

/**
 * Execute an INSERT, UPDATE or DELETE query
 */
async function run(sql, params = []) {
  const res = await pool.query(sql, params);
  return {
    rowCount: res.rowCount,
    rows: res.rows
  };
}

/**
 * Execute raw multi-line SQL commands (e.g. migrations)
 */
async function exec(sql) {
  return await pool.query(sql);
}

/**
 * Atomic ACID Transaction Wrapper for PostgreSQL
 * Automatically issues ROLLBACK if any exception occurs.
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const helper = {
      query: (sql, params = []) => client.query(sql, params).then(r => r.rows),
      get: (sql, params = []) => client.query(sql, params).then(r => r.rows[0] || null),
      run: (sql, params = []) => client.query(sql, params)
    };
    const result = await fn(helper);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  get,
  run,
  exec,
  transaction
};
