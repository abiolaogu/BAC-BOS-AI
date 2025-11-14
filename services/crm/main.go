package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// Contact represents a customer contact
type Contact struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	FirstName   string    `json:"first_name" binding:"required"`
	LastName    string    `json:"last_name" binding:"required"`
	Email       string    `json:"email" binding:"required,email"`
	Phone       string    `json:"phone"`
	Company     string    `json:"company"`
	Title       string    `json:"title"`
	Source      string    `json:"source"`
	Status      string    `json:"status"`
	Tags        []string  `json:"tags"`
	CustomFields map[string]interface{} `json:"custom_fields"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Lead represents a sales lead
type Lead struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	ContactID   string    `json:"contact_id"`
	Title       string    `json:"title" binding:"required"`
	Value       float64   `json:"value"`
	Currency    string    `json:"currency"`
	Source      string    `json:"source"`
	Status      string    `json:"status"` // new, contacted, qualified, lost, converted
	Stage       string    `json:"stage"`
	OwnerID     string    `json:"owner_id"`
	Priority    string    `json:"priority"` // low, medium, high, urgent
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	ConvertedAt *time.Time `json:"converted_at,omitempty"`
}

// Opportunity represents a sales opportunity
type Opportunity struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	ContactID     string    `json:"contact_id"`
	LeadID        string    `json:"lead_id,omitempty"`
	Name          string    `json:"name" binding:"required"`
	Amount        float64   `json:"amount" binding:"required"`
	Currency      string    `json:"currency"`
	Stage         string    `json:"stage"` // prospect, qualification, proposal, negotiation, closed-won, closed-lost
	Probability   int       `json:"probability"` // 0-100
	CloseDate     time.Time `json:"close_date"`
	OwnerID       string    `json:"owner_id"`
	ProductsServices []string `json:"products_services"`
	Notes         string    `json:"notes"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	ClosedAt      *time.Time `json:"closed_at,omitempty"`
}

// CRMService handles CRM operations
type CRMService struct {
	db *sql.DB
}

func NewCRMService(db *sql.DB) *CRMService {
	return &CRMService{db: db}
}

