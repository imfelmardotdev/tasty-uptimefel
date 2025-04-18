/**
 * Migration to add website monitoring tables for PostgreSQL
 */
const UP_MIGRATION = `
-- Website Monitoring Table
CREATE TABLE IF NOT EXISTS monitored_websites (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    check_interval INTEGER DEFAULT 300,
    timeout_ms INTEGER DEFAULT 5000,
    retry_count INTEGER DEFAULT 1,
    accepted_status_codes TEXT DEFAULT '200-299',
    monitor_method TEXT DEFAULT 'GET',
    follow_redirects BOOLEAN DEFAULT TRUE, -- Use native BOOLEAN
    max_redirects INTEGER DEFAULT 5,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_website_user ON monitored_websites(user_id);

-- Monitoring History Table
CREATE TABLE IF NOT EXISTS monitoring_history (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    is_up BOOLEAN, -- Use native BOOLEAN
    error_type TEXT,
    error_message TEXT,
    redirect_count INTEGER DEFAULT 0,
    final_url TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE
);

-- Create indices for faster querying of history
CREATE INDEX IF NOT EXISTS idx_history_website ON monitoring_history(website_id);
CREATE INDEX IF NOT EXISTS idx_history_checked_at ON monitoring_history(checked_at);
CREATE INDEX IF NOT EXISTS idx_history_website_time ON monitoring_history(website_id, checked_at);

-- Website Status Table (current status)
CREATE TABLE IF NOT EXISTS website_status (
    website_id INTEGER PRIMARY KEY,
    last_check_time TIMESTAMP WITH TIME ZONE,
    last_status_code INTEGER,
    last_response_time INTEGER,
    is_up BOOLEAN, -- Use native BOOLEAN
    uptime_percentage REAL, -- REAL is generally fine, consider NUMERIC or DOUBLE PRECISION if needed
    last_error TEXT,
    total_checks INTEGER DEFAULT 0,
    total_successful_checks INTEGER DEFAULT 0,
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE
);
`;

const DOWN_MIGRATION = `
-- Drop tables and indices (Order matters due to foreign keys)
DROP TABLE IF EXISTS monitoring_history;
DROP TABLE IF EXISTS website_status;
DROP TABLE IF EXISTS monitored_websites; -- Drop this last
-- Indices are typically dropped automatically when the table is dropped
`;

/**
 * Applies the migration
 * @param {import('pg').PoolClient | import('pg').Pool} db - The pg Pool instance or a PoolClient for transactions
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    try {
        // Execute the multi-statement SQL. db.query handles this.
        await db.query(UP_MIGRATION);
    } catch (err) {
        console.error('Migration 002 (up) failed:', err);
        throw err;
    }
};

/**
 * Reverts the migration
 * @param {import('pg').PoolClient | import('pg').Pool} db - The pg Pool instance or a PoolClient for transactions
 * @returns {Promise<void>}
 */
exports.down = async (db) => {
    try {
        await db.query(DOWN_MIGRATION);
    } catch (err) {
        console.error('Migration 002 (down) failed:', err);
        throw err;
    }
};

exports.MIGRATION_VERSION = '002';
