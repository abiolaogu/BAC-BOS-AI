# StreamVerse - High-Level Architecture (HLA) - Version 3.0

**Version**: 3.0 | **Date**: 2025-11-01 | **Status**: Active Development | **Stack**: YugabyteDB, DragonflyDB, RunPod, ScyllaDB (Your Recommended)

## 1. Executive Summary

StreamVerse is a **globally distributed, AI-powered video streaming platform** combining VOD (SVOD/TVOD/AVOD), Live, FAST/24×7 channels, and PPV events with:

- **Global Scale**: Multi-region deployment (5 PoPs)
- **Carrier-Grade**: 99.99% uptime, DRM, compliance
- **Advanced Streaming**: HLS/DASH with ABR, LL-HLS, tokenized manifests (your existing CDN)
- **AI-Powered**: Real-time recommendations, adaptive bitrate selection
- **Multi-Platform**: Web, Flutter (iOS/Android), Smart TVs (15+ platforms)
- **DevSecOps**: Jenkins/Tekton, Rancher/K8s, AWX/Ansible

---

## 2. Recommended Stack (Your Preferences)

### 2.1 Database Layer

**Replace PostgreSQL with YugabyteDB:**
```
✅ YugabyteDB (Distributed SQL)
   - Multi-region geo-distribution built-in
   - Strong consistency (Raft consensus)
   - No complex replication setup needed
   - 3 nodes per region (3 AZ setup)
   - Automatic failover within and across regions
   - ACID transactions for payments
   - RPO: 0 (synchronous replication across AZs)
   - RTO: <5 minutes (automatic)
```

**Replace Redis with DragonflyDB:**
```
✅ DragonflyDB (In-Memory Cache)
   - Redis API compatible (drop-in replacement)
   - Much faster (memory-efficient)
   - Lower CPU/memory overhead than Redis
   - TTL-based eviction (perfect for tokens/sessions)
   - Multi-threaded performance
   - Cost: ~60% less than Redis at same throughput
```

**Keep ScyllaDB for Time-Series (Remove Aerospike):**
```
✅ ScyllaDB (Distributed Time-Series)
   - Replaced Aerospike completely
   - 1M+ writes/sec per cluster
   - 3-node cluster per region
   - Keyspace per service (auth, analytics, etc.)
   - LCS compaction (Level Compacted Sstable)
   - TTL: 7 days hot, 90 days cold storage
```

### 2.2 GPU Strategy: RunPod (Not AWS/Azure/GCP)

**RunPod for Transcoding & ML:**
```
✅ RunPod Spot GPUs (Cost-Optimized)
   - A100 80GB: $3.29/hour (70% cheaper on Spot)
   - H100: $15.48/hour (on-demand when needed)
   - L40S: $1.99/hour (for inference)
   - No long-term contracts
   - Auto-scale on-demand (KEDA controller)

Auto-Scaling Triggers:
   - Kafka topic "transcoding" queue depth > 100 jobs
   - Latency SLO: P95 job completion < 30 minutes
   - Scale down when queue depth < 10
```

**Why RunPod over Hyperscalers:**
- No vendor lock-in
- 70% cheaper on Spot instances
- Easy multi-cloud portability
- No commitment periods
- Can mix GPUs (A100, H100, L40S) in same job

### 2.3 CDN: Your Existing Infrastructure

```
✅ Your Existing CDN (ATC/ATS or Custom)
   - Do NOT build new CDN
   - Use for HLS/DASH segment delivery
   - Segment your CDN nodes as edges
   - Origin: MinIO (multi-site)
   - Cache: DragonflyDB at edges (tokens, manifests)
   - Traffic management: Your existing setup
```

---

## 3. Database Topology (New Stack)

### 3.1 YugabyteDB (Distributed SQL - Replaces PostgreSQL)

