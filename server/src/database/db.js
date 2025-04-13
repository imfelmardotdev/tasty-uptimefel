const { getDatabase } = require('./init');

/**
 * Finds a user by email
 * @param {string} email User email
 * @returns {Promise<object|null>} User object or null
 */
const findUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        getDatabase().get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
};

/**
 * Finds a user by ID
 * @param {number} id User ID
 * @returns {Promise<object|null>} User object or null
 */
const findUserById = (id) => {
    return new Promise((resolve, reject) => {
        getDatabase().get('SELECT id, email FROM users WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
};

/**
 * Creates a new user
 * @param {string} email User email
 * @param {string} passwordHash Hashed password
 * @returns {Promise<object>} Created user object
 */
const createUser = (email, passwordHash) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO users (email, password_hash) VALUES (?, ?)';
        getDatabase().run(sql, [email, passwordHash], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('UNIQUE constraint failed: users.email')) {
                    reject(new Error('Email already exists'));
                } else {
                    reject(err);
                }
            } else {
                resolve({ id: this.lastID, email });
            }
        });
    });
};

/**
 * Gets all websites from the database (regardless of user)
 * @returns {Promise<Array<object>>}
 */
const getAllWebsites = () => {
    return new Promise((resolve, reject) => {
        // Include 'active' column
        const sql = `
            SELECT w.*, ws.*
            FROM monitored_websites w
            LEFT JOIN website_status ws ON w.id = ws.website_id
            ORDER BY w.created_at DESC
        `;
        getDatabase().all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};

/**
 * Gets all websites for a specific user
 * @param {number} userId User ID
 * @returns {Promise<Array<object>>}
 */
const getAllWebsitesByUser = (userId) => {
    return new Promise((resolve, reject) => {
         // Include 'active' column
        const sql = `
            SELECT w.*, ws.*
            FROM monitored_websites w
            LEFT JOIN website_status ws ON w.id = ws.website_id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `;
        getDatabase().all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};


/**
 * Gets a website by ID, including status
 * @param {number} id Website ID
 * @returns {Promise<object|null>}
 */
const getWebsite = (id) => {
    return new Promise((resolve, reject) => {
        // Include 'active' column
        const sql = `
            SELECT w.*, ws.*
            FROM monitored_websites w
            LEFT JOIN website_status ws ON w.id = ws.website_id
            WHERE w.id = ?
        `;
        getDatabase().get(sql, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
};

/**
 * Creates a new website
 * @param {object} website Website configuration including user_id
 * @returns {Promise<object>} Created website with ID and status
 */
const createWebsite = (website) => {
    return new Promise((resolve, reject) => {
        // Add 'active' column to INSERT
        const sql = `
            INSERT INTO monitored_websites (
                name, url, check_interval, timeout_ms, retry_count,
                accepted_status_codes, monitor_method, follow_redirects,
                max_redirects, user_id, active 
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            website.name,
            website.url,
            website.check_interval || 300,
            website.timeout_ms || 5000,
            website.retry_count || 1,
            website.accepted_status_codes || '200-299',
            website.monitor_method || 'GET',
            website.follow_redirects !== undefined ? (website.follow_redirects ? 1 : 0) : 1,
            website.max_redirects || 5,
            website.user_id, // Ensure user_id is passed
            1 // Default active to 1 (true)
        ];

        getDatabase().run(sql, params, function(err) {
            if (err) reject(err);
            else {
                const newWebsiteId = this.lastID;
                // Initialize status after creating website
                const statusSql = 'INSERT INTO website_status (website_id) VALUES (?)';
                getDatabase().run(statusSql, [newWebsiteId], (statusErr) => {
                    if (statusErr) reject(statusErr);
                    // Fetch the newly created website with its initial status
                    else getWebsite(newWebsiteId).then(resolve).catch(reject); 
                });
            }
        });
    });
};

/**
 * Updates a website's configuration
 * @param {number} id Website ID
 * @param {object} website Updated configuration
 * @returns {Promise<object>} Updated website with status
 */
const updateWebsite = (id, website) => {
    return new Promise((resolve, reject) => {
        // Add 'active' column to UPDATE
        const sql = `
            UPDATE monitored_websites SET
                name = COALESCE(?, name),
                url = COALESCE(?, url),
                check_interval = COALESCE(?, check_interval),
                timeout_ms = COALESCE(?, timeout_ms),
                retry_count = COALESCE(?, retry_count),
                accepted_status_codes = COALESCE(?, accepted_status_codes),
                monitor_method = COALESCE(?, monitor_method),
                follow_redirects = COALESCE(?, follow_redirects),
                max_redirects = COALESCE(?, max_redirects),
                active = COALESCE(?, active), -- Add active field
                updated_at = DATETIME('now')
            WHERE id = ?
        `;

        const params = [
            website.name,
            website.url,
            website.check_interval,
            website.timeout_ms,
            website.retry_count,
            website.accepted_status_codes,
            website.monitor_method,
            website.follow_redirects !== undefined ? (website.follow_redirects ? 1 : 0) : undefined,
            website.max_redirects,
            website.active !== undefined ? (website.active ? 1 : 0) : undefined, // Handle active boolean
            id
        ];

        getDatabase().run(sql, params, (err) => {
            if (err) reject(err);
            // Fetch the updated website with its status
            else getWebsite(id).then(resolve).catch(reject); 
        });
    });
};

/**
 * Deletes a website and all its checks/status
 * @param {number} id Website ID
 * @returns {Promise<void>}
 */
const deleteWebsite = (id) => {
    // Note: Cascading delete should handle history and status
    return new Promise((resolve, reject) => {
        getDatabase().run('DELETE FROM monitored_websites WHERE id = ?', [id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

/**
 * Gets the latest check result for a website
 * @param {number} websiteId Website ID
 * @returns {Promise<object|null>}
 */
const getLatestCheck = (websiteId) => {
    return new Promise((resolve, reject) => {
        getDatabase().get(
            'SELECT * FROM monitoring_history WHERE website_id = ? ORDER BY checked_at DESC LIMIT 1',
            [websiteId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            }
        );
    });
};

/**
 * Inserts a new check result into monitoring_history
 * @param {object} check Check result including websiteId
 * @returns {Promise<void>}
 */
const insertCheckHistory = (check) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO monitoring_history (
                website_id, status_code, response_time_ms, is_up,
                error_type, error_message, redirect_count, final_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            check.websiteId, // Renamed from website_id for consistency
            check.statusCode, // Renamed from status_code
            check.responseTimeMs, // Renamed from response_time_ms
            check.isUp ? 1 : 0, // Renamed from is_up
            check.error_type || null,
            check.error_message || null,
            check.redirect_count || 0,
            check.final_url || null
        ];

        getDatabase().run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

/**
 * Updates the website_status table
 * @param {object} status Status update data including websiteId
 * @returns {Promise<void>}
 */
const updateWebsiteStatus = (status) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE website_status SET
                last_check_time = DATETIME('now'),
                last_status_code = ?,
                last_response_time = ?,
                is_up = ?,
                last_error = ?,
                total_checks = total_checks + 1,
                total_successful_checks = total_successful_checks + ?
                -- uptime_percentage calculation might be better done elsewhere or via trigger
            WHERE website_id = ?
        `;

        const params = [
            status.statusCode, // Renamed from status_code
            status.responseTimeMs, // Renamed from response_time_ms
            status.isUp ? 1 : 0, // Renamed from is_up
            status.error_message || null,
            status.isUp ? 1 : 0,
            status.websiteId // Renamed from website_id
        ];

        getDatabase().run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

/**
 * Gets monitoring history for a website
 * @param {number} websiteId Website ID
 * @param {object} options Query options (limit, offset)
 * @returns {Promise<Array<object>>} History records
 */
const getWebsiteHistory = (websiteId, options = {}) => {
     return new Promise((resolve, reject) => {
         const sql = `
             SELECT *
             FROM monitoring_history
             WHERE website_id = ?
             ORDER BY checked_at DESC
             LIMIT ? OFFSET ?
         `;
         const limit = options.limit || 100;
         const offset = options.offset || 0;
         getDatabase().all(sql, [websiteId, limit, offset], (err, rows) => {
             if (err) reject(err);
             else resolve(rows || []);
         });
     });
 };

module.exports = {
    findUserByEmail,
    findUserById,
    createUser,
    getAllWebsites,
    getAllWebsitesByUser, // Export new function
    getWebsite,
    createWebsite,
    updateWebsite,
    deleteWebsite,
    getLatestCheck,
    insertCheckHistory,
    updateWebsiteStatus,
    getWebsiteHistory // Export new function
};
