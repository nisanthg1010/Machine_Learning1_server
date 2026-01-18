/**
 * Main Server File
 * Express.js backend for ML Platform
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const datasetRoutes = require('./routes/datasetRoutes');
const experimentRoutes = require('./routes/experimentRoutes');
const mlRoutes = require('./routes/mlRoutes');
const modelComparisonRoutes = require('./routes/modelComparisonRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'https://machine-learning-platform-theta.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Surface multer or other sync errors cleanly
app.use((err, _req, res, next) => {
    if (err instanceof Error && err.message && !res.headersSent) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

const connectToDatabase = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('✅ MongoDB connection established');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB connection disconnected');
        });

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000
        });
        // Initial success message handled by event listener or await
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.warn('⚠️ Continuing without database - using in-memory storage');
        // Don't throw error - allow server to start without DB
    }
};

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ML Platform API',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/datasets', datasetRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/model-comparison', modelComparisonRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to ML Platform API',
        version: '1.0.0',
        endpoints: {
            datasets: '/api/datasets',
            experiments: '/api/experiments',
            users: '/api/users',
            ml: '/api/ml',
            health: '/health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            status: 404
        }
    });
});

const startServer = async () => {
    await connectToDatabase();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🤖 ML Service URL: ${process.env.ML_SERVICE_URL}`);
    });
};

startServer();

module.exports = app;
