require('dotenv').config();
const express = require('express');
const { expressjwt: jwtMiddleware } = require('express-jwt'); // Renamed import
const db = require('./database/db');
const { scheduleCheck } = require('./scheduler');
const authRoutes = require('./auth/auth'); // Import auth routes
const cors = require('cors'); // Import CORS

const app = express();
const port = process.env.PORT || 3001;
const jwtSecret = process.env.JWT_SECRET || 'your-very-secure-secret';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

// CORS Middleware
app.use(cors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body Parser Middleware
app.use(express.json());


// --- Authentication Routes ---
// Mount the authentication routes BEFORE the protected routes
app.use('/api/auth', authRoutes);

// --- JWT Middleware for Protected Routes ---
// All routes defined after this middleware will require a valid JWT
app.use('/api', jwtMiddleware({
    secret: jwtSecret,
    algorithms: ['HS256'],
    // Optionally, specify which paths don't require authentication
    // unless: { path: ['/api/public-route'] }
}));

// --- Protected API Routes ---

// GET /api/websites - List all websites (Now protected)
app.get('/api/websites', async (req, res) => {
  try {
    const websites = await db.getAllWebsites();
    res.json(websites);
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
});

// POST /api/websites - Add a new website
app.post('/api/websites', async (req, res) => {
  const { url, name } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Basic URL validation (can be improved)
  try {
    new URL(url); // Check if it's a valid URL format
  } catch (_) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const newWebsite = await db.addWebsite(url, name || null); // Use null if name is not provided
    res.status(201).json(newWebsite);
  } catch (error) {
    console.error('Error adding website:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Website URL already exists' }); // Conflict
    } else {
        res.status(500).json({ error: 'Failed to add website' });
    }
  }
});

// DELETE /api/websites/:id - Remove a website
app.delete('/api/websites/:id', async (req, res) => {
  const { id } = req.params;
  const websiteId = parseInt(id, 10);

  if (isNaN(websiteId)) {
    return res.status(400).json({ error: 'Invalid website ID' });
  }

  try {
    await db.removeWebsite(websiteId);
    res.status(204).send(); // No Content on successful deletion
  } catch (error) {
    console.error(`Error removing website ID ${websiteId}:`, error);
    if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
    } else {
        res.status(500).json({ error: 'Failed to remove website' });
    }
  }
});

// GET /api/websites/:id/checks - Get recent checks for a website (Now protected)
app.get('/api/websites/:id/checks', async (req, res) => {
    // Access user info from token if needed: req.auth (added by express-jwt)
    // console.log('Authenticated user:', req.auth);
    const { id } = req.params;
    const websiteId = parseInt(id, 10);
    const limit = parseInt(req.query.limit || 20, 10); // Default limit 20

    if (isNaN(websiteId)) {
      return res.status(400).json({ error: 'Invalid website ID' });
    }
    if (isNaN(limit) || limit <= 0) {
        return res.status(400).json({ error: 'Invalid limit parameter' });
    }

    try {
      // Optional: Check if website exists first?
      const checks = await db.getRecentChecks(websiteId, limit);
      res.json(checks);
    } catch (error) {
      console.error(`Error fetching checks for website ID ${websiteId}:`, error);
      res.status(500).json({ error: 'Failed to fetch checks' });
    }
  });

// --- Error Handling ---
// Add a specific error handler for JWT authentication errors
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        console.error('JWT Authentication Error:', err.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    } else {
        // Pass other errors to the default handler (or add more specific handlers)
        next(err);
    }
});


// --- Server Initialization ---

// Function to initialize database (run init script)
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        console.log('Initializing database...');
        const { exec } = require('child_process');
        // Use node to execute the init script
        exec(`node ${require('path').join(__dirname, 'database', 'init.js')}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Database initialization error: ${error}`);
                console.error(`stderr: ${stderr}`);
                reject(error);
                return;
            }
            console.log(`Database initialization output: ${stdout}`);
            if (stderr) {
                console.error(`Database initialization stderr: ${stderr}`);
            }
            console.log('Database initialized successfully.');
            resolve();
        });
    });
};


// Start the server after ensuring DB is initialized
const startServer = async () => {
    try {
        await initializeDatabase();
        app.listen(port, () => {
          console.log(`Monitoring server listening on http://localhost:${port}`);
          // Start the cron scheduler
          scheduleCheck();
        });
    } catch (error) {
        console.error("Failed to start server due to database initialization error:", error);
        process.exit(1); // Exit if DB init fails
    }
};

// Export the app and start function (useful for testing or programmatic start)
module.exports = { app, startServer };

// If this script is run directly (node src/server.js), start the server.
if (require.main === module) {
    startServer();
}
