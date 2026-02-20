# README -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Project Overview

BAC-BOS-AI (Business Activation Cloud - Business Operations Suite - AI), branded as the **NEXUS Business Operating System**, is an AI-first, cloud-native platform that provisions complete enterprise infrastructure from a single JSON prompt in under five minutes. The platform unifies CRM, ERP, eCommerce, communications, workplace productivity, low-code development, AI copilots, and analytics into a single subscription, replacing 15+ SaaS tools at 60-95% cost savings.

**Tagline**: "Business at the Speed of Prompt"

## 2. Key Capabilities

| Capability | Description |
|------------|-------------|
| Instant Business Activation | Submit a JSON payload; receive a fully provisioned enterprise stack in < 5 minutes |
| Unified Platform | CRM, Finance, HR, Projects, Marketing, Support, Inventory, Documents, AI, Identity, Time & Attendance |
| Office Productivity Suite | Mail (SMTP/IMAP), Drive (MinIO), Writer, Sheets, Slides, Calendar (CalDAV), Chat, Meet (WebRTC) |
| AI-Native Intelligence | 200+ specialized AI agents, MCP Protocol compliance, multi-provider LLM support (GPT-4, Claude, Gemini, Llama) |
| Multi-Tenant Architecture | Tenant isolation at database, Kubernetes namespace, Kafka topic, and MinIO bucket levels |
| African Market Focus | Native Paystack, Flutterwave, Africa's Talking integration alongside global providers |

## 3. Architecture Summary

The platform is organized into three layers:

- **Orchestration Layer** (`nexus-engine/`): Go-based activation engine executing a 7-step provisioning pipeline
- **Business Logic Layer** (`services/` + `nexus-office-suite/`): 25 microservices implementing domain logic
- **Platform Layer** (`bac-platform/`): Control plane, ERP, eCommerce, MCP orchestrator, and integration connectors

## 4. Technology Stack

| Category | Technologies |
|----------|-------------|
| Languages | Go 1.21+ (Gin), Python 3.11+ (FastAPI), TypeScript 5.x (NestJS, Express) |
| Databases | PostgreSQL 15, Redis 7, Redpanda (Kafka-compatible), MinIO (S3-compatible) |
| Production Targets | YugabyteDB, DragonflyDB, ClickHouse, Elasticsearch, Qdrant |
| Infrastructure | Kubernetes (Rancher), Istio service mesh, Kong API gateway, ArgoCD GitOps, Tekton CI/CD |
| Frontend | Next.js 14 + React 18 (web), Flutter 3.16+ (mobile), TailwindCSS + shadcn/ui |
| AI/ML | OpenAI GPT-4, Anthropic Claude, Google Gemini, Meta Llama 3, MCP Protocol |

## 5. Service Catalog

### 5.1 Core Business Services (13 services)
`nexus-engine` (8080), `crm-service` (8081), `finance-service` (8082), `documents-service` (8083), `hr-service` (8084), `inventory-service` (8085), `ai-service` (8086), `projects-service` (8087), `marketing-service` (8088), `support-service` (8089), `vas-service`, `idaas-service`, `time-attendance`

### 5.2 Nexus Office Suite (12 services)
`mail-service`, `drive-service`, `writer-service`, `sheets-service`, `slides-service`, `calendar-service`, `chat-service`, `meet-service`, `collaboration-service`, `notification-service`, `auth-service`, `api-gateway`

### 5.3 BAC Platform (8 components)
`control-plane`, `crm`, `erp`, `ecommerce`, `mcp-orchestrator`, `google-workspace`, `odoo-connector`, `zoho-connector`

## 6. Getting Started

### 6.1 Prerequisites
- Docker 24+ with 8GB+ allocated memory
- Docker Compose v2.20+
- Go 1.21+, Python 3.11+, Node.js 20+
- kubectl 1.27+, Helm 3.12+
- macOS 13+ / Ubuntu 22.04+ / Windows 11 with WSL2

