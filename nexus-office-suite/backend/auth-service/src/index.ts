import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { UserModel } from './models/user';
import { SessionModel } from './models/session';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { MFAService } from './services/mfa.service';
import { EmailService } from './services/email.service';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import mfaRoutes from './routes/mfa';
import { logger, requestLogger } from './middleware/logger';
import { validateSecurityConfig } from './utils/security';

// Load environment variables
config();

// Validate security configuration at startup
validateSecurityConfig();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nexus_auth',
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
const userModel = new UserModel(pool);
const sessionModel = new SessionModel(pool);
const tokenService = new TokenService();
const emailService = new EmailService();
const mfaService = new MFAService(userModel);
const authService = new AuthService(userModel, sessionModel, tokenService, emailService);

// Middleware - Enhanced Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// CORS configuration - require explicit origins in production
const corsOrigins = process.env.CORS_ORIGIN?.split(',');
if (!corsOrigins && process.env.NODE_ENV === 'production') {
  logger.warn('CORS_ORIGIN not set in production. Using restrictive defaults.');
}
app.use(cors({
  origin: corsOrigins || (process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000']),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/auth', authRoutes(authService, mfaService));
app.use('/oauth', oauthRoutes(authService));
app.use('/mfa', mfaRoutes(mfaService));

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
app.listen(PORT, () => {
  logger.info(`Auth Service started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

export default app;
