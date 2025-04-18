const { getDatabase } = require('./init'); // Gets the pg Pool instance

// Helper function to map SQLite boolean (1/0) to JS boolean
const toBoolean = (value) => value === 1 || value === true;

/**
 * Finds a user by email
 * @param {string} email User email
 * @returns {Promise<object|null>} User object or null
 */
const findUserByEmail = async (email) => {
    const sql = 'SELECT * FROM users WHERE email = $1';
    try {
        const result = await getDatabase().query(sql, [email]);
        return result.rows[0] || null;
    } catch (err) {
        console.error(`Error finding user by email (${email}):`, err);
        throw err; // Re-throw error for controller to handle
    }
};

/**
 * Finds a user by ID
 * @param {number} id User ID
 * @returns {Promise<object|null>} User object or null
 */
const findUserById = async (id) => {
    const sql = 'SELECT id, email FROM users WHERE id = $1';
    try {
        const result = await getDatabase().query(sql, [id]);
        return result.rows[0] || null;
    } catch (err) {
        console.error(`Error finding user by id (${id}):`, err);
        throw err;
    }
};

/**
 * Creates a new user
 * @param {string} email User email
 * @param {string} passwordHash Hashed password
 * @returns {Promise<object>} Created user object { id, email }
 */
const createUser = async (email, passwordHash) => {
    // Use RETURNING id to get the new user's ID
    const sql = 'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id';
    try {
        const result = await getDatabase().query(sql, [email, passwordHash]);
        if (result.rows.length > 0) {
            return { id: result.rows[0].id, email };
        } else {
            throw new Error('User creation failed, no ID returned.');
        }
    } catch (err) {
        // Check for PostgreSQL unique violation error code '23505'
        if (err.code === '23505' && err.constraint === 'users_email_key') { // Assuming constraint name is users_email_key
             throw new Error('Email already exists');
        } else {
            console.error(`Error creating user (${email}):`, err);
            throw err;
        }
    }
};

/**
 * Gets all websites from the database (regardless of user)
 * @returns {Promise<Array<object>>}
 */
 const getAllWebsites = async () => {
     // Adjusted SQL for PostgreSQL - alias columns explicitly if needed
     // Assuming table/column names are compatible or adjusted in migrations
     const sql = `
         SELECT
             w.id, w.name, w.url, w.check_interval, w.timeout_ms, w.retry_count,
             w.accepted_status_codes, w.monitor_method, w.follow_redirects,
             w.max_redirects, w.user_id, w.active, w.monitor_type as "monitorType", -- Quoted alias
             w.monitor_config,
             w.created_at, w.updated_at,
             ws.last_check_time, ws.last_status_code, ws.last_response_time,
             ws.is_up, ws.last_error, ws.total_checks, ws.total_successful_checks
         FROM monitored_websites w
         LEFT JOIN website_status ws ON w.id = ws.website_id
         ORDER BY w.created_at DESC
     `;
     try {
         const result = await getDatabase().query(sql);
         // Map boolean fields if necessary (assuming 'active', 'is_up', 'follow_redirects' are boolean in PG)
         return result.rows.map(row => ({
             ...row,
             // follow_redirects: toBoolean(row.follow_redirects), // Example if needed
             // active: toBoolean(row.active),
             // is_up: toBoolean(row.is_up)
         })) || [];
     } catch (err) {
         console.error('Error getting all websites:', err);
         throw err;
     }
 };

/**
 * Gets all websites for a specific user
 * @param {number} userId User ID
 * @returns {Promise<Array<object>>}
 */
const getAllWebsitesByUser = async (userId) => {
    const sql = `
        SELECT
            w.id, w.name, w.url, w.check_interval, w.timeout_ms, w.retry_count,
            w.accepted_status_codes, w.monitor_method, w.follow_redirects,
            w.max_redirects, w.user_id, w.active, w.monitor_type as "monitorType", -- Quoted alias
            w.monitor_config, w.created_at, w.updated_at,
            ws.last_check_time, ws.last_status_code, ws.last_response_time,
            ws.is_up, ws.last_error, ws.total_checks, ws.total_successful_checks
        FROM monitored_websites w
        LEFT JOIN website_status ws ON w.id = ws.website_id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
    `;
    try {
        const result = await getDatabase().query(sql, [userId]);
         // Map boolean fields if necessary
         return result.rows.map(row => ({
             ...row,
             // follow_redirects: toBoolean(row.follow_redirects),
             // active: toBoolean(row.active),
             // is_up: toBoolean(row.is_up)
         })) || [];
    } catch (err) {
        console.error(`Error getting websites for user (${userId}):`, err);
        throw err;
    }
};


