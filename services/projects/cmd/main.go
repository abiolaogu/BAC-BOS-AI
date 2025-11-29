package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type Project struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Owner  string `json:"owner"`
}

var projects = []Project{
	{ID: "1", Name: "Website Redesign", Status: "In Progress", Owner: "John Doe"},
	{ID: "2", Name: "Mobile App Launch", Status: "Planning", Owner: "Jane Smith"},
}

func handleProjects(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(projects)
}

func main() {
	http.HandleFunc("/api/v1/projects", handleProjects)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8087"
	}

	log.Printf("Project Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
