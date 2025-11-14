# StreamVerse - High-Level Architecture (HLA) & Component Specifications

**Version**: 2.0 | **Date**: 2025-11-01 | **Status**: Active Development

## 1. Executive Summary

StreamVerse is a **globally distributed, AI-powered video streaming platform** combining VOD (SVOD/TVOD/AVOD), Live, FAST/24×7 channels, and PPV events with:

- **Global Scale**: Multi-region deployment (London, Ashburn, Lagos, Singapore, São Paulo)
- **Carrier-Grade**: 99.99% uptime, DRM, compliance, lawful intercept hooks
- **Advanced Streaming**: HLS/DASH with ABR, LL-HLS, tokenized manifests, SSAI
- **AI-Powered**: Real-time recommendations, CDN selection, churn prediction
- **Multi-Platform**: Web, Flutter (iOS/Android), Smart TVs (15+ platforms)
- **Telecom-Ready**: Kamailio + FreeSWITCH + RTPengine + Open5GS
- **DevSecOps**: Jenkins/Tekton, Rancher/K8s, AWX/Ansible, SLSA attestations

---

## 2. Baseline Infrastructure

### 2.1 Cloud Footprint

**Baseline Requirement**: ≤ 1 on-demand CPU node per region at all times

| Region | Infrastructure | Baseline CPU | Burst CPU/GPU | GPU (on-demand) |
|--------|------|--------------|---------------|-----------------|
| London | Own Bare-Metal | 1 node | Burst capacity | RunPod on-demand |
| Ashburn | Own Bare-Metal | 1 node | Burst capacity | RunPod on-demand |
| Lagos | Own Bare-Metal | 1 node | Burst capacity | RunPod on-demand |
| Singapore | Own Bare-Metal | 1 node | Burst capacity | RunPod on-demand |
| São Paulo | Own Bare-Metal | 1 node | Burst capacity | RunPod on-demand |

**GPU Strategy**:
- **Tier-1 PoPs**: Small on-demand GPU fleet (NVIDIA A100 / H100) for critical paths
- **Burst**: RunPod Spot GPUs (transcoding, ML inference) - www.runpod.io
- **Nightly**: GPU = 0 when idle

**Network**: 
- H3/QUIC (modern clients)
- TCP BBR (congestion control)
- OCSP stapling (TLS optimization)

### 2.2 Database Topology

| Service | Primary | Cache | Analytics |
|---------|---------|-------|-----------|
| Auth/User | YugabyteDB + 2x async replica | DragonflyDB (sessions, refresh tokens) | ClickHouse (audit logs) |
| Content | YugabyteDB + 1x sync replica | DragonflyDB (metadata, categories) | ClickHouse (views) |
| Streaming | YugabyteDB | DragonflyDB (ephemeral: manifests, tokens) | ClickHouse (QoE metrics) |
| Payments | YugabyteDB (ACID required) | DragonflyDB (nonce, idempotency) | ClickHouse (revenue) |
| Analytics | ClickHouse (hot) | DragonflyDB (aggregates) | ClickHouse (historical) |

### 2.3 Object Storage & Message Queue

- **Own CDN**: Apache Traffic Control + Apache Traffic Server (existing infrastructure)
- **Ephemeral Cache**: DragonflyDB (token manifests, live segments, temporary states)
- **Durable Storage**: ScyllaDB (time-series metrics, playback events)
- **Message Broker**: Kafka with Mirror Maker 2 (MM2) for cross-region replication
- **Analytics Pipeline**: ClickHouse fed from Kafka + file imports

---

## 3. Microservices Architecture

### 3.1 Service Topology & Boundaries

