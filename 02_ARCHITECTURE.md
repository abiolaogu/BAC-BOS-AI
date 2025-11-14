# Multi-Engine DBaaS - Software Architecture Document

## 1. ARCHITECTURE OVERVIEW

### 1.1 Architecture Style

The Multi-Engine DBaaS platform follows a **microservices architecture** with the following characteristics:

- **Control Plane**: Centralized, multi-region active-passive
- **Data Plane**: Distributed, regional PoP clusters  
- **Communication**: REST APIs, gRPC for internal services, Kafka for events
- **Data Storage**: PostgreSQL for control plane, distributed databases for tenants
- **Orchestration**: Kubernetes-native with operators and CRDs

### 1.2 Key Design Principles

1. **Separation of Concerns**: Control plane manages orchestration, data plane runs workloads
2. **Cloud-Native**: Kubernetes-first with operators and declarative APIs
3. **Event-Driven**: Kafka backbone for CDC, audit logs, and cross-service communication
4. **GitOps**: Infrastructure as Code with Argo CD for continuous deployment
5. **Observability**: Metrics, logs, and traces built-in from day one
6. **Multi-Tenancy**: Strong isolation at network, namespace, and data levels
7. **Idempotency**: All operations designed to be retryable
8. **Immutability**: Infrastructure treated as cattle, not pets

---

## 2. SYSTEM COMPONENTS

### 2.1 Control Plane Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROL PLANE (Global)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   API Gateway (Kong)                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │ Rate Limit │  │    Auth    │  │   Router   │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│       ┌────────────────────┼────────────────────┐              │
│       │                    │                    │              │
│       ▼                    ▼                    ▼              │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐         │
│  │  Auth   │         │ Service │         │ Tenant  │         │
│  │ Service │         │ Service │         │ Service │         │
│  │         │         │         │         │         │         │
│  │Keycloak │         │ Core    │         │  User   │         │
│  │  OIDC   │         │ Logic   │         │   Mgmt  │         │
│  └─────────┘         └─────────┘         └─────────┘         │
│       │                    │                    │              │
│       └────────────────────┼────────────────────┘              │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         PostgreSQL (Control Plane Database)              │   │
│  │    ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │    │  Tenants │  │ Services │  │  Backups │            │   │
│  │    │  Users   │  │ Metrics  │  │   Logs   │            │   │
│  │    └──────────┘  └──────────┘  └──────────┘            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Provisioning Engine                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │ServiceClaim│  │   Helm     │  │   GitOps   │        │   │
│  │  │ Controller │  │  Renderer  │  │  Committer │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Redis (Job Queue & Cache)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Ansible AWX (Day-2 Ops)                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │ Bootstrap  │  │   Tuning   │  │  Upgrades  │        │   │
│  │  │ Playbooks  │  │ Playbooks  │  │  Playbooks │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.1.1 API Gateway (Kong)

**Responsibilities**:
- Request routing to backend services
- Rate limiting per tenant
- JWT validation
- Request/response transformation
- Metrics collection

**Technology**: Kong 3.x with PostgreSQL backend

**Plugins**:
- JWT authentication
- Rate limiting
- Prometheus metrics
- Request transformer
- CORS

#### 2.1.2 Auth Service (Keycloak)

**Responsibilities**:
- User authentication (OAuth 2.0, OIDC)
- Multi-factor authentication
- Social login integration
- Token management
- User federation

**Technology**: Keycloak 22+ with PostgreSQL

**Configuration**:
- Realm per organization
- Client per application
- Role-based access control
- Custom user attributes

#### 2.1.3 Service Management Service

**Responsibilities**:
- CRUD operations for database services
- Service lifecycle management
- Connection information management
- Metrics aggregation
- Backup orchestration

**Technology**: Go with Gin framework

**API Endpoints**:
- `/api/v1/services` - Service CRUD
- `/api/v1/services/{id}/metrics` - Metrics
- `/api/v1/services/{id}/backups` - Backup management
- `/api/v1/services/{id}/restore` - Restore operations
- `/api/v1/services/{id}/scale` - Scaling operations

**Database Schema**: See PRD Section 3.3

#### 2.1.4 Tenant Management Service

**Responsibilities**:
- Organization management
- User management
- RBAC enforcement
- Quota management
- Billing integration

**Technology**: Go with Gin framework

