import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { NotificationModel } from './models/notification';
import { PreferenceModel } from './models/preference';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { PushService } from './services/push.service';
import { SocketHandlers } from './socket/handlers';
import notificationRoutes from './routes/notifications';
import { logger } from './middleware/logger';

config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3007;

// CORS configuration
const corsOptions = {
  origin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
};

// Socket.IO setup
const io = new Server(httpServer, {
  cors: corsOptions,
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nexus_notifications',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection failed', { error: err });
  } else {
    logger.info('Database connected successfully');
  }
});

// Initialize models and services
const notificationModel = new NotificationModel(pool);
const preferenceModel = new PreferenceModel(pool);
const emailService = new EmailService();
const pushService = new PushService();
const notificationService = new NotificationService(
  notificationModel,
  preferenceModel,
  emailService,
  pushService
);

// Initialize WebSocket handlers
const socketHandlers = new SocketHandlers(io, notificationService);
socketHandlers.setupHandlers();

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/notifications', notificationRoutes(notificationService, preferenceModel, socketHandlers));

// Push service endpoints
app.get('/push/public-key', (req, res) => {
  res.json({ publicKey: pushService.getPublicKey() });
});

app.post('/push/subscribe', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await pushService.saveSubscription(userId, req.body);
    res.json({ message: 'Subscription saved' });
  } catch (error: any) {
    logger.error('Failed to save push subscription', { error });
    res.status(500).json({ error: error.message });
  }
});

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

// Cleanup old notifications (run daily)
setInterval(async () => {
  try {
    await notificationModel.deleteOlderThan(90); // Delete notifications older than 90 days
    logger.info('Cleaned up old notifications');
  } catch (error) {
    logger.error('Failed to cleanup old notifications', { error });
  }
}, 24 * 60 * 60 * 1000); // 24 hours

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Notification Service started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`WebSocket enabled with CORS: ${corsOptions.origin.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  io.close();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  io.close();
  await pool.end();
  process.exit(0);
});

export default app;
