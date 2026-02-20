# Training Manual: Administrator -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Training Overview

This training manual prepares administrators to manage and operate the BAC-BOS-AI (NEXUS Business Operating System) platform. The training is structured as a progressive curriculum from fundamentals through advanced operations.

### 1.1 Training Objectives
Upon completion, administrators will be able to:
- Activate and configure new business tenants
- Manage users, roles, and permissions across tenants
- Monitor platform health and respond to incidents
- Configure integrations (payments, communications, external platforms)
- Perform backup and recovery operations
- Manage security policies and compliance requirements

### 1.2 Training Duration
| Module | Duration | Format |
|--------|----------|--------|
| Module 1: Platform Fundamentals | 2 hours | Self-paced + video |
| Module 2: Tenant Management | 3 hours | Instructor-led + lab |
| Module 3: User and Access Management | 2 hours | Instructor-led + lab |
| Module 4: Monitoring and Operations | 3 hours | Instructor-led + lab |
| Module 5: Security Administration | 2 hours | Instructor-led |
| Module 6: Advanced Operations | 3 hours | Lab-based |
| **Total** | **15 hours** | |

---

## 2. Module 1: Platform Fundamentals

### 2.1 Lesson: Understanding the NEXUS Architecture
**Objective**: Understand the three-layer architecture and how services interact.

**Key Concepts**:
- Orchestration Layer (Nexus Engine): Accepts JSON payloads, executes 7-step provisioning
- Business Logic Layer: 25 microservices (CRM, Finance, HR, AI, Office Suite)
- Platform Layer: Control plane, integrations, MCP orchestrator
- Multi-tenancy: Tenant isolation at database, Kubernetes, Kafka, and MinIO levels

**Activity**: Review the architecture diagram and identify the flow from user request through API gateway, Nexus Engine, and into business services.

### 2.2 Lesson: Technology Stack Overview
**Objective**: Know the technologies powering each layer.

| Layer | Technologies |
|-------|-------------|
| Backend | Go (Gin), Python (FastAPI), TypeScript (NestJS/Express) |
| Databases | PostgreSQL, Redis, Redpanda, MinIO |
| Infrastructure | Kubernetes, Istio, Kong, ArgoCD, Tekton |
| Frontend | Next.js 14, Flutter, TailwindCSS |
| AI | OpenAI, Anthropic, Google, Meta LLMs, MCP Protocol |

**Activity**: Log into the staging environment and verify each infrastructure component is running using `kubectl get pods -A`.

### 2.3 Lesson: Admin Console Navigation
**Objective**: Navigate all sections of the admin console confidently.

**Walkthrough**:
1. Log in at `https://admin.nexus.bac.cloud`
2. Tour the Dashboard: metrics, health indicators, recent events
3. Navigate each section: Tenants, Users, Modules, Monitoring, Security, Settings
4. Understand the relationship between global settings and tenant-level overrides

**Quiz**: Identify where to find active tenant count, service health status, and recent audit log entries.

---

## 3. Module 2: Tenant Management

### 3.1 Lesson: Business Activation Process
**Objective**: Activate a new tenant from scratch using both the GUI and API.

**Lab Exercise 1 -- GUI Activation**:
1. Navigate to Tenants > Activate New
2. Fill in the form for a sample eCommerce business in Lagos, Nigeria
3. Select features: CRM, Finance, Inventory, eCommerce, WhatsApp channel
4. Select payments: Paystack
5. Click Activate and monitor the 7-step pipeline
6. Record: Tenant ID, admin credentials, API endpoints

**Lab Exercise 2 -- API Activation**:
```bash
curl -X POST https://staging.nexus.bac.cloud/api/v1/activate \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "TrainingCo Retail",
    "region": "NG",
    "currency": "NGN",
    "industry": "ecommerce",
    "team_size": 15,
    "channels": ["web", "whatsapp", "pos"],
    "payments": ["paystack"],
    "features": { "crm": true, "ecommerce": true, "inventory": true }
  }'
```

**Validation**: Verify all enabled services are accessible for the new tenant.

### 3.2 Lesson: Tenant Lifecycle Management
**Objective**: Manage tenant plans, suspension, and deactivation.

**Lab Exercise**:
1. Create a Starter plan tenant
2. Upgrade to Professional plan; verify new module access
3. Suspend the tenant; verify services are paused but data retained
4. Reactivate the tenant; verify full functionality restored
5. Deactivate the tenant; verify grace period initiated

### 3.3 Lesson: Industry Presets
**Objective**: Understand how industry presets configure modules automatically.

**Activity**: Compare the enabled modules for each industry preset:
- eCommerce: storefront, cart, checkout, inventory, POS
- Healthcare: patient records, scheduling, HIPAA compliance
- Logistics: fleet tracking, route optimization, warehouse management
- Education: student management, course delivery, assessments

---

## 4. Module 3: User and Access Management

### 4.1 Lesson: User Provisioning
**Objective**: Create users, assign roles, and manage authentication.

**Lab Exercise**:
1. Create 5 test users with different roles (Owner, Admin, Manager, Member, Viewer)
2. Send invitation emails to each user
3. Log in as each user and verify role-appropriate access
4. Document which modules and actions each role can access

