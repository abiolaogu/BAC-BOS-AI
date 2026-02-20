# User Manual: Developer -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Introduction

This manual is for developers building on, integrating with, or extending the BAC-BOS-AI (NEXUS Business Operating System) platform. It covers API usage, SDK patterns, webhook integration, custom agent development, and contribution workflows.

### 1.1 Developer Audience
- **Integration Developers**: Building applications that consume NEXUS APIs
- **Platform Developers**: Contributing to core NEXUS microservices
- **Extension Developers**: Creating custom modules, agents, or plugins
- **DevOps Engineers**: Managing infrastructure, CI/CD, and deployments

---

## 2. Development Environment Setup

### 2.1 Prerequisites
| Requirement | Version | Installation |
|-------------|---------|-------------|
| Docker | 24+ | `brew install docker` / `apt install docker.io` |
| Docker Compose | v2.20+ | Bundled with Docker Desktop |
| Go | 1.21+ | `brew install go` / download from golang.org |
| Python | 3.11+ | `brew install python@3.11` / `apt install python3.11` |
| Node.js | 20+ | `brew install node@20` / use nvm |
| kubectl | 1.27+ | `brew install kubectl` |
| Helm | 3.12+ | `brew install helm` |
| protoc | 3.x | `brew install protobuf` |

### 2.2 Repository Setup
```bash
# Clone the repository
git clone <repository-url>
cd BAC-BOS-AI

# Start infrastructure dependencies
docker-compose up -d postgres redis redpanda minio

# Verify infrastructure
docker-compose ps
# Expected: postgres (5432), redis (6379), redpanda (9092), minio (9000/9001)

# Run a service (example: nexus-engine)
cd services/nexus-engine
go mod download
go run main.go
# Service available at http://localhost:8080

# Run the AI service
cd services/ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8086
```

### 2.3 Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Required variables:
DATABASE_URL=postgres://nexus:password@localhost:5432/nexus?sslmode=disable
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Optional (for full functionality):
STRIPE_SECRET_KEY=sk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 3. API Reference

### 3.1 Authentication
All API requests require authentication via JWT Bearer token or API key.

```bash
# Authenticate and receive JWT
curl -X POST https://api.nexus.bac.cloud/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@company.com", "password": "..."}'

# Response:
# { "access_token": "eyJ...", "refresh_token": "eyJ...", "expires_in": 900 }

# Use the token in subsequent requests
curl -H "Authorization: Bearer eyJ..." \
  https://api.nexus.bac.cloud/api/v1/contacts

# Alternatively, use API key
curl -H "X-API-Key: nxs_live_..." \
  https://api.nexus.bac.cloud/api/v1/contacts
```

### 3.2 Request/Response Format
```
# Standard request headers
Content-Type: application/json
Authorization: Bearer {jwt_token}
X-Tenant-ID: {tenant_uuid}  (optional; extracted from JWT if not provided)

# Standard success response
{
  "status": "success",
  "data": { ... },
  "meta": { "page": 1, "limit": 50, "total": 100 }
}

# Standard error response
{
  "status": "error",
  "errors": [{ "code": "VALIDATION_ERROR", "field": "email", "message": "..." }],
  "request_id": "uuid"
}
```

### 3.3 Pagination
```bash
# Cursor-based pagination
GET /api/v1/contacts?limit=50
GET /api/v1/contacts?limit=50&cursor=uuid-of-last-item

# The response meta object contains:
# "cursor": "uuid-next" (use this for the next page)
# "total": 1234 (total count of matching records)
```

### 3.4 Core Endpoints Quick Reference

| Service | Base Path | Key Operations |
|---------|-----------|---------------|
| Nexus Engine | `/api/v1/activate` | POST activate, GET presets, GET status |
| CRM | `/api/v1/contacts`, `/api/v1/leads`, `/api/v1/opportunities` | CRUD + convert + search |
| Finance | `/api/v1/payments`, `/api/v1/invoices` | Initiate, webhook, invoice PDF |
| HR | `/api/v1/employees`, `/api/v1/departments` | CRUD + org structure |
| Projects | `/api/v1/projects`, `/api/v1/tasks` | CRUD + Kanban + sprints |
| Inventory | `/api/v1/products`, `/api/v1/stock` | CRUD + stock adjustments |
| AI | `/api/v1/agents/execute`, `/api/v1/agents/chat` | Execute, chat, history |
| Documents | `/api/v1/documents` | CRUD + versioning |

