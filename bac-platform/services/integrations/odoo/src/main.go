package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

// OdooService handles all Odoo platform integrations
type OdooService struct {
	baseURL  string
	database string
	username string
	password string
	uid      int
	client   *http.Client
}

// OdooRequest represents a generic Odoo JSON-RPC request
type OdooRequest struct {
	Jsonrpc string                 `json:"jsonrpc"`
	Method  string                 `json:"method"`
	Params  map[string]interface{} `json:"params"`
	ID      int                    `json:"id"`
}

// OdooResponse represents a generic Odoo JSON-RPC response
type OdooResponse struct {
	Jsonrpc string                 `json:"jsonrpc"`
	ID      int                    `json:"id"`
	Result  interface{}            `json:"result,omitempty"`
	Error   map[string]interface{} `json:"error,omitempty"`
}

// CRMLeadRequest represents a CRM lead creation request
type CRMLeadRequest struct {
	Name        string  `json:"name"`
	PartnerName string  `json:"partner_name"`
	Email       string  `json:"email_from"`
	Phone       string  `json:"phone"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"`
	ExpectedRevenue float64 `json:"expected_revenue"`
}

// SaleOrderRequest represents a sale order creation request
type SaleOrderRequest struct {
	PartnerID   int     `json:"partner_id"`
	OrderLine   []OrderLine `json:"order_line"`
	DateOrder   string  `json:"date_order"`
	PaymentTerm int     `json:"payment_term_id"`
}

// OrderLine represents a sale order line
type OrderLine struct {
	ProductID    int     `json:"product_id"`
	Quantity     float64 `json:"product_uom_qty"`
	PriceUnit    float64 `json:"price_unit"`
	Name         string  `json:"name"`
}

// InvoiceRequest represents an invoice creation request
type InvoiceRequest struct {
	PartnerID    int     `json:"partner_id"`
	InvoiceType  string  `json:"move_type"`
	InvoiceDate  string  `json:"invoice_date"`
	InvoiceLines []InvoiceLine `json:"invoice_line_ids"`
}

// InvoiceLine represents an invoice line
type InvoiceLine struct {
	ProductID int     `json:"product_id"`
	Quantity  float64 `json:"quantity"`
	PriceUnit float64 `json:"price_unit"`
	Name      string  `json:"name"`
}

// InventoryRequest represents an inventory operation request
type InventoryRequest struct {
	ProductID int     `json:"product_id"`
	Quantity  float64 `json:"product_qty"`
	LocationID int    `json:"location_id"`
	LocationDestID int `json:"location_dest_id"`
}

// NewOdooService creates a new Odoo service
func NewOdooService(baseURL, database, username, password string) (*OdooService, error) {
	service := &OdooService{
		baseURL:  baseURL,
		database: database,
		username: username,
		password: password,
		client:   &http.Client{},
	}

	// Authenticate
	if err := service.authenticate(); err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	return service, nil
}

// authenticate performs Odoo authentication
func (os *OdooService) authenticate() error {
	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"service":  "common",
			"method":   "authenticate",
			"args":     []interface{}{os.database, os.username, os.password, map[string]interface{}{}},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/session/authenticate", reqData, &result); err != nil {
		return err
	}

	if uid, ok := result.Result.(float64); ok {
		os.uid = int(uid)
		return nil
	}

	return fmt.Errorf("authentication failed: invalid response")
}

// makeRequest performs an HTTP request to Odoo
func (os *OdooService) makeRequest(endpoint string, reqData interface{}, respData interface{}) error {
	jsonData, err := json.Marshal(reqData)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", os.baseURL+endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := os.client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if err := json.Unmarshal(body, respData); err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return nil
}

// CreateCRMLead creates a new CRM lead in Odoo
func (os *OdooService) CreateCRMLead(w http.ResponseWriter, r *http.Request) {
	var req CRMLeadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"model":  "crm.lead",
			"method": "create",
			"args": []interface{}{
				map[string]interface{}{
					"name":             req.Name,
					"partner_name":     req.PartnerName,
					"email_from":       req.Email,
					"phone":            req.Phone,
					"description":      req.Description,
					"priority":         req.Priority,
					"expected_revenue": req.ExpectedRevenue,
				},
			},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/dataset/call_kw", reqData, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create lead: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result.Result)
}

// ListCRMLeads lists CRM leads from Odoo
func (os *OdooService) ListCRMLeads(w http.ResponseWriter, r *http.Request) {
	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"model":  "crm.lead",
			"method": "search_read",
			"args":   []interface{}{[]interface{}{}, []string{"name", "partner_name", "email_from", "phone", "probability", "expected_revenue"}},
			"kwargs": map[string]interface{}{
				"limit": 100,
			},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/dataset/call_kw", reqData, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list leads: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result.Result)
}

