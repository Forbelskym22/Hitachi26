const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DB_DIR, 'hitachi.db');

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema migration ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS measurements (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT    NOT NULL,
    phase     TEXT    NOT NULL,
    value     REAL    NOT NULL,
    timestamp TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_meas_type_phase_ts
    ON measurements (type, phase, timestamp DESC);

  CREATE TABLE IF NOT EXISTS aggregated (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT    NOT NULL,
    phase     TEXT    NOT NULL,
    avg       REAL    NOT NULL,
    min       REAL    NOT NULL,
    max       REAL    NOT NULL,
    timestamp TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_agg_type_phase_ts
    ON aggregated (type, phase, timestamp DESC);

  CREATE TABLE IF NOT EXISTS contactor_events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    state     INTEGER NOT NULL,
    timestamp TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_cont_events_ts
    ON contactor_events (timestamp DESC);

  CREATE TABLE IF NOT EXISTS contactor_states (
    name         TEXT    PRIMARY KEY,
    state        INTEGER NOT NULL DEFAULT 0,
    last_changed TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
`);

// Seed initial contactor states if empty
const seedStates = db.prepare(
  `INSERT OR IGNORE INTO contactor_states (name, state) VALUES (?, 0)`
);
['K1','K2','K3'].forEach(name => seedStates.run(name));

console.log(`[DB] SQLite: ${DB_FILE}`);

module.exports = db;
