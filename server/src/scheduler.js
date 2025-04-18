// Removed: const Website = require('./models/Website'); - Not used directly here
const { performCheck } = require('./monitoring/checker');
const { getAllWebsites, updateWebsiteStatus, insertCheckHistory } = require('./database/db'); // Import db functions

/**
 * Checks all active websites whose check interval has passed.
 */
const checkWebsites = async () => {
    console.log('Cron job: Starting website check cycle...');
    let checkedCount = 0;
    let errorCount = 0;
    try {
        // Get all websites using the db function
        const websites = await getAllWebsites();
        console.log(`Found ${websites.length} websites to potentially check.`);

        // Check each website
        for (const website of websites) {
            try {
                // Check if it's time to monitor this website
                // Use current time for comparison
                const now = new Date();
                // Ensure last_check_time is treated as a Date object, handle null/undefined
                const lastCheckTime = website.last_check_time ? new Date(website.last_check_time) : new Date(0);
                const timeSinceLastCheck = now.getTime() - lastCheckTime.getTime();
                const intervalMs = (website.check_interval || 300) * 1000; // Use default if null

                // Check if active AND check_interval has passed since last check
                // Assuming 'active' column is boolean in PG
                if (website.active === true && timeSinceLastCheck >= intervalMs) {
                      console.log(`Checking website: ${website.name} (${website.url}) - Interval: ${intervalMs}ms, Last Check: ${lastCheckTime.toISOString()}`);
                      checkedCount++;

                      // Perform the check
                      const result = await performCheck(website); // performCheck needs to handle PG website object structure

                      // Update status and history using db functions
                      // Ensure result object structure matches what db functions expect
                      await updateWebsiteStatus({ ...result, websiteId: website.id });
                      await insertCheckHistory({ ...result, websiteId: website.id });
                      console.log(`Check complete for ${website.name}. Status: ${result.isUp ? 'UP' : 'DOWN'}`);
                } else if (website.active !== true) {
                    // console.log(`Skipping inactive website: ${website.name}`);
                } else {
                    // console.log(`Skipping website (interval not met): ${website.name}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`Error checking individual website ${website.name} (ID: ${website.id}):`, error);
                // Optionally update status to indicate check failure?
                // await updateWebsiteStatus({ websiteId: website.id, isUp: false, error_message: 'Scheduler check failed: ' + error.message });
            }
        }
    } catch (error) {
        errorCount++;
        console.error('Error fetching websites for monitoring loop:', error);
    } finally {
        console.log(`Cron job: Finished website check cycle. Checked: ${checkedCount}, Errors: ${errorCount}`);
    }
};

// Removed startMonitoring, stopMonitoring, and interval logic

// Export only the function needed by the cron endpoint
module.exports = {
    checkWebsites
};
