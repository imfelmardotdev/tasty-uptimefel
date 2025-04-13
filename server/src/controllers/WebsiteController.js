const Website = require('../models/Website');
const { performCheck } = require('../monitoring/checker');
const { updateWebsiteStatus, insertCheckHistory } = require('../database/db');

const VALID_MONITOR_TYPES = ['http', 'https', 'keyword'];

class WebsiteController {
    /**
     * Create a new website to monitor and perform initial check
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async create(req, res) {
        try {
            // Add user ID from authenticated session
            const data = {
                ...req.body,
                user_id: req.user.id,
                monitor_type: req.body.monitorType || 'http'
            };

            // Validate required fields
            if (!data.name || !data.url) {
                return res.status(400).json({
                    error: 'Name and URL are required'
                });
            }

            // Validate monitor type
            if (!VALID_MONITOR_TYPES.includes(data.monitor_type)) {
                return res.status(400).json({
                    error: 'Invalid monitor type'
                });
            }

            // Validate monitor-specific configurations
            if (data.monitor_type === 'https' && data.monitorConfig) {
                if (typeof data.monitorConfig.expiryThreshold !== 'undefined' &&
                    (data.monitorConfig.expiryThreshold < 1 || data.monitorConfig.expiryThreshold > 90)) {
                    return res.status(400).json({
                        error: 'Certificate expiry threshold must be between 1 and 90 days'
                    });
                }
            }

            // Convert monitor config to match database schema
            if (data.monitorConfig) {
                data.monitor_config = data.monitorConfig;
                delete data.monitorConfig;
            }

            // Create website (this now also initializes status row)
            const createdWebsite = await Website.create(data);

            // Perform initial check immediately
            console.log(`Performing initial check for: ${createdWebsite.name}`);
            const checkResult = await performCheck(createdWebsite);

            // Update status and history with the initial check result
            const statusData = { ...checkResult, websiteId: createdWebsite.id };
            await updateWebsiteStatus(statusData);
            await insertCheckHistory(statusData);
            console.log(`Initial check completed for: ${createdWebsite.name}, Status: ${checkResult.isUp ? 'Up' : 'Down'}`);

            // Fetch the website again to include the updated status from the initial check
            const websiteWithInitialStatus = await Website.getById(createdWebsite.id);

            // Return created website with initial status
            res.status(201).json(websiteWithInitialStatus);

        } catch (error) {
            console.error('Error creating website:', error);
            res.status(500).json({
                error: 'Failed to create website'
            });
        }
    }

    /**
     * Get all websites for the authenticated user
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async getAll(req, res) {
        try {
            const websites = await Website.getAllByUser(req.user.id);
            res.json(websites);
        } catch (error) {
            console.error('Error getting websites:', error);
            res.status(500).json({
                error: 'Failed to get websites'
            });
        }
    }

    /**
     * Get a single website by ID
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async getById(req, res) {
        try {
            const website = await Website.getById(req.params.id);
            
            if (!website) {
                return res.status(404).json({
                    error: 'Website not found'
                });
            }

            // Check if website belongs to user
            if (website.user_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied'
                });
            }

            res.json(website);
        } catch (error) {
            console.error('Error getting website:', error);
            res.status(500).json({
                error: 'Failed to get website'
            });
        }
    }

    /**
     * Update a website
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async update(req, res) {
        try {
            // Check if website exists and belongs to user
            const website = await Website.getById(req.params.id);
            
            if (!website) {
                return res.status(404).json({
                    error: 'Website not found'
                });
            }

            if (website.user_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied'
                });
            }

            const updateData = {
                ...req.body,
                monitor_type: req.body.monitorType,
            };

            // Validate monitor type if being updated
            if (updateData.monitor_type && !VALID_MONITOR_TYPES.includes(updateData.monitor_type)) {
                return res.status(400).json({
                    error: 'Invalid monitor type'
                });
            }

            // Validate monitor-specific configurations
            if (updateData.monitorConfig) {
                if (updateData.monitor_type === 'https' && 
                    typeof updateData.monitorConfig.expiryThreshold !== 'undefined' &&
                    (updateData.monitorConfig.expiryThreshold < 1 || updateData.monitorConfig.expiryThreshold > 90)) {
                    return res.status(400).json({
                        error: 'Certificate expiry threshold must be between 1 and 90 days'
                    });
                }

                // Convert monitor config to match database schema
                updateData.monitor_config = updateData.monitorConfig;
                delete updateData.monitorConfig;
            }

            // Update website
            const updatedWebsite = await Website.update(req.params.id, updateData);
            res.json(updatedWebsite);
        } catch (error) {
            console.error('Error updating website:', error);
            res.status(500).json({
                error: 'Failed to update website'
            });
        }
    }

    /**
     * Delete a website
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async delete(req, res) {
        try {
            // Check if website exists and belongs to user
            const website = await Website.getById(req.params.id);
            
            if (!website) {
                return res.status(404).json({
                    error: 'Website not found'
                });
            }

            if (website.user_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied'
                });
            }

            // Delete website
            await Website.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting website:', error);
            res.status(500).json({
                error: 'Failed to delete website'
            });
        }
    }

    /**
     * Get monitoring history for a website
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async getHistory(req, res) {
        try {
            // Check if website exists and belongs to user
            const website = await Website.getById(req.params.id);
            
            if (!website) {
                return res.status(404).json({
                    error: 'Website not found'
                });
            }

            if (website.user_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied'
                });
            }

            // Get history with pagination
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            
            const history = await Website.getHistory(req.params.id, { limit, offset });
            res.json(history);
        } catch (error) {
            console.error('Error getting website history:', error);
            res.status(500).json({
                error: 'Failed to get website history'
            });
        }
    }

    /**
     * Manually trigger a website check
     * @param {object} req Express request
     * @param {object} res Express response
     */
    static async check(req, res) {
        try {
            // Check if website exists and belongs to user
            const website = await Website.getById(req.params.id);
            
            if (!website) {
                return res.status(404).json({
                    error: 'Website not found'
                });
            }

            if (website.user_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied'
                });
            }

            // Perform check
            console.log(`Manual check requested for: ${website.name}`);
            const result = await performCheck(website);

            // Update status and history
            const statusData = { ...result, websiteId: website.id };
            await updateWebsiteStatus(statusData);
            await insertCheckHistory(statusData);
            console.log(`Manual check completed for: ${website.name}, Status: ${result.isUp ? 'Up' : 'Down'}`);

            // Fetch the website again to include the updated status
            const websiteWithUpdatedStatus = await Website.getById(website.id);

            res.json(websiteWithUpdatedStatus); // Return updated website status
        } catch (error) {
            console.error('Error checking website manually:', error);
            res.status(500).json({
                error: 'Failed to check website'
            });
        }
    }
}

module.exports = WebsiteController;
