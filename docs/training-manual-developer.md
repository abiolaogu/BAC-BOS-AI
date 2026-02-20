# Training Manual: Developer -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Training Overview

This training manual prepares developers to build on, integrate with, and contribute to the BAC-BOS-AI (NEXUS Business Operating System) platform. The curriculum covers architecture deep dives, API development, service creation, AI agent development, and CI/CD workflows.

### 1.1 Training Objectives
Upon completion, developers will be able to:
- Set up the full development environment and run all services locally
- Build API integrations using REST and gRPC endpoints
- Create new microservices following NEXUS patterns and conventions
- Develop custom AI agents with MCP tool integration
- Write comprehensive tests (unit, integration, e2e)
- Use the CI/CD pipeline for building and deploying changes

### 1.2 Prerequisites
- Proficiency in at least one of: Go, Python, or TypeScript
- Familiarity with Docker, REST APIs, and relational databases
- Basic understanding of Kubernetes concepts (pods, services, deployments)

### 1.3 Training Schedule
| Module | Duration | Format |
|--------|----------|--------|
| Module 1: Architecture Deep Dive | 3 hours | Lecture + code walkthrough |
| Module 2: Development Environment | 2 hours | Hands-on lab |
| Module 3: API Development | 4 hours | Instructor-led + exercises |
| Module 4: Service Development | 4 hours | Project-based lab |
| Module 5: AI Agent Development | 3 hours | Instructor-led + lab |
| Module 6: Testing and Quality | 3 hours | Instructor-led + exercises |
| Module 7: CI/CD and Deployment | 2 hours | Instructor-led + demo |
| Module 8: Capstone Project | 4 hours | Independent project |
| **Total** | **25 hours** | |

---

## 2. Module 1: Architecture Deep Dive

### 2.1 Lesson: System Architecture
**Objective**: Understand the three-layer architecture in depth.

**Topics**:
- Orchestration Layer: Nexus Engine's 7-step provisioning pipeline
- Business Logic Layer: 25 microservices and their responsibilities
- Platform Layer: Control plane, MCP orchestrator, integration connectors
- Data Layer: PostgreSQL, Redis, Redpanda, MinIO and their roles

**Activity**: Trace a request from client through API Gateway (Kong) -> Nexus Engine -> CRM Service -> PostgreSQL -> Response. Identify all network hops and authentication checkpoints.

### 2.2 Lesson: Multi-Tenancy Architecture
**Objective**: Understand how tenant isolation works at every level.

**Key Concepts**:
```
Request Flow:
Client -> JWT (contains tenant_id) -> Kong validates -> Service extracts tenant_id
-> All DB queries include WHERE tenant_id = ? -> Response filtered by tenant
```

**Isolation Layers**:
1. Database: `tenant_id` column on every table, row-level filtering
2. Kubernetes: Per-tenant namespaces with network policies (Calico)
3. Kafka: Tenant-scoped topic ACLs
4. MinIO: Per-tenant bucket policies
5. API Gateway: Per-tenant rate limiting

**Exercise**: Examine the CRM service handler code and trace how tenant_id flows from JWT to database query.

### 2.3 Lesson: Event-Driven Architecture
**Objective**: Understand asynchronous communication patterns.

**Topics**:
- Kafka/Redpanda as the event backbone
- Event schema standard (event_id, event_type, tenant_id, timestamp, data)
- Event publication patterns (after successful database commit)
- Consumer group strategies and idempotent processing
- Dead letter queue handling

**Exercise**: Trace the event flow for a "payment.completed" event from the finance service through Redpanda to the notification service.

---

## 3. Module 2: Development Environment

### 3.1 Lesson: Local Setup
**Objective**: Get the full development environment running.

