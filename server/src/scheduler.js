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
                      console.log(`[SCHEDULER] Performing check for ${website.name} (ID: ${website.id})...`);
                      const result = await performCheck(website); // performCheck needs to handle PG website object structure
                      console.log(`[SCHEDULER] Check performed for ${website.name}. Result: ${result.isUp ? 'UP' : 'DOWN'}, Response Time: ${result.responseTime}ms`);

                      // Update status and history using db functions
                      // Ensure result object structure matches what db functions expect
                      console.log(`[SCHEDULER] Attempting DB update for ${website.name} (ID: ${website.id})...`);
                      try {
                          await updateWebsiteStatus({ ...result, websiteId: website.id });
                          console.log(`[SCHEDULER] DB updateWebsiteStatus successful for ${website.name}`);
                          await insertCheckHistory({ ...result, websiteId: website.id });
                          console.log(`[SCHEDULER] DB insertCheckHistory successful for ${website.name}`);
                      } catch (dbError) {
                          console.error(`[SCHEDULER] DATABASE ERROR updating status/history for ${website.name} (ID: ${website.id}):`, dbError);
                          // Rethrow or handle as needed - rethrowing might be caught by the outer loop's catch
                          throw dbError; 
                      }
                      console.log(`[SCHEDULER] Check and DB update complete for ${website.name}. Status: ${result.isUp ? 'UP' : 'DOWN'}`);
                } else if (website.active !== true) {
                    // console.log(`[SCHEDULER] Skipping inactive website: ${website.name}`); // Uncomment if needed
                } else {
                    // console.log(`Skipping website (interval not met): ${website.name}`);
                }
            } catch (loopError) { // Renamed variable for clarity
                errorCount++;
                // Log the specific error encountered during the check or DB update for this website
                console.error(`[SCHEDULER] LOOP ERROR for website ${website.name} (ID: ${website.id}):`, loopError);
                // Optionally update status to indicate check failure?
                // Consider adding a try-catch here if you implement this fallback update
                // try {
                //   await updateWebsiteStatus({ websiteId: website.id, isUp: false, error_message: 'Scheduler check failed: ' + loopError.message, responseTime: null, statusCode: null });
                // } catch (fallbackError) {
                //   console.error(`[SCHEDULER] Fallback DB update failed for ${website.name}:`, fallbackError);
                // }
            }
        }
    } catch (fetchError) { // Renamed variable for clarity
        errorCount++;
        console.error('[SCHEDULER] FATAL ERROR fetching websites for monitoring loop:', fetchError);
    } finally {
        console.log(`[SCHEDULER] Finished website check cycle. Checked: ${checkedCount}, Errors: ${errorCount}`);
    }
};

// Removed startMonitoring, stopMonitoring, and interval logic

// Export only the function needed by the cron endpoint
module.exports = {
    checkWebsites
};