**API Endpoints**:
- `/api/v1/organizations` - Org CRUD
- `/api/v1/organizations/{id}/members` - Member management
- `/api/v1/organizations/{id}/quotas` - Quota management
- `/api/v1/users` - User management

#### 2.1.5 Provisioning Engine

**Responsibilities**:
- Process ServiceClaim requests
- Render Helm charts with tenant values
- Commit to GitOps repository
- Track provisioning status
- Handle rollbacks

**Technology**: Go with Kubernetes client-go

**Components**:
```
┌─────────────────────────────────────────┐
│     ServiceClaim Controller              │
│  ┌───────────────────────────────────┐  │
│  │  1. Watch ServiceClaim CRDs       │  │
│  │  2. Validate request              │  │
│  │  3. Check quotas                  │  │
│  │  4. Generate manifests            │  │
│  │  5. Commit to Git                 │  │
│  │  6. Update status                 │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │      Helm Chart Renderer          │  │
│  │  - Load base chart                │  │
│  │  - Merge tenant values            │  │
│  │  - Template rendering             │  │
│  │  - Validation                     │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │       GitOps Committer            │  │
│  │  - Clone repository               │  │
│  │  - Apply changes                  │  │
│  │  - Commit & push                  │  │
│  │  - Trigger Argo CD sync           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Flow**:
1. API receives service creation request
2. Service Management validates and persists to DB
3. Creates ServiceClaim CRD via Kubernetes API
4. ServiceClaim Controller picks up request
5. Renders Helm chart with tenant-specific values
6. Commits to GitOps repo (e.g., `/tenants/tenant-123/yugabyte.yaml`)
7. Argo CD detects change and syncs to target cluster
8. YugabyteDB Operator provisions resources
9. Status updates propagated back to control plane DB

### 2.2 Data Plane Components (Regional PoP)

```
┌─────────────────────────────────────────────────────────────────┐
│              REGIONAL PoP CLUSTER (Kubernetes)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Ingress Layer (Anycast + GSLB)                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │   NGINX    │  │   Cert     │  │   Network  │        │   │
│  │  │  Ingress   │  │  Manager   │  │   Policy   │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│           ┌────────────────┼────────────────┐                   │
│           │                │                │                   │
│           ▼                ▼                ▼                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  Database   │  │    Event    │  │Observability│           │
│  │   Engines   │  │  Backbone   │  │    Stack    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Database Engines                        │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │         YugabyteDB Cluster (Namespace)           │    │   │
│  │  │  ┌────────┐  ┌────────┐  ┌────────┐            │    │   │
│  │  │  │ Master │  │ Master │  │ Master │            │    │   │
│  │  │  │  Pod   │  │  Pod   │  │  Pod   │            │    │   │
│  │  │  └────────┘  └────────┘  └────────┘            │    │   │
│  │  │  ┌────────┐  ┌────────┐  ┌────────┐            │    │   │
│  │  │  │TServer │  │TServer │  │TServer │            │    │   │
│  │  │  │  Pod   │  │  Pod   │  │  Pod   │            │    │   │
│  │  │  └────────┘  └────────┘  └────────┘            │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │         Vitess Cluster (Namespace)               │    │   │
│  │  │  ┌────────┐  ┌────────┐  ┌────────┐            │    │   │
│  │  │  │VTGate  │  │VTTablet│  │VTTablet│            │    │   │
│  │  │  │  Pod   │  │  Pod   │  │  Pod   │            │    │   │
│  │  │  └────────┘  └────────┘  └────────┘            │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  │  [Similar structure for ScyllaDB, DragonflyDB,           │   │
│  │   Aerospike, MongoDB]                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Event Backbone (Kafka Cluster)                  │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │   │
│  │  │ Broker │  │ Broker │  │ Broker │  │ Broker │        │   │
│  │  │  Pod   │  │  Pod   │  │  Pod   │  │  Pod   │        │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘        │   │
│  │  ┌──────────────┐  ┌──────────────┐                     │   │
│  │  │    Kafka     │  │   Schema     │                     │   │
│  │  │   Connect    │  │  Registry    │                     │   │
│  │  └──────────────┘  └──────────────┘                     │   │
│  │  ┌────────────────────────────────────────────┐         │   │
│  │  │       Debezium Connectors                   │         │   │
│  │  │  - PostgreSQL (YugabyteDB)                 │         │   │
│  │  │  - MySQL (Vitess)                          │         │   │
│  │  │  - MongoDB                                 │         │   │
│  │  │  - ScyllaDB (custom)                       │         │   │
│  │  │  - Aerospike (custom)                      │         │   │
│  │  │  - DragonflyDB (Redis Streams)             │         │   │
│  │  └────────────────────────────────────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Observability Stack                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Prometheus   │  │   Grafana    │  │     Loki     │  │   │
│  │  │   Server     │  │              │  │              │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────────────────────────┐│   │
│  │  │    Tempo     │  │    OpenTelemetry Collector       ││   │
│  │  │              │  │                                    ││   │
│  │  └──────────────┘  └──────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Database Operators                           │   │
│  │  - YugabyteDB Operator                                   │   │
│  │  - Vitess Operator                                        │   │
│  │  - Scylla Operator                                        │   │
│  │  - DragonflyDB Operator                                   │   │
│  │  - Aerospike Operator                                     │   │
│  │  - MongoDB Operator                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2.1 Database Operators

