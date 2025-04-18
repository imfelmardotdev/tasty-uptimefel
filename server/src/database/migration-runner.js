const path = require('path');
const fs = require('fs');
const { Pool } = require('pg'); // Import Pool type for type hinting (optional)

class MigrationRunner {
    /**
     * Creates a new MigrationRunner instance
     * @param {Pool} dbPool The shared pg Pool instance
     */
    constructor(dbPool) {
        if (!dbPool) {
            throw new Error("A pg Pool instance must be provided to MigrationRunner.");
        }
        this.db = dbPool; // Use the passed-in pool
        this.migrations = [];
        this.loadMigrations();
    }

    /**
     * Loads all migration files from the migrations directory
     */
    loadMigrations() {
        const migrationsDir = path.join(__dirname, 'migrations');

        if (!fs.existsSync(migrationsDir)) {
            console.log('No migrations directory found.');
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.js'))
            .sort((a, b) => a.localeCompare(b)); // Ensure correct sorting by filename

        this.migrations = files.map(file => {
            const migration = require(path.join(migrationsDir, file));
            migration.filename = file;
            // Ensure migration files export 'up', 'down', and 'MIGRATION_VERSION'
            // The 'up' and 'down' functions should now expect a pg Pool instance
            if (typeof migration.up !== 'function' || typeof migration.down !== 'function' || !migration.MIGRATION_VERSION) {
                throw new Error(`Invalid migration file structure: ${file}. Must export up, down, and MIGRATION_VERSION.`);
            }
            return migration;
        });
    }

    /**
     * Ensures the migration_history table exists.
     * @returns {Promise<void>}
     */
    async ensureHistoryTable() {
        // Use PostgreSQL syntax
        const sql = `
            CREATE TABLE IF NOT EXISTS migration_history (
                version TEXT PRIMARY KEY NOT NULL,
                filename TEXT NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        try {
            await this.db.query(sql);
        } catch (err) {
            throw new Error(`Failed to create migration_history table: ${err.message}`);
        }
    }

    /**
     * Gets the current database version from the history table.
     * @returns {Promise<string>} Current version or '000' if no migrations applied.
     */
    async getCurrentVersion() {
        const sql = `SELECT version FROM migration_history ORDER BY version DESC LIMIT 1`;
        try {
            const result = await this.db.query(sql);
            return result.rows[0]?.version || '000';
        } catch (err) {
            // Handle case where table might not exist yet (though ensureHistoryTable should prevent this)
            if (err.code === '42P01') { // 'undefined_table' error code in PostgreSQL
                console.warn('migration_history table not found, assuming version 000.');
                return '000';
            }
            throw new Error(`Failed to get current migration version: ${err.message}`);
        }
    }

    /**
     * Records a migration version in the history table.
     * @param {string} version Migration version (e.g., "001")
     * @param {string} filename Migration filename
     * @returns {Promise<void>}
     */
    async recordMigration(version, filename) {
         const sql = `INSERT INTO migration_history (version, filename) VALUES ($1, $2)`;
         try {
             await this.db.query(sql, [version, filename]);
         } catch (err) {
             throw new Error(`Failed to record migration ${version}: ${err.message}`);
         }
    }

     /**
     * Removes a migration version from the history table (used on rollback).
     * @param {string} version Migration version (e.g., "001")
     * @returns {Promise<void>}
     */
     async removeMigrationRecord(version) {
         const sql = `DELETE FROM migration_history WHERE version = $1`;
         try {
             await this.db.query(sql, [version]);
         } catch (err) {
             // Log error but don't necessarily reject, as rollback might still be needed
             console.error(`Failed to remove migration record ${version}: ${err.message}`);
         }
     }

    /**
     * Runs all pending migrations
     */
    async runMigrations() {
        console.log('Starting database migrations...');
        let client = null; // Use a single client for transactional behavior
        try {
            // Ensure history table exists before proceeding
            await this.ensureHistoryTable();

            const currentVersion = await this.getCurrentVersion();
            console.log('Current database version:', currentVersion);

            const pendingMigrations = this.migrations.filter(m =>
                m.MIGRATION_VERSION > currentVersion
            ); // Sorting is handled by loadMigrations

            if (pendingMigrations.length === 0) {
                console.log('Database is up to date.');
                return;
            }

            // Get a client from the pool for the migration sequence
            client = await this.db.connect();
            await client.query('BEGIN'); // Start transaction

            // Run migrations in sequence
            for (const migration of pendingMigrations) {
                const version = migration.MIGRATION_VERSION;
                console.log(`Running migration ${version} (${migration.filename})...`);
                try {
                    // Execute the migration's up function, passing the client
                    await migration.up(client); // Pass client for transactional consistency

                    // Record successful migration in history table (using the same client)
                    await this.recordMigrationInTransaction(client, version, migration.filename);

                    console.log(`Migration ${version} completed successfully.`);
                } catch (error) {
                    console.error(`Migration ${version} failed:`, error);
                    await client.query('ROLLBACK'); // Rollback transaction on error

                    // Attempt to run the down migration (outside the failed transaction)
                    console.log(`Attempting to roll back migration ${version} schema changes...`);
                    try {
                        // Need a new client or use the pool directly for down?
                        // Let's assume down can run independently for now.
                        // If down needs transaction, this needs more complex handling.
                        await migration.down(this.db); // Use pool for down
                        console.log(`Schema rollback for migration ${version} attempted.`);
                    } catch (rollbackError) {
                        console.error(`Schema rollback attempt for migration ${version} failed:`, rollbackError);
                        console.error('Database may be in an inconsistent state.');
                    }
                    throw error; // Re-throw original error
                }
            }

            await client.query('COMMIT'); // Commit transaction if all migrations succeed
            console.log('All migrations completed successfully.');

        } catch (error) {
            console.error('Migration process failed:', error);
            // Ensure rollback if transaction was started but not committed/rolled back
            if (client) {
                try { await client.query('ROLLBACK'); } catch (rbError) { /* Ignore rollback error */ }
            }
            throw error; // Re-throw error to signal failure
        } finally {
            if (client) {
                client.release(); // Release client back to the pool
            }
        }
    }

     /**
      * Helper to record migration within an existing transaction.
      * @param {import('pg').PoolClient} client The active transaction client
      * @param {string} version
      * @param {string} filename
      */
     async recordMigrationInTransaction(client, version, filename) {
         const sql = `INSERT INTO migration_history (version, filename) VALUES ($1, $2)`;
         try {
             await client.query(sql, [version, filename]);
         } catch (err) {
             throw new Error(`Failed to record migration ${version} in transaction: ${err.message}`);
         }
     }

    // No close() method needed - the pool is managed externally
}

module.exports = MigrationRunner;
