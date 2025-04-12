/**
 * Placeholder function to simulate sending a webhook alert.
 * @param {object} website - The website object { id, url, name }
 * @param {object} checkResult - The check result object { statusCode, isUp, responseTimeMs }
 * @param {boolean} previousStatus - The previous 'is_up' status (true or false)
 */
const triggerWebhookAlert = async (website, checkResult, previousStatus) => {
  const currentStatus = checkResult.isUp ? 'UP' : 'DOWN';
  const previousStatusText = previousStatus === null ? 'UNKNOWN' : (previousStatus ? 'UP' : 'DOWN'); // Handle initial check case

  console.log(`--- ALERT ---`);
  console.log(`Website: ${website.name || website.url} (ID: ${website.id})`);
  console.log(`Status Change: ${previousStatusText} -> ${currentStatus}`);
  console.log(`Details: Status Code=${checkResult.statusCode}, Response Time=${checkResult.responseTimeMs}ms`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`(Webhook sending logic would go here)`);
  console.log(`-------------`);

  // TODO: Implement actual webhook sending logic here
  // 1. Fetch webhook configuration for the website (e.g., from a new DB table or config file)
  // 2. Construct the payload (JSON)
  // 3. Use axios or node-fetch to send a POST request to the configured webhook URL(s)
  // 4. Handle potential errors during sending
};

module.exports = {
  triggerWebhookAlert,
};
