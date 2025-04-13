module.exports = {
  MIGRATION_VERSION: "004",

  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(
          `CREATE TABLE stat_minutely (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER NOT NULL,
            timestamp INTEGER NOT NULL, -- Unix timestamp (seconds) representing the start of the minute
            up_count INTEGER NOT NULL DEFAULT 0,
            down_count INTEGER NOT NULL DEFAULT 0,
            maintenance_count INTEGER NOT NULL DEFAULT 0,
            avg_ping REAL,
            min_ping INTEGER,
            max_ping INTEGER,
            extras TEXT, -- For storing additional JSON data if needed
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON UPDATE CASCADE ON DELETE CASCADE, -- Corrected table name
            UNIQUE (website_id, timestamp) -- Prevent duplicate entries
          )`,
          (err) => {
            if (err) return reject(err);
          }
        );

        db.run(
          `CREATE INDEX idx_stat_minutely_website_id_timestamp ON stat_minutely (website_id, timestamp)`,
          (err) => {
            if (err) return reject(err);
          }
        );

        db.run(
          `CREATE INDEX idx_stat_minutely_timestamp ON stat_minutely (timestamp)`,
          (err) => {
            if (err) return reject(err);
            resolve(); // Resolve after the last command completes
          }
        );
      });
    });
  },

  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`DROP TABLE stat_minutely`, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },
};