Each database engine has a dedicated Kubernetes operator responsible for:

**YugabyteDB Operator**:
- Universe creation and configuration
- Master and TServer pod management
- Automated scaling
- Backup and restore orchestration
- xCluster replication setup
- TLS certificate management

**Vitess Operator**:
- Keyspace and shard management
- VTGate and VTTablet deployment
- Automated resharding
- Backup via xtrabackup
- Cross-region replica configuration

**ScyllaDB Operator**:
- Rack-aware pod placement
- Kernel parameter tuning
- Snapshot management
- Multi-DC replication
- Repair scheduling

**DragonflyDB Operator**:
- Cluster creation
- Replication configuration
- Snapshot scheduling
- Active-active setup

**Aerospike Operator**:
- Namespace configuration
- XDR setup for multi-region
- asbackup integration
- Storage engine configuration

**MongoDB Operator**:
- Replica set deployment
- Sharded cluster setup
- PITR configuration
- External tool integration

#### 2.2.2 Kafka Event Backbone

**Components**:

**Kafka Brokers (KRaft mode)**:
- 5 brokers per PoP
- 24-32 cores, 128-256GB RAM each
- NVMe storage for logs
- Replication factor 3
- min.insync.replicas = 2

**Kafka Connect**:
- 3-5 workers per PoP
- Debezium connectors pre-configured
- Distributed mode for HA
- Schema Registry integration

**Schema Registry**:
- Avro, JSON, Protobuf support
- Schema evolution rules
- Compatibility checking
- Clustered deployment

**Topic Design**:
```
dbaas.cdc.yugabyte.{tenant-id}.{table-name}
dbaas.cdc.vitess.{tenant-id}.{keyspace}.{table-name}
dbaas.cdc.scylla.{tenant-id}.{keyspace}.{table-name}
dbaas.cdc.mongodb.{tenant-id}.{database}.{collection}
dbaas.cdc.aerospike.{tenant-id}.{namespace}.{set}
dbaas.cdc.dragonfly.{tenant-id}.{db-index}

dbaas.audit.{tenant-id}
dbaas.metrics.{tenant-id}
dbaas.alerts.{tenant-id}
```

**Retention**:
- CDC topics: 7 days
- Audit topics: 90 days (then archive to object storage)
- Metrics topics: 3 days
- Alerts topics: 30 days

#### 2.2.3 Observability Stack

**Prometheus**:
- Scrape interval: 30s
- Retention: 15 days local, unlimited in Thanos
- Alertmanager for alert routing
- Per-engine exporters
- Custom recording rules for SLIs

**Grafana**:
- Org per tenant
- Folder per engine
- Pre-built dashboards
- Alert annotations
- Plugin ecosystem

**Loki**:
- Retention: 30 days
- Index in DynamoDB/S3
- Multi-tenancy via X-Scope-OrgID
- LogQL queries

**Tempo**:
- Trace retention: 7 days
- OTLP ingestion
- Tempo Query frontend
- Integration with Grafana

**OpenTelemetry Collector**:
- Deployed as DaemonSet
- Collects traces, metrics, logs
- Processors for sampling
- Exporters to Prometheus, Loki, Tempo

---

## 3. DATA FLOW DIAGRAMS

### 3.1 Service Provisioning Flow

