class Measurement {
  constructor({ type, phase, value, timestamp = new Date() }) {
    this.type      = type;       // 'voltage' | 'current'
    this.phase     = phase;      // 'L1' | 'L2' | 'L3'
    this.value     = value;
    this.timestamp = timestamp;
  }
}

class AggregatedMeasurement {
  constructor({ type, phase, avg, min, max, timestamp = new Date() }) {
    this.type      = type;
    this.phase     = phase;
    this.avg       = avg;
    this.min       = min;
    this.max       = max;
    this.timestamp = timestamp;
  }
}

class ContactorEvent {
  constructor({ name, state, timestamp = new Date() }) {
    this.name      = name;   // 'K1' | 'K2' | 'K3'
    this.state     = state;  // true = sepnut, false = rozepnut
    this.timestamp = timestamp;
  }
}

module.exports = { Measurement, AggregatedMeasurement, ContactorEvent };
