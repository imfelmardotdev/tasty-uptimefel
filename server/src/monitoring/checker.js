const axios = require('axios');
const UptimeCalculator = require('../services/UptimeCalculator');
const { log } = require('../utils/logger'); // Assuming logger exists
const dayjs = require('dayjs'); // Needed for timestamp

// Status constants (ensure these align with UptimeCalculator and Heartbeat model)
const UP = 1;
const DOWN = 0;
const PENDING = 2; // Maybe map certain errors to PENDING later?
const MAINTENANCE = 3; // Not handled by checker currently

/**
 * Creates an axios instance with configurable timeout and redirects
 * @param {object} config Website configuration
 * @returns {import('axios').AxiosInstance}
 */
const createAxiosInstance = (config) => {
    return axios.create({
        timeout: config.timeout_ms || 10000,
        maxRedirects: config.follow_redirects ? (config.max_redirects || 5) : 0,
        validateStatus: function (status) {
            // Consider any status code valid for the check, we record it anyway
            return status >= 100 && status < 600;
        },
        headers: {
            // Add a user-agent to mimic a browser, some sites block default axios/script agents
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 UptimeFelMonitor/1.0'
        }
    });
};

/**
 * Parses the accepted status codes string into ranges
 * @param {string} acceptedStatuses Format: "200-299,300-399,401"
 * @returns {Array<{start: number, end: number}>}
 */
const parseAcceptedStatuses = (acceptedStatuses) => {
    const ranges = [];
    const defaultRange = { start: 200, end: 399 }; // Default if not specified

    if (!acceptedStatuses) {
        return [defaultRange];
    }

    acceptedStatuses.split(',').forEach(range => {
        const parts = range.trim().split('-');
        if (parts.length === 2) {
            ranges.push({
                start: parseInt(parts[0]),
                end: parseInt(parts[1])
            });
        } else if (parts.length === 1) {
            const status = parseInt(parts[0]);
            ranges.push({
                start: status,
                end: status
            });
        }
    });

    return ranges.length > 0 ? ranges : [defaultRange];
};

/**
 * Checks if a status code is within accepted ranges
 * @param {number} statusCode 
 * @param {Array<{start: number, end: number}>} acceptedRanges 
 * @returns {boolean}
 */
const isStatusCodeAccepted = (statusCode, acceptedRanges) => {
    return acceptedRanges.some(range => 
        statusCode >= range.start && statusCode <= range.end
    );
};

/**
 * Gets the redirect count from an axios response
 * @param {import('axios').AxiosResponse} response 
 * @param {string} originalUrl 
 * @returns {{redirectCount: number, finalUrl: string}}
 */
const getRedirectInfo = (response, originalUrl) => {
    let redirectCount = 0;
    let finalUrl = originalUrl;

    // Check if there was any redirection
    if (response.request) {
        // Get the final URL after all redirects
        if (response.request.res && response.request.res.responseUrl) {
            finalUrl = response.request.res.responseUrl;
        }

        // Count redirects by comparing final and original URLs
        if (finalUrl !== originalUrl) {
            // Check if we can get the exact count
            if (response.request.res && response.request.res.req && response.request.res.req._redirectable) {
                redirectCount = response.request.res.req._redirectable._redirectCount || 1;
            } else {
                // If we can't get the exact count, at least we know there was one
                redirectCount = 1;
            }
        }
    }

    return { redirectCount, finalUrl };
};

/**
 * Performs a check with retries
 * @param {object} website Website configuration
 * @param {import('axios').AxiosInstance} axiosInstance 
 * @returns {Promise<object>} Check result
 */
const performCheckWithRetries = async (website, axiosInstance) => {
    const maxRetries = website.retry_count || 1;
    const acceptedRanges = parseAcceptedStatuses(website.accepted_statuses);
    let lastError = null;
    let finalResult = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();
        try {
            const response = await axiosInstance.get(website.url);
            const { redirectCount, finalUrl } = getRedirectInfo(response, website.url);

            const result = {
                websiteId: website.id,
                statusCode: response.status,
                responseTimeMs: Date.now() - startTime,
                isUp: isStatusCodeAccepted(response.status, acceptedRanges),
                retry_count: attempt,
                final_url: finalUrl,
                headers: JSON.stringify(response.headers),
                redirect_count: redirectCount,
                error_type: null,
                error_message: null
            };

            // If the check is successful, return immediately
            if (result.isUp) {
                return result;
            }

            // Store the result for potential use if all retries fail
            finalResult = result;

        } catch (error) {
            lastError = error;
            const errorResult = {
                websiteId: website.id,
                responseTimeMs: Date.now() - startTime,
                retry_count: attempt,
                isUp: false,
                final_url: null,
                headers: null,
                redirect_count: 0
            };

            if (error.response) {
                errorResult.statusCode = error.response.status;
                errorResult.error_type = 'STATUS_ERROR';
                errorResult.error_message = `Server responded with status: ${error.response.status}`;
                errorResult.headers = JSON.stringify(error.response.headers);
            } else if (error.request) {
                if (error.code === 'ECONNABORTED') {
                    errorResult.statusCode = -1;
                    errorResult.error_type = 'TIMEOUT';
                    errorResult.error_message = 'Request timed out';
                } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
                    errorResult.statusCode = -2;
                    errorResult.error_type = 'DNS_ERROR';
                    errorResult.error_message = 'DNS lookup failed';
                } else {
                    errorResult.statusCode = -3;
                    errorResult.error_type = 'CONNECTION_ERROR';
                    errorResult.error_message = 'Connection failed';
                }
            } else {
                errorResult.statusCode = -4;
                errorResult.error_type = 'REQUEST_ERROR';
                errorResult.error_message = `Request setup error: ${error.message}`;
            }

            finalResult = errorResult;
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between retries
        }
    }

    return finalResult;
};

/**
 * Performs a website check with the given configuration
 * @param {object} website The website configuration object
 * @returns {Promise<object>} Check result
 */
const performCheck = async (website) => {
    const axiosInstance = createAxiosInstance(website);
    const checkResult = await performCheckWithRetries(website, axiosInstance);

    // --- Integrate UptimeCalculator ---
    try {
        const calculator = await UptimeCalculator.getUptimeCalculator(website.id);

        // Determine status code for UptimeCalculator
        // Simple mapping for now: isUp -> UP, !isUp -> DOWN
        // Could be enhanced to map specific errors to PENDING if needed
        const status = checkResult.isUp ? UP : DOWN;

        const heartbeatData = {
            status: status,
            ping: checkResult.responseTimeMs,
            message: checkResult.error_message || (checkResult.isUp ? `OK (${checkResult.statusCode})` : `Error (${checkResult.statusCode})`),
            timestamp: dayjs(), // Use current time for the heartbeat record
        };

        await calculator.update(heartbeatData);
        log.debug(`[Checker] Updated stats for monitor ${website.id}`);

    } catch (error) {
        log.error(`[Checker] Failed to update UptimeCalculator for monitor ${website.id}:`, error);
        // Decide if you want to re-throw or just log the error.
        // Logging might be sufficient as the primary check result is still returned.
    }
    // --- End Integration ---

    // Return the original check result (status code, response time, etc.)
    // The UptimeCalculator update happens as a side effect.
    return checkResult;
};

module.exports = {
    performCheck,
};
