package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/abiolaogu/BAC-BOS-AI/services/control-plane/internal/api"
	"github.com/abiolaogu/BAC-BOS-AI/services/control-plane/internal/config"
	"github.com/abiolaogu/BAC-BOS-AI/services/control-plane/internal/repository"
	"github.com/abiolaogu/BAC-BOS-AI/services/control-plane/internal/service"
	"github.com/abiolaogu/BAC-BOS-AI/shared/go/auth"
	"github.com/abiolaogu/BAC-BOS-AI/shared/go/database"
	"github.com/abiolaogu/BAC-BOS-AI/shared/go/middleware"
	"github.com/gorilla/mux"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := database.New(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager(cfg.JWTSecret, cfg.TokenDuration)

	// Initialize repositories
	tenantRepo := repository.NewTenantRepository(db)
	userRepo := repository.NewUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	dbInstanceRepo := repository.NewDatabaseInstanceRepository(db)
	apiKeyRepo := repository.NewAPIKeyRepository(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)
	auditLogRepo := repository.NewAuditLogRepository(db)

	// Initialize services
	tenantSvc := service.NewTenantService(tenantRepo, auditLogRepo)
	userSvc := service.NewUserService(userRepo, roleRepo, jwtManager, auditLogRepo)
	dbInstanceSvc := service.NewDatabaseInstanceService(dbInstanceRepo, auditLogRepo)
	apiKeySvc := service.NewAPIKeyService(apiKeyRepo, auditLogRepo)
	subscriptionSvc := service.NewSubscriptionService(subscriptionRepo, auditLogRepo)

	// Initialize HTTP handlers
	handler := api.NewHandler(
		tenantSvc,
		userSvc,
		dbInstanceSvc,
		apiKeySvc,
		subscriptionSvc,
	)

	// Setup router
	router := mux.NewRouter()
	router.Use(middleware.Logging)
	router.Use(middleware.CORS)

	// Auth endpoints (no authentication required)
	router.HandleFunc("/api/v1/auth/login", handler.Login).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/v1/auth/register", handler.Register).Methods("POST", "OPTIONS")

	// Protected endpoints
	authMiddleware := middleware.NewAuthMiddleware(jwtManager)
	protected := router.PathPrefix("/api/v1").Subrouter()
	protected.Use(authMiddleware.Authenticate)

	// Tenant endpoints
	protected.HandleFunc("/tenants", handler.CreateTenant).Methods("POST")
	protected.HandleFunc("/tenants/{id}", handler.GetTenant).Methods("GET")
	protected.HandleFunc("/tenants/{id}", handler.UpdateTenant).Methods("PUT")
	protected.HandleFunc("/tenants", handler.ListTenants).Methods("GET")

	// User endpoints
	protected.HandleFunc("/users", handler.CreateUser).Methods("POST")
	protected.HandleFunc("/users/{id}", handler.GetUser).Methods("GET")
	protected.HandleFunc("/users/{id}", handler.UpdateUser).Methods("PUT")
	protected.HandleFunc("/users/{id}", handler.DeleteUser).Methods("DELETE")
	protected.HandleFunc("/users", handler.ListUsers).Methods("GET")

	// Database instance endpoints
	protected.HandleFunc("/databases", handler.ProvisionDatabase).Methods("POST")
	protected.HandleFunc("/databases/{id}", handler.GetDatabaseInstance).Methods("GET")
	protected.HandleFunc("/databases/{id}/scale", handler.ScaleDatabase).Methods("POST")
	protected.HandleFunc("/databases", handler.ListDatabases).Methods("GET")

	// API key endpoints
	protected.HandleFunc("/api-keys", handler.CreateAPIKey).Methods("POST")
	protected.HandleFunc("/api-keys/{id}", handler.GetAPIKey).Methods("GET")
	protected.HandleFunc("/api-keys/{id}/revoke", handler.RevokeAPIKey).Methods("POST")
	protected.HandleFunc("/api-keys", handler.ListAPIKeys).Methods("GET")

	// Subscription endpoints
	protected.HandleFunc("/subscriptions", handler.CreateSubscription).Methods("POST")
	protected.HandleFunc("/subscriptions/{tenantId}", handler.GetSubscription).Methods("GET")
	protected.HandleFunc("/subscriptions/{id}", handler.UpdateSubscription).Methods("PUT")
	protected.HandleFunc("/subscriptions/{id}/cancel", handler.CancelSubscription).Methods("POST")

	// Health check
	router.HandleFunc("/health", handler.HealthCheck).Methods("GET")

	// Start server
	srv := &http.Server{
		Addr:         cfg.ServerAddress,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Control Plane API server starting on %s", cfg.ServerAddress)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	<-done
	log.Println("Server shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}
