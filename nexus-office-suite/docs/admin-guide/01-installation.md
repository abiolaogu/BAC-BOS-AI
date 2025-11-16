# NEXUS Platform Installation Guide

**Version**: 1.0
**Last Updated**: November 2025
**Audience**: System Administrators

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Pre-Installation Checklist](#pre-installation-checklist)
4. [Docker Installation](#docker-installation)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Post-Installation](#post-installation)

---

## Overview

This guide walks you through installing the NEXUS Platform in production environments. NEXUS supports multiple deployment options:

- **Docker Compose**: Development and small deployments
- **Kubernetes**: Production and enterprise deployments
- **Cloud Managed**: AWS, Google Cloud, Azure

---

## System Requirements

### Minimum Requirements (Small Deployment, <50 users)

**Server**:
- CPU: 4 cores
- RAM: 16 GB
- Storage: 100 GB SSD
- Network: 100 Mbps

**Database**:
- PostgreSQL 15+
- 4 GB RAM dedicated
- 50 GB SSD storage

**Cache/Queue**:
- Redis 7+
- 2 GB RAM

**Object Storage**:
- MinIO or S3-compatible
- 100 GB initial storage

### Recommended Requirements (Medium Deployment, <500 users)

**Application Servers** (3+ nodes):
- CPU: 8 cores each
- RAM: 32 GB each
- Storage: 200 GB SSD each
- Network: 1 Gbps

**Database Cluster**:
- PostgreSQL 15+ with replication
- Primary: 16 GB RAM, 500 GB SSD
- Replica: 16 GB RAM, 500 GB SSD

**Cache/Queue Cluster**:
- Redis Sentinel (3 nodes)
- 4 GB RAM each

**Object Storage**:
- MinIO cluster or S3
- 1 TB+ storage

### Enterprise Requirements (Large Deployment, 500+ users)

**Application Servers** (5+ nodes):
- CPU: 16 cores each
- RAM: 64 GB each
- Storage: 500 GB NVMe SSD each
- Network: 10 Gbps

**Database Cluster**:
- PostgreSQL 15+ with streaming replication
- Primary: 32 GB RAM, 2 TB NVMe SSD
- 2+ Replicas: 32 GB RAM, 2 TB NVMe SSD
- Connection pooler (PgBouncer)

**Cache/Queue Cluster**:
- Redis Cluster (6+ nodes)
- 8 GB RAM each

**Object Storage**:
- S3 or distributed MinIO
- 10 TB+ storage

**Load Balancer**:
- HAProxy, NGINX, or cloud LB
- 8 GB RAM, 4 cores

### Operating System

**Supported**:
- Ubuntu 20.04/22.04 LTS
- Debian 11/12
- RHEL 8/9
- Rocky Linux 8/9
- CentOS 8 Stream

**Container Runtime**:
- Docker 24.0+
- containerd 1.7+
- CRI-O 1.27+

---

## Pre-Installation Checklist

### Prerequisites

- [ ] Root or sudo access on all servers
- [ ] DNS records configured for your domain
- [ ] SSL/TLS certificates obtained
- [ ] Firewall rules configured
- [ ] Database server prepared
- [ ] Object storage configured
- [ ] SMTP server for emails (optional)
- [ ] Backup strategy planned

### Network Requirements

**Firewall Ports**:
```
# Public Facing
80/tcp    - HTTP (redirect to HTTPS)
443/tcp   - HTTPS
3478/udp  - TURN/STUN for video (Meet)

# Internal Only
5432/tcp  - PostgreSQL
6379/tcp  - Redis
9000/tcp  - MinIO API
9001/tcp  - MinIO Console
```

**Domain Names**:
- `nexus.yourdomain.com` - Main portal
- `meet.yourdomain.com` - Video conferencing
- `drive.yourdomain.com` - File storage
- `api.yourdomain.com` - API gateway (optional)

### Download Installation Files

```bash
# Clone repository
git clone https://github.com/yourusername/nexus-office-suite.git
cd nexus-office-suite

# Or download release
wget https://github.com/yourusername/nexus-office-suite/releases/download/v1.0.0/nexus-v1.0.0.tar.gz
tar -xzf nexus-v1.0.0.tar.gz
cd nexus-office-suite
```

---

## Docker Installation

### Install Docker Engine

**Ubuntu/Debian**:
```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

**RHEL/Rocky Linux**:
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify
docker --version
```

### Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

**Key Configuration Variables**:
```bash
# Domain Configuration
DOMAIN=nexus.yourdomain.com
PROTOCOL=https

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=nexus
POSTGRES_USER=nexus
POSTGRES_PASSWORD=<strong-password>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>

# MinIO (Object Storage)
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=<strong-password>
MINIO_ENDPOINT=http://minio:9000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-password>
SMTP_FROM=noreply@yourdomain.com

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=<random-secret-key>

# Security
SESSION_SECRET=<random-secret-key>
ENCRYPTION_KEY=<random-32-char-key>
```

### Start Services with Docker Compose

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Specific service logs
docker compose logs -f api-gateway
docker compose logs -f writer-service
```

### Initialize Database

```bash
# Run migrations
docker compose exec api-gateway npm run migrate

# Or for Go services
docker compose exec writer-service ./migrate up

# Create admin user
docker compose exec api-gateway npm run create-admin
# Enter email and password when prompted
```

### Verify Installation

```bash
# Check all containers running
docker compose ps

# Should see:
# - postgres (healthy)
# - redis (healthy)
# - minio (healthy)
# - api-gateway (running)
# - auth-service (running)
# - writer-service (running)
# - sheets-service (running)
# - slides-service (running)
# - drive-service (running)
# - meet-service (running)
# - hub-app (running)
# - All frontend apps (running)

# Test API endpoint
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

---

## Kubernetes Deployment

### Prerequisites

**Kubernetes Cluster**:
- Kubernetes 1.27+
- kubectl configured
- Helm 3.12+
- LoadBalancer support (MetalLB, cloud LB)
- StorageClass for PersistentVolumes
- Ingress controller (NGINX, Traefik)

### Install Prerequisites

**Install kubectl**:
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client
```

**Install Helm**:
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

### Create Namespace

```bash
# Create dedicated namespace
kubectl create namespace nexus

# Set as default
kubectl config set-context --current --namespace=nexus
```

### Deploy Dependencies

**PostgreSQL (using Bitnami chart)**:
```bash
# Add Bitnami repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install PostgreSQL
helm install postgres bitnami/postgresql \
  --namespace nexus \
  --set auth.database=nexus \
  --set auth.username=nexus \
  --set auth.password=<strong-password> \
  --set primary.persistence.size=100Gi \
  --set primary.resources.requests.memory=8Gi \
  --set primary.resources.requests.cpu=2000m \
  --set primary.resources.limits.memory=16Gi \
  --set primary.resources.limits.cpu=4000m

# Verify
kubectl get pods -l app.kubernetes.io/name=postgresql
```

**Redis**:
```bash
# Install Redis
helm install redis bitnami/redis \
  --namespace nexus \
  --set auth.password=<strong-password> \
  --set master.persistence.size=10Gi \
  --set master.resources.requests.memory=2Gi \
  --set replica.replicaCount=2 \
  --set replica.resources.requests.memory=2Gi

# Verify
kubectl get pods -l app.kubernetes.io/name=redis
```

**MinIO**:
```bash
# Install MinIO
helm install minio bitnami/minio \
  --namespace nexus \
  --set auth.rootUser=admin \
  --set auth.rootPassword=<strong-password> \
  --set persistence.size=500Gi \
  --set resources.requests.memory=4Gi

# Verify
kubectl get pods -l app.kubernetes.io/name=minio
```

### Deploy NEXUS Platform

**Method 1: Using Helm Chart**:
```bash
# Add NEXUS Helm repository
helm repo add nexus https://charts.nexusplatform.io
helm repo update

# Create values file
cat > nexus-values.yaml <<EOF
global:
  domain: nexus.yourdomain.com
  tls:
    enabled: true
    secretName: nexus-tls

database:
  host: postgres-postgresql
  port: 5432
  name: nexus
  user: nexus
  password: <password>

redis:
  host: redis-master
  port: 6379
  password: <password>

minio:
  endpoint: http://minio:9000
  accessKey: admin
  secretKey: <password>

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

resources:
  apiGateway:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m
EOF

# Install NEXUS
helm install nexus nexus/nexus-platform \
  --namespace nexus \
  --values nexus-values.yaml

# Check status
helm status nexus -n nexus
kubectl get pods
```

**Method 2: Using kubectl**:
```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/configmaps.yaml
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/ingress.yaml

# Check rollout status
kubectl rollout status deployment/api-gateway
kubectl rollout status deployment/auth-service
kubectl rollout status deployment/writer-service
```

### Configure Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nexus-ingress
  namespace: nexus
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - nexus.yourdomain.com
    - meet.yourdomain.com
    - drive.yourdomain.com
    secretName: nexus-tls
  rules:
  - host: nexus.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hub-app
            port:
              number: 3000
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 8000
  - host: meet.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: meet-app
            port:
              number: 3000
```

### Initialize Database

```bash
# Get API Gateway pod name
POD_NAME=$(kubectl get pods -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $POD_NAME -- npm run migrate

# Create admin user
kubectl exec -it $POD_NAME -- npm run create-admin
```

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Free, Auto-Renewal)

**Install cert-manager**:
```bash
# Add Jetstack repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Verify
kubectl get pods -n cert-manager
```

**Create ClusterIssuer**:
```yaml
# letsencrypt-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

```bash
kubectl apply -f letsencrypt-issuer.yaml
```

### Option 2: Custom SSL Certificate

```bash
# Create TLS secret from certificate files
kubectl create secret tls nexus-tls \
  --namespace nexus \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key

# Verify
kubectl get secret nexus-tls -n nexus
```

### Option 3: Self-Signed (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key \
  -out tls.crt \
  -subj "/CN=nexus.yourdomain.com"

# Create secret
kubectl create secret tls nexus-tls-selfsigned \
  --namespace nexus \
  --cert=tls.crt \
  --key=tls.key
```

---

## Post-Installation

### Access the Platform

```bash
# Get external IP (Kubernetes)
kubectl get ingress -n nexus

# Or LoadBalancer IP
kubectl get svc -n nexus

# Docker Compose
# Access at: https://nexus.yourdomain.com
```

### Create Initial Admin User

```bash
# Docker Compose
docker compose exec api-gateway npm run create-admin

# Kubernetes
kubectl exec -it $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') \
  -- npm run create-admin

# Follow prompts:
# Email: admin@yourdomain.com
# Password: <strong-password>
# Name: Administrator
```

### Configure Platform Settings

1. **Log in** as admin: `https://nexus.yourdomain.com`
2. **Go to Admin Panel**: Click profile → Admin Settings
3. **Configure**:
   - Organization name
   - Logo and branding
   - Default language
   - Time zone
   - Email templates
   - Feature flags

### Test Services

```bash
# Health checks
curl https://nexus.yourdomain.com/health
curl https://nexus.yourdomain.com/api/health

# Create test document
# Log in and create a Writer document

# Upload test file
# Upload file to Drive

# Start test meeting
# Start a Meet video call
```

### Enable Monitoring

```bash
# If using Helm
helm upgrade nexus nexus/nexus-platform \
  --namespace nexus \
  --set monitoring.enabled=true \
  --set monitoring.prometheus.enabled=true \
  --set monitoring.grafana.enabled=true

# Access Grafana
kubectl port-forward -n nexus svc/grafana 3000:3000
# Open: http://localhost:3000
# Default: admin/admin
```

### Backup Configuration

```bash
# Export configuration
kubectl get configmap -n nexus nexus-config -o yaml > nexus-config-backup.yaml
kubectl get secret -n nexus nexus-secrets -o yaml > nexus-secrets-backup.yaml

# Store securely (encrypted!)
```

---

## Next Steps

- Configure user management: [User Management Guide](03-user-management.md)
- Set up monitoring: [Monitoring Guide](04-monitoring.md)
- Configure backups: [Backup & Restore Guide](05-backup-restore.md)
- Plan for scaling: [Scaling Guide](06-scaling.md)

---

**Previous**: [Admin Guide Overview](README.md) | **Next**: [Configuration →](02-configuration.md)
