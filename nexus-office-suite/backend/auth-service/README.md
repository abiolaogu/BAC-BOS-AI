# NEXUS Authentication Service

Centralized SSO (Single Sign-On) authentication service for the NEXUS Office Suite platform.

## Features

- **User Registration & Login**: Email/password authentication
- **JWT Tokens**: Access and refresh token management
- **OAuth2/OIDC**: Google and Microsoft authentication
- **Multi-Factor Authentication**: TOTP-based MFA with QR codes
- **Password Management**: Reset, change, and recovery
- **Email Verification**: User email verification flow
- **Session Management**: Track and manage user sessions
- **Security**: Bcrypt password hashing, secure token handling

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure the following:

- Database connection (PostgreSQL)
- JWT secrets
- OAuth credentials (Google, Microsoft)
- SMTP settings for emails
- Application URLs

## Database Setup

Run the migration to create tables:

```sql
psql -U postgres -d nexus_auth -f src/migrations/001_initial_schema.sql
```

Or use your preferred migration tool.

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t nexus-auth-service .
docker run -p 3001:3001 --env-file .env nexus-auth-service
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (invalidate refresh token)
- `POST /auth/logout-all` - Logout from all devices
- `GET /auth/me` - Get current user info

### Password Management

- `POST /auth/reset-password/request` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/change-password` - Change password (authenticated)

### Email Verification

- `GET /auth/verify-email/:token` - Verify email address

### OAuth

- `GET /oauth/google` - Initiate Google OAuth flow
- `GET /oauth/google/callback` - Google OAuth callback
- `GET /oauth/microsoft` - Initiate Microsoft OAuth flow
- `GET /oauth/microsoft/callback` - Microsoft OAuth callback

### Multi-Factor Authentication

- `POST /mfa/setup` - Get MFA QR code
- `POST /mfa/enable` - Enable MFA with verification
- `POST /mfa/disable` - Disable MFA
- `POST /mfa/verify` - Verify MFA token
- `POST /mfa/backup-codes` - Generate backup codes

## Request/Response Examples

### Register

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Response
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "uuid"
}
```

### Refresh Token

```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "uuid"
}

# Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "new-uuid"
}
```

## Security Considerations

- Passwords are hashed using bcrypt with configurable rounds
- JWT tokens are signed with HS256 algorithm
- Refresh tokens are stored securely in the database
- Sessions have expiration times
- Email verification required for new accounts
- Rate limiting should be implemented at the API Gateway level
- HTTPS required in production
- Environment variables for all secrets

## Database Schema

### Users Table

- `id` (UUID, primary key)
- `email` (unique, indexed)
- `password_hash`
- `first_name`, `last_name`
- `tenant_id` (for multi-tenancy)
- `roles` (array)
- `oauth_provider`, `oauth_id`
- `mfa_enabled`, `mfa_secret`
- `email_verified`, `is_active`
- Timestamps

### Sessions Table

- `id` (UUID, primary key)
- `user_id` (foreign key)
- `refresh_token` (unique, indexed)
- `device_info`, `ip_address`
- `expires_at` (indexed)
- `created_at`

## Integration

This service integrates with:

- **API Gateway**: Routes all `/api/auth/*` requests here
- **All Services**: Validates JWT tokens from requests
- **Email Service**: Sends verification and password reset emails
- **Frontend**: OAuth callbacks and token management

## License

MIT
