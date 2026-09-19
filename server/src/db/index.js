const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

// Ensure db directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database connection
const db = new DatabaseSync(config.dbPath);

// Enforce Foreign Key Integrity and High-Performance WAL mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Execute a query returning multiple rows
 */
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Execute a query returning a single row
 */
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

/**
 * Execute an INSERT, UPDATE or DELETE query
 */
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/**
 * Execute raw multi-line SQL commands (e.g. migrations)
 */
function exec(sql) {
  return db.exec(sql);
}

/**
 * Atomic ACID Transaction Wrapper
 * Automatically rolls back on any thrown exception
 */
function transaction(fn) {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn({ query, get, run, exec, db });
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

module.exports = {
  db,
  query,
  get,
  run,
  exec,
  transaction
};