```
┌────────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                                     │
│  Web (Next.js) │ iOS (Flutter) │ Android (Flutter) │ Smart TVs     │
└────────────────┬───────────────────────────────────────────────────┘
                 │ HTTPS/H3/QUIC
     ┌───────────▼────────────┐
     │   API Gateway (Kong)   │
     │   Rate Limit │ Auth    │
     └───────────┬────────────┘
                 │
    ┌────────────┴─────────────────────────────────────────┐
    │                                                       │
    │    Microservices (Kubernetes Pods)                   │
    │                                                       │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
    │  │   Auth   │ │  User    │ │ Content  │             │
    │  │ Service  │ │ Service  │ │ Service  │             │
    │  └──────────┘ └──────────┘ └──────────┘             │
    │                                                       │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
    │  │Streaming │ │Transcode │ │ Payment  │             │
    │  │ Service  │ │ Service  │ │ Service  │             │
    │  └──────────┘ └──────────┘ └──────────┘             │
    │                                                       │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
    │  │Analytics │ │  Recomm. │ │Notif.    │             │
    │  │ Service  │ │ Service  │ │ Service  │             │
    │  └──────────┘ └──────────┘ └──────────┘             │
    │                                                       │
    │  ┌──────────┐ ┌──────────┐                           │
    │  │ Search   │ │  Admin   │                           │
    │  │ Service  │ │ Service  │                           │
    │  └──────────┘ └──────────┘                           │
    │                                                       │
    └───────────┬──────────────────────────────────────────┘
                │
    ┌───────────▼────────────────────────────────┐
    │   Message Broker (Kafka + MM2)             │
    │   Topics: events, transcoding, live, etc   │
    └───────────┬────────────────────────────────┘
                │
    ┌───────────▼────────────────────────────────────────────────┐
    │                  Data Layer                                 │
    │  PostgreSQL │ DragonflyDB │ ScyllaDB │ MinIO │ ClickHouse   │
    └────────────────────────────────────────────────────────────┘
```

### 3.2 Service Specifications

#### **Auth Service** (Go)
- **Port**: 8001 | **Timeout**: 5s | **Replicas**: 3
- **Endpoints**:
  - `POST /auth/register` - User registration
  - `POST /auth/login` - JWT + refresh token issuance
  - `POST /auth/refresh` - Refresh access token
  - `POST /auth/logout` - Token revocation
  - `GET /auth/validate` - Token validation (internal)
- **Features**:
  - JWT (access: 15min, refresh: 30 days)
  - OAuth2.0 (Google, Apple, Facebook)
  - MFA (TOTP, SMS)
  - Rate limiting: 1000 req/min per IP
- **Database**: PostgreSQL + Redis (sessions)

#### **User Service** (Go)
- **Port**: 8002 | **Timeout**: 3s | **Replicas**: 3
- **Endpoints**:
  - `GET /users/{id}` - Profile fetch
  - `PUT /users/{id}` - Profile update
  - `GET /users/{id}/watch-history` - Pagination
  - `POST /users/{id}/watchlist` - Add to watchlist
- **Features**:
  - Watch history (with resume position)
  - Watchlist management
  - Preferences (language, subtitle, quality)
  - Device management
- **Database**: PostgreSQL + Redis (profile cache)

#### **Content Service** (Go)
- **Port**: 8003 | **Timeout**: 2s | **Replicas**: 5 (read-heavy)
- **Endpoints**:
  - `GET /content/{id}` - Metadata fetch
  - `GET /content/search` - Full-text search
  - `GET /content/categories` - Catalog browsing
  - `GET /content/trending` - Real-time trending
  - `POST /content/{id}/ratings` - User ratings
- **Features**:
  - Multi-language metadata (i18n)
  - DRM rights management
  - Rights window enforcement
  - Search with analyzers (stemming, synonyms)
- **Database**: PostgreSQL + Elasticsearch + Redis (catalog cache)

#### **Streaming Service** (Go)
- **Port**: 8004 | **Timeout**: 10s | **Replicas**: 5
- **Endpoints**:
  - `GET /streaming/manifest/{content_id}` - Tokenized HLS/DASH
  - `GET /streaming/live/{channel_id}` - Live channel manifest
  - `POST /streaming/token/{content_id}` - Token generation
  - `GET /streaming/qoe` - QoE metrics submission
- **Features**:
  - Tokenized manifests (per-user, per-IP, TTL)
  - ABR selection algorithm
  - Manifest rewriting (CDN optimization)
  - QoE collection
- **Database**: PostgreSQL + DragonflyDB (ephemeral tokens/manifests)

