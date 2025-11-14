package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/gorilla/mux"
)

// ZohoService handles all Zoho platform integrations
type ZohoService struct {
	baseURL      string
	accessToken  string
	refreshToken string
	clientID     string
	clientSecret string
	client       *http.Client
}

// ZohoCRMRequest represents a Zoho CRM record creation request
type ZohoCRMRequest struct {
	Data []map[string]interface{} `json:"data"`
}

// ZohoMailRequest represents a Zoho Mail API request
type ZohoMailRequest struct {
	ToAddress   string `json:"toAddress"`
	Subject     string `json:"subject"`
	Content     string `json:"content"`
	MailFormat  string `json:"mailFormat"`
	FromAddress string `json:"fromAddress"`
}

// ZohoBooksInvoiceRequest represents a Zoho Books invoice request
type ZohoBooksInvoiceRequest struct {
	CustomerID   string                   `json:"customer_id"`
	Date         string                   `json:"date"`
	LineItems    []ZohoBooksLineItem      `json:"line_items"`
	Notes        string                   `json:"notes"`
}

// ZohoBooksLineItem represents an invoice line item
type ZohoBooksLineItem struct {
	ItemID      string  `json:"item_id"`
	Description string  `json:"description"`
	Rate        float64 `json:"rate"`
	Quantity    float64 `json:"quantity"`
}

// ZohoDeskTicketRequest represents a Zoho Desk ticket request
type ZohoDeskTicketRequest struct {
	Subject     string `json:"subject"`
	Description string `json:"description"`
	Email       string `json:"email"`
	Priority    string `json:"priority"`
	Status      string `json:"status"`
	DepartmentID string `json:"departmentId"`
}

// NewZohoService creates a new Zoho service
func NewZohoService(baseURL, clientID, clientSecret, refreshToken string) (*ZohoService, error) {
	service := &ZohoService{
		baseURL:      baseURL,
		clientID:     clientID,
		clientSecret: clientSecret,
		refreshToken: refreshToken,
		client:       &http.Client{},
	}

	// Get access token
	if err := service.refreshAccessToken(); err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	return service, nil
}

