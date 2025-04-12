require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH || './monitoring.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log(`Connected to the SQLite database at ${dbPath}`);
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Websites table
    db.run(`
      CREATE TABLE IF NOT EXISTS websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating websites table:', err.message);
      } else {
        console.log('Table "websites" created or already exists.');
      }
    });

    // Checks table
    db.run(`
      CREATE TABLE IF NOT EXISTS checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER NOT NULL,
        status_code INTEGER,
        response_time_ms INTEGER,
        is_up BOOLEAN,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating checks table:', err.message);
      } else {
        console.log('Table "checks" created or already exists.');
      }
    });

    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Table "users" created or already exists.');
        }
    });

    // Close the database connection after table creation attempts
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  });
}

// Handle potential errors during connection
db.on('error', (err) => {
  console.error('Database error:', err.message);
});
