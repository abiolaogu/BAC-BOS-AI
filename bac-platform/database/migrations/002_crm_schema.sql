-- CRM Module Schema

-- Companies
CREATE TABLE crm_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(50),
    employee_count INTEGER,
    annual_revenue_cents BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',
    address JSONB,
    status VARCHAR(50) DEFAULT 'active',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_crm_companies_tenant ON crm_companies(tenant_id);
CREATE INDEX idx_crm_companies_name ON crm_companies(name);

-- Contacts
CREATE TABLE crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    title VARCHAR(100),
    company_id UUID REFERENCES crm_companies(id),
    company_name VARCHAR(255),
    address JSONB,
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_crm_contacts_tenant ON crm_contacts(tenant_id);
CREATE INDEX idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX idx_crm_contacts_company ON crm_contacts(company_id);

-- Leads
CREATE TABLE crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    title VARCHAR(100),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    assigned_to UUID REFERENCES users(id),
    estimated_value_cents BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',
    expected_close_date DATE,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_crm_leads_tenant ON crm_leads(tenant_id);
CREATE INDEX idx_crm_leads_assigned ON crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);

-- Opportunities
CREATE TABLE crm_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES crm_companies(id),
    contact_id UUID REFERENCES crm_contacts(id),
    stage VARCHAR(50) NOT NULL,
    amount_cents BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',
    probability DECIMAL(5,2) CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    actual_close_date DATE,
    assigned_to UUID REFERENCES users(id),
    lead_source VARCHAR(100),
    next_step TEXT,
    description TEXT,
    competitors TEXT[] DEFAULT ARRAY[]::TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_crm_opportunities_tenant ON crm_opportunities(tenant_id);
CREATE INDEX idx_crm_opportunities_stage ON crm_opportunities(stage);
CREATE INDEX idx_crm_opportunities_assigned ON crm_opportunities(assigned_to);

-- Activities
CREATE TABLE crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    type VARCHAR(50) NOT NULL, -- call, email, meeting, task, note
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    due_date TIMESTAMP,
    completed_date TIMESTAMP,
    assigned_to UUID REFERENCES users(id),
    related_to_type VARCHAR(50), -- contact, lead, opportunity, company
    related_to_id UUID,
    duration_minutes INTEGER,
    outcome VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_crm_activities_tenant ON crm_activities(tenant_id);
CREATE INDEX idx_crm_activities_assigned ON crm_activities(assigned_to);
CREATE INDEX idx_crm_activities_related ON crm_activities(related_to_type, related_to_id);

-- Quotes/CPQ
CREATE TABLE crm_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    opportunity_id UUID REFERENCES crm_opportunities(id),
    contact_id UUID REFERENCES crm_contacts(id),
    company_id UUID REFERENCES crm_companies(id),
    quote_date DATE NOT NULL,
    expiration_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    line_items JSONB DEFAULT '[]',
    subtotal_cents BIGINT NOT NULL DEFAULT 0,
    tax_cents BIGINT NOT NULL DEFAULT 0,
    discount_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    terms TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_crm_quotes_tenant ON crm_quotes(tenant_id);
CREATE INDEX idx_crm_quotes_number ON crm_quotes(quote_number);
CREATE INDEX idx_crm_quotes_opportunity ON crm_quotes(opportunity_id);

-- Sales Forecasts
CREATE TABLE crm_sales_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    period VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER,
    month INTEGER,
    user_id UUID REFERENCES users(id),
    team_id UUID,
    forecasted_amount_cents BIGINT NOT NULL,
    pipeline_amount_cents BIGINT NOT NULL,
    closed_amount_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    win_rate DECIMAL(5,2),
    opportunity_count INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_crm_forecasts_tenant ON crm_sales_forecasts(tenant_id);
CREATE INDEX idx_crm_forecasts_period ON crm_sales_forecasts(year, quarter, month);

-- Apply update triggers
CREATE TRIGGER update_crm_companies_updated_at BEFORE UPDATE ON crm_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_leads_updated_at BEFORE UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_opportunities_updated_at BEFORE UPDATE ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_activities_updated_at BEFORE UPDATE ON crm_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_quotes_updated_at BEFORE UPDATE ON crm_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_forecasts_updated_at BEFORE UPDATE ON crm_sales_forecasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
