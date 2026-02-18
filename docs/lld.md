# Low-Level Design -- BAC-BOS-AI Platform

## 1. Nexus Engine Detailed Design

### 1.1 File: nexus-engine/main.go
**Entry Point**: `func main()` initializes Gin router with CORS middleware, registers routes.

**Routes**:
- `GET /health` -> `handleHealth()`: Returns service status JSON
- `POST /api/v1/activate` -> `handleActivate()`: Accepts BusinessActivationInput, calls ActivateBusiness()
- `GET /api/v1/presets` -> Anonymous handler: Returns IndustryPresets map

**Core Struct: BusinessActivationInput**
```go
type BusinessActivationInput struct {
    BusinessName     string              // Required
    PreferredDomains []string            // For DNS
    Region           string              // Required (NG, ZA, EU, US, SG)
    Currency         string              // Required (NGN, ZAR, EUR, USD, SGD)
    Industry         string              // Required (ecommerce, healthcare, etc.)
    TeamSize         int                 // User count
    Channels         []string            // Required (web, whatsapp, pos)
    ProductsServices []Product           // Catalog items
    Payments         []string            // Required (Paystack, Stripe, Flutterwave)
    Messaging        []string            // WhatsApp, Twilio, Africa's Talking
    AIPrefs          AIPreferences       // Model provider, guardrails
    Features         FeatureToggles      // 14 boolean flags
    Deployment       DeploymentConfig    // Mode, tier, HA, auto-scaling
    Contacts         ContactInfo         // Admin, billing, support emails
    Branding         BrandingConfig      // Logo, colors, fonts
}
```

**Orchestration: ActivateBusiness(ctx, input)**
Sequential 7-step pipeline with error wrapping (`fmt.Errorf("step failed: %w", err)`). Each step logs with tenant_id prefix. Simulated delays in dev mode (100-200ms per step).

### 1.2 Industry Preset Loading
```go
func loadIndustryPresets() map[string]IndustryPreset {
    // Hardcoded in dev; YAML files in production
    presets["ecommerce"] = IndustryPreset{
        Features: {"ecommerce": true, "pos": true, "inventory": true, ...},
        Modules: ["storefront", "product-catalog", "cart", "checkout", ...],
    }
}
```

---

## 2. CRM Service Detailed Design

### 2.1 File: services/crm/main.go

**Data Models**:
- `Contact`: UUID id, tenant_id, first_name, last_name, email (required, validated), phone, company, title, source, status, tags ([]string), custom_fields (map[string]interface{}), timestamps
- `Lead`: UUID id, tenant_id, contact_id (FK), title (required), value (float64), currency, source, status (new/contacted/qualified/lost/converted), stage, owner_id, priority (low/medium/high/urgent), tags
- `Opportunity`: UUID id, tenant_id, contact_id, lead_id, name (required), amount (required, float64), currency, stage (prospect/qualification/proposal/negotiation/closed-won/closed-lost), probability (0-100), close_date, products_services ([]string), notes

**Handler: CreateContact**
1. Bind JSON with validation (`binding:"required"` and `binding:"required,email"`)
2. Generate UUID, set tenant_id from middleware, set timestamps
3. Marshal tags and custom_fields to JSON bytes
4. Execute INSERT with 14 parameters
5. Return 201 with contact JSON

**Handler: GetContact**
1. Extract id from URL param, tenant_id from context
2. Query with WHERE id = $1 AND tenant_id = $2
3. Scan into struct + JSON bytes
4. Unmarshal JSON bytes into Go types
5. Return 200 or 404

**Handler: ListContacts**
1. Extract tenant_id from context
2. Query with ORDER BY created_at DESC LIMIT 100
3. Iterate rows, scan into Contact structs
4. Return 200 with {data: [...], total: N}

**Middleware: tenantMiddleware()**
Extracts X-Tenant-ID header; falls back to "demo-tenant" for development.

**Database Schema**: Inline CREATE TABLE with indexes on tenant_id, email, status, owner_id, stage.

---

## 3. Finance Service Detailed Design

### 3.1 Payment Gateway Pattern (services/finance/internal/payment/)

**gateway.go**: Defines `PaymentGateway` interface with methods: `Charge(amount, currency, source)`, `Refund(transactionID)`, `CreateSubscription(planID, customerID)`.

**stripe.go**: Implements PaymentGateway using Stripe SDK. Reads STRIPE_SECRET_KEY from environment. Supports charge, refund, subscription creation, webhook signature verification.

**paystack.go**: Implements PaymentGateway using Paystack REST API. Reads PAYSTACK_SECRET_KEY from environment. Supports NGN, GHS, ZAR currencies. Transaction initialization and verification flow.

**payment_test.go**: Table-driven tests for both gateways with mock HTTP clients.

---

## 4. AI Service Detailed Design

