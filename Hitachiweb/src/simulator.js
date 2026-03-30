const measurementRepo = require('./repositories/MeasurementRepository');
const contactorRepo   = require('./repositories/ContactorRepository');

// Running state — random walk per channel
// Napětí: jednofázové (pouze L1)
// Proud: 4 kanály (L1–L4)
const state = {
  voltage: { L1: 230 },
  current: { L1: 10, L2: 12, L3: 9, L4: 7 },
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function randomWalk(value, step, min, max) {
  return clamp(value + (Math.random() - 0.5) * 2 * step, min, max);
}

function tickMeasurements() {
  // Napětí — jednofázové
  state.voltage.L1 = randomWalk(state.voltage.L1, 1.5, 215, 245);
  measurementRepo.add('voltage', 'L1', parseFloat(state.voltage.L1.toFixed(2)));

  // Proud — 4 kanály
  for (const phase of ['L1', 'L2', 'L3', 'L4']) {
    state.current[phase] = randomWalk(state.current[phase], 0.8, 0, 25);
    measurementRepo.add('current', phase, parseFloat(state.current[phase].toFixed(3)));
  }
}

function randomContactorToggle() {
  const names = contactorRepo.getNames();
  const name  = names[Math.floor(Math.random() * names.length)];
  const curr  = contactorRepo.getState(name);
  contactorRepo.setState(name, !curr.state);
  console.log(`[Simulator] ${name} → ${!curr.state ? 'SEPNUT' : 'ROZEPNUT'}`);
}

function scheduleToggle() {
  const delay = 10_000 + Math.random() * 20_000; // 10–30s
  setTimeout(() => {
    randomContactorToggle();
    scheduleToggle();
  }, delay);
}

module.exports = function startSimulator() {
  tickMeasurements();              // immediate first tick
  setInterval(tickMeasurements, 1000);
  scheduleToggle();
  console.log('[Simulator] Spuštěn — napětí, proud, stykače');
};
