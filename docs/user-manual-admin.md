# User Manual: Administrator -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Introduction

This manual is designed for platform administrators responsible for managing the BAC-BOS-AI (NEXUS Business Operating System) environment. Administrators configure tenants, manage users, monitor platform health, and oversee integrations and security settings.

### 1.1 Administrator Roles
| Role | Scope | Responsibilities |
|------|-------|-----------------|
| Platform Admin | Entire platform | Infrastructure, multi-tenant management, global settings |
| Tenant Admin | Single tenant | Users, modules, billing, integrations within their tenant |
| Security Admin | Security scope | Authentication policies, audit logs, compliance |

---

## 2. Accessing the Admin Console

### 2.1 Login
1. Navigate to `https://admin.nexus.bac.cloud`
2. Enter your administrator email and password
3. Complete MFA verification (TOTP, SMS, or email OTP)
4. Upon successful authentication, you are directed to the Admin Dashboard

### 2.2 Dashboard Overview
The Admin Dashboard provides at-a-glance metrics:
- **Active Tenants**: Total count and recent activations
- **System Health**: Service status indicators (green/yellow/red) for all 25+ microservices
- **Resource Utilization**: CPU, memory, storage across Kubernetes nodes
- **Recent Events**: Latest activation requests, error logs, and audit entries
- **Billing Summary**: Current month revenue, subscription distribution

---

## 3. Tenant Management

### 3.1 Activating a New Tenant
1. Navigate to **Tenants > Activate New**
2. Enter or paste the BusinessActivationInput JSON payload, or fill in the guided form:
   - Business name, region, currency, industry
   - Team size, communication channels, payment providers
   - Feature toggles, deployment preferences, branding
3. Click **Activate** to trigger the 7-step provisioning pipeline
4. Monitor progress on the Activation Status page (typically < 5 minutes)
5. Upon completion, download the tenant credentials package (admin email, password, API keys)

### 3.2 Viewing Tenant Details
1. Navigate to **Tenants > List**
2. Use search and filter controls (by name, region, plan, status)
3. Click a tenant row to view details:
   - **Overview**: Plan, status, enabled modules, creation date
   - **Users**: List of tenant users with roles
   - **Usage**: API calls, storage, email volume
   - **Settings**: JSONB settings, limits, metadata
   - **Integrations**: Configured payment gateways and external connectors

### 3.3 Modifying Tenant Plans
1. Open the tenant detail page
2. Click **Change Plan** in the Overview section
3. Select the target plan (Starter, Professional, Enterprise, Custom)
4. Review the changes to resource limits and module access
5. Confirm the plan change; adjustments take effect immediately

### 3.4 Suspending or Deactivating a Tenant
1. Open the tenant detail page
2. Click **Actions > Suspend** (temporary) or **Actions > Deactivate** (permanent)
3. For suspension: All tenant services are paused; data is retained
4. For deactivation: A 30-day grace period begins before data deletion
5. Confirm the action with your admin password

---

## 4. User Management

### 4.1 Creating Users
1. Navigate to **Users > Add User** (platform-level) or within a specific tenant
2. Enter: email, first name, last name, phone (optional)
3. Assign role: Owner, Admin, Manager, Member, Viewer, Guest
4. Set initial password or send invitation email
5. Optionally enable MFA requirement for the user

### 4.2 Managing Roles and Permissions
1. Navigate to **Settings > Roles & Permissions**
2. View predefined roles and their permission sets
3. To create a custom role: Click **Create Role**, name it, and select granular permissions
4. Assign custom roles to users via the User Detail page

### 4.3 Audit Logs
1. Navigate to **Security > Audit Logs**
2. View chronological log of all administrative actions:
   - User login/logout, failed authentication attempts
   - Tenant creation, modification, deletion
   - Role changes, permission updates
   - Configuration changes, integration updates
3. Filter by date range, user, action type, or tenant
4. Export logs in CSV or JSON format for compliance reporting

---

## 5. Module Configuration

### 5.1 Enabling and Disabling Modules
1. Open the tenant detail page or navigate to **Modules**
2. Toggle modules on/off:
   - CRM, Finance, HR, Projects, Marketing, Support, Inventory, Documents
   - Office Suite: Mail, Drive, Writer, Sheets, Slides, Calendar, Chat, Meet
   - AI Copilots, eCommerce, ERP
3. Changes propagate within 60 seconds (ArgoCD sync)

### 5.2 AI Service Configuration
1. Navigate to **AI > Settings**
2. Configure LLM provider preferences:
   - Primary provider (OpenAI, Anthropic, Google, Meta)
   - Fallback provider for automatic failover
   - Token budget per tenant (monthly limit)
   - Guardrail policies (content filtering, PII protection)
