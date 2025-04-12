const cron = require('node-cron');
const db = require('./database/db');
const { performCheck } = require('./monitoring/checker');
const { triggerWebhookAlert } = require('./alerting/webhook');

// Schedule to run every 10 minutes
const scheduleCheck = () => {
  console.log('Scheduler started. Checks will run every 10 minutes.');
  cron.schedule('*/10 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled checks...`);
    try {
      const websites = await db.getAllWebsites();
      console.log(`Found ${websites.length} website(s) to check.`);

      if (websites.length === 0) {
        console.log('No websites configured. Skipping checks.');
        return;
      }

      // Process checks sequentially for now to avoid overwhelming DB connections
      // Can be parallelized later with connection pooling or Promise.allSettled
      for (const website of websites) {
        console.log(`Checking ${website.name || website.url}...`);
        const latestCheck = await db.getLatestCheck(website.id);
        const previousStatus = latestCheck ? latestCheck.is_up : null; // null if no previous check

        const checkResult = await performCheck(website);
        await db.insertCheck(
          checkResult.websiteId,
          checkResult.statusCode,
          checkResult.responseTimeMs,
          checkResult.isUp
        );
        console.log(`Check complete for ${website.url}. Status: ${checkResult.isUp ? 'UP' : 'DOWN'}, Code: ${checkResult.statusCode}, Time: ${checkResult.responseTimeMs}ms`);

        // Check for status change and trigger alert if needed
        if (previousStatus !== null && previousStatus !== checkResult.isUp) {
          console.log(`Status change detected for ${website.url}!`);
          await triggerWebhookAlert(website, checkResult, previousStatus);
        } else if (previousStatus === null) {
            console.log(`First check for ${website.url}, initial status: ${checkResult.isUp ? 'UP' : 'DOWN'}`);
            // Optionally trigger an alert on the first check result?
            // await triggerWebhookAlert(website, checkResult, previousStatus);
        }
      }
      console.log('Scheduled checks finished.');

    } catch (error) {
      console.error('Error during scheduled checks:', error);
    }
  });
};

module.exports = {
  scheduleCheck,
};