// CreateSaleOrder creates a new sale order in Odoo
func (os *OdooService) CreateSaleOrder(w http.ResponseWriter, r *http.Request) {
	var req SaleOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	orderLines := make([]interface{}, len(req.OrderLine))
	for i, line := range req.OrderLine {
		orderLines[i] = []interface{}{0, 0, map[string]interface{}{
			"product_id":      line.ProductID,
			"product_uom_qty": line.Quantity,
			"price_unit":      line.PriceUnit,
			"name":            line.Name,
		}}
	}

	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"model":  "sale.order",
			"method": "create",
			"args": []interface{}{
				map[string]interface{}{
					"partner_id":       req.PartnerID,
					"order_line":       orderLines,
					"date_order":       req.DateOrder,
					"payment_term_id":  req.PaymentTerm,
				},
			},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/dataset/call_kw", reqData, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create sale order: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result.Result)
}

// CreateInvoice creates a new invoice in Odoo
func (os *OdooService) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	var req InvoiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	invoiceLines := make([]interface{}, len(req.InvoiceLines))
	for i, line := range req.InvoiceLines {
		invoiceLines[i] = []interface{}{0, 0, map[string]interface{}{
			"product_id": line.ProductID,
			"quantity":   line.Quantity,
			"price_unit": line.PriceUnit,
			"name":       line.Name,
		}}
	}

	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"model":  "account.move",
			"method": "create",
			"args": []interface{}{
				map[string]interface{}{
					"partner_id":         req.PartnerID,
					"move_type":          req.InvoiceType,
					"invoice_date":       req.InvoiceDate,
					"invoice_line_ids":   invoiceLines,
				},
			},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/dataset/call_kw", reqData, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create invoice: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result.Result)
}

// ListProducts lists products from Odoo
func (os *OdooService) ListProducts(w http.ResponseWriter, r *http.Request) {
	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"model":  "product.product",
			"method": "search_read",
			"args":   []interface{}{[]interface{}{}, []string{"name", "list_price", "standard_price", "qty_available", "type"}},
			"kwargs": map[string]interface{}{
				"limit": 100,
			},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/dataset/call_kw", reqData, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list products: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result.Result)
}

// ListInventory lists inventory from Odoo
func (os *OdooService) ListInventory(w http.ResponseWriter, r *http.Request) {
	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"model":  "stock.quant",
			"method": "search_read",
			"args":   []interface{}{[]interface{}{}, []string{"product_id", "location_id", "quantity", "reserved_quantity"}},
			"kwargs": map[string]interface{}{
				"limit": 100,
			},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/dataset/call_kw", reqData, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list inventory: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result.Result)
}

// ListEmployees lists employees from Odoo HR
func (os *OdooService) ListEmployees(w http.ResponseWriter, r *http.Request) {
	reqData := OdooRequest{
		Jsonrpc: "2.0",
		Method:  "call",
		Params: map[string]interface{}{
			"model":  "hr.employee",
			"method": "search_read",
			"args":   []interface{}{[]interface{}{}, []string{"name", "job_id", "department_id", "work_email", "work_phone"}},
			"kwargs": map[string]interface{}{
				"limit": 100,
			},
		},
		ID: 1,
	}

	var result OdooResponse
	if err := os.makeRequest("/web/dataset/call_kw", reqData, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list employees: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result.Result)
}

// HealthCheck returns service health status
func (os *OdooService) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "odoo-integration",
	})
}

func main() {
	ctx := context.Background()
	_ = ctx

	// Load configuration from environment
	baseURL := os.Getenv("ODOO_BASE_URL")
	database := os.Getenv("ODOO_DATABASE")
	username := os.Getenv("ODOO_USERNAME")
	password := os.Getenv("ODOO_PASSWORD")

	if baseURL == "" || database == "" || username == "" || password == "" {
		log.Fatal("ODOO_BASE_URL, ODOO_DATABASE, ODOO_USERNAME, and ODOO_PASSWORD environment variables are required")
	}

	// Initialize service
	service, err := NewOdooService(baseURL, database, username, password)
	if err != nil {
		log.Fatalf("Failed to initialize Odoo service: %v", err)
	}

	// Setup router
	r := mux.NewRouter()

	// CRM endpoints
	r.HandleFunc("/api/v1/crm/leads", service.CreateCRMLead).Methods("POST")
	r.HandleFunc("/api/v1/crm/leads", service.ListCRMLeads).Methods("GET")

	// Sales endpoints
	r.HandleFunc("/api/v1/sales/orders", service.CreateSaleOrder).Methods("POST")

	// Accounting endpoints
	r.HandleFunc("/api/v1/accounting/invoices", service.CreateInvoice).Methods("POST")

	// Inventory endpoints
	r.HandleFunc("/api/v1/inventory/products", service.ListProducts).Methods("GET")
	r.HandleFunc("/api/v1/inventory/stock", service.ListInventory).Methods("GET")

	// HR endpoints
	r.HandleFunc("/api/v1/hr/employees", service.ListEmployees).Methods("GET")

	// Health check
	r.HandleFunc("/health", service.HealthCheck).Methods("GET")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Odoo Integration Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