```
User                API Gateway        Service Service       PostgreSQL        Provisioning Engine     Git Repo        Argo CD         K8s Operator
 │                       │                  │                    │                      │                  │              │                 │
 │  POST /services      │                  │                    │                      │                  │              │                 │
 ├──────────────────────>│                  │                    │                      │                  │              │                 │
 │                       │  JWT Validate    │                    │                      │                  │              │                 │
 │                       ├─────────────────>│                    │                      │                  │              │                 │
 │                       │                  │  Create Record     │                      │                  │              │                 │
 │                       │                  ├───────────────────>│                      │                  │              │                 │
 │                       │                  │                    │  INSERT              │                  │              │                 │
 │                       │                  │                    ├─────────>            │                  │              │                 │
 │                       │                  │                    │  Success             │                  │              │                 │
 │                       │                  │<───────────────────┤<─────────            │                  │              │                 │
 │                       │                  │  Create ServiceClaim CRD                  │                  │              │                 │
 │                       │                  ├──────────────────────────────────────────>│                  │              │                 │
 │   202 Accepted        │                  │                    │                      │                  │              │                 │
 │<──────────────────────┤                  │                    │                      │  Watch CRD       │              │                 │
 │   { id, status:       │                  │                    │                      │  Event           │              │                 │
 │     provisioning }    │                  │                    │                      ├─────────>        │              │                 │
 │                       │                  │                    │                      │  Render Helm     │              │                 │
 │                       │                  │                    │                      ├─────────>        │              │                 │
 │                       │                  │                    │                      │  Commit Manifest │              │                 │
 │                       │                  │                    │                      ├─────────────────>│              │                 │
 │                       │                  │                    │                      │                  │  Detect      │                 │
 │                       │                  │                    │                      │                  │  Change      │                 │
 │                       │                  │                    │                      │                  ├─────────>    │                 │
 │                       │                  │                    │                      │                  │  Sync        │                 │
 │                       │                  │                    │                      │                  │              ├────────────────>│
 │                       │                  │                    │                      │                  │              │  Provision      │
 │                       │                  │                    │                      │                  │              │  Resources      │
 │                       │                  │                    │                      │                  │              │<────────────────┤
 │                       │                  │                    │  UPDATE status       │                  │              │  Status Ready   │
 │                       │                  │                    │<─────────────────────┼──────────────────┼──────────────┼─────────────────┤
 │  GET /services/{id}   │                  │                    │                      │                  │              │                 │
 ├──────────────────────>│                  │  Query Status      │                      │                  │              │                 │
 │                       │                  ├───────────────────>│                      │                  │              │                 │
 │   200 OK              │                  │  Return Active     │                      │                  │              │                 │
 │<──────────────────────┤<─────────────────┤<───────────────────┤                      │                  │              │                 │
 │   { status: active,   │                  │                    │                      │                  │              │                 │
 │     connection: {...} }                  │                    │                      │                  │              │                 │
```

### 3.2 CDC Data Flow

```
Database          Debezium          Kafka            Kafka            Target DB /       Analytics
(YugabyteDB)      Connector         Broker           Consumer         Cache             Pipeline
    │                 │                │                │                │                  │
    │  Write Data     │                │                │                │                  │
    │<────────────    │                │                │                │                  │
    │                 │                │                │                │                  │
    │  WAL Event      │                │                │                │                  │
    ├────────────────>│                │                │                │                  │
    │                 │  Transform     │                │                │                  │
    │                 │  to Kafka Msg  │                │                │                  │
    │                 ├───────────────>│                │                │                  │
    │                 │                │  Replicate     │                │                  │
    │                 │                ├───────────────>│                │                  │
    │                 │                │                │  Subscribe     │                  │
    │                 │                │                ├───────────────>│                  │
    │                 │                │                │  Write to      │                  │
    │                 │                │                │  Cache         │                  │
    │                 │                │                │<───────────────┤                  │
    │                 │                │                │                │  Stream to       │
    │                 │                │                │                │  Data Lake       │
    │                 │                │                │<───────────────┼─────────────────>│
```

### 3.3 Backup & Restore Flow