### 4.2 Lesson: Custom Roles
**Objective**: Create and manage custom roles with granular permissions.

**Lab Exercise**:
1. Navigate to Settings > Roles & Permissions
2. Create a custom "Sales Lead" role with:
   - CRM: Full access
   - Finance: View invoices only
   - Projects: View assigned tasks only
   - AI: Chat access only
3. Assign the custom role to a test user
4. Verify the permission boundaries are enforced

### 4.3 Lesson: MFA and Security Policies
**Objective**: Configure multi-factor authentication and security settings.

**Lab Exercise**:
1. Enable MFA enforcement for all admin users
2. Configure TOTP-based MFA for your test account
3. Test login flow with MFA
4. Set password complexity requirements (12+ characters, mixed case, symbols)
5. Configure failed login lockout (5 attempts, 30-minute lockout)

---

## 5. Module 4: Monitoring and Operations

### 5.1 Lesson: Service Health Monitoring
**Objective**: Use the monitoring dashboard and Grafana to assess platform health.

**Lab Exercise**:
1. Open the Service Health Dashboard
2. Identify all services and their current status
3. Open Grafana and review the Platform Overview dashboard
4. Create a custom dashboard showing CRM service request rate and latency
5. Set up a Slack alert for when any service P95 latency exceeds 500ms

### 5.2 Lesson: Log Analysis
**Objective**: Use Loki to investigate issues from application logs.

**Lab Exercise**:
1. Open Grafana > Explore > Loki data source
2. Query logs for the finance-service: `{app="finance-service"}`
3. Filter for errors: `{app="finance-service"} |= "error"`
4. Trace a specific request using its request_id across multiple services
5. Document the investigation steps for a sample error scenario

### 5.3 Lesson: Incident Response
**Objective**: Respond to a simulated platform incident.

**Scenario**: The CRM service is returning HTTP 500 errors.

**Steps**:
1. Acknowledge the alert in the monitoring dashboard
2. Check pod status: Are pods running? Any CrashLoopBackOff?
3. Check recent logs for error messages
4. Check database connectivity
5. If needed, restart the service or roll back the last deployment
6. Verify recovery and close the incident with a post-mortem note

---

## 6. Module 5: Security Administration

### 6.1 Lesson: Audit Log Review
**Objective**: Analyze audit logs for security events.

**Lab Exercise**:
1. Navigate to Security > Audit Logs
2. Filter for failed login attempts in the last 24 hours
3. Identify any unusual patterns (brute force attempts, off-hours access)
4. Export the filtered log for compliance documentation
5. Set up an alert for more than 10 failed logins from the same IP in 5 minutes

### 6.2 Lesson: API Key Management
**Objective**: Manage API key lifecycle and rotation.

**Lab Exercise**:
1. View all active API keys across tenants
2. Identify keys older than 90 days (rotation overdue)
3. Rotate a test tenant's API key
4. Verify the old key is rejected and the new key works
5. Document the key rotation procedure

### 6.3 Lesson: Data Protection
**Objective**: Understand and manage data protection mechanisms.

**Topics Covered**:
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Tenant data isolation verification
- GDPR data export and deletion procedures
- Backup encryption and retention policies

---

## 7. Module 6: Advanced Operations

### 7.1 Lesson: Backup and Recovery
**Lab Exercise**:
1. Initiate a manual backup for a specific tenant
2. Verify the backup is encrypted and stored in the correct location
3. Perform a test restoration to a staging environment
4. Validate data integrity after restoration
5. Document the recovery time achieved

### 7.2 Lesson: Scaling Operations
**Lab Exercise**:
1. Observe current HPA configuration for services
2. Simulate load increase and watch auto-scaling respond
3. Manually scale a service for an anticipated traffic spike
4. Review resource utilization before and after scaling

### 7.3 Lesson: Integration Management
**Lab Exercise**:
1. Configure Stripe test integration for a tenant
2. Process a test payment and verify webhook delivery
3. Configure Google Workspace OAuth for a tenant
4. Test calendar and contact sync
5. Troubleshoot a simulated integration failure

---

## 8. Assessment and Certification

### 8.1 Knowledge Assessment
- 50-question multiple-choice exam covering all modules
- Passing score: 80%
- Topics weighted: Tenant management (25%), monitoring (25%), security (20%), user management (15%), advanced operations (15%)

### 8.2 Practical Assessment
Candidates must complete the following tasks within 2 hours:
1. Activate a new tenant with custom configuration
2. Set up users with appropriate roles and MFA
3. Configure a payment integration and process a test transaction
4. Diagnose and resolve a simulated service outage
5. Perform a backup and demonstrate the recovery procedure

### 8.3 Certification Levels
| Level | Requirements | Validity |
|-------|-------------|----------|
| NEXUS Administrator Associate | Pass knowledge assessment | 1 year |
| NEXUS Administrator Professional | Pass both assessments + 3 months experience | 2 years |
| NEXUS Administrator Expert | Professional + advanced operations project | 3 years |

---

*Training materials are updated quarterly. For the latest lab environments and exercise materials, contact the training coordinator.*