### 6.2 Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd BAC-BOS-AI

# Start infrastructure services
docker-compose up -d

# Run the Nexus Engine
cd services/nexus-engine
go run main.go

# Activate a business (example)
curl -X POST http://localhost:8080/api/v1/activate \
  -H "Content-Type: application/json" \
  -d @examples/ecommerce-business.json
```

### 6.3 Configuration
Environment variables and configuration details are documented in `docs/CONFIGURATION.md`. Payment API key setup is covered in `docs/PAYMENT_API_KEYS.md`.

## 7. Project Structure

```
BAC-BOS-AI/
├── services/                  # 13 core business microservices
│   ├── nexus-engine/          # Business activation orchestrator (Go)
│   ├── crm-service/           # Customer relationship management (Go)
│   ├── finance-service/       # Payments, invoicing (Go)
│   ├── ai-service/            # AI agent engine (Python/FastAPI)
│   ├── idaas-service/         # Identity-as-a-Service (TypeScript/NestJS)
│   └── ...
├── nexus-office-suite/        # 12 office productivity services
│   ├── backend/
│   │   ├── mail-service/      # SMTP/IMAP email (Go)
│   │   ├── drive-service/     # File storage with MinIO (Go)
│   │   ├── chat-service/      # Real-time messaging (Node.js)
│   │   ├── meet-service/      # Video conferencing (Node.js)
│   │   └── ...
│   └── frontend/              # Next.js web application
├── bac-platform/              # 8 platform orchestration components
│   ├── services/
│   │   ├── control-plane/     # Service lifecycle (Go)
│   │   ├── mcp-orchestrator/  # AI Model Context Protocol (Python)
│   │   └── ...
│   └── database/migrations/   # 16 SQL migration files
├── infrastructure/            # Kubernetes manifests, Helm charts
├── docs/                      # Project documentation
└── docker-compose.yml         # Local development orchestration
```

## 8. Documentation

| Document | Description |
|----------|-------------|
| [Product Requirements](prd.md) | Product vision, personas, feature specifications |
| [Business Requirements](brd.md) | Business objectives, market analysis, requirements |
| [Architecture Overview](architecture.md) | System architecture, component diagrams |
| [High-Level Design](hld.md) | System context, component interactions |
| [Low-Level Design](lld.md) | Service-level implementation details |
| [Database Schema](database-schema.md) | Schema definitions, migration strategy |
| [Workflows](workflows.md) | Business activation and operational workflows |
| [Technical Specifications](technical-specifications.md) | API contracts, protocols, performance targets |
| [Deployment Guide](deployment.md) | Environment setup, deployment procedures |
| [Release Notes](release-notes.md) | Version history and changelog |

## 9. Target Markets

| Segment | Description | Pricing |
|---------|-------------|---------|
| SMBs (5-50 employees) | Affordable all-in-one platform | $199/month Starter |
| Mid-Market (50-500 employees) | Enterprise consolidation | $499/month Professional |
| Enterprise (500+ employees) | Full-scale deployment | $999/month Enterprise |
| Government & MDBs | Sovereign cloud solutions | Custom pricing |

## 10. Multi-Region Deployment

Five target Points of Presence (PoPs):
1. **Lagos, Nigeria** -- West Africa hub
2. **Johannesburg, South Africa** -- Southern Africa hub
3. **Frankfurt, Germany** -- EU hub
4. **Ashburn, USA** -- North America hub
5. **Singapore** -- Asia-Pacific hub

## 11. Contributing

Please refer to the development guidelines in the technical documentation. All contributions require:
1. Feature branch from `develop`
2. Passing Tekton CI pipeline (build, test, security scan)
3. Code review approval
4. ArgoCD sync verification in staging

## 12. License

Proprietary. All rights reserved by Business Activation Cloud (BAC).

---

*For detailed setup instructions, see [Running Guide](RUNNING_GUIDE.md) and [Quick Start](quickstart.md).*
