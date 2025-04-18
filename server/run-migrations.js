// server/run-migrations.js
require('dotenv').config(); // Load .env if you put the URL there
const { initializeDatabase, getDatabase } = require('./src/database/init');
const MigrationRunner = require('./src/database/migration-runner');

async function main() {
    try {
        console.log('Connecting to database...');
        // InitializeDatabase now just creates the pool
        await initializeDatabase();
        const pool = getDatabase(); // Get the pool

        console.log('Running migrations...');
        const migrationRunner = new MigrationRunner(pool); // Pass the pool
        await migrationRunner.runMigrations();

        console.log('Migrations finished successfully.');
        await pool.end(); // Close the pool
        process.exit(0);
    } catch (error) {
        console.error('Migration script failed:', error);
        // Attempt to close pool even on error
        try { await getDatabase()?.end(); } catch (e) { /* ignore */ }
        process.exit(1);
    }
}

main();
