#!/bin/bash
# Test script for NEXUS Enterprise Services
# Verifies health of all new microservices

set -e

echo "🏢 NEXUS Enterprise Services - Health Check"
echo "=========================================="
echo ""

services=(
    "Documents Service|http://localhost:8083/health"
    "HR Service|http://localhost:8084/health"
    "Inventory Service|http://localhost:8085/health"
    "Projects Service|http://localhost:8087/health"
    "Marketing Service|http://localhost:8088/health"
    "Support Service|http://localhost:8089/health"
)

for service in "${services[@]}"; do
    IFS="|" read -r name url <<< "$service"
    echo -n "Checking $name... "
    if curl -s -f "$url" > /dev/null; then
        echo "✅ OK"
    else
        echo "❌ FAILED (Is the service running?)"
    fi
done

echo ""
echo "=========================================="
echo "🎉 Enterprise Services Check Complete!"
echo ""