**Lab Exercise**:
```bash
# Step 1: Clone and inspect
git clone <repository-url>
cd BAC-BOS-AI
ls -la services/        # 13 business services
ls -la nexus-office-suite/  # 12 office suite services
ls -la bac-platform/    # 8 platform components

# Step 2: Start infrastructure
docker-compose up -d postgres redis redpanda minio
docker-compose ps  # Verify all healthy

# Step 3: Run the Nexus Engine
cd services/nexus-engine
go mod download
go run main.go  # Should listen on :8080

# Step 4: Test health endpoint
curl http://localhost:8080/health
# Expected: {"status": "ok", "service": "nexus-engine"}

# Step 5: Run a business activation
curl -X POST http://localhost:8080/api/v1/activate \
  -H "Content-Type: application/json" \
  -d '{"business_name":"DevTraining","region":"NG","currency":"NGN","industry":"ecommerce","channels":["web"],"payments":["paystack"]}'
```

**Validation Checklist**:
- [ ] PostgreSQL accessible on port 5432
- [ ] Redis accessible on port 6379
- [ ] Redpanda accessible on port 9092
- [ ] MinIO console accessible on port 9001
- [ ] Nexus Engine health endpoint returns 200

### 3.2 Lesson: IDE Configuration
**Objective**: Set up optimal IDE tooling.

**VS Code Extensions**:
- Go (official), Python (ms-python), ESLint, Prettier
- Docker, Kubernetes, REST Client, Proto3

**GoLand / PyCharm / WebStorm**:
- Configure Go SDK, Python interpreter, Node.js runtime
- Set up run configurations for each service
- Configure debugger attach for remote debugging

---

## 4. Module 3: API Development

### 4.1 Lesson: REST API Patterns
**Objective**: Build API integrations following NEXUS conventions.

**Conventions**:
```
Base: /api/v1/{resource}
Plural nouns for resources: /contacts, /invoices, /tasks
UUID for resource IDs: /contacts/{uuid}
Standard verbs: GET (list/read), POST (create), PUT (update), DELETE (remove)
Pagination: ?cursor={uuid}&limit={n}
```

**Lab Exercise -- CRM Integration**:
```bash
# 1. Create a contact
curl -X POST http://localhost:8081/api/v1/contacts \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-tenant" \
  -d '{"email":"john@example.com","first_name":"John","last_name":"Doe"}'

# 2. List contacts with pagination
curl "http://localhost:8081/api/v1/contacts?limit=10"

# 3. Update the contact
curl -X PUT http://localhost:8081/api/v1/contacts/{id} \
  -H "Content-Type: application/json" \
  -d '{"phone":"+234801234567","tags":["VIP"]}'

# 4. Search contacts
curl "http://localhost:8081/api/v1/contacts?search=john&tags=VIP"
```

### 4.2 Lesson: gRPC Service Communication
**Objective**: Implement inter-service calls using gRPC.

**Lab Exercise**:
```bash
# Generate Go client from proto
protoc --go_out=. --go-grpc_out=. proto/crm/v1/crm.proto

# Implement a gRPC call from finance-service to crm-service
```

```go
// Example: Finance service calling CRM service via gRPC
conn, err := grpc.Dial("crm-service:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
client := crmpb.NewCRMServiceClient(conn)
contact, err := client.GetContact(ctx, &crmpb.GetContactRequest{Id: customerID})
```

### 4.3 Lesson: Webhook Development
**Objective**: Implement webhook publishers and consumers.

**Lab Exercise**:
1. Register a webhook endpoint for "contact.created" events
2. Create a simple HTTP server to receive webhooks
3. Create a contact and verify the webhook is delivered
4. Implement signature verification in your webhook handler
5. Handle idempotency (process each event_id only once)

---

## 5. Module 4: Service Development

### 5.1 Lesson: Creating a New Microservice
**Objective**: Build a complete microservice following NEXUS patterns.

**Project: "Feedback Service" (Go/Gin)**

**Step 1 -- Project Structure**:
```
services/feedback-service/
├── main.go              # Entry point, router, middleware
├── handler.go           # HTTP request handlers
├── service.go           # Business logic
├── repository.go        # Database operations
├── model.go             # Data structures
├── handler_test.go      # Handler tests
├── service_test.go      # Service tests
└── Dockerfile           # Container build
```