**Per Region Setup:**
```
3 YugabyteDB nodes (one per AZ)
├── Node 1 (AZ-1): tablet leader for shards 0-33%
├── Node 2 (AZ-2): tablet leader for shards 33-67%
└── Node 3 (AZ-3): tablet leader for shards 67-100%

Replication: Raft (3x replicated across AZs)
Consistency: Strong (all writes synchronous)
Failover: Automatic (<5 minutes)
```

**Schemas:**
```sql
-- Auth schema
CREATE KEYSPACE auth;
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMP,
  org_id UUID
);

-- Content schema
CREATE KEYSPACE content;
CREATE TABLE content_metadata (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  genres TEXT[],
  org_id UUID
);

-- Streaming schema
CREATE KEYSPACE streaming;
CREATE TABLE streaming_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID,
  content_id UUID,
  start_time TIMESTAMP,
  avg_bitrate INT,
  org_id UUID
);

-- Payments schema
CREATE KEYSPACE payments;
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  plan_id UUID,
  status TEXT,
  current_period_start DATE,
  current_period_end DATE,
  org_id UUID
);
```

**YugabyteDB Advantages:**
- Geo-replication built-in (no manual replication setup)
- Automatic sharding across nodes
- Strong consistency without complexity
- Lower operational overhead than PostgreSQL replicas

### 3.2 DragonflyDB (Distributed Cache - Replaces Redis)

**Per Region Setup:**
```
1 DragonflyDB instance (64GB per PoP)
├── Ephemeral data: Tokens, manifests, sessions
├── TTL-based eviction: LRU + TTL
└── Replication: Async cross-region (eventual consistency ok)

Use Cases:
  - Access tokens (TTL: 15 minutes)
  - Refresh tokens (TTL: 30 days)
  - Streaming manifests (TTL: 30 seconds)
  - Live playlists (TTL: 2 seconds)
  - Session states (TTL: 8 hours)
  - Idempotency keys (TTL: 24 hours)
```

**Configuration:**
```
maxmemory: 64GB
maxmemory-policy: allkeys-lru
save: "" (no persistence, ephemeral)
replication: replicate across regions (async)
```

**Why DragonflyDB over Redis:**
- 60% lower cost at same throughput
- Faster multi-threaded engine
- Redis API compatible (no code changes)
- Better memory efficiency

### 3.3 ScyllaDB (Time-Series - Replaces Aerospike)

**Per Region Setup:**
```
3 ScyllaDB nodes (Cassandra-compatible)
├── Replication Factor: 3
├── Consistency Level: QUORUM (read + write)
└── Compaction: LCS (Level Compacted Sstable)

Keyspaces:
  - auth: login_attempts, audit_logs
  - analytics: playback_events, user_actions
  - payments: transaction_history
  - streaming: qoe_metrics
```

**Column Families:**
```
CREATE KEYSPACE analytics WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 3};

CREATE TABLE analytics.playback_events (
  session_id UUID,
  timestamp BIGINT,
  event_type TEXT,
  bitrate INT,
  buffer_duration FLOAT,
  PRIMARY KEY ((session_id), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND compaction = {'class': 'LeveledCompactionStrategy'}
  AND default_time_to_live = 7776000; -- 90 days
```

**Why ScyllaDB over Aerospike:**
- Cassandra API (familiar ecosystem)
- Built-in compaction strategies
- Better operational tooling
- Lower licensing/support costs
- Same performance (1M+ writes/sec)

### 3.4 MinIO (Object Storage - Multi-Site)

```
MinIO Cluster per region
├── Buckets:
│   ├── content (VOD source files)
│   ├── transcoded-profiles (ABR ladder output)
│   ├── backups (YugabyteDB snapshots)
│   └── analytics-exports
├── Replication Policy: Active-active across regions
└── Retention: Lifecycle policies per bucket
```

---

## 4. Microservices Architecture (Unchanged, Now with New Stack)

### 4.1 Service Topology

