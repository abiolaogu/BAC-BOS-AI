# Testing Requirements (AIDD) -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Testing Strategy Overview

The BAC-BOS-AI platform employs a comprehensive testing strategy aligned with the AI-Driven Development (AIDD) pipeline. Testing spans unit, integration, end-to-end, performance, security, and AI-specific validation across 25+ microservices written in Go, Python, and TypeScript.

### 1.1 Testing Pyramid
```
                    ┌──────────┐
                    │   E2E    │  ~50 tests  (Playwright/Cypress)
                   ┌┴──────────┴┐
                   │ Integration │  ~300 tests (Testcontainers, API)
                  ┌┴────────────┴┐
                  │    Unit       │  ~2,000 tests (go test, pytest, jest)
                  └──────────────┘
```

### 1.2 Coverage Targets
| Layer | Target Coverage | Enforcement |
|-------|----------------|-------------|
| Unit Tests | 80% line coverage | CI gate (fail below 75%) |
| Integration Tests | All API endpoints | CI gate |
| E2E Tests | Critical user journeys | Staging gate |
| Performance Tests | All latency SLAs | Pre-production gate |
| Security Tests | OWASP Top 10 | Pre-production gate |

---

## 2. Unit Testing Requirements

### 2.1 Go Services (Gin Framework)
**Framework**: `testing` (stdlib) + `testify` for assertions
**Runner**: `go test ./...`

| Service | Test Focus | Minimum Coverage |
|---------|-----------|-----------------|
| nexus-engine | Activation pipeline steps, input validation, industry preset loading | 85% |
| crm-service | Contact/Lead/Opportunity CRUD, search filters, custom fields | 80% |
| finance-service | Payment gateway abstraction, webhook validation, invoice calculations | 85% |
| hr-service | Employee management, department hierarchy, org structure | 80% |
| inventory-service | Stock calculations, warehouse operations, product catalog | 80% |
| projects-service | Task state transitions, sprint management, Kanban operations | 80% |
| marketing-service | Campaign lifecycle, template rendering | 75% |
| support-service | Ticket lifecycle, SLA calculation, escalation rules | 80% |
| documents-service | Document versioning, CRUD operations | 75% |
| vas-service | Provider management, service catalog | 75% |

```go
// Example: nexus-engine activation test
func TestActivateBusiness_ValidInput(t *testing.T) {
    input := BusinessActivationInput{
        BusinessName: "TestCorp",
        Region:       "NG",
        Currency:     "NGN",
        Industry:     "ecommerce",
        Channels:     []string{"web", "whatsapp"},
        Payments:     []string{"paystack"},
    }
    result, err := ActivateBusiness(context.Background(), input)
    assert.NoError(t, err)
    assert.NotEmpty(t, result.TenantID)
    assert.Equal(t, "active", result.Status)
}
```

### 2.2 Python Services (FastAPI)
**Framework**: `pytest` + `pytest-asyncio`
**Runner**: `pytest --cov=. --cov-report=html`

| Service | Test Focus | Minimum Coverage |
|---------|-----------|-----------------|
| ai-service | Agent loading, LLM routing, session management, tool execution | 85% |
| mcp-orchestrator | MCP protocol compliance, tool registration, context management | 80% |

```python
# Example: ai-service agent execution test
@pytest.mark.asyncio
async def test_agent_execute_routes_to_correct_provider():
    request = AgentExecutionRequest(
        agent_id="crm-assistant",
        input="List all contacts with tag 'VIP'",
        provider="openai"
    )
    engine = AgentEngine()
    response = await engine.execute(request)
    assert response.status == "completed"
    assert response.provider == "openai"
```

### 2.3 TypeScript Services (NestJS/Express)
**Framework**: `jest` + `supertest`
**Runner**: `npx jest --coverage`

| Service | Test Focus | Minimum Coverage |
|---------|-----------|-----------------|
| idaas-service | JWT issuance, MFA flows, SSO, session management | 85% |
| time-attendance | Attendance records, leave calculations, overtime rules, biometrics | 80% |
| chat-service | WebSocket message handling, channel management | 75% |
| meet-service | Room management, signaling, recording | 75% |
| collaboration-service | CRDT/OT merge operations, conflict resolution | 85% |

---

## 3. Integration Testing Requirements

### 3.1 API Integration Tests
**Framework**: `testcontainers` (Go/Python) for database and message broker dependencies

