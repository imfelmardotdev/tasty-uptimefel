const { getDatabase } = require('../database/init'); // Use pg Pool access
const UptimeCalculator = require('../services/UptimeCalculator');
const { log } = require('../utils/logger');
const dayjs = require('dayjs');

// Helper to safely parse integer query params
const safeParseInt = (value, defaultValue) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

const StatsController = {
    /**
     * Get recent heartbeats for a specific monitor.
     */
    getRecentHeartbeats: async (req, res) => {
        const monitorId = safeParseInt(req.params.id, NaN);
        const limit = safeParseInt(req.query.limit, 100); // Default to 100

        if (isNaN(monitorId)) {
            return res.status(400).json({ message: 'Invalid monitor ID' });
        }

        try {
            const db = getDatabase();
            // Use $1, $2 placeholders for pg
            const sql = `
                SELECT timestamp, status, ping, message
                FROM heartbeats
                WHERE website_id = $1
                ORDER BY timestamp DESC
                LIMIT $2
            `;
            const result = await db.query(sql, [monitorId, limit]);
            // Reverse to have oldest first for the bar rendering if needed by frontend
            res.json((result.rows || []).reverse());

        } catch (error) {
            log.error(`[StatsController] Error fetching recent heartbeats for monitor ${monitorId}:`, error);
            // Avoid sending response if headers already sent (though unlikely here with await)
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching heartbeat data' });
            }
        }
    },

    /**
     * Get important events (status changes) for a monitor.
     */
    getImportantEvents: async (req, res) => {
        const monitorId = safeParseInt(req.params.id, NaN);
        const limit = safeParseInt(req.query.limit, 50); // Default limit

        if (isNaN(monitorId)) {
            return res.status(400).json({ message: 'Invalid monitor ID' });
        }

        try {
            const db = getDatabase();
            // Fetch heartbeats ordered by time
            const sql = `
                SELECT id, timestamp, status, message
                FROM heartbeats
                WHERE website_id = $1
                ORDER BY timestamp ASC
            `;
            const result = await db.query(sql, [monitorId]);
            const allHeartbeats = result.rows || [];

            if (allHeartbeats.length === 0) {
                return res.json([]);
            }

            // Filter for status changes
            const importantEvents = allHeartbeats.reduce((acc, current, index, arr) => {
                if (index === 0 || current.status !== arr[index - 1].status) {
                    acc.push(current);
                }
                return acc;
            }, []);

            // Return the most recent 'limit' important events
            res.json(importantEvents.slice(-limit).reverse()); // Reverse again to show newest first

        } catch (error) {
            log.error(`[StatsController] Error fetching important events for monitor ${monitorId}:`, error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching event data' });
            }
        }
    },

    /**
     * Get aggregated statistics for a monitor (uptime, avg ping).
     */
    getMonitorStats: async (req, res) => {
        const monitorId = safeParseInt(req.params.id, NaN);

        if (isNaN(monitorId)) {
            return res.status(400).json({ message: 'Invalid monitor ID' });
        }

        try {
            // UptimeCalculator needs to be adapted for pg if it uses direct DB access
            // Assuming getUptimeCalculator might now internally use pg compatible db.js functions
            // If UptimeCalculator still uses sqlite methods, it will fail here.
            // For now, we proceed assuming UptimeCalculator is compatible or doesn't use direct sqlite calls.
            const calculator = await UptimeCalculator.getUptimeCalculator(monitorId);

            const uptime24hData = calculator.getUptimeData(24 * 60, 'minute');
            const uptime30dData = calculator.getUptimeData(30, 'day');
            const uptime1yData = calculator.getUptimeData(365, 'day');

            // Get current ping from the most recent heartbeat using pg
            const db = getDatabase();
            const sql = `SELECT ping FROM heartbeats WHERE website_id = $1 ORDER BY timestamp DESC LIMIT 1`;
            const heartbeatResult = await db.query(sql, [monitorId]);
            const lastHeartbeat = heartbeatResult.rows[0];

            // Placeholder for Cert Info
            const certInfo = {
                certExpiryDays: null,
                certIssuer: null,
                certValidTo: null,
                isCertValid: null,
            };

            res.json({
                currentPing: lastHeartbeat?.ping ?? null,
                avgPing24h: uptime24hData.avgPing,
                uptime24h: uptime24hData.uptime,
                uptime30d: uptime30dData.uptime,
                uptime1y: uptime1yData.uptime,
                ...certInfo,
            });

        } catch (error) {
            log.error(`[StatsController] Error fetching stats for monitor ${monitorId}:`, error);
            // Check if the error came from UptimeCalculator incompatibility
            if (error.message.includes('db.all is not a function') || error.message.includes('db.get is not a function')) {
                 log.error(`[StatsController] UptimeCalculator might still be using incompatible SQLite methods.`);
            }
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching statistics data' });
            }
        }
    },

     /**
     * Get stats array for charts (e.g., ping chart).
     */
    getStatsForChart: async (req, res) => {
        const monitorId = safeParseInt(req.params.id, NaN);
        const period = req.query.period || '24h';
        let numPeriods;
        let type;

        if (period.endsWith('h')) {
            numPeriods = safeParseInt(period.slice(0, -1), 24) * 60;
            type = 'minute';
        } else if (period.endsWith('d')) {
             numPeriods = safeParseInt(period.slice(0, -1), 7);
             type = 'hour';
             numPeriods = Math.min(numPeriods, 30) * 24; // Cap at 30 days hourly
        } else {
             numPeriods = 24 * 60;
             type = 'minute';
        }

        if (isNaN(monitorId)) {
            return res.status(400).json({ message: 'Invalid monitor ID or period' });
        }

        try {
            // Assuming UptimeCalculator is compatible with pg or uses db.js functions
            const calculator = await UptimeCalculator.getUptimeCalculator(monitorId);
            const statsArray = calculator.getStatsArray(numPeriods, type);

            const chartData = statsArray.map(stat => ({
                timestamp: stat.timestamp, // Assuming timestamp is already correct format/type
                avgPing: stat.avg_ping,
                up: stat.up_count,
                down: stat.down_count,
                maintenance: stat.maintenance_count,
            }));

            res.json(chartData);
        } catch (error) {
            log.error(`[StatsController] Error fetching chart stats for monitor ${monitorId} (${period}):`, error);
             if (error.message.includes('db.all is not a function') || error.message.includes('db.get is not a function')) {
                 log.error(`[StatsController] UptimeCalculator might still be using incompatible SQLite methods.`);
            }
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching chart data' });
            }
        }
    },

    /**
     * Get overall dashboard summary statistics (up/down/paused counts).
     */
    getDashboardSummary: async (req, res) => {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const db = getDatabase();
            // Use $1 placeholder for pg
            const sql = `
                SELECT
                    mw.active,
                    ws.is_up
                FROM
                    monitored_websites mw
                LEFT JOIN
                    website_status ws ON mw.id = ws.website_id
                WHERE
                    mw.user_id = $1
            `;
            const result = await db.query(sql, [userId]);
            const rows = result.rows || [];

            let upCount = 0;
            let downCount = 0;
            let pausedCount = 0;

            // Assuming 'active' and 'is_up' are boolean in the database now
            rows.forEach(website => {
                if (website.active === false) {
                    pausedCount++;
                } else if (website.is_up === true) {
                    upCount++;
                } else { // Active but not up (down or status unknown)
                    downCount++;
                }
            });

            // Placeholder data needs implementation
            const summaryData = {
                up: upCount,
                down: downCount,
                paused: pausedCount,
                total: rows.length,
                overallUptime24h: 99.99, // Placeholder
                incidents24h: 0,        // Placeholder
                daysWithoutIncidents: 1, // Placeholder
                affectedMonitors24h: 0   // Placeholder
            };

            res.json(summaryData);

        } catch (error) {
            log.error(`[StatsController] Error fetching dashboard summary for user ${userId}:`, error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching dashboard summary data' });
            }
        }
    },
};

module.exports = StatsController;
