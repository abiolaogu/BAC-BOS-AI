import { Router } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { services } from '../config/services';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { logger } from '../middleware/logger';

const router = Router();

// Define which paths require authentication
const publicPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/oauth',
  '/api/auth/reset-password',
];

const isPublicPath = (path: string): boolean => {
  return publicPaths.some((publicPath) => path.startsWith(publicPath));
};

// Create proxy middleware for each service
services.forEach((service) => {
  const proxyOptions: Options = {
    target: service.url,
    changeOrigin: true,
    pathRewrite: {
      [`^${service.path}`]: '', // Remove the prefix when forwarding
    },
    onProxyReq: (proxyReq, req: any) => {
      // Forward user information to backend services
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Email', req.user.email);
        if (req.user.tenantId) {
          proxyReq.setHeader('X-Tenant-Id', req.user.tenantId);
        }
        if (req.user.roles) {
          proxyReq.setHeader('X-User-Roles', req.user.roles.join(','));
        }
      }

      logger.debug('Proxying request', {
        service: service.name,
        path: req.path,
        target: service.url,
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.debug('Proxy response received', {
        service: service.name,
        statusCode: proxyRes.statusCode,
        path: req.path,
      });
    },
    onError: (err, req, res) => {
      logger.error('Proxy error', {
        service: service.name,
        error: err.message,
        path: req.path,
      });

      if (!res.headersSent) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: `Failed to reach ${service.name} service`,
        });
      }
    },
  };

  const proxy = createProxyMiddleware(proxyOptions);

  // Apply authentication middleware based on path
  router.use(service.path, (req, res, next) => {
    if (isPublicPath(req.path)) {
      optionalAuth(req, res, next);
    } else {
      authenticateToken(req, res, next);
    }
  }, proxy);

  logger.info(`Proxy route configured: ${service.path} -> ${service.url}`);
});

export default router;
