require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database/init');
const { authRouter } = require('./auth/auth'); // Import authRouter
const websiteRoutes = require('./routers/websiteRoutes');
const publicStatusRoutes = require('./routers/publicStatusRoutes'); // Import public routes
const statsRoutes = require('./routers/statsRoutes'); // Import stats routes
const { startMonitoring } = require('./scheduler');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist')));
}

// API Routes
app.use('/api/auth', authRouter); // Use authRouter for /api/auth prefix
app.use('/api/public', publicStatusRoutes); // Add public routes
app.use('/api/stats', statsRoutes); // Add stats routes (already includes auth middleware)
app.use('/api', websiteRoutes); // Keep authenticated website routes (assuming these also need auth)

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

        // Start monitoring scheduler
        startMonitoring();

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
