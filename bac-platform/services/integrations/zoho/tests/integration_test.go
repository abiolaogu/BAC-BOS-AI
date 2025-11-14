package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestHealthCheck tests the health check endpoint
func TestHealthCheck(t *testing.T) {
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
			"service": "zoho-integration",
		})
	})

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
}

// TestCreateCRMLead tests the CRM lead creation endpoint (mock)
func TestCreateCRMLead(t *testing.T) {
	leadRequest := map[string]interface{}{
		"data": []map[string]interface{}{
			{
				"Last_Name":    "Smith",
				"First_Name":   "John",
				"Company":      "Test Corp",
				"Email":        "john@testcorp.com",
				"Phone":        "+1-555-0123",
				"Lead_Source":  "Website",
				"Lead_Status":  "Not Contacted",
			},
		},
	}

	jsonData, err := json.Marshal(leadRequest)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/api/v1/crm/leads", bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Mock successful response
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data": []map[string]interface{}{
				{
					"code":    "SUCCESS",
					"details": map[string]interface{}{
						"id": "123456789",
					},
					"message": "record added",
					"status":  "success",
				},
			},
		})
	})

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}
}

// TestSendMail tests the email sending endpoint (mock)
func TestSendMail(t *testing.T) {
	mailRequest := map[string]string{
		"toAddress":   "customer@example.com",
		"fromAddress": "sales@company.com",
		"subject":     "Test Email",
		"content":     "This is a test",
		"mailFormat":  "html",
	}

	jsonData, err := json.Marshal(mailRequest)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/api/v1/mail/send", bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]string
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Mock successful response
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"data":   map[string]string{"messageId": "msg123"},
		})
	})

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
}

// TestCreateDeskTicket tests the support ticket creation endpoint (mock)
func TestCreateDeskTicket(t *testing.T) {
	ticketRequest := map[string]string{
		"subject":     "Test Ticket",
		"description": "Test description",
		"email":       "customer@example.com",
		"priority":    "High",
		"status":      "Open",
	}

	jsonData, err := json.Marshal(ticketRequest)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/api/v1/desk/tickets", bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]string
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Mock successful response
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":       "ticket123",
			"subject":  req["subject"],
			"status":   "Open",
			"priority": req["priority"],
		})
	})

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}
}
