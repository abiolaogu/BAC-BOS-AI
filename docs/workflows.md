# Workflows -- BAC-BOS-AI Platform

## 1. Business Activation Workflow

### 1.1 Trigger
POST /api/v1/activate with BusinessActivationInput JSON payload.

### 1.2 Steps
```
Step 1: Validate Input
├── Parse JSON payload (BusinessActivationInput struct)
├── Validate required fields (business_name, region, currency, industry, channels, payments)
└── Return 400 if validation fails

Step 2: Generate Tenant Identity
├── Create UUID tenant_id
├── Record in tenants table (plan, status, enabled_modules)
└── Generate API keys and webhook secrets

Step 3: Apply Industry Preset
├── Look up industry in IndustryPresets map (ecommerce, healthcare, logistics, etc.)
├── Merge preset features with input FeatureToggles
└── Determine module list (storefront, cart, checkout, crm, etc.)

Step 4: Provision Infrastructure
├── Create Kubernetes namespace (tenant-{id})
├── Apply network policies (Calico)
├── Configure RBAC (ServiceAccount, RoleBinding)
└── Allocate resource quotas

Step 5: Setup Databases
├── Create PostgreSQL/YugabyteDB schemas per tenant
├── Initialize Redis/DragonflyDB namespace
├── Create MinIO buckets (tenant-{id}-files, tenant-{id}-backups)
└── Setup ClickHouse tables (analytics)

Step 6: Deploy Microservices
├── For each enabled feature toggle:
│   ├── Render Helm chart with tenant values
│   ├── Commit to GitOps repository
│   └── ArgoCD sync triggers deployment
├── Wait for all pods to become Ready
└── Record deployment status

Step 7: Configure Integrations
├── For each payment provider: register webhooks
├── For each messaging channel: configure API credentials
├── Setup email sending domain (DKIM, SPF, DMARC)
└── Configure WhatsApp Business API

Step 8: Seed Data
├── Create chart of accounts (finance)
├── Setup tax rates per region
├── Create CRM pipeline stages (prospect -> qualification -> proposal -> negotiation -> closed)
├── Create default email templates
├── Import products/services from input
└── Setup SLA policies (support)

Step 9: Configure DNS and TLS
├── Create DNS records (A, CNAME, MX, TXT)
├── Request Let's Encrypt certificates
├── Configure ExternalDNS controller
└── Verify domain propagation

Step 10: Enable AI Copilots
├── Setup RAG pipeline (vector DB + document indexer)
├── Configure LLM routing (model_provider preference)
├── Apply guardrails and PII scrubbing rules
├── Deploy agent instances per enabled module
└── Test copilot responses

Step 11: Return Result
├── Compile ActivationResult
│   ├── tenant_id, business_name, status
│   ├── endpoints (web_console, api, graphql, storefront)
│   ├── credentials (admin_username, temp_password, api_key)
│   └── next_steps (9-step onboarding guide)
└── Return 201 Created
```

---

## 2. CRM Lead-to-Opportunity Workflow

```
1. Lead Created (POST /api/v1/leads)
   ├── Status: "new", Priority: from input
   └── Event: nexus.crm.leads.created -> Kafka

2. Lead Qualification
   ├── Sales rep contacts lead
   ├── Status updated: "contacted" -> "qualified"
   └── AI copilot suggests next action

3. Lead Conversion
   ├── Create Opportunity from qualified lead
   ├── POST /api/v1/opportunities (contact_id, lead_id, amount, stage)
   ├── Lead status: "converted", converted_at set
   └── Event: nexus.crm.leads.converted -> Kafka

4. Opportunity Pipeline
   ├── Stage progression: prospect -> qualification -> proposal -> negotiation
   ├── Probability auto-calculated per stage
   ├── Close date tracked
   └── Events emitted at each stage change

5. Opportunity Closed
   ├── Stage: "closed-won" or "closed-lost"
   ├── closed_at timestamp recorded
   └── Finance service notified for invoicing (if won)
```

---

## 3. CI/CD Pipeline Workflow (Tekton)

