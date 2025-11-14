# ERP Service - Financial Management

Complete ERP solution with General Ledger, Accounts Payable, Accounts Receivable, **Cash Flow Management (CFM)**, Fixed Assets, and Budgeting.

## Cash Flow Management (CFM) Module

The CFM module provides comprehensive cash flow visibility and forecasting capabilities:

### Features

1. **AI-Powered Forecasting**
   - Predictive cash flow analytics using machine learning
   - Scenario modeling (best case, worst case, most likely)
   - Confidence scoring for forecasts

2. **Real-Time Cash Position**
   - Live bank account balances
   - Cash inflows and outflows tracking
   - Multi-currency support

3. **Bank Reconciliation**
   - Automated transaction matching
   - Manual reconciliation support
   - Variance analysis

4. **Working Capital Optimization**
   - Payment timing recommendations
   - Collection acceleration strategies
   - Cash conversion cycle analysis

5. **Reporting & Analytics**
   - Cash flow statements
   - Trend analysis
   - KPI dashboards

### API Endpoints

See main README.md for complete CFM API documentation.

### Usage Example

```bash
# Generate cash flow forecast
curl -X POST http://localhost:8082/api/v1/cash-flow/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "period": "monthly",
    "cash_account_ids": ["uuid-1", "uuid-2"]
  }'

# Response
{
  "id": "forecast-uuid",
  "forecast_date": "2024-12-31",
  "opening_balance": 50000,
  "cash_inflows": 75000,
  "cash_outflows": 60000,
  "net_cash_flow": 15000,
  "closing_balance": 65000,
  "confidence": "high",
  "ai_insights": {
    "recommended_actions": [
      "Optimize payment timing",
      "Accelerate collections"
    ]
  }
}
```

## Running the Service

```bash
go run main.go
```

Service will start on port 8082.
