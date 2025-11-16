# NEXUS Platform Architecture

**Version**: 1.0
**Last Updated**: November 2025

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  Web (Next.js) │ Mobile (Flutter) │ Desktop (Electron)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   API Gateway (Kong)                         │
│  Authentication │ Rate Limiting │ Routing │ Load Balancing  │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐  ┌──────▼───────┐  ┌─────▼──────┐
│ Office Suite   │  │Collaboration │  │  Platform  │
│   Services     │  │   Services   │  │  Services  │
├────────────────┤  ├──────────────┤  ├────────────┤
│ Writer         │  │ Meet         │  │ Auth       │
│ Sheets         │  │ Chat         │  │ Notification│
│ Slides         │  │ Mail         │  │ Hub        │
│ Drive          │  │ Calendar     │  │            │
└───────┬────────┘  └──────┬───────┘  └─────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Data Layer                              │
│  PostgreSQL │ Redis │ MongoDB │ MinIO/S3 │ Kafka            │
└─────────────────────────────────────────────────────────────┘
```

---

## Microservices Design

### Services Overview

| Service | Purpose | Tech Stack | Port |
|---------|---------|------------|------|
| API Gateway | Request routing, auth | Go/Kong | 8000 |
| Auth Service | Authentication, SSO | Go | 3001 |
| Writer Service | Document management | Go | 8091 |
| Sheets Service | Spreadsheet engine | Go | 8092 |
| Slides Service | Presentation service | Go | 8093 |
| Drive Service | File storage | Go | 8096 |
| Meet Service | Video conferencing | Node.js | 8098 |
| Notification Service | Real-time notifications | Node.js | 3007 |
| Collaboration Service | Presence, OT | Node.js | 3008 |

---

## Data Flow

### Document Creation Flow

```
Client → API Gateway → Writer Service → PostgreSQL
                                     ↓
                                   Redis (cache)
                                     ↓
                                Kafka (event)
                                     ↓
                        Notification Service → WebSocket → Clients
```

### Real-Time Collaboration Flow

```
User A edits → WebSocket → Collaboration Service
                                    ↓
                          Operational Transform (OT)
                                    ↓
                              Broadcast to all users
                                    ↓
                        User B, C, D receive changes
```

---

## Technology Stack

### Backend
- **Languages**: Go 1.21, Node.js 20
- **Frameworks**: Gin (Go), Express (Node.js)
- **Databases**: PostgreSQL 15, MongoDB 6
- **Cache**: Redis 7
- **Message Queue**: Kafka 3.5
- **Object Storage**: MinIO (S3-compatible)

### Frontend
- **Framework**: Next.js 14, React 18
- **State**: Zustand, TanStack Query
- **Styling**: Tailwind CSS, Material-UI
- **Real-time**: Socket.IO, WebRTC

### Infrastructure
- **Container**: Docker, Kubernetes
- **Orchestration**: Kubernetes 1.27+
- **Service Mesh**: Istio
- **API Gateway**: Kong
- **Monitoring**: Prometheus, Grafana, Jaeger

---

## Security Architecture

### Authentication Flow

```
1. User Login → Auth Service
2. Validate credentials
3. Generate JWT token
4. Return token to client
5. Client includes token in requests
6. API Gateway validates token
7. Forward request to service
```

### Authorization Model

- **Role-Based Access Control (RBAC)**
- **Resource-Based Permissions**
- **Tenant Isolation** (schema-based)

### Encryption

- **In Transit**: TLS 1.3
- **At Rest**: AES-256
- **Database**: Transparent Data Encryption (TDE)
- **End-to-End**: Video calls (WebRTC)

---

**Next**: [API Reference →](02-api-reference.md)