```
Scheduler         Backup Service    Database         Object Storage    Kafka Audit
    │                  │                │                  │                │
    │  Cron Trigger    │                │                  │                │
    ├─────────────────>│                │                  │                │
    │                  │  Initiate      │                  │                │
    │                  │  Backup        │                  │                │
    │                  ├───────────────>│                  │                │
    │                  │                │  Snapshot        │                │
    │                  │                │  Created         │                │
    │                  │<───────────────┤                  │                │
    │                  │  Stream Data   │                  │                │
    │                  ├───────────────────────────────────>│                │
    │                  │                │                  │  Store         │
    │                  │                │                  ├───────>        │
    │                  │  Log Event     │                  │                │
    │                  ├───────────────────────────────────────────────────>│
    │                  │  Success       │                  │                │
    │                  │  Response      │                  │                │
    │<─────────────────┤                │                  │                │
```

---

## 4. SECURITY ARCHITECTURE

### 4.1 Network Security

```
┌────────────────────────────────────────────────────────────────┐
│                       Internet / Public                         │
└────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   DDoS Protection  │
                    │   Cloudflare       │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Anycast IP       │
                    │   GSLB Routing     │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Lagos PoP   │      │  Ashburn PoP │      │Frankfurt PoP │
│              │      │              │      │              │
│  ┌────────┐  │      │  ┌────────┐  │      │  ┌────────┐  │
│  │ WAF +  │  │      │  │ WAF +  │  │      │  │ WAF +  │  │
│  │ Ingress│  │      │  │ Ingress│  │      │  │ Ingress│  │
│  └───┬────┘  │      │  └───┬────┘  │      │  └───┬────┘  │
│      │       │      │      │       │      │      │       │
│  ┌───┴────┐  │      │  ┌───┴────┐  │      │  ┌───┴────┐  │
│  │ VPC    │  │      │  │ VPC    │  │      │  │ VPC    │  │
│  │10.0.0.0│  │      │  │10.1.0.0│  │      │  │10.2.0.0│  │
│  │  /16   │  │      │  │  /16   │  │      │  │  /16   │  │
│  │        │  │      │  │        │  │      │  │        │  │
│  │ Tenant │  │      │  │ Tenant │  │      │  │ Tenant │  │
│  │ Subnets│  │      │  │ Subnets│  │      │  │ Subnets│  │
│  └────────┘  │      │  └────────┘  │      │  └────────┘  │
└──────────────┘      └──────────────┘      └──────────────┘
```

**Layers**:
1. **DDoS Protection**: Cloudflare or AWS Shield
2. **WAF**: ModSecurity rules, OWASP Top 10 protection
3. **TLS Termination**: TLS 1.3 with strong cipher suites
4. **Network Policies**: Calico CNI with pod-to-pod rules
5. **VPC Isolation**: Per-tenant VPCs or namespaces with NetworkPolicies

### 4.2 Identity & Access Management

