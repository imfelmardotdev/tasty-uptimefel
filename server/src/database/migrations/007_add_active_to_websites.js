module.exports = {
  MIGRATION_VERSION: "007",

  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Add the 'active' column with a default value of 1 (true)
      const sql = `
        ALTER TABLE monitored_websites
        ADD COLUMN active INTEGER DEFAULT 1 NOT NULL;
      `;
      db.run(sql, (err) => {
        if (err) {
          console.error("Migration 007 (up) failed:", err);
          reject(err);
        } else {
          console.log("Column 'active' added to monitored_websites with default 1.");
          resolve();
        }
      });
    });
  },

  down: async (db) => {
    // SQLite doesn't easily support dropping columns within a transaction
    // The common workaround is to recreate the table without the column,
    // but that's complex and risky for a down migration.
    // For simplicity, we'll just log a message. In a production scenario,
    // more robust handling or preventing column drops might be preferred.
    console.warn("SQLite does not support easily dropping columns. Column 'active' was not removed from monitored_websites.");
    return Promise.resolve();

    /* // More complex down migration (example - requires careful testing)
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION;", reject);
        // 1. Create backup table
        db.run("CREATE TABLE monitored_websites_backup AS SELECT id, name, url, check_interval, timeout_ms, retry_count, accepted_status_codes, monitor_method, follow_redirects, max_redirects, user_id, created_at, updated_at FROM monitored_websites;", reject);
        // 2. Drop original table
        db.run("DROP TABLE monitored_websites;", reject);
        // 3. Recreate original table without 'active'
        db.run(`
          CREATE TABLE monitored_websites (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              url TEXT NOT NULL,
              check_interval INTEGER DEFAULT 300,
              timeout_ms INTEGER DEFAULT 5000,
              retry_count INTEGER DEFAULT 1,
              accepted_status_codes TEXT DEFAULT '200-299',
              monitor_method TEXT DEFAULT 'GET',
              follow_redirects BOOLEAN DEFAULT 1,
              max_redirects INTEGER DEFAULT 5,
              user_id INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `, reject);
        // 4. Copy data back
        db.run("INSERT INTO monitored_websites (id, name, url, check_interval, timeout_ms, retry_count, accepted_status_codes, monitor_method, follow_redirects, max_redirects, user_id, created_at, updated_at) SELECT id, name, url, check_interval, timeout_ms, retry_count, accepted_status_codes, monitor_method, follow_redirects, max_redirects, user_id, created_at, updated_at FROM monitored_websites_backup;", reject);
        // 5. Drop backup table
        db.run("DROP TABLE monitored_websites_backup;", reject);
        db.run("COMMIT;", (err) => {
          if (err) reject(err); else resolve();
        });
      });
    });
    */
  },
};
