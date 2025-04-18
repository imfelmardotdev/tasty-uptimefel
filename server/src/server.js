console.log('[SERVER START] Loading server.js module...'); // Added log
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database/init');
const { authRouter } = require('./auth/auth'); // Import authRouter
const websiteRoutes = require('./routers/websiteRoutes');
const publicStatusRoutes = require('./routers/publicStatusRoutes'); // Import public routes
const statsRoutes = require('./routers/statsRoutes'); // Import stats routes
// Removed: const { startMonitoring } = require('./scheduler'); - No longer starting interval here
const { checkWebsites } = require('./scheduler'); // Import the check function
console.log(`[SERVER START] Imported checkWebsites: Type = ${typeof checkWebsites}`); // Added import log

const app = express();
console.log('[SERVER START] Express app created.'); // Added log
const port = process.env.PORT || 3001;

// Add request logger middleware VERY EARLY
app.use((req, res, next) => {
  console.log(`[REQUEST LOGGER] Received: ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
// Allow requests from frontend origin (env var for production, localhost for dev)
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
console.log(`[CORS] Allowing origin: ${allowedOrigin}`); // Add log to verify
const corsOptions = {
  origin: allowedOrigin,
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
app.use(express.json());

console.log('[SERVER START] Setting up static file serving for production...'); // Added log
// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist')));
}

console.log('[SERVER START] Mounting API routes...'); // Added log
// API Routes - Reverted to original order
app.use('/api/auth', authRouter); 
app.use('/api/public', publicStatusRoutes);
app.use('/api/stats', statsRoutes); 
app.use('/api/websites', websiteRoutes); // Mount website routes under /api/websites

// Cron Job Endpoint (protected by secret)
// Vercel Crons use GET by default
app.get('/api/cron/run-checks', async (req, res) => { // Changed from POST to GET
    console.log('[CRON HANDLER ENTRY] Handler function started.'); // Add log at the very start

    // Note: Vercel Cron Pro can send custom headers/body for POST, but GET is simpler here.
    // We'll use a query parameter for the secret instead of Authorization header.
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.query.secret; // Get secret from query param ?secret=...

    if (!cronSecret) {
        console.error('[CRON HANDLER] CRON_SECRET environment variable not set.');
        return res.status(500).json({ error: 'Cron secret not configured' });
    }

    // Check secret from query parameter
    if (!providedSecret || providedSecret !== cronSecret) {
        console.warn('[CRON HANDLER] Unauthorized attempt to access cron endpoint (secret mismatch or missing).');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[CRON HANDLER] Authorized request received (via query secret).'); // Updated log

    try {
        console.log('[CRON HANDLER] About to call await checkWebsites()...'); // Restore log
        // Await the completion of the checks to ensure logs are captured
        await checkWebsites(); // Restore call
        console.log('[CRON HANDLER] checkWebsites() completed.'); // Restore log
        // Send 200 OK now that the work is done (or attempted)
        res.status(200).json({ message: 'Website check cycle completed.' }); // Restore original message
    } catch (error) {
        // This catch block should now catch errors from within checkWebsites if they bubble up
        console.error('[CRON HANDLER] CRITICAL ERROR during checkWebsites() execution:', error); // Restore log
        res.status(500).json({ error: 'Failed to complete check cycle' }); // Restore original message
    }
});


// Handle React routing in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../dist/index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// Start database and server
async function start() {
    console.log('[SERVER START] Entering start() function...'); // Added log
    try {
        // Initialize database
        console.log('[SERVER START] Initializing database...'); // Added log
        await initializeDatabase();
        console.log('[SERVER START] Database initialized successfully.'); // Updated log

        // Removed: startMonitoring(); - Cron job will trigger checks via API

        // Start server (Note: app.listen might behave differently in serverless)
        console.log('[SERVER START] Calling app.listen()...'); // Added log
        const server = app.listen(port, () => {
            // This callback might not execute reliably in Vercel serverless
            console.log(`[SERVER START] Express server listening callback executed on port ${port}`); 
        });
        console.log('[SERVER START] app.listen() called.'); // Added log

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
