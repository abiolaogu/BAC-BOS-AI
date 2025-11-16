#!/bin/bash

###############################################################################
# Security Scan Script
# Runs all security scans and generates comprehensive report
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/security/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create report directory
mkdir -p "$REPORT_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}NEXUS Security Scan${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

###############################################################################
# 1. Container Scanning with Trivy
###############################################################################

echo -e "${YELLOW}[1/5] Running Trivy Container Scan...${NC}"

SERVICES=("auth" "writer" "sheets" "slides" "drive" "meet" "gateway" "hub")

for service in "${SERVICES[@]}"; do
    echo "Scanning $service service..."

    # Build image
    docker build -t nexus-$service:scan "$PROJECT_ROOT/services/$service" > /dev/null 2>&1

    # Run Trivy scan
    trivy image \
        --config "$PROJECT_ROOT/security/trivy-config.yaml" \
        --format json \
        --output "$REPORT_DIR/trivy-$service-$TIMESTAMP.json" \
        nexus-$service:scan

    # Check for critical vulnerabilities
    CRITICAL=$(jq '.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL") | .VulnerabilityID' "$REPORT_DIR/trivy-$service-$TIMESTAMP.json" | wc -l)

    if [ "$CRITICAL" -gt 0 ]; then
        echo -e "${RED}  ✗ Found $CRITICAL critical vulnerabilities in $service${NC}"
    else
        echo -e "${GREEN}  ✓ No critical vulnerabilities in $service${NC}"
    fi
done

###############################################################################
# 2. NPM Audit
###############################################################################

echo -e "\n${YELLOW}[2/5] Running NPM Audit...${NC}"

for service in "${SERVICES[@]}"; do
    echo "Auditing $service dependencies..."

    cd "$PROJECT_ROOT/services/$service"

    # Run npm audit
    npm audit --json > "$REPORT_DIR/npm-audit-$service-$TIMESTAMP.json" 2>&1 || true

    # Check severity
    VULNERABILITIES=$(jq '.metadata.vulnerabilities | .critical + .high' "$REPORT_DIR/npm-audit-$service-$TIMESTAMP.json" 2>/dev/null || echo "0")

    if [ "$VULNERABILITIES" -gt 0 ]; then
        echo -e "${RED}  ✗ Found $VULNERABILITIES high/critical vulnerabilities in $service${NC}"
    else
        echo -e "${GREEN}  ✓ No high/critical vulnerabilities in $service${NC}"
    fi

    cd "$PROJECT_ROOT"
done

###############################################################################
# 3. Snyk Scan (if token available)
###############################################################################

echo -e "\n${YELLOW}[3/5] Running Snyk Scan...${NC}"

if [ -n "$SNYK_TOKEN" ]; then
    for service in "${SERVICES[@]}"; do
        echo "Scanning $service with Snyk..."

        cd "$PROJECT_ROOT/services/$service"

        snyk test \
            --json \
            --severity-threshold=high \
            > "$REPORT_DIR/snyk-$service-$TIMESTAMP.json" 2>&1 || true

        cd "$PROJECT_ROOT"
    done
    echo -e "${GREEN}  ✓ Snyk scan completed${NC}"
else
    echo -e "${YELLOW}  ⚠ SNYK_TOKEN not set, skipping Snyk scan${NC}"
fi

###############################################################################
# 4. OWASP Dependency Check
###############################################################################

echo -e "\n${YELLOW}[4/5] Running OWASP Dependency Check...${NC}"

if command -v dependency-check.sh &> /dev/null; then
    dependency-check.sh \
        --project "NEXUS Office Suite" \
        --scan "$PROJECT_ROOT/services" \
        --scan "$PROJECT_ROOT/packages" \
        --format JSON \
        --format HTML \
        --out "$REPORT_DIR" \
        --suppression "$PROJECT_ROOT/security/dependency-check-suppressions.xml" \
        --failOnCVSS 7

    echo -e "${GREEN}  ✓ OWASP Dependency Check completed${NC}"
