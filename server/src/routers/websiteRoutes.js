const express = require('express');
const WebsiteController = require('../controllers/WebsiteController');
const { authenticateToken } = require('../auth/auth'); // Import authenticateToken

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Website management routes (relative to the mount point /api/websites)
router.post('/', WebsiteController.create);        // Corresponds to POST /api/websites
router.get('/', WebsiteController.getAll);         // Corresponds to GET /api/websites
router.get('/:id', WebsiteController.getById);     // Corresponds to GET /api/websites/:id
router.put('/:id', WebsiteController.update);      // Corresponds to PUT /api/websites/:id
router.delete('/:id', WebsiteController.delete);   // Corresponds to DELETE /api/websites/:id

// Monitoring routes (relative to the mount point /api/websites)
router.get('/:id/history', WebsiteController.getHistory); // Corresponds to GET /api/websites/:id/history
router.post('/:id/check', WebsiteController.check);       // Corresponds to POST /api/websites/:id/check

module.exports = router;
