const db = require('../database/db');

/**
 * Controller to get notification settings
 */
const getSettings = async (req, res) => {
    try {
        const settings = await db.getNotificationSettings();
        if (!settings) {
            // This case should ideally not happen if the migration ran correctly
            // and inserted the default row. Return default values.
            console.warn('Notification settings row not found, returning defaults.');
            return res.json({ id: 1, webhook_url: '', webhook_enabled: false });
        }
        res.json(settings);
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ message: 'Failed to fetch notification settings' });
    }
};

/**
 * Controller to update notification settings
 */
const updateSettings = async (req, res) => {
    const { webhook_url, webhook_enabled } = req.body;

    // Basic validation
    if (typeof webhook_url !== 'string' || typeof webhook_enabled === 'undefined') {
        return res.status(400).json({ message: 'Missing or invalid parameters: webhook_url (string) and webhook_enabled (boolean) are required.' });
    }

    try {
        const updatedSettings = await db.updateNotificationSettings({
            webhook_url,
            webhook_enabled
        });
        res.json(updatedSettings);
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ message: 'Failed to update notification settings' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
};