| Test Suite | Services Under Test | Dependencies |
|------------|-------------------|--------------|
| Activation Pipeline | nexus-engine, all enabled services | PostgreSQL, Redis, Redpanda |
| CRM Workflow | crm-service, ai-service | PostgreSQL, Redis |
| Payment Processing | finance-service, notification-service | PostgreSQL, Stripe/Paystack sandbox |
| HR Operations | hr-service, time-attendance | PostgreSQL |
| Office Suite | mail, drive, writer, calendar | PostgreSQL, MinIO, Redis |
| AI Agent Pipeline | ai-service, mcp-orchestrator, crm-service | PostgreSQL, Redis, LLM API |

### 3.2 Database Integration Tests
- **Schema validation**: All 16 migration files apply cleanly to a fresh PostgreSQL instance
- **Rollback validation**: Each migration's down script reverses changes without data loss
- **Multi-tenant isolation**: Queries with tenant_id filters return correct data subsets
- **Concurrent access**: 100 concurrent transactions on shared tables complete without deadlocks
- **JSONB operations**: Settings, metadata, and custom fields correctly serialize/deserialize

### 3.3 Event Streaming Integration Tests
- **Event publication**: Each service correctly publishes domain events to Redpanda/Kafka topics
- **Event consumption**: Consumer services process events idempotently
- **Event ordering**: Events for the same tenant_id are processed in order
- **Dead letter queue**: Failed events are routed to DLQ after max retries

### 3.4 External Integration Tests (Sandbox)
| Integration | Sandbox/Test Mode | Test Cases |
|-------------|-------------------|------------|
| Stripe | Test API keys | Payment creation, webhook processing, refund |
| Paystack | Test API keys | Payment initialization, verification, webhook |
| Google Workspace | Service account (test domain) | Calendar sync, drive file access, contact export |
| Odoo | Demo instance | XML-RPC connection, data import, field mapping |
| WhatsApp Business | Sandbox number | Message send, template delivery, read receipts |

---

## 4. End-to-End Testing Requirements

### 4.1 Critical User Journeys
**Framework**: Playwright (primary) or Cypress (alternative)

| Journey | Steps | Pass Criteria |
|---------|-------|--------------|
| Business Activation | Submit JSON -> Wait for provisioning -> Access admin console -> Verify all modules | All services reachable, credentials valid |
| Sales Pipeline | Create contact -> Create lead -> Qualify -> Convert -> Close deal | Data flows through all CRM stages |
| Payment Cycle | Create invoice -> Send to customer -> Customer pays -> Webhook received -> Status updated | Payment recorded, invoice marked paid |
| Document Collaboration | Create doc -> Share with team -> Co-edit -> Export PDF | All edits preserved, PDF generated |
| Employee Onboarding | Create employee -> Assign department -> Set attendance rules -> Grant system access | Employee active in all relevant services |
| AI Copilot Interaction | Open AI chat -> Ask CRM question -> Agent queries CRM -> Returns answer | Correct data retrieved and presented |

### 4.2 Cross-Service E2E Scenarios
- **Tenant lifecycle**: Activation -> normal operations -> plan upgrade -> data export -> deactivation
- **Multi-channel communication**: Email + WhatsApp + in-app notification for the same event
- **Office suite integration**: Create event in calendar -> attach document from drive -> send invite via mail -> join meeting via meet

---

## 5. Performance Testing Requirements

### 5.1 Load Testing
**Framework**: k6 (primary) or Locust (alternative)

| Scenario | Virtual Users | Duration | Pass Criteria |
|----------|--------------|----------|--------------|
| API steady state | 500 VU | 30 min | P95 < 150ms, error rate < 0.1% |
| API peak load | 2,000 VU | 15 min | P95 < 500ms, error rate < 1% |
| Business activation burst | 50 concurrent activations | 30 min | All complete within 5 min |
| WebSocket connections | 10,000 concurrent | 60 min | Message delivery < 100ms |
| File upload stress | 100 concurrent 50MB uploads | 15 min | All uploads complete, no corruption |

### 5.2 Database Performance Tests
| Test | Condition | Pass Criteria |
|------|-----------|--------------|
| Query latency | 1M rows per table, indexed queries | P95 < 10ms |
| Write throughput | Bulk insert 10,000 records | Complete within 30 seconds |
| Connection pool saturation | Max connections reached | Graceful queuing, no crashes |
| Cross-tenant query isolation | Parallel queries for 100 tenants | No data leakage, P95 < 50ms |

### 5.3 AI Service Performance Tests
| Test | Condition | Pass Criteria |
|------|-----------|--------------|
| Agent response time | 100 concurrent agent requests | First token < 2s (P95) |
| Session history loading | 50-message session context | Total processing < 5s |
| Tool call roundtrip | AI -> MCP -> Service -> AI | Complete within 3s |