```
┌─────────────────────────────────────────────────────────────────┐
│                         Keycloak OIDC                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Realm: dbaas-platform                                     │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │ │
│  │  │ Org: Acme  │  │ Org: TechCo│  │ Org: StartX│          │ │
│  │  │ - admin@   │  │ - user@    │  │ - dev@     │          │ │
│  │  │ - dev@     │  │            │  │            │          │ │
│  │  └────────────┘  └────────────┘  └────────────┘          │ │
│  │                                                            │ │
│  │  Roles:                                                    │ │
│  │  - org-owner                                               │ │
│  │  - org-admin                                               │ │
│  │  - org-member                                              │ │
│  │  - service-admin                                           │ │
│  │  - service-viewer                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ JWT Token
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  JWT Validation                                            │ │
│  │  - Signature check                                         │ │
│  │  - Expiration check                                        │ │
│  │  - Scope/role extraction                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  RBAC Enforcement                                          │ │
│  │  - Org membership check                                    │ │
│  │  - Resource ownership check                                │ │
│  │  - Action permission check                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Roles & Permissions**:

| Role | Permissions |
|------|------------|
| org-owner | All organization operations, billing |
| org-admin | Manage users, services, view metrics |
| org-member | View services, view metrics |
| service-admin | Full service lifecycle, backups, scaling |
| service-viewer | Read-only access to service details |

### 4.3 Data Encryption

**At Rest**:
- Kubernetes Secrets: Sealed Secrets or Vault
- Database storage: Engine-native encryption with KMS keys
- Backups: AES-256 encryption before upload to S3
- Kafka: Disk encryption on brokers

**In Transit**:
- Client ↔ API Gateway: TLS 1.3
- API Gateway ↔ Backend Services: mTLS (Istio)
- Database connections: TLS enforced
- Kafka: TLS for broker communication
- Kubernetes API: TLS

**Key Management**:
- AWS KMS, Google Cloud KMS, or HashiCorp Vault
- Automated key rotation
- Per-tenant keys for isolation
- Hardware Security Module (HSM) for production

---

## 5. SCALABILITY CONSIDERATIONS

### 5.1 Horizontal Scaling

**Control Plane**:
- API Gateway: Stateless, scale to N instances
- Service/Tenant Services: Stateless, scale to N instances
- PostgreSQL: Read replicas for read-heavy operations
- Redis: Cluster mode for high throughput

**Data Plane**:
- Database Engines: Native horizontal scaling (sharding, replicas)
- Kafka: Add brokers dynamically
- Observability: Thanos/Mimir for Prometheus, Loki distributed mode

### 5.2 Vertical Scaling

- Database nodes: Support for larger instance types
- Resource quotas: Configurable per tenant
- Storage expansion: Online volume resizing

### 5.3 Multi-Region Strategy

**Active-Passive Control Plane**:
- Primary region: All writes
- Secondary region: Read replicas, failover ready
- PostgreSQL replication with automatic failover

**Active-Active Data Plane**:
- Each PoP independently serves tenants
- Cross-region replication per database engine
- Anycast routing for client traffic

### 5.4 Performance Optimization

**Caching**:
- Redis for API responses (service lists, metadata)
- CDN for static assets (frontend, images)
- Database query result caching

**Connection Pooling**:
- PgBouncer for PostgreSQL control plane
- Application-level pools for API services

**Rate Limiting**:
- Per-tenant API rate limits
- Per-service resource quotas

---

## 6. DISASTER RECOVERY

### 6.1 Backup Strategy

**Control Plane**:
- PostgreSQL: Continuous archiving with WAL shipping
- Daily full backups, hourly incrementals
- Cross-region backup replication
- Retention: 30 days

**Data Plane Databases**:
- Engine-specific backup strategies
- Configurable schedules per service
- Immutable object storage (S3 Object Lock)
- PITR where supported

### 6.2 Recovery Procedures

**RTO/RPO Targets**:
- Control Plane: RTO 15 min, RPO 5 min
- Data Plane (Clustered): RTO 10 min, RPO 1 min
- Data Plane (Global): RTO 5 min, RPO 0 min (active-active)

**Failure Scenarios**:

| Failure | Detection | Recovery |
|---------|-----------|----------|
| API pod crash | Health check failure | Kubernetes restarts pod (< 1 min) |
| Database node failure | Operator health check | Automatic failover to replica (< 5 min) |
| PoP outage | GSLB health check | Route traffic to other PoPs (< 2 min) |
| Region failure | Manual/automated | Promote secondary control plane (< 15 min) |
| Data corruption | Backup validation | Restore from last good backup (< 30 min) |

### 6.3 Testing

- **Chaos Engineering**: Monthly GameDay exercises
- **Backup Restoration**: Weekly automated restore tests
- **DR Drills**: Quarterly full DR simulation
- **Automated Testing**: Continuous integration tests

---

## 7. MONITORING & OBSERVABILITY ARCHITECTURE

### 7.1 Metrics Architecture

```
┌───────────────────────────────────────────────────────────────┐
│               Application / Database Metrics                   │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │YugDB │  │Vitess│  │Scylla│  │ API  │  │ Kafka│          │
│  │Export│  │Export│  │Export│  │Export│  │Export│          │
│  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘          │
└──────┼─────────┼─────────┼─────────┼─────────┼──────────────┘
       │         │         │         │         │
       └─────────┴─────────┴─────────┴─────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│            OpenTelemetry Collector (DaemonSet)                 │
│  - Scraping                                                    │
│  - Processing (sampling, batching)                             │
│  - Routing                                                     │
└─────────────────────────┬─────────────────────────────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│Prometheus│      │  Thanos  │      │ Platform │
│  Server  │      │  /Mimir  │      │ Metrics  │
│          │      │ (Long-   │      │   API    │
│ 15 days  │      │  term)   │      │          │
└──────────┘      └──────────┘      └──────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   Grafana    │
                  │  Dashboards  │
                  └──────────────┘
