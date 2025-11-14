# NEXUS - Quick Start Guide

Get your business up and running in **5 minutes** with NEXUS.

---

## Prerequisites

### For Local Development
- Docker 24+ & Docker Compose
- Node.js 20+ (for web console)
- Go 1.21+ (for services)
- Git

### For Production
- Kubernetes cluster (EKS, AKS, GKE, or self-managed)
- kubectl & helm CLI tools
- Domain name for your business
- Payment gateway account (Stripe/Paystack/Flutterwave)

---

## Quick Start (Local Development)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourorg/nexus-bos.git
cd nexus-bos
```

### Step 2: Start Infrastructure

```bash
# Start all services with Docker Compose
docker compose up -d

# Wait for services to be healthy (30-60 seconds)
docker compose ps

# Check logs
docker compose logs -f nexus-engine
```

### Step 3: Activate Your First Business

```bash
# Use example payload
curl -X POST http://localhost:8080/api/v1/activate \
  -H "Content-Type: application/json" \
  -d @examples/ecommerce-nigeria.json
```

**Response:**
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "business_name": "Afro Marketplace",
  "status": "active",
  "provisioned_at": "2025-11-14T10:00:00Z",
  "endpoints": {
    "web_console": "https://console.afromarketplace.ng",
    "api": "https://api.afromarketplace.ng",
    "storefront": "https://afromarketplace.ng"
  },
  "credentials": {
    "admin_username": "admin",
    "admin_password": "temp_xyz123",
    "api_key": "sk_live_abc123...",
    "webhook_secret": "whsec_def456..."
  },
  "next_steps": [
    "1. Login to web console with provided credentials",
    "2. Change admin password",
    "3. Configure payment gateway API keys",
    ...
  ],
  "estimated_time": "< 5 minutes"
}
```

### Step 4: Access Web Console

```bash
# Open web console
open http://localhost:3000

# Login with credentials from activation response
# Username: admin
# Password: temp_xyz123
```

### Step 5: Configure Integrations

1. **Payments:** Add your Paystack/Flutterwave API keys
2. **Messaging:** Connect WhatsApp Business API
3. **Email:** Configure Postmark/SES credentials

---

## Production Deployment

### Step 1: Provision Cloud Infrastructure

#### AWS
```bash
cd infra/terraform/aws
terraform init
terraform plan -var="cluster_name=nexus-prod"
terraform apply
```

#### Azure
```bash
cd infra/terraform/azure
terraform init
terraform plan -var="resource_group=nexus-prod"
terraform apply
```

#### GCP
```bash
cd infra/terraform/gcp
terraform init
terraform plan -var="project_id=your-project"
terraform apply
```

### Step 2: Configure kubectl

```bash
# AWS
aws eks update-kubeconfig --name nexus-prod --region us-east-1

# Azure
az aks get-credentials --resource-group nexus-prod --name nexus-cluster

# GCP
gcloud container clusters get-credentials nexus-cluster --region us-central1
```

### Step 3: Deploy NEXUS Platform

```bash
cd infra/helm

# Install CRDs
kubectl apply -f crds/

# Deploy infrastructure components
helm install kafka bitnami/kafka -f values/kafka.yaml
helm install yugabytedb yugabytedb/yugabyte -f values/yugabyte.yaml
helm install redis bitnami/redis -f values/redis.yaml

# Deploy NEXUS services
helm install nexus-engine ./nexus-engine -f values/production.yaml
helm install crm-service ./crm-service -f values/production.yaml
helm install finance-service ./finance-service -f values/production.yaml

# Deploy observability
helm install prometheus prometheus-community/kube-prometheus-stack
helm install grafana grafana/grafana
```

### Step 4: Configure DNS

```bash
# Get load balancer IP
kubectl get svc nexus-ingress -n ingress-nginx

# Create DNS records
# A record: *.yourdomain.com → LOAD_BALANCER_IP
# A record: api.yourdomain.com → LOAD_BALANCER_IP
```

### Step 5: Configure SSL/TLS

```bash
# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Create Let's Encrypt issuer
kubectl apply -f infra/k8s/cert-manager/letsencrypt-prod.yaml
```

### Step 6: Activate First Tenant

```bash
# Get API endpoint
export NEXUS_API=$(kubectl get svc nexus-engine -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Activate business
curl -X POST https://api.yourdomain.com/api/v1/activate \
  -H "Content-Type: application/json" \
  -d @examples/your-business.json
```

---

## Verify Installation

### Health Checks

```bash
# Check all services
kubectl get pods -A

# Check NEXUS Engine
curl http://localhost:8080/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "nexus-engine",
#   "version": "1.0.0"
# }
```

### Test CRM Service

```bash
# Create contact
curl -X POST http://localhost:8081/api/v1/contacts \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: demo-tenant" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+234801234567"
  }'

# List contacts
curl http://localhost:8081/api/v1/contacts \
  -H "X-Tenant-ID: demo-tenant"
```

---

## Common Tasks

### Add New Tenant

```bash
curl -X POST http://localhost:8080/api/v1/activate \
  -H "Content-Type: application/json" \
  -d @examples/new-business.json
```

### View Industry Presets

```bash
curl http://localhost:8080/api/v1/presets
```

### Monitor Services

```bash
# View logs
docker compose logs -f

# Access Grafana
open http://localhost:3001
# Username: admin
# Password: admin
```

### Backup Data

```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U postgres nexus > backup.sql

# Backup to MinIO
docker compose exec postgres pg_dump -U postgres nexus | \
  gzip | \
  docker compose exec -T minio mc pipe minio/backups/nexus-$(date +%Y%m%d).sql.gz
```

---

## Example Activation Payloads

### eCommerce (Nigeria)
```json
{
  "business_name": "Afro Marketplace",
  "region": "NG",
  "currency": "NGN",
  "industry": "ecommerce",
  "channels": ["web", "whatsapp", "pos"],
  "payments": ["Paystack", "Flutterwave"]
}
```

### Healthcare (Nigeria)
```json
{
  "business_name": "HealthBridge Clinic",
  "region": "NG",
  "currency": "NGN",
  "industry": "healthcare",
  "channels": ["web", "mobile_app", "whatsapp"],
  "compliance": ["hipaa", "ndpa_ng"]
}
```

### SaaS (US)
```json
{
  "business_name": "CloudApp Inc",
  "region": "US",
  "currency": "USD",
  "industry": "saas",
  "channels": ["web", "api"],
  "payments": ["Stripe"]
}
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs nexus-engine
docker compose logs postgres

# Restart services
docker compose restart
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker compose exec postgres psql -U postgres -d nexus -c "SELECT 1;"

# Check DATABASE_URL
docker compose exec nexus-engine env | grep DATABASE_URL
```

### Port Conflicts

```bash
# Check ports in use
lsof -i :8080
lsof -i :5432

# Modify docker-compose.yml ports if needed
```

---

## Next Steps

1. **Explore Documentation**
   - [Architecture Overview](./architecture.md)
   - [API Reference](./api/)
   - [Developer Guide](./dev/getting-started.md)

2. **Configure Integrations**
   - Payment gateways
   - WhatsApp Business API
   - Email delivery

3. **Customize**
   - Upload branding
   - Configure workflows
   - Enable AI copilots

4. **Scale**
   - Add team members
   - Import data
   - Configure multi-region

---

## Support

- **Documentation:** https://docs.nexus.bos
- **Community:** https://community.nexus.bos
- **Email:** support@nexus.bos
- **Enterprise:** enterprise@nexus.bos

---

**NEXUS** - *Business at the Speed of Prompt™*
