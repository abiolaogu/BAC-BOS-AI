# Payment Gateway API Keys Guide

## Stripe (Global Payments)

### Getting Stripe API Keys

1. **Sign up for Stripe:**
   - Go to https://stripe.com
   - Click "Sign up" and create an account
   - Complete email verification

2. **Access API Keys:**
   - Log in to your Stripe Dashboard
   - Navigate to "Developers" > "API keys"
   - You'll see two keys:
     - **Publishable key** (pk_test_...)
     - **Secret key** (sk_test_...)

3. **Test Mode Keys:**
   Stripe provides test keys by default. Use these for development:
   ```
   Secret Key: sk_test_51Abc...XYZ
   ```

4. **Add to Environment:**
   ```bash
   export STRIPE_SECRET_KEY="sk_test_your_key_here"
   ```

### Sample Stripe Test Key Format
```
sk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890
```

---

## Paystack (African Payments)

### Getting Paystack API Keys

1. **Sign up for Paystack:**
   - Go to https://paystack.com
   - Click "Get Started" and create an account
   - Verify your email and phone number

2. **Access API Keys:**
   - Log in to your Paystack Dashboard
   - Navigate to "Settings" > "API Keys & Webhooks"
   - You'll see:
     - **Test Public Key** (pk_test_...)
     - **Test Secret Key** (sk_test_...)

3. **Test Mode Keys:**
   Paystack provides test keys immediately upon signup:
   ```
   Secret Key: sk_test_abc123...xyz789
   ```

4. **Add to Environment:**
   ```bash
   export PAYSTACK_SECRET_KEY="sk_test_your_key_here"
   ```

### Sample Paystack Test Key Format
```
sk_test_abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz
```

---

## Using in NEXUS Finance Service

### Option 1: Environment Variables

Create a `.env` file in the root directory:

```bash
# Global Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here

# African Payments
PAYSTACK_SECRET_KEY=sk_test_your_paystack_key_here
```

### Option 2: Docker Compose Override

Create `docker-compose.override.yml`:

```yaml
version: '3.9'

services:
  finance-service:
    environment:
      - STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
      - PAYSTACK_SECRET_KEY=sk_test_your_paystack_key_here
```

---

## Testing Payment Processing

### Using cURL

**Stripe Payment:**
```bash
curl -X POST http://localhost:8082/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "description": "Test Payment",
    "reference": "TEST001",
    "email": "customer@example.com",
    "provider": "stripe"
  }'
```

**Paystack Payment:**
```bash
curl -X POST http://localhost:8082/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "NGN",
    "description": "Test Payment",
    "reference": "TEST002",
    "email": "customer@example.com",
    "provider": "paystack"
  }'
```

### Expected Response

```json
{
  "success": true,
  "transactionID": "ch_1ABC...XYZ",
  "message": "Payment processed successfully via Stripe"
}
```

---

## Important Notes

- **Test Mode:** Always use test keys during development
- **Production Keys:** Never commit production keys to version control
- **Key Rotation:** Regularly rotate API keys for security
- **Webhooks:** Configure webhooks for production to receive payment notifications
