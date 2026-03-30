const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/change-password', requireAuth, (req, res) => authController.changePassword(req, res));
router.get('/me', requireAuth, (req, res) => authController.me(req, res));

module.exports = router;