```

### 7.2 Logging Architecture

```
┌───────────────────────────────────────────────────────────────┐
│              Application / Database Logs                       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ API  │  │YugDB │  │Vitess│  │Nginx │  │ K8s  │          │
│  │ Logs │  │ Logs │  │ Logs │  │ Logs │  │ Logs │          │
│  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘          │
└──────┼─────────┼─────────┼─────────┼─────────┼──────────────┘
       │         │         │         │         │
       └─────────┴─────────┴─────────┴─────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│               Promtail / Fluent Bit (DaemonSet)                │
│  - Log tailing                                                 │
│  - Parsing & labeling                                          │
│  - Enrichment (pod, namespace, tenant)                         │
└─────────────────────────┬─────────────────────────────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│   Loki   │      │  Kafka   │      │  Object  │
│ (30 days)│      │  (Audit) │      │ Storage  │
│          │      │ (90 days)│      │ (Archive)│
└──────────┘      └──────────┘      └──────────┘
       │                                   
       └───────────────────┐              
                           │              
                           ▼              
                   ┌──────────────┐
                   │   Grafana    │
                   │   LogQL      │
                   └──────────────┘
```

### 7.3 Tracing Architecture

```
┌───────────────────────────────────────────────────────────────┐
│              Application Instrumentation                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  API Service │  │Service Mgmt  │  │ Provisioning │       │
│  │ (OTLP spans) │  │ (OTLP spans) │  │  (OTLP spans)│       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼──────────────────┼──────────────────┼───────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│        OpenTelemetry Collector (Trace Pipeline)                │
│  - Span batching                                               │
│  - Sampling (tail-based)                                       │
│  - Context propagation                                         │
└─────────────────────────┬─────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────────┐
│                      Tempo                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Ingester    │  │  Compactor   │  │   Querier    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│              S3 Backend (7 days retention)                     │
└─────────────────────────┬─────────────────────────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   Grafana    │
                  │  Trace View  │
                  └──────────────┘
```

---

## 8. DEPLOYMENT ARCHITECTURE

### 8.1 GitOps Repository Structure

```
dbaas-gitops/
├── README.md
├── .gitlab-ci.yml (or .github/workflows/)
├── base/
│   ├── crds/
│   │   ├── serviceclaim.yaml
│   │   └── databasebackup.yaml
│   ├── operators/
│   │   ├── yugabyte-operator/
│   │   │   ├── kustomization.yaml
│   │   │   └── operator.yaml
│   │   ├── vitess-operator/
│   │   ├── scylla-operator/
│   │   ├── dragonfly-operator/
│   │   ├── aerospike-operator/
│   │   └── mongodb-operator/
│   ├── observability/
│   │   ├── prometheus/
│   │   ├── grafana/
│   │   ├── loki/
│   │   ├── tempo/
│   │   └── opentelemetry/
│   ├── kafka/
│   │   ├── brokers/
│   │   ├── connect/
│   │   └── schema-registry/
│   └── infrastructure/
│       ├── cert-manager/
│       ├── ingress-nginx/
│       ├── calico/
│       └── sealed-secrets/
├── overlays/
│   ├── lagos/
│   │   ├── kustomization.yaml
│   │   ├── values.yaml
│   │   └── patches/
│   ├── johannesburg/
│   ├── frankfurt/
│   ├── ashburn/
│   └── singapore/
├── tenants/
│   ├── tenant-001/
│   │   ├── yugabyte-prod.yaml
│   │   ├── dragonfly-cache.yaml
│   │   └── backups/
│   ├── tenant-002/
│   └── ...
└── argocd/
    ├── applications/
    │   ├── lagos-base.yaml
    │   ├── lagos-operators.yaml
    │   ├── lagos-kafka.yaml
    │   ├── lagos-observability.yaml
    │   └── tenants.yaml
    └── app-of-apps.yaml
