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
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/rs/cors"

	"github.com/nexus/sheets-service/config"
	"github.com/nexus/sheets-service/internal/handler"
	"github.com/nexus/sheets-service/internal/middleware"
	"github.com/nexus/sheets-service/internal/repository"
	"github.com/nexus/sheets-service/internal/service"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	logger := log.New(os.Stdout, "[SHEETS-SERVICE] ", log.LstdFlags)
	logger.Println("Starting NEXUS Sheets Service...")

	// Initialize database
	db, err := initDatabase(cfg.DatabaseURL)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	logger.Println("Database connection established")

	// Initialize repositories
	spreadsheetRepo := repository.NewSpreadsheetRepository(db)
	sheetRepo := repository.NewSheetRepository(db)
	cellRepo := repository.NewCellRepository(db)

	// Initialize services
	spreadsheetService := service.NewSpreadsheetService(spreadsheetRepo, sheetRepo, cellRepo)

	// Initialize handlers
	spreadsheetHandler := handler.NewSpreadsheetHandler(spreadsheetService)

	// Setup router
	router := setupRouter(spreadsheetHandler, cfg)

	// Setup CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		Debug:            cfg.Environment == "development",
	}).Handler(router)

	// Create server
	addr := cfg.Host + ":" + cfg.Port
	server := &http.Server{
		Addr:         addr,
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Printf("Server listening on %s", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	logger.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %v", err)
	}

	logger.Println("Server stopped")
}

func initDatabase(databaseURL string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	return db, nil
}

func setupRouter(spreadsheetHandler *handler.SpreadsheetHandler, cfg *config.Config) *mux.Router {
	router := mux.NewRouter()

	// Middleware
	authMiddleware := middleware.NewAuthMiddleware(cfg.JWTSecret)
	router.Use(middleware.LoggingMiddleware)
	router.Use(authMiddleware.Middleware)

	// Health check (no auth required)
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	}).Methods("GET")

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// Spreadsheet routes
	api.HandleFunc("/spreadsheets", spreadsheetHandler.CreateSpreadsheet).Methods("POST")
	api.HandleFunc("/spreadsheets", spreadsheetHandler.ListSpreadsheets).Methods("GET")
	api.HandleFunc("/spreadsheets/{id}", spreadsheetHandler.GetSpreadsheet).Methods("GET")
	api.HandleFunc("/spreadsheets/{id}", spreadsheetHandler.UpdateSpreadsheet).Methods("PUT")
	api.HandleFunc("/spreadsheets/{id}", spreadsheetHandler.DeleteSpreadsheet).Methods("DELETE")

	// Sheet routes
	api.HandleFunc("/spreadsheets/{id}/sheets", spreadsheetHandler.CreateSheet).Methods("POST")
	api.HandleFunc("/sheets/{sheetId}", spreadsheetHandler.UpdateSheet).Methods("PUT")
	api.HandleFunc("/sheets/{sheetId}", spreadsheetHandler.DeleteSheet).Methods("DELETE")

	// Cell routes
	api.HandleFunc("/sheets/{sheetId}/cells", spreadsheetHandler.GetCells).Methods("GET")
	api.HandleFunc("/sheets/{sheetId}/cells", spreadsheetHandler.BatchUpdateCells).Methods("POST")
	api.HandleFunc("/sheets/{sheetId}/cells/{row}/{col}", spreadsheetHandler.UpdateCell).Methods("PUT")

	return router
}
