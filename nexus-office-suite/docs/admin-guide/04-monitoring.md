# Monitoring and Observability Guide

**Version**: 1.0
**Last Updated**: November 2025
**Audience**: System Administrators

---

## Overview

Comprehensive monitoring setup for NEXUS platform using Prometheus, Grafana, Loki, and Jaeger.

---

## Prometheus Metrics

### Install Prometheus

**Docker Compose** (add to docker-compose.yml):
```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
```

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nexus-api-gateway'
    static_configs:
      - targets: ['api-gateway:8000']

  - job_name: 'nexus-writer-service'
    static_configs:
      - targets: ['writer-service:8091']

  - job_name: 'nexus-sheets-service'
    static_configs:
      - targets: ['sheets-service:8092']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Key Metrics to Monitor

**Application Metrics**:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `active_users` - Current active users
- `documents_created_total` - Documents created
- `api_errors_total` - API errors

**Infrastructure Metrics**:
- `node_cpu_seconds_total` - CPU usage
- `node_memory_bytes` - Memory usage
- `node_disk_io_now` - Disk I/O
- `node_network_receive_bytes_total` - Network traffic

**Database Metrics**:
- `pg_stat_database_tup_fetched` - Rows fetched
- `pg_stat_database_tup_inserted` - Rows inserted
- `pg_connections` - Active connections
- `pg_slow_queries` - Slow query count

---

## Grafana Dashboards

### Install Grafana

```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
    - GF_SERVER_ROOT_URL=https://grafana.yourdomain.com
  volumes:
    - grafana-data:/var/lib/grafana
```

### Import Dashboards

1. Access Grafana: `http://localhost:3000`
2. Login: admin/admin
3. Add Prometheus data source
4. Import dashboards:
   - **NEXUS Overview**: ID 1860
   - **Node Exporter**: ID 1860
   - **PostgreSQL**: ID 9628
   - **Redis**: ID 11835

### Custom Dashboard

Create dashboard showing:
- Active users (real-time)
- API request rate
- Error rate by service
- Response times (p50, p95, p99)
- Database query performance
- Storage usage

---

## Log Aggregation (Loki)

### Install Loki + Promtail

```yaml
loki:
  image: grafana/loki:latest
  ports:
    - "3100:3100"
  volumes:
    - ./loki-config.yml:/etc/loki/local-config.yaml
    - loki-data:/loki

promtail:
  image: grafana/promtail:latest
  volumes:
    - /var/log:/var/log
    - ./promtail-config.yml:/etc/promtail/config.yml
  command: -config.file=/etc/promtail/config.yml
```

### Query Logs

**LogQL Examples**:
```logql
# All logs from writer-service
{app="writer-service"}

# Errors only
{app="writer-service"} |= "ERROR"

# Slow queries
{app="postgres"} | json | duration > 1000ms

# Login attempts
{app="auth-service"} |= "login" |= "failed"

# Rate of errors
rate({app="api-gateway"} |= "ERROR" [5m])
```

---

## Health Checks

### Endpoint Monitoring

**Health Check Endpoints**:
```bash
# Overall system health
GET /health
Response: {"status": "healthy", "timestamp": "2025-11-16T10:00:00Z"}

# Detailed health
GET /health/detailed
Response: {
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "active_connections": 45
  }
}
```

**Service-Specific Health**:
```bash
GET /api/writer/health
GET /api/sheets/health
GET /api/drive/health
GET /api/meet/health
```

### Uptime Monitoring

Use tools like:
- **UptimeRobot**: External monitoring
- **Pingdom**: Synthetic monitoring
- **Datadog**: APM and monitoring
- **New Relic**: Application monitoring

---

## Alert Configuration

### Prometheus Alerts

**alertmanager.yml**:
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'alerts@yourdomain.com'
  smtp_auth_password: '<password>'

route:
  receiver: 'email'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@yourdomain.com'
```

**Alert Rules** (alerts.yml):
```yaml
groups:
  - name: nexus_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"

      - alert: ServiceDown
        expr: up{job=~"nexus-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"

      - alert: HighMemoryUsage
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 180
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections: {{ $value }}"
```

### Notification Channels

**Slack**:
```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'
```

**PagerDuty**:
```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<integration-key>'
```

---

## Performance Monitoring

### Application Performance Monitoring (APM)

**Jaeger Tracing**:
```yaml
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"  # UI
    - "14268:14268"  # Collector
  environment:
    - COLLECTOR_ZIPKIN_HOST_PORT=:9411
```

**Instrument Code**:
```javascript
// Node.js example
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('nexus-writer-service');

async function createDocument(data) {
  const span = tracer.startSpan('createDocument');
  try {
    // Your code
    const doc = await db.documents.create(data);
    span.setStatus({ code: SpanStatusCode.OK });
    return doc;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

### Real User Monitoring (RUM)

**Frontend Monitoring**:
```javascript
// Next.js _app.tsx
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: '<app-id>',
  clientToken: '<client-token>',
  site: 'datadoghq.com',
  service: 'nexus-hub',
  env: 'production',
  version: '1.0.0',
  trackInteractions: true,
  trackResources: true,
  trackLongTasks: true,
});
```

---

## Kubernetes Monitoring

### Metrics Server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View resource usage
kubectl top nodes
kubectl top pods -n nexus
```

### Prometheus Operator

```bash
# Install Prometheus Operator
helm install prometheus-operator prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Create ServiceMonitor for NEXUS
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nexus-services
  namespace: nexus
spec:
  selector:
    matchLabels:
      app: nexus
  endpoints:
    - port: metrics
      interval: 30s
EOF
```

---

**Previous**: [User Management](03-user-management.md) | **Next**: [Backup & Restore →](05-backup-restore.md)