#### **Transcoding Service** (Go + GStreamer)
- **Port**: 8005 | **Timeout**: Long-running (WebSocket/gRPC) | **Replicas**: Variable (auto-scale on queue depth)
- **Endpoints**:
  - `POST /transcode/jobs` - Submit VOD transcode
  - `GET /transcode/jobs/{job_id}` - Status polling
  - `POST /transcode/profiles` - Profile management
- **Features**:
  - Multi-profile ABR (240p, 360p, 480p, 720p, 1080p, 4K)
  - Live transcoding via OvenMediaEngine
  - CMAF packaging
  - Codec support: H.264, H.265, VP9, AV1
- **Database**: PostgreSQL (job metadata) + Kafka (task queue)

#### **Payment Service** (Go)
- **Port**: 8006 | **Timeout**: 30s | **Replicas**: 3 (high-availability)
- **Endpoints**:
  - `POST /payments/subscribe` - Subscription creation
  - `POST /payments/purchase` - PPV/TVOD purchase
  - `GET /payments/entitlements` - User entitlements check
  - `POST /payments/webhook` - Payment provider webhooks
- **Features**:
  - Stripe/PayPal/local integrations
  - Idempotency key handling
  - Subscription lifecycle management
  - Entitlement caching (Redis)
- **Database**: PostgreSQL (ACID transactions) + Redis (nonce, idempotency)

#### **Search Service** (Go)
- **Port**: 8007 | **Timeout**: 1s | **Replicas**: 3
- **Endpoints**:
  - `GET /search` - Full-text search
  - `GET /search/suggestions` - Autocomplete
  - `GET /search/filters` - Faceted search
- **Features**:
  - Elasticsearch backend (text analyzers: stemming, synonyms, i18n)
  - Typo tolerance (fuzzy search)
  - Real-time indexing via Kafka
  - Faceted navigation (genre, year, rating)
- **Database**: Elasticsearch + Kafka (indexing pipeline)

#### **Analytics Service** (Python)
- **Port**: 8008 | **Timeout**: Async (Celery) | **Replicas**: 3 + 5 workers
- **Endpoints**:
  - `POST /analytics/events` - Event ingestion
  - `GET /analytics/dashboard` - Real-time metrics
  - `GET /analytics/reports` - Historical reports
- **Features**:
  - Play, pause, seek, buffering, error events
  - DORA metrics (lead time, deploy freq, change fail, MTTR)
  - QoE SLOs (startup <2s, rebuffer <0.5%)
  - 1M events/sec throughput
- **Database**: Kafka → ClickHouse + ScyllaDB

#### **Recommendation Service** (Python)
- **Port**: 8009 | **Timeout**: 500ms (P95) | **Replicas**: 3
- **Endpoints**:
  - `GET /recommendations/{user_id}` - Personalized feed
  - `GET /recommendations/trending` - Global trending
  - `GET /recommendations/similar/{content_id}` - Similar content
- **Features**:
  - Collaborative filtering (Annoy index)
  - Deep learning (TensorFlow Serving)
  - Embeddings (vector search)
  - Real-time model serving
- **Database**: Redis (embeddings) + TensorFlow Serving + Faiss

#### **Notification Service** (Node.js)
- **Port**: 8010 | **Timeout**: 5s | **Replicas**: 3
- **Endpoints**:
  - `POST /notifications/send` - Notification dispatch
  - `GET /notifications/{user_id}` - Notification history
- **Features**:
  - Multi-channel: Push (Firebase), Email (SendGrid), SMS (Twilio)
  - Personalization (i18n, user preferences)
  - Template rendering (Handlebars)
  - Delivery tracking
- **Database**: PostgreSQL (notification history) + Redis (queue)

#### **Admin Service** (Go)
- **Port**: 8011 | **Timeout**: 10s | **Replicas**: 2
- **Endpoints**:
  - `GET /admin/users` - User management
  - `POST /admin/content` - Content ingestion
  - `GET /admin/analytics` - Admin dashboard
  - `GET /admin/settings` - System configuration
- **Features**:
  - RBAC (superadmin, admin, editor)
  - Audit logging
  - Bulk operations
  - System health checks
- **Database**: PostgreSQL + Audit log stream to Kafka

---

## 4. Streaming Architecture

