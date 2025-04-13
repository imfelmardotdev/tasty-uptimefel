const MIGRATION_VERSION = '008';

/**
 * Adds monitor type and configuration columns to monitored_websites table
 */
function up(db) {
    return new Promise((resolve, reject) => {
        // SQLite requires separate ALTER TABLE statements for each column
        db.serialize(() => {
            db.run(`ALTER TABLE monitored_websites ADD COLUMN monitor_type TEXT DEFAULT 'http'`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    reject(err);
                    return;
                }
                
                db.run(`ALTER TABLE monitored_websites ADD COLUMN monitor_config TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column')) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    });
}

/**
 * Removes monitor type and configuration columns
 */
function down(db) {
    // SQLite doesn't support dropping columns
    // We'd need to recreate the table to remove columns
    return Promise.resolve();
}

module.exports = {
    MIGRATION_VERSION,
    up,
    down
};