---

## 4. Webhook Integration

### 4.1 Registering Webhooks
```bash
curl -X POST https://api.nexus.bac.cloud/api/v1/webhooks \
  -H "Authorization: Bearer ..." \
  -d '{
    "url": "https://your-app.com/webhooks/nexus",
    "events": ["contact.created", "payment.completed", "ticket.updated"],
    "secret": "your-webhook-secret"
  }'
```

### 4.2 Webhook Payload Format
```json
{
  "event_id": "uuid",
  "event_type": "contact.created",
  "tenant_id": "uuid",
  "timestamp": "2026-02-18T12:00:00Z",
  "data": {
    "id": "uuid",
    "email": "contact@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### 4.3 Verifying Webhook Signatures
```python
import hmac, hashlib

def verify_webhook(payload_bytes, signature, secret):
    expected = hmac.new(
        secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

### 4.4 Available Event Types
| Category | Events |
|----------|--------|
| CRM | `contact.created`, `contact.updated`, `contact.deleted`, `lead.converted`, `opportunity.won`, `opportunity.lost` |
| Finance | `payment.initiated`, `payment.completed`, `payment.failed`, `invoice.created`, `invoice.paid` |
| HR | `employee.created`, `employee.updated`, `leave.requested`, `leave.approved` |
| Projects | `task.created`, `task.completed`, `milestone.reached`, `sprint.completed` |
| Support | `ticket.created`, `ticket.updated`, `ticket.resolved`, `sla.breached` |

---

## 5. gRPC Integration

### 5.1 Protobuf Definitions
The platform includes 13 protobuf files defining inter-service contracts.

```protobuf
// Example: CRM service proto
syntax = "proto3";
package nexus.crm.v1;

service CRMService {
  rpc GetContact(GetContactRequest) returns (Contact);
  rpc ListContacts(ListContactsRequest) returns (ListContactsResponse);
  rpc CreateContact(CreateContactRequest) returns (Contact);
}

message Contact {
  string id = 1;
  string tenant_id = 2;
  string email = 3;
  string first_name = 4;
  string last_name = 5;
}
```

### 5.2 Generating Client Code
```bash
# Go client
protoc --go_out=. --go-grpc_out=. proto/crm/v1/crm.proto

# Python client
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. proto/crm/v1/crm.proto

# TypeScript client
npx grpc_tools_node_protoc --ts_out=. --grpc_out=. proto/crm/v1/crm.proto
```

---

## 6. Custom AI Agent Development

### 6.1 Agent Definition Schema
```json
{
  "agent_id": "custom-sales-analyzer",
  "name": "Sales Analyzer",
  "description": "Analyzes sales pipeline and provides recommendations",
  "provider": "openai",
  "model": "gpt-4",
  "system_prompt": "You are a sales analysis assistant...",
  "tools": [
    {
      "name": "query_crm",
      "description": "Query CRM contacts and opportunities",
      "service": "crm-service",
      "endpoint": "/api/v1/opportunities"
    }
  ],
  "guardrails": {
    "max_tokens": 4096,
    "temperature": 0.7,
    "content_filter": true,
    "pii_protection": true
  }
}
```

### 6.2 Registering a Custom Agent
```bash
curl -X POST https://api.nexus.bac.cloud/api/v1/agents \
  -H "Authorization: Bearer ..." \
  -d @custom-agent-definition.json
```

### 6.3 MCP Tool Integration
To expose your service as a tool for AI agents via the Model Context Protocol:

```python
# Register with MCP orchestrator
from mcp_client import MCPClient

mcp = MCPClient(orchestrator_url="http://mcp-orchestrator:8090")
mcp.register_tool(
    name="my_custom_tool",
    description="Performs custom analysis on business data",
    input_schema={"type": "object", "properties": {"query": {"type": "string"}}},
    handler=my_tool_handler
)
```

---

## 7. Contributing to NEXUS

### 7.1 Development Workflow
1. Create a feature branch from `develop`: `git checkout -b feature/my-feature`
2. Make changes following the code standards (see Section 7.2)
3. Write tests (minimum 80% coverage for new code)
4. Run local tests: `go test ./...` (Go), `pytest` (Python), `npx jest` (TypeScript)
5. Push and create a pull request against `develop`
6. Tekton CI runs automatically: build, test, security scan
7. Request code review from at least one team member
8. Merge after approval and green CI

### 7.2 Code Standards
| Language | Formatter | Linter | Testing |
|----------|-----------|--------|---------|
| Go | `gofmt` | `golangci-lint` | `go test` + `testify` |
| Python | `black` | `ruff` | `pytest` + `pytest-asyncio` |
| TypeScript | `prettier` | `eslint` | `jest` + `supertest` |

### 7.3 Commit Message Format
```
<type>(<scope>): <description>

Types: feat, fix, docs, refactor, test, chore
Scope: nexus-engine, crm, finance, ai, office, platform, infra

Example: feat(crm): add bulk contact import from CSV
```

### 7.4 Service Development Pattern (Go/Gin)
```go
// Standard service structure:
// main.go          - Entry point, router setup, middleware
// handler.go       - HTTP handlers (request parsing, response formatting)
// service.go       - Business logic
// repository.go    - Database operations
// model.go         - Data structures
// handler_test.go  - Handler tests
// service_test.go  - Service logic tests

func main() {
    r := gin.Default()
    r.Use(cors.Default())
    r.Use(tenantMiddleware())  // Extract tenant_id from JWT

    r.GET("/health", handleHealth)
    r.GET("/api/v1/resources", handleList)
    r.POST("/api/v1/resources", handleCreate)
    r.GET("/api/v1/resources/:id", handleGet)
    r.PUT("/api/v1/resources/:id", handleUpdate)
    r.DELETE("/api/v1/resources/:id", handleDelete)

    r.Run(":8081")
}
```

---

## 8. Testing Guide

### 8.1 Running Tests Locally
```bash
# Go services
cd services/crm-service
go test ./... -v -cover

# Python services
cd services/ai-service
pytest --cov=. -v

# TypeScript services
cd services/idaas-service
npx jest --coverage

# Integration tests (requires Docker)
docker-compose up -d postgres redis
go test ./... -tags=integration
```

### 8.2 Writing Effective Tests
```go
// Go test example with testify
func TestCreateContact_Success(t *testing.T) {
    repo := NewMockRepository()
    svc := NewService(repo)

    contact, err := svc.CreateContact(ctx, CreateContactInput{
        TenantID: "test-tenant-id",
        Email:    "test@example.com",
        Name:     "Test User",
    })

    assert.NoError(t, err)
    assert.Equal(t, "test@example.com", contact.Email)
    assert.NotEmpty(t, contact.ID)
}
```

---

## 9. Debugging and Troubleshooting

### 9.1 Local Debugging
- **Go**: Use `dlv debug` or VS Code Go debugger with launch.json
- **Python**: Use `debugpy` or VS Code Python debugger
- **TypeScript**: Use `node --inspect` or VS Code Node.js debugger

### 9.2 Kubernetes Debugging
```bash
# View pod logs
kubectl logs -f deployment/crm-service -n nexus-services

# Exec into a running pod
kubectl exec -it deployment/crm-service -n nexus-services -- /bin/sh

# Port-forward a service for local access
kubectl port-forward svc/crm-service 8081:8081 -n nexus-services

# Check service mesh (Istio)
istioctl analyze -n nexus-services
```

### 9.3 Common Development Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| Connection refused to DB | PostgreSQL not running | `docker-compose up -d postgres` |
| JWT validation fails | Missing/expired token | Re-authenticate; check token expiry |
| gRPC connection error | Protobuf version mismatch | Regenerate proto stubs |
| Kafka consumer not receiving | Topic not created | Check Redpanda topic list |
| MinIO upload fails | Bucket not created | Create bucket via MinIO console (port 9001) |

---

## 10. API Rate Limits and Quotas

| Plan | Rate Limit | Webhook Events | AI Agent Calls | Storage |
|------|-----------|---------------|---------------|---------|
| Starter | 100 req/min | 1,000/day | 500/month | 10 GB |
| Professional | 500 req/min | 10,000/day | 5,000/month | 100 GB |
| Enterprise | 2,000 req/min | Unlimited | 50,000/month | 1 TB |

When rate limited, the API returns HTTP 429 with a `Retry-After` header indicating seconds until the limit resets.

---

*For the latest API documentation and interactive examples, visit the API Explorer at `https://api.nexus.bac.cloud/docs`. For SDK downloads, check the developer portal.*
