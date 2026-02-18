# Architecture Overview -- BAC-BOS-AI Platform

## 1. Architecture Philosophy

The NEXUS Business Operating System follows a **microservices-first, event-driven, multi-tenant** architecture designed for global scale. The system is organized into three deployment tiers: the Nexus Engine (orchestration), Business Services (domain logic), and the Nexus Office Suite (productivity applications).

### 1.1 Design Principles
1. **Prompt-Driven Provisioning**: Single JSON payload activates entire business stack
2. **Multi-Tenant by Default**: Every service isolates data by tenant_id with namespace-level Kubernetes isolation
3. **Event-Driven Communication**: Kafka/Redpanda backbone for async inter-service messaging
4. **GitOps Deployment**: ArgoCD app-of-apps pattern for declarative infrastructure
5. **AI-Native**: MCP Protocol integration enables AI agents across all services
6. **Cloud-Agnostic**: Kubernetes-native design runs on AWS, Azure, GCP, OpenStack, or bare metal

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
                        CLIENTS
    ┌──────────────────────────────────────────────┐
    │  Web Console    Mobile App     API Clients   │
    │  (Next.js 14)   (Flutter)     (REST/gRPC)    │
    └──────────────────┬───────────────────────────┘
                       │ HTTPS / WebSocket / gRPC
    ┌──────────────────▼───────────────────────────┐
    │           API GATEWAY (Kong)                  │
    │   JWT Auth │ Rate Limit │ Routing │ CORS     │
    └──────────────────┬───────────────────────────┘
                       │
    ┌──────────────────▼───────────────────────────┐
    │           NEXUS ENGINE (Go, port 8080)        │
    │   Business Activation Orchestrator            │
    │   Industry Presets │ Feature Toggles          │
    │   Infra Provisioning │ Service Deployment     │
    └──────────────────┬───────────────────────────┘
                       │
    ┌──────────────────▼───────────────────────────────────────────┐
    │                    BUSINESS SERVICES                          │
    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
    │  │   CRM   │ │ Finance │ │   HR    │ │Projects │          │
    │  │  :8081  │ │  :8082  │ │  :8084  │ │  :8087  │          │
    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
    │  │  Docs   │ │Inventory│ │   AI    │ │Marketing│          │
    │  │  :8083  │ │  :8085  │ │  :8086  │ │  :8088  │          │
    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
    │  │ Support │ │  IDaaS  │ │  VAS    │ │Time/Att │          │
    │  │  :8089  │ │  (TS)   │ │  (Go)   │ │  (TS)   │          │
    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
    └──────────────────┬───────────────────────────────────────────┘
                       │
    ┌──────────────────▼───────────────────────────────────────────┐
    │               NEXUS OFFICE SUITE (12 services)               │
    │  Mail│Drive│Writer│Sheets│Slides│Calendar│Chat│Meet│Collab  │
    │  Notification│Auth│API-Gateway                               │
    └──────────────────┬───────────────────────────────────────────┘
                       │
    ┌──────────────────▼───────────────────────────────────────────┐
    │              INTEGRATION SERVICES                             │
    │  Google Workspace │ Odoo ERP │ Zoho Suite │ MCP Orchestrator │
    └──────────────────┬───────────────────────────────────────────┘
                       │
    ┌──────────────────▼───────────────────────────────────────────┐
    │                    DATA LAYER                                 │
    │  PostgreSQL:5432 │ Redis:6379 │ Redpanda:9092 │ MinIO:9000  │
    │  Production: YugabyteDB │ DragonflyDB │ Kafka │ ClickHouse  │
    └──────────────────┬───────────────────────────────────────────┘
                       │
    ┌──────────────────▼───────────────────────────────────────────┐
    │                OBSERVABILITY                                  │
    │  Prometheus:9090 │ Grafana:3001 │ Planned: Loki, Tempo      │
    └──────────────────────────────────────────────────────────────┘