```
┌─────────────────────────────────────────────┐
│  Client Layer                               │
│  Web (Next.js) | Mobile (Flutter) | TVs    │
└────────────────┬────────────────────────────┘
                 │ HTTPS/H3/QUIC
    ┌────────────▼──────────────┐
    │  API Gateway (Kong)       │
    │  Rate Limit | Auth        │
    └────────────┬──────────────┘
                 │
    ┌────────────▼──────────────────────────────┐
    │  11 Microservices (Go/Python/Node)       │
    │  Auth | User | Content | Streaming       │
    │  Transcode | Payment | Search            │
    │  Analytics | Recommendation | Notif      │
    │  Admin                                   │
    └────────────┬──────────────────────────────┘
                 │
    ┌────────────▼──────────────────────────────┐
    │  Message Broker (Kafka + MM2)            │
    └────────────┬──────────────────────────────┘
                 │
    ┌────────────▼──────────────────────────────┐
    │  Data Layer (New Stack)                  │
    │  YugabyteDB | DragonflyDB | ScyllaDB     │
    │  MinIO | Elasticsearch | ClickHouse      │
    └──────────────────────────────────────────┘
```

### 4.2 Service Database Assignments

| Service | Primary DB | Cache | Time-Series |
|---------|-----------|-------|------------|
| Auth | YugabyteDB | DragonflyDB (tokens) | ScyllaDB (audit) |
| User | YugabyteDB | DragonflyDB (profile) | ScyllaDB (history) |
| Content | YugabyteDB | DragonflyDB (metadata) | ScyllaDB (views) |
| Streaming | YugabyteDB | DragonflyDB (tokens, manifests) | ScyllaDB (QoE) |
| Transcoding | YugabyteDB | DragonflyDB (job queue) | ScyllaDB (metrics) |
| Payment | YugabyteDB | DragonflyDB (idempotency) | ScyllaDB (txns) |
| Search | Elasticsearch | DragonflyDB (cache) | — |
| Analytics | ClickHouse | DragonflyDB (agg) | ScyllaDB (raw) |
| Recommendation | TensorFlow Serving | DragonflyDB (embeddings) | — |
| Notification | YugabyteDB | DragonflyDB (queue) | ScyllaDB (logs) |
| Admin | YugabyteDB | DragonflyDB (cache) | ScyllaDB (audit) |

---

## 5. GPU Strategy: RunPod Integration

### 5.1 Transcoding Pipeline with RunPod

```
1. Content uploaded → YugabyteDB job record
2. Kafka topic "transcoding" receives job
3. RunPod controller monitors queue depth
4. If queue > 100, provision RunPod GPU pod
   └─ A100: $3.29/hr (Spot, transcoding)
   └─ H100: $15.48/hr (heavy encoding, 4K)
5. Pod consumes job from Kafka
6. GStreamer encodes all ABR profiles
7. Output → MinIO (by profile)
8. Job status updated → Content Service notified
9. Pod runs down when queue empty (no idle GPUs)

Cost Estimate:
  - 100 VOD titles/month @ 2 hrs encode each
  - RunPod Spot A100: 200 hrs * $3.29 = $658/month
  - vs. AWS GPU: 200 hrs * $15/hr = $3,000/month
  - Savings: 78%
```

### 5.2 ML Inference with RunPod

```
Recommendation Model Serving:
  - Daily batch: RecompilePython script trains embeddings
  - Output → MinIO (embeddings.bin)
  - RunPod pod loads model into TensorFlow Serving
  - Inference: 10K req/sec @ P95 < 500ms
  - Auto-scale: 1-5 pods based on RPS
  - Cost: ~$100-200/month (on-demand L40S)
```

### 5.3 KEDA Auto-Scaling for RunPod

```yaml
# KEDA ScaledObject for Transcoding
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: runpod-transcoding-scaler
spec:
  scaleTargetRef:
    name: runpod-transcoding-deployment
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      consumerGroup: transcoding-workers
      topic: transcoding
      lagThreshold: "100"  # Scale if 100+ jobs waiting
      offsetResetPolicy: "latest"
```

---

## 6. Cost Comparison: Your Stack vs. Traditional