### 4.1 VOD Playback Flow

```
User Request
  ↓
API Gateway (rate limit, auth)
  ↓
Content Service (verify entitlement, DRM check)
  ↓
Streaming Service (generate tokenized manifest)
  ↓
DNS / Traffic Router
  ↓
Optimal CDN Edge (ATS-based)
  ↓
HLS/DASH segments + Video player telemetry
```

**Tokenization**:
```
Manifest URL: https://cdn.streamverse.io/hls/{content_id}/{token}.m3u8
Token = JWT(
  content_id,
  user_id,
  ip_address,
  exp = now + 3600,
  sign(secret)
)
Edge validates token before serving segments
```

### 4.2 Live Ingest & Distribution

```
Ingest Source (RTMP/SRT/WebRTC)
  ↓
OvenMediaEngine (ingest cluster)
  ↓
Real-time Transcoding (ABR ladder)
  ↓
LL-HLS Segments (2s, 6 parts)
  ↓
CDN Distribution (ATS edges worldwide)
  ↓
Player (<2s glass-to-glass)
```

### 4.3 FAST Channel Architecture

```
Scheduler Service
  ↓
Pre-planned 24hr+ content grid (VOD + ads)
  ↓
Playout Engine (server-side stitching)
  ↓
SSAI (ad insertion points)
  ↓
HLS/DASH Live Stream (virtual channel)
  ↓
CDN Distribution
  ↓
Playback (resume on network switch)
```

---

## 5. Transcoding Pipeline

### 5.1 VOD Transcoding

**Workflow**:
1. Content ingestion → MinIO
2. Transcode Service submits job → Kafka topic
3. GStreamer workers pick up job
4. Generate 6-8 ABR profiles (240p-4K)
5. CMAF packaging (both HLS + DASH)
6. Output → MinIO (by profile)
7. Content Service updates manifest URLs
8. ClickHouse logs job metrics

**ABR Ladder**:
```
Profile   | Codec  | Bitrate | Resolution | FPS
----------|--------|---------|------------|-----
baseline  | H.264  | 800k    | 360p       | 24
low       | H.264  | 2500k   | 480p       | 24
medium    | H.264  | 5000k   | 720p       | 30
high      | H.265  | 8000k   | 1080p      | 30
uhd       | H.265  | 15000k  | 2160p      | 60
hdr       | H.265  | 20000k  | 2160p HDR  | 60
```

### 5.2 Live Transcoding (OvenMediaEngine)

- Real-time ABR generation
- LL-HLS support (2s segments, 0.5s parts)
- Latency target: <2s glass-to-glass
- Failover: Backup ingest if primary drops

---

## 6. Security & Compliance

### 6.1 API Security

- **TLS 1.3 only**, HSTS enabled
- **JWT** with refresh rotation (15min access, 30d refresh)
- **Rate limiting**: Token bucket (1000 req/min per user, 10K/min per API key)
- **WAF**: Cloudflare / AWS WAF (DDoS, injection, OWASP Top 10)

### 6.2 DRM & Content Protection

- **Widevine** (Level 1: 4K, Level 2: 1080p, Level 3: SD)
- **FairPlay** (iOS, Apple TV)
- **PlayReady** (Smart TVs, Xbox)
- **AES-128-CBC** segment encryption (HLS) or **CENC** (DASH)

### 6.3 Policy Enforcement

- **OPA Gatekeeper** (Kubernetes policy)
- **NetworkPolicies** (micro-segmentation)
- **mTLS** via Linkerd/Istio (service mesh)

### 6.4 Artifact Security

- **Trivy** vulnerability scanning (images)
- **Cosign** signing + verification
- **OpenSCAP** compliance baselines in CI
- **SLSA attestations** (provenance)

### 6.5 Compliance & Audit

- **Lawful intercept hooks** (telecom mode)
- **GDPR** compliance (data retention, deletion)
- **CCPA** compliance (opt-out mechanisms)
- **FCC** compliance (closed captions, accessibility)

---

## 7. Observability & Monitoring

### 7.1 Telemetry Stack

