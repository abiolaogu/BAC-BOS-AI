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
	_ "github.com/lib/pq"
	"github.com/nexus/drive-service/config"
	"github.com/nexus/drive-service/internal/handler"
	"github.com/nexus/drive-service/internal/middleware"
	"github.com/nexus/drive-service/internal/repository"
	"github.com/nexus/drive-service/internal/service"
	"github.com/nexus/drive-service/internal/storage"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Connect to database
	db, err := sqlx.Connect("postgres", cfg.Database.ConnectionString())
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	log.Println("Connected to database")

	// Initialize MinIO storage
	minioStorage, err := storage.NewMinIOStorage(&cfg.MinIO)
	if err != nil {
		log.Fatal("Failed to initialize MinIO storage:", err)
	}
	log.Println("Connected to MinIO storage")

	// Initialize repositories
	fileRepo := repository.NewFileRepository(db)
	folderRepo := repository.NewFolderRepository(db)
	permissionRepo := repository.NewPermissionRepository(db)
	shareLinkRepo := repository.NewShareLinkRepository(db)
	versionRepo := repository.NewVersionRepository(db)

	// Initialize service
	driveService := service.NewDriveService(
		fileRepo,
		folderRepo,
		permissionRepo,
		shareLinkRepo,
		versionRepo,
		minioStorage,
	)

	// Initialize handler
	driveHandler := handler.NewDriveHandler(driveService, cfg.Upload.MaxUploadSize)

	// Setup router
	router := setupRouter(driveHandler, cfg)

	// Create server
	server := &http.Server{
		Addr:         cfg.Server.Host + ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on %s:%s", cfg.Server.Host, cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

func setupRouter(h *handler.DriveHandler, cfg *config.Config) *mux.Router {
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(middleware.Recovery)
	router.Use(middleware.Logger)
	router.Use(middleware.RequestID)
	router.Use(middleware.CORS(cfg.CORS.AllowedOrigins))

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()
	api.Use(middleware.JWTAuth(cfg.JWT.Secret))

	// File routes
	api.HandleFunc("/files", h.UploadFile).Methods("POST")
	api.HandleFunc("/files", h.ListFiles).Methods("GET")
	api.HandleFunc("/files/search", h.SearchFiles).Methods("GET")
	api.HandleFunc("/files/starred", h.GetStarredFiles).Methods("GET")
	api.HandleFunc("/files/recent", h.GetRecentFiles).Methods("GET")
	api.HandleFunc("/files/{id}", h.GetFile).Methods("GET")
	api.HandleFunc("/files/{id}", h.UpdateFile).Methods("PUT")
	api.HandleFunc("/files/{id}", h.DeleteFile).Methods("DELETE")
	api.HandleFunc("/files/{id}/download", h.DownloadFile).Methods("GET")
	api.HandleFunc("/files/{id}/move", h.MoveFile).Methods("POST")
	api.HandleFunc("/files/{id}/copy", h.CopyFile).Methods("POST")

	// Folder routes
	api.HandleFunc("/folders", h.CreateFolder).Methods("POST")
	api.HandleFunc("/folders", h.ListFolders).Methods("GET")
	api.HandleFunc("/folders/{id}", h.GetFolder).Methods("GET")
	api.HandleFunc("/folders/{id}", h.UpdateFolder).Methods("PUT")
	api.HandleFunc("/folders/{id}", h.DeleteFolder).Methods("DELETE")

	// Trash routes
	api.HandleFunc("/trash", h.ListTrashed).Methods("GET")
	api.HandleFunc("/trash/restore", h.RestoreFromTrash).Methods("POST")
	api.HandleFunc("/trash/empty", h.EmptyTrash).Methods("POST")

	// Permission routes
	api.HandleFunc("/permissions", h.GrantPermission).Methods("POST")
	api.HandleFunc("/permissions/{id}", h.RevokePermission).Methods("DELETE")
	api.HandleFunc("/permissions/{resource_type}/{resource_id}", h.ListPermissions).Methods("GET")

	// Share link routes
	api.HandleFunc("/share-links", h.CreateShareLink).Methods("POST")
	api.HandleFunc("/share-links/{id}", h.DeleteShareLink).Methods("DELETE")
	api.HandleFunc("/share/{token}", h.GetShareLink).Methods("GET")

	// Version routes
	api.HandleFunc("/files/{file_id}/versions", h.ListVersions).Methods("GET")
	api.HandleFunc("/files/{file_id}/versions/restore", h.RestoreVersion).Methods("POST")

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"healthy"}`)
	}).Methods("GET")

	return router
}
