const express = require('express');
const PublicStatusController = require('../controllers/PublicStatusController');

const router = express.Router();

// Public route - no authentication needed
router.get('/status', PublicStatusController.getStatus);

module.exports = router;
