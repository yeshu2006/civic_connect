import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or root directory before any other logic
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(process.cwd(), 'server', '.env'),
  path.join(process.cwd(), '.env')
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { seedInitialData } from './utils/seedData.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
const allowedOrigins = process.env.CLIENT_URL
  ? (process.env.CLIENT_URL === '*' ? '*' : process.env.CLIENT_URL.split(',').map((s) => s.trim()))
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// Static serving for locally stored uploads fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CivicConnect API',
    version: '1.0.0'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Catch 404 for unhandled API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Serve frontend client build in production or when dist exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Central Error Handling Middleware
app.use(errorHandler);

// Connect DB & Start Server
const startServer = async () => {
  try {
    await connectDB();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`CivicConnect API Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start CivicConnect server:', err);
    process.exit(1);
  }
};

startServer();

export default app;
