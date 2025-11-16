# Deployment Guide

**Version**: 1.0

---

## CI/CD Pipeline

### GitHub Actions

**.github/workflows/ci.yml**:
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - name: Run tests
        run: |
          cd backend/writer-service
          go test ./...

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -t nexus-writer:${{ github.sha }} \
            ./backend/writer-service
      - name: Push to registry
        run: |
          docker push nexus-writer:${{ github.sha }}

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/writer-service \
            writer=nexus-writer:${{ github.sha }}
```

---

## Docker Build

```dockerfile
# Dockerfile (Go service)
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/server /server
EXPOSE 8091
CMD ["/server"]
```

**Build and push**:
```bash
docker build -t nexus-writer:v1.0.0 .
docker tag nexus-writer:v1.0.0 registry.example.com/nexus-writer:v1.0.0
docker push registry.example.com/nexus-writer:v1.0.0
```

---

## Kubernetes Deployment

```yaml
# k8s/writer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: writer-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: writer-service
  template:
    metadata:
      labels:
        app: writer-service
    spec:
      containers:
      - name: writer
        image: registry.example.com/nexus-writer:v1.0.0
        ports:
        - containerPort: 8091
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: nexus-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8091
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8091
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Deploy**:
```bash
kubectl apply -f k8s/
kubectl rollout status deployment/writer-service
```

---

## Blue-Green Deployment

```bash
# Deploy new version (green)
kubectl apply -f k8s/writer-deployment-green.yaml

# Wait for green to be healthy
kubectl wait --for=condition=available deployment/writer-service-green

# Switch traffic
kubectl patch service writer-service \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for issues
# If issues: switch back to blue
# If stable: delete blue deployment
```

---

## Rollback Procedures

```bash
# View deployment history
kubectl rollout history deployment/writer-service

# Rollback to previous version
kubectl rollout undo deployment/writer-service

# Rollback to specific revision
kubectl rollout undo deployment/writer-service --to-revision=2
```

---

**Previous**: [Testing](03-testing.md) | **Back to Developer Guide**
