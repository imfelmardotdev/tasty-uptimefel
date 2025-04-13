// Import the specific database functions needed
const { 
    createWebsite, 
    getWebsite, 
    getAllWebsitesByUser, // Import the function from db.js
    updateWebsite, 
    deleteWebsite,
    updateWebsiteStatus,
    insertCheckHistory,
    getWebsiteHistory // Import the function from db.js
} = require('../database/db'); 

class Website {
    /**
     * Create a new monitored website
     * @param {object} data Website data including user_id
     * @returns {Promise<object>} Created website
     */
    static async create(data) {
        // Directly call the createWebsite function from db.js
        return createWebsite(data);
    }

    /**
     * Get website by ID
     * @param {number} id Website ID
     * @returns {Promise<object|null>} Website object
     */
    static async getById(id) {
        // Directly call the getWebsite function from db.js
        return getWebsite(id);
    }

    /**
     * Get all websites for a user
     * @param {number} userId User ID
     * @returns {Promise<Array<object>>} Array of websites
     */
    static async getAllByUser(userId) {
        // Use the imported function directly
        return getAllWebsitesByUser(userId); 
    }

    /**
     * Update website configuration
     * @param {number} id Website ID
     * @param {object} data Update data
     * @returns {Promise<object>} Updated website
     */
    static async update(id, data) {
        // Directly call the updateWebsite function from db.js
        return updateWebsite(id, data);
    }

    /**
     * Delete a website and its monitoring data
     * @param {number} id Website ID
     * @returns {Promise<void>}
     */
    static async delete(id) {
        // Directly call the deleteWebsite function from db.js
        return deleteWebsite(id);
    }

    /**
     * Update website status
     * @param {object} status Status update data including websiteId
     * @returns {Promise<void>}
     */
    static async updateStatus(status) {
        // Directly call the updateWebsiteStatus function from db.js
        // Ensure status object includes websiteId (renamed from website_id)
        if (!status.websiteId) { 
            throw new Error("websiteId is required for updateStatus");
        }
        return updateWebsiteStatus(status);
    }

    /**
     * Add monitoring history record
     * @param {object} history History record data including websiteId
     * @returns {Promise<object>} Created history record
     */
    static async addHistory(history) {
        // Directly call the insertCheckHistory function from db.js
        // Ensure history object includes websiteId (renamed from website_id)
        if (!history.websiteId) {
            throw new Error("websiteId is required for addHistory");
        }
        // insertCheckHistory now returns void, so we just call it
        await insertCheckHistory(history); 
        // Return the original history object as confirmation
        return { ...history }; 
    }

    /**
     * Get monitoring history for a website
     * @param {number} websiteId Website ID
     * @param {object} options Query options (limit, offset)
     * @returns {Promise<Array<object>>} History records
     */
    static async getHistory(websiteId, options = {}) {
        // Use the imported function directly
        return getWebsiteHistory(websiteId, options);
    }
}

module.exports = Website;
