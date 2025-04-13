module.exports = {
  MIGRATION_VERSION: "003",

  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(
          `CREATE TABLE heartbeats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER NOT NULL,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status INTEGER NOT NULL, -- 0: DOWN, 1: UP, 2: PENDING, 3: MAINTENANCE
            ping INTEGER, -- Response time in ms
            message TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON UPDATE CASCADE ON DELETE CASCADE -- Corrected table name
          )`,
          (err) => {
            if (err) return reject(err);
          }
        );

        db.run(
          `CREATE INDEX idx_heartbeats_website_id_timestamp ON heartbeats (website_id, timestamp)`,
          (err) => {
            if (err) return reject(err);
          }
        );

        db.run(
          `CREATE INDEX idx_heartbeats_timestamp ON heartbeats (timestamp)`,
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
      db.run(`DROP TABLE heartbeats`, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },
};