**Step 2 -- Define the Model**:
```go
type Feedback struct {
    ID        string    `json:"id"`
    TenantID  string    `json:"tenant_id"`
    UserID    string    `json:"user_id"`
    Category  string    `json:"category"`  // product, service, support
    Rating    int       `json:"rating"`    // 1-5
    Comment   string    `json:"comment"`
    CreatedAt time.Time `json:"created_at"`
}
```

**Step 3 -- Implement Handler, Service, and Repository layers**
**Step 4 -- Add health endpoint and Kubernetes readiness probe**
**Step 5 -- Write unit tests (target 80% coverage)**
**Step 6 -- Create Dockerfile and Helm chart**

**Lab Exercise**: Build the complete Feedback Service over 4 hours, following the step-by-step guide. Deploy it locally and test all CRUD endpoints.

### 5.2 Lesson: Database Migration Patterns
**Objective**: Create and manage database migrations.

```sql
-- migrations/017_feedback_schema.sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_feedback_tenant ON feedback(tenant_id);
CREATE INDEX idx_feedback_user ON feedback(tenant_id, user_id);
CREATE INDEX idx_feedback_category ON feedback(tenant_id, category);
```

### 5.3 Lesson: Event Publishing
**Objective**: Publish domain events to Kafka/Redpanda.

```go
// After successful database insert
event := Event{
    ID:        uuid.New().String(),
    Type:      "feedback.created",
    TenantID:  feedback.TenantID,
    Timestamp: time.Now().UTC(),
    Data:      feedback,
}
producer.Publish("feedback-events", event)
```

---

## 6. Module 5: AI Agent Development

### 6.1 Lesson: Agent Architecture
**Objective**: Understand the AI service architecture.

**Components**:
- **AgentEngine**: Loads 200+ agent definitions, routes to LLM providers
- **Agent Definitions**: JSON configs specifying system prompts, tools, guardrails
- **MCP Orchestrator**: Model Context Protocol for tool integration
- **Provider Adapters**: OpenAI, Anthropic, Google, Meta LLM connectors

### 6.2 Lesson: Creating a Custom Agent
**Objective**: Define and deploy a custom AI agent.

**Lab Exercise**:
```json
{
  "agent_id": "feedback-analyzer",
  "name": "Feedback Analyzer",
  "description": "Analyzes customer feedback and identifies trends",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "system_prompt": "You are a customer feedback analyst for the NEXUS platform. Analyze feedback data, identify trends, sentiment, and provide actionable recommendations. Always cite specific feedback entries in your analysis.",
  "tools": [
    {
      "name": "query_feedback",
      "description": "Query customer feedback records",
      "service": "feedback-service",
      "endpoint": "/api/v1/feedback",
      "method": "GET"
    },
    {
      "name": "query_crm",
      "description": "Look up customer details",
      "service": "crm-service",
      "endpoint": "/api/v1/contacts",
      "method": "GET"
    }
  ],
  "guardrails": {
    "max_tokens": 4096,
    "temperature": 0.3,
    "content_filter": true,
    "pii_protection": true
  }
}
```

**Steps**:
1. Define the agent JSON configuration
2. Register it via `POST /api/v1/agents`
3. Test execution: `POST /api/v1/agents/execute` with a sample query
4. Verify tool calls are executed correctly
5. Refine the system prompt based on output quality

### 6.3 Lesson: MCP Tool Development
**Objective**: Expose service functionality as AI-accessible tools.

**Lab Exercise**: Register the Feedback Service as an MCP tool so AI agents can query, summarize, and analyze feedback data programmatically.

---

## 7. Module 6: Testing and Quality

### 7.1 Lesson: Unit Testing
**Objective**: Write effective unit tests for each service layer.

**Go Testing Pattern**:
```go
func TestFeedbackService_Create(t *testing.T) {
    mockRepo := &MockFeedbackRepository{}
    svc := NewFeedbackService(mockRepo)

    input := CreateFeedbackInput{
        TenantID: "tenant-1",
        UserID:   "user-1",
        Category: "product",
        Rating:   5,
        Comment:  "Excellent platform!",
    }

    mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*Feedback")).
        Return(nil)

    feedback, err := svc.Create(context.Background(), input)
    assert.NoError(t, err)
    assert.Equal(t, 5, feedback.Rating)
    mockRepo.AssertExpectations(t)
}
```