/**
 * Gets a website by ID, including status
 * @param {number} id Website ID
 * @returns {Promise<object|null>}
 */
 const getWebsite = async (id) => {
     const sql = `
         SELECT
             w.id, w.name, w.url, w.check_interval, w.timeout_ms, w.retry_count,
             w.accepted_status_codes, w.monitor_method, w.follow_redirects,
             w.max_redirects, w.user_id, w.active, w.monitor_type as "monitorType", -- Quoted alias
             w.monitor_config,
             w.created_at, w.updated_at,
             ws.last_check_time, ws.last_status_code, ws.last_response_time,
             ws.is_up, ws.last_error, ws.total_checks, ws.total_successful_checks
         FROM monitored_websites w
         LEFT JOIN website_status ws ON w.id = ws.website_id
         WHERE w.id = $1
     `;
     try {
         const result = await getDatabase().query(sql, [id]);
         const row = result.rows[0];
         if (row) {
             // Map boolean fields if necessary
             return {
                 ...row,
                 // follow_redirects: toBoolean(row.follow_redirects),
                 // active: toBoolean(row.active),
                 // is_up: toBoolean(row.is_up)
             };
         }
         return null;
     } catch (err) {
         console.error(`Error getting website (${id}):`, err);
         throw err;
     }
 };

/**
 * Creates a new website and its initial status record
 * @param {object} website Website configuration including user_id
 * @returns {Promise<object>} Created website with ID and status
 */
const createWebsite = async (website) => {
    // Use RETURNING id to get the new website's ID
    const insertWebsiteSql = `
        INSERT INTO monitored_websites (
            name, url, check_interval, timeout_ms, retry_count,
            accepted_status_codes, monitor_method, follow_redirects,
            max_redirects, user_id, active, monitor_type, monitor_config
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
    `;

    // Prepare params, ensuring monitor_config is JSON string or null
    // Assuming boolean fields are handled correctly by pg driver
    const params = [
        website.name,
        website.url,
        website.check_interval || 300,
        website.timeout_ms || 5000,
        website.retry_count || 1,
        website.accepted_status_codes || '200-299',
        website.monitor_method || 'GET',
        website.follow_redirects !== undefined ? website.follow_redirects : true,
        website.max_redirects || 5,
        website.user_id,
        true, // Default active to true
        website.monitor_type || 'http',
        website.monitor_config ? JSON.stringify(website.monitor_config) : null // Store JSON as string or use JSONB type
    ];

    const client = await getDatabase().connect(); // Use a client for transaction-like behavior
    try {
        // Insert website
        const websiteResult = await client.query(insertWebsiteSql, params);
        const newWebsiteId = websiteResult.rows[0]?.id;

        if (!newWebsiteId) {
            throw new Error('Website creation failed, no ID returned.');
        }

        // Initialize status after creating website
        const statusSql = 'INSERT INTO website_status (website_id) VALUES ($1)';
        await client.query(statusSql, [newWebsiteId]);

        // Fetch the newly created website with its initial status (using the same client)
        const fetchSql = `
            SELECT
                w.id, w.name, w.url, w.check_interval, w.timeout_ms, w.retry_count,
                w.accepted_status_codes, w.monitor_method, w.follow_redirects,
                w.max_redirects, w.user_id, w.active, w.monitor_type as "monitorType",
                w.monitor_config, w.created_at, w.updated_at,
                ws.last_check_time, ws.last_status_code, ws.last_response_time,
                ws.is_up, ws.last_error, ws.total_checks, ws.total_successful_checks
            FROM monitored_websites w
            LEFT JOIN website_status ws ON w.id = ws.website_id
            WHERE w.id = $1
        `;
        const finalResult = await client.query(fetchSql, [newWebsiteId]);
        return finalResult.rows[0] || null; // Should exist

    } catch (err) {
        console.error(`Error creating website (${website.name}):`, err);
        throw err; // Re-throw for controller
    } finally {
        client.release(); // Release client back to pool
    }
};


/**
 * Updates a website's configuration
 * @param {number} id Website ID
 * @param {object} website Updated configuration
 * @returns {Promise<object>} Updated website with status
 */
const updateWebsite = async (id, website) => {
    // Build the SET clause dynamically to handle COALESCE-like behavior
    const fields = [];
    const params = [];
    let paramIndex = 1;

    // Add fields to update if they are provided in the 'website' object
    if (website.name !== undefined) { fields.push(`name = $${paramIndex++}`); params.push(website.name); }
    if (website.url !== undefined) { fields.push(`url = $${paramIndex++}`); params.push(website.url); }
    if (website.check_interval !== undefined) { fields.push(`check_interval = $${paramIndex++}`); params.push(website.check_interval); }
    if (website.timeout_ms !== undefined) { fields.push(`timeout_ms = $${paramIndex++}`); params.push(website.timeout_ms); }
    if (website.retry_count !== undefined) { fields.push(`retry_count = $${paramIndex++}`); params.push(website.retry_count); }
    if (website.accepted_status_codes !== undefined) { fields.push(`accepted_status_codes = $${paramIndex++}`); params.push(website.accepted_status_codes); }
    if (website.monitor_method !== undefined) { fields.push(`monitor_method = $${paramIndex++}`); params.push(website.monitor_method); }
    if (website.follow_redirects !== undefined) { fields.push(`follow_redirects = $${paramIndex++}`); params.push(website.follow_redirects); }
    if (website.max_redirects !== undefined) { fields.push(`max_redirects = $${paramIndex++}`); params.push(website.max_redirects); }
    if (website.active !== undefined) { fields.push(`active = $${paramIndex++}`); params.push(website.active); }
    if (website.monitor_type !== undefined) { fields.push(`monitor_type = $${paramIndex++}`); params.push(website.monitor_type); }
    if (website.monitor_config !== undefined) { // Update config directly
        fields.push(`monitor_config = $${paramIndex++}`);
        params.push(website.monitor_config ? JSON.stringify(website.monitor_config) : null);
    }

    if (fields.length === 0) {
        // Nothing to update, just fetch the current state
        return getWebsite(id);
    }

    // Add updated_at and the WHERE clause parameter
    fields.push(`updated_at = NOW()`);
    params.push(id); // Add the website ID for the WHERE clause

    const sql = `
        UPDATE monitored_websites SET
            ${fields.join(', ')}
        WHERE id = $${paramIndex}
    `;

    try {
        await getDatabase().query(sql, params);
        // Fetch the updated website with its status
        return getWebsite(id);
    } catch (err) {
        console.error(`Error updating website (${id}):`, err);
        throw err;
    }
};

