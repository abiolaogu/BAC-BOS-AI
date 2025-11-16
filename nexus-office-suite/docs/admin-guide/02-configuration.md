# NEXUS Platform Configuration Guide

**Version**: 1.0
**Last Updated**: November 2025
**Audience**: System Administrators

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Configuration](#database-configuration)
3. [Email Configuration](#email-configuration)
4. [Storage Configuration](#storage-configuration)
5. [Authentication Settings](#authentication-settings)
6. [OAuth Providers](#oauth-providers)

---

## Environment Variables

### Core Configuration

```bash
# Application
NODE_ENV=production
PORT=8000
DOMAIN=nexus.yourdomain.com
PROTOCOL=https
BASE_URL=https://nexus.yourdomain.com

# Security
JWT_SECRET=<generate-with-openssl-rand-base64-32>
SESSION_SECRET=<generate-with-openssl-rand-base64-32>
ENCRYPTION_KEY=<generate-32-char-random-string>
COOKIE_SECRET=<generate-with-openssl-rand-base64-32>

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_GOOGLE_AUTH=true
ENABLE_MICROSOFT_AUTH=true
ENABLE_GITHUB_AUTH=false
ENABLE_EMAIL_VERIFICATION=true
ENABLE_2FA=true
```

### Database Settings

```bash
# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=nexus
POSTGRES_USER=nexus
POSTGRES_PASSWORD=<strong-password>
POSTGRES_SSL_MODE=require  # require, verify-full, or disable

# Connection Pool
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=5000

# Read Replicas (optional)
POSTGRES_READ_REPLICAS=replica1.db.local:5432,replica2.db.local:5432
```

### Cache Configuration

```bash
# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>
REDIS_DB=0
REDIS_TLS=false

# Redis Cluster (if using)
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379
```

### Storage Configuration

```bash
# MinIO / S3
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=<strong-password>
MINIO_BUCKET=nexus-files
MINIO_REGION=us-east-1
MINIO_USE_SSL=false

# AWS S3 (alternative)
AWS_S3_BUCKET=nexus-production
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
```

---

## Database Configuration

### PostgreSQL Optimization

**/etc/postgresql/15/main/postgresql.conf**:

```conf
# Memory
shared_buffers = 4GB  # 25% of RAM
effective_cache_size = 12GB  # 75% of RAM
work_mem = 64MB
maintenance_work_mem = 1GB

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Connections
max_connections = 200
max_prepared_transactions = 100

# WAL
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB

# Logging
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_min_duration_statement = 1000  # Log slow queries > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### Connection Pooling (PgBouncer)

**/etc/pgbouncer/pgbouncer.ini**:

```ini
[databases]
nexus = host=localhost port=5432 dbname=nexus

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
```

### Replication Setup

**Primary Server**:
```sql
-- Create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '<strong-password>';

-- Allow replication connections
-- In pg_hba.conf:
host replication replicator <replica-ip>/32 md5
```

**Replica Server**:
```bash
# Stop PostgreSQL
systemctl stop postgresql

# Remove old data
rm -rf /var/lib/postgresql/15/main/*

# Base backup from primary
pg_basebackup -h primary-host -D /var/lib/postgresql/15/main -U replicator -P -v -R

# Start PostgreSQL
systemctl start postgresql
```

---

## Email Configuration

### SMTP Settings

**Gmail (App Password)**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # Use STARTTLS
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<16-char-app-password>
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=NEXUS Platform
```

**Microsoft 365**:
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourcompany.com
SMTP_PASSWORD=<password>
SMTP_FROM=noreply@yourcompany.com
```

**SendGrid**:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_FROM=noreply@yourdomain.com
```

**Amazon SES**:
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<ses-smtp-username>
SMTP_PASSWORD=<ses-smtp-password>
SMTP_FROM=noreply@yourdomain.com
```

### Email Templates

Configure in Admin Panel → Email Settings:

- **Welcome Email**: Sent to new users
- **Password Reset**: Reset password link
- **Email Verification**: Verify email address
- **Meeting Invite**: Meeting invitation
- **Document Share**: File sharing notification
- **Comment Notification**: New comments
- **Weekly Digest**: Weekly activity summary

---

## Storage Configuration

### MinIO Setup

**Initialize Buckets**:
```bash
# Using mc (MinIO Client)
mc alias set myminio http://minio:9000 admin <password>

# Create buckets
mc mb myminio/nexus-files
mc mb myminio/nexus-backups
mc mb myminio/nexus-recordings

# Set policies
mc anonymous set download myminio/nexus-files/public
mc anonymous set private myminio/nexus-files/private
```

**Lifecycle Policies**:
```json
{
  "Rules": [
    {
      "ID": "DeleteOldRecordings",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "recordings/"
      },
      "Expiration": {
        "Days": 90
      }
    },
    {
      "ID": "DeleteTrashedFiles",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "trash/"
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

### AWS S3 Configuration

```bash
# Create S3 buckets
aws s3 mb s3://nexus-files-production
aws s3 mb s3://nexus-backups-production

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket nexus-files-production \
  --versioning-configuration Status=Enabled

# Configure lifecycle
aws s3api put-bucket-lifecycle-configuration \
  --bucket nexus-files-production \
  --lifecycle-configuration file://s3-lifecycle.json

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket nexus-files-production \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### CDN Configuration (CloudFront)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name nexus-files-production.s3.amazonaws.com \
  --default-root-object index.html

# Update NEXUS configuration
CDN_URL=https://d1234567890.cloudfront.net
```

---

## Authentication Settings

### Password Policy

Configure in Admin Panel → Security Settings:

```yaml
password_policy:
  min_length: 8
  require_uppercase: true
  require_lowercase: true
  require_numbers: true
  require_special_chars: true
  prevent_common_passwords: true
  prevent_user_info: true  # Name, email, etc.
  max_age_days: 90
  prevent_reuse: 5  # Last 5 passwords
```

### Session Configuration

```bash
# Session Settings
SESSION_DURATION=86400  # 24 hours in seconds
SESSION_IDLE_TIMEOUT=3600  # 1 hour
SESSION_ABSOLUTE_TIMEOUT=259200  # 3 days
REMEMBER_ME_DURATION=2592000  # 30 days

# Cookie Settings
COOKIE_SECURE=true  # HTTPS only
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=lax
```

### Two-Factor Authentication

```bash
# Enable 2FA
ENABLE_2FA=true
2FA_ISSUER=NEXUS Platform
2FA_WINDOW=1  # Allow 1 period before/after
2FA_BACKUP_CODES=10  # Number of backup codes

# Supported methods
2FA_METHODS=totp,sms,email
```

---

## OAuth Providers

### Google OAuth

1. **Create OAuth Client**:
   - Go to Google Cloud Console
   - APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://nexus.yourdomain.com/auth/google/callback`

2. **Configure NEXUS**:
```bash
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_CALLBACK_URL=https://nexus.yourdomain.com/auth/google/callback
GOOGLE_SCOPE=profile email
```

### Microsoft OAuth

1. **Register App**:
   - Azure Portal → App registrations
   - New registration
   - Redirect URI: `https://nexus.yourdomain.com/auth/microsoft/callback`

2. **Configure NEXUS**:
```bash
MICROSOFT_CLIENT_ID=<application-id>
MICROSOFT_CLIENT_SECRET=<client-secret>
MICROSOFT_TENANT_ID=<tenant-id>  # Or 'common' for multi-tenant
MICROSOFT_CALLBACK_URL=https://nexus.yourdomain.com/auth/microsoft/callback
```

### GitHub OAuth

1. **Create OAuth App**:
   - GitHub Settings → Developer settings → OAuth Apps
   - New OAuth App
   - Authorization callback URL: `https://nexus.yourdomain.com/auth/github/callback`

2. **Configure NEXUS**:
```bash
GITHUB_CLIENT_ID=<client-id>
GITHUB_CLIENT_SECRET=<client-secret>
GITHUB_CALLBACK_URL=https://nexus.yourdomain.com/auth/github/callback
```

### SAML SSO

```bash
# SAML Configuration
SAML_ENABLED=true
SAML_ENTRY_POINT=https://idp.example.com/saml
SAML_ISSUER=nexus.yourdomain.com
SAML_CALLBACK_URL=https://nexus.yourdomain.com/auth/saml/callback
SAML_CERT=<idp-certificate>
SAML_PRIVATE_KEY=<sp-private-key>
```

### LDAP/Active Directory

```bash
# LDAP Configuration
LDAP_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=<password>
LDAP_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_SEARCH_FILTER=(uid={{username}})
LDAP_USERNAME_FIELD=uid
LDAP_EMAIL_FIELD=mail
LDAP_NAME_FIELD=cn
```

---

## Advanced Configuration

### Rate Limiting

```bash
# API Rate Limits
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Per-endpoint limits (in code/config)
rate_limits:
  login: 5 per 15 minutes
  api: 1000 per hour
  upload: 100 per hour
```

### CORS Configuration

```bash
# Allowed Origins
CORS_ORIGIN=https://nexus.yourdomain.com,https://meet.yourdomain.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_ALLOWED_HEADERS=Content-Type,Authorization
```

### WebSocket Configuration

```bash
# Socket.IO
WEBSOCKET_PORT=3008
WEBSOCKET_PATH=/socket.io
WEBSOCKET_CORS_ORIGIN=*
WEBSOCKET_TRANSPORTS=websocket,polling
```

### Video Conferencing (NEXUS Meet)

```bash
# WebRTC Configuration
TURN_SERVER_URL=turn:turn.yourdomain.com:3478
TURN_USERNAME=turnuser
TURN_PASSWORD=<strong-password>
STUN_SERVER_URL=stun:stun.l.google.com:19302

# Recording
RECORDING_ENABLED=true
RECORDING_STORAGE=s3  # or local, minio
RECORDING_MAX_DURATION=7200  # 2 hours
RECORDING_RETENTION_DAYS=90
```

---

**Previous**: [Installation](01-installation.md) | **Next**: [User Management →](03-user-management.md)
