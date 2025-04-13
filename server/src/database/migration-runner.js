const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class MigrationRunner {
    /**
     * Creates a new MigrationRunner instance
     * @param {string} dbPath Path to SQLite database file
     */
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(dbPath);
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
            // Add filename for logging
            migration.filename = file;
            if (!migration.up || !migration.down || !migration.MIGRATION_VERSION) {
                throw new Error(`Invalid migration file: ${file}`);
            }
            return migration;
        });
    }

    /**
     * Ensures the migration_history table exists.
     * @returns {Promise<void>}
     */
    async ensureHistoryTable() {
        return new Promise((resolve, reject) => {
            const sql = `
                CREATE TABLE IF NOT EXISTS migration_history (
                    version TEXT PRIMARY KEY NOT NULL,
                    filename TEXT NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;
            this.db.run(sql, (err) => {
                if (err) reject(new Error(`Failed to create migration_history table: ${err.message}`));
                else resolve();
            });
        });
    }

    /**
     * Gets the current database version from the history table.
     * @returns {Promise<string>} Current version or '000' if no migrations applied.
     */
    async getCurrentVersion() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT version FROM migration_history ORDER BY version DESC LIMIT 1`;
            this.db.get(sql, (err, row) => {
                if (err) reject(new Error(`Failed to get current migration version: ${err.message}`));
                else resolve(row?.version || '000');
            });
        });
    }

    /**
     * Records a migration version in the history table.
     * @param {string} version Migration version (e.g., "001")
     * @param {string} filename Migration filename
     * @returns {Promise<void>}
     */
    async recordMigration(version, filename) {
         return new Promise((resolve, reject) => {
            const sql = `INSERT INTO migration_history (version, filename) VALUES (?, ?)`;
            this.db.run(sql, [version, filename], (err) => {
                if (err) reject(new Error(`Failed to record migration ${version}: ${err.message}`));
                else resolve();
            });
         });
    }

     /**
     * Removes a migration version from the history table (used on rollback).
     * @param {string} version Migration version (e.g., "001")
     * @returns {Promise<void>}
     */
     async removeMigrationRecord(version) {
         return new Promise((resolve, reject) => {
             const sql = `DELETE FROM migration_history WHERE version = ?`;
             this.db.run(sql, [version], (err) => {
                 // Log error but don't necessarily reject, as rollback might still be needed
                 if (err) console.error(`Failed to remove migration record ${version}: ${err.message}`);
                 resolve();
             });
         });
     }

    /**
     * Runs all pending migrations
     */
    async runMigrations() {
        console.log('Starting database migrations...');
        try {
            // Ensure history table exists before proceeding
            await this.ensureHistoryTable();

            const currentVersion = await this.getCurrentVersion();
            console.log('Current database version:', currentVersion);

            // Find migrations that need to be run (version > currentVersion)
            const pendingMigrations = this.migrations.filter(m => 
                m.MIGRATION_VERSION > currentVersion
            );

            if (pendingMigrations.length === 0) {
                console.log('Database is up to date.');
                return;
            }

            // Sort migrations by version
            // No need to sort here as loadMigrations already sorts by filename/version prefix

            // Run migrations in sequence
            for (const migration of pendingMigrations) {
                const version = migration.MIGRATION_VERSION;
                console.log(`Running migration ${version} (${migration.filename})...`);
                try {
                    // Execute the migration's up function
                    await migration.up(this.db);

                    // Record successful migration in history table
                    await this.recordMigration(version, migration.filename);

                    console.log(`Migration ${version} completed successfully.`);
                } catch (error) {
                    console.error(`Migration ${version} failed:`, error);

                    // Try to roll back this migration
                    console.log(`Attempting to roll back migration ${version}...`);
                    try {
                        await migration.down(this.db);
                        // If rollback succeeds, remove the record (though it shouldn't exist yet)
                        await this.removeMigrationRecord(version);
                        console.log(`Rolled back migration ${version}.`);
                    } catch (rollbackError) {
                        console.error(`Rollback for migration ${version} failed:`, rollbackError);
                        console.error('Database may be in an inconsistent state.');
                    }
                    throw error;
                }
            }

            console.log('All migrations completed successfully.');

        } catch (error) {
            console.error('Migration process failed:', error);
            throw error;
        }
    }

    /**
     * Closes the database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = MigrationRunner;