- **OTel Collectors** (trace, metric, log exporters)
- **Prometheus** (metrics, 15s scrape, 24h retention + long-term in ClickHouse)
- **Grafana** (dashboards per service)
- **Loki** (log aggregation)
- **Tempo** (distributed tracing, 72h retention)

### 7.2 SLOs & DORA Metrics

**QoE SLOs**:
- Video startup: P95 < 2s
- Rebuffering: < 0.5% of playback
- Availability: 99.99%

**DORA Metrics**:
- **Lead Time**: < 1 day (commit to production)
- **Deployment Frequency**: 10+ per day
- **Change Failure Rate**: < 15%
- **MTTR**: < 1 hour

### 7.3 Synthetic Monitoring

- Load generation from ≥2 clouds (simulating global users)
- Canary deployments (5% traffic → 50% → 100%)
- Real User Monitoring (RUM) dashboards

---

## 8. DevSecOps & CI/CD

### 8.1 Pipeline (Jenkins/Tekton + Rancher)

**Stages**:
1. **Lint** (Go fmt, Pylint, ESLint)
2. **Security Scan** (Trivy, SAST, dependency check)
3. **Unit Tests** (80%+ coverage required)
4. **Integration Tests** (docker-compose up)
5. **E2E Tests** (Selenium, k6, Postman)
6. **Build** (Docker multi-stage)
7. **Push** (Registry + Cosign signing)
8. **Deploy** (Helm to Rancher-managed K8s cluster)

### 8.2 Deployment Strategy

- **Red/Black** (canary 5% → 50% → 100%)
- **Rollback** (automatic on error rate spike)
- **GitOps** (ArgoCD)

### 8.3 Secrets Management

- **Vault** (centralized, rotate every 90 days)
- **Environment-based** (dev, staging, prod)
- **No hardcoding** in code/Docker

### 8.4 Ansible (AWX) Automation

- Server provisioning (base OS hardening)
- Database initialization
- Backup/restore procedures
- DR failover automation

---

## 9. Kubernetes Deployment

### 9.1 Cluster Configuration (Rancher)

**Nodes per Region**:
- Tier-1 PoP: 3 control planes + 6 worker nodes (bare-metal)
- Tier-2 PoP: 1 control plane + 3 worker nodes (bare-metal)
- Tier-3 PoP: EdgeX / light cluster

**Resource Allocation**:
```
Node Type: c5.9xlarge (36 vCPU, 72 GB RAM)
Baseline: 1 on-demand CPU node
Burst: Spot instances for batch/transcoding
GPU: 1-2 GPUs per Tier-1 PoP for encoding
```

### 9.2 Namespace Organization

```
namespaces:
  - production (services)
  - staging (pre-production validation)
  - monitoring (Prometheus, Grafana, Loki, Tempo)
  - ingress (Kong API Gateway)
  - system (Rancher, cert-manager, external-dns)
  - storage (MinIO, PostgreSQL operators)
```

### 9.3 StatefulSets & DaemonSets

- **PostgreSQL Operator** (patroni for HA failover)
- **Kafka Operator** (Strimzi, 3 brokers × 5 regions)
- **Elasticsearch Operator** (ECK, 5 data nodes)
- **Prometheus** (federated scrape across regions)

---

## 10. Database Topology (Per Region)

### 10.1 PostgreSQL

```
Primary (writable):
  - 36 vCPU, 72 GB RAM, 2TB NVMe
  - WAL archiving to MinIO
  
Replica (sync, failover candidate):
  - Same spec
  - Streaming replication
  
Replica (async, read-only):
  - 24 vCPU, 48 GB RAM
  
Read-replicas (optional): 
  - Standby for analytics queries
```

### 10.2 DragonflyDB (Ephemeral)

- 64GB in-memory cache per Tier-1 PoP
- Tokens, manifests, session states
- Auto-eviction (LRU, TTL-based)
- Replication: async cross-region

### 10.3 ScyllaDB (Time-Series)

- 3-node cluster per region
- Keyspace: analytics (events, metrics)
- Compaction: LCS (Leveled)
- TTL: 90 days

### 10.4 ClickHouse

- 3 shards × 2 replicas per region
- MergeTree table engine
- Distributed queries across regions
- Retention: Hot (7 days), Cold (90 days)

