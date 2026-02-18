# Enterprise Architecture -- BAC-BOS-AI Platform

## 1. Business Capability Map
```
BAC-BOS-AI Enterprise Capabilities
├── Customer Management (CRM: contacts, leads, opportunities, pipeline)
├── Financial Management (Finance: GL, AP/AR, invoicing, payments via Stripe/Paystack)
├── Human Capital (HR + Time-Attendance: employees, leave, biometrics, overtime)
├── Operations (Projects, Inventory, eCommerce, Marketing, Documents)
├── Communication & Collaboration (Office Suite: Mail, Calendar, Meet, Chat, Drive, Writer, Sheets, Slides)
├── Platform Services (Nexus Engine activation, IDaaS identity, AI copilots, VAS)
├── Integration Hub (Google Workspace, Odoo, Zoho)
└── Technology Services (Istio mesh, ArgoCD GitOps, Tekton CI/CD, Prometheus observability)
```

## 2. Application Portfolio
25 implemented services across Go (majority), Python (AI), and TypeScript (identity, time-attendance, office suite real-time services). Frontend targets: Next.js 14 web console, Flutter mobile app.

## 3. Data Architecture
13 data domains owned by respective services. PostgreSQL (dev) migrating to YugabyteDB (production). 16 SQL migration files define schemas. Kafka/Redpanda event backbone. MinIO object storage.

## 4. Technology Standards
Kubernetes 1.27+ (Rancher-managed), Istio 1.19+ service mesh, Kong API gateway, Tekton CI/CD, ArgoCD GitOps, Ansible AWX automation. Languages: Go 1.21+, Python 3.11+, TypeScript 5.x.

## 5. Integration Architecture
External: Google Workspace (OAuth 2.0), Odoo (XML-RPC), Zoho (OAuth 2.0), Stripe/Paystack/Flutterwave (API key + webhooks). Internal: REST, gRPC (protobuf), Kafka events, WebSocket.

## 6. Governance
ADRs: Go primary language, Gin framework, PostgreSQL-to-YugabyteDB migration, Redpanda for dev, ArgoCD GitOps, Tekton CI/CD. Change management via architecture review, DBA review, security review gates.

## 7. Multi-Region Strategy
5 target PoPs: Lagos, Johannesburg, Frankfurt, Ashburn, Singapore. Per-region: 3 control planes, 6-10 workers, 3+ data nodes, 2 storage nodes, 2 monitoring nodes.

---

*Document version: 1.0 | Last updated: 2026-02-17*
