// Migration for PostgreSQL

const up = async (db) => {
  // Use SERIAL PRIMARY KEY for auto-incrementing integer in PostgreSQL
  // Use BOOLEAN for enabled status
  await db.query(`
    CREATE TABLE notification_settings (
      id SERIAL PRIMARY KEY,
      webhook_url TEXT DEFAULT '',
      webhook_enabled BOOLEAN DEFAULT false
    );
  `);
  // Insert a single row for global settings, using boolean false
  await db.query(`
    INSERT INTO notification_settings (id, webhook_url, webhook_enabled) VALUES (1, '', false);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS notification_settings;'); // Use IF EXISTS for safety
};

module.exports = { up, down, MIGRATION_VERSION: '009' };