### 4.1 File: services/ai/main.py
FastAPI application with three routes:
- `GET /agents` -> `engine.list_agents()` returns agent catalog
- `GET /agents/{agent_id}` -> `engine.get_agent(agent_id)` returns single agent or 404
- `POST /agents/{agent_id}/execute` -> `engine.execute_agent(agent_id, prompt, session_id)`

### 4.2 File: services/ai/app/engine.py
`AgentEngine` class:
- Constructor loads agent definitions from JSON config
- `list_agents()`: Returns list of {id, name, description, category}
- `get_agent(id)`: Returns full agent configuration
- `execute_agent(id, prompt, session)`: Invokes LLM with agent system prompt, manages session history, applies tools

### 4.3 File: services/ai/app/tools.py
Platform tool definitions for agent use:
- CRM tools: search_contacts, create_lead, update_opportunity
- Finance tools: create_invoice, check_balance
- HR tools: lookup_employee, submit_leave_request
- Analytics tools: run_query, generate_report

---

## 5. Office Suite Service Designs

### 5.1 Mail Service (nexus-office-suite/backend/mail-service/)
```
cmd/main.go
├── Initialize config (config/config.go)
├── Connect PostgreSQL
├── Start SMTP server (internal/service/smtp_server.go) on port 25/587
├── Start IMAP server (internal/service/imap_server.go) on port 143/993
├── Register HTTP handlers (internal/handler/email_handler.go)
│   ├── GET /api/v1/emails (list inbox)
│   ├── GET /api/v1/emails/:id (get email)
│   ├── POST /api/v1/emails (send email)
│   └── PUT /api/v1/emails/:id/read (mark as read)
└── Start Gin HTTP server

internal/service/spam_filter.go
├── Bayesian spam classification
├── SPF/DKIM/DMARC validation
└── Blocklist checking
```

### 5.2 Drive Service (nexus-office-suite/backend/drive-service/)
```
Storage layer: internal/storage/minio.go
├── Upload(bucket, key, reader) -> URL
├── Download(bucket, key) -> reader
├── Delete(bucket, key)
└── GeneratePresignedURL(bucket, key, expiry)

Repositories:
├── file_repository.go: CRUD on files table
├── folder_repository.go: CRUD on folders table with hierarchy
├── version_repository.go: File version tracking
└── permission_repository.go: Share and access control

Handler: internal/handler/drive_handler.go
├── POST /api/v1/files (upload with multipart)
├── GET /api/v1/files/:id (download)
├── GET /api/v1/folders/:id (list contents)
├── POST /api/v1/shares (create share link)
└── DELETE /api/v1/files/:id (soft delete)
```

### 5.3 Calendar Service (nexus-office-suite/backend/calendar-service/)
```
Handlers:
├── calendar_handler.go: CRUD for calendar entities
├── event_handler.go: CRUD for events with recurrence
├── caldav_handler.go: CalDAV protocol compliance (PROPFIND, REPORT, PUT)
└── middleware.go: Auth and tenant extraction

Services:
├── calendar_service.go: Calendar business logic
├── event_service.go: Event management with conflict detection
└── caldav_service.go: CalDAV XML parsing and response generation

Models:
├── calendar.go: Calendar entity with timezone, color
├── event.go: Event with start/end, location, attendees, recurrence
└── reminder.go: Reminder with trigger offset
```

---

## 6. Integration Service Designs

### 6.1 Google Workspace (bac-platform/services/integrations/google-workspace/)
```
src/main.go:
├── OAuth2 service account authentication
├── Gmail: Send, receive, manage labels
├── Calendar: CRUD events, manage attendees
├── Drive: Upload, download, manage folders
└── Docs/Sheets/Slides: Create and edit programmatically

K8s deployment: k8s/deployment.yaml
Tests: tests/integration_test.go
```

### 6.2 Odoo Integration (bac-platform/services/integrations/odoo/)
```
src/main.go:
├── XML-RPC/JSON-RPC client
├── CRM: Leads, opportunities
├── Sales: Orders, quotations
├── Accounting: Invoices, journal entries
├── Inventory: Stock moves, warehouses
└── HR: Employees, attendance
```

---

## 7. Shared Middleware Implementation

### 7.1 JWT Auth (bac-platform/shared/go/middleware/auth.go)
- Extract Authorization header
- Parse Bearer token
- Validate JWT signature and expiry
- Extract tenant_id and user_id claims
- Set in Gin context for downstream handlers

### 7.2 CORS (bac-platform/shared/go/middleware/cors.go)
- Allow-Origin: configurable (default *)
- Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
- Allow-Headers: Content-Type, Authorization, X-Tenant-ID
- Preflight 204 response

### 7.3 Logging (bac-platform/shared/go/middleware/logging.go)
- Log request method, path, status, latency
- Structured JSON format
- Request ID injection for tracing

---

*Document version: 1.0 | Last updated: 2026-02-17*
