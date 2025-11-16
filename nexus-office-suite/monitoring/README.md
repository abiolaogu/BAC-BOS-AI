# NEXUS Monitoring & AIOps Platform

Comprehensive monitoring, observability, and AI-powered operations platform for NEXUS Office Suite.

## Overview

The monitoring stack includes:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Tempo**: Distributed tracing
- **Jaeger**: Tracing UI
- **AlertManager**: Alert routing and notification
- **AIOps**: ML-based anomaly detection and prediction

## Quick Start

### Start Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### Access Dashboards

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686

## Components

### Prometheus

Metrics collection from all services and infrastructure.

**Configuration**: `monitoring/prometheus/prometheus.yml`

**Metrics collected**:
- System metrics (CPU, memory, disk)
- Application metrics (requests, errors, latency)
- Database metrics (connections, queries, replication)
- WebSocket metrics (connections, messages)
- Custom business metrics

### Grafana

Visualization and dashboards for all metrics.

**Dashboards**:
- **Overview**: System-wide health and performance
- **Services**: Per-service metrics and KPIs
- **Business**: User activity and usage statistics
- **WebRTC**: Meeting quality and performance
- **Database**: Query performance and connections
- **Infrastructure**: Container and node metrics

### AlertManager

Alert routing, grouping, and notification.

**Features**:
- Email notifications
- Slack integration
- PagerDuty integration
- Alert grouping and inhibition
- Custom routing rules

**Configuration**: `monitoring/alertmanager/config.yml`

### Loki

Log aggregation from all services.

**Features**:
- Centralized log collection
- Label-based querying
- Log retention policies
- Integration with Grafana

### Tempo

Distributed tracing for request flows.

**Features**:
- End-to-end request tracing
- Service dependency mapping
- Performance bottleneck identification
- Integration with Grafana and Jaeger

### AIOps

AI-powered anomaly detection and predictive alerting.

**Features**:
- ML-based anomaly detection
- Predictive alerts
- Pattern recognition
- Auto-remediation recommendations

## Alert Rules

### System Alerts

- **HighCPUUsage**: CPU > 80% for 5min
- **CriticalCPUUsage**: CPU > 95% for 2min
- **HighMemoryUsage**: Memory > 85% for 5min
- **DiskSpaceLow**: Disk > 80% for 5min

### Service Alerts

- **ServiceDown**: Service unavailable for 1min
- **HighErrorRate**: Error rate > 5% for 5min
- **CriticalErrorRate**: Error rate > 10% for 2min
- **SlowResponseTime**: P95 > 1s for 5min

### Database Alerts

- **PostgreSQLDown**: Database unavailable
- **HighDatabaseConnections**: Connections > 80%
- **SlowQueries**: Avg query time > 1s
- **DatabaseReplicationLag**: Lag > 10s

### Application Alerts

- **HighDocumentCreationLatency**: P95 > 2s
- **MeetingConnectionFailures**: Failure rate > 5%
- **FileUploadFailures**: Failure rate > 5%

## AIOps Anomaly Detection

The AIOps service uses machine learning to detect anomalies in metrics that traditional threshold-based alerts might miss.

### Monitored Metrics

- CPU usage patterns
- Memory usage trends
- Response time distributions
- Error rate variations
- Database connection patterns

### Algorithm

Uses Isolation Forest algorithm for unsupervised anomaly detection:
- Trains on historical data
- Detects outliers in real-time
- Sends alerts to AlertManager
- Retrains daily with new data

### Running AIOps

```bash
cd monitoring/aiops
pip install -r requirements.txt
python anomaly-detection.py
```

## Metrics Endpoints

All services expose metrics at `/metrics`:

```
http://auth-service:3001/metrics
http://writer-service:3002/metrics
http://sheets-service:3003/metrics
...
```

## Custom Metrics

### Adding Custom Metrics

1. **Counter**: For counting events
```javascript
const counter = new Counter({
  name: 'custom_events_total',
  help: 'Total number of custom events'
});
counter.inc();
```

2. **Gauge**: For current values
```javascript
const gauge = new Gauge({
  name: 'custom_value',
  help: 'Current custom value'
});
gauge.set(42);
```

3. **Histogram**: For distributions
```javascript
const histogram = new Histogram({
  name: 'custom_duration_seconds',
  help: 'Duration of custom operations',
  buckets: [0.1, 0.5, 1, 2, 5]
});
histogram.observe(duration);
```

## Grafana Dashboards

### Provisioning Dashboards

Place JSON dashboard files in `monitoring/grafana/dashboards/`

### Dashboard Variables

- `$environment`: production, staging, development
- `$service`: auth, writer, sheets, etc.
- `$instance`: specific service instance

## Log Queries

### Loki Query Examples

```logql
# All logs from writer service
{service="writer"}

# Errors in last hour
{service="writer"} |= "error" | json | level="error"

# Slow requests
{service="writer"} | json | duration > 1s

# Specific user activity
{service="writer"} | json | userId="123"
```

## Tracing

### Tempo Query Examples

Search for:
- Service: `writer-service`
- Operation: `createDocument`
- Duration: `> 1s`
- Tags: `userId=123`

### Trace Propagation

All services propagate trace context via HTTP headers:
- `X-B3-TraceId`
- `X-B3-SpanId`
- `X-B3-ParentSpanId`

## Performance

### Retention Policies

- **Prometheus**: 30 days
- **Loki**: 14 days
- **Tempo**: 7 days

### Resource Usage

- **Prometheus**: ~2GB RAM, 50GB disk
- **Grafana**: ~500MB RAM
- **Loki**: ~1GB RAM, 100GB disk
- **Tempo**: ~1GB RAM, 50GB disk

## Troubleshooting

### Prometheus not scraping targets

Check target health:
```bash
curl http://localhost:9090/api/v1/targets
```

### Grafana not showing data

1. Check datasource configuration
2. Verify Prometheus is running
3. Check network connectivity

### AlertManager not sending alerts

1. Verify SMTP credentials
2. Check Slack webhook URL
3. Review alert routing rules

### AIOps not detecting anomalies

1. Check Prometheus connectivity
2. Verify sufficient historical data
3. Review model training logs

## Scaling

### High Availability

- Run multiple Prometheus instances with Thanos
- Use Grafana HA with shared database
- Deploy AlertManager cluster

### Performance Optimization

- Adjust scrape intervals
- Reduce metric cardinality
- Implement recording rules
- Use remote storage

## Security

- **Authentication**: Grafana, Prometheus, AlertManager
- **TLS**: Enable for all endpoints
- **Network**: Isolate monitoring network
- **Secrets**: Use environment variables

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Tempo Documentation](https://grafana.com/docs/tempo/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)

## License

MIT
