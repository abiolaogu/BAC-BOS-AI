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
	"github.com/nexus/slides-service/config"
	"github.com/nexus/slides-service/internal/handler"
	"github.com/nexus/slides-service/internal/middleware"
	"github.com/nexus/slides-service/internal/repository"
	"github.com/nexus/slides-service/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	db, err := sqlx.Connect("postgres", cfg.Database.ConnectionString())
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	log.Println("Connected to database")

	// Initialize repositories
	presentationRepo := repository.NewPresentationRepository(db)
	slideRepo := repository.NewSlideRepository(db)
	themeRepo := repository.NewThemeRepository(db)

	// Initialize service
	presentationService := service.NewPresentationService(
		presentationRepo,
		slideRepo,
		themeRepo,
		cfg.Slides.DefaultWidth,
		cfg.Slides.DefaultHeight,
		cfg.Slides.MaxSlidesPerPresentation,
	)

	// Initialize handler
	presentationHandler := handler.NewPresentationHandler(presentationService)

	// Setup router
	router := setupRouter(presentationHandler, cfg)

	// Create server
	server := &http.Server{
		Addr:         cfg.Server.Host + ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		log.Printf("Server starting on %s:%s", cfg.Server.Host, cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

func setupRouter(h *handler.PresentationHandler, cfg *config.Config) *mux.Router {
	router := mux.NewRouter()

	router.Use(middleware.Logger)
	router.Use(middleware.CORS(cfg.CORS.AllowedOrigins))

	api := router.PathPrefix("/api/v1").Subrouter()
	api.Use(middleware.JWTAuth(cfg.JWT.Secret))

	// Presentation routes
	api.HandleFunc("/presentations", h.CreatePresentation).Methods("POST")
	api.HandleFunc("/presentations", h.ListPresentations).Methods("GET")
	api.HandleFunc("/presentations/{id}", h.GetPresentation).Methods("GET")
	api.HandleFunc("/presentations/{id}", h.UpdatePresentation).Methods("PUT")
	api.HandleFunc("/presentations/{id}", h.DeletePresentation).Methods("DELETE")

	// Slide routes
	api.HandleFunc("/slides", h.CreateSlide).Methods("POST")
	api.HandleFunc("/slides/{id}", h.GetSlide).Methods("GET")
	api.HandleFunc("/slides/{id}", h.UpdateSlide).Methods("PUT")
	api.HandleFunc("/slides/{id}", h.DeleteSlide).Methods("DELETE")
	api.HandleFunc("/presentations/{presentation_id}/slides", h.ListSlides).Methods("GET")

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"healthy"}`)
	}).Methods("GET")

	return router
}
