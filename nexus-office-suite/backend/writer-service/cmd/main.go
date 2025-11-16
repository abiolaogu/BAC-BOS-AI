// cmd/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/rs/cors"
	"go.uber.org/zap"

	"github.com/nexus/writer-service/config"
	"github.com/nexus/writer-service/internal/handler"
	"github.com/nexus/writer-service/internal/middleware"
	"github.com/nexus/writer-service/internal/repository"
	"github.com/nexus/writer-service/internal/service"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize logger
	logger, err := initLogger()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()

	// Initialize database connection
	db, err := initDatabase(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize Redis client
	redisClient := initRedis(cfg)

	// Initialize repositories
	documentRepo := repository.NewDocumentRepository(db)
	versionRepo := repository.NewVersionRepository(db)
	commentRepo := repository.NewCommentRepository(db)
	activityRepo := repository.NewActivityRepository(db)

	// Initialize services
	documentService := service.NewDocumentService(documentRepo, versionRepo, activityRepo, logger)
	exportService := service.NewExportService(logger)
	importService := service.NewImportService(logger)
	commentService := service.NewCommentService(commentRepo, logger)

	// Initialize handlers
	documentHandler := handler.NewDocumentHandler(documentService, exportService, importService, logger)
	commentHandler := handler.NewCommentHandler(commentService, logger)
	healthHandler := handler.NewHealthHandler(db, redisClient, logger)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(cfg.JWTSecret, logger)
	tenantMiddleware := middleware.NewTenantMiddleware(logger)
	loggingMiddleware := middleware.NewLoggingMiddleware(logger)
	rateLimitMiddleware := middleware.NewRateLimitMiddleware(redisClient, cfg.RateLimit, logger)

	// Setup router
	router := setupRouter(
		documentHandler,
		commentHandler,
		healthHandler,
		authMiddleware,
		tenantMiddleware,
		loggingMiddleware,
		rateLimitMiddleware,
	)

	// Setup CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   cfg.CORSAllowedMethods,
		AllowedHeaders:   cfg.CORSAllowedHeaders,
		AllowCredentials: true,
		MaxAge:           300,
	}).Handler(router)

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Starting Writer Service",
			zap.String("port", cfg.Port),
			zap.String("environment", cfg.Environment),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}

func initLogger() (*zap.Logger, error) {
	env := os.Getenv("ENV")
	if env == "production" {
		return zap.NewProduction()
	}
	return zap.NewDevelopment()
}

func initDatabase(databaseURL string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func initRedis(cfg *config.Config) *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	return client
}

func setupRouter(
	documentHandler *handler.DocumentHandler,
	commentHandler *handler.CommentHandler,
	healthHandler *handler.HealthHandler,
	authMiddleware *middleware.AuthMiddleware,
	tenantMiddleware *middleware.TenantMiddleware,
	loggingMiddleware *middleware.LoggingMiddleware,
	rateLimitMiddleware *middleware.RateLimitMiddleware,
) *mux.Router {
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(loggingMiddleware.Middleware)
	router.Use(rateLimitMiddleware.Middleware)

	// Health check endpoints (no auth required)
	router.HandleFunc("/health", healthHandler.Health).Methods("GET")
	router.HandleFunc("/ready", healthHandler.Ready).Methods("GET")

	// API v1 routes
	api := router.PathPrefix("/api/v1").Subrouter()
	api.Use(authMiddleware.Middleware)
	api.Use(tenantMiddleware.Middleware)

	// Document routes
	api.HandleFunc("/documents", documentHandler.CreateDocument).Methods("POST")
	api.HandleFunc("/documents", documentHandler.ListDocuments).Methods("GET")
	api.HandleFunc("/documents/{id}", documentHandler.GetDocument).Methods("GET")
	api.HandleFunc("/documents/{id}", documentHandler.UpdateDocument).Methods("PUT")
	api.HandleFunc("/documents/{id}", documentHandler.DeleteDocument).Methods("DELETE")

	// Version routes
	api.HandleFunc("/documents/{id}/versions", documentHandler.CreateVersion).Methods("POST")
	api.HandleFunc("/documents/{id}/versions", documentHandler.ListVersions).Methods("GET")
	api.HandleFunc("/documents/{id}/versions/{versionId}/restore", documentHandler.RestoreVersion).Methods("POST")

	// Export routes
	api.HandleFunc("/documents/{id}/export/{format}", documentHandler.ExportDocument).Methods("GET")

	// Import routes
	api.HandleFunc("/documents/import", documentHandler.ImportDocument).Methods("POST")

	// Sharing routes
	api.HandleFunc("/documents/{id}/share", documentHandler.ShareDocument).Methods("POST")
	api.HandleFunc("/documents/{id}/permissions", documentHandler.GetPermissions).Methods("GET")
	api.HandleFunc("/documents/{id}/permissions/{userId}", documentHandler.RevokePermission).Methods("DELETE")

	// Comment routes
	api.HandleFunc("/documents/{id}/comments", commentHandler.GetComments).Methods("GET")
	api.HandleFunc("/documents/{id}/comments", commentHandler.AddComment).Methods("POST")
	api.HandleFunc("/documents/{id}/comments/{commentId}", commentHandler.UpdateComment).Methods("PUT")
	api.HandleFunc("/documents/{id}/comments/{commentId}", commentHandler.DeleteComment).Methods("DELETE")
	api.HandleFunc("/documents/{id}/comments/{commentId}/resolve", commentHandler.ResolveComment).Methods("PATCH")

	// Activity routes
	api.HandleFunc("/documents/{id}/activity", documentHandler.GetActivity).Methods("GET")

	// Search routes
	api.HandleFunc("/search", documentHandler.SearchDocuments).Methods("GET")

	return router
}
