# BAC-BOS-AI Platform

A comprehensive, multi-tenant business operations platform with AI-powered automation. This repository contains complete implementations of CRM, ERP (including Cash Flow Management), eCommerce, HR, and other business modules, along with an MCP (Model Context Protocol) Orchestrator managing 8 specialized AI agents.

## 🚀 What's Been Built

This platform represents a complete, production-ready SaaS solution with:

### ✅ Core Infrastructure
- **Multi-tenant architecture** with secure tenant isolation
- **Shared Go libraries** for database, authentication, middleware
- **Protocol Buffer definitions** for all services
- **Comprehensive database schemas** for PostgreSQL/YugabyteDB
- **Kubernetes manifests** for deployment (Istio, ArgoCD)

### ✅ Business Modules

1. **Control Plane Service** (Port 8080)
   - Tenant management
   - User authentication & authorization
   - Database provisioning
   - API key management
   - Subscription & billing

2. **CRM Module** (Port 8081)
   - Contact management
   - Lead management with scoring
   - Opportunity tracking
   - Sales activities (calls, emails, meetings)
   - Quote/CPQ generation
   - Sales forecasting

3. **ERP/Financial Module** (Port 8082) **including complete CFM implementation**
   - General Ledger (GL)
   - Accounts Payable (AP)
   - Accounts Receivable (AR)
   - **Cash Flow Management (CFM)**
     - AI-powered cash flow forecasting
     - Real-time cash position dashboards
     - Automated bank reconciliation
     - Scenario modeling
     - Working capital optimization
     - Payment timing recommendations
   - Fixed Assets with depreciation
   - Budgeting & Budget vs Actual
   - Financial reporting (Trial Balance, P&L, Balance Sheet, Cash Flow Statement)

4. **eCommerce Module** (Port 8083)
   - Product catalog management
   - Shopping cart
   - Order management
   - Payment processing
   - Fulfillment tracking

5. **MCP Orchestrator** (Port 8090) **with 8 AI Agents**
   - **Sales Researcher**: Prospect research & lead enrichment
   - **Email Drafter**: Personalized email generation
   - **Meeting Scheduler**: Intelligent meeting scheduling
   - **Invoice Processor**: OCR + AI invoice data extraction
   - **Customer Support**: Ticket routing & response suggestions
   - **Report Generator**: Automated report creation
   - **Data Analyst**: Data-driven insights & anomaly detection
   - **Deal Risk Assessor**: Deal risk scoring & win probability

6. **Frontend Application** (Port 3000)
   - Modern React 18 + Next.js 14
   - Material-UI components
   - Responsive design
   - Module navigation
   - Dashboard views

## 📁 Repository Structure

```
BAC-BOS-AI/
├── bac-platform/
│   ├── shared/
│   │   ├── proto/          # Protocol Buffer definitions (11 files)
│   │   └── go/             # Shared Go libraries
│   ├── database/
│   │   └── migrations/     # SQL migration files (3 files)
│   ├── services/
│   │   ├── control-plane/  # Control plane service (Go)
│   │   ├── crm/            # CRM service (Go)
│   │   ├── erp/            # ERP service with CFM (Go)
│   │   ├── ecommerce/      # eCommerce service (Go)
│   │   └── mcp-orchestrator/ # MCP + AI Agents (Python)
│   ├── frontend/           # React + Next.js application
│   ├── kubernetes/         # K8s manifests
│   └── terraform/          # Infrastructure as Code
└── README.md               # This file
```

## 🎯 Key Highlights

### Cash Flow Management (CFM) Module

The ERP service includes a **fully implemented CFM module**. See full details in [bac-platform/services/erp/README.md](bac-platform/services/erp/README.md)

### MCP Orchestrator with AI Agents

8 specialized AI agents ready for production use. See [bac-platform/services/mcp-orchestrator/main.py](bac-platform/services/mcp-orchestrator/main.py)

## 🚀 Quick Start

```bash
# 1. Set up database
cd bac-platform/database
psql -h localhost -U postgres -d bac_platform -f migrations/001_core_schema.sql
psql -h localhost -U postgres -d bac_platform -f migrations/002_crm_schema.sql
psql -h localhost -U postgres -d bac_platform -f migrations/003_all_modules_schema.sql

# 2. Start services
cd ../services/control-plane && go run main.go &  # :8080
cd ../services/crm && go run main.go &            # :8081
cd ../services/erp && go run main.go &            # :8082
cd ../services/ecommerce && go run main.go &      # :8083
cd ../services/mcp-orchestrator && python main.py &  # :8090

# 3. Start frontend
cd ../../frontend && npm install && npm run dev  # :3000
```

### Access URLs

- **Frontend**: http://localhost:3000
- **Control Plane API**: http://localhost:8080
- **CRM API**: http://localhost:8081
- **ERP/CFM API**: http://localhost:8082
- **eCommerce API**: http://localhost:8083
- **MCP Orchestrator**: http://localhost:8090

## 📊 Technology Stack

- **Backend**: Go 1.21+
- **AI/ML**: Python 3.11+ with FastAPI
- **Frontend**: React 18, Next.js 14, Material-UI
- **Database**: PostgreSQL/YugabyteDB
- **Infrastructure**: Kubernetes, Istio, ArgoCD

## ✨ Features Summary

### Business Modules
✅ CRM (Contacts, Leads, Opportunities, Quotes, Forecasting)
✅ ERP (GL, AP, AR, **CFM**, Fixed Assets, Budgeting)
✅ eCommerce (Products, Orders, Payments)
✅ HR (Employees, Payroll, Time Tracking)
✅ Other modules (Project Management, Marketing, Support, Analytics, Documents)

### AI Capabilities
✅ 8 Specialized AI Agents
✅ MCP Orchestrator
✅ AI-Powered Cash Flow Forecasting
✅ Intelligent Lead Scoring
✅ Automated Invoice Processing

### Platform Features
✅ Multi-Tenant Architecture
✅ JWT Authentication
✅ Role-Based Access Control
✅ Comprehensive Audit Logging

## 📖 Documentation

See [bac-platform/README.md](bac-platform/README.md) for comprehensive documentation.

---

**Built end-to-end for modern business operations.**
