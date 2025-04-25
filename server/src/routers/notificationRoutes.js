const express = require('express');
const { getSettings, updateSettings } = require('../controllers/NotificationController');
const { authenticateToken } = require('../auth/auth'); // Assuming auth middleware exists

const router = express.Router();

// GET /api/notifications/settings - Fetch notification settings
router.get('/settings', authenticateToken, getSettings);

// PUT /api/notifications/settings - Update notification settings
router.put('/settings', authenticateToken, updateSettings);

module.exports = router;