### 7.2 Lesson: Integration Testing
**Objective**: Test service interactions with real dependencies.

**Using Testcontainers**:
```go
func TestFeedbackRepository_Integration(t *testing.T) {
    ctx := context.Background()
    pgContainer, _ := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15"),
    )
    defer pgContainer.Terminate(ctx)

    connStr, _ := pgContainer.ConnectionString(ctx)
    db, _ := sql.Open("postgres", connStr)

    // Run migrations
    // Test CRUD operations against real PostgreSQL
}
```

### 7.3 Lesson: Test Coverage and Quality Gates
**Objective**: Meet the CI pipeline quality requirements.

**Targets**:
- Unit test coverage: 80%+ (CI gate at 75%)
- All API endpoints have integration tests
- No critical or high security vulnerabilities (Trivy)
- Lint clean (golangci-lint, ruff, eslint)

**Exercise**: Run `go test ./... -cover` on your Feedback Service and achieve 80% coverage.

---

## 8. Module 7: CI/CD and Deployment

### 8.1 Lesson: Tekton Pipeline
**Objective**: Understand and use the CI/CD pipeline.

**Pipeline Stages**:
```
Build (Kaniko) -> Test (go test/pytest/jest) -> Security Scan (Trivy)
    -> Deploy (kubectl, staging) -> Update Manifest (kustomize, production)
```

**Lab Exercise**:
1. Push a change to a feature branch
2. Observe the Tekton pipeline execution
3. Review build logs, test results, and security scan output
4. Upon successful pipeline, verify the change in staging

### 8.2 Lesson: ArgoCD GitOps
**Objective**: Understand GitOps deployment with ArgoCD.

**Key Concepts**:
- App-of-apps pattern: One ArgoCD Application manages all service Applications
- Sync strategy: Automated for staging, manual approval for production
- Rollback: ArgoCD maintains revision history for instant rollback
- Health checks: ArgoCD verifies Kubernetes resource health after sync

**Lab Exercise**:
1. Open the ArgoCD dashboard
2. View the application tree for the staging environment
3. Trigger a manual sync for a specific service
4. View the deployment diff before and after sync
5. Practice a rollback to a previous revision

---

## 9. Module 8: Capstone Project

### 9.1 Project Brief
Build a complete "Customer Survey Service" that:
1. Defines a survey data model with questions, responses, and analytics
2. Implements full CRUD REST API following NEXUS conventions
3. Publishes domain events to Redpanda
4. Includes a custom AI agent for survey analysis
5. Achieves 80%+ test coverage
6. Deploys via the CI/CD pipeline to staging

### 9.2 Evaluation Criteria
| Criterion | Weight | Passing |
|-----------|--------|---------|
| API design (REST conventions, error handling) | 20% | All endpoints working |
| Code quality (patterns, naming, structure) | 20% | Follows NEXUS standards |
| Multi-tenancy (tenant_id isolation) | 15% | All queries tenant-scoped |
| Testing (unit + integration) | 20% | 80%+ coverage |
| Event publishing | 10% | Events on Redpanda topic |
| AI agent integration | 15% | Agent queries service correctly |

### 9.3 Submission
- Push to a feature branch
- Create a pull request with description of design decisions
- Ensure CI pipeline passes
- Present a 10-minute demo to the training team

---

## 10. Certification

### 10.1 Developer Certification Levels
| Level | Requirements | Validity |
|-------|-------------|----------|
| NEXUS Developer Associate | Complete Modules 1-6 + pass knowledge exam (80%) | 1 year |
| NEXUS Developer Professional | Associate + Capstone project + 6 months contribution | 2 years |
| NEXUS Developer Expert | Professional + 2 merged service contributions + architecture review participation | 3 years |

---

*Training materials are maintained in the repository and updated with each platform release. For lab environment access, contact the developer experience team.*
