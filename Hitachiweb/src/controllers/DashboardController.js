const dashboardService = require('../services/DashboardService');

class DashboardController {
  live(req, res) {
    res.json(dashboardService.getLive());
  }

  history(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    res.json(dashboardService.getHistory(limit));
  }
}

module.exports = new DashboardController();
