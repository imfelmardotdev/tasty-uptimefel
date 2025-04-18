require('dotenv').config();
const { Pool } = require('pg'); // Use pg Pool
// const MigrationRunner = require('./migration-runner'); // Migration runner needs refactoring for PG

// Use DATABASE_URL environment variable for connection string
const connectionString = process.env.DATABASE_URL;
let db = null; // This will hold the pg Pool instance

/**
 * Initializes the PostgreSQL database connection pool
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
    console.log('Initializing PostgreSQL database connection...');

    if (!connectionString) {
        console.error('DATABASE_URL environment variable is not set. Exiting.');
        process.exit(1);
    }

    // TODO: Refactor or replace MigrationRunner for PostgreSQL
    // console.log('Skipping migrations for now...');
    /*
    // Run migrations first (Needs refactoring for pg)
    const migrationRunner = new MigrationRunner(dbPath); // Needs adaptation for pg Pool
    try {
        await migrationRunner.runMigrations();
        await migrationRunner.close(); // Needs adaptation for pg Pool
        console.log('Database migrations completed.');
    } catch (error) {
        console.error('Database migration failed:', error);
        process.exit(1);
    }
    */

    // Create the shared database connection pool
    try {
        db = new Pool({
            connectionString: connectionString,
            // Add SSL configuration required by Supabase/most cloud providers
            ssl: {
              rejectUnauthorized: false // Set to false if using self-signed certs or having issues, but ideally configure CA certs
            }
        });

        // Test the connection
        const client = await db.connect();
        console.log('Successfully connected to PostgreSQL database.');
        client.release(); // Release the client back to the pool

    } catch (err) {
        console.error('Error connecting to PostgreSQL database:', err.message);
        process.exit(1);
    }

    // Pool handles errors internally, but you can add listeners if needed
    // db.on('error', (err, client) => {
    //     console.error('Unexpected error on idle client', err);
    //     process.exit(-1);
    // });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing PostgreSQL pool.');
    if (db) {
        try {
            await db.end(); // Close the pool
            console.log('PostgreSQL pool closed.');
            process.exit(0);
        } catch (err) {
            console.error('Error closing PostgreSQL pool:', err.message);
            process.exit(1);
        }
    } else {
        process.exit(0);
    }
});

module.exports = {
    initializeDatabase,
    /**
     * Gets the shared pg Pool instance
     * @returns {Pool} The pg Pool instance
     */
    getDatabase: () => {
        if (!db) {
            throw new Error('Database has not been initialized. Call initializeDatabase first.');
        }
        return db;
    }
};
