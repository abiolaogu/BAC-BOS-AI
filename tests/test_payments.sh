#!/bin/bash
# Test script for NEXUS Finance Service
# Tests both Stripe and Paystack payment processing

set -e

BASE_URL="http://localhost:8082"
API_ENDPOINT="${BASE_URL}/api/v1/payments"

echo "🧪 NEXUS Finance Service - Payment Processing Tests"
echo "=================================================="
echo ""

# Check if service is healthy
echo "📊 Checking service health..."
if curl -s -f "${BASE_URL}/health" > /dev/null; then
    echo "✅ Finance Service is healthy"
else
    echo "❌ Finance Service is not responding"
    echo "   Make sure to run: docker compose up finance-service"
    exit 1
fi

echo ""
echo "💳 Testing Payments..."
echo "----------------------"

# Test 1: Stripe Payment (Global)
echo ""
echo "Test 1: Stripe Payment Processing (Global)"
echo "==========================================="

STRIPE_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "description": "Test Payment - Global Customer",
    "reference": "TEST_STRIPE_001",
    "email": "customer@example.com",
    "provider": "stripe"
  }')

echo "Request: Stripe - $100.00 USD"
echo "Response:"
echo "${STRIPE_RESPONSE}" | python3 -m json.tool
echo ""

if echo "${STRIPE_RESPONSE}" | grep -q "\"success\": true"; then
    echo "✅ Stripe payment processed successfully"
else
    echo "❌ Stripe payment failed"
fi

# Test 2: Paystack Payment (African)
echo ""
echo "Test 2: Paystack Payment Processing (Africa)"
echo "============================================="

PAYSTACK_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "NGN",
    "description": "Test Payment - Nigerian Customer",
    "reference": "TEST_PAYSTACK_001",
    "email": "customer@example.ng",
    "provider": "paystack"
  }')

echo "Request: Paystack - ₦10,000 NGN"
echo "Response:"
echo "${PAYSTACK_RESPONSE}" | python3 -m json.tool
echo ""

if echo "${PAYSTACK_RESPONSE}" | grep -q "\"success\": true"; then
    echo "✅ Paystack payment processed successfully"
else
    echo "❌ Paystack payment failed"
fi

# Test 3: Invalid Provider
echo ""
echo "Test 3: Invalid Provider Handling"
echo "=================================="

INVALID_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "currency": "EUR",
    "description": "Test Invalid Provider",
    "reference": "TEST_INVALID_001",
    "email": "test@example.com",
    "provider": "invalid_provider"
  }')

echo "Request: Invalid Provider"
echo "Response:"
echo "${INVALID_RESPONSE}"
echo ""

if echo "${INVALID_RESPONSE}" | grep -q "Unsupported provider"; then
    echo "✅ Invalid provider handled correctly"
else
    echo "⚠️ Unexpected response for invalid provider"
fi

echo ""
echo "=================================================="
echo "🎉 Payment Processing Tests Complete!"
echo ""
echo "📝 Summary:"
echo "  - Stripe (Global): Check above for result"
echo "  - Paystack (Africa): Check above for result"
echo "  - Invalid Provider: Check above for result"
echo ""
echo "💡 Next Steps:"
echo "  1. Add real API keys in docker-compose.yml or .env"
echo "  2. Configure webhooks for production"
echo "  3. Implement real Stripe/Paystack API calls"
echo ""
