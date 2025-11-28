# Running NEXUS Stack - Complete Guide

## Prerequisites

1. **Docker & Docker Compose**
   - Docker Desktop (Mac/Windows) or Docker Engine (Linux)
   - Docker Compose v2.0+
   
   Install on Mac:
   ```bash
   brew install --cask docker
   ```

2. **API Keys (Optional but recommended)**
   - See `docs/PAYMENT_API_KEYS.md` for details
   - Create a `.env` file in the project root:
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_stripe_key
   PAYSTACK_SECRET_KEY=sk_test_your_paystack_key
   OPENAI_API_KEY=sk-your_openai_key
   ```

---

## Quick Start

### 1. Build and Start All Services

```bash
# From the project root
docker compose up --build -d
```

This will start:
- **Redpanda** (Event streaming) - Port 9092
- **PostgreSQL** (Database) - Port 5432
- **Redis** (Cache) - Port 6379
- **MinIO** (Object storage) - Port 9000
- **NEXUS Engine** - Port 8080
- **CRM Service** - Port 8081
- **Finance Service** - Port 8082
- **AI Service** - Port 8086
- **Web Console** - Port 3000
- **Prometheus** - Port 9090
- **Grafana** - Port 3001

### 2. Check Service Health

```bash
# Check all services are running
docker compose ps

# Check individual service health
curl http://localhost:8080/health  # NEXUS Engine
curl http://localhost:8082/health  # Finance Service
curl http://localhost:8086/health  # AI Service
```

### 3. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f finance-service
docker compose logs -f ai-service
```

---

## Testing Services

### Test Finance Service (Payments)

```bash
# Run the test script
./tests/test_payments.sh
```

Or manually:

```bash
# Test Stripe payment
curl -X POST http://localhost:8082/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "description": "Test Payment",
    "reference": "TEST001",
    "email": "customer@example.com",
    "provider": "stripe"
  }'

# Test Paystack payment
curl -X POST http://localhost:8082/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "NGN",
    "description": "Test Payment",
    "reference": "TEST002",
    "email": "customer@example.ng",
    "provider": "paystack"
  }'
```

### Test AI Service (1,600+ Agents)

```bash
# Run the test script
./tests/test_ai_agents.sh
```

Or manually:

```bash
# List all agents
curl http://localhost:8086/agents | python3 -m json.tool

# Get specific agent
curl http://localhost:8086/agents/sales_lead_generation_1 | python3 -m json.tool

# Execute agent
curl -X POST http://localhost:8086/agents/sales_lead_generation_1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Qualify this lead: Company XYZ, looking for CRM"
  }' | python3 -m json.tool
```

---

## Available Agents (1,600+)

The AI Service includes **1,600 specialized agents** across 20 business categories:

1. **Sales** (80 agents) - Lead generation, qualification, proposals, negotiation
2. **Support** (80 agents) - Tier 1-3 support, ticket routing, knowledge base
3. **HR** (80 agents) - Recruitment, onboarding, performance, benefits
4. **Finance** (80 agents) - Invoicing, budgeting, fraud detection, tax
5. **Marketing** (80 agents) - Content, campaigns, SEO, social media
6. **Legal** (80 agents) - Contracts, compliance, IP, privacy
7. **Operations** (80 agents) - Process optimization, inventory, supply chain
8. **IT** (80 agents) - Help desk, monitoring, security, DevOps
9. **Product** (80 agents) - Roadmap, analytics, user research
10. **Customer Success** (80 agents) - Onboarding, renewals, health scoring
11. **Executive** (80 agents) - Strategy, KPIs, board reporting
12. **Manufacturing** (80 agents) - Production, quality, lean
13. **Retail** (80 agents) - Inventory, merchandising, POS
14. **Healthcare** (80 agents) - Patient scheduling, HIPAA, telemedicine
15. **Education** (80 agents) - Admissions, LMS, student support
16. **Real Estate** (80 agents) - Listings, showings, lease management
17. **Hospitality** (80 agents) - Reservations, guest services, events
18. **Construction** (80 agents) - Project planning, safety, site management
19. **Logistics** (80 agents) - Route optimization, fleet, warehousing
20. **Energy** (80 agents) - Asset management, grid ops, compliance

---

## Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

---

## Accessing UIs

- **Web Console**: http://localhost:3000
- **MinIO Console**: http://localhost:9001
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

---

## Troubleshooting

### Services not starting?

```bash
# Check Docker is running
docker ps

# Rebuild if needed
docker compose up --build --force-recreate
```

### Port conflicts?

Edit `docker-compose.yml` to change port mappings:
```yaml
ports:
  - "8082:8082"  # Change first number to available port
```

### Can't access services?

```bash
# Check network
docker network ls
docker network inspect nexus-network
```

---

## Production Deployment

For production, use Kubernetes:

```bash
cd infra/helm
helm install nexus-finance ./finance-service
helm install nexus-ai ./ai-service
```

See `docs/ops/deployment.md` for full production setup.

---

## Next Steps

1. ✅ Run the stack: `docker compose up -d`
2. ✅ Test payments: `./tests/test_payments.sh`
3. ✅ Test AI agents: `./tests/test_ai_agents.sh`
4. 🚀 Build your first business activation!
5. 📊 Monitor with Grafana
6. 🔒 Configure production API keys
7. 🌍 Deploy to Kubernetes

---

**NEXUS** - *Business at the Speed of Prompt™*
