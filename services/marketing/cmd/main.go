package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type Campaign struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Status string  `json:"status"`
	Budget float64 `json:"budget"`
}

var campaigns = []Campaign{
	{ID: "1", Name: "Summer Sale", Status: "Active", Budget: 5000.00},
	{ID: "2", Name: "Black Friday", Status: "Draft", Budget: 10000.00},
}

func handleCampaigns(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaigns)
}

func main() {
	http.HandleFunc("/api/v1/campaigns", handleCampaigns)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	log.Printf("Marketing Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
