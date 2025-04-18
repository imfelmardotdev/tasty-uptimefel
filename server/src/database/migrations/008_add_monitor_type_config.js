/**
 * Migration to add monitor_type and monitor_config columns for PostgreSQL
 */
const UP_MIGRATION = `
ALTER TABLE monitored_websites
ADD COLUMN monitor_type TEXT DEFAULT 'http',
ADD COLUMN monitor_config JSONB; -- Use JSONB for config
`;

const DOWN_MIGRATION = `
ALTER TABLE monitored_websites
DROP COLUMN IF EXISTS monitor_type,
DROP COLUMN IF EXISTS monitor_config;
`;

/**
 * Applies the migration
 * @param {import('pg').PoolClient | import('pg').Pool} db - The pg Pool instance or a PoolClient for transactions
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    try {
        // PostgreSQL can add multiple columns in one ALTER TABLE statement
        await db.query(UP_MIGRATION);
        console.log("Columns 'monitor_type' and 'monitor_config' added to monitored_websites.");
    } catch (err) {
        // Handle potential error if columns already exist (e.g., migration run partially before)
        // PostgreSQL error code for duplicate column is '42701'
        if (err.code === '42701') {
             console.warn("Migration 008 (up): Columns likely already exist.", err.message);
             // Potentially query information_schema to be absolutely sure, but often warning is enough.
        } else {
            console.error("Migration 008 (up) failed:", err);
            throw err;
        }
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
        console.log("Columns 'monitor_type' and 'monitor_config' dropped from monitored_websites.");
    } catch (err) {
        console.error("Migration 008 (down) failed:", err);
        throw err;
    }
};

exports.MIGRATION_VERSION = '008';