### 10.5 MinIO

- Multi-site setup (replication policies)
- Bucket per service (content, transcoding, analytics)
- S3-compatible API
- 10 Gbps ingress/egress per PoP

---

## 11. Telecom Backend (Optional, Future)

### 11.1 VoIP Stack

- **Kamailio** (SIP proxy, LB)
- **FreeSWITCH** (call processing, RTC engine)
- **RTPengine** (SBC, RTP relay, transcoding)
- **Open5GS** (5G core, UPF near edges)

### 11.2 WebRTC Gateway

- TURN server (coturn or eturnal)
- Simulcast (1080p, 720p, 360p)
- Bandwidth adaptation

### 11.3 Lawful Intercept Hooks

- CALEA compliant (USA)
- TLS mirroring to government endpoints
- Metadata logging (caller, callee, duration, etc.)

---

## 12. Client Applications

### 12.1 Web (Next.js)

- Framework: Next.js 14 + React 18 + TypeScript
- Streaming: dash.js / hls.js
- Player: Shaka Player / Video.js (DRM-capable)
- State: Zustand + React Query
- Styling: Tailwind CSS

### 12.2 Mobile (Flutter)

- Framework: Flutter 3.13+
- Streaming: ExoPlayer (Android), AVFoundation (iOS)
- DRM: Widevine (Android), FairPlay (iOS)
- Local storage: Hive
- State: GetX / Provider

### 12.3 Smart TVs (Multi-Platform)

- **Android TV/Google TV**: Android TV Framework + ExoPlayer
- **Samsung Tizen**: Tizen SDK + AVPlayer
- **LG webOS**: webOS SDK + HTML5 video
- **Roku**: BrightScript + Video Player API
- **Amazon Fire TV**: FireTV SDK + ExoPlayer
- **Apple tvOS**: tvOS 16+ + AVKit
- **Shared Player**: Video player with ABR, DRM, telemetry

---

## 13. Repository Structure

```
streamverse-platform/
├── docs/
│   ├── ARCHITECTURE.md (this file)
│   ├── API.md (OpenAPI specs)
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   ├── CONTRIBUTING.md
│   ├── diagrams/ (Mermaid + PlantUML)
│   └── BOM.md (Bill of Materials)
│
├── services/
│   ├── auth-service/
│   │   ├── main.go
│   │   ├── handlers/
│   │   ├── models/
│   │   ├── Dockerfile
│   │   ├── Makefile
│   │   └── tests/
│   ├── user-service/
│   ├── content-service/
│   ├── streaming-service/
│   ├── transcoding-service/
│   ├── payment-service/
│   ├── search-service/
│   ├── analytics-service/ (Python)
│   ├── recommendation-service/ (Python)
│   ├── notification-service/ (Node.js)
│   └── admin-service/
│
├── apps/
│   ├── web/ (Next.js)
│   ├── mobile/ (Flutter)
│   ├── admin-dashboard/ (Next.js)
│   └── tv-apps/
│       ├── android-tv/
│       ├── roku/
│       ├── samsung-tizen/
│       ├── lg-webos/
│       ├── fire-tv/
│       ├── apple-tvos/
│       └── shared-player/
│
├── infrastructure/
│   ├── terraform/
│   │   ├── aws/
│   │   ├── gcp/
│   │   ├── azure/
│   │   └── variables.tf
│   ├── kubernetes/
│   │   ├── namespaces.yaml
│   │   ├── auth-service.yaml
│   │   ├── user-service.yaml
│   │   ├── content-service.yaml
│   │   ├── streaming-service.yaml
│   │   ├── transcoding-service.yaml
│   │   ├── payment-service.yaml
│   │   ├── search-service.yaml
│   │   ├── analytics-service.yaml
│   │   ├── recommendation-service.yaml
│   │   ├── notification-service.yaml
│   │   ├── admin-service.yaml
│   │   ├── postgres/
│   │   ├── kafka/
│   │   ├── elasticsearch/
│   │   ├── kong/
│   │   └── monitoring/
│   ├── docker/
│   │   ├── Dockerfile.base (Go, Python, Node.js base images)
│   │   └── docker-compose.yml (local dev)
│   ├── monitoring/
│   │   ├── prometheus.yaml
│   │   ├── grafana-dashboards/
│   │   ├── loki-config.yaml
│   │   ├── jaeger-config.yaml
│   │   └── opentelemetry/
│   └── ansible/
│       ├── playbooks/
│       │   ├── provision.yml
│       │   ├── backup.yml
│       │   ├── restore.yml
│       │   └── failover.yml
│       └── roles/
│
├── packages/
│   ├── proto/
│   │   ├── auth.proto
│   │   ├── user.proto
│   │   ├── content.proto
│   │   ├── streaming.proto
│   │   ├── payment.proto
│   │   └── common.proto
│   ├── common-go/
│   │   ├── logger/
│   │   ├── middleware/
│   │   ├── auth/
│   │   ├── errors/
│   │   └── utils/
│   ├── common-ts/
│   │   ├── logger/
│   │   ├── auth/
│   │   ├── api/
│   │   └── utils/
│   └── sdk/
│       ├── go-sdk/
│       ├── typescript-sdk/
│       └── python-sdk/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml (lint, test, build)
│   │   ├── security-scan.yml (Trivy, SAST)
│   │   ├── e2e-tests.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   └── CODEOWNERS
│
├── docker-compose.yml (local dev stack)
├── Makefile (orchestration)
├── CONTRIBUTING.md
├── ISSUES.md (51-item development plan)
├── go.work (Go workspace)
├── package.json (root, shared deps)
└── pyproject.toml (Python shared config)
```

