const express = require('express');
const StatsController = require('../controllers/StatsController');
const { authenticateToken } = require('../auth/auth'); // Assuming auth middleware exists

const router = express.Router();

// Apply authentication middleware to all stats routes
router.use(authenticateToken);

// Route to get recent heartbeats for the HeartbeatBar
// GET /api/stats/monitor/:id/heartbeats?limit=100
router.get('/monitor/:id/heartbeats', StatsController.getRecentHeartbeats);

// Route to get important events (status changes) for the details page table
// GET /api/stats/monitor/:id/events?limit=50
router.get('/monitor/:id/events', StatsController.getImportantEvents);

// Route to get aggregated stats (uptime, avg ping) for the details page
// GET /api/stats/monitor/:id/summary
router.get('/monitor/:id/summary', StatsController.getMonitorStats);

// Route to get stats data formatted for charts
// GET /api/stats/monitor/:id/chart?period=24h
router.get('/monitor/:id/chart', StatsController.getStatsForChart);

// Route to get overall dashboard summary stats (up/down/paused counts, etc.)
// GET /api/stats/summary
router.get('/summary', StatsController.getDashboardSummary);


module.exports = router;
