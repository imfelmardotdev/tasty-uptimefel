/**
 * Migration to add heartbeats table for PostgreSQL
 */
const UP_MIGRATION = `
-- Create heartbeats table
CREATE TABLE IF NOT EXISTS heartbeats (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL, -- 0: DOWN, 1: UP, 2: PENDING, 3: MAINTENANCE
    ping INTEGER, -- Response time in ms
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE -- Removed ON UPDATE CASCADE for broader compatibility
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_heartbeats_website_id_timestamp ON heartbeats (website_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_heartbeats_timestamp ON heartbeats (timestamp);
`;

const DOWN_MIGRATION = `
-- Drop heartbeats table
DROP TABLE IF EXISTS heartbeats;
`;

/**
 * Applies the migration
 * @param {import('pg').PoolClient | import('pg').Pool} db - The pg Pool instance or a PoolClient for transactions
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    try {
        // pg driver can handle multiple statements separated by semicolons in one query call,
        // or we can execute them separately. Separate calls are often clearer.
        const statements = UP_MIGRATION.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const statement of statements) {
            await db.query(statement);
        }
    } catch (err) {
        console.error('Migration 003 (up) failed:', err);
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
        console.error('Migration 003 (down) failed:', err);
        throw err;
    }
};

exports.MIGRATION_VERSION = "003";
