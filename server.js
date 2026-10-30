/**
 * Server Entry Point - Campus Placement Management System
 * Production-grade Express.js Server with Native MongoDB Driver
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

// Import Route Handlers
const studentsRoutes = require('./routes/studentsRoutes');
const drivesRoutes = require('./routes/drivesRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Serve Frontend Static Files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Health Check Endpoint (doesn't require DB)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Full Stack Database - Placement Management System'
  });
});

// Serverless DB Connection Middleware for API routes
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('🚨 [Database Connection Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to MongoDB database. Please verify MONGO_URI configuration in environment variables.',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/students', studentsRoutes);
app.use('/api/drives', drivesRoutes);
app.use('/api/stats', statsRoutes);

// Fallback for SPA (Single Page Application routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.path} not found.`
    });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Asynchronous Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('🚨 [Server Error]:', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

/**
 * Start Server after establishing Database Connection Pool
 */
async function startServer() {
  try {
    // 1. Establish Native MongoDB Driver Connection
    await connectDB();

    // 2. Start Express Listener
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🎓 Campus Placement Management System`);
      console.log(`🚀 Server listening at: http://localhost:${PORT}`);
      console.log(`🌐 Dashboard UI at:     http://localhost:${PORT}`);
      console.log(`📡 API Base URL:       http://localhost:${PORT}/api`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('💥 [Server Fatal Error] Unable to start server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
