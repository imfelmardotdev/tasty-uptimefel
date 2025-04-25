// server/run-migrations-sqlite.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'server', 'monitoring.db'); // Path to your SQLite DB
const migrationsDir = path.join(__dirname, 'server', 'src', 'database', 'migrations');

class SqliteMigrationRunner {
    constructor(databasePath) {
        this.dbPath = databasePath;
        this.db = null; // Will hold the sqlite3 Database object
        this.migrations = [];
        this.loadMigrations();
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error connecting to SQLite database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database:', this.dbPath);
                    // Use PRAGMA for better performance and consistency
                    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;', (pragmaErr) => {
                        if (pragmaErr) {
                            console.warn('Could not set PRAGMAs:', pragmaErr.message);
                        }
                        resolve();
                    });
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing SQLite database:', err.message);
                        reject(err);
                    } else {
                        console.log('SQLite database connection closed.');
                        resolve();
                    }
                });
            } else {
                resolve(); // Already closed or never opened
            }
        });
    }

    loadMigrations() {
        if (!fs.existsSync(migrationsDir)) {
            console.log('No migrations directory found.');
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.js'))
            .sort((a, b) => a.localeCompare(b)); // Ensure correct sorting

        this.migrations = files.map(file => {
            const migrationPath = path.join(migrationsDir, file);
            const migration = require(migrationPath);
            migration.filename = file;
            // Ensure migration files export 'up', 'down', and 'MIGRATION_VERSION'
            // The 'up' and 'down' functions should expect a sqlite3 Database object
            if (typeof migration.up !== 'function' || typeof migration.down !== 'function' || !migration.MIGRATION_VERSION) {
                throw new Error(`Invalid migration file structure: ${file}. Must export up, down, and MIGRATION_VERSION.`);
            }
            return migration;
        });
        console.log(`Loaded ${this.migrations.length} migration files.`);
    }

    // Promisify db.exec
    dbExec(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Promisify db.get
    dbGet(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Promisify db.run (for INSERT/UPDATE/DELETE)
    dbRun(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) { // Use function() to access 'this' context if needed (e.g., this.lastID)
                if (err) reject(err);
                else resolve(this); // Resolve with the statement object
            });
        });
    }


    async ensureHistoryTable() {
        // Use SQLite syntax
        const sql = `
            CREATE TABLE IF NOT EXISTS migration_history (
                version TEXT PRIMARY KEY NOT NULL,
                filename TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        try {
            await this.dbExec(sql);
            console.log('Migration history table ensured.');
        } catch (err) {
            throw new Error(`Failed to create migration_history table: ${err.message}`);
        }
    }

    async getCurrentVersion() {
        const sql = `SELECT version FROM migration_history ORDER BY version DESC LIMIT 1`;
        try {
            const row = await this.dbGet(sql);
            return row?.version || '000';
        } catch (err) {
            // Handle case where table might not exist yet
            if (err.message.includes('no such table: migration_history')) {
                 console.warn('migration_history table not found, assuming version 000.');
                 return '000';
            }
            throw new Error(`Failed to get current migration version: ${err.message}`);
        }
    }

    async recordMigration(version, filename) {
         const sql = `INSERT INTO migration_history (version, filename) VALUES (?, ?)`;
         try {
             await this.dbRun(sql, [version, filename]);
         } catch (err) {
             throw new Error(`Failed to record migration ${version}: ${err.message}`);
         }
    }

    async runMigrations() {
        console.log('Starting SQLite database migrations...');
        try {
            await this.connect();
            await this.ensureHistoryTable();

            const currentVersion = await this.getCurrentVersion();
            console.log('Current database version:', currentVersion);

            const pendingMigrations = this.migrations.filter(m =>
                m.MIGRATION_VERSION > currentVersion
            );

            if (pendingMigrations.length === 0) {
                console.log('Database is up to date.');
                return;
            }

            // Run migrations sequentially
            await this.dbExec('BEGIN TRANSACTION');
            try {
                for (const migration of pendingMigrations) {
                    const version = migration.MIGRATION_VERSION;
                    console.log(`Running migration ${version} (${migration.filename})...`);

                    // Execute the migration's up function, passing the db object
                    await migration.up(this.db); // Pass SQLite DB object

                    // Record successful migration
                    await this.recordMigration(version, migration.filename);

                    console.log(`Migration ${version} completed successfully.`);
                }
                await this.dbExec('COMMIT');
                console.log('All migrations completed successfully.');
            } catch (error) {
                console.error(`Migration failed during execution:`, error);
                console.log('Attempting to rollback transaction...');
                await this.dbExec('ROLLBACK');
                console.log('Transaction rolled back.');
                // Note: Schema changes might still persist if 'up' partially succeeded before error.
                // Implementing 'down' logic on failure is more complex and not added here for simplicity.
                throw error; // Re-throw original error
            }

        } catch (error) {
            console.error('Migration process failed:', error);
            throw error; // Re-throw error to signal failure
        } finally {
            await this.close();
        }
    }
}

// --- Main Execution ---
async function main() {
    const runner = new SqliteMigrationRunner(dbPath);
    try {
        await runner.runMigrations();
        process.exit(0);
    } catch (error) {
        // Error already logged by runner
        process.exit(1);
    }
}

main();
