const db                                       = require('../db/database');
const { Measurement, AggregatedMeasurement }   = require('../models/Measurement');

const RAW_KEEP_HOURS = 24;       // uchovej raw data X hodin
const AGG_KEEP_DAYS  = 30;       // uchovej agregovaná data X dní
const AGG_INTERVAL   = 10_000;   // agreguj každých 10s

// Prepared statements
const stmtInsertRaw = db.prepare(
  `INSERT INTO measurements (type, phase, value) VALUES (?, ?, ?)`
);
const stmtInsertAgg = db.prepare(
  `INSERT INTO aggregated (type, phase, avg, min, max) VALUES (?, ?, ?, ?, ?)`
);
const stmtLatest = db.prepare(
  `SELECT value, timestamp FROM measurements
   WHERE type = ? AND phase = ?
   ORDER BY timestamp DESC LIMIT 1`
);
const stmtAgg = db.prepare(
  `SELECT avg, min, max, timestamp FROM aggregated
   WHERE type = ? AND phase = ?
   ORDER BY timestamp DESC LIMIT ?`
);
const stmtRawExport = db.prepare(
  `SELECT phase, value, timestamp FROM measurements
   WHERE type = ?
   ORDER BY timestamp DESC LIMIT ?`
);
// Pending raw readings for aggregation (in-memory, flushed every AGG_INTERVAL)
const pending = {
  voltage: { L1: [], L2: [], L3: [] },
  current: { L1: [], L2: [], L3: [], L4: [] },
};

function flushAggregation() {
  const insertMany = db.transaction(() => {
    for (const type of Object.keys(pending)) {
      for (const phase of Object.keys(pending[type])) {
        const buf = pending[type][phase];
        if (!buf.length) continue;
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        const min = Math.min(...buf);
        const max = Math.max(...buf);
        stmtInsertAgg.run(type, phase, avg, min, max);
        pending[type][phase] = [];
      }
    }
  });
  insertMany();
}

function pruneOldData() {
  db.prepare(
    `DELETE FROM measurements WHERE timestamp < datetime('now', '-${RAW_KEEP_HOURS} hours')`
  ).run();
  db.prepare(
    `DELETE FROM aggregated WHERE timestamp < datetime('now', '-${AGG_KEEP_DAYS} days')`
  ).run();
}

setInterval(flushAggregation, AGG_INTERVAL);
// Prune jednou za hodinu
setInterval(pruneOldData, 60 * 60 * 1000);

class MeasurementRepository {
  add(type, phase, value) {
    stmtInsertRaw.run(type, phase, value);
    if (pending[type]?.[phase] !== undefined) {
      pending[type][phase].push(value);
    }
    return new Measurement({ type, phase, value });
  }

  getLatest(type, phase) {
    const row = stmtLatest.get(type, phase);
    return row ? new Measurement({ type, phase, value: row.value, timestamp: new Date(row.timestamp) }) : null;
  }

  getLatestAll() {
    const result = {};
    for (const type of ['voltage', 'current']) {
      result[type] = {};
      const phases = type === 'current' ? ['L1','L2','L3','L4'] : ['L1','L2','L3'];
      for (const phase of phases) {
        const m = this.getLatest(type, phase);
        result[type][phase] = m ? m.value : null;
      }
    }
    return result;
  }

  getAggregated(type, phase, limit = 50) {
    return stmtAgg.all(type, phase, limit).reverse().map(r =>
      new AggregatedMeasurement({ type, phase, avg: r.avg, min: r.min, max: r.max, timestamp: new Date(r.timestamp) })
    );
  }

  getRawForExport(type, limit = 2000) {
    return stmtRawExport.all(type, limit);
  }

  getAllAggregated(limit = 50) {
    const result = {};
    for (const type of ['voltage', 'current']) {
      result[type] = {};
      const phases = type === 'current' ? ['L1','L2','L3','L4'] : ['L1','L2','L3'];
      for (const phase of phases) {
        result[type][phase] = this.getAggregated(type, phase, limit);
      }
    }
    return result;
  }
}

module.exports = new MeasurementRepository();
