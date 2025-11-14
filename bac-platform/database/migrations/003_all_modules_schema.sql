-- ERP, eCommerce, HR, Project Management, Marketing, Support, Analytics, Documents Schema

-- ========================================
-- ERP MODULE
-- ========================================

-- GL Accounts
CREATE TABLE erp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    subtype VARCHAR(50),
    parent_account_id UUID REFERENCES erp_accounts(id),
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    is_system_account BOOLEAN DEFAULT FALSE,
    current_balance_cents BIGINT DEFAULT 0,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, account_number)
);

CREATE INDEX idx_erp_accounts_tenant ON erp_accounts(tenant_id);

-- Journal Entries
CREATE TABLE erp_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    description TEXT,
    reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    lines JSONB DEFAULT '[]',
    total_debit_cents BIGINT DEFAULT 0,
    total_credit_cents BIGINT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_erp_journal_entries_tenant ON erp_journal_entries(tenant_id);

-- Vendors
CREATE TABLE erp_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    vendor_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address JSONB,
    payment_terms VARCHAR(50),
    payment_method VARCHAR(50),
    tax_id VARCHAR(100),
    is_1099_vendor BOOLEAN DEFAULT FALSE,
    credit_limit_cents BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',
    account_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, vendor_number)
);

CREATE INDEX idx_erp_vendors_tenant ON erp_vendors(tenant_id);

-- Bills
CREATE TABLE erp_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    bill_number VARCHAR(50) NOT NULL,
    vendor_id UUID REFERENCES erp_vendors(id),
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms VARCHAR(50),
    line_items JSONB DEFAULT '[]',
    subtotal_cents BIGINT NOT NULL DEFAULT 0,
    tax_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL DEFAULT 0,
    amount_paid_cents BIGINT NOT NULL DEFAULT 0,
    balance_due_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft',
    memo TEXT,
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, bill_number)
);

CREATE INDEX idx_erp_bills_tenant ON erp_bills(tenant_id);
CREATE INDEX idx_erp_bills_vendor ON erp_bills(vendor_id);

-- Customers
CREATE TABLE erp_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    billing_address JSONB,
    shipping_address JSONB,
    payment_terms VARCHAR(50),
    payment_method VARCHAR(50),
    credit_limit_cents BIGINT,
    tax_id VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, customer_number)
);

CREATE INDEX idx_erp_customers_tenant ON erp_customers(tenant_id);

-- Invoices
CREATE TABLE erp_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES erp_customers(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms VARCHAR(50),
    line_items JSONB DEFAULT '[]',
    subtotal_cents BIGINT NOT NULL DEFAULT 0,
    tax_cents BIGINT NOT NULL DEFAULT 0,
    discount_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL DEFAULT 0,
    amount_paid_cents BIGINT NOT NULL DEFAULT 0,
    balance_due_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft',
    memo TEXT,
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_erp_invoices_tenant ON erp_invoices(tenant_id);
CREATE INDEX idx_erp_invoices_customer ON erp_invoices(customer_id);

-- Cash Accounts
CREATE TABLE erp_cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_id UUID REFERENCES erp_accounts(id),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    account_type VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    current_balance_cents BIGINT DEFAULT 0,
    available_balance_cents BIGINT DEFAULT 0,
    last_reconciled TIMESTAMP,
    auto_reconcile BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erp_cash_accounts_tenant ON erp_cash_accounts(tenant_id);

-- Cash Flow Forecasts
CREATE TABLE erp_cash_flow_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    forecast_date DATE NOT NULL,
    period VARCHAR(50) NOT NULL,
    opening_balance_cents BIGINT NOT NULL,
    cash_inflows_cents BIGINT NOT NULL,
    cash_outflows_cents BIGINT NOT NULL,
    net_cash_flow_cents BIGINT NOT NULL,
    closing_balance_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    inflow_items JSONB DEFAULT '[]',
    outflow_items JSONB DEFAULT '[]',
    confidence VARCHAR(50),
    ai_insights JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erp_cfm_tenant ON erp_cash_flow_forecasts(tenant_id);

-- ========================================
-- ECOMMERCE MODULE
-- ========================================

-- Products
CREATE TABLE ecommerce_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    category_id UUID,
    brand VARCHAR(100),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    price_cents BIGINT NOT NULL,
    compare_at_price_cents BIGINT,
    cost_cents BIGINT,
    variants JSONB DEFAULT '[]',
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    is_taxable BOOLEAN DEFAULT TRUE,
    tax_code VARCHAR(50),
    inventory JSONB DEFAULT '{}',
    dimensions JSONB DEFAULT '{}',
    weight DECIMAL(10,2),
    weight_unit VARCHAR(10),
    metadata JSONB DEFAULT '{}',
    seo JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ecommerce_products_tenant ON ecommerce_products(tenant_id);
CREATE INDEX idx_ecommerce_products_sku ON ecommerce_products(sku);

-- Orders
CREATE TABLE ecommerce_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID,
    email VARCHAR(255) NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
    items JSONB DEFAULT '[]',
    subtotal_cents BIGINT NOT NULL DEFAULT 0,
    tax_cents BIGINT NOT NULL DEFAULT 0,
    shipping_cents BIGINT NOT NULL DEFAULT 0,
    discount_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_address JSONB,
    shipping_address JSONB,
    shipping_method JSONB,
    payment_method JSONB,
    notes JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ecommerce_orders_tenant ON ecommerce_orders(tenant_id);
CREATE INDEX idx_ecommerce_orders_number ON ecommerce_orders(order_number);

-- ========================================
-- HR MODULE
-- ========================================

-- Employees
CREATE TABLE hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    address JSONB,
    department_id UUID,
    job_title VARCHAR(100),
    manager_id UUID REFERENCES hr_employees(id),
    hire_date DATE NOT NULL,
    termination_date DATE,
    employment_type VARCHAR(50),
    employment_status VARCHAR(50) DEFAULT 'active',
    salary_cents BIGINT,
    pay_frequency VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    tax_id VARCHAR(100),
    emergency_contact JSONB,
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, employee_number)
);

