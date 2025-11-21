package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"nexus-mail-service/config"
	"nexus-mail-service/internal/handler"
	"nexus-mail-service/internal/repository"
	"nexus-mail-service/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	log.Info().Msg("Starting NEXUS Mail Service")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Set log level based on environment
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}

	// Connect to database
	db, err := connectDatabase(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	log.Info().Msg("Database connected successfully")

	// Initialize repositories
	emailRepo := repository.NewEmailRepository(db)
	folderRepo := repository.NewFolderRepository(db)
	labelRepo := repository.NewLabelRepository(db)

	// Initialize services
	emailService, err := service.NewEmailService(cfg, emailRepo, folderRepo)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize email service")
	}

	spamFilter := service.NewSpamFilter(cfg)

	// Initialize HTTP server
	router := gin.Default()

	// Configure CORS
	corsConfig := cors.Config{
		AllowOrigins:     cfg.Server.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "nexus-mail-service",
			"version": "1.0.0",
		})
	})

	// Register HTTP API routes
	emailHandler := handler.NewEmailHandler(emailService, folderRepo, labelRepo)
	emailHandler.RegisterRoutes(router)

	// Start HTTP server
	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Str("addr", httpServer.Addr).Msg("HTTP server started")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// Start SMTP server if enabled
	var smtpServer *service.SMTPServer
	if cfg.SMTP.Enabled {
		smtpServer = service.NewSMTPServer(cfg, emailRepo, folderRepo, emailService, spamFilter)
		go func() {
			if err := smtpServer.Start(); err != nil {
				log.Error().Err(err).Msg("SMTP server failed")
			}
		}()
	}

	// Start IMAP server if enabled
	var imapServer *service.IMAPServer
	if cfg.IMAP.Enabled {
		imapServer = service.NewIMAPServer(cfg, emailRepo, folderRepo)
		go func() {
			if err := imapServer.Start(); err != nil {
				log.Error().Err(err).Msg("IMAP server failed")
			}
		}()
	}

	// Wait for interrupt signal to gracefully shutdown the servers
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down servers...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Shutdown HTTP server
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown failed")
	}

	// Shutdown SMTP server
	if smtpServer != nil {
		if err := smtpServer.Stop(); err != nil {
			log.Error().Err(err).Msg("SMTP server shutdown failed")
		}
	}

	// Shutdown IMAP server
	if imapServer != nil {
		if err := imapServer.Stop(); err != nil {
			log.Error().Err(err).Msg("IMAP server shutdown failed")
		}
	}

	log.Info().Msg("Servers stopped")
}

func connectDatabase(cfg *config.Config) (*sql.DB, error) {
	dsn := cfg.GetDatabaseDSN()

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}

	return db, nil
}
