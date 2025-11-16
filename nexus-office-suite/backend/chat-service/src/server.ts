import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { testConnection } from './config/database';
import { connectRedis } from './config/redis';
import { syncDatabase } from './models';
import WebSocketService from './services/WebSocketService';
import { setupSocketHandlers } from './socket/handlers';
import routes from './routes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wsService = new WebSocketService(server);

const PORT = process.env.PORT || 3003;
const API_VERSION = process.env.API_VERSION || 'v1';

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

app.use(`/api/${API_VERSION}`, limiter);

// Routes
app.use(`/api/${API_VERSION}`, routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'NEXUS Chat Service',
    version: '1.0.0',
    status: 'running',
  });
});

// WebSocket connection handling
const io = wsService.getIO();

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);
  setupSocketHandlers(socket, wsService);
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await wsService.cleanup();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await wsService.cleanup();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Connect to Redis
    await connectRedis();

    // Sync database (in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await syncDatabase(false);
    }

    // Start listening
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║        NEXUS Chat Service Started Successfully       ║
║                                                       ║
║  HTTP Server: http://localhost:${PORT}                  ║
║  WebSocket Server: ws://localhost:${PORT}               ║
║  API Version: ${API_VERSION}                                ║
║  Environment: ${process.env.NODE_ENV || 'development'}                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, server, wsService };
