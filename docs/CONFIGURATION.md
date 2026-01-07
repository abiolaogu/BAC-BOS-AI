# Configuration Guide

This document provides comprehensive guidance for configuring the BAC-BOS-AI platform across different environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Security Configuration](#security-configuration)
4. [Database Configuration](#database-configuration)
5. [Service Configuration](#service-configuration)
6. [Development vs Production](#development-vs-production)
7. [Kubernetes Configuration](#kubernetes-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Generate secure secrets (for production):
   ```bash
   # Generate JWT secrets
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For JWT_REFRESH_SECRET

   # Generate database password
   openssl rand -base64 24
   ```

3. Update `.env` with your values

4. Start the services:
   ```bash
   docker-compose up -d
   ```

---

## Environment Variables

### Core Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode: `development`, `staging`, `production` |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `PORT` | No | Service-specific | HTTP server port |

### Database (PostgreSQL)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | Yes | `postgres` | Database username |
| `POSTGRES_PASSWORD` | Yes | `postgres` | Database password |
| `POSTGRES_DB` | Yes | `nexus` | Database name |
| `DATABASE_URL` | Yes | - | Full connection string |

**Connection String Format:**
```
postgres://user:password@host:port/database?sslmode=MODE
```

**SSL Modes:**
- `disable` - No SSL (development only)
- `require` - Require SSL
- `verify-ca` - Verify server certificate
- `verify-full` - Verify server certificate and hostname

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection URL |

**With Authentication:**
```
redis://:password@host:port
```

### Authentication & Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret for signing JWT tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | **Yes** | - | Secret for refresh tokens (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `1h` | Access token expiration |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins (comma-separated) |

⚠️ **Security Warning:** Always set unique, strong secrets in production. Never use placeholder values!

### Object Storage (MinIO/S3)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MINIO_ENDPOINT` | Yes | `localhost:9000` | MinIO server endpoint |
| `MINIO_ROOT_USER` | Yes | `minioadmin` | Admin username |
| `MINIO_ROOT_PASSWORD` | Yes | `minioadmin` | Admin password |
| `MINIO_ACCESS_KEY` | Yes | - | API access key |
| `MINIO_SECRET_KEY` | Yes | - | API secret key |

### Message Queue (Kafka/Redpanda)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAFKA_BROKERS` | Yes | `localhost:9092` | Comma-separated broker list |

### Monitoring

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GRAFANA_ADMIN_USER` | No | `admin` | Grafana admin username |
| `GRAFANA_ADMIN_PASSWORD` | No | `admin` | Grafana admin password |

---

## Security Configuration

### Password Requirements

The platform enforces strong password policies:

- Minimum 8 characters (12+ recommended)
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;':",.<>?)
- No common patterns (password, 123456, qwerty, etc.)

### JWT Configuration

JWTs are used for authentication. Configure these properly:

```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

**Recommendations:**
- Use different secrets for access and refresh tokens
- Minimum 32 characters for each secret
- Rotate secrets periodically in production
- Never log or expose JWT secrets

### Security Headers

The platform configures the following security headers:

- **Content-Security-Policy** - Restricts resource loading
- **Strict-Transport-Security** - Enforces HTTPS
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **Referrer-Policy** - Controls referrer information

### MFA (Multi-Factor Authentication)

MFA uses TOTP (Time-based One-Time Passwords):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MFA_ISSUER` | No | `NEXUS Office Suite` | Issuer name shown in auth apps |

Backup codes are cryptographically generated and formatted as `XXXX-XXXX`.

---

## Database Configuration

### PostgreSQL Setup

1. **Create the database:**
   ```sql
   CREATE DATABASE nexus;
   CREATE USER nexus_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE nexus TO nexus_user;
   ```

2. **Configure connection:**
   ```bash
   DATABASE_URL=postgres://nexus_user:secure_password@localhost:5432/nexus?sslmode=require
   ```

### Connection Pool Settings

Configure in your service:
- `DB_POOL_MIN=2` - Minimum connections
- `DB_POOL_MAX=10` - Maximum connections

### SSL/TLS Configuration

**For Production:**
```bash
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=/path/to/ca.crt
```

---

## Service Configuration

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| nexus-engine | 8080 | Core provisioning engine |
| crm-service | 8081 | CRM functionality |
| finance-service | 8082 | Financial operations |
| documents-service | 8083 | Document management |
| hr-service | 8084 | Human resources |
| inventory-service | 8085 | Inventory management |
| ai-service | 8086 | AI agents |
| projects-service | 8087 | Project management |
| marketing-service | 8088 | Marketing automation |
| support-service | 8089 | Customer support |
| google-workspace | 8090 | Google integration |
| odoo-integration | 8091 | Odoo integration |
| zoho-integration | 8092 | Zoho integration |

### Infrastructure Ports

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache/Sessions |
| Redpanda | 9092 | Message broker |
| MinIO | 9000/9001 | Object storage |
| Prometheus | 9090 | Metrics |
| Grafana | 3001 | Dashboards |

---

## Development vs Production

### Development Configuration

```bash
NODE_ENV=development
LOG_LEVEL=debug

# Use local services
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nexus?sslmode=disable
REDIS_URL=redis://localhost:6379

# Development defaults are acceptable
JWT_SECRET=dev-secret-for-local-testing-only-32chars
```

### Production Configuration

```bash
NODE_ENV=production
LOG_LEVEL=info

# Secure database connection
DATABASE_URL=postgres://app:${DB_PASSWORD}@db.example.com:5432/nexus?sslmode=verify-full

# Redis with authentication
REDIS_URL=redis://:${REDIS_PASSWORD}@redis.example.com:6379

# Strong, unique secrets (use environment injection)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Explicit CORS origins
CORS_ORIGIN=https://app.example.com,https://admin.example.com
```

### Environment-Specific Files

Create environment-specific docker-compose files:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

---

## Kubernetes Configuration

### ConfigMaps

Non-sensitive configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "8080"
```

### Secrets

Sensitive configuration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  JWT_SECRET: "your-secure-jwt-secret"
  DATABASE_PASSWORD: "your-db-password"
```

### External Secrets

For production, use external secret management:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

---

## Troubleshooting

### Common Issues

#### "JWT_SECRET is required in production"

**Cause:** Running in production without setting JWT secrets.

**Solution:**
```bash
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)
```

#### Database Connection Failed

**Cause:** Incorrect credentials or network issues.

**Checks:**
1. Verify database is running: `pg_isready -h localhost -p 5432`
2. Check credentials in connection string
3. Verify network connectivity
4. Check SSL mode matches server configuration

#### Port Conflict

**Cause:** Multiple services trying to use the same port.

**Solution:**
1. Check current port usage: `netstat -tlnp | grep PORT`
2. Update docker-compose.yml port mappings
3. Ensure no duplicate port assignments

#### CORS Errors

**Cause:** Frontend origin not in allowed list.

**Solution:**
```bash
CORS_ORIGIN=http://localhost:3000,https://your-app.com
```

### Validation Script

Run the configuration validation:

```bash
./scripts/validate-config.sh
```

This checks:
- Required environment variables
- Secret strength
- Port availability
- Database connectivity
- Redis connectivity

---

## Best Practices

1. **Never commit secrets** - Use `.env` files (gitignored) or secret management
2. **Use strong secrets** - Minimum 32 characters, randomly generated
3. **Rotate secrets** - Periodically change production secrets
4. **Least privilege** - Use minimal database permissions
5. **Enable SSL/TLS** - Always in production
6. **Monitor logs** - Set appropriate log levels
7. **Document changes** - Keep configuration changes tracked
