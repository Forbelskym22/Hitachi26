const { ContactorEvent } = require('../models/Measurement');

const EVENT_LIMIT = 200;

const CONTACTOR_NAMES = ['K1', 'K2', 'K3'];

// Initial states
const states = {
  K1: { state: true,  lastChanged: new Date() },
  K2: { state: false, lastChanged: new Date() },
  K3: { state: true,  lastChanged: new Date() },
};

const events = [];

class ContactorRepository {
  getState(name) {
    return states[name] ?? null;
  }

  getAllStates() {
    return { ...states };
  }

  // Sets state; logs event only if state actually changed
  setState(name, newState) {
    const current = states[name];
    if (!current) return null;

    if (current.state !== newState) {
      current.state       = newState;
      current.lastChanged = new Date();

      const ev = new ContactorEvent({ name, state: newState });
      events.push(ev);
      if (events.length > EVENT_LIMIT) events.shift();
    }

    return states[name];
  }

  getEvents(limit = 50) {
    return events.slice(-limit).reverse();
  }

  getNames() {
    return CONTACTOR_NAMES;
  }
}

module.exports = new ContactorRepository();
