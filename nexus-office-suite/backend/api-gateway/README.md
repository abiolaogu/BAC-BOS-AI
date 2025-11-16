# NEXUS API Gateway

The centralized API Gateway for the NEXUS Office Suite platform. This service handles routing, authentication, rate limiting, and provides a unified entry point for all microservices.

## Features

- **Request Routing**: Routes requests to appropriate backend services
- **Authentication**: JWT token validation and user context forwarding
- **Rate Limiting**: Per-user and per-tenant rate limiting with Redis
- **CORS Management**: Configurable cross-origin resource sharing
- **Request/Response Logging**: Comprehensive logging with Winston
- **Service Health Checks**: Monitor health of all backend services
- **Compression**: Response compression for better performance
- **Security**: Helmet.js for security headers

## Architecture

The gateway acts as a reverse proxy, forwarding requests to the following services:

- **Auth Service** (`/api/auth`) - Authentication and authorization
- **Writer Service** (`/api/writer`) - Document editing
- **Sheets Service** (`/api/sheets`) - Spreadsheet management
- **Slides Service** (`/api/slides`) - Presentation creation
- **Drive Service** (`/api/drive`) - File storage
- **Meet Service** (`/api/meet`) - Video conferencing
- **Notification Service** (`/api/notifications`) - Real-time notifications
- **Collaboration Service** (`/api/collaboration`) - Real-time collaboration

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:

- `PORT` - Gateway port (default: 8000)
- `JWT_SECRET` - Secret for JWT validation
- `REDIS_HOST` - Redis host for rate limiting
- `*_SERVICE_URL` - URLs for backend services
- `CORS_ORIGIN` - Allowed CORS origins

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t nexus-api-gateway .
docker run -p 8000:8000 --env-file .env nexus-api-gateway
```

## API Endpoints

### Health Checks

- `GET /health` - Gateway health check
- `GET /health/system` - System-wide health check (all services)

### Proxied Routes

All `/api/*` routes are proxied to their respective microservices:

- `/api/auth/*` → Auth Service
- `/api/writer/*` → Writer Service
- `/api/sheets/*` → Sheets Service
- `/api/slides/*` → Slides Service
- `/api/drive/*` → Drive Service
- `/api/meet/*` → Meet Service
- `/api/notifications/*` → Notification Service
- `/api/collaboration/*` → Collaboration Service

## Authentication

Most endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Public endpoints (no authentication required):
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/refresh`
- `/api/auth/oauth/*`
- `/api/auth/reset-password`

## Rate Limiting

- **General**: 100 requests per 15 minutes per IP/user
- **Authentication**: 5 requests per 15 minutes per IP
- **Tenant**: 1000 requests per minute per tenant

## Request Headers

The gateway forwards user context to backend services via headers:

- `X-User-Id` - User ID from JWT
- `X-User-Email` - User email from JWT
- `X-Tenant-Id` - Tenant ID from JWT
- `X-User-Roles` - User roles (comma-separated)

## Error Handling

Standard error responses:

```json
{
  "error": "Error name",
  "message": "Detailed error message"
}
```

Status codes:
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `429` - Too Many Requests (rate limit exceeded)
- `502` - Bad Gateway (service unavailable)
- `503` - Service Unavailable (system unhealthy)

## Monitoring

Logs are written to:
- Console (formatted)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

## Kong Alternative

An optional Kong declarative configuration (`kong.yml`) is provided if you prefer to use Kong instead of the custom Node.js gateway.

## License

MIT
