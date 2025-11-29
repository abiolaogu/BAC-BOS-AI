package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type Employee struct {
	ID         string `json:"id"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Position   string `json:"position"`
	Department string `json:"department"`
}

var employees = []Employee{
	{ID: "1", FirstName: "John", LastName: "Doe", Position: "Software Engineer", Department: "Engineering"},
	{ID: "2", FirstName: "Jane", LastName: "Smith", Position: "HR Manager", Department: "HR"},
}

func handleEmployees(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(employees)
}

func main() {
	http.HandleFunc("/api/v1/employees", handleEmployees)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}

	log.Printf("HR Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
