/**
 * Migration to add stat_daily table for PostgreSQL
 */
const UP_MIGRATION = `
-- Create stat_daily table
CREATE TABLE IF NOT EXISTS stat_daily (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- Start of the day (UTC)
    up_count INTEGER NOT NULL DEFAULT 0,
    down_count INTEGER NOT NULL DEFAULT 0,
    maintenance_count INTEGER NOT NULL DEFAULT 0,
    avg_ping REAL, -- Or DOUBLE PRECISION
    min_ping INTEGER,
    max_ping INTEGER,
    extras JSONB, -- Use JSONB for efficient JSON storage in PostgreSQL
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE, -- Removed ON UPDATE CASCADE
    UNIQUE (website_id, timestamp) -- Prevent duplicate entries
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_stat_daily_website_id_timestamp ON stat_daily (website_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stat_daily_timestamp ON stat_daily (timestamp);
`;

const DOWN_MIGRATION = `
-- Drop stat_daily table
DROP TABLE IF EXISTS stat_daily;
`;

/**
 * Applies the migration
 * @param {import('pg').PoolClient | import('pg').Pool} db - The pg Pool instance or a PoolClient for transactions
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    try {
        const statements = UP_MIGRATION.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const statement of statements) {
            await db.query(statement);
        }
    } catch (err) {
        console.error('Migration 006 (up) failed:', err);
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
        console.error('Migration 006 (down) failed:', err);
        throw err;
    }
};

exports.MIGRATION_VERSION = "006";
