const { getDatabase } = require('../database/init'); // Use raw db access
const UptimeCalculator = require('../services/UptimeCalculator');
const { log } = require('../utils/logger');
const dayjs = require('dayjs');

const StatsController = {
    /**
     * Get recent heartbeats for a specific monitor.
     * Used for the HeartbeatBar component.
     */
    getRecentHeartbeats: async (req, res) => {
        const monitorId = parseInt(req.params.id, 10);
        const limit = parseInt(req.query.limit || '100', 10); // Default to 100

        if (isNaN(monitorId)) {
            return res.status(400).json({ message: 'Invalid monitor ID' });
        }

        try {
            const db = getDatabase();
            const sql = `
                SELECT timestamp, status, ping, message
                FROM heartbeats
                WHERE website_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `;
            db.all(sql, [monitorId, limit], (err, rows) => {
                if (err) {
                    log.error(`[StatsController] DB Error fetching recent heartbeats for monitor ${monitorId}:`, err);
                    // Ensure response is sent only once
                    if (!res.headersSent) {
                        return res.status(500).json({ message: 'Error fetching heartbeat data' });
                    }
                }
                 // Reverse to have oldest first for the bar rendering if needed by frontend
                if (!res.headersSent) {
                    res.json((rows || []).reverse());
                }
            });
        } catch (error) {
            // Catch potential errors in getDatabase() or other sync issues
            log.error(`[StatsController] Error fetching recent heartbeats for monitor ${monitorId}:`, error);
             if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching heartbeat data' });
            }
        }
    },

    /**
     * Get important events (status changes) for a monitor.
     * Used for the events table on the details page.
     */
    getImportantEvents: async (req, res) => {
        const monitorId = parseInt(req.params.id, 10);
        const limit = parseInt(req.query.limit || '50', 10); // Default limit

        if (isNaN(monitorId)) {
            return res.status(400).json({ message: 'Invalid monitor ID' });
        }

        try {
            const db = getDatabase();
            // Fetch heartbeats ordered by time
            const sql = `
                SELECT id, timestamp, status, message
                FROM heartbeats
                WHERE website_id = ?
                ORDER BY timestamp ASC
            `;
            db.all(sql, [monitorId], (err, allHeartbeats) => {
                 if (err) {
                    log.error(`[StatsController] DB Error fetching all heartbeats for events monitor ${monitorId}:`, err);
                     if (!res.headersSent) {
                        return res.status(500).json({ message: 'Error fetching event data' });
                    }
                }

                if (!allHeartbeats || allHeartbeats.length === 0) {
                     if (!res.headersSent) {
                        return res.json([]);
                    }
                }

                 // Filter for status changes
                const importantEvents = (allHeartbeats || []).reduce((acc, current, index, arr) => {
                    // Always include the first heartbeat
                    if (index === 0) {
                        acc.push(current);
                    }
                    // Include if status is different from the previous one
                    else if (current.status !== arr[index - 1].status) {
                        acc.push(current);
                    }
                    return acc;
                }, []);

                // Return the most recent 'limit' important events
                 if (!res.headersSent) {
                    res.json(importantEvents.slice(-limit).reverse()); // Reverse again to show newest first in table
                }
            });

        } catch (error) {
            log.error(`[StatsController] Error fetching important events for monitor ${monitorId}:`, error);
             if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching event data' });
            }
        }
    },

    /**
     * Get aggregated statistics for a monitor (uptime, avg ping).
     * Used for the stats section on the details page.
     */
    getMonitorStats: async (req, res) => {
        const monitorId = parseInt(req.params.id, 10);

        if (isNaN(monitorId)) {
            return res.status(400).json({ message: 'Invalid monitor ID' });
        }

        try {
            const calculator = await UptimeCalculator.getUptimeCalculator(monitorId);

            // Fetch stats using the calculator's cached/calculated data
            const uptime24hData = calculator.getUptimeData(24 * 60, 'minute'); // 24 hours
            const uptime30dData = calculator.getUptimeData(30, 'day');       // 30 days
            const uptime1yData = calculator.getUptimeData(365, 'day');      // 1 year

            // Get current ping from the most recent heartbeat (might be slightly delayed)
            const db = getDatabase();
            const lastHeartbeat = await new Promise((resolve, reject) => {
                 const sql = `SELECT ping FROM heartbeats WHERE website_id = ? ORDER BY timestamp DESC LIMIT 1`;
                 db.get(sql, [monitorId], (err, row) => {
                     if (err) reject(err);
                     else resolve(row);
                 });
            });


            // TODO: Add Certificate Info fetching if applicable to the monitor type
            // This would likely involve checking the last successful heartbeat message
            // or storing cert info separately. For now, returning null.
            const certInfo = {
                certExpiryDays: null,
                certIssuer: null,
                certValidTo: null,
                isCertValid: null,
            };

             if (!res.headersSent) {
                res.json({
                    currentPing: lastHeartbeat?.ping ?? null,
                    avgPing24h: uptime24hData.avgPing,
                    uptime24h: uptime24hData.uptime,
                    uptime30d: uptime30dData.uptime,
                    uptime1y: uptime1yData.uptime,
                    ...certInfo,
                });
            }

        } catch (error) {
            log.error(`[StatsController] Error fetching stats for monitor ${monitorId}:`, error);
             if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching statistics data' });
            }
        }
    },

     /**
     * Get stats array for charts (e.g., ping chart).
     */
    getStatsForChart: async (req, res) => {
        const monitorId = parseInt(req.params.id, 10);
        // Determine period and type from query params (e.g., ?period=24h, ?period=7d)
        const period = req.query.period || '24h'; // Default to 24 hours
        let numPeriods;
        let type;

         // Basic period parsing (can be enhanced)
        if (period.endsWith('h')) {
            numPeriods = parseInt(period.slice(0, -1), 10) * 60; // Convert hours to minutes
            type = 'minute';
        } else if (period.endsWith('d')) {
             numPeriods = parseInt(period.slice(0, -1), 10);
             type = 'hour'; // Use hourly stats for daily views for efficiency
             if (numPeriods > 30) { // Cap at 30 days for hourly
                 numPeriods = 30 * 24; // Use max hourly cache
             } else {
                 numPeriods = numPeriods * 24; // Convert days to hours
             }
        } else {
             // Default to 24h (minutely) if format is invalid
             numPeriods = 24 * 60;
             type = 'minute';
        }


        if (isNaN(monitorId) || isNaN(numPeriods)) {
            return res.status(400).json({ message: 'Invalid monitor ID or period' });
        }

        try {
            const calculator = await UptimeCalculator.getUptimeCalculator(monitorId);
            const statsArray = calculator.getStatsArray(numPeriods, type);

            // Select/format data specifically for charts if needed
            const chartData = statsArray.map(stat => ({
                timestamp: stat.timestamp,
                avgPing: stat.avg_ping,
                up: stat.up_count,
                down: stat.down_count,
                maintenance: stat.maintenance_count,
                // Add min/max ping if needed for the chart
            }));

             if (!res.headersSent) {
                res.json(chartData);
            }
        } catch (error) {
            log.error(`[StatsController] Error fetching chart stats for monitor ${monitorId} (${period}):`, error);
             if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching chart data' });
            }
        }
    },

    /**
     * Get overall dashboard summary statistics (up/down/paused counts).
     */
    getDashboardSummary: async (req, res) => {
        const userId = req.user?.id; // Get user ID from authenticated request

        if (!userId) {
            // This shouldn't happen if authenticateToken middleware is working
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const db = getDatabase();
            const sql = `
                SELECT is_up, active
                FROM websites
                WHERE user_id = ?
            `;

            db.all(sql, [userId], (err, rows) => {
                if (err) {
                    log.error(`[StatsController] DB Error fetching website statuses for dashboard summary (User ${userId}):`, err);
                    if (!res.headersSent) {
                        return res.status(500).json({ message: 'Error fetching dashboard summary data' });
                    }
                    return; // Ensure no further processing
                }

                let upCount = 0;
                let downCount = 0;
                let pausedCount = 0;

                (rows || []).forEach(website => {
                    if (website.active === 0 || website.active === false) { // Check if paused (inactive)
                        pausedCount++;
                    } else if (website.is_up === 1 || website.is_up === true) { // Check if active and up
                        upCount++;
                    } else { // Must be active and down (or unknown, count as down for simplicity)
                        downCount++;
                    }
                });

                if (!res.headersSent) {
                    res.json({
                        up: upCount,
                        down: downCount,
                        paused: pausedCount,
                        total: rows.length, // Total monitors for this user

                        // --- Placeholder data for RecentStatsPanel ---
                        // TODO: Implement actual calculation for these values
                        // This might involve querying heartbeats/stats tables for the last 24h
                        // or using an aggregated calculation service.
                        overallUptime24h: 99.95, // Placeholder percentage
                        incidents24h: 0,        // Placeholder count
                        daysWithoutIncidents: 1, // Placeholder count
                        affectedMonitors24h: 0   // Placeholder count
                        // --- End Placeholder data ---
                    });
                }
            });

        } catch (error) {
            log.error(`[StatsController] Error fetching dashboard summary for user ${userId}:`, error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error fetching dashboard summary data' });
            }
        }
    },
};

module.exports = StatsController;