### 3.1 Development Pipeline
```
Trigger: Push to dev branch
├── Task: build
│   ├── Clone repository
│   ├── Run go build / npm build
│   └── Build container image (Kaniko)
├── Task: test
│   ├── Run go test ./...
│   ├── Run pytest (AI service)
│   └── Report coverage
└── Task: deploy
    ├── Push image to registry
    └── Apply to dev namespace
```

### 3.2 Staging Pipeline
```
Trigger: Push to staging branch
├── Task: build (same as dev)
├── Task: test (same as dev)
├── Task: security-scan
│   ├── Run Trivy image scan
│   ├── Check for CVEs (critical/high)
│   └── Fail pipeline if critical CVEs found
└── Task: deploy
    ├── Push image to registry
    └── Apply to staging namespace
```

### 3.3 Production Pipeline
```
Trigger: Push to main branch (with approval gate)
├── Task: build
├── Task: test
├── Task: security-scan
├── Task: update-manifest
│   ├── Update Kustomize overlay with new image tag
│   └── Commit to GitOps repository
└── Task: deploy (ArgoCD sync)
    ├── ArgoCD detects manifest change
    ├── Rolling update to production namespace
    └── Health check and auto-rollback on failure
```

---

## 4. Payment Processing Workflow

```
1. Customer initiates payment
   ├── Frontend sends payment request to finance-service (:8082)
   └── Include: amount, currency, payment_method, gateway (stripe/paystack)

2. Gateway Selection
   ├── Finance service routes to appropriate gateway
   ├── stripe.go: Process via Stripe API
   ├── paystack.go: Process via Paystack API
   └── Apply multi-currency conversion if needed

3. Payment Execution
   ├── Create payment intent/transaction with gateway
   ├── Return client_secret for 3D Secure (if applicable)
   └── Wait for webhook confirmation

4. Webhook Processing
   ├── Receive payment.success / payment.failed webhook
   ├── Update transaction status in database
   ├── Emit event: nexus.finance.payments.completed
   └── Trigger invoice generation

5. Invoice Generation
   ├── Create invoice record
   ├── Calculate tax (VAT, GST, sales tax per region)
   ├── Generate PDF
   └── Send via email (mail-service)
```

---

## 5. Document Collaboration Workflow (Office Suite)

```
1. User creates document (POST writer-service)
   ├── Document record in PostgreSQL
   └── Initial version saved

2. User opens document
   ├── WebSocket connection to collaboration-service
   ├── Load current document state
   └── Cursor position broadcast to other editors

3. Real-time editing
   ├── CRDT/OT operations sent via WebSocket
   ├── Collaboration service merges operations
   ├── Broadcast to all connected clients
   └── Auto-save every 30 seconds

4. Export
   ├── User requests export (PDF, DOCX, HTML)
   ├── export_import_services.go processes request
   └── File stored in MinIO, download URL returned
```

---

## 6. AI Agent Execution Workflow

```
1. User sends prompt to AI service
   POST /agents/{agent_id}/execute
   Body: { "prompt": "...", "session_id": "..." }

2. Agent Engine processes request
   ├── Load agent configuration from agents.json
   ├── Apply agent system prompt and constraints
   ├── Select LLM based on agent config (GPT-4, Claude, Gemini)
   └── Load conversation history for session_id

3. Tool execution
   ├── Agent may invoke platform tools (tools.py)
   ├── CRM queries, finance calculations, HR lookups
   └── Results fed back into LLM context

4. Response generation
   ├── LLM generates response with tool results
   ├── PII scrubbing applied (if enabled)
   ├── Guardrails checked
   └── Response returned to user

5. Session persistence
   ├── Conversation stored for session continuity
   └── Analytics event emitted
```

---

## 7. Monitoring Alert Workflow

```
1. Prometheus scrapes metrics from all services (/metrics endpoint)
2. Alert rules evaluate (bac-platform/kubernetes/monitoring/alert-rules.yaml)
3. AlertManager routes alert
   ├── Critical: PagerDuty (pagerduty-config.yaml)
   ├── Warning: Slack channel
   └── Info: Dashboard only
4. On-call engineer investigates via Grafana dashboards
5. Resolution tracked in support ticketing system
```

---

*Document version: 1.0 | Last updated: 2026-02-17*
