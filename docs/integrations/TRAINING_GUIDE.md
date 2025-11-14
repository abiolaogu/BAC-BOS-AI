# BAC Platform Integrations - Training Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Google Workspace Integration Training](#google-workspace-integration-training)
3. [Odoo Integration Training](#odoo-integration-training)
4. [Zoho Integration Training](#zoho-integration-training)
5. [Advanced Topics](#advanced-topics)
6. [Troubleshooting](#troubleshooting)
7. [Certification](#certification)

---

## Introduction

Welcome to the BAC Platform Integrations Training Guide! This comprehensive guide will teach you how to effectively use and manage integrations with Google Workspace, Odoo, and Zoho platforms.

### Learning Objectives

By the end of this training, you will be able to:
- Configure and authenticate with third-party platforms
- Use integration APIs to sync data bidirectionally
- Troubleshoot common integration issues
- Implement best practices for integration management
- Monitor and optimize integration performance

### Prerequisites

- Basic understanding of REST APIs
- Familiarity with BAC Platform
- Access to integration admin panel
- (Optional) Experience with OAuth 2.0

### Training Duration

- **Module 1: Google Workspace** - 2 hours
- **Module 2: Odoo** - 2 hours
- **Module 3: Zoho** - 2 hours
- **Module 4: Advanced Topics** - 1 hour
- **Total**: 7 hours

---

## Google Workspace Integration Training

### Module Overview

Learn how to integrate BAC Platform with Google Workspace to leverage Gmail, Calendar, Drive, Docs, Sheets, and other Google productivity tools.

### Lesson 1: Setup and Authentication (30 minutes)

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Name your project (e.g., "BAC Platform Integration")
4. Note the Project ID

#### Step 2: Enable Required APIs

Enable the following APIs:
- Gmail API
- Google Calendar API
- Google Drive API
- Google Docs API
- Google Sheets API
- Google Slides API
- Google Forms API
- Admin SDK API

**How to enable:**
```
1. Navigate to "APIs & Services" > "Library"
2. Search for each API
3. Click "Enable"
```

#### Step 3: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Enter name and description
4. Grant necessary roles:
   - Gmail API User
   - Drive Administrator
   - Admin SDK User
5. Create and download JSON key file

#### Step 4: Enable Domain-Wide Delegation

1. In Service Account details, click "Show Domain-Wide Delegation"
2. Enable "Enable Google Workspace Domain-wide Delegation"
3. Note the Client ID
4. In Google Admin Console, authorize the service account with scopes:
   ```
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/drive
   https://www.googleapis.com/auth/documents
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/presentations
   ```

#### Step 5: Configure in BAC Platform

1. Log in to BAC Platform Admin Panel
2. Navigate to "Integrations" > "Google Workspace"
3. Click "Add New Integration"
4. Upload JSON credentials file
5. Test connection
6. Save configuration

**Practice Exercise:**
- Set up a Google Cloud project
- Create a service account
- Configure in BAC Platform
- Send a test email

### Lesson 2: Gmail Integration (30 minutes)

#### Sending Emails

**Use Case:** Automated email notifications from CRM

**API Endpoint:**
```http
POST /api/v1/gmail/send
Content-Type: application/json

{
  "to": "customer@example.com",
  "from": "sales@yourcompany.com",
  "subject": "Welcome to BAC Platform",
  "body": "Thank you for signing up! We're excited to have you."
}
```

**BAC Platform UI:**
1. Go to "Automation" > "Email Templates"
2. Create new template
3. Select "Google Workspace" as provider
4. Design email
5. Set triggers (e.g., "New Customer Created")

**Practice Exercise:**
- Create an email template
- Set up automation rule
- Test by creating a new customer

#### Reading Emails

**Use Case:** Import customer inquiries into support tickets

**API Endpoint:**
```http
GET /api/v1/gmail/messages?query=is:unread label:support
```

**Practice Exercise:**
- Set up email import rule
- Test by sending email to support address
- Verify ticket creation

### Lesson 3: Calendar Integration (20 minutes)

#### Creating Events

**Use Case:** Schedule sales calls automatically

**API Endpoint:**
```http
POST /api/v1/calendar/events
Content-Type: application/json

{
  "summary": "Sales Call with Acme Corp",
  "description": "Quarterly business review",
  "start": "2025-11-20T10:00:00Z",
  "end": "2025-11-20T11:00:00Z",
  "attendees": ["rep@yourcompany.com", "contact@acmecorp.com"],
  "location": "Google Meet"
}
```

**Practice Exercise:**
- Create calendar automation
- Schedule meeting from opportunity
- Verify calendar entry

### Lesson 4: Drive Integration (20 minutes)

#### File Upload

**Use Case:** Store customer contracts

**API Endpoint:**
```http
POST /api/v1/drive/files
Content-Type: application/json

{
  "name": "Customer_Contract_Acme.pdf",
  "mimeType": "application/pdf",
  "content": "<base64_encoded_content>",
  "parentId": "<folder_id>"
}
```

**Practice Exercise:**
- Upload contract from customer record
- Organize files in folders
- Share file with customer

### Lesson 5: Docs, Sheets, Slides (20 minutes)

#### Creating Documents

**Use Case:** Generate sales proposals

**Create Google Doc:**
```http
POST /api/v1/docs/documents
Content-Type: application/json

{
  "title": "Sales Proposal - Acme Corp"
}
```

**Create Google Sheet:**
```http
POST /api/v1/sheets/spreadsheets
Content-Type: application/json

{
  "title": "Q4 Sales Report"
}
```

**Create Google Slides:**
```http
POST /api/v1/slides/presentations
Content-Type: application/json

{
  "title": "Customer Presentation - Acme Corp"
}
```

**Practice Exercise:**
- Create proposal template
- Generate proposal from opportunity
- Share with customer

### Assessment Quiz: Google Workspace

1. What authentication method does Google Workspace use?
2. How do you enable domain-wide delegation?
3. What API is required to send emails?
4. How do you create a calendar event with attendees?
5. What is the best practice for organizing Drive files?

---

## Odoo Integration Training

### Module Overview

Learn how to integrate BAC Platform with Odoo ERP to synchronize CRM, sales, inventory, accounting, and HR data.

### Lesson 1: Setup and Authentication (30 minutes)

#### Step 1: Odoo Setup

**Option A: Odoo.com (SaaS)**
1. Sign up at [odoo.com](https://www.odoo.com)
2. Choose appropriate plan
3. Note your database URL (e.g., `yourcompany.odoo.com`)

**Option B: Self-Hosted**
1. Deploy Odoo using Docker:
   ```bash
   docker run -d -p 8069:8069 --name odoo odoo:16
   ```
2. Access at `http://localhost:8069`
3. Complete setup wizard

#### Step 2: Create Integration User

1. Go to "Settings" > "Users & Companies" > "Users"
2. Click "Create"
3. Set user details:
   - **Name**: BAC Platform Integration
   - **Login**: bac-integration
   - **Password**: (secure password)
4. Assign access rights:
   - CRM: User - All Documents
   - Sales: User - All Documents
   - Accounting: Accountant
   - Inventory: User
   - HR: Officer

#### Step 3: Configure in BAC Platform

1. Log in to BAC Platform Admin Panel
2. Navigate to "Integrations" > "Odoo"
3. Click "Add New Integration"
4. Enter connection details:
   - **URL**: https://yourcompany.odoo.com
   - **Database**: yourcompany
   - **Username**: bac-integration
   - **Password**: (your password)
5. Test connection
6. Save configuration

**Practice Exercise:**
- Set up Odoo instance
- Create integration user
- Configure in BAC Platform
- Test connection

### Lesson 2: CRM Integration (30 minutes)

#### Creating Leads

**Use Case:** Sync leads from BAC to Odoo

**API Endpoint:**
```http
POST /api/v1/crm/leads
Content-Type: application/json

{
  "name": "Enterprise Software Opportunity",
  "partner_name": "Acme Corporation",
  "email": "contact@acmecorp.com",
  "phone": "+1-555-0123",
  "description": "Interested in 500-user license",
  "priority": "high",
  "expected_revenue": 250000
}
```

**BAC Platform Setup:**
1. Go to "CRM" > "Settings" > "Sync"
2. Enable "Sync to Odoo"
3. Map fields:
   - BAC Lead Name → Odoo Lead Name
   - BAC Company → Odoo Partner Name
   - BAC Email → Odoo Email From
4. Set sync frequency (real-time, hourly, daily)

**Practice Exercise:**
- Create lead in BAC Platform
- Verify sync to Odoo
- Update lead in Odoo
- Verify sync back to BAC

#### Bidirectional Sync

**Configuration:**
1. Enable webhooks in Odoo
2. Configure webhook URL: `https://bac-platform.com/webhooks/odoo`
3. Test bidirectional sync

### Lesson 3: Sales Orders (30 minutes)

#### Creating Sale Orders

**Use Case:** Convert opportunities to orders

**API Endpoint:**
```http
POST /api/v1/sales/orders
Content-Type: application/json

{
  "partner_id": 123,
  "order_line": [
    {
      "product_id": 45,
      "quantity": 10,
      "price_unit": 99.99,
      "name": "Enterprise License"
    },
    {
      "product_id": 46,
      "quantity": 500,
      "price_unit": 15.00,
      "name": "User Seat"
    }
  ],
  "date_order": "2025-11-14",
  "payment_term": 1
}
```

**Practice Exercise:**
- Create product catalog sync
- Convert opportunity to order
- Verify order in Odoo

### Lesson 4: Invoicing (20 minutes)

#### Creating Invoices

**Use Case:** Automated invoicing from sales orders

**API Endpoint:**
```http
POST /api/v1/accounting/invoices
Content-Type: application/json

{
  "partner_id": 123,
  "move_type": "out_invoice",
  "invoice_date": "2025-11-14",
  "invoice_line_ids": [
    {
      "product_id": 45,
      "quantity": 1,
      "price_unit": 9999.00,
      "name": "Enterprise License - Annual"
    }
  ]
}
```

**Practice Exercise:**
- Set up invoice automation
- Generate invoice from order
- Track payment status

### Lesson 5: Inventory Management (20 minutes)

#### Product Sync

**Use Case:** Sync product catalog

**API Endpoint:**
```http
GET /api/v1/inventory/products
```

**Response:**
```json
{
  "products": [
    {
      "id": 45,
      "name": "Enterprise License",
      "list_price": 9999.00,
      "standard_price": 5000.00,
      "qty_available": 100,
      "type": "service"
    }
  ]
}
```

**Practice Exercise:**
- Sync product catalog
- Update inventory levels
- Monitor stock alerts

### Assessment Quiz: Odoo

1. What authentication method does Odoo use?
2. How do you create a bidirectional sync?
3. What is the difference between leads and opportunities?
4. How do you handle product variants in Odoo?
5. What are the key modules for full ERP functionality?

---

## Zoho Integration Training

### Module Overview

Learn how to integrate BAC Platform with Zoho's comprehensive suite including CRM, Books, Mail, Desk, and People.

### Lesson 1: Setup and Authentication (30 minutes)

#### Step 1: Create Zoho Developer Account

1. Go to [Zoho API Console](https://api-console.zoho.com)
2. Sign in or create account
3. Click "Add Client"
4. Select "Server-based Applications"
5. Enter client details:
   - **Client Name**: BAC Platform
   - **Homepage URL**: https://yourcompany.com
   - **Authorized Redirect URIs**: https://yourcompany.com/oauth/callback

#### Step 2: Generate OAuth Credentials

1. After creating client, note:
   - **Client ID**
   - **Client Secret**
2. Generate authorization code:
   ```
   https://accounts.zoho.com/oauth/v2/auth?
     scope=ZohoCRM.modules.ALL,ZohoBooks.fullaccess.all,ZohoMail.messages.ALL
     &client_id=YOUR_CLIENT_ID
     &response_type=code
     &access_type=offline
     &redirect_uri=YOUR_REDIRECT_URI
   ```
3. Exchange authorization code for refresh token:
   ```bash
   curl -X POST https://accounts.zoho.com/oauth/v2/token \
     -d "code=AUTHORIZATION_CODE" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=YOUR_REDIRECT_URI" \
     -d "grant_type=authorization_code"
   ```

#### Step 3: Configure in BAC Platform

1. Log in to BAC Platform Admin Panel
2. Navigate to "Integrations" > "Zoho"
3. Click "Add New Integration"
4. Enter credentials:
   - **Client ID**: (your client ID)
   - **Client Secret**: (your client secret)
   - **Refresh Token**: (your refresh token)
5. Test connection
6. Save configuration

**Practice Exercise:**
- Create Zoho developer account
- Generate OAuth credentials
- Configure in BAC Platform
- Test connection

### Lesson 2: CRM Integration (30 minutes)

#### Managing Leads and Contacts

**Create Lead:**
```http
POST /api/v1/crm/leads
Content-Type: application/json

{
  "data": [
    {
      "Last_Name": "Smith",
      "First_Name": "John",
      "Company": "Acme Corp",
      "Email": "john.smith@acmecorp.com",
      "Phone": "+1-555-0123",
      "Lead_Source": "Website",
      "Lead_Status": "Not Contacted"
    }
  ]
}
```

**Create Contact:**
```http
POST /api/v1/crm/contacts
Content-Type: application/json

{
  "data": [
    {
      "Last_Name": "Smith",
      "First_Name": "John",
      "Email": "john.smith@acmecorp.com",
      "Account_Name": "Acme Corp",
      "Phone": "+1-555-0123"
    }
  ]
}
```

**Practice Exercise:**
- Sync leads from BAC to Zoho CRM
- Convert lead to contact
- Track deal progression

### Lesson 3: Books Integration (20 minutes)

#### Invoice Management

**Create Invoice:**
```http
POST /api/v1/books/invoices
Content-Type: application/json

{
  "customer_id": "123456",
  "date": "2025-11-14",
  "line_items": [
    {
      "item_id": "789",
      "description": "Enterprise License",
      "rate": 9999.00,
      "quantity": 1
    }
  ],
  "notes": "Payment due in 30 days"
}
```

**Practice Exercise:**
- Create customer in Zoho Books
- Generate invoice
- Track payment status

### Lesson 4: Mail Integration (20 minutes)

#### Sending Emails

**Send Email:**
```http
POST /api/v1/mail/send
Content-Type: application/json

{
  "toAddress": "customer@example.com",
  "fromAddress": "sales@yourcompany.com",
  "subject": "Your Order Confirmation",
  "content": "Thank you for your order!",
  "mailFormat": "html"
}
```

**Practice Exercise:**
- Send transactional emails
- Track email opens
- Manage templates

### Lesson 5: Desk Integration (20 minutes)

#### Support Ticket Management

**Create Ticket:**
```http
POST /api/v1/desk/tickets
Content-Type: application/json

{
  "subject": "Login Issue",
  "description": "Customer unable to log in",
  "email": "customer@example.com",
  "priority": "High",
  "status": "Open",
  "departmentId": "12345"
}
```

**Practice Exercise:**
- Create support tickets
- Auto-assign to agents
- Track resolution time

### Assessment Quiz: Zoho

1. What authentication protocol does Zoho use?
2. How do you generate a refresh token?
3. What's the difference between leads and contacts in Zoho CRM?
4. How do you handle multi-currency in Zoho Books?
5. What are the key metrics to monitor in Zoho Desk?

---

## Advanced Topics

### Module 1: Batch Operations

**Use Case:** Bulk import/export

**Best Practices:**
- Process in batches of 100-200 records
- Implement exponential backoff
- Use parallel processing where allowed
- Monitor API quota usage

### Module 2: Webhook Management

**Setting Up Webhooks:**
1. Configure webhook endpoints in third-party platform
2. Implement webhook handler in BAC Platform
3. Verify webhook signatures
4. Handle retry logic

### Module 3: Error Handling

**Common Errors:**
- Authentication failures
- Rate limit exceeded
- Invalid data format
- Network timeouts

**Resolution Strategies:**
- Implement retry with exponential backoff
- Cache valid authentication tokens
- Validate data before sending
- Monitor error rates

### Module 4: Performance Optimization

**Optimization Techniques:**
- Use caching for frequently accessed data
- Implement request batching
- Optimize database queries
- Use CDN for static assets

---

## Troubleshooting

### Google Workspace Issues

**Problem: Authentication Failure**
- **Solution**: Verify service account credentials, check domain-wide delegation

**Problem: Permission Denied**
- **Solution**: Grant appropriate API scopes, verify user permissions

### Odoo Issues

**Problem: Connection Timeout**
- **Solution**: Check network connectivity, verify Odoo instance is running

**Problem: Record Not Found**
- **Solution**: Verify record ID, check user permissions

### Zoho Issues

**Problem: Invalid Token**
- **Solution**: Refresh access token, verify refresh token hasn't expired

**Problem: API Limit Exceeded**
- **Solution**: Implement rate limiting, upgrade API plan

---

## Certification

### Requirements

To earn BAC Platform Integrations Certification:
1. Complete all training modules
2. Pass assessment quizzes (80% or higher)
3. Complete hands-on projects:
   - Set up all three integrations
   - Implement bidirectional sync
   - Create custom automation

### Final Exam

- **Duration**: 2 hours
- **Format**: Multiple choice + hands-on
- **Passing Score**: 85%

### Certificate Benefits

- Official BAC Platform Integration Specialist badge
- Listed in partner directory
- Priority support access
- Discounts on advanced training

---

## Additional Resources

- **Video Tutorials**: https://learn.bac-platform.com/videos
- **API Documentation**: https://docs.bac-platform.com/api
- **Community Forum**: https://community.bac-platform.com
- **Support**: support@bac-platform.com

---

**Last Updated**: November 14, 2025
**Version**: 1.0.0