CREATE INDEX idx_hr_employees_tenant ON hr_employees(tenant_id);
CREATE INDEX idx_hr_employees_status ON hr_employees(employment_status);

-- Departments
CREATE TABLE hr_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    manager_id UUID REFERENCES hr_employees(id),
    parent_department_id UUID REFERENCES hr_departments(id),
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hr_departments_tenant ON hr_departments(tenant_id);

-- Time Entries
CREATE TABLE hr_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID REFERENCES hr_employees(id),
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    hours DECIMAL(10,2),
    type VARCHAR(50) DEFAULT 'regular',
    project_id UUID,
    task_id UUID,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hr_time_entries_tenant ON hr_time_entries(tenant_id);
CREATE INDEX idx_hr_time_entries_employee ON hr_time_entries(employee_id);

-- ========================================
-- PROJECT MANAGEMENT MODULE
-- ========================================

-- Projects
CREATE TABLE pm_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    budget_cents BIGINT,
    actual_cost_cents BIGINT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    owner_id UUID REFERENCES users(id),
    team_member_ids UUID[] DEFAULT ARRAY[]::UUID[],
    priority VARCHAR(50) DEFAULT 'medium',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pm_projects_tenant ON pm_projects(tenant_id);

-- Tasks
CREATE TABLE pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    project_id UUID REFERENCES pm_projects(id),
    parent_task_id UUID REFERENCES pm_tasks(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    assigned_to UUID REFERENCES users(id),
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    dependencies UUID[] DEFAULT ARRAY[]::UUID[],
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pm_tasks_tenant ON pm_tasks(tenant_id);
CREATE INDEX idx_pm_tasks_project ON pm_tasks(project_id);

-- ========================================
-- MARKETING MODULE
-- ========================================

-- Campaigns
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    budget_cents BIGINT,
    spent_cents BIGINT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    target_audience TEXT,
    segments TEXT[] DEFAULT ARRAY[]::TEXT[],
    metrics JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);

-- Email Templates
CREATE TABLE marketing_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    reply_to VARCHAR(255),
    html_content TEXT,
    text_content TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketing_templates_tenant ON marketing_email_templates(tenant_id);

-- ========================================
-- SUPPORT MODULE
-- ========================================

-- Tickets
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(50) DEFAULT 'medium',
    category VARCHAR(100),
    customer_id UUID,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    comments JSONB DEFAULT '[]',
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_number ON support_tickets(ticket_number);

-- Knowledge Base
CREATE TABLE support_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category_id UUID,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_kb_tenant ON support_knowledge_base(tenant_id);

-- ========================================
-- ANALYTICS MODULE
-- ========================================

-- Dashboards
CREATE TABLE analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    widgets JSONB DEFAULT '[]',
    layout TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    shared_with UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_analytics_dashboards_tenant ON analytics_dashboards(tenant_id);

-- Reports
CREATE TABLE analytics_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    query TEXT,
    columns JSONB DEFAULT '[]',
    filters JSONB DEFAULT '[]',
    schedule VARCHAR(100),
    recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
    format VARCHAR(50),
    last_run TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_reports_tenant ON analytics_reports(tenant_id);

-- ========================================
-- DOCUMENTS MODULE
-- ========================================

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    file_type VARCHAR(50),
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    url TEXT,
    folder_id UUID,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version VARCHAR(50) DEFAULT '1.0',
    versions JSONB DEFAULT '[]',
    shares JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_encrypted BOOLEAN DEFAULT FALSE,
    checksum VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);

-- Folders
CREATE TABLE document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES document_folders(id),
    path TEXT,
    document_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_folders_tenant ON document_folders(tenant_id);
CREATE INDEX idx_document_folders_parent ON document_folders(parent_folder_id);
