const measurementRepo = require('../repositories/MeasurementRepository');
const contactorRepo   = require('../repositories/ContactorRepository');
const brokerService   = require('./BrokerService');

class DashboardService {
  getLive() {
    return {
      ...measurementRepo.getLatestAll(),
      contactors:    contactorRepo.getAllStates(),
      recentEvents:  contactorRepo.getEvents(20),
      source:        brokerService.isConnected() ? 'broker' : 'simulator',
      lastMessageAt: brokerService.getLastMessageAt(),
      timestamp:     new Date(),
    };
  }

  getHistory(limit = 50) {
    return {
      ...measurementRepo.getAllAggregated(limit),
      timestamp: new Date(),
    };
  }
}

module.exports = new DashboardService();
