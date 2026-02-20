# Technical Specifications -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. API Specifications

### 1.1 API Design Standards
- **Protocol**: RESTful HTTP/1.1 and HTTP/2 for all external APIs; gRPC (protobuf) for internal inter-service communication
- **Base URL Pattern**: `https://{region}.nexus.bac.cloud/api/v1/{service}/{resource}`
- **Authentication**: Bearer JWT tokens issued by IDaaS service; API keys for machine-to-machine
- **Content Type**: `application/json` for REST; `application/grpc` for gRPC
- **Versioning**: URI path versioning (`/api/v1/`, `/api/v2/`)
- **Pagination**: Cursor-based with `?cursor={id}&limit={n}` (default limit: 50, max: 200)
- **Rate Limiting**: Kong API Gateway enforces per-tenant rate limits (Starter: 100 req/min, Professional: 500 req/min, Enterprise: 2000 req/min)

### 1.2 Standard Response Format
```json
{
  "status": "success|error",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "cursor": "uuid-next"
  },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "request_id": "uuid-v4"
}
```

### 1.3 HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE |
| 400 | Validation error, malformed request |
| 401 | Missing or invalid authentication |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate resource) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable |

### 1.4 Core API Endpoints

#### Nexus Engine (port 8080)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/activate` | Activate a new business from JSON payload |
| GET | `/api/v1/presets` | List available industry presets |
| GET | `/api/v1/activation/{id}/status` | Check activation progress |
| GET | `/health` | Service health check |

#### CRM Service (port 8081)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/contacts` | List/create contacts |
| GET/PUT/DELETE | `/api/v1/contacts/{id}` | Retrieve/update/delete contact |
| GET/POST | `/api/v1/leads` | List/create leads |
| POST | `/api/v1/leads/{id}/convert` | Convert lead to opportunity |
| GET/POST | `/api/v1/opportunities` | List/create opportunities |

#### Finance Service (port 8082)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/initiate` | Initiate payment via configured gateway |
| POST | `/api/v1/payments/webhook/{provider}` | Payment webhook receiver |
| GET/POST | `/api/v1/invoices` | List/create invoices |
| GET | `/api/v1/invoices/{id}/pdf` | Download invoice PDF |

#### AI Service (port 8086)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agents/execute` | Execute an AI agent task |
| GET | `/api/v1/agents` | List available agent definitions |
| POST | `/api/v1/agents/chat` | Interactive AI chat session |
| GET | `/api/v1/agents/{id}/history` | Retrieve agent session history |

---

## 2. Data Specifications

### 2.1 Database Standards
- **Primary Keys**: UUID v4 (`gen_random_uuid()`)
- **Tenant Isolation**: Every table includes `tenant_id UUID NOT NULL` with index
- **Timestamps**: `created_at TIMESTAMP NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`
- **Soft Deletes**: `is_deleted BOOLEAN DEFAULT FALSE` on all primary entities
- **JSON Flexibility**: JSONB columns for settings, metadata, custom fields
- **Character Encoding**: UTF-8 throughout

### 2.2 Data Types
| Type | Usage | Constraints |
|------|-------|-------------|
| UUID | Primary keys, foreign keys, tenant IDs | v4, auto-generated |
| VARCHAR(255) | Names, emails, titles | NOT NULL where required |
| TEXT | Descriptions, content bodies | No length limit |
| JSONB | Settings, metadata, custom fields | Valid JSON enforced |
| TIMESTAMP | All date/time values | UTC timezone |
| BOOLEAN | Flags, toggles | DEFAULT FALSE |
| INTEGER | Counts, quantities | CHECK >= 0 where applicable |
| NUMERIC(12,2) | Financial amounts | Precision enforced |

### 2.3 Event Schema (Kafka/Redpanda)
```json
{
  "event_id": "uuid-v4",
  "event_type": "contact.created|payment.completed|...",
  "tenant_id": "uuid-v4",
  "timestamp": "2026-02-18T12:00:00Z",
  "source": "crm-service",
  "version": "1.0",
  "data": { },
  "metadata": {
    "user_id": "uuid-v4",
    "correlation_id": "uuid-v4"
  }
}
```

---

## 3. Communication Protocols

### 3.1 Synchronous Communication
| Protocol | Usage | Details |
|----------|-------|---------|
| REST/HTTP | Client-to-service, service-to-service | JSON payloads, Kong gateway |
| gRPC | High-performance inter-service | 13 protobuf definitions, streaming support |
| WebSocket | Real-time features | Chat, collaboration, notifications |
| WebRTC | Video/audio | Meet service, peer-to-peer with TURN fallback |

### 3.2 Asynchronous Communication
| Protocol | Usage | Details |
|----------|-------|---------|
| Kafka/Redpanda | Event streaming | Topic-per-service, tenant ACLs |
| SMTP | Email sending | Mail service outbound |
| IMAP | Email retrieval | Mail service inbound |
| CalDAV | Calendar sync | Standards-based calendar interoperability |

### 3.3 Security Protocols
| Protocol | Usage | Details |
|----------|-------|---------|
| TLS 1.3 | All external traffic | cert-manager with Let's Encrypt |
| mTLS | All internal service mesh traffic | Istio automatic certificate rotation |
| OAuth 2.0 | External integrations | Google Workspace, Zoho connectors |
| JWT (RS256) | API authentication | IDaaS-issued, short-lived (15 min access, 7 day refresh) |
| DKIM/SPF/DMARC | Email authentication | Mail service domain verification |

---

## 4. Performance Specifications

