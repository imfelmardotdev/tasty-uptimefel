/**
 * Migration to create initial users table.
 * Migration history table creation and record insertion are now handled by the runner.
 */
const UP_MIGRATION = `
-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const DOWN_MIGRATION = `
-- Drop users table
DROP TABLE IF EXISTS users;
`;

/**
 * @param {import('sqlite3').Database} db
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    // Use db.exec as it handles multiple statements if needed, though here it's one.
    return new Promise((resolve, reject) => {
        db.exec(UP_MIGRATION, (err) => {
            if (err) {
                console.error('Migration 001 (up) failed:', err);
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
                console.error('Migration 001 (down) failed:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

exports.MIGRATION_VERSION = '001';
