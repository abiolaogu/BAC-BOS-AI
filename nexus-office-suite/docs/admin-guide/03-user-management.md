# User Management Guide

**Version**: 1.0
**Last Updated**: November 2025
**Audience**: System Administrators

---

## Table of Contents

1. [Creating Users](#creating-users)
2. [Managing Roles and Permissions](#managing-roles-and-permissions)
3. [Multi-Tenancy Setup](#multi-tenancy-setup)
4. [SSO Configuration](#sso-configuration)
5. [MFA Setup](#mfa-setup)

---

## Creating Users

### Manual User Creation

**Via Admin Panel**:
1. Log in as admin
2. Navigate to **Admin Panel** → **Users**
3. Click **"Add User"**
4. Fill in details:
   - Email address
   - Full name
   - Role (Admin, User, Guest)
   - Organization/Tenant
5. Send invitation email or set temporary password
6. Click **"Create User"**

**Via CLI**:
```bash
# Docker
docker compose exec api-gateway npm run create-user -- \
  --email user@example.com \
  --name "John Doe" \
  --role user

# Kubernetes
kubectl exec -it $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') \
  -- npm run create-user -- --email user@example.com --name "John Doe"
```

**Via API**:
```bash
curl -X POST https://nexus.yourdomain.com/api/admin/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "tenant_id": "default"
  }'
```

### Bulk User Import

**CSV Import**:
1. Prepare CSV file:
```csv
email,name,role,department
john.doe@company.com,John Doe,user,Engineering
jane.smith@company.com,Jane Smith,user,Marketing
```

2. Import via Admin Panel:
   - Admin Panel → Users → **"Import Users"**
   - Upload CSV file
   - Map columns
   - Preview and confirm
   - Users created and invitation emails sent

**LDAP/AD Sync**:
```bash
# Enable LDAP sync
LDAP_SYNC_ENABLED=true
LDAP_SYNC_INTERVAL=3600  # Sync every hour

# Run manual sync
docker compose exec auth-service node scripts/sync-ldap-users.js
```

---

## Managing Roles and Permissions

### Default Roles

**Super Admin**:
- Full platform access
- Manage all organizations
- System configuration
- User management across all tenants

**Organization Admin**:
- Manage users in their organization
- Configure organization settings
- View usage and analytics
- Manage billing

**User** (default):
- Create and edit own documents
- Share with others
- Join meetings
- Use all applications

**Guest**:
- View-only access
- Join meetings
- Comment on documents
- No creation rights

### Custom Roles

Create custom roles with specific permissions:

1. Admin Panel → **Roles** → **"Create Role"**
2. Configure permissions:
   ```yaml
   role: Content Manager
   permissions:
     documents:
       - create
       - read
       - update
       - delete
       - share
     users:
       - read
     settings:
       - none
   ```

### Permission Model

**Resource-Based Permissions**:
- `documents.*` - Document operations
- `spreadsheets.*` - Spreadsheet operations
- `presentations.*` - Presentation operations
- `files.*` - File operations
- `meetings.*` - Meeting operations
- `users.read` - View users
- `users.write` - Manage users
- `admin.*` - Admin operations

---

## Multi-Tenancy Setup

### Creating Organizations/Tenants

**Via Admin Panel**:
1. Admin Panel → **Organizations** → **"Add Organization"**
2. Configure:
   - Organization name
   - Subdomain (optional): `acme.nexus.yourdomain.com`
   - Plan (Free, Pro, Enterprise)
   - Storage quota
   - User limit
3. Create organization admin
4. Set branding and customization

**Via CLI**:
```bash
docker compose exec api-gateway npm run create-tenant -- \
  --name "Acme Corporation" \
  --subdomain acme \
  --plan enterprise \
  --admin-email admin@acme.com
```

### Tenant Isolation

**Database Isolation** (Recommended):
- Each tenant has separate schema
- Row-level security enforced
- Complete data isolation

**Configure**:
```sql
-- Create tenant schema
CREATE SCHEMA tenant_acme;

-- Grant permissions
GRANT ALL ON SCHEMA tenant_acme TO nexus;

-- Set row-level security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  FOR ALL
  TO nexus
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Tenant Settings

```yaml
tenant_settings:
  # Storage
  storage_quota: 1TB
  file_size_limit: 5GB

  # Users
  max_users: 500
  allow_guest_users: true

  # Features
  enabled_apps:
    - writer
    - sheets
    - slides
    - drive
    - meet

  # Security
  enforce_2fa: false
  password_expiry_days: 90
  session_timeout_minutes: 60

  # Branding
  logo_url: https://cdn.acme.com/logo.png
  primary_color: "#0066CC"
  custom_domain: workspace.acme.com
```

---

## SSO Configuration

### SAML 2.0 Setup

**1. Configure Identity Provider (IdP)**:
- Add NEXUS as Service Provider
- Entity ID: `https://nexus.yourdomain.com`
- ACS URL: `https://nexus.yourdomain.com/auth/saml/callback`
- Attributes: email, firstName, lastName

**2. Configure NEXUS**:
```bash
# Admin Panel → SSO Settings
SAML_ENABLED=true
SAML_ENTRY_POINT=https://idp.example.com/saml/sso
SAML_ISSUER=nexus.yourdomain.com
SAML_CERT="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
```

**3. Attribute Mapping**:
```json
{
  "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
}
```

### OAuth 2.0 / OpenID Connect

**Azure AD Integration**:
```bash
# Environment variables
AZURE_AD_TENANT_ID=<tenant-id>
AZURE_AD_CLIENT_ID=<client-id>
AZURE_AD_CLIENT_SECRET=<client-secret>
AZURE_AD_CALLBACK_URL=https://nexus.yourdomain.com/auth/azure/callback
```

**Okta Integration**:
```bash
OKTA_DOMAIN=<your-domain>.okta.com
OKTA_CLIENT_ID=<client-id>
OKTA_CLIENT_SECRET=<client-secret>
OKTA_CALLBACK_URL=https://nexus.yourdomain.com/auth/okta/callback
```

### Just-In-Time (JIT) Provisioning

Auto-create users on first SSO login:

```yaml
sso_jit_provisioning:
  enabled: true
  default_role: user
  attribute_mapping:
    email: email
    name: displayName
    department: department
    job_title: jobTitle
  create_user_on_login: true
  update_user_on_login: true
```

---

## MFA Setup

### Enable MFA Platform-Wide

```bash
# Admin Panel → Security → MFA Settings
MFA_ENABLED=true
MFA_REQUIRED=false  # Optional for all users
MFA_REQUIRED_FOR_ADMINS=true  # Mandatory for admins
```

### Supported MFA Methods

**1. TOTP (Time-Based One-Time Password)**:
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password

**2. SMS**:
```bash
# Configure SMS provider (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<account-sid>
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_PHONE_NUMBER=+1234567890
```

**3. Email**:
- Send OTP to registered email
- Fallback method

**4. Hardware Keys** (FIDO2/WebAuthn):
- YubiKey
- Titan Security Key

### User MFA Setup

**Admin Enforcing MFA**:
1. Admin Panel → Users → Select user
2. Click **"Require MFA"**
3. User prompted to set up on next login

**User Self-Setup**:
1. User Settings → Security → **"Enable 2FA"**
2. Choose method (TOTP, SMS, etc.)
3. Follow setup wizard
4. Save backup codes
5. Verify with test code

### Recovery Codes

```bash
# Generate recovery codes
docker compose exec auth-service node scripts/generate-recovery-codes.js \
  --user-id <user-id>

# Returns 10 single-use codes:
# 1A2B-3C4D
# 5E6F-7G8H
# ...
```

### MFA Policies

```yaml
mfa_policy:
  # When to require MFA
  require_for_roles:
    - admin
    - org_admin

  require_for_actions:
    - change_password
    - change_email
    - delete_account
    - export_data

  # Trusted devices
  remember_device: true
  remember_device_days: 30

  # Grace period
  grace_period_days: 7  # Days to set up MFA after requirement
```

---

## User Lifecycle Management

### User Suspension

```bash
# Suspend user (keeps data, blocks access)
curl -X POST https://nexus.yourdomain.com/api/admin/users/<user-id>/suspend \
  -H "Authorization: Bearer <admin-token>"

# Reactivate
curl -X POST https://nexus.yourdomain.com/api/admin/users/<user-id>/activate \
  -H "Authorization: Bearer <admin-token>"
```

### User Deletion

**Soft Delete** (recommended):
- User marked as deleted
- Data retained for 30 days
- Can be restored

**Hard Delete**:
- User and all data permanently deleted
- Cannot be undone
- Complies with GDPR right to be forgotten

```bash
# Soft delete
docker compose exec api-gateway npm run delete-user -- \
  --user-id <user-id> --soft

# Hard delete (after 30 days)
docker compose exec api-gateway npm run delete-user -- \
  --user-id <user-id> --hard
```

### Data Export (GDPR)

```bash
# Export user data
docker compose exec api-gateway npm run export-user-data -- \
  --user-id <user-id> \
  --output /tmp/user-data-export.zip

# Includes:
# - Profile information
# - Documents, spreadsheets, presentations
# - Files from Drive
# - Emails and calendar events
# - Chat history
# - Activity logs
```

---

**Previous**: [Configuration](02-configuration.md) | **Next**: [Monitoring →](04-monitoring.md)
