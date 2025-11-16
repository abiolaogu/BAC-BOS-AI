# Developer Setup Guide

**Version**: 1.0

---

## Prerequisites

- **Git**: Version control
- **Node.js** 18+ and npm
- **Go** 1.21+
- **Docker** and Docker Compose
- **PostgreSQL** 15 (or use Docker)
- **Redis** 7 (or use Docker)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/nexus-office-suite.git
cd nexus-office-suite
```

### 2. Start Infrastructure

```bash
# Start database, cache, and storage
docker compose up -d postgres redis minio

# Verify services are running
docker compose ps
```

### 3. Install Dependencies

**Backend (Go services)**:
```bash
cd backend/writer-service
go mod download
go mod vendor
```

**Backend (Node.js services)**:
```bash
cd backend/auth-service
npm install
```

**Frontend**:
```bash
cd frontend/hub-app
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with local development settings
```

### 5. Run Database Migrations

```bash
cd backend/writer-service
make migrate-up
```

### 6. Start Services

**Terminal 1 - API Gateway**:
```bash
cd backend/api-gateway
npm run dev
```

**Terminal 2 - Writer Service**:
```bash
cd backend/writer-service
go run main.go
# or: make run
```

**Terminal 3 - Frontend**:
```bash
cd frontend/hub-app
npm run dev
```

### 7. Access Application

- **Hub**: http://localhost:3000
- **API**: http://localhost:8000
- **Writer**: http://localhost:3001

---

## Development Tools

### VS Code Extensions

- Go (golang.go)
- ESLint
- Prettier
- Docker
- GitLens

### Debugging

**VS Code launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Go Service",
      "type": "go",
      "request": "launch",
      "mode": "debug",
      "program": "${workspaceFolder}/backend/writer-service/main.go"
    },
    {
      "name": "Debug Node.js Service",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend/auth-service"
    }
  ]
}
```

### Hot Reload

- **Go**: Use `air` for hot reload
- **Node.js**: `nodemon` included in dev scripts
- **Next.js**: Built-in fast refresh

---

## Testing Locally

```bash
# Backend tests
cd backend/writer-service
go test ./...

# Frontend tests
cd frontend/hub-app
npm test

# E2E tests
npm run test:e2e
```

---

**Next**: [Contributing →](02-contributing.md)
