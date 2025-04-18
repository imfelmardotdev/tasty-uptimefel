/**
 * Migration to create initial users table for PostgreSQL.
 */
const UP_MIGRATION = `
-- Create users table (if not exists) for PostgreSQL
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- Use SERIAL for auto-incrementing integer
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Use TIMESTAMP WITH TIME ZONE
);
`;

const DOWN_MIGRATION = `
-- Drop users table
DROP TABLE IF EXISTS users;
`;

/**
 * Applies the migration
 * @param {import('pg').PoolClient | import('pg').Pool} db - The pg Pool instance or a PoolClient for transactions
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    try {
        await db.query(UP_MIGRATION);
    } catch (err) {
        console.error('Migration 001 (up) failed:', err);
        throw err; // Re-throw error to be caught by the runner
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
        console.error('Migration 001 (down) failed:', err);
        throw err; // Re-throw error to be caught by the runner
    }
};

exports.MIGRATION_VERSION = '001';