/**
 * Deletes a website and all its checks/status (assuming CASCADE DELETE is set up in migrations)
 * @param {number} id Website ID
 * @returns {Promise<void>}
 */
const deleteWebsite = async (id) => {
    // Note: Assumes foreign keys have ON DELETE CASCADE
    const sql = 'DELETE FROM monitored_websites WHERE id = $1';
    try {
        await getDatabase().query(sql, [id]);
    } catch (err) {
        console.error(`Error deleting website (${id}):`, err);
        throw err;
    }
};

/**
 * Gets the latest check result for a website
 * @param {number} websiteId Website ID
 * @returns {Promise<object|null>}
 */
const getLatestCheck = async (websiteId) => {
    const sql = `
        SELECT * FROM monitoring_history
        WHERE website_id = $1
        ORDER BY checked_at DESC LIMIT 1
    `;
    try {
        const result = await getDatabase().query(sql, [websiteId]);
        return result.rows[0] || null;
    } catch (err) {
        console.error(`Error getting latest check for website (${websiteId}):`, err);
        throw err;
    }
};

/**
 * Inserts a new check result into monitoring_history
 * @param {object} check Check result including websiteId
 * @returns {Promise<void>}
 */
const insertCheckHistory = async (check) => {
    const sql = `
        INSERT INTO monitoring_history (
            website_id, status_code, response_time_ms, is_up,
            error_type, error_message, redirect_count, final_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const params = [
        check.websiteId,
        check.statusCode,
        check.responseTimeMs,
        check.isUp, // Assuming boolean
        check.error_type || null,
        check.error_message || null,
        check.redirect_count || 0,
        check.final_url || null
    ];

    try {
        await getDatabase().query(sql, params);
    } catch (err) {
        console.error(`Error inserting check history for website (${check.websiteId}):`, err);
        throw err;
    }
};

/**
 * Updates the website_status table
 * @param {object} status Status update data including websiteId
 * @returns {Promise<void>}
 */
const updateWebsiteStatus = async (status) => {
    const sql = `
        UPDATE website_status SET
            last_check_time = NOW(),
            last_status_code = $1,
            last_response_time = $2,
            is_up = $3,
            last_error = $4,
            total_checks = total_checks + 1,
            total_successful_checks = total_successful_checks + $5
        WHERE website_id = $6
    `;

    const params = [
        status.statusCode,
        status.responseTimeMs,
        status.isUp, // Assuming boolean
        status.error_message || null,
        status.isUp ? 1 : 0, // Increment successful checks only if up
        status.websiteId
    ];

    try {
        await getDatabase().query(sql, params);
    } catch (err) {
        console.error(`Error updating website status for website (${status.websiteId}):`, err);
        throw err;
    }
};

/**
 * Gets monitoring history for a website
 * @param {number} websiteId Website ID
 * @param {object} options Query options (limit, offset)
 * @returns {Promise<Array<object>>} History records
 */
const getWebsiteHistory = async (websiteId, options = {}) => {
     const sql = `
         SELECT *
         FROM monitoring_history
         WHERE website_id = $1
         ORDER BY checked_at DESC
         LIMIT $2 OFFSET $3
     `;
     const limit = options.limit || 100;
     const offset = options.offset || 0;
     try {
         const result = await getDatabase().query(sql, [websiteId, limit, offset]);
         return result.rows || [];
     } catch (err) {
         console.error(`Error getting website history for website (${websiteId}):`, err);
         throw err;
     }
 };

module.exports = {
    findUserByEmail,
    findUserById,
    createUser,
    getAllWebsites,
    getAllWebsitesByUser,
    getWebsite,
    createWebsite,
    updateWebsite,
    deleteWebsite,
    getLatestCheck,
    insertCheckHistory,
    updateWebsiteStatus,
    getWebsiteHistory
};
