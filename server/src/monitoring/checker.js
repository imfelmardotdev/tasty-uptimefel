const axios = require('axios');
const UptimeCalculator = require('../services/UptimeCalculator');
 const { log } = require('../utils/logger');
 const dayjs = require('dayjs');
 const https = require('https');
 const tls = require('tls');
 const db = require('../database/db'); // Import database functions
 const { triggerWebhookAlert } = require('../alerting/webhook'); // Import alert function

// Monitor types
const MONITOR_HTTP = 'http';
const MONITOR_HTTPS = 'https';
const MONITOR_KEYWORD = 'keyword';

// Status constants
const UP = 1;
const DOWN = 0;
const PENDING = 2; // Maybe map certain errors to PENDING later?
const MAINTENANCE = 3; // Not handled by checker currently

/**
 * Creates an axios instance with configurable timeout and redirects
 * @param {object} website Website configuration
 * @returns {import('axios').AxiosInstance}
 */
const createAxiosInstance = (website) => {
    const config = {
        timeout: website.timeout_ms || 10000,
        maxRedirects: website.follow_redirects ? (website.max_redirects || 5) : 0,
        validateStatus: function (status) {
            return status >= 100 && status < 600;
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 UptimeFelMonitor/1.0'
        }
    };

    // For HTTPS monitoring, configure certificate validation
    if (website.monitor_type === MONITOR_HTTPS && website.monitor_config?.verifySSL === false) {
        config.httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
    }

    return axios.create(config);
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
    // Removed log: log.info(`[Checker - Debug] Running check for Monitor ID: ${website.id}, Type: ${website.monitorType}, URL: ${website.url}`);
    const maxRetries = website.retry_count || 1;
    const acceptedRanges = parseAcceptedStatuses(website.accepted_statuses);
    let lastError = null;
    let finalResult = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();
        try {
            const response = await axiosInstance.get(website.url);
               const { redirectCount, finalUrl } = getRedirectInfo(response, website.url);
   
               // Removed log: log.info(`[Checker - Got Response] Monitor ID: ${website.id}, Status Code: ${response.status}`);
   
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

             // *** Keyword Check Integration START ***
              // Use the monitorType alias here
              if (website.monitorType === MONITOR_KEYWORD && isStatusCodeAccepted(response.status, acceptedRanges)) {
                  // Removed log: log.info(`[Checker - Raw Monitor Config] Monitor ID: ${website.id}, Raw Config: ${website.monitor_config}`);
                  const keywordConfig = typeof website.monitor_config === 'string'
                     ? JSON.parse(website.monitor_config || '{}')
                    : (website.monitor_config || {});
                const keyword = keywordConfig?.keyword || '';
                 const invertKeyword = keywordConfig?.invertKeyword === true;
 
                 // Removed log: log.info(`[Checker - Keyword PreCheck] Monitor ID: ${website.id}, Status Code: ${response.status}, Accepted: ${isStatusCodeAccepted(response.status, acceptedRanges)}, Keyword Config: ${JSON.stringify(keywordConfig)}, Keyword Value: "${keyword}"`);
 
                  if (keyword) { // Only perform check if keyword is specified
                      // Removed log: log.info(`[Checker - Keyword Debug] Monitor ID: ${website.id}, Config String: ${website.monitor_config}`);
                      // Removed log: log.info(`[Checker - Keyword Debug] Monitor ID: ${website.id}, Parsed Config: ${JSON.stringify(keywordConfig)}`);
                      const keywordFound = checkKeyword(response.data, keywordConfig);
                      const expectedKeywordState = !invertKeyword; // True if we expect it to be found
  
                      // Removed log: log.info(`[Checker - Keyword Debug] Monitor ID: ${website.id}, Keyword: "${keyword}", Invert: ${invertKeyword}, Found: ${keywordFound}, Expected State: ${expectedKeywordState}`);
  
                      if (keywordFound === expectedKeywordState) {
                          // Keyword condition met, status is UP
                        result.isUp = true;
                        // Optionally refine the success message
                        result.error_message = `OK (${result.statusCode}), Keyword "${keyword}" check passed (found: ${keywordFound}, invert: ${invertKeyword})`;
                    } else {
                        // Keyword condition NOT met, status is DOWN
                        result.isUp = false;
                        result.error_type = 'KEYWORD_MISMATCH';
                        result.error_message = `Keyword "${keyword}" check failed (found: ${keywordFound}, invert: ${invertKeyword})`;
                        // Store this failed result and continue retries if applicable
                        finalResult = result;
                        // Throw an error to trigger retry or final failure reporting
                        throw new Error(result.error_message);
                    }
                } else {
                    // No keyword specified, treat as standard HTTP check
                    result.isUp = isStatusCodeAccepted(response.status, acceptedRanges);
                    if (!result.isUp) {
                         finalResult = result;
                         throw new Error(`Server responded with status: ${response.status}`);
                    }
                }
            } else {
                 // For non-keyword types or if initial status code check failed
                 result.isUp = isStatusCodeAccepted(response.status, acceptedRanges);
                 if (!result.isUp) {
                    finalResult = result;
                    throw new Error(`Server responded with status: ${response.status}`);
                 }
            }
            // *** Keyword Check Integration END ***


            // If we reach here, the check (including keyword if applicable) was successful
            return result;


        } catch (error) {
            // Handle errors from axios request OR thrown by keyword check failure
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
 * Checks SSL certificate details
 * @param {string} hostname The hostname to check
 * @param {number} port The port to use
 * @returns {Promise<object>} Certificate details
 */
const checkCertificate = (hostname, port = 443) => {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(
            {
                host: hostname,
                port: port,
                servername: hostname
            },
            () => {
                const cert = socket.getPeerCertificate();
                socket.end();
                resolve({
                    valid: socket.authorized,
                    expires: cert.valid_to,
                    issuer: cert.issuer.CN,
                    daysUntilExpiration: Math.ceil((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
                });
            }
        );

        socket.on('error', (error) => {
            reject(error);
        });
    });
};

/**
 * Performs keyword check in response body
 * @param {string} body Response body
 * @param {object} config Keyword configuration
 * @returns {boolean} Whether keyword was found according to config (respecting case sensitivity)
 */
const checkKeyword = (body, config) => {
    const keyword = config?.keyword || '';
    const caseSensitive = config?.caseSensitive === true; // Default to case-insensitive unless explicitly true

    if (!keyword) {
        return true; // No keyword specified means pass
    }

    if (caseSensitive) {
        // Ensure body is a string before calling includes
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        return bodyString.includes(keyword);
    } else {
        // Ensure body is a string before calling toLowerCase
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        return bodyString.toLowerCase().includes(keyword.toLowerCase());
    }
};


/**
 * Performs a website check with the given configuration
 * @param {object} website The website configuration object
 * @returns {Promise<object>} Check result
 */
 const performCheck = async (website) => {
     // --- Get previous status BEFORE performing the check ---
     let previousStatus = null;
     try {
         // We need the full website object including status from the DB
         // Use the existing db.getWebsite function which includes status
         const currentWebsiteState = await db.getWebsite(website.id);
         if (currentWebsiteState) {
             previousStatus = currentWebsiteState.is_up; // is_up is boolean in PG
         }
         log.debug(`[Checker] Previous status for monitor ${website.id}: ${previousStatus}`);
     } catch (dbError) {
         log.error(`[Checker] Failed to get previous status for monitor ${website.id}:`, dbError);
         // Continue check, but alerting might be based on null previousStatus
     }
     // --- End Get previous status ---
 
     const axiosInstance = createAxiosInstance(website);
     let checkResult = await performCheckWithRetries(website, axiosInstance);

    // Additional checks for HTTPS certificate (Keyword check is now integrated into performCheckWithRetries)
    if (website.monitor_type === MONITOR_HTTPS && checkResult.isUp) {
        try {
            const url = new URL(website.url);
            const certInfo = await checkCertificate(url.hostname);
            checkResult.certInfo = certInfo;

            // Update isUp based on certificate validity and expiration threshold
            if (!certInfo.valid) {
                checkResult.isUp = false; // Mark as down if cert is invalid
                checkResult.error_type = 'SSL_INVALID';
                checkResult.error_message = 'Invalid SSL certificate';
            } else if (website.monitor_config?.expiryThreshold &&
                       certInfo.daysUntilExpiration <= website.monitor_config.expiryThreshold) {
                checkResult.isUp = false; // Mark as down if cert is expiring soon
                checkResult.error_type = 'SSL_EXPIRING';
                checkResult.error_message = `Certificate expires in ${certInfo.daysUntilExpiration} days (threshold: ${website.monitor_config.expiryThreshold})`;
            }
            // If cert is valid and not expiring soon, isUp remains as determined by performCheckWithRetries

        } catch (error) {
            // Handle errors during certificate check
            checkResult.isUp = false; // Mark as down if cert check fails
            checkResult.error_type = 'SSL_ERROR';
            checkResult.error_message = `SSL check failed: ${error.message}`;
            log.error(`[Checker] SSL check failed for ${website.url}:`, error);
        }
    }

    // Update UptimeCalculator
    try {
        const calculator = await UptimeCalculator.getUptimeCalculator(website.id);
        const status = checkResult.isUp ? UP : DOWN;

        const heartbeatData = {
            status: status,
            ping: checkResult.responseTimeMs,
            message: checkResult.error_message || (checkResult.isUp ? `OK (${checkResult.statusCode})` : `Error (${checkResult.statusCode})`),
            timestamp: dayjs(),
        };

        await calculator.update(heartbeatData);
        log.debug(`[Checker] Updated stats for monitor ${website.id}`);
    } catch (error) {
         log.error(`[Checker] Failed to update UptimeCalculator for monitor ${website.id}:`, error);
     }
 
     // --- Trigger Alert on Status Change ---
     // Compare the current check result status with the status before the check
     if (previousStatus !== null && typeof checkResult.isUp === 'boolean' && checkResult.isUp !== previousStatus) {
         log.info(`[Checker] Status change detected for monitor ${website.id}: ${previousStatus} -> ${checkResult.isUp}. Triggering alert.`);
         // Use await here because triggerWebhookAlert is async
         // Pass the original website object (contains name etc.), the check result, and the previous status
         await triggerWebhookAlert(website, checkResult, previousStatus);
     } else if (previousStatus === null) {
         log.debug(`[Checker] Skipping alert for monitor ${website.id} on initial check (previous status was null).`);
     } else {
          log.debug(`[Checker] No status change detected for monitor ${website.id}. Current status: ${checkResult.isUp}`);
     }
     // --- End Trigger Alert ---
 
     return checkResult;
 };

module.exports = {
    performCheck,
};
