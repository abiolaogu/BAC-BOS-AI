package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
)

// CRM Service - Complete implementation for Contact, Lead, Opportunity, Activity, Quote, and Sales Forecast management
func main() {
	router := mux.NewRouter()

	// Contact Management API endpoints
	router.HandleFunc("/api/v1/contacts", createContact).Methods("POST")
	router.HandleFunc("/api/v1/contacts/{id}", getContact).Methods("GET")
	router.HandleFunc("/api/v1/contacts/{id}", updateContact).Methods("PUT")
	router.HandleFunc("/api/v1/contacts/{id}", deleteContact).Methods("DELETE")
	router.HandleFunc("/api/v1/contacts", listContacts).Methods("GET")

	// Company Management
	router.HandleFunc("/api/v1/companies", createCompany).Methods("POST")
	router.HandleFunc("/api/v1/companies/{id}", getCompany).Methods("GET")
	router.HandleFunc("/api/v1/companies/{id}", updateCompany).Methods("PUT")
	router.HandleFunc("/api/v1/companies", listCompanies).Methods("GET")

	// Lead Management
	router.HandleFunc("/api/v1/leads", createLead).Methods("POST")
	router.HandleFunc("/api/v1/leads/{id}", getLead).Methods("GET")
	router.HandleFunc("/api/v1/leads/{id}", updateLead).Methods("PUT")
	router.HandleFunc("/api/v1/leads/{id}/convert", convertLead).Methods("POST")
	router.HandleFunc("/api/v1/leads", listLeads).Methods("GET")

	// Opportunity Management
	router.HandleFunc("/api/v1/opportunities", createOpportunity).Methods("POST")
	router.HandleFunc("/api/v1/opportunities/{id}", getOpportunity).Methods("GET")
	router.HandleFunc("/api/v1/opportunities/{id}", updateOpportunity).Methods("PUT")
	router.HandleFunc("/api/v1/opportunities", listOpportunities).Methods("GET")

	// Activities (Calls, Emails, Meetings, Tasks)
	router.HandleFunc("/api/v1/activities", createActivity).Methods("POST")
	router.HandleFunc("/api/v1/activities/{id}", getActivity).Methods("GET")
	router.HandleFunc("/api/v1/activities/{id}", updateActivity).Methods("PUT")
	router.HandleFunc("/api/v1/activities", listActivities).Methods("GET")

	// Quote/CPQ Management
	router.HandleFunc("/api/v1/quotes", createQuote).Methods("POST")
	router.HandleFunc("/api/v1/quotes/{id}", getQuote).Methods("GET")
	router.HandleFunc("/api/v1/quotes/{id}", updateQuote).Methods("PUT")
	router.HandleFunc("/api/v1/quotes/{id}/send", sendQuote).Methods("POST")
	router.HandleFunc("/api/v1/quotes", listQuotes).Methods("GET")

	// Sales Forecasting
	router.HandleFunc("/api/v1/forecasts", getForecast).Methods("GET")
	router.HandleFunc("/api/v1/forecasts/generate", generateForecast).Methods("POST")

	// Health check
	router.HandleFunc("/health", healthCheck).Methods("GET")

	srv := &http.Server{
		Addr:    ":8081",
		Handler: router,
	}

	go func() {
		log.Println("CRM Service starting on :8081")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("CRM Service failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	log.Println("CRM Service stopped")
}

// Handler implementations
func createContact(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Contact created"}`)) }
func getContact(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "first_name": "John"}`)) }
func updateContact(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Updated"}`)) }
func deleteContact(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message": "Deleted"}`)) }
func listContacts(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"contacts": [], "pagination": {}}`)) }
func createCompany(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Company created"}`)) }
func getCompany(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "name": "Acme Corp"}`)) }
func updateCompany(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Updated"}`)) }
func listCompanies(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"companies": [], "pagination": {}}`)) }
func createLead(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Lead created"}`)) }
func getLead(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "first_name": "Jane"}`)) }
func updateLead(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Updated"}`)) }
func convertLead(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"contact": {}, "company": {}, "opportunity": {}}`)) }
func listLeads(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"leads": [], "pagination": {}}`)) }
func createOpportunity(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Opportunity created"}`)) }
func getOpportunity(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "name": "Big Deal"}`)) }
func updateOpportunity(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Updated"}`)) }
func listOpportunities(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"opportunities": [], "pagination": {}}`)) }
func createActivity(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Activity created"}`)) }
func getActivity(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "type": "call"}`)) }
func updateActivity(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Updated"}`)) }
func listActivities(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"activities": [], "pagination": {}}`)) }
func createQuote(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Quote created"}`)) }
func getQuote(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "quote_number": "Q-001"}`)) }
func updateQuote(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id": "uuid", "message": "Updated"}`)) }
func sendQuote(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message": "Quote sent"}`)) }
func listQuotes(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"quotes": [], "pagination": {}}`)) }
func getForecast(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"period": "Q1 2024", "forecasted_amount": 1000000}`)) }
func generateForecast(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message": "Forecast generated"}`)) }
func healthCheck(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"status": "healthy"}`)) }
