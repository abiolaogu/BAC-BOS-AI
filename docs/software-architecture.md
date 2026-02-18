# Software Architecture -- BAC-BOS-AI Platform

## 1. Architecture Style

BAC-BOS-AI employs a **polyglot microservices architecture** with event-driven communication across three sub-platforms: services/ (13 Go/Python/TS services), nexus-office-suite/ (12 Go/Node.js services), and bac-platform/ (8 orchestration components).

## 2. Service Catalog

### 2.1 Core Business Services (services/)
| Service | Language | Port | Framework | Data Models |
|---------|----------|------|-----------|-------------|
| nexus-engine | Go | 8080 | Gin | BusinessActivationInput, ActivationResult, IndustryPreset |
| crm-service | Go | 8081 | Gin | Contact, Lead, Opportunity |
| finance-service | Go | 8082 | Gin | Payment gateway abstraction (Stripe, Paystack) |
| documents-service | Go | 8083 | Gin | Document, Version |
| hr-service | Go | 8084 | Gin | Employee, Department |
| inventory-service | Go | 8085 | Gin | Product, Warehouse, Stock |
| ai-service | Python | 8086 | FastAPI | AgentEngine, AgentExecutionRequest |
| projects-service | Go | 8087 | Gin | Task, Sprint, Milestone |
| marketing-service | Go | 8088 | Gin | Campaign, Template |
| support-service | Go | 8089 | Gin | Ticket, SLAPolicy |
| vas-service | Go | -- | Gin | Provider, VASModel |
| idaas-service | TypeScript | -- | NestJS | User, Session, MFAConfig |
| time-attendance | TypeScript | -- | Express | Attendance, Leave, Overtime, BiometricRecord |

### 2.2 Nexus Office Suite (nexus-office-suite/backend/)
| Service | Language | Key Components |
|---------|----------|---------------|
| mail-service | Go | SMTP server, IMAP server, spam filter, email handler/service/repository/model |
| drive-service | Go | MinIO storage adapter, file/folder/version/permission repositories |
| writer-service | Go | Document handler, export/import services (PDF, DOCX, HTML) |
| sheets-service | Go | Spreadsheet handler, formula engine |
| slides-service | Go | Presentation handler, theme/slide repositories |
| calendar-service | Go | CalDAV handler, event/calendar/reminder services |
| chat-service | Node.js | WebSocket messaging, channels, threads |
| meet-service | Node.js | WebRTC signaling, room management |
| collaboration-service | Node.js | CRDT/OT real-time document editing |
| notification-service | Node.js | Push, email, in-app notification channels |
| auth-service | Node.js | JWT, OAuth2, session management |
| api-gateway | Node.js | Routing, rate limiting, auth proxy |

### 2.3 BAC Platform (bac-platform/services/)
| Component | Language | Purpose |
|-----------|----------|---------|
| control-plane | Go | Service lifecycle orchestration |
| crm | Go | BAC-level CRM |
| erp | Go | Enterprise resource planning |
| ecommerce | Go | Storefront and checkout |
| mcp-orchestrator | Python | AI Model Context Protocol |
| google-workspace | Go | Gmail, Calendar, Drive, Docs integration |
| odoo-integration | Go | CRM, Sales, Accounting, HR integration |
| zoho-integration | Go | CRM, Books, Desk, People integration |

## 3. Shared Components

### 3.1 Protobuf Contracts (13 definitions)
Located in bac-platform/shared/proto/ and nexus-office-suite/shared/proto/: common, crm, erp, ecommerce, hr, marketing, support, documents, project, analytics, controlplane, writer, sheets.

### 3.2 Go Middleware (bac-platform/shared/go/)
- middleware/auth.go: JWT validation
- middleware/cors.go: CORS configuration
- middleware/logging.go: Structured logging
- database/db.go: PostgreSQL connection pooling
- auth/jwt.go: Token creation/validation

## 4. Data Access Patterns
All Go services follow: Handler -> Service -> Repository -> Database.
Multi-tenant queries always filter by tenant_id. JSONB columns store flexible custom_fields, settings, and metadata.

## 5. API Design Standards
- Base path: `/api/v1/{resource}`
- Health check: `GET /health` returns `{"status":"healthy","service":"name","version":"1.0.0"}`
- Pagination: `?page=1&limit=20`
- Error format: `{"error":"message","details":"specifics"}`
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)

## 6. Build Strategy
Multi-stage Docker builds: Go builder (golang:1.21-alpine) -> Alpine runtime. Node.js: node:20-alpine with npm ci. Python: python:3.11-slim with pip install.

## 7. Dependency Management
Go: go.mod per service (gin, uuid, pq, gorm, yaml.v3). Python: requirements.txt (fastapi, uvicorn, pydantic). TypeScript: package.json (nestjs, express, socket.io, grpc-js).

---

*Document version: 1.0 | Last updated: 2026-02-17*
