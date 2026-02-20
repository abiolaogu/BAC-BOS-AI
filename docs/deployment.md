# Deployment Guide -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Deployment Overview

BAC-BOS-AI (NEXUS Business Operating System) uses a GitOps-driven deployment model with ArgoCD for declarative infrastructure management and Tekton for CI/CD pipelines. The platform supports three environments: development, staging, and production.

### 1.1 Deployment Architecture
```
Developer -> Git Push -> Tekton Pipeline (Build/Test/Scan) -> Container Registry
                                                                    |
                                                              ArgoCD Sync
                                                                    |
                                                          Kubernetes Cluster
                                                         (dev/staging/prod)
```

### 1.2 Environment Matrix
| Environment | Cluster | Namespace Strategy | Replicas | Database |
|-------------|---------|-------------------|----------|----------|
| Development | Local (kind/Docker) | Single namespace | 1 per service | PostgreSQL 15 |
| Staging | Rancher-managed K8s | Per-tenant namespaces | 2 per service | PostgreSQL 15 |
| Production | Rancher-managed K8s (multi-region) | Per-tenant namespaces | 3+ per service | YugabyteDB |

---

## 2. Prerequisites

### 2.1 Infrastructure Requirements
- Kubernetes 1.27+ cluster (RKE2 recommended, managed by Rancher 2.7+)
- Container registry (Harbor, ECR, or Docker Hub)
- DNS provider with API access (for ExternalDNS)
- TLS certificate authority (Let's Encrypt via cert-manager)
- Git repository access (for ArgoCD)

### 2.2 Required Tools
| Tool | Version | Purpose |
|------|---------|---------|
| kubectl | 1.27+ | Cluster management |
| helm | 3.12+ | Package management |
| argocd | 2.8+ | GitOps CLI |
| tekton | 0.50+ | CI/CD CLI |
| kustomize | 5.0+ | Manifest customization |
| docker | 24+ | Container builds (local) |

### 2.3 Required Secrets
```bash
# Payment gateways
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET

# AI providers
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_AI_API_KEY

# External integrations
GOOGLE_WORKSPACE_CLIENT_ID, GOOGLE_WORKSPACE_CLIENT_SECRET
ODOO_API_KEY, ODOO_URL
ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET

# Infrastructure
POSTGRES_PASSWORD, REDIS_PASSWORD
MINIO_ACCESS_KEY, MINIO_SECRET_KEY
```

---

## 3. Local Development Deployment

### 3.1 Docker Compose Setup
```bash
# Clone repository
git clone <repository-url>
cd BAC-BOS-AI

# Create environment file
cp .env.example .env
# Edit .env with your API keys and configuration

# Start all infrastructure services
docker-compose up -d postgres redis redpanda minio

# Verify infrastructure
docker-compose ps

# Start the Nexus Engine
cd services/nexus-engine
go run main.go

# Start additional services as needed
cd ../crm-service && go run main.go &
cd ../finance-service && go run main.go &
cd ../ai-service && python -m uvicorn main:app --port 8086 &
```

### 3.2 Local Kubernetes (kind)
```bash
# Create kind cluster
kind create cluster --name nexus-dev --config infrastructure/kind-config.yaml

# Install infrastructure components
helm install postgresql bitnami/postgresql -n data --create-namespace
helm install redis bitnami/redis -n data
helm install redpanda redpanda/redpanda -n data
helm install minio minio/minio -n data

# Deploy services
kubectl apply -k infrastructure/overlays/dev/
```

---

## 4. Staging Deployment

### 4.1 Cluster Preparation
```bash
# Connect to staging cluster
export KUBECONFIG=~/.kube/staging-config

# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Install Istio service mesh
istioctl install --set profile=production
kubectl label namespace default istio-injection=enabled

# Install cert-manager
helm install cert-manager jetstack/cert-manager --namespace cert-manager \
  --create-namespace --set installCRDs=true

# Install Kong API gateway
helm install kong kong/kong --namespace kong --create-namespace \
  --values infrastructure/helm/kong-values-staging.yaml
```

### 4.2 Database Setup
```bash
# Deploy PostgreSQL
helm install postgresql bitnami/postgresql -n data --create-namespace \
  --values infrastructure/helm/postgresql-values-staging.yaml

# Run migrations
kubectl apply -f infrastructure/jobs/migrate-staging.yaml

# Deploy Redis
helm install redis bitnami/redis -n data \
  --values infrastructure/helm/redis-values-staging.yaml

# Deploy Redpanda
helm install redpanda redpanda/redpanda -n data \
  --values infrastructure/helm/redpanda-values-staging.yaml

# Deploy MinIO
helm install minio minio/minio -n data \
  --values infrastructure/helm/minio-values-staging.yaml
```

### 4.3 ArgoCD Setup
```bash
# Install ArgoCD
helm install argocd argo/argo-cd --namespace argocd --create-namespace \
  --values infrastructure/helm/argocd-values.yaml

# Configure app-of-apps
kubectl apply -f infrastructure/argocd/app-of-apps-staging.yaml

# Verify sync
argocd app list
argocd app sync nexus-staging
```

### 4.4 Tekton CI/CD Setup
```bash
# Install Tekton
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml

# Apply pipeline definitions
kubectl apply -f infrastructure/tekton/tasks/
kubectl apply -f infrastructure/tekton/pipelines/

# Configure webhook triggers
kubectl apply -f infrastructure/tekton/triggers/staging-trigger.yaml
```

---

## 5. Production Deployment

### 5.1 Pre-Deployment Checklist
- [ ] All staging tests passing (unit, integration, e2e)
- [ ] Security scan clean (Trivy, no critical/high vulnerabilities)
- [ ] Database migration tested and validated on staging
- [ ] Performance benchmarks within acceptable thresholds
- [ ] Rollback procedure documented and tested
- [ ] DNS records prepared for new services
- [ ] TLS certificates provisioned
- [ ] Monitoring and alerting configured
- [ ] On-call team notified

### 5.2 Multi-Region Cluster Setup
```bash
# Per-region deployment (repeat for each PoP)
# Regions: lagos, johannesburg, frankfurt, ashburn, singapore

REGION=lagos  # Change per region

# Configure cluster
export KUBECONFIG=~/.kube/production-${REGION}-config

# Install Istio with multi-cluster mesh
istioctl install --set profile=production \
  --set values.global.meshID=nexus-mesh \
  --set values.global.network=${REGION}

# Install production database (YugabyteDB)
helm install yugabyte yugabytedb/yugabyte -n data --create-namespace \
  --values infrastructure/helm/yugabyte-values-${REGION}.yaml

# Install DragonflyDB (high-performance cache)
helm install dragonfly dragonflydb/dragonfly -n data \
  --values infrastructure/helm/dragonfly-values-${REGION}.yaml

# Install Kafka (KRaft mode)
helm install kafka bitnami/kafka -n data \
  --values infrastructure/helm/kafka-values-${REGION}.yaml

# Deploy via ArgoCD
kubectl apply -f infrastructure/argocd/app-of-apps-production-${REGION}.yaml
```

### 5.3 Production Service Deployment
```bash
# ArgoCD manages all deployments via GitOps
# Merge to production branch triggers:
# 1. Tekton pipeline: build -> test -> security-scan -> update-manifest
# 2. ArgoCD detects manifest change and syncs

# Manual sync (emergency only)
argocd app sync nexus-production-${REGION}

# Verify deployment
kubectl get pods -n nexus-services --watch
kubectl get pods -n nexus-office --watch
kubectl get pods -n nexus-platform --watch
```

### 5.4 Blue-Green Deployment Strategy
```
Production uses blue-green deployments for zero-downtime releases:

1. Deploy new version to "green" deployment
2. Run health checks and smoke tests on green
3. Switch Istio VirtualService traffic to green
4. Monitor for 15 minutes
5. If healthy: decommission blue
6. If issues: rollback traffic to blue
```

---

## 6. Rollback Procedures

### 6.1 Service Rollback
```bash
# ArgoCD rollback to previous revision
argocd app rollback nexus-production-${REGION} --revision <previous-revision>

# Manual Helm rollback
helm rollback <release-name> <revision> -n <namespace>

# Emergency: kubectl rollback
kubectl rollout undo deployment/<service-name> -n <namespace>
```

### 6.2 Database Rollback
```bash
# Each migration has a corresponding down migration
# Run rollback migration
kubectl apply -f infrastructure/jobs/rollback-migration-<version>.yaml

# Verify data integrity
kubectl exec -it postgresql-0 -n data -- psql -U nexus -c "SELECT count(*) FROM tenants;"
```

---

## 7. Monitoring and Verification

### 7.1 Post-Deployment Health Checks
```bash
# Check all service health endpoints
for service in nexus-engine crm-service finance-service hr-service \
  inventory-service ai-service projects-service marketing-service \
  support-service; do
  curl -s https://${REGION}.nexus.bac.cloud/api/v1/${service}/health | jq .
done

# Verify Kubernetes pod status
kubectl get pods -A | grep -v Running | grep -v Completed
```

### 7.2 Observability Stack
| Component | URL | Purpose |
|-----------|-----|---------|
| Grafana | `https://grafana.nexus.bac.cloud` | Dashboards and visualization |
| Prometheus | `https://prometheus.nexus.bac.cloud` | Metrics and alerting |
| Loki | Via Grafana | Log aggregation |
| Jaeger | `https://jaeger.nexus.bac.cloud` | Distributed tracing |

### 7.3 Critical Alerts
| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| ServiceDown | Health check fails 3x | Critical | PagerDuty escalation |
| HighLatency | P95 > 500ms for 5 min | Warning | Investigate, scale if needed |
| DiskUsage | > 85% | Warning | Expand storage |
| CertExpiry | < 7 days to expiry | Critical | Verify cert-manager renewal |
| PodCrashLoop | > 5 restarts in 10 min | Critical | Check logs, rollback if needed |

---

## 8. Secrets Management

### 8.1 Kubernetes Secrets
```bash
# Create secrets from environment file
kubectl create secret generic nexus-payments \
  --from-literal=STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY \
  --from-literal=PAYSTACK_SECRET_KEY=$PAYSTACK_SECRET_KEY \
  -n nexus-services

kubectl create secret generic nexus-ai \
  --from-literal=OPENAI_API_KEY=$OPENAI_API_KEY \
  --from-literal=ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -n nexus-services
```

### 8.2 Secret Rotation Policy
- Payment API keys: Rotate every 90 days
- Database passwords: Rotate every 60 days
- JWT signing keys: Rotate every 30 days
- TLS certificates: Auto-renewed by cert-manager (30 days before expiry)

---

## 9. Disaster Recovery

### 9.1 Backup Strategy
| Data Type | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| Database (full) | Daily | 30 days | Cross-region S3 |
| Database (incremental) | Hourly | 7 days | Same-region S3 |
| Object storage (MinIO) | Daily | 30 days | Cross-region replication |
| Configuration (GitOps) | Every commit | Indefinite | Git repository |
| Secrets | On change | 30 versions | Vault/sealed-secrets |

### 9.2 Recovery Time Objectives
| Scenario | RTO | RPO |
|----------|-----|-----|
| Single service failure | 5 minutes | 0 (auto-restart) |
| Node failure | 10 minutes | 0 (replica failover) |
| Availability zone failure | 30 minutes | < 1 hour |
| Full region failure | 4 hours | < 1 hour |

---

*For production deployment authorization, contact the platform engineering team. All production changes require approval from at least two senior engineers.*
