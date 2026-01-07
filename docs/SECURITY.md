# Security Best Practices

This document outlines the security measures implemented in the BAC-BOS-AI platform and best practices for maintaining security.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Password Security](#password-security)
3. [JWT Token Security](#jwt-token-security)
4. [API Security](#api-security)
5. [Data Protection](#data-protection)
6. [Infrastructure Security](#infrastructure-security)
7. [Security Checklist](#security-checklist)

---

## Authentication & Authorization

### Multi-Factor Authentication (MFA)

The platform supports TOTP-based MFA:

- Time-based One-Time Passwords (RFC 6238)
- Compatible with Google Authenticator, Authy, etc.
- Cryptographically secure backup codes
- MFA can be enabled/disabled per user

### Session Management

- JWT-based stateless authentication
- Refresh token rotation
- Session invalidation on logout
- Support for "logout from all devices"

### OAuth2 Integration

Supported OAuth providers:
- Google
- Microsoft

---

## Password Security

### Password Requirements

All passwords must meet these requirements:

| Requirement | Minimum |
|-------------|---------|
| Length | 8 characters |
| Uppercase letters | 1 |
| Lowercase letters | 1 |
| Numbers | 1 |
| Special characters | 1 |

### Password Storage

- Passwords are hashed using bcrypt
- Minimum 10 salt rounds
- Never store plaintext passwords
- Password comparison uses constant-time algorithms

### Password Reset

- Time-limited reset tokens (1 hour)
- Tokens are single-use
- Email verification required
- Rate limiting on reset requests

---

## JWT Token Security

### Token Configuration

```typescript
// Access Token
{
  algorithm: 'HS256',
  expiresIn: '1h',
  issuer: 'nexus-auth'
}

// Refresh Token
{
  expiresIn: '7d',
  rotation: true
}
```

### Security Measures

1. **Strong Secrets**: Minimum 32-character random secrets
2. **Short Expiration**: Access tokens expire in 1 hour
3. **Refresh Rotation**: New refresh token issued on each use
4. **Secure Transport**: Tokens only transmitted over HTTPS

### Token Storage (Frontend)

⚠️ **Important**: Store tokens securely

**Recommended:**
- HTTP-only cookies (when possible)
- Secure cookies with SameSite attribute

**Current Implementation:**
- localStorage (with XSS protections via CSP)

---

## API Security

### Security Headers

The following headers are enforced:

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
});
```

### Rate Limiting

Implement rate limiting on sensitive endpoints:

```typescript
// Example: Login endpoint
rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts'
});
```

### Input Validation

- All inputs validated using Joi schemas
- SQL parameterized queries prevent injection
- Output encoding prevents XSS
- File upload validation

### CORS Configuration

```typescript
cors({
  origin: allowedOrigins, // Explicit whitelist
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});
```

---

## Data Protection

### Encryption

**At Rest:**
- Database encryption (PostgreSQL)
- File storage encryption (MinIO/S3)

**In Transit:**
- TLS 1.2+ for all connections
- SSL for database connections
- HTTPS for all API endpoints

### Sensitive Data Handling

1. **Never log sensitive data**
   - Passwords
   - Tokens
   - API keys
   - Personal information

2. **Mask sensitive fields in responses**
   ```typescript
   const { password_hash, mfa_secret, ...safeUser } = user;
   ```

3. **Use environment variables for secrets**
   - Never hardcode credentials
   - Use secret management in production

### Data Retention

- Implement data retention policies
- Secure deletion of old data
- Audit logging for sensitive operations

---

## Infrastructure Security

### Container Security

1. **Base Images**
   - Use minimal base images (Alpine)
   - Regularly update base images
   - Scan for vulnerabilities

2. **Non-Root Users**
   ```dockerfile
   RUN adduser -D appuser
   USER appuser
   ```

3. **Resource Limits**
   ```yaml
   resources:
     limits:
       memory: "256Mi"
       cpu: "500m"
   ```

### Network Security

1. **Service Mesh**
   - Use Istio for mTLS between services
   - Network policies to restrict traffic

2. **Firewall Rules**
   - Only expose necessary ports
   - Restrict database access to internal networks

### Secret Management

**Development:**
- `.env` files (gitignored)

**Production:**
- HashiCorp Vault
- Kubernetes Secrets
- Cloud provider secret managers

---

## Security Checklist

### Before Deployment

- [ ] All secrets are strong and unique
- [ ] JWT secrets are at least 32 characters
- [ ] Database passwords are not defaults
- [ ] SSL/TLS is enabled for all connections
- [ ] CORS origins are explicitly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] Input validation is implemented
- [ ] Dependency vulnerabilities are scanned

### Regular Maintenance

- [ ] Rotate secrets periodically
- [ ] Update dependencies
- [ ] Review access logs
- [ ] Audit authentication attempts
- [ ] Test backup restoration
- [ ] Conduct security assessments

### Incident Response

1. **Detection** - Monitor logs and alerts
2. **Containment** - Isolate affected systems
3. **Eradication** - Remove threat
4. **Recovery** - Restore from backups
5. **Lessons Learned** - Update procedures

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** disclose publicly
2. Email security details to the security team
3. Provide detailed reproduction steps
4. Allow time for remediation before disclosure

---

## Dependencies

### Security Packages Used

| Package | Purpose |
|---------|---------|
| `bcrypt` | Password hashing |
| `jsonwebtoken` | JWT handling |
| `helmet` | Security headers |
| `cors` | CORS handling |
| `joi` | Input validation |
| `otplib` | TOTP generation |
| `crypto` | Cryptographic operations |

### Vulnerability Scanning

Run regular security audits:

```bash
# Node.js projects
npm audit

# Check for updates
npm outdated
```
