# Scaling Guide

**Version**: 1.0
**Last Updated**: November 2025

---

## Horizontal Scaling

### Application Servers

**Docker Compose**:
```bash
# Scale specific service
docker compose up -d --scale writer-service=3

# Scale multiple services
docker compose up -d \
  --scale api-gateway=2 \
  --scale writer-service=3 \
  --scale sheets-service=3
```

**Kubernetes**:
```bash
# Manual scaling
kubectl scale deployment writer-service --replicas=5 -n nexus

# Horizontal Pod Autoscaler (HPA)
kubectl autoscale deployment writer-service \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n nexus
```

---

## Load Balancing

### NGINX Configuration

```nginx
upstream nexus_api {
    least_conn;
    server api-gateway-1:8000;
    server api-gateway-2:8000;
    server api-gateway-3:8000;
}

server {
    listen 443 ssl http2;
    server_name nexus.yourdomain.com;

    location /api {
        proxy_pass http://nexus_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Database Replication

### PostgreSQL Streaming Replication

**Primary Server**:
```sql
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '<password>';
```

**Replica Setup**:
```bash
pg_basebackup -h primary -D /var/lib/postgresql/data -U replicator -P -R
```

### Read Replicas

```javascript
// Application config
const pool = new Pool({
  master: {
    host: 'postgres-primary',
    port: 5432,
  },
  replicas: [
    { host: 'postgres-replica-1', port: 5432 },
    { host: 'postgres-replica-2', port: 5432 },
  ],
});
```

---

## Caching Strategies

### Redis Caching

```javascript
// Cache frequently accessed data
async function getDocument(id) {
  const cacheKey = `document:${id}`;

  // Try cache first
  let doc = await redis.get(cacheKey);

  if (!doc) {
    // Cache miss - fetch from DB
    doc = await db.documents.findById(id);
    // Store in cache (1 hour TTL)
    await redis.setex(cacheKey, 3600, JSON.stringify(doc));
  }

  return doc;
}
```

### CDN for Static Assets

```bash
# CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name nexus-assets.s3.amazonaws.com

# Update static URLs
STATIC_CDN_URL=https://d1234567.cloudfront.net
```

---

## Performance Tuning

### Application Optimization

- Enable compression (gzip)
- Optimize database queries
- Use connection pooling
- Implement request rate limiting
- Cache API responses

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Analyze and vacuum
ANALYZE documents;
VACUUM ANALYZE;

-- Partition large tables
CREATE TABLE documents_2025 PARTITION OF documents
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

---

**Previous**: [Backup & Restore](05-backup-restore.md) | **Back to Admin Guide**
