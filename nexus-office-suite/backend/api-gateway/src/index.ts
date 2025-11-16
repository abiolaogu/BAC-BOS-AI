import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { logger, requestLogger, errorLogger } from './middleware/logger';
import { generalRateLimiter, initializeRedis } from './middleware/rateLimit';
import proxyRouter from './routes/proxy';
import { getSystemHealth } from './health/checker';

config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(generalRateLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// System health endpoint
app.get('/health/system', async (req: Request, res: Response) => {
  try {
    const health = await getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 207 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('System health check failed', { error });
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to perform health check',
    });
  }
});

// API routes (proxied to microservices)
app.use('/api', proxyRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error logging
app.use(errorLogger);

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize Redis for rate limiting
    await initializeRedis();

    app.listen(PORT, () => {
      logger.info(`API Gateway started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`CORS enabled for: ${corsOptions.origin.join(', ')}`);
    });
  } catch (error) {
    logger.error('Failed to start API Gateway', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
