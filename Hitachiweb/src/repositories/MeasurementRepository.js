const { Measurement, AggregatedMeasurement } = require('../models/Measurement');

const RAW_LIMIT   = 300;  // max raw readings per channel
const AGG_LIMIT   = 100;  // max aggregated points per channel
const AGG_INTERVAL = 10 * 1000; // aggregate every 10s

// raw[type][phase] = Measurement[]
// agg[type][phase] = AggregatedMeasurement[]
const raw = { voltage: { L1: [], L2: [], L3: [] }, current: { L1: [], L2: [], L3: [] } };
const agg = { voltage: { L1: [], L2: [], L3: [] }, current: { L1: [], L2: [], L3: [] } };

// Pending raw readings waiting to be aggregated
const pending = { voltage: { L1: [], L2: [], L3: [] }, current: { L1: [], L2: [], L3: [] } };

function pushCapped(arr, item, limit) {
  arr.push(item);
  if (arr.length > limit) arr.shift();
}

function aggregate() {
  for (const type of ['voltage', 'current']) {
    for (const phase of ['L1', 'L2', 'L3']) {
      const buf = pending[type][phase];
      if (buf.length === 0) continue;

      const values = buf.map(m => m.value);
      const point  = new AggregatedMeasurement({
        type, phase,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      });

      pushCapped(agg[type][phase], point, AGG_LIMIT);
      pending[type][phase] = [];
    }
  }
}

// Kick off aggregation timer
setInterval(aggregate, AGG_INTERVAL);

class MeasurementRepository {
  add(type, phase, value) {
    const m = new Measurement({ type, phase, value });
    pushCapped(raw[type][phase], m, RAW_LIMIT);
    pending[type][phase].push(m);
    return m;
  }

  getLatest(type, phase) {
    const arr = raw[type][phase];
    return arr.length ? arr[arr.length - 1] : null;
  }

  getLatestAll() {
    const result = {};
    for (const type of ['voltage', 'current']) {
      result[type] = {};
      for (const phase of ['L1', 'L2', 'L3']) {
        const m = this.getLatest(type, phase);
        result[type][phase] = m ? m.value : null;
      }
    }
    return result;
  }

  getAggregated(type, phase, limit = 50) {
    return agg[type][phase].slice(-limit);
  }

  getAllAggregated(limit = 50) {
    const result = {};
    for (const type of ['voltage', 'current']) {
      result[type] = {};
      for (const phase of ['L1', 'L2', 'L3']) {
        result[type][phase] = this.getAggregated(type, phase, limit);
      }
    }
    return result;
  }
}

module.exports = new MeasurementRepository();