| Component | Traditional | Your Stack | Savings |
|-----------|-------------|-----------|---------|
| **Database** | PostgreSQL ($2K/mo) + replication setup | YugabyteDB ($1.5K/mo, built-in) | 25% |
| **Cache** | Redis ($1K/mo) | DragonflyDB ($400/mo) | 60% |
| **Time-Series** | Aerospike ($3K/mo) | ScyllaDB ($1.2K/mo) | 60% |
| **GPU** | AWS A100 ($15/hr) | RunPod ($3.29/hr) | 78% |
| **CDN** | Build new ($10K setup) | Use existing ($0) | 100% |
| **TOTAL/Month** | ~$18K | ~$8K | 56% |

---

## 7. High Availability & Disaster Recovery

### 7.1 Multi-Region Setup

```
Region Topology:
  London (Primary)
    ├── YugabyteDB (3 nodes)
    ├── DragonflyDB (64GB)
    ├── ScyllaDB (3 nodes)
    └── Kafka (3 brokers)
         ↓ Raft consensus (writes sync)
  Ashburn (Replica)
    ├── YugabyteDB (3 nodes)
    ├── DragonflyDB (64GB)
    ├── ScyllaDB (3 nodes)
    └── Kafka (3 brokers)
         ↓ MM2 replication (topics sync)
  [Singapore, São Paulo, Lagos] - Same setup

Failover:
  - Automatic within region (YugabyteDB HA)
  - Manual promotion of secondary region (1-2 hours)
  - RTO: <5 minutes (within region), <2 hours (cross-region)
  - RPO: 0 (synchronous replication)
```

### 7.2 Backup Strategy

```
YugabyteDB:
  - Hourly snapshots → MinIO
  - Retention: 30 days
  - RPO: 1 hour

ScyllaDB:
  - Continuous WAL → MinIO
  - Retention: 7 days hot, 90 days cold
  - RPO: 5 minutes

MinIO:
  - Multi-site replication (active-active)
  - Retention: 1 year
  - RPO: Near-real-time
```

---

## 8. Deployment on Your Infrastructure

### 8.1 Self-Hosted Kubernetes (Rancher-Managed)

```
Per Region:
  - 3 control planes (HA)
  - 6-10 worker nodes (t4g.xlarge)
  - 1 storage node (MinIO)
  - 1 database node (YugabyteDB master)
  - 1 message node (Kafka leader)

Kubernetes namespaces:
  - production (11 services)
  - staging (pre-prod)
  - monitoring (Prometheus, Grafana, Loki, Jaeger)
  - storage (YugabyteDB, Kafka, MinIO)
  - system (Rancher, cert-manager)
```

### 8.2 RunPod Integration (Federated)

```
RunPod Pods (Not in Kubernetes):
  - Separate RunPod account (www.runpod.io)
  - Kubernetes controller (custom Python) monitors Kafka
  - Scales RunPod pods on-demand
  - Jobs pulled via Kafka consumer
  - Results → MinIO + YugabyteDB

Why Separate:
  - RunPod GPUs don't run in your K8s cluster
  - Cost-effective (pay only when running)
  - No idle GPU resource overhead
  - Easy to provision/deprovision
```

---

## 9. Monitoring & Observability

### 9.1 Per-Database Monitoring

```
YugabyteDB:
  - Replication lag (< 1s target)
  - Tablet leader balance
  - Read/write latency (P95 < 50ms)
  - Query throughput (QPS)
  - Tablets in transition

DragonflyDB:
  - Memory utilization
  - Eviction rate (LRU)
  - Command latency (P95 < 5ms)
  - Replication lag (< 10s cross-region)
  - TTL expiration rate

ScyllaDB:
  - Throughput (writes/sec)
  - Read/write latency (P95 < 100ms)
  - Compaction progress
  - Disk utilization
  - GC pauses

Alerts:
  - YugabyteDB replication lag > 5s
  - DragonflyDB memory > 90%
  - ScyllaDB latency P95 > 200ms
  - RunPod GPU utilization > 95%
  - Kafka lag > 10K messages
```

