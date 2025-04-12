require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH || './monitoring.db';

// Single database connection instance
let db;

const connectDb = () => {
    if (!db) {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                throw err; // Throw error to indicate connection failure
            } else {
                console.log(`Connected to the SQLite database at ${dbPath}`);
                // Enable foreign key support
                db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
                    if (pragmaErr) {
                        console.error("Failed to enable foreign keys:", pragmaErr.message);
                    }
                });
            }
        });

        // Handle potential errors during connection
        db.on('error', (err) => {
            console.error('Database error:', err.message);
            // Consider attempting to reconnect or exiting
        });
    }
    return db;
};

// Initialize connection
connectDb();

// Function to add a website
const addWebsite = (url, name) => {
  return new Promise((resolve, reject) => {
    const currentDb = connectDb(); // Ensure connection exists
    const sql = `INSERT INTO websites (url, name) VALUES (?, ?)`;
    currentDb.run(sql, [url, name], function (err) {
      // Keep connection open
      if (err) {
        console.error('Error adding website:', err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID, url, name });
      }
    });
  });
};

// Function to get all websites
const getAllWebsites = () => {
  return new Promise((resolve, reject) => {
    const currentDb = connectDb();
    const sql = `SELECT * FROM websites ORDER BY created_at DESC`;
    currentDb.all(sql, [], (err, rows) => {
      // Keep connection open
      if (err) {
        console.error('Error getting websites:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Function to remove a website by ID
const removeWebsite = (id) => {
  return new Promise((resolve, reject) => {
    const currentDb = connectDb();
    const sql = `DELETE FROM websites WHERE id = ?`;
    currentDb.run(sql, id, function (err) {
      // Keep connection open
      if (err) {
        console.error('Error removing website:', err.message);
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error(`Website with ID ${id} not found.`));
      } else {
        resolve({ id, changes: this.changes });
      }
    });
  });
};

// Function to insert a check result
const insertCheck = (websiteId, statusCode, responseTimeMs, isUp) => {
  return new Promise((resolve, reject) => {
    const currentDb = connectDb();
    const sql = `INSERT INTO checks (website_id, status_code, response_time_ms, is_up) VALUES (?, ?, ?, ?)`;
    currentDb.run(sql, [websiteId, statusCode, responseTimeMs, isUp], function (err) {
      // Keep connection open
      if (err) {
        console.error('Error inserting check:', err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID, websiteId, statusCode, responseTimeMs, isUp });
      }
    });
  });
};

// Function to get the latest check for a specific website
const getLatestCheck = (websiteId) => {
  return new Promise((resolve, reject) => {
    const currentDb = connectDb();
    const sql = `SELECT * FROM checks WHERE website_id = ? ORDER BY checked_at DESC LIMIT 1`;
    currentDb.get(sql, [websiteId], (err, row) => {
      // Keep connection open
      if (err) {
        console.error('Error getting latest check:', err.message);
        reject(err);
      } else {
        resolve(row); // row will be undefined if no checks exist
      }
    });
  });
};

// Function to get recent checks for a specific website
const getRecentChecks = (websiteId, limit = 20) => {
    return new Promise((resolve, reject) => {
      const currentDb = connectDb();
      const sql = `SELECT * FROM checks WHERE website_id = ? ORDER BY checked_at DESC LIMIT ?`;
      currentDb.all(sql, [websiteId, limit], (err, rows) => {
        // Keep connection open
        if (err) {
          console.error('Error getting recent checks:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  };

// --- User Authentication Functions ---

// Function to find user by email
const findUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        const currentDb = connectDb();
        currentDb.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                console.error('Error finding user by email:', err.message);
                reject(new Error('Database error finding user'));
            } else {
                resolve(row); // Returns the user row or undefined
            }
        });
    });
};

// Function to create a new user
const createUser = (email, passwordHash) => {
    return new Promise((resolve, reject) => {
        const currentDb = connectDb();
        currentDb.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    reject(new Error('Email already exists'));
                } else {
                    console.error('Error creating user:', err.message);
                    reject(new Error('Database error creating user'));
                }
            } else {
                resolve({ id: this.lastID, email }); // Return the new user's ID and email
            }
        });
    });
};


module.exports = {
  addWebsite,
  getAllWebsites,
  removeWebsite,
  insertCheck,
  getLatestCheck,
  getRecentChecks,
  findUserByEmail, // Export new user functions
  createUser,
  // Do not export getDbConnection or db directly unless absolutely necessary
};

// Graceful shutdown
process.on('SIGINT', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database connection:', err.message);
            } else {
                console.log('Database connection closed gracefully.');
            }
            process.exit(err ? 1 : 0);
        });
    } else {
        process.exit(0);
    }
});
