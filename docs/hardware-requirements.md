# Hardware Requirements -- BAC-BOS-AI Platform

## 1. Development Environment

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores (x86_64 or ARM64) | 8+ cores |
| RAM | 16 GB | 32 GB |
| Storage | 50 GB SSD | 100 GB NVMe SSD |
| Network | 100 Mbps | 1 Gbps |
| OS | macOS 13+, Ubuntu 22.04+, Windows 11 with WSL2 | macOS 14+ / Ubuntu 24.04 |

**Required Software**: Docker 24+ (with 8GB+ allocated), Docker Compose v2, Go 1.21+, Python 3.11+, Node.js 20+, kubectl, Helm 3.12+

## 2. Staging Environment (Single Region)

### 2.1 Kubernetes Cluster
| Node Type | Count | CPU | RAM | Storage | Purpose |
|-----------|-------|-----|-----|---------|---------|
| Control Plane | 3 | 4 vCPU | 8 GB | 100 GB SSD | API server, etcd, scheduler |
| Worker (General) | 3 | 8 vCPU | 32 GB | 200 GB SSD | Business services, office suite |
| Worker (Data) | 2 | 8 vCPU | 64 GB | 500 GB NVMe | PostgreSQL, Redis, Redpanda |
| Worker (Storage) | 1 | 4 vCPU | 16 GB | 2 TB HDD | MinIO object storage |
| Worker (Monitoring) | 1 | 4 vCPU | 16 GB | 200 GB SSD | Prometheus, Grafana |

**Total Staging**: 10 nodes, 56 vCPU, 224 GB RAM, ~3.7 TB storage

## 3. Production Environment (Per Region/PoP)

### 3.1 Kubernetes Cluster
| Node Type | Count | CPU | RAM | Storage | Purpose |
|-----------|-------|-----|-----|---------|---------|
| Control Plane | 3 | 8 vCPU | 16 GB | 200 GB NVMe | K8s control plane (HA) |
| Worker (App) | 4 | 16 vCPU | 64 GB | 200 GB NVMe | Business and office suite services |
| Worker (AI/ML) | 2 | 16 vCPU | 128 GB | 500 GB NVMe | AI service, MCP orchestrator |
| Worker (Data) | 3 | 16 vCPU | 128 GB | 1 TB NVMe | YugabyteDB / PostgreSQL |
| Worker (Cache) | 1 | 8 vCPU | 64 GB | 100 GB SSD | DragonflyDB / Redis |
| Worker (Streaming) | 3 | 8 vCPU | 32 GB | 500 GB NVMe | Kafka/Redpanda brokers |
| Worker (Search) | 2 | 8 vCPU | 64 GB | 500 GB NVMe | Elasticsearch, ClickHouse |
| Worker (Storage) | 2 | 8 vCPU | 32 GB | 4 TB HDD | MinIO (erasure coding) |
| Worker (Monitoring) | 2 | 8 vCPU | 32 GB | 500 GB SSD | Prometheus, Grafana, Loki |

**Total Per Region**: 22 nodes, 264 vCPU, 1,312 GB RAM, ~13 TB storage

### 3.2 GPU Requirements (RunPod or Dedicated)
| Workload | GPU Type | vRAM | Count | Usage |
|----------|----------|------|-------|-------|
| AI Inference | NVIDIA L40S | 48 GB | 2 | LLM serving, embeddings |
| Transcoding | NVIDIA A100 | 80 GB | 1 (on-demand) | Video/media processing |
| Training | NVIDIA H100 | 80 GB | 0 (on-demand) | Fine-tuning custom models |

## 4. Multi-Region Production (5 PoPs)

| Region | Nodes | vCPU | RAM | Storage |
|--------|-------|------|-----|---------|
| Lagos, Nigeria | 22 | 264 | 1,312 GB | 13 TB |
| Johannesburg, SA | 22 | 264 | 1,312 GB | 13 TB |
| Frankfurt, Germany | 22 | 264 | 1,312 GB | 13 TB |
| Ashburn, US | 22 | 264 | 1,312 GB | 13 TB |
| Singapore | 22 | 264 | 1,312 GB | 13 TB |
| **Global Total** | **110** | **1,320** | **6,560 GB** | **65 TB** |

## 5. Network Requirements

| Requirement | Staging | Production (per PoP) |
|-------------|---------|---------------------|
| Bandwidth (Internet) | 1 Gbps | 10 Gbps |
| Bandwidth (Internal) | 10 Gbps | 25 Gbps |
| Latency (intra-cluster) | < 1ms | < 0.5ms |
| Latency (inter-region) | N/A | < 100ms |
| Load balancer | Software (MetalLB) | Hardware + Anycast |
| DDoS protection | Basic | Enterprise WAF |

## 6. Estimated Monthly Costs

| Environment | Cloud (AWS/GCP) | Bare Metal | RunPod (GPU) |
|-------------|----------------|-----------|-------------|
| Development | $0 (local) | $0 (local) | $0 |
| Staging | $3,000-5,000 | $2,000-3,000 | $200 |
| Production (1 PoP) | $25,000-40,000 | $15,000-20,000 | $500-1,000 |
| Production (5 PoPs) | $125,000-200,000 | $75,000-100,000 | $2,500-5,000 |

---

*Document version: 1.0 | Last updated: 2026-02-17*
