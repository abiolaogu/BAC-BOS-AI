# NEXUS Production Deployment Guide

## Prerequisites
- Kubernetes cluster (GKE, EKS, AKS, or on-prem)
- Helm 3.x installed
- kubectl configured
- Docker images built and pushed to registry

## Quick Deployment

```bash
# 1. Build and push all service images
docker compose build
docker tag <service>:latest your-registry.io/nexus/<service>:v1.0.0
docker push your-registry.io/nexus/<service>:v1.0.0

# 2. Deploy with Helm
cd infra/helm/nexus-platform
helm install nexus . \
  --namespace nexus \
  --create-namespace \
  --set global.domain=nexus.yourcompany.com

# 3. Configure secrets
kubectl apply -f ../../k8s/secrets/secrets-template.yaml

# 4. Verify deployment
kubectl get pods -n nexus
kubectl get ingress -n nexus
```

## Configuration

### API Keys (Update secrets-template.yaml)
- **Stripe**: Get from https://dashboard.stripe.com/apikeys
- **Paystack**: Get from https://dashboard.paystack.com/#/settings/developers
- **OpenAI**: Get from https://platform.openai.com/api-keys

### Webhooks
Configure these endpoints in payment provider dashboards:
- Stripe: `https://nexus.yourcompany.com/api/v1/webhooks/stripe`
- Paystack: `https://nexus.yourcompany.com/api/v1/webhooks/paystack`

### Monitoring
Access Grafana at the configured ingress:
```bash
kubectl port-forward svc/grafana 3000:80 -n nexus
# Open http://localhost:3000
```

## Scaling

### Horizontal Pod Autoscaling
```bash
kubectl autoscale deployment ai-service \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n nexus
```

### AI Agents
- **Current**: 3,200 agents across 20 categories
- **To add more**: Edit `services/ai/generate_agents.py` and redeploy

## Security

### mTLS (with Istio)
```bash
istioctl install --set profile=default
kubectl label namespace nexus istio-injection=enabled
kubectl apply -f infra/k8s/secrets/secrets-template.yaml  # Contains PeerAuthentication
```

### Secrets Management (Production)
Use external secret managers:
```bash
# Example with AWS Secrets Manager
kubectl create secret generic nexus-secrets \
  --from-literal=STRIPE_SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id prod/stripe-key --query SecretString --output text)
```

## Health Checks
All services expose `/health` endpoint:
```bash
curl https://nexus.yourcompany.com/api/v1/finance/health
curl https://nexus.yourcompany.com/api/v1/ai/health
```

## Troubleshooting
```bash
# View logs
kubectl logs -f deployment/ai-service -n nexus

# Check events
kubectl get events -n nexus --sort-by='.lastTimestamp'

# Restart service
kubectl rollout restart deployment/finance-service -n nexus
```
