const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/DashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/live',              (req, res) => ctrl.live(req, res));
router.get('/history',           (req, res) => ctrl.history(req, res));
router.get('/export/voltage',    (req, res) => ctrl.exportVoltage(req, res));
router.get('/export/current',    (req, res) => ctrl.exportCurrent(req, res));
router.get('/export/contactors', (req, res) => ctrl.exportContactors(req, res));

module.exports = router;
