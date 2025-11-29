package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type Ticket struct {
	ID       string `json:"id"`
	Subject  string `json:"subject"`
	Status   string `json:"status"`
	Priority string `json:"priority"`
}

var tickets = []Ticket{
	{ID: "1", Subject: "Login Issue", Status: "Open", Priority: "High"},
	{ID: "2", Subject: "Feature Request", Status: "Pending", Priority: "Low"},
}

func handleTickets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tickets)
}

func main() {
	http.HandleFunc("/api/v1/tickets", handleTickets)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8089"
	}

	log.Printf("Support Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
