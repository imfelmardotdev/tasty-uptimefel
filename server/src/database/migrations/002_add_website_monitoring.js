/**
 * Migration to add website monitoring tables
 */
const UP_MIGRATION = `
BEGIN TRANSACTION;

-- Website Monitoring Table
CREATE TABLE IF NOT EXISTS monitored_websites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    check_interval INTEGER DEFAULT 300,
    timeout_ms INTEGER DEFAULT 5000,
    retry_count INTEGER DEFAULT 1,
    accepted_status_codes TEXT DEFAULT '200-299',
    monitor_method TEXT DEFAULT 'GET',
    follow_redirects BOOLEAN DEFAULT 1,
    max_redirects INTEGER DEFAULT 5,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_website_user ON monitored_websites(user_id);

-- Monitoring History Table
CREATE TABLE IF NOT EXISTS monitoring_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    website_id INTEGER NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    is_up BOOLEAN,
    error_type TEXT,
    error_message TEXT,
    redirect_count INTEGER DEFAULT 0,
    final_url TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE
);

-- Create indices for faster querying of history
CREATE INDEX IF NOT EXISTS idx_history_website ON monitoring_history(website_id);
CREATE INDEX IF NOT EXISTS idx_history_checked_at ON monitoring_history(checked_at);
CREATE INDEX IF NOT EXISTS idx_history_website_time ON monitoring_history(website_id, checked_at);

-- Website Status Table (current status)
CREATE TABLE IF NOT EXISTS website_status (
    website_id INTEGER PRIMARY KEY,
    last_check_time DATETIME,
    last_status_code INTEGER,
    last_response_time INTEGER,
    is_up BOOLEAN,
    uptime_percentage REAL,
    last_error TEXT,
    total_checks INTEGER DEFAULT 0,
    total_successful_checks INTEGER DEFAULT 0,
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE
);

COMMIT;
`;

const DOWN_MIGRATION = `
BEGIN TRANSACTION;

-- Drop tables and indices
DROP TABLE IF EXISTS monitoring_history;
DROP TABLE IF EXISTS website_status;
DROP TABLE IF EXISTS monitored_websites;

COMMIT;
`;

/**
 * @param {import('sqlite3').Database} db
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    return new Promise((resolve, reject) => {
        db.exec(UP_MIGRATION, (err) => {
            if (err) {
                console.error('Migration 002 (up) failed:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

/**
 * @param {import('sqlite3').Database} db
 * @returns {Promise<void>}
 */
exports.down = async (db) => {
    return new Promise((resolve, reject) => {
        db.exec(DOWN_MIGRATION, (err) => {
            if (err) {
                console.error('Migration 002 (down) failed:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

exports.MIGRATION_VERSION = '002';
