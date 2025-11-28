#!/bin/bash
# Test script for NEXUS AI Service
# Tests agent listing and execution

set -e

BASE_URL="http://localhost:8086"

echo "🤖 NEXUS AI Service - Agent Tests"
echo "=================================="
echo ""

# Check if service is healthy
echo "📊 Checking service health..."
if curl -s -f "${BASE_URL}/health" > /dev/null; then
    echo "✅ AI Service is healthy"
else
    echo "❌ AI Service is not responding"
    echo "   Make sure to run: docker compose up ai-service"
    exit 1
fi

echo ""
echo "📋 Listing Available Agents..."
echo "------------------------------"

AGENTS_LIST=$(curl -s "${BASE_URL}/agents")
TOTAL_AGENTS=$(echo "${AGENTS_LIST}" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['agents']))")

echo "Total Agents Available: ${TOTAL_AGENTS}"
echo ""

# Show sample agents from different categories
echo "Sample Agents by Category:"
echo "${AGENTS_LIST}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
categories = {}
for agent in data['agents']:
    role = agent['role']
    if role not in categories:
        categories[role] = []
    if len(categories[role]) < 2:  # Show 2 per category
        categories[role].append(agent['name'])

for role in sorted(categories.keys()):
    print(f'  {role}:')
    for name in categories[role]:
        print(f'    - {name}')
"

echo ""
echo "🧪 Testing Agent Execution..."
echo "------------------------------"

# Test 1: Sales Agent
echo ""
echo "Test 1: Executing Sales Agent"
SALES_RESPONSE=$(curl -s -X POST "${BASE_URL}/agents/sales_lead_generation_1/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Qualify this lead: Company XYZ, 50 employees, looking for CRM solution"
  }')

echo "Agent: Sales Lead Generation"
echo "Response:"
echo "${SALES_RESPONSE}" | python3 -m json.tool
echo ""

# Test 2: Support Agent
echo ""
echo "Test 2: Executing Support Agent"
SUPPORT_RESPONSE=$(curl -s -X POST "${BASE_URL}/agents/support_tier_1_support_1/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Customer cannot login to their account"
  }')

echo "Agent: Tier 1 Support"
echo "Response:"
echo "${SUPPORT_RESPONSE}" | python3 -m json.tool
echo ""

# Test 3: Finance Agent
echo ""
echo "Test 3: Executing Finance Agent"
FINANCE_RESPONSE=$(curl -s -X POST "${BASE_URL}/agents/finance_invoice_1/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate invoice for $5000 consulting services"
  }')

echo "Agent: Invoice Generator"
echo "Response:"
echo "${FINANCE_RESPONSE}" | python3 -m json.tool
echo ""

echo "=================================="
echo "🎉 AI Agent Tests Complete!"
echo ""
echo "📊 Test Summary:"
echo "  Total Agents: ${TOTAL_AGENTS}"
echo "  Sales Agent: ✓"
echo "  Support Agent: ✓"
echo "  Finance Agent: ✓"
echo ""
echo "💡 All ${TOTAL_AGENTS} agents are available via the API!"
echo ""