```

### 8.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    Git Repository                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Developer commits                                     │ │
│  │  - Helm chart changes                                  │ │
│  │  - Operator configurations                             │ │
│  │  - ServiceClaim manifests                              │ │
│  └────────────────────┬───────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               CI Pipeline (GitLab/GitHub)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 1: Validate                                     │ │
│  │  - Helm lint                                           │ │
│  │  - kubeval / kubeconform                               │ │
│  │  - YAML lint                                           │ │
│  │  - Policy checks (OPA/Kyverno)                         │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 2: Build                                        │ │
│  │  - Render Helm charts                                  │ │
│  │  - Kustomize build                                     │ │
│  │  - Generate manifests                                  │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 3: Test                                         │ │
│  │  - Integration tests                                   │ │
│  │  - Operator tests                                      │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 4: Deploy                                       │ │
│  │  - Merge to main                                       │ │
│  │  - Tag release                                         │ │
│  └────────────────────┬───────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Argo CD                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Auto-sync enabled                                     │ │
│  │  - Detect changes in Git                               │ │
│  │  - Apply to target clusters                            │ │
│  │  - Health checks                                       │ │
│  │  - Rollback on failure                                 │ │
│  └────────────────────┬───────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Kubernetes Clusters (PoPs)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Operators reconcile                                   │ │
│  │  - YugabyteDB, Vitess, Scylla, etc.                    │ │
│  │  - Provision resources                                 │ │
│  │  - Update status                                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. TECHNOLOGY DECISIONS

### 9.1 Control Plane Backend

**Decision**: Go with Gin framework

**Rationale**:
- High performance and low latency
- Excellent Kubernetes client libraries (client-go)
- Strong typing and compile-time checks
- Native concurrency with goroutines
- Large ecosystem for cloud-native applications

**Alternatives Considered**:
- Python/FastAPI: Slower performance, but easier to prototype
- Node.js: Good performance but less mature Kubernetes ecosystem
- Rust: Highest performance but steeper learning curve

### 9.2 Control Plane Database

**Decision**: PostgreSQL 15+

**Rationale**:
- ACID compliance for critical data
- Rich feature set (JSON, full-text search, time-series)
- Strong community and tooling
- Excellent replication options
- Native support for high availability

**Alternatives Considered**:
- MySQL: Fewer advanced features
- MongoDB: Not suitable for relational control plane data
- CockroachDB: Overkill for control plane scale

### 9.3 Frontend Framework

**Decision**: React 18+ with TypeScript

**Rationale**:
- Large ecosystem and community
- Excellent TypeScript support
- Rich component libraries (Material-UI, Ant Design)
- Good performance with hooks and concurrent mode
- Strong tooling (Next.js, Vite)

**Alternatives Considered**:
- Vue.js: Simpler but smaller ecosystem
- Angular: More opinionated, steeper learning curve
- Svelte: Less mature ecosystem

### 9.4 Messaging & Events

**Decision**: Apache Kafka with KRaft

**Rationale**:
- Industry standard for event streaming
- High throughput and low latency
- Excellent CDC ecosystem (Debezium)
- KRaft removes Zookeeper dependency
- Strong durability guarantees

**Alternatives Considered**:
- NATS: Lighter weight but less rich ecosystem
- RabbitMQ: Better for traditional messaging, not streams
- Pulsar: More complex, smaller community

### 9.5 Observability Stack

**Decision**: Prometheus + Grafana + Loki + Tempo

**Rationale**:
- Industry standard for Kubernetes monitoring
- Excellent integration with database exporters
- Grafana provides unified interface
- Loki efficient log aggregation
- Tempo for distributed tracing

**Alternatives Considered**:
- Datadog: Expensive at scale, SaaS only
- Elastic Stack: More resource intensive
- New Relic: Expensive, less Kubernetes-native

### 9.6 GitOps Tool

**Decision**: Argo CD

**Rationale**:
- Kubernetes-native with CRDs
- Excellent multi-cluster support
- Web UI for visibility
- Strong RBAC and security
- Active community

**Alternatives Considered**:
- Flux: More GitOps-purist, but less UI
- Jenkins X: More opinionated, tied to Jenkins

---

## 10. APPENDICES

### A. Glossary

- **PoP**: Point of Presence - A regional datacenter location
- **CDC**: Change Data Capture - Tracking database changes
- **CRD**: Custom Resource Definition - Kubernetes API extension
- **OTLP**: OpenTelemetry Protocol
- **KRaft**: Kafka Raft - Kafka without Zookeeper
- **RF**: Replication Factor
- **HA**: High Availability
- **DR**: Disaster Recovery
- **PITR**: Point-in-Time Recovery

### B. Reference Architecture Diagrams

See sections above for detailed component diagrams.

### C. External Dependencies

- **Cloud Providers**: AWS, GCP, or colocation (Equinix, Digital Realty)
- **DNS**: Cloudflare or Route53
- **Object Storage**: S3 or compatible (MinIO, Ceph)
- **KMS**: AWS KMS, GCP KMS, or HashiCorp Vault
- **CDN**: Cloudflare or Fastly

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-24  
**Maintained By**: Platform Architecture Team
