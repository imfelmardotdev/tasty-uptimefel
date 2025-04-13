const Website = require('./models/Website');
const { performCheck } = require('./monitoring/checker');
const { getAllWebsites, updateWebsiteStatus, insertCheckHistory } = require('./database/db'); // Import getAllWebsites from db

let monitoringInterval;

const checkWebsites = async () => {
    try {
        // Get all websites using the db function
        const websites = await getAllWebsites(); 
        
        // Check each website
        for (const website of websites) {
            try {
                // Check if it's time to monitor this website
                const lastCheck = new Date(website.last_check_time || 0);
                const now = new Date();
                const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
                const intervalMs = (website.check_interval || 300) * 1000; // Use default if null

                // Check if active AND check_interval has passed since last check
                // Assuming 'active' column exists and is 1 for active, 0 for paused
                if (website.active === 1 && timeSinceLastCheck >= intervalMs) {
                    console.log(`Checking website: ${website.name} (${website.url})`);

                    // Perform the check
                    const result = await performCheck(website);
                    
                    // Update status and history using db functions
                    await updateWebsiteStatus({ ...result, websiteId: website.id });
                    await insertCheckHistory({ ...result, websiteId: website.id });
                }
            } catch (error) {
                console.error(`Error checking website ${website.name}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in monitoring loop:', error);
    }
};

const startMonitoring = () => {
    // Run initial check
    checkWebsites();
    
    // Set up interval (every minute)
    monitoringInterval = setInterval(checkWebsites, 60 * 1000);
    
    console.log('Website monitoring started');
};

const stopMonitoring = () => {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('Website monitoring stopped');
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    stopMonitoring();
});

process.on('SIGINT', () => {
    stopMonitoring();
});

module.exports = {
    startMonitoring,
    stopMonitoring,
    checkWebsites
};
