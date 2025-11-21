# NEXUS Platform - Kubernetes Deployment

This directory contains all Kubernetes manifests, Helm charts, and deployment automation for the complete NEXUS Platform with 50+ integrated applications.

## Directory Structure

```
kubernetes/
├── base/                          # Base Kubernetes manifests
│   ├── namespace.yaml            # Namespaces for all services
│   ├── configmaps/               # Configuration maps
│   ├── secrets/                  # Secrets (template only)
│   └── network-policies/         # Network isolation policies
├── helm/                          # Helm charts
│   ├── nexus-platform/           # Main platform chart
│   ├── nexus-office/             # Office suite chart
│   ├── nexus-communications/     # Communications services
│   ├── nexus-devops/             # DevSecOps platform
│   ├── nexus-data/               # Data services (DBaaS, etc.)
│   └── nexus-ai/                 # AI services and agents
├── istio/                         # Istio service mesh configs
│   ├── gateway.yaml              # Ingress gateway
│   ├── virtual-services/         # Routing rules
│   ├── destination-rules/        # Load balancing, circuit breaker
│   └── peer-authentication.yaml  # mTLS configuration
├── monitoring/                    # Observability stack
│   ├── prometheus/               # Metrics collection
│   ├── grafana/                  # Visualization
│   ├── loki/                     # Log aggregation
│   ├── tempo/                    # Distributed tracing
│   └── aiops/                    # ML-based monitoring
├── security/                      # Security configurations
│   ├── rbac/                     # Role-based access control
│   ├── network-policies/         # Network segmentation
│   ├── pod-security/             # Pod security policies
│   └── certificates/             # TLS certificates
├── operators/                     # Kubernetes operators
│   ├── nexus-operator/           # Custom NEXUS operator
│   └── crds/                     # Custom resource definitions
├── storage/                       # Persistent storage
│   ├── storage-classes.yaml     # Storage class definitions
│   └── volume-claims/            # PVC templates
└── scripts/                       # Deployment automation
    ├── deploy-all.sh             # Deploy entire platform
    ├── deploy-service.sh         # Deploy individual service
    ├── rollback.sh               # Rollback deployment
    └── health-check.sh           # Health verification
```

## Prerequisites

- Kubernetes 1.28+
- Helm 3.12+
- kubectl configured
- Istio 1.20+ (optional but recommended)
- cert-manager (for TLS)
- External DNS (optional)
- Ingress controller (nginx/istio)

## Quick Start

### 1. Install Prerequisites

```bash
# Install Istio
curl -L https://istio.io/downloadIstio | sh -
istioctl install --set profile=production -y

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 2. Deploy NEXUS Platform

```bash
# Create namespaces
kubectl apply -f base/namespace.yaml

# Create secrets (update values first!)
kubectl apply -f base/secrets/

# Deploy storage
kubectl apply -f storage/

# Deploy core services via Helm
helm install nexus-platform helm/nexus-platform \
  --namespace nexus-core \
  --create-namespace \
  --values values/production.yaml

# Deploy all application services
./scripts/deploy-all.sh
```

### 3. Verify Deployment

```bash
# Check all pods
kubectl get pods -A | grep nexus

# Check services
kubectl get svc -n nexus-core

# Check ingress
kubectl get ingress -n nexus-core

# Run health checks
./scripts/health-check.sh
```

## Service Architecture

### Core Services (Always Running)
- **nexus-gateway**: API Gateway (Kong/Nginx)
- **nexus-auth**: Authentication & SSO (Keycloak + Custom)
- **nexus-idaas**: Identity as a Service
- **nexus-notifications**: Notification service
- **nexus-events**: Event bus (Kafka)
- **nexus-storage**: Object storage (MinIO)

### Office Suite (12 Applications)
- nexus-writer: Document editor
- nexus-sheets: Spreadsheet editor
- nexus-slides: Presentation editor
- nexus-drive: File storage
- nexus-meet: Video conferencing
- nexus-hub: Unified dashboard
- nexus-mail: Email service
- nexus-calendar: Calendar & scheduling
- nexus-chat: Instant messaging
- nexus-tasks: Task management
- nexus-notes: Note-taking
- nexus-forms: Form builder

### Communications (VAS Platform)
- nexus-vas-sms: SMS gateway
- nexus-vas-whatsapp: WhatsApp Business API
- nexus-vas-telegram: Telegram messaging
- nexus-vas-messenger: Facebook Messenger
- nexus-voice-switch: Voice/VoIP services
- nexus-pbx: Hosted PBX
- nexus-contact-center: Contact center platform

### Business Applications
- nexus-crm: Customer relationship management
- nexus-erp: Enterprise resource planning
- nexus-ecommerce: E-commerce platform
- nexus-projects: Project management
- nexus-hr: Human resources
- nexus-finance: Financial management
- nexus-inventory: Inventory management

### Developer & DevOps
- nexus-devops: DevSecOps platform (AAISD)
- nexus-api-manager: API management (Codex)
- nexus-dbaas: Database as a Service
- nexus-web-hosting: Web hosting service
- nexus-cdn: Content delivery network (CDN3)
- nexus-ipaas: Integration platform
- nexus-bpa: Business process automation

### Design & AI
- nexus-designer: AI-driven design tool (Designer2)
- nexus-ai-agents: AI agents platform (700+ agents)
- nexus-promptql: Natural language query interface
- nexus-mmp: Mobile measurement partner

### Data & Analytics
- nexus-analytics: Business intelligence
- nexus-data-warehouse: Data warehouse
- nexus-etl: ETL pipelines
- nexus-ml-platform: ML training platform

## Deployment Strategies

### Blue-Green Deployment
```bash
# Deploy new version to green environment
helm upgrade nexus-platform helm/nexus-platform \
  --namespace nexus-green \
  --reuse-values \
  --set image.tag=v2.0.0

