const dashboardService       = require('../services/DashboardService');
const measurementRepo        = require('../repositories/MeasurementRepository');
const contactorRepo          = require('../repositories/ContactorRepository');

function csvHeader(res, filename) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

class DashboardController {
  live(req, res) {
    res.json(dashboardService.getLive());
  }

  history(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    res.json(dashboardService.getHistory(limit));
  }

  exportVoltage(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 2000, 10000);
    csvHeader(res, 'voltage.csv');
    const rows = measurementRepo.getRawForExport('voltage', limit);
    res.write('timestamp,phase,value_V\n');
    for (const r of rows) res.write(`${r.timestamp},${r.phase},${r.value}\n`);
    res.end();
  }

  exportCurrent(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 2000, 10000);
    csvHeader(res, 'current.csv');
    const rows = measurementRepo.getRawForExport('current', limit);
    res.write('timestamp,phase,value_A\n');
    for (const r of rows) res.write(`${r.timestamp},${r.phase},${r.value}\n`);
    res.end();
  }

  exportContactors(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 2000, 10000);
    csvHeader(res, 'contactors.csv');
    const rows = contactorRepo.getEventsForExport(limit);
    res.write('timestamp,name,state\n');
    for (const r of rows) res.write(`${r.timestamp},${r.name},${r.state ? 'SEPNUT' : 'ROZEPNUT'}\n`);
    res.end();
  }
}

module.exports = new DashboardController();
