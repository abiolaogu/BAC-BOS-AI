# Use Cases -- BAC-BOS-AI Platform

## UC-001: Activate New Business
**Actor**: Business Owner
**Precondition**: Valid JSON business profile
**Flow**: Submit activation payload -> Nexus Engine provisions stack -> Receive endpoints and credentials
**Postcondition**: Full business infrastructure live in < 5 minutes
**Services**: nexus-engine, all enabled services

## UC-002: Manage CRM Contacts
**Actor**: Sales Representative
**Flow**: Create contact -> Add custom fields/tags -> Search/filter contacts -> Export list
**Services**: crm-service (port 8081)

## UC-003: Track Sales Pipeline
**Actor**: Sales Manager
**Flow**: Create lead -> Qualify lead -> Convert to opportunity -> Progress through stages -> Close deal
**Services**: crm-service

## UC-004: Process Payment
**Actor**: Customer / Finance Team
**Flow**: Initiate payment -> Select gateway (Stripe/Paystack) -> Complete transaction -> Receive invoice
**Services**: finance-service (port 8082)

## UC-005: Send and Receive Email
**Actor**: Any User
**Flow**: Compose email -> Attach files -> Send via SMTP -> Recipient reads via IMAP/web
**Services**: mail-service (SMTP/IMAP), drive-service (attachments)

## UC-006: Collaborate on Documents
**Actor**: Team Members
**Flow**: Create document -> Share with team -> Edit simultaneously -> Export to PDF/DOCX
**Services**: writer-service, collaboration-service, drive-service

## UC-007: Conduct Video Meeting
**Actor**: Any User
**Flow**: Schedule meeting (calendar) -> Join via WebRTC -> Screen share -> Record -> End meeting
**Services**: meet-service, calendar-service, notification-service

## UC-008: Manage Employee Records
**Actor**: HR Manager
**Flow**: Add employee -> Assign department/role -> Track attendance -> Process leave requests
**Services**: hr-service (port 8084), time-attendance service

## UC-009: Track Project Tasks
**Actor**: Project Manager
**Flow**: Create project -> Add tasks -> Assign team -> Track on Kanban -> Monitor progress
**Services**: projects-service (port 8087)

## UC-010: Run Marketing Campaign
**Actor**: Marketing Manager
**Flow**: Create campaign -> Design email template -> Select audience -> Schedule send -> Track metrics
**Services**: marketing-service (port 8088), mail-service

## UC-011: Manage Support Tickets
**Actor**: Support Agent
**Flow**: Customer submits ticket -> Agent assigned -> SLA timer starts -> Resolve -> Close
**Services**: support-service (port 8089)

## UC-012: Manage Inventory
**Actor**: Warehouse Manager
**Flow**: Add products -> Track stock levels -> Receive alerts on low stock -> Process orders
**Services**: inventory-service (port 8085)

## UC-013: Execute AI Agent
**Actor**: Any User
**Flow**: Select agent type -> Submit prompt -> Agent processes with tools -> Return response
**Services**: ai-service (port 8086)

## UC-014: Store and Share Files
**Actor**: Any User
**Flow**: Upload file to Drive -> Organize in folders -> Share with permissions -> Download/preview
**Services**: drive-service (MinIO backend)

## UC-015: Schedule Calendar Events
**Actor**: Any User
**Flow**: Create event -> Set time/location -> Add attendees -> Set reminders -> Sync via CalDAV
**Services**: calendar-service

## UC-016: Chat with Team
**Actor**: Any User
**Flow**: Open channel -> Send message -> Share files -> React -> Thread reply
**Services**: chat-service (WebSocket)

## UC-017: Sync with External ERP
**Actor**: System Administrator
**Flow**: Configure Odoo/Zoho credentials -> Map fields -> Enable sync -> Monitor data flow
**Services**: odoo-integration, zoho-integration

## UC-018: Sync with Google Workspace
**Actor**: System Administrator
**Flow**: Provide service account credentials -> Select services -> Enable bidirectional sync
**Services**: google-workspace-integration

## UC-019: Create Spreadsheet
**Actor**: Any User
**Flow**: Create spreadsheet -> Add data -> Apply formulas -> Create charts -> Share
**Services**: sheets-service

## UC-020: Build Presentation
**Actor**: Any User
**Flow**: Create presentation -> Select theme -> Add slides -> Add content -> Present
**Services**: slides-service

## UC-021: Track Time and Attendance
**Actor**: Employee / HR Manager
**Flow**: Clock in (biometric/web) -> Track hours -> Submit overtime -> Request leave -> Generate reports
**Services**: time-attendance service

## UC-022: Configure Identity and SSO
**Actor**: System Administrator
**Flow**: Configure IdP -> Enable SSO -> Setup MFA policies -> Manage user provisioning
**Services**: idaas-service

## UC-023: Monitor Platform Health
**Actor**: Platform Operator
**Flow**: View Grafana dashboards -> Check service health -> Review alerts -> Investigate issues
**Services**: prometheus, grafana

## UC-024: Deploy New Service Version
**Actor**: DevOps Engineer
**Flow**: Push code -> Tekton builds/tests -> ArgoCD syncs -> Rolling update -> Verify health
**Services**: Tekton pipelines, ArgoCD

---

*Document version: 1.0 | Last updated: 2026-02-17*