---

## 6. Security Testing Requirements

### 6.1 Static Analysis
| Tool | Target | Frequency |
|------|--------|-----------|
| Trivy | Container images | Every build (CI gate) |
| gosec | Go source code | Every commit |
| bandit | Python source code | Every commit |
| npm audit | Node.js dependencies | Every commit |
| Snyk | All dependencies | Weekly |

### 6.2 Dynamic Security Tests (DAST)
| Test Category | Tool | Pass Criteria |
|--------------|------|--------------|
| OWASP Top 10 | OWASP ZAP | No critical or high findings |
| SQL Injection | sqlmap + custom tests | All inputs parameterized |
| XSS | OWASP ZAP + custom payloads | All user input sanitized |
| CSRF | Manual + automated | All state-changing endpoints protected |
| Authentication Bypass | Custom test suite | No bypass vectors found |
| Authorization Testing | Custom RBAC test matrix | All role boundaries enforced |

### 6.3 Multi-Tenant Security Tests
- **Tenant boundary testing**: Attempt cross-tenant data access via manipulated tenant_id headers
- **JWT tampering**: Modified JWT tokens are rejected; expired tokens are refused
- **API key scope**: API keys cannot access resources outside their tenant scope
- **Namespace isolation**: Kubernetes network policies prevent cross-namespace traffic

---

## 7. AI-Specific Testing Requirements

### 7.1 AI Agent Validation
| Test Category | Description | Pass Criteria |
|--------------|-------------|--------------|
| Agent accuracy | Validate agent responses against known-correct answers | 90%+ accuracy on test suite |
| Hallucination detection | Test agents with questions about non-existent data | Agent responds "data not found" rather than fabricating |
| Guardrail enforcement | Submit prohibited prompts (PII extraction, harmful content) | All prohibited requests blocked |
| Provider failover | Simulate primary LLM provider outage | Automatic failover to secondary provider |
| Token budget compliance | Verify agents stay within configured token limits | No budget overruns |

### 7.2 MCP Protocol Tests
- **Tool registration**: All platform tools correctly registered with MCP orchestrator
- **Context injection**: Tenant context correctly passed to AI agents
- **Tool call execution**: Agent tool calls route to correct service and return valid data
- **Error handling**: Tool call failures return graceful error messages to the agent

---

## 8. Test Environments

### 8.1 CI Environment (Tekton)
- Ephemeral containers with testcontainers for database and message broker dependencies
- Runs on every pull request and merge to main
- Gate: Unit tests + integration tests + static security analysis
- Maximum pipeline duration: 15 minutes

### 8.2 Staging Environment
- Full Kubernetes deployment mirroring production topology
- Runs E2E tests, performance tests, and DAST after deployment
- Gate: All staging tests pass before production deployment approval
- Tenant data seeded with realistic synthetic data (10,000 contacts, 5,000 invoices, etc.)

### 8.3 Production Verification
- Smoke tests run automatically after each production deployment
- Health check validation for all 25+ services
- Synthetic transaction monitoring (canary tests) running continuously

---

## 9. Test Data Management

### 9.1 Test Data Strategy
| Environment | Data Source | Refresh Frequency |
|-------------|-----------|-------------------|
| Unit tests | In-memory fixtures, factory functions | Every test run |
| Integration tests | Testcontainers with migration scripts | Every test run |
| Staging | Synthetic data generator + anonymized production samples | Weekly |
| Performance tests | Large-scale synthetic dataset (1M+ records) | Before each test cycle |

### 9.2 Data Anonymization Rules
- Email addresses replaced with `user{n}@test.nexus.bac.cloud`
- Phone numbers replaced with test-range numbers
- Financial amounts randomized within realistic ranges
- Company names replaced with synthetic names
- All PII fields hashed or replaced

---

## 10. Test Reporting and Metrics

### 10.1 CI/CD Reports
- Test results published to Tekton dashboard and GitHub PR checks
- Coverage reports uploaded to SonarQube or Codecov
- Security scan results published to vulnerability management dashboard

### 10.2 Key Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Test pass rate | > 99% | Per CI pipeline run |
| Code coverage | > 80% | Per service |
| Mean time to fix broken tests | < 4 hours | Tracked in project management |
| Flaky test rate | < 2% | Weekly analysis |
| Security vulnerability remediation | Critical: 24h, High: 72h | Tracked in security dashboard |

---

*Testing requirements are maintained alongside the codebase and updated with each feature addition. All tests must pass before code is merged to the main branch.*
