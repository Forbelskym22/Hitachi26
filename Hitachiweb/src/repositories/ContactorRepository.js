const db              = require('../db/database');
const { ContactorEvent } = require('../models/Measurement');

const EVENT_KEEP_DAYS = 30;

const stmtGetState   = db.prepare(`SELECT state, last_changed FROM contactor_states WHERE name = ?`);
const stmtGetAll     = db.prepare(`SELECT name, state, last_changed FROM contactor_states`);
const stmtSetState   = db.prepare(`UPDATE contactor_states SET state = ?, last_changed = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE name = ?`);
const stmtInsertEvt  = db.prepare(`INSERT INTO contactor_events (name, state) VALUES (?, ?)`);
const stmtGetEvents  = db.prepare(`SELECT name, state, timestamp FROM contactor_events ORDER BY timestamp DESC LIMIT ?`);

setInterval(() => {
  db.prepare(`DELETE FROM contactor_events WHERE timestamp < datetime('now', '-${EVENT_KEEP_DAYS} days')`).run();
}, 60 * 60 * 1000);

class ContactorRepository {
  getState(name) {
    const row = stmtGetState.get(name);
    if (!row) return null;
    return { state: Boolean(row.state), lastChanged: new Date(row.last_changed) };
  }

  getAllStates() {
    const rows = stmtGetAll.all();
    return Object.fromEntries(
      rows.map(r => [r.name, { state: Boolean(r.state), lastChanged: new Date(r.last_changed) }])
    );
  }

  setState(name, newState) {
    const current = this.getState(name);
    if (!current) return null;

    if (current.state !== newState) {
      db.transaction(() => {
        stmtSetState.run(newState ? 1 : 0, name);
        stmtInsertEvt.run(name, newState ? 1 : 0);
      })();
    }

    return this.getState(name);
  }

  getEvents(limit = 50) {
    return stmtGetEvents.all(limit).map(r =>
      new ContactorEvent({ name: r.name, state: Boolean(r.state), timestamp: new Date(r.timestamp) })
    );
  }

  getEventsForExport(limit = 2000) {
    return stmtGetEvents.all(limit);
  }

  getNames() {
    return stmtGetAll.all().map(r => r.name);
  }
}

module.exports = new ContactorRepository();
