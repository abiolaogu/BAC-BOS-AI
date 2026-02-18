# Software Requirements -- BAC-BOS-AI Platform

## 1. Development Environment Requirements

### 1.1 Runtime Dependencies
| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 24+ | Container runtime for all services |
| Docker Compose | v2.20+ | Local multi-service orchestration |
| Go | 1.21+ | Backend microservices (CRM, Finance, HR, etc.) |
| Python | 3.11+ | AI service, MCP orchestrator |
| Node.js | 20+ | Office suite real-time services, IDaaS |
| Flutter | 3.16+ | Mobile application (iOS/Android) |
| kubectl | 1.27+ | Kubernetes cluster management |
| Helm | 3.12+ | Kubernetes package management |
| Git | 2.40+ | Version control |

### 1.2 Optional Development Tools
| Software | Version | Purpose |
|----------|---------|---------|
| kind | 0.20+ | Local Kubernetes cluster |
| k9s | 0.27+ | Kubernetes TUI |
| Lens | Latest | Kubernetes IDE |
| Postman/Insomnia | Latest | API testing |
| VS Code / GoLand | Latest | IDE |
| protoc | 3.x | Protobuf compiler |

## 2. Infrastructure Software

### 2.1 Container Orchestration
| Software | Version | Purpose |
|----------|---------|---------|
| Kubernetes | 1.27+ | Container orchestration |
| Rancher | 2.7+ | Multi-cluster management |
| RKE2 | Latest | Kubernetes distribution |
| Calico | 3.26+ | CNI with network policies |
| CoreDNS | 1.10+ | DNS service discovery |
| MetalLB / AWS ALB | Latest | Load balancing |

### 2.2 Service Mesh and Gateway
| Software | Version | Purpose |
|----------|---------|---------|
| Istio | 1.19+ | Service mesh (mTLS, traffic management) |
| Kong | 3.x | API gateway (rate limiting, JWT, routing) |
| cert-manager | 1.12+ | TLS certificate management |
| ExternalDNS | 0.13+ | Automated DNS record management |

### 2.3 CI/CD and GitOps
| Software | Version | Purpose |
|----------|---------|---------|
| Tekton | 0.50+ | Cloud-native CI/CD pipelines |
| ArgoCD | 2.8+ | GitOps continuous deployment |
| Kaniko | Latest | In-cluster container builds |
| Trivy | 0.45+ | Container security scanning |
| GitHub Actions | Latest | PR-level CI |

### 2.4 Automation
| Software | Version | Purpose |
|----------|---------|---------|
| Ansible | 2.15+ | Configuration management |
| Ansible AWX | 22+ | Ansible automation platform |
| Terraform | 1.6+ | Infrastructure as Code |

## 3. Data Layer Software

### 3.1 Databases
| Software | Version | Purpose | License |
|----------|---------|---------|---------|
| PostgreSQL | 15+ | Primary OLTP (dev) | PostgreSQL License |
| YugabyteDB | 2.20+ | Primary OLTP (production) | Apache 2.0 |
| Redis | 7+ | Caching (dev) | BSD |
| DragonflyDB | 1.0+ | Caching (production) | BSL 1.1 |
| ClickHouse | 23.10+ | OLAP analytics | Apache 2.0 |
| Elasticsearch | 8.10+ | Full-text search | SSPL |
| ScyllaDB | 5.2+ | Time-series data | AGPL |
| Qdrant | 1.6+ | Vector search | Apache 2.0 |

### 3.2 Messaging and Storage
| Software | Version | Purpose | License |
|----------|---------|---------|---------|
| Redpanda | Latest | Event streaming (dev) | BSL 1.1 |
| Apache Kafka | 3.5+ | Event streaming (production) | Apache 2.0 |
| MinIO | Latest | S3-compatible object storage | AGPL |
| Schema Registry | 7.5+ | Avro/Protobuf schema management | Apache 2.0 |

## 4. Observability Software

| Software | Version | Purpose |
|----------|---------|---------|
| Prometheus | 2.46+ | Metrics collection and alerting |
| Grafana | 10.1+ | Dashboards and visualization |
| Alertmanager | 0.26+ | Alert routing (Slack, PagerDuty) |
| Loki | 2.9+ | Log aggregation (planned) |
| Tempo | 2.2+ | Distributed tracing (planned) |
| OpenTelemetry Collector | 0.85+ | Telemetry collection |
| Jaeger | 1.50+ | Trace visualization (planned) |

## 5. Security Software

| Software | Version | Purpose |
|----------|---------|---------|
| Keycloak | 22+ | Identity and access management (planned) |
| HashiCorp Vault | 1.15+ | Secret management (planned) |
| OPA/Gatekeeper | 3.13+ | Policy enforcement (planned) |
| Falco | 0.36+ | Runtime security monitoring (planned) |
| Trivy | 0.45+ | Vulnerability scanning |

## 6. AI/ML Software

| Software | Purpose |
|----------|---------|
| OpenAI API | GPT-4 inference |
| Anthropic API | Claude inference |
| Google AI API | Gemini inference |
| Llama 3 (self-hosted) | Local inference |
| FastAPI | AI service framework |
| uvicorn | ASGI server |
| LangChain (planned) | LLM orchestration |

## 7. Frontend Software

| Software | Version | Purpose |
|----------|---------|---------|
| Next.js | 14+ | Web console framework |
| React | 18+ | UI library |
| TypeScript | 5.x | Type-safe JavaScript |
| TailwindCSS | 3.x | Utility-first CSS |
| shadcn/ui | Latest | Component library |
| Socket.io Client | 4.x | Real-time WebSocket |
| Tiptap | Latest | Rich text editor |
| Recharts | 2.x | Chart library |
| Flutter | 3.16+ | Mobile and desktop apps |

## 8. Docker Compose Service Versions (Development)

| Service | Image | Port |
|---------|-------|------|
| PostgreSQL | postgres:15-alpine | 5432 |
| Redis | redis:7-alpine | 6379 |
| Redpanda | redpandadata/redpanda:latest | 9092, 9644 |
| MinIO | minio/minio:latest | 9000, 9001 |
| Prometheus | prom/prometheus:latest | 9090 |
| Grafana | grafana/grafana:latest | 3001 |

---

*Document version: 1.0 | Last updated: 2026-02-17*
