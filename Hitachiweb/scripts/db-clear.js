#!/usr/bin/env node
// Vymaže všechna měření a události, zachová schéma a výchozí stavy stykačů.
const db = require('../src/db/database');

db.exec(`
  DELETE FROM measurements;
  DELETE FROM aggregated;
  DELETE FROM contactor_events;
  UPDATE contactor_states SET state = 0, last_changed = strftime('%Y-%m-%dT%H:%M:%fZ','now');
`);

console.log('[DB] Smazána všechna data (schéma zachováno).');
process.exit(0);