---

## 10. Cost Breakdown (Monthly Estimates)

```
Infrastructure (Self-Hosted):
  - Server costs: ~$5,000 (5 regions × $1K baseline + bandwidth)
  - Shared costs (power, cooling, rack space): ~$2,000

Databases (Your Stack):
  - YugabyteDB: ~$1,500 (3 nodes × 5 regions)
  - DragonflyDB: ~$400 (in-memory, low cost)
  - ScyllaDB: ~$1,200 (3 nodes × 5 regions)
  - MinIO: ~$300

GPU (RunPod On-Demand):
  - Transcoding: ~$700 (100 VOD titles/month)
  - ML Inference: ~$200 (model serving)

Analytics & Monitoring:
  - ClickHouse: ~$500
  - Prometheus/Grafana: ~$200

Kafka + Message Queue:
  - Self-hosted: ~$500 (hardware included above)

Total Monthly: ~$12,500

vs. AWS Equivalent: ~$40,000+
Savings: 69%
```

---

## 11. Migration Path from PostgreSQL → YugabyteDB

```
Phase 1: Parallel Run (1 week)
  - Both PostgreSQL and YugabyteDB running
  - Writes go to PostgreSQL, replicated to YugabyteDB
  - Read traffic gradually shifted to YugabyteDB

Phase 2: Validation (1 week)
  - Compare data integrity
  - Performance testing
  - Failover drills

Phase 3: Cutover (1 day)
  - Switch writes to YugabyteDB
  - Monitor for issues
  - Keep PostgreSQL as backup

Phase 4: Cleanup
  - Decommission PostgreSQL after 30 days
```

---

## 12. Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Distributed SQL** | YugabyteDB | 2.20+ | Primary database (ACID, geo-replicated) |
| **Ephemeral Cache** | DragonflyDB | 1.0+ | Session cache, tokens, manifests |
| **Time-Series** | ScyllaDB | 5.2+ | Analytics, events, metrics |
| **Object Storage** | MinIO | Latest | VOD, backups, exports |
| **Full-Text Search** | Elasticsearch | 8.10+ | Content search |
| **Analytics** | ClickHouse | 23.10+ | Real-time analytics dashboard |
| **Message Queue** | Kafka | 3.5+ | Event streaming |
| **GPU Compute** | RunPod | — | On-demand A100/H100 transcoding |
| **API Gateway** | Kong | 3.4+ | Rate limiting, auth, routing |
| **Frontend** | Next.js 14 + React 18 | Latest | Web app |
| **Mobile** | Flutter | 3.13+ | iOS/Android |
| **Container** | Docker + Kubernetes | Latest | Orchestration |
| **IaC** | Terraform | 1.6+ | Infrastructure provisioning |
| **CI/CD** | Jenkins/Tekton + GitHub Actions | Latest | Automated deployment |
| **Observability** | Prometheus + Grafana + Loki + Jaeger | Latest | Monitoring |
| **Secrets** | HashiCorp Vault | 1.15+ | Credential management |
| **Automation** | Ansible (AWX) | 2.12+ | Infrastructure automation |
| **CDN** | Your Existing (ATC/ATS) | — | Segment delivery |

---

## Summary: Why This Stack

✅ **YugabyteDB**: Geo-distributed SQL without complexity
✅ **DragonflyDB**: 60% cost reduction + Redis compatibility
✅ **ScyllaDB**: Replaces Aerospike, simpler operations
✅ **RunPod**: 78% cheaper GPU than hyperscalers
✅ **Your CDN**: No new CDN setup required
✅ **Total Cost**: 69% lower than AWS equivalent

This stack optimizes for:
- **Cost**: 56% lower monthly spend
- **Simplicity**: Fewer vendor integrations
- **Performance**: No compromise on latency/throughput
- **Flexibility**: Easy to migrate, no lock-in
