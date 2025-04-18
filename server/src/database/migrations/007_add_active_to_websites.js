/**
 * Migration to add 'active' column to monitored_websites for PostgreSQL
 */
const UP_MIGRATION = `
ALTER TABLE monitored_websites
ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;
`;

const DOWN_MIGRATION = `
ALTER TABLE monitored_websites
DROP COLUMN IF EXISTS active;
`;

/**
 * Applies the migration
 * @param {import('pg').PoolClient | import('pg').Pool} db - The pg Pool instance or a PoolClient for transactions
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    try {
        await db.query(UP_MIGRATION);
        console.log("Column 'active' added to monitored_websites with default TRUE.");
    } catch (err) {
        console.error("Migration 007 (up) failed:", err);
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
        console.log("Column 'active' dropped from monitored_websites.");
    } catch (err) {
        console.error("Migration 007 (down) failed:", err);
        // Log error but might not need to throw depending on desired rollback behavior
        throw err;
    }
};

exports.MIGRATION_VERSION = "007";
