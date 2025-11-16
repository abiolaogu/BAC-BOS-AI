import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { PresenceService } from './services/presence.service';
import { CursorService } from './services/cursor.service';
import { OTService } from './services/ot.service';
import { SocketHandlers } from './socket/handlers';
import presenceRoutes from './routes/presence';
import { logger } from './middleware/logger';

config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3008;

// CORS configuration
const corsOptions = {
  origin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
};

// Socket.IO setup
const io = new Server(httpServer, {
  cors: corsOptions,
});

// Initialize services
const presenceService = new PresenceService();
const cursorService = new CursorService();
const otService = new OTService();

// Initialize WebSocket handlers
const socketHandlers = new SocketHandlers(io, presenceService, cursorService, otService);

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'collaboration-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/presence', presenceRoutes(presenceService));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack });
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
  });
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize services
    await presenceService.initialize();
    await cursorService.initialize();
    await otService.initialize();

    // Setup WebSocket handlers
    socketHandlers.setupHandlers();

    httpServer.listen(PORT, () => {
      logger.info(`Collaboration Service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`WebSocket enabled with CORS: ${corsOptions.origin.join(', ')}`);
    });
  } catch (error) {
    logger.error('Failed to start Collaboration Service', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  io.close();
  await presenceService.disconnect();
  await cursorService.disconnect();
  await otService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  io.close();
  await presenceService.disconnect();
  await cursorService.disconnect();
  await otService.disconnect();
  process.exit(0);
});

startServer();

export default app;
