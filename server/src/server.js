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

const app = express();
const port = process.env.PORT || 3001;

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

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist')));
}

// API Routes - Reverted to original order
app.use('/api/auth', authRouter); 
app.use('/api/public', publicStatusRoutes);
app.use('/api/stats', statsRoutes); 
app.use('/api/websites', websiteRoutes); // Mount website routes under /api/websites

// Cron Job Endpoint (protected by secret)
// This needs to be defined separately as it's a POST on a specific path
app.post('/api/cron/run-checks', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;

    if (!cronSecret) {
        console.error('CRON_SECRET environment variable not set.');
        return res.status(500).json({ error: 'Cron secret not configured' });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized attempt to access cron endpoint.');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[CRON HANDLER] Authorized request received.'); // Added log

    try {
        console.log('[CRON HANDLER] Initiating checkWebsites()...'); // Added log
        // Await the completion of the checks to ensure logs are captured
        await checkWebsites(); 
        console.log('[CRON HANDLER] checkWebsites() completed.'); // Updated log
        // Send 200 OK now that the work is done (or attempted)
        res.status(200).json({ message: 'Website check cycle completed.' }); 
    } catch (error) {
        // This catch block should now catch errors from within checkWebsites if they bubble up
        console.error('[CRON HANDLER] CRITICAL ERROR during checkWebsites() execution:', error); // Enhanced log
        res.status(500).json({ error: 'Failed to complete check cycle' });
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
    try {
        // Initialize database
        await initializeDatabase();
        console.log('Database initialized');

        // Removed: startMonitoring(); - Cron job will trigger checks via API

        // Start server
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

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