else
    echo -e "${YELLOW}  ⚠ OWASP Dependency Check not installed, skipping${NC}"
fi

###############################################################################
# 5. Secret Scanning with Gitleaks
###############################################################################

echo -e "\n${YELLOW}[5/5] Running Secret Scan with Gitleaks...${NC}"

if command -v gitleaks &> /dev/null; then
    gitleaks detect \
        --source "$PROJECT_ROOT" \
        --report-path "$REPORT_DIR/gitleaks-$TIMESTAMP.json" \
        --report-format json \
        --verbose || true

    SECRETS=$(jq '. | length' "$REPORT_DIR/gitleaks-$TIMESTAMP.json" 2>/dev/null || echo "0")

    if [ "$SECRETS" -gt 0 ]; then
        echo -e "${RED}  ✗ Found $SECRETS potential secrets${NC}"
    else
        echo -e "${GREEN}  ✓ No secrets detected${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ Gitleaks not installed, skipping secret scan${NC}"
fi

###############################################################################
# Generate Consolidated Report
###############################################################################

echo -e "\n${YELLOW}Generating consolidated report...${NC}"

REPORT_FILE="$REPORT_DIR/security-report-$TIMESTAMP.md"

cat > "$REPORT_FILE" << EOF
# NEXUS Security Scan Report
Generated: $(date)

## Summary

### Container Vulnerabilities (Trivy)
EOF

for service in "${SERVICES[@]}"; do
    if [ -f "$REPORT_DIR/trivy-$service-$TIMESTAMP.json" ]; then
        CRITICAL=$(jq '.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL") | .VulnerabilityID' "$REPORT_DIR/trivy-$service-$TIMESTAMP.json" 2>/dev/null | wc -l || echo "0")
        HIGH=$(jq '.Results[].Vulnerabilities[] | select(.Severity=="HIGH") | .VulnerabilityID' "$REPORT_DIR/trivy-$service-$TIMESTAMP.json" 2>/dev/null | wc -l || echo "0")

        echo "- **$service**: $CRITICAL critical, $HIGH high" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

### Dependency Vulnerabilities (NPM Audit)
EOF

for service in "${SERVICES[@]}"; do
    if [ -f "$REPORT_DIR/npm-audit-$service-$TIMESTAMP.json" ]; then
        CRITICAL=$(jq '.metadata.vulnerabilities.critical' "$REPORT_DIR/npm-audit-$service-$TIMESTAMP.json" 2>/dev/null || echo "0")
        HIGH=$(jq '.metadata.vulnerabilities.high' "$REPORT_DIR/npm-audit-$service-$TIMESTAMP.json" 2>/dev/null || echo "0")

        echo "- **$service**: $CRITICAL critical, $HIGH high" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

## Recommendations

1. Review and remediate all CRITICAL vulnerabilities immediately
2. Update dependencies to latest secure versions
3. Implement security patches for identified issues
4. Review and rotate any exposed secrets

## Reports Location

All detailed reports are available at: \`$REPORT_DIR\`

EOF

echo -e "${GREEN}  ✓ Report generated: $REPORT_FILE${NC}"

###############################################################################
# Check for failures
###############################################################################

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Security Scan Complete${NC}"
echo -e "${GREEN}========================================${NC}"

# Count total critical issues
TOTAL_CRITICAL=0

for service in "${SERVICES[@]}"; do
    if [ -f "$REPORT_DIR/trivy-$service-$TIMESTAMP.json" ]; then
        COUNT=$(jq '.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL") | .VulnerabilityID' "$REPORT_DIR/trivy-$service-$TIMESTAMP.json" 2>/dev/null | wc -l || echo "0")
        TOTAL_CRITICAL=$((TOTAL_CRITICAL + COUNT))
    fi
done

if [ "$TOTAL_CRITICAL" -gt 0 ]; then
    echo -e "${RED}FAILED: Found $TOTAL_CRITICAL critical vulnerabilities${NC}"
    exit 1
else
    echo -e "${GREEN}SUCCESS: No critical vulnerabilities found${NC}"
    exit 0
fi