3. Manage custom agent definitions under **AI > Agents**
4. Review agent execution history under **AI > Logs**

### 5.3 Payment Gateway Configuration
1. Navigate to **Integrations > Payments**
2. Select provider (Stripe, Paystack, Flutterwave)
3. Enter API credentials (secret key, webhook secret)
4. Configure webhook endpoints (auto-generated for the tenant)
5. Test with a sandbox transaction to verify connectivity

---

## 6. Monitoring and Observability

### 6.1 Service Health Dashboard
1. Navigate to **Monitoring > Services**
2. View real-time status of all microservices:
   - Pod count, CPU/memory usage, restart count
   - Request rate, error rate, latency (P50/P95/P99)
3. Click a service for detailed metrics and recent logs

### 6.2 Grafana Dashboards
1. Access Grafana at `https://grafana.nexus.bac.cloud`
2. Pre-configured dashboards:
   - **Platform Overview**: Cross-service health at a glance
   - **Per-Service Metrics**: Detailed resource and request metrics
   - **Database Performance**: Query latency, connection pool, disk usage
   - **Tenant Activity**: Per-tenant API usage, storage, and active users
   - **AI Service**: Agent execution counts, LLM provider latency, token usage

### 6.3 Alerts and Incident Response
1. Navigate to **Monitoring > Alerts**
2. View active alerts with severity (Critical, Warning, Info)
3. Acknowledge alerts to prevent escalation
4. Configure notification channels: PagerDuty, Slack, email
5. Review alert history and resolution notes

---

## 7. Backup and Recovery

### 7.1 Viewing Backup Status
1. Navigate to **Operations > Backups**
2. View scheduled backup jobs with status (Success, Failed, In Progress)
3. Each entry shows: timestamp, data size, storage location, encryption status

### 7.2 Initiating Manual Backup
1. Click **Create Backup** on the Backups page
2. Select scope: Full platform, specific tenant, or specific service data
3. Confirm and monitor progress

### 7.3 Restoring from Backup
1. Select a backup entry and click **Restore**
2. Choose restoration target (same environment or different)
3. Review the restore plan showing affected tables and estimated duration
4. Confirm with admin password; restoration proceeds with progress tracking

---

## 8. Security Administration

### 8.1 Authentication Policies
1. Navigate to **Security > Authentication**
2. Configure:
   - Password complexity rules (minimum length, character requirements)
   - MFA enforcement (all users, admin-only, optional)
   - Session timeout (idle timeout, absolute timeout)
   - IP allowlisting for admin access
   - Failed login lockout (attempts before lockout, lockout duration)

### 8.2 TLS and Certificate Management
1. Navigate to **Security > Certificates**
2. View active TLS certificates with expiry dates
3. cert-manager handles automatic renewal; manual renewal available for custom domains
4. Upload custom certificates for tenant vanity domains

### 8.3 API Key Management
1. Navigate to **Security > API Keys**
2. View all issued API keys by tenant with creation date, last used, and scope
3. Revoke compromised keys immediately
4. Set rotation reminders (recommended: every 90 days)

---

## 9. Platform Configuration

### 9.1 Global Settings
1. Navigate to **Settings > Global**
2. Configure:
   - Default region for new tenants
   - Default plan for trial activations
   - Trial duration (days)
   - Maximum tenants per region
   - Feature flag defaults

### 9.2 Email and Communication Settings
1. Navigate to **Settings > Communications**
2. Configure platform email (SMTP settings for system notifications)
3. Set default email templates for activation confirmations, password resets, and alerts
4. Configure WhatsApp Business API credentials for platform-level notifications

---

## 10. Troubleshooting

### 10.1 Common Issues

| Issue | Diagnosis | Resolution |
|-------|-----------|------------|
| Activation stuck | Check Activation Status page for step failure | Review Nexus Engine logs; retry failed step |
| Service unhealthy | Check pod status in Monitoring | Review pod logs; restart if CrashLoopBackOff |
| Payment webhook failures | Check Integration logs for HTTP errors | Verify API keys; check webhook URL accessibility |
| Slow API responses | Check Grafana latency dashboards | Scale service replicas; optimize database queries |
| User cannot login | Check Audit Logs for failed auth | Verify credentials; check MFA configuration; unlock account |

### 10.2 Log Access
- **Application Logs**: Monitoring > Logs (Loki integration)
- **Audit Logs**: Security > Audit Logs
- **Infrastructure Logs**: kubectl access for platform admins
- **AI Agent Logs**: AI > Logs (execution history and error details)

---

*For escalation paths and emergency procedures, refer to the incident response runbook maintained by the platform engineering team.*
