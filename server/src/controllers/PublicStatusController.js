const { getAllWebsites } = require('../database/db');
const { getDatabase } = require('../database/init'); // Import getDatabase
const { log } = require('../utils/logger'); // Import logger

class PublicStatusController {
    /**
     * Get status for all monitored websites (public)
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async getStatus(req, res) {
        try {
            // Fetch all websites with their status
            const websites = await getAllWebsites();
            const db = getDatabase();
            const heartbeatLimit = 50; // Number of heartbeats for public page

            // Fetch heartbeats for each website concurrently
            const publicStatusData = await Promise.all(websites.map(async (site) => {
                try {
                    // Use pg syntax: db.query and $1, $2 placeholders
                    const sql = `
                        SELECT timestamp, status, ping, message
                        FROM heartbeats
                        WHERE website_id = $1
                        ORDER BY timestamp DESC
                        LIMIT $2
                    `;
                    const result = await db.query(sql, [site.id, heartbeatLimit]);
                    const heartbeats = (result.rows || []).reverse(); // Get rows and reverse (oldest first)

                     return {
                         id: site.id,
                         name: site.name,
                         url: site.url, // Uncommented to include URL
                         is_up: site.is_up,
                         last_check_time: site.last_check_time,
                         heartbeats: heartbeats, // Add heartbeats
                        // uptime_percentage: site.uptime_percentage // Add if needed
                    };
                } catch (hbError) {
                     log.error(`[PublicStatus] Error fetching heartbeats for public monitor ${site.id}:`, hbError);
                     // Return site data even if heartbeats fail
                     return {
                        id: site.id,
                        name: site.name,
                        is_up: site.is_up,
                        last_check_time: site.last_check_time,
                        heartbeats: [],
                    };
                }
            }));

            res.json(publicStatusData);
        } catch (error) {
            log.error('Error getting public website status:', error);
            res.status(500).json({
                error: 'Failed to get website statuses'
            });
        }
    }
}

module.exports = PublicStatusController;
