const axios = require('axios');

// Axios instance with timeout and redirect handling
const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout
  maxRedirects: 5, // Follow up to 5 redirects
  validateStatus: function (status) {
    // Consider any status code valid for the check, we record it anyway
    return status >= 100 && status < 600;
  },
});

/**
 * Performs an HTTP check on a website.
 * @param {object} website - The website object { id: number, url: string }
 * @returns {Promise<object>} - Promise resolving to { websiteId, statusCode, responseTimeMs, isUp }
 */
const performCheck = async (website) => {
  const startTime = Date.now();
  let statusCode = null;
  let responseTimeMs = null;
  let isUp = false;
  let errorMsg = null; // Optional: store error message

  try {
    const response = await axiosInstance.get(website.url, {
        headers: {
            // Add a user-agent to mimic a browser, some sites block default axios/script agents
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 UptimeFelMonitor/1.0'
        }
    });
    statusCode = response.status;
    // Basic check for success (2xx or 3xx usually indicate availability)
    isUp = statusCode >= 200 && statusCode < 400;
  } catch (error) {
    isUp = false;
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range specified by validateStatus (though we allow all here)
      // or other server-side issue.
      statusCode = error.response.status;
      errorMsg = `Server responded with status: ${statusCode}`;
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      errorMsg = 'No response received from server.';
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timed out.';
        statusCode = -1; // Indicate timeout specifically
      } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        errorMsg = 'DNS lookup failed.';
        statusCode = -2; // Indicate DNS error
      } else {
         statusCode = -3; // Indicate other connection error
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMsg = `Request setup error: ${error.message}`;
      statusCode = -4; // Indicate setup error
    }
    console.error(`Error checking ${website.url}: ${errorMsg}`);
  } finally {
    responseTimeMs = Date.now() - startTime;
  }

  return {
    websiteId: website.id,
    statusCode,
    responseTimeMs,
    isUp,
    // error: errorMsg // Optionally include error message in result
  };
};

module.exports = {
  performCheck,
};