---

## 14. Development Workflow

### 14.1 Issue-Driven Development

Each ISSUE-XXX maps to one feature/component:

```
ISSUE-006: Auth Service Core Implementation
  → PR with unit tests (80%+ coverage)
  → Integration tests (docker-compose)
  → E2E tests (API endpoints)
  → Code review
  → Merge → CI builds → Deploy to staging
```

### 14.2 Branch Strategy

- `main`: Production-ready code
- `staging`: Pre-production validation
- `dev`: Development branch
- `feature/ISSUE-XXX`: Feature branch per issue

### 14.3 Testing Requirements

- **Unit Tests**: ≥80% coverage (Go: testify, Python: pytest, Node.js: Jest)
- **Integration Tests**: docker-compose with real dependencies
- **E2E Tests**: Selenium (Web/TV), k6 (load), API tests (Postman/k6)
- **Mutation Testing** (optional): verify test quality

---

## 15. Cost Optimization

### 15.1 Baseline Infrastructure Costs

| Region | CPU Node | Spot Burst | Total/month |
|--------|----------|-----------|------------|
| AWS | $300 | $100 | $400 |
| GCP | $300 | $100 | $400 |
| Azure | $300 | $100 | $400 |
| Total | $1,500 | | **$6,000** |

### 15.2 Data Transfer

- Intra-region: Free
- Inter-region (MM2): ~$0.02/GB
- Egress (users): CDN offloads 90%+ (shared costs with AWS/GCP)

### 15.3 RunPod GPU Costs

- A100 80GB: $3.29/hr
- H100: $15.48/hr
- Spot: 70% discount
- Estimated: $500-2000/month (scaling on demand)

---

## 16. Success Metrics

### 16.1 Platform KPIs

| KPI | Target | Measurement |
|-----|--------|-------------|
| Availability | 99.99% | CloudWatch / custom monitoring |
| API P95 latency | <200ms | Prometheus |
| Video startup (P95) | <2s | Client telemetry |
| Rebuffering ratio | <0.5% | Playback events |
| CDN hit ratio | ≥90% | ATS logs |
| Concurrent streams | 5M+ | Stream Service metrics |
| Monthly active users | 1M+ | Analytics |

### 16.2 Engineering KPIs (DORA)

- Lead time: < 1 day
- Deployment frequency: 10+ per day
- Change failure rate: < 15%
- MTTR: < 1 hour

---

## Next Steps

1. **ISSUE-001 to ISSUE-051**: Execute in parallel (see ISSUES.md)
2. **Review & Refine**: Weekly architecture reviews
3. **Deployment**: Staging (week 4) → Production (week 8)