```

### 2.2 Service Communication Patterns

| Pattern | Use Case | Technology |
|---------|----------|-----------|
| Synchronous REST | Client-to-service, CRUD operations | HTTP/JSON via Gin, Express, FastAPI |
| gRPC | Inter-service high-performance calls | Protobuf (13 .proto files) |
| Event-driven | Async operations, CDC, audit logs | Redpanda/Kafka |
| WebSocket | Real-time updates, chat, collaboration | Socket.io |
| WebRTC | Video conferencing | Meet service peer-to-peer |

---

## 3. Multi-Tenancy Architecture

### 3.1 Tenant Isolation Model
```
Tenant Isolation Layers:
├── Layer 1: Kubernetes Namespace (network isolation)
├── Layer 2: Database Row-Level Security (tenant_id on every table)
├── Layer 3: API Gateway Tenant Routing (X-Tenant-ID / JWT claim)
├── Layer 4: Kafka Topic ACLs (per-tenant topics)
└── Layer 5: MinIO Bucket Policies (per-tenant buckets)
```

### 3.2 Core Tenant Data Model (001_core_schema.sql)
- **tenants**: id, name, slug, plan, status, enabled_modules, settings (JSONB), limits (JSONB)
- **users**: Per-tenant with MFA, preferences, password_hash
- **roles**: RBAC with TEXT[] permissions
- **api_keys**: Rate-limited, scoped, with usage_stats (JSONB)
- **subscriptions**: Plan tracking with billing intervals
- **invoices**: Financial records with JSONB line items
- **audit_logs**: Immutable action tracking with changes (JSONB)

---

## 4. Nexus Engine Architecture

The Nexus Engine (`nexus-engine/main.go`) accepts a `BusinessActivationInput` and executes a 7-step pipeline:

1. **provisionInfrastructure**: K8s namespace, RBAC, network policies
2. **setupDatabases**: Schema creation, cache namespace, object storage buckets
3. **deployMicroservices**: Feature-toggle-based Helm chart rendering via ArgoCD
4. **configureIntegrations**: Payment webhooks, WhatsApp API, email domains
5. **seedData**: Chart of accounts, pipeline stages, product catalogs
6. **configureDNSandTLS**: Domain registration, Let's Encrypt, DKIM/SPF/DMARC
7. **enableAICopilots**: RAG pipelines, model routing, guardrails

### 4.1 Feature Toggles
The FeatureToggles struct controls which services are deployed per tenant:
CRM, Marketing, Support, Finance, HR, Projects, Ecommerce, POS, Inventory, Fleet, PatientMgmt, LMS, Streaming, FieldOps.

---

## 5. Data Architecture

| Database | Role | Dev | Production |
|----------|------|-----|-----------|
| PostgreSQL 15 | Primary OLTP | Active | Migrate to YugabyteDB |
| Redis 7 | Cache, sessions | Active | Migrate to DragonflyDB |
| Redpanda | Event streaming | Active | Kafka KRaft at scale |
| MinIO | Object storage | Active | Multi-site replication |
| ClickHouse | OLAP analytics | Planned | Real-time dashboards |
| Qdrant | Vector search | Planned | RAG pipeline |
| Elasticsearch | Full-text search | Planned | Content indexing |

---

## 6. Infrastructure Architecture

### 6.1 Istio Service Mesh (bac-platform/istio/)
- Gateway: TLS termination, host routing
- VirtualService: Traffic rules
- PeerAuthentication: STRICT mTLS
- AuthorizationPolicy: Service-level access control

### 6.2 CI/CD (Tekton + GitHub Actions)
- Dev pipeline: build -> test -> deploy
- Staging pipeline: build -> test -> security-scan -> deploy
- Prod pipeline: build -> test -> security-scan -> update-manifest -> deploy

### 6.3 GitOps (ArgoCD)
- App-of-apps pattern at bac-platform/argocd/app-of-apps.yaml
- Per-service applications for API, auth, web

### 6.4 Multi-Region Targets
Lagos (Africa West) | Johannesburg (Africa South) | Frankfurt (EU/GDPR) | Ashburn (US) | Singapore (APAC)

---

## 7. Security Architecture

| Layer | Implementation |
|-------|---------------|
| Network | Istio mTLS, Calico network policies |
| Identity | JWT authentication, MFA support (IDaaS) |
| Authorization | RBAC with permission arrays |
| Data | TLS 1.3 in transit, AES-256 at rest (planned) |
| Audit | Immutable audit_logs table |
| Secrets | Environment variables (Vault planned) |
| Compliance | SOC 2, ISO 27001, GDPR, HIPAA, NDPA targets |

---

*Document version: 2.0 | Last updated: 2026-02-17*
