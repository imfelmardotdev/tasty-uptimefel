const express = require('express');
const WebsiteController = require('../controllers/WebsiteController');
const { authenticateToken } = require('../auth/auth'); // Import authenticateToken

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Website management routes
router.post('/websites', WebsiteController.create);
router.get('/websites', WebsiteController.getAll);
router.get('/websites/:id', WebsiteController.getById);
router.put('/websites/:id', WebsiteController.update);
router.delete('/websites/:id', WebsiteController.delete);

// Monitoring routes
router.get('/websites/:id/history', WebsiteController.getHistory);
router.post('/websites/:id/check', WebsiteController.check);

module.exports = router;