// refreshAccessToken refreshes the Zoho access token
func (zs *ZohoService) refreshAccessToken() error {
	data := url.Values{}
	data.Set("refresh_token", zs.refreshToken)
	data.Set("client_id", zs.clientID)
	data.Set("client_secret", zs.clientSecret)
	data.Set("grant_type", "refresh_token")

	req, err := http.NewRequest("POST", "https://accounts.zoho.com/oauth/v2/token", bytes.NewBufferString(data.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := zs.client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	zs.accessToken = result.AccessToken
	return nil
}

// makeRequest performs an HTTP request to Zoho API
func (zs *ZohoService) makeRequest(method, endpoint string, body interface{}, result interface{}) error {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, zs.baseURL+endpoint, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Zoho-oauthtoken "+zs.accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := zs.client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("API error: %s", string(respBody))
	}

	if result != nil {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return nil
}

// CreateCRMLead creates a new lead in Zoho CRM
func (zs *ZohoService) CreateCRMLead(w http.ResponseWriter, r *http.Request) {
	var req ZohoCRMRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var result interface{}
	if err := zs.makeRequest("POST", "/crm/v2/Leads", req, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create lead: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

// ListCRMLeads lists leads from Zoho CRM
func (zs *ZohoService) ListCRMLeads(w http.ResponseWriter, r *http.Request) {
	var result interface{}
	if err := zs.makeRequest("GET", "/crm/v2/Leads", nil, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list leads: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// CreateCRMContact creates a new contact in Zoho CRM
func (zs *ZohoService) CreateCRMContact(w http.ResponseWriter, r *http.Request) {
	var req ZohoCRMRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var result interface{}
	if err := zs.makeRequest("POST", "/crm/v2/Contacts", req, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create contact: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

// ListCRMContacts lists contacts from Zoho CRM
func (zs *ZohoService) ListCRMContacts(w http.ResponseWriter, r *http.Request) {
	var result interface{}
	if err := zs.makeRequest("GET", "/crm/v2/Contacts", nil, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list contacts: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// SendMail sends an email via Zoho Mail
func (zs *ZohoService) SendMail(w http.ResponseWriter, r *http.Request) {
	var req ZohoMailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var result interface{}
	if err := zs.makeRequest("POST", "/mail/v1/accounts/me/messages", req, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to send mail: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// CreateBooksInvoice creates an invoice in Zoho Books
func (zs *ZohoService) CreateBooksInvoice(w http.ResponseWriter, r *http.Request) {
	var req ZohoBooksInvoiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var result interface{}
	if err := zs.makeRequest("POST", "/books/v3/invoices", req, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create invoice: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

// ListBooksInvoices lists invoices from Zoho Books
func (zs *ZohoService) ListBooksInvoices(w http.ResponseWriter, r *http.Request) {
	var result interface{}
	if err := zs.makeRequest("GET", "/books/v3/invoices", nil, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list invoices: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// CreateDeskTicket creates a support ticket in Zoho Desk
func (zs *ZohoService) CreateDeskTicket(w http.ResponseWriter, r *http.Request) {
	var req ZohoDeskTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var result interface{}
	if err := zs.makeRequest("POST", "/desk/v1/tickets", req, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create ticket: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

// ListDeskTickets lists support tickets from Zoho Desk
func (zs *ZohoService) ListDeskTickets(w http.ResponseWriter, r *http.Request) {
	var result interface{}
	if err := zs.makeRequest("GET", "/desk/v1/tickets", nil, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list tickets: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// ListPeopleEmployees lists employees from Zoho People
func (zs *ZohoService) ListPeopleEmployees(w http.ResponseWriter, r *http.Request) {
	var result interface{}
	if err := zs.makeRequest("GET", "/people/v1/employees", nil, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list employees: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// ListInventoryItems lists inventory items from Zoho Inventory
func (zs *ZohoService) ListInventoryItems(w http.ResponseWriter, r *http.Request) {
	var result interface{}
	if err := zs.makeRequest("GET", "/inventory/v1/items", nil, &result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to list items: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// HealthCheck returns service health status
func (zs *ZohoService) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "zoho-integration",
	})
}

func main() {
	ctx := context.Background()
	_ = ctx

	// Load configuration from environment
	baseURL := os.Getenv("ZOHO_BASE_URL")
	clientID := os.Getenv("ZOHO_CLIENT_ID")
	clientSecret := os.Getenv("ZOHO_CLIENT_SECRET")
	refreshToken := os.Getenv("ZOHO_REFRESH_TOKEN")

	if baseURL == "" {
		baseURL = "https://www.zohoapis.com"
	}

	if clientID == "" || clientSecret == "" || refreshToken == "" {
		log.Fatal("ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN environment variables are required")
	}

	// Initialize service
	service, err := NewZohoService(baseURL, clientID, clientSecret, refreshToken)
	if err != nil {
		log.Fatalf("Failed to initialize Zoho service: %v", err)
	}

	// Setup router
	r := mux.NewRouter()

	// CRM endpoints
	r.HandleFunc("/api/v1/crm/leads", service.CreateCRMLead).Methods("POST")
	r.HandleFunc("/api/v1/crm/leads", service.ListCRMLeads).Methods("GET")
	r.HandleFunc("/api/v1/crm/contacts", service.CreateCRMContact).Methods("POST")
	r.HandleFunc("/api/v1/crm/contacts", service.ListCRMContacts).Methods("GET")

	// Mail endpoints
	r.HandleFunc("/api/v1/mail/send", service.SendMail).Methods("POST")

	// Books endpoints
	r.HandleFunc("/api/v1/books/invoices", service.CreateBooksInvoice).Methods("POST")
	r.HandleFunc("/api/v1/books/invoices", service.ListBooksInvoices).Methods("GET")

	// Desk endpoints
	r.HandleFunc("/api/v1/desk/tickets", service.CreateDeskTicket).Methods("POST")
	r.HandleFunc("/api/v1/desk/tickets", service.ListDeskTickets).Methods("GET")

	// People endpoints
	r.HandleFunc("/api/v1/people/employees", service.ListPeopleEmployees).Methods("GET")

	// Inventory endpoints
	r.HandleFunc("/api/v1/inventory/items", service.ListInventoryItems).Methods("GET")

	// Health check
	r.HandleFunc("/health", service.HealthCheck).Methods("GET")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Zoho Integration Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
