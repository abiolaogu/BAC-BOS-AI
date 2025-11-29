package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type Product struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	SKU   string  `json:"sku"`
	Stock int     `json:"stock"`
	Price float64 `json:"price"`
}

var products = []Product{
	{ID: "1", Name: "Laptop", SKU: "LAP-001", Stock: 50, Price: 999.99},
	{ID: "2", Name: "Mouse", SKU: "MOU-001", Stock: 200, Price: 29.99},
}

func handleProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func main() {
	http.HandleFunc("/api/v1/products", handleProducts)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	log.Printf("Inventory Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