# Test green environment
./scripts/test-environment.sh nexus-green

# Switch traffic to green
kubectl patch svc nexus-gateway -n nexus-core \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Cleanup blue environment
kubectl delete namespace nexus-blue
```

### Canary Deployment
```bash
# Deploy canary version
helm upgrade nexus-platform helm/nexus-platform \
  --namespace nexus-core \
  --set canary.enabled=true \
  --set canary.weight=10  # 10% traffic

# Monitor metrics
kubectl port-forward -n nexus-monitoring svc/grafana 3000:3000

# Gradually increase canary weight
helm upgrade nexus-platform helm/nexus-platform \
  --reuse-values \
  --set canary.weight=50  # 50% traffic

# Finalize or rollback
helm upgrade nexus-platform helm/nexus-platform \
  --reuse-values \
  --set canary.enabled=false
```

## Scaling

### Horizontal Pod Autoscaling
```bash
# Auto-scale based on CPU/Memory
kubectl autoscale deployment nexus-gateway \
  --namespace nexus-core \
  --min=3 \
  --max=20 \
  --cpu-percent=70

# Custom metrics autoscaling (using KEDA)
kubectl apply -f scaling/keda-scaler.yaml
```

### Cluster Autoscaling
```bash
# Configure cluster autoscaler (EKS example)
kubectl apply -f scaling/cluster-autoscaler.yaml
```

## Monitoring & Observability

### Access Monitoring Stack
```bash
# Grafana
kubectl port-forward -n nexus-monitoring svc/grafana 3000:3000
# Access: http://localhost:3000 (admin/admin)

# Prometheus
kubectl port-forward -n nexus-monitoring svc/prometheus 9090:9090
# Access: http://localhost:9090

# Jaeger (tracing)
kubectl port-forward -n nexus-monitoring svc/jaeger-query 16686:16686
# Access: http://localhost:16686

# Kiali (Istio dashboard)
istioctl dashboard kiali
```

### Alerts
All alerts are configured in `monitoring/prometheus/alerts/`. They include:
- High error rate (>5% for 5min)
- High latency (p95 > 1s for 5min)
- Pod crashes
- Disk space warnings
- Certificate expiration

## Security

### mTLS with Istio
```bash
# Enable strict mTLS for all services
kubectl apply -f istio/peer-authentication.yaml

# Verify mTLS status
istioctl authn tls-check deployment/nexus-gateway
```

### Network Policies
```bash
# Apply network segmentation
kubectl apply -f security/network-policies/

# Verify policies
kubectl get networkpolicies -A
```

### RBAC
```bash
# Apply role-based access control
kubectl apply -f security/rbac/

# Create service account with limited permissions
kubectl create serviceaccount app-deployer -n nexus-core
kubectl apply -f security/rbac/app-deployer-role.yaml
```

## Backup & Disaster Recovery

### Velero Backup
```bash
# Install Velero
velero install \
  --provider aws \
  --bucket nexus-backups \
  --secret-file ./credentials-velero

# Create backup schedule
velero schedule create nexus-daily \
  --schedule="0 2 * * *" \
  --include-namespaces nexus-core,nexus-data

# Restore from backup
velero restore create --from-backup nexus-daily-20250121
```

## Troubleshooting

### Common Issues

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

**Service mesh issues:**
```bash
istioctl analyze -A
istioctl proxy-status
```

**Network connectivity:**
```bash
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash
```

**Check resource usage:**
```bash
kubectl top pods -A
kubectl top nodes
```

## Maintenance

### Rolling Updates
```bash
# Update image version
kubectl set image deployment/nexus-gateway \
  nexus-gateway=nexus/gateway:v2.0.0 \
  -n nexus-core

# Check rollout status
kubectl rollout status deployment/nexus-gateway -n nexus-core
```

### Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/nexus-gateway -n nexus-core

# Rollback to specific revision
kubectl rollout undo deployment/nexus-gateway \
  --to-revision=2 \
  -n nexus-core
```

## Performance Tuning

### Resource Requests/Limits
Update `values.yaml` with appropriate resource allocation:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
```

### Database Connection Pooling
Configure connection pools in application configs:
- Min connections: 10
- Max connections: 100
- Idle timeout: 10 minutes

## Cost Optimization

### Spot Instances
Use spot instances for non-critical workloads:
```yaml
nodeSelector:
  kubernetes.io/lifecycle: spot
tolerations:
- key: "spot"
  operator: "Equal"
  value: "true"
  effect: "NoSchedule"
```

### Resource Right-Sizing
Use metrics to optimize resource requests:
```bash
kubectl resource-capacity --pods -n nexus-core
```

## Support

For deployment issues, consult:
- [Troubleshooting Guide](../docs/ops/troubleshooting.md)
- [Architecture Documentation](../docs/architecture.md)
- [Runbooks](../docs/ops/runbooks/)

## License

Copyright © 2025 NEXUS Platform
Licensed under Apache 2.0