### 4.1 Latency Targets
| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Business Activation (full) | 120s | 180s | 300s |
| REST API response | 50ms | 150ms | 500ms |
| gRPC inter-service call | 5ms | 20ms | 50ms |
| Database query (indexed) | 2ms | 10ms | 50ms |
| AI agent response (streaming) | 500ms first token | 2s first token | 5s first token |
| WebSocket message delivery | 10ms | 50ms | 100ms |
| Email send (queued) | 100ms | 500ms | 1s |

### 4.2 Throughput Targets
| Metric | Target |
|--------|--------|
| API requests per tenant | 2,000/min (Enterprise tier) |
| Concurrent WebSocket connections per tenant | 10,000 |
| Kafka event throughput | 100,000 events/sec per cluster |
| File upload throughput | 100 MB/s per tenant |
| Email throughput | 10,000 emails/hour per tenant |

### 4.3 Availability Targets
| Environment | Target | Max Downtime/Month |
|-------------|--------|-------------------|
| Production | 99.95% | 21.6 minutes |
| Staging | 99.5% | 3.6 hours |
| Development | Best effort | N/A |

---

## 5. Scalability Specifications

### 5.1 Horizontal Scaling
- All stateless services scale horizontally via Kubernetes HPA
- Minimum replicas: 2 (production), 1 (staging)
- Maximum replicas: 20 per service (configurable per tenant tier)
- Scale triggers: CPU > 70%, Memory > 80%, Request latency P95 > 500ms

### 5.2 Data Scaling
- YugabyteDB: Automatic sharding across regions, linear read scaling
- Redis/DragonflyDB: Cluster mode with automatic slot migration
- Kafka/Redpanda: Topic partitioning by tenant_id hash
- MinIO: Erasure coding with 4+2 configuration across storage nodes

### 5.3 Multi-Tenant Capacity
| Tier | Max Tenants/Region | Max Users/Tenant | Max Storage/Tenant |
|------|-------------------|-----------------|-------------------|
| Starter | Unlimited | 50 | 10 GB |
| Professional | Unlimited | 500 | 100 GB |
| Enterprise | Unlimited | 5,000 | 1 TB |

---

## 6. Security Specifications

### 6.1 Authentication
- Multi-factor authentication (TOTP, SMS, Email OTP)
- SSO via SAML 2.0 and OpenID Connect
- API key rotation every 90 days (enforced)
- Session timeout: 30 minutes idle, 8 hours absolute

### 6.2 Authorization
- Role-Based Access Control (RBAC) with tenant-scoped roles
- Predefined roles: Owner, Admin, Manager, Member, Viewer, Guest
- Custom roles with granular permission sets
- Resource-level permissions for documents, projects, and shared assets

### 6.3 Data Protection
- Encryption at rest: AES-256 for databases and object storage
- Encryption in transit: TLS 1.3 for all traffic
- Tenant data isolation: Row-level security + namespace isolation
- PII handling: Tokenization for sensitive fields, GDPR-compliant data export/deletion
- Backup encryption: GPG-encrypted offsite backups

### 6.4 Compliance Targets
| Standard | Status | Notes |
|----------|--------|-------|
| SOC 2 Type II | Planned | Year 2 milestone |
| GDPR | In progress | Data residency in EU PoP |
| NDPR (Nigeria) | In progress | Data residency in Lagos PoP |
| ISO 27001 | Planned | Year 3 milestone |
| PCI DSS | Delegated | Via Stripe/Paystack tokenization |

---

## 7. Infrastructure Specifications

### 7.1 Kubernetes Configuration
- **Distribution**: RKE2 managed by Rancher 2.7+
- **Version**: Kubernetes 1.27+
- **CNI**: Calico 3.26+ with network policies
- **Service Mesh**: Istio 1.19+ (sidecar injection, mTLS)
- **Ingress**: Kong 3.x API gateway
- **GitOps**: ArgoCD app-of-apps pattern
- **CI/CD**: Tekton pipelines with Kaniko builds

### 7.2 Observability Stack
| Component | Tool | Purpose |
|-----------|------|---------|
| Metrics | Prometheus + Thanos | Time-series metrics, long-term storage |
| Dashboards | Grafana | Visualization, alerting |
| Logs | Loki + Promtail | Log aggregation and querying |
| Traces | Jaeger / Tempo | Distributed tracing |
| Alerts | Alertmanager | PagerDuty, Slack, email notifications |

### 7.3 DNS and TLS
- ExternalDNS for automated DNS record management
- cert-manager with Let's Encrypt for automatic TLS certificate provisioning
- Wildcard certificates for tenant subdomains (`*.{tenant}.nexus.bac.cloud`)

---

## 8. Integration Specifications

### 8.1 External Integration Protocols
| Integration | Protocol | Authentication | Data Format |
|-------------|----------|---------------|-------------|
| Google Workspace | REST API | OAuth 2.0 | JSON |
| Odoo | XML-RPC | API Key + Password | XML |
| Zoho | REST API | OAuth 2.0 | JSON |
| Stripe | REST API | API Key + Webhooks | JSON |
| Paystack | REST API | API Key + Webhooks | JSON |
| Flutterwave | REST API | API Key + Webhooks | JSON |
| WhatsApp Business | REST API | Bearer Token | JSON |
| Twilio | REST API | Account SID + Auth Token | JSON |
| Africa's Talking | REST API | API Key + Username | JSON |

### 8.2 Webhook Specifications
- Delivery: At-least-once with exponential backoff (1s, 2s, 4s, 8s, 16s, max 5 retries)
- Signature: HMAC-SHA256 in `X-Webhook-Signature` header
- Payload: Standard event schema (see Section 2.3)
- Timeout: 30 seconds per delivery attempt

---

*This document defines the technical contracts and performance expectations for the BAC-BOS-AI platform. All specifications are subject to refinement during development and load testing phases.*
