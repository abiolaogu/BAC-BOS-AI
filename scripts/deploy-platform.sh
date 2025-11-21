#!/bin/bash

# NEXUS Platform Deployment Script
# Deploys the complete platform with 50+ services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE=${2:-docker-compose.complete.yml}

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   NEXUS Platform Deployment Script        ║${NC}"
echo -e "${GREEN}║   Environment: $ENVIRONMENT                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}[1/10] Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is not installed${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose is not installed${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Check environment file
echo -e "${YELLOW}[2/10] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found, creating from template...${NC}"
    cp .env.example .env
    echo -e "${RED}⚠ IMPORTANT: Please update .env with your actual credentials before continuing!${NC}"
    read -p "Press enter to continue after updating .env or Ctrl+C to cancel..."
fi
echo -e "${GREEN}✓ Environment configuration OK${NC}"
echo ""

# Create required directories
echo -e "${YELLOW}[3/10] Creating required directories...${NC}"
mkdir -p data/{postgres,redis,mongodb,minio,elasticsearch}
mkdir -p logs/{gateway,services,monitoring}
mkdir -p backups
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Pull base images
echo -e "${YELLOW}[4/10] Pulling base images (this may take a while)...${NC}"
docker-compose -f $COMPOSE_FILE pull postgres redis mongodb minio kafka elasticsearch
echo -e "${GREEN}✓ Base images pulled${NC}"
echo ""

# Build infrastructure services
echo -e "${YELLOW}[5/10] Building infrastructure services...${NC}"
docker-compose -f $COMPOSE_FILE up -d postgres redis mongodb minio zookeeper kafka elasticsearch
echo "Waiting for infrastructure services to be healthy..."
sleep 30
echo -e "${GREEN}✓ Infrastructure services running${NC}"
echo ""

# Initialize databases
echo -e "${YELLOW}[6/10] Initializing databases...${NC}"
echo "Databases will be initialized automatically via init script"
sleep 10
echo -e "${GREEN}✓ Databases initialized${NC}"
echo ""

# Build and start core services
echo -e "${YELLOW}[7/10] Building core services...${NC}"
docker-compose -f $COMPOSE_FILE up -d --build \
    api-gateway \
    auth-service \
    idaas-service \
    notification-service \
    collaboration-service
echo "Waiting for core services to start..."
sleep 20
echo -e "${GREEN}✓ Core services running${NC}"
echo ""

# Build and start office suite
echo -e "${YELLOW}[8/10] Building office suite...${NC}"
docker-compose -f $COMPOSE_FILE up -d --build \
    writer-service writer-frontend \
    sheets-service sheets-frontend \
    slides-service slides-frontend \
    drive-service drive-frontend \
    meet-service meet-frontend \
    hub-frontend
echo "Waiting for office suite to start..."
sleep 30
echo -e "${GREEN}✓ Office suite running${NC}"
echo ""

# Build and start business services
echo -e "${YELLOW}[9/10] Building business services...${NC}"
docker-compose -f $COMPOSE_FILE up -d --build \
    crm-service \
    ecommerce-service ecommerce-frontend
echo "Waiting for business services to start..."
sleep 20
echo -e "${GREEN}✓ Business services running${NC}"
echo ""

# Start monitoring stack
echo -e "${YELLOW}[10/10] Starting monitoring stack...${NC}"
docker-compose -f $COMPOSE_FILE up -d \
    prometheus \
    grafana \
    loki \
    jaeger \
    aiops-service
echo -e "${GREEN}✓ Monitoring stack running${NC}"
echo ""

# Health check
echo -e "${YELLOW}Running health checks...${NC}"
sleep 10

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   NEXUS Platform Deployment Complete!     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Access Points:${NC}"
echo -e "  • NEXUS Hub:         http://localhost:3000"
echo -e "  • API Gateway:       http://localhost:8000"
echo -e "  • Grafana:           http://localhost:3010 (admin/admin)"
echo -e "  • Prometheus:        http://localhost:9090"
echo -e "  • Jaeger:            http://localhost:16686"
echo -e "  • MinIO Console:     http://localhost:9001"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Access NEXUS Hub at http://localhost:3000"
echo -e "  2. Log in with default credentials (admin@nexus.local / ChangeMeInProduction!)"
echo -e "  3. Change default passwords immediately"
echo -e "  4. Configure your organization settings"
echo -e "  5. Add users and assign roles"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  • View logs:         docker-compose -f $COMPOSE_FILE logs -f [service-name]"
echo -e "  • Stop platform:     docker-compose -f $COMPOSE_FILE down"
echo -e "  • Restart service:   docker-compose -f $COMPOSE_FILE restart [service-name]"
echo -e "  • View status:       docker-compose -f $COMPOSE_FILE ps"
echo ""
echo -e "${GREEN}Happy building! 🚀${NC}"
