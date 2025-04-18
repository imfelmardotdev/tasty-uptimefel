/**
 * Migration to add stat_minutely table for PostgreSQL
 */
const UP_MIGRATION = `
-- Create stat_minutely table
CREATE TABLE IF NOT EXISTS stat_minutely (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL,
    -- Store timestamp as TIMESTAMP WITH TIME ZONE for clarity, though INTEGER Unix timestamp also works
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_stat_minutely_website_id_timestamp ON stat_minutely (website_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_stat_minutely_timestamp ON stat_minutely (timestamp);
`;

const DOWN_MIGRATION = `
-- Drop stat_minutely table
DROP TABLE IF EXISTS stat_minutely;
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
        console.error('Migration 004 (up) failed:', err);
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
        console.error('Migration 004 (down) failed:', err);
        throw err;
    }
};

exports.MIGRATION_VERSION = "004";
