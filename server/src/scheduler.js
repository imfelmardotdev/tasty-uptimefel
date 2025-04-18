// Removed: const Website = require('./models/Website'); - Not used directly here
const { performCheck } = require('./monitoring/checker');
const { getAllWebsites, updateWebsiteStatus, insertCheckHistory } = require('./database/db'); // Import db functions
const { getDatabase } = require('./database/init'); // Import getDatabase to get the pool

/**
 * Checks all active websites whose check interval has passed.
 */
const checkWebsites = async () => {
    console.log('[SCHEDULER] Starting website check cycle...');
    let checkedCount = 0;
    let errorCount = 0;
    let client; // Define client variable outside try block

    try {
        console.log('[SCHEDULER] Attempting to acquire database client...'); // Added log
        // Acquire a client connection from the pool
        client = await getDatabase().connect();
        console.log('[SCHEDULER] Database client acquired successfully.'); // Updated log

        console.log('[SCHEDULER] Attempting to get all websites...'); // Added log
        // Get all websites using the acquired client
        const websites = await getAllWebsites(client);
        console.log(`[SCHEDULER] Found ${websites.length} websites to potentially check.`);

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
                console.log(`[SCHEDULER] Evaluating website ${website.id}: Active=${website.active}, Time Since Last Check=${timeSinceLastCheck}ms, Interval=${intervalMs}ms`); // Added condition log
                if (website.active === true && timeSinceLastCheck >= intervalMs) {
                      console.log(`[SCHEDULER] Condition MET for website ${website.id}. Proceeding with check.`); // Added log
                      console.log(`Checking website: ${website.name} (${website.url}) - Interval: ${intervalMs}ms, Last Check: ${lastCheckTime.toISOString()}`);
                      checkedCount++;

                      // Perform the check
                      console.log(`[SCHEDULER] Performing check for ${website.name} (ID: ${website.id})...`);
                      const result = await performCheck(website); // performCheck needs to handle PG website object structure
                      console.log(`[SCHEDULER] Check performed for ${website.name}. Result: ${result.isUp ? 'UP' : 'DOWN'}, Response Time: ${result.responseTime}ms`);

                      // Update status and history using db functions
                      // Ensure result object structure matches what db functions expect
                      console.log(`[SCHEDULER] Attempting DB update for ${website.name} (ID: ${website.id}) using acquired client...`);
                      try {
                          // Pass the acquired client to the DB functions
                          await updateWebsiteStatus({ ...result, websiteId: website.id }, client);
                          console.log(`[SCHEDULER] DB updateWebsiteStatus successful for ${website.name}`);
                          await insertCheckHistory({ ...result, websiteId: website.id }, client);
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
        console.error('[SCHEDULER] FATAL ERROR during check cycle (before or during website fetch):', fetchError);
    } finally {
        // Ensure the client is always released back to the pool
        if (client) {
            try { // Add try-catch around release just in case
                client.release();
                console.log('[SCHEDULER] Database client released successfully.');
            } catch (releaseError) {
                console.error('[SCHEDULER] ERROR releasing database client:', releaseError);
            }
        } else {
            console.log('[SCHEDULER] No database client to release (was never acquired or error occurred before acquisition).'); // Added log
        }
        console.log(`[SCHEDULER] Finished website check cycle. Checked: ${checkedCount}, Errors: ${errorCount}`);
    }
};

// Removed startMonitoring, stopMonitoring, and interval logic

// Export only the function needed by the cron endpoint
module.exports = {
    checkWebsites
};
