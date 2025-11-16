import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/config';
import { db } from './database/client';
import { redis } from './database/redis';
import { mediasoupService } from './services/mediasoup.service';
import { setupSocketHandlers } from './socket/handlers';
import meetingRoutes from './routes/meetings';
import logger from './utils/logger';

class MeetServer {
  private app: Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: Server;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: config.server.cors_origins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: config.server.cors_origins,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        service: 'nexus-meet-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // API routes
    this.app.use('/api/meetings', meetingRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      });
    });

    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', { error: err });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    });
  }

  private setupSocketIO(): void {
    setupSocketHandlers(this.io);
    logger.info('Socket.IO server initialized');
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Test database connection
      await db.query('SELECT NOW()');
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed', { error });
      throw error;
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      await redis.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed', { error });
      throw error;
    }
  }

  private async initializeMediasoup(): Promise<void> {
    try {
      await mediasoupService.init();
      logger.info('Mediasoup workers initialized successfully');
    } catch (error) {
      logger.error('Mediasoup initialization failed', { error });
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Initialize Redis
      await this.initializeRedis();

      // Initialize Mediasoup
      await this.initializeMediasoup();

      // Start server
      this.httpServer.listen(config.server.port, config.server.host, () => {
        logger.info(`NEXUS Meet service started`, {
          host: config.server.host,
          port: config.server.port,
          environment: process.env.NODE_ENV || 'development',
        });
      });

      // Graceful shutdown handlers
      this.setupShutdownHandlers();
    } catch (error) {
      logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Close server
      this.httpServer.close(() => {
        logger.info('HTTP server closed');
      });

      // Close Socket.IO
      this.io.close(() => {
        logger.info('Socket.IO server closed');
      });

      try {
        // Close database
        await db.close();
        logger.info('Database connection closed');

        // Close Redis
        await redis.disconnect();
        logger.info('Redis connection closed');

        // Close Mediasoup
        await mediasoupService.close();
        logger.info('Mediasoup workers closed');

        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  }
}

// Create and start server
const server = new MeetServer();
server.start();

export default server;
