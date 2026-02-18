# Technical Writeup -- BAC-BOS-AI Platform

## 1. Project Overview

BAC-BOS-AI (NEXUS Business Operating System) is an enterprise cloud platform that provisions complete business infrastructure from a single JSON prompt. The system comprises 25+ microservices written primarily in Go, with Python for AI and TypeScript for identity and real-time services. It targets the $280B addressable business software market with an Africa-first, globally-applicable approach.

## 2. Technical Architecture Summary

The platform is organized into three layers:

**Orchestration Layer** (nexus-engine/): A Go-based activation engine that accepts BusinessActivationInput payloads and executes a 7-step provisioning pipeline covering infrastructure, databases, microservices, integrations, data seeding, DNS/TLS, and AI copilots. Industry presets (ecommerce, healthcare, logistics) automatically configure appropriate modules.

**Business Logic Layer** (services/ + nexus-office-suite/): 25 microservices implementing CRM (contacts, leads, opportunities), finance (Stripe/Paystack payment gateways), HR (employees, time/attendance, biometrics), projects (tasks, Kanban), marketing (campaigns), support (ticketing, SLA), inventory (stock management), documents, AI agents (200+ definitions via FastAPI), identity-as-a-service (NestJS), value-added services, and a complete office productivity suite (mail with SMTP/IMAP, drive with MinIO, writer, sheets, slides, calendar with CalDAV, chat with WebSocket, meet with WebRTC, collaboration with CRDT/OT, notifications).

**Platform Layer** (bac-platform/): Control plane orchestration, ERP and eCommerce services, MCP orchestrator for AI model context protocol, and integration connectors for Google Workspace (OAuth 2.0), Odoo (XML-RPC), and Zoho (OAuth 2.0).

## 3. Technology Stack

**Languages**: Go 1.21+ (Gin framework, 60+ source files), Python 3.11+ (FastAPI), TypeScript 5.x (NestJS, Express)
**Databases**: PostgreSQL 15 (OLTP, 16 migration files), Redis 7 (caching), Redpanda (Kafka-compatible streaming), MinIO (S3-compatible object storage)
**Production Targets**: YugabyteDB (distributed SQL), DragonflyDB (high-perf cache), ClickHouse (OLAP), ScyllaDB (time-series), Elasticsearch (search), Qdrant (vectors)
**Infrastructure**: Kubernetes (Rancher-managed), Istio service mesh (mTLS, traffic management), ArgoCD (GitOps, app-of-apps), Tekton (CI/CD pipelines), Ansible AWX (day-2 automation)
**Frontend**: Next.js 14 + React 18 (web), Flutter 3.16+ (mobile), TailwindCSS + shadcn/ui (UI framework)
**AI/ML**: OpenAI GPT-4, Anthropic Claude, Google Gemini, Meta Llama 3, MCP Protocol

## 4. Multi-Tenancy Implementation

Every table includes a `tenant_id UUID NOT NULL` column with indexes. The core schema defines tenants with JSONB columns for settings, limits, usage, and metadata. API middleware extracts tenant_id from JWT claims or X-Tenant-ID headers and injects it into Gin context. All queries filter by tenant_id. Kubernetes namespace isolation, Kafka topic ACLs, and MinIO bucket policies provide defense-in-depth.

## 5. API Design

All services expose RESTful APIs under `/api/v1/{resource}` with JSON bodies, UUID primary keys, pagination support, and structured error responses. Health endpoints (`GET /health`) provide service status for Kubernetes readiness probes. gRPC contracts defined in 13 protobuf files enable high-performance inter-service communication.

## 6. Payment Architecture

The finance service implements a gateway abstraction pattern (`PaymentGateway` interface) with concrete implementations for Stripe and Paystack. Environment variables configure API keys. The pattern supports easy addition of Flutterwave, Square, Razorpay. Webhook endpoints process payment confirmations and trigger invoice generation.

## 7. AI Architecture

The AI service (FastAPI on port 8086) manages 200+ specialized agents defined in `config/agents.json`. The AgentEngine class loads definitions, manages session histories, routes to appropriate LLM providers (GPT-4, Claude, Gemini, Llama), and executes platform tools (CRM queries, finance calculations, HR lookups). The MCP orchestrator (`bac-platform/services/mcp-orchestrator/main.py`) provides Model Context Protocol compliance for standardized tool integration.

## 8. Office Suite Architecture

Twelve microservices deliver Google Workspace-comparable functionality. Go services handle document-oriented workloads (mail, drive, writer, sheets, slides, calendar) while Node.js services handle real-time operations (chat, meet, collaboration, notifications, auth, API gateway). The mail service implements full SMTP/IMAP servers with spam filtering. The drive service uses MinIO for S3-compatible object storage with versioning and permission management. The calendar service supports CalDAV protocol for standards-based interoperability.

## 9. CI/CD Pipeline

Tekton pipelines define three environments (dev, staging, production) with progressive quality gates. Dev: build + test + deploy. Staging: adds security scanning (Trivy). Production: adds manifest updates and ArgoCD sync. Each pipeline uses dedicated Tekton tasks for build (Kaniko), test (go test, pytest, jest), security-scan (Trivy), deploy (kubectl), and update-manifest (kustomize). GitHub Actions provide additional CI for pull requests.

## 10. Infrastructure as Code

Istio configuration at `bac-platform/istio/` defines gateway, virtual-service, peer-authentication (STRICT mTLS), and authorization-policy. ArgoCD at `bac-platform/argocd/` implements app-of-apps pattern. Helm charts at `infra/helm/` package nexus-engine and nexus-platform. Kubernetes base manifests define namespaces. Ansible playbooks automate infrastructure setup.

## 11. Observability

Prometheus collects metrics from all services. Grafana dashboards at `ops/grafana/dashboards/` visualize platform health. Alert rules at `bac-platform/kubernetes/monitoring/alert-rules.yaml` define critical and warning thresholds. PagerDuty integration for on-call alerting. ServiceMonitor resources for Kubernetes-native metric scraping.

## 12. Security Posture

Istio mTLS enforces encryption between all services. JWT-based authentication with MFA support (IDaaS service). RBAC with TEXT[] permission arrays. Immutable audit_logs table with JSONB change tracking. API keys with rate limits, scopes, and usage tracking. Targets: SOC 2 Type II, ISO 27001, GDPR, HIPAA, NDPA, PCI DSS Level 1.

---

*Document version: 1.0 | Last updated: 2026-02-17*