// Initialize database schema
func (s *CRMService) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS contacts (
		id UUID PRIMARY KEY,
		tenant_id UUID NOT NULL,
		first_name VARCHAR(100) NOT NULL,
		last_name VARCHAR(100) NOT NULL,
		email VARCHAR(255) NOT NULL,
		phone VARCHAR(50),
		company VARCHAR(200),
		title VARCHAR(100),
		source VARCHAR(50),
		status VARCHAR(50) DEFAULT 'active',
		tags TEXT[],
		custom_fields JSONB,
		created_at TIMESTAMP DEFAULT NOW(),
		updated_at TIMESTAMP DEFAULT NOW(),
		UNIQUE(tenant_id, email)
	);

	CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
	CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
	CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

	CREATE TABLE IF NOT EXISTS leads (
		id UUID PRIMARY KEY,
		tenant_id UUID NOT NULL,
		contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
		title VARCHAR(200) NOT NULL,
		value DECIMAL(15,2),
		currency VARCHAR(3),
		source VARCHAR(50),
		status VARCHAR(50) DEFAULT 'new',
		stage VARCHAR(50),
		owner_id UUID,
		priority VARCHAR(20) DEFAULT 'medium',
		tags TEXT[],
		created_at TIMESTAMP DEFAULT NOW(),
		updated_at TIMESTAMP DEFAULT NOW(),
		converted_at TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
	CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
	CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);

	CREATE TABLE IF NOT EXISTS opportunities (
		id UUID PRIMARY KEY,
		tenant_id UUID NOT NULL,
		contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
		lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
		name VARCHAR(200) NOT NULL,
		amount DECIMAL(15,2) NOT NULL,
		currency VARCHAR(3),
		stage VARCHAR(50) DEFAULT 'prospect',
		probability INT DEFAULT 0,
		close_date DATE,
		owner_id UUID,
		products_services TEXT[],
		notes TEXT,
		created_at TIMESTAMP DEFAULT NOW(),
		updated_at TIMESTAMP DEFAULT NOW(),
		closed_at TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_opps_tenant ON opportunities(tenant_id);
	CREATE INDEX IF NOT EXISTS idx_opps_stage ON opportunities(stage);
	CREATE INDEX IF NOT EXISTS idx_opps_owner ON opportunities(owner_id);
	`

	_, err := s.db.Exec(schema)
	return err
}

// Contact handlers
func (s *CRMService) CreateContact(c *gin.Context) {
	var contact Contact
	if err := c.ShouldBindJSON(&contact); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	contact.ID = uuid.New().String()
	contact.TenantID = c.GetString("tenant_id") // From auth middleware
	contact.CreatedAt = time.Now()
	contact.UpdatedAt = time.Now()
	contact.Status = "active"

	tagsJSON, _ := json.Marshal(contact.Tags)
	customFieldsJSON, _ := json.Marshal(contact.CustomFields)

	query := `
		INSERT INTO contacts (id, tenant_id, first_name, last_name, email, phone, company, title, source, status, tags, custom_fields, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err := s.db.Exec(query,
		contact.ID, contact.TenantID, contact.FirstName, contact.LastName,
		contact.Email, contact.Phone, contact.Company, contact.Title,
		contact.Source, contact.Status, tagsJSON, customFieldsJSON,
		contact.CreatedAt, contact.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create contact"})
		return
	}

	c.JSON(http.StatusCreated, contact)
}

func (s *CRMService) GetContact(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	var contact Contact
	var tagsJSON, customFieldsJSON []byte

	query := `
		SELECT id, tenant_id, first_name, last_name, email, phone, company, title, source, status, tags, custom_fields, created_at, updated_at
		FROM contacts
		WHERE id = $1 AND tenant_id = $2
	`

	err := s.db.QueryRow(query, id, tenantID).Scan(
		&contact.ID, &contact.TenantID, &contact.FirstName, &contact.LastName,
		&contact.Email, &contact.Phone, &contact.Company, &contact.Title,
		&contact.Source, &contact.Status, &tagsJSON, &customFieldsJSON,
		&contact.CreatedAt, &contact.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	json.Unmarshal(tagsJSON, &contact.Tags)
	json.Unmarshal(customFieldsJSON, &contact.CustomFields)

	c.JSON(http.StatusOK, contact)
}

func (s *CRMService) ListContacts(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	query := `
		SELECT id, tenant_id, first_name, last_name, email, phone, company, title, source, status, created_at, updated_at
		FROM contacts
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`

	rows, err := s.db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	contacts := []Contact{}
	for rows.Next() {
		var contact Contact
		err := rows.Scan(
			&contact.ID, &contact.TenantID, &contact.FirstName, &contact.LastName,
			&contact.Email, &contact.Phone, &contact.Company, &contact.Title,
			&contact.Source, &contact.Status, &contact.CreatedAt, &contact.UpdatedAt,
		)
		if err != nil {
			continue
		}
		contacts = append(contacts, contact)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": contacts,
		"total": len(contacts),
	})
}

// Lead handlers
func (s *CRMService) CreateLead(c *gin.Context) {
	var lead Lead
	if err := c.ShouldBindJSON(&lead); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lead.ID = uuid.New().String()
	lead.TenantID = c.GetString("tenant_id")
	lead.CreatedAt = time.Now()
	lead.UpdatedAt = time.Now()
	lead.Status = "new"

	tagsJSON, _ := json.Marshal(lead.Tags)

	query := `
		INSERT INTO leads (id, tenant_id, contact_id, title, value, currency, source, status, stage, owner_id, priority, tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err := s.db.Exec(query,
		lead.ID, lead.TenantID, lead.ContactID, lead.Title, lead.Value,
		lead.Currency, lead.Source, lead.Status, lead.Stage, lead.OwnerID,
		lead.Priority, tagsJSON, lead.CreatedAt, lead.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create lead"})
		return
	}

	c.JSON(http.StatusCreated, lead)
}

// Opportunity handlers
func (s *CRMService) CreateOpportunity(c *gin.Context) {
	var opp Opportunity
	if err := c.ShouldBindJSON(&opp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	opp.ID = uuid.New().String()
	opp.TenantID = c.GetString("tenant_id")
	opp.CreatedAt = time.Now()
	opp.UpdatedAt = time.Now()
	opp.Stage = "prospect"
	opp.Probability = 10

	productsJSON, _ := json.Marshal(opp.ProductsServices)

	query := `
		INSERT INTO opportunities (id, tenant_id, contact_id, lead_id, name, amount, currency, stage, probability, close_date, owner_id, products_services, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	_, err := s.db.Exec(query,
		opp.ID, opp.TenantID, opp.ContactID, opp.LeadID, opp.Name,
		opp.Amount, opp.Currency, opp.Stage, opp.Probability, opp.CloseDate,
		opp.OwnerID, productsJSON, opp.Notes, opp.CreatedAt, opp.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create opportunity"})
		return
	}

	c.JSON(http.StatusCreated, opp)
}

// Middleware to extract tenant ID from JWT
func tenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// In production, extract from JWT token
		// For demo, use header
		tenantID := c.GetHeader("X-Tenant-ID")
		if tenantID == "" {
			tenantID = "demo-tenant"
		}
		c.Set("tenant_id", tenantID)
		c.Next()
	}
}

func main() {
	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/nexus_crm?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize service
	service := NewCRMService(db)
	if err := service.InitSchema(); err != nil {
		log.Fatal("Failed to initialize schema:", err)
	}

	// Setup router
	router := gin.Default()
	router.Use(tenantMiddleware())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"service": "crm",
			"version": "1.0.0",
		})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Contacts
		api.POST("/contacts", service.CreateContact)
		api.GET("/contacts", service.ListContacts)
		api.GET("/contacts/:id", service.GetContact)

		// Leads
		api.POST("/leads", service.CreateLead)

		// Opportunities
		api.POST("/opportunities", service.CreateOpportunity)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("🚀 NEXUS CRM Service starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
