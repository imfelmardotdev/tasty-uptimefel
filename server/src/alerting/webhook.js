const axios = require('axios');
const { getNotificationSettings } = require('../database/db'); // Import DB function

/**
 * Sends a webhook alert if configured and enabled.
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
  console.log(`-------------`);

  // --- Actual Webhook Sending Logic ---
  try {
    const settings = await getNotificationSettings();

    if (settings && settings.webhook_enabled && settings.webhook_url) {
      const webhookUrl = settings.webhook_url;
      const payload = {
        website: {
          id: website.id,
          name: website.name,
          url: website.url,
        },
        statusChange: {
          from: previousStatusText,
          to: currentStatus,
        },
        checkResult: {
          statusCode: checkResult.statusCode,
          responseTimeMs: checkResult.responseTimeMs,
          isUp: checkResult.isUp,
          error: checkResult.error_message || null, // Include error if present
        },
        timestamp: new Date().toISOString(),
      };

      console.log(`Sending webhook to: ${webhookUrl}`);
      await axios.post(webhookUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10 second timeout
      });
      console.log(`Webhook sent successfully for website ID: ${website.id}`);

    } else {
      console.log(`Webhook notifications are disabled or URL is not configured. Skipping send for website ID: ${website.id}`);
    }
  } catch (error) {
      console.error(`Error sending webhook for website ID ${website.id}:`, error.message);
      if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Webhook Error Response Data:', error.response.data);
          console.error('Webhook Error Response Status:', error.response.status);
          console.error('Webhook Error Response Headers:', error.response.headers);
      } else if (error.request) {
          // The request was made but no response was received
          console.error('Webhook Error Request:', error.request);
      } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Webhook Error Message:', error.message);
      }
  }
  // --- End Webhook Sending Logic ---
};

module.exports = {
  triggerWebhookAlert,
};
