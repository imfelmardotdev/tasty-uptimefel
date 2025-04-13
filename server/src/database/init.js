require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const MigrationRunner = require('./migration-runner');

const dbPath = process.env.DATABASE_PATH || './monitoring.db';
let db = null;

/**
 * Initializes the database and runs any pending migrations
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
    console.log('Initializing database...');

    // Run migrations first
    const migrationRunner = new MigrationRunner(dbPath);
    try {
        await migrationRunner.runMigrations();
        await migrationRunner.close();
        console.log('Database migrations completed.');
    } catch (error) {
        console.error('Database migration failed:', error);
        process.exit(1);
    }

    // Create the shared database connection
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
            process.exit(1);
        }
        console.log(`Connected to SQLite database at ${dbPath}`);
    });

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Handle connection errors
    db.on('error', (err) => {
        console.error('Database error:', err.message);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

module.exports = {
    initializeDatabase,
    getDatabase: () => db
};
