package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nexus-platform/vas/internal/handlers"
	"github.com/nexus-platform/vas/internal/middleware"
	"github.com/nexus-platform/vas/internal/providers"
	"github.com/nexus-platform/vas/pkg/cache"
	"github.com/nexus-platform/vas/pkg/queue"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/sdk/metric"
)

var log = logrus.New()

func main() {
	// Load configuration
	if err := loadConfig(); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Setup logging
	setupLogging()

	log.Info("🚀 Starting NEXUS VAS (Value Added Services) Platform")
	log.Info("Version: 1.0.0 | Environment: ", viper.GetString("environment"))

	// Initialize OpenTelemetry metrics
	if err := setupMetrics(); err != nil {
		log.Fatalf("Failed to setup metrics: %v", err)
	}

	// Initialize cache
	cacheClient, err := cache.NewRedisCache(
		viper.GetString("redis.host"),
		viper.GetString("redis.port"),
		viper.GetString("redis.password"),
		viper.GetInt("redis.db"),
	)
	if err != nil {
		log.Fatalf("Failed to initialize cache: %v", err)
	}
	defer cacheClient.Close()
	log.Info("✅ Cache initialized (Redis)")

	// Initialize message queue
	queueClient, err := queue.NewNATSQueue(viper.GetString("nats.url"))
	if err != nil {
		log.Fatalf("Failed to initialize message queue: %v", err)
	}
	defer queueClient.Close()
	log.Info("✅ Message queue initialized (NATS)")

	// Initialize messaging providers
	providerManager := providers.NewProviderManager(cacheClient, queueClient)

	// SMS Providers
	if viper.GetBool("providers.twilio.enabled") {
		twilioProvider := providers.NewTwilioProvider(
			viper.GetString("providers.twilio.account_sid"),
			viper.GetString("providers.twilio.auth_token"),
			viper.GetString("providers.twilio.from_number"),
		)
		providerManager.RegisterSMSProvider("twilio", twilioProvider)
		log.Info("✅ Twilio SMS provider registered")
	}

	if viper.GetBool("providers.infobip.enabled") {
		infobipProvider := providers.NewInfobipProvider(
			viper.GetString("providers.infobip.api_key"),
			viper.GetString("providers.infobip.base_url"),
		)
		providerManager.RegisterSMSProvider("infobip", infobipProvider)
		log.Info("✅ Infobip SMS provider registered")
	}

	if viper.GetBool("providers.africastalking.enabled") {
		atProvider := providers.NewAfricasTalkingProvider(
			viper.GetString("providers.africastalking.api_key"),
			viper.GetString("providers.africastalking.username"),
		)
		providerManager.RegisterSMSProvider("africastalking", atProvider)
		log.Info("✅ Africa's Talking SMS provider registered")
	}

	// WhatsApp Provider
	if viper.GetBool("providers.whatsapp.enabled") {
		whatsappProvider := providers.NewWhatsAppProvider(
			viper.GetString("providers.whatsapp.api_key"),
			viper.GetString("providers.whatsapp.phone_number_id"),
		)
		providerManager.RegisterWhatsAppProvider(whatsappProvider)
		log.Info("✅ WhatsApp Business API provider registered")
	}

	// Telegram Provider
	if viper.GetBool("providers.telegram.enabled") {
		telegramProvider := providers.NewTelegramProvider(
			viper.GetString("providers.telegram.bot_token"),
		)
		providerManager.RegisterTelegramProvider(telegramProvider)
		log.Info("✅ Telegram Bot API provider registered")
	}

	// Facebook Messenger Provider
	if viper.GetBool("providers.messenger.enabled") {
		messengerProvider := providers.NewMessengerProvider(
			viper.GetString("providers.messenger.page_access_token"),
			viper.GetString("providers.messenger.verify_token"),
		)
		providerManager.RegisterMessengerProvider(messengerProvider)
		log.Info("✅ Facebook Messenger provider registered")
	}

	// Initialize HTTP router
	router := setupRouter(providerManager, cacheClient, queueClient)

	// HTTP Server
	port := viper.GetString("server.port")
	server := &http.Server{
		Addr:           ":" + port,
		Handler:        router,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Graceful shutdown
	go func() {
		log.Infof("🌐 VAS Platform listening on port %s", port)
		log.Info("📱 SMS | 💬 WhatsApp | 🔵 Telegram | 📘 Messenger")
		log.Info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("🛑 Shutting down VAS Platform...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Info("✅ VAS Platform stopped gracefully")
}

func setupRouter(pm *providers.ProviderManager, cache cache.Cache, queue queue.Queue) *gin.Engine {
	// Set Gin mode
	if viper.GetString("environment") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middleware
	router.Use(middleware.Logger(log))
	router.Use(middleware.Recovery(log))
	router.Use(middleware.CORS())
	router.Use(middleware.RateLimiter(cache))
	router.Use(middleware.RequestID())
	router.Use(middleware.Metrics())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "nexus-vas",
			"version": "1.0.0",
			"uptime":  time.Since(startTime).String(),
		})
	})

	// Metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1
	v1 := router.Group("/api/v1")
	{
		// SMS endpoints
		sms := v1.Group("/sms")
		{
			smsHandler := handlers.NewSMSHandler(pm, cache, queue)
			sms.POST("/send", smsHandler.Send)
			sms.POST("/send/bulk", smsHandler.SendBulk)
			sms.GET("/status/:message_id", smsHandler.GetStatus)
			sms.POST("/webhook/:provider", smsHandler.Webhook)
		}

		// WhatsApp endpoints
		whatsapp := v1.Group("/whatsapp")
		{
			waHandler := handlers.NewWhatsAppHandler(pm, cache, queue)
			whatsapp.POST("/send", waHandler.Send)
			whatsapp.POST("/send/template", waHandler.SendTemplate)
			whatsapp.POST("/send/media", waHandler.SendMedia)
			whatsapp.GET("/status/:message_id", waHandler.GetStatus)
			whatsapp.POST("/webhook", waHandler.Webhook)
		}

		// Telegram endpoints
		telegram := v1.Group("/telegram")
		{
			tgHandler := handlers.NewTelegramHandler(pm, cache, queue)
			telegram.POST("/send", tgHandler.Send)
			telegram.POST("/send/media", tgHandler.SendMedia)
			telegram.POST("/send/location", tgHandler.SendLocation)
			telegram.GET("/status/:message_id", tgHandler.GetStatus)
			telegram.POST("/webhook", tgHandler.Webhook)
		}

		// Messenger endpoints
		messenger := v1.Group("/messenger")
		{
			msgHandler := handlers.NewMessengerHandler(pm, cache, queue)
			messenger.POST("/send", msgHandler.Send)
			messenger.POST("/send/template", msgHandler.SendTemplate)
			messenger.GET("/status/:message_id", msgHandler.GetStatus)
			messenger.POST("/webhook", msgHandler.Webhook)
			messenger.GET("/webhook", msgHandler.WebhookVerify)
		}

		// Unified messaging endpoint
		v1.POST("/messages/send", handlers.NewUnifiedHandler(pm, cache, queue).Send)

		// Analytics endpoints
		analytics := v1.Group("/analytics")
		{
			analyticsHandler := handlers.NewAnalyticsHandler(cache)
			analytics.GET("/overview", analyticsHandler.GetOverview)
			analytics.GET("/by-channel", analyticsHandler.GetByChannel)
			analytics.GET("/by-provider", analyticsHandler.GetByProvider)
			analytics.GET("/delivery-rates", analyticsHandler.GetDeliveryRates)
			analytics.GET("/cost-analysis", analyticsHandler.GetCostAnalysis)
		}

		// Campaign management
		campaigns := v1.Group("/campaigns")
		{
			campaignHandler := handlers.NewCampaignHandler(pm, cache, queue)
			campaigns.POST("", campaignHandler.Create)
			campaigns.GET("", campaignHandler.List)
			campaigns.GET("/:id", campaignHandler.Get)
			campaigns.PUT("/:id", campaignHandler.Update)
			campaigns.DELETE("/:id", campaignHandler.Delete)
			campaigns.POST("/:id/start", campaignHandler.Start)
			campaigns.POST("/:id/pause", campaignHandler.Pause)
			campaigns.GET("/:id/stats", campaignHandler.GetStats)
		}

		// Contact management
		contacts := v1.Group("/contacts")
		{
			contactHandler := handlers.NewContactHandler(cache)
			contacts.POST("", contactHandler.Create)
			contacts.GET("", contactHandler.List)
			contacts.GET("/:id", contactHandler.Get)
			contacts.PUT("/:id", contactHandler.Update)
			contacts.DELETE("/:id", contactHandler.Delete)
			contacts.POST("/import", contactHandler.Import)
			contacts.POST("/export", contactHandler.Export)
		}

		// Templates
		templates := v1.Group("/templates")
		{
			templateHandler := handlers.NewTemplateHandler(cache)
			templates.POST("", templateHandler.Create)
			templates.GET("", templateHandler.List)
			templates.GET("/:id", templateHandler.Get)
			templates.PUT("/:id", templateHandler.Update)
			templates.DELETE("/:id", templateHandler.Delete)
		}
	}

	return router
}

func loadConfig() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath(".")

	// Environment variables
	viper.AutomaticEnv()

	// Defaults
	viper.SetDefault("server.port", "8200")
	viper.SetDefault("environment", "development")
	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", "6379")
	viper.SetDefault("redis.db", 0)
	viper.SetDefault("nats.url", "nats://localhost:4222")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Warn("Config file not found, using defaults and environment variables")
			return nil
		}
		return err
	}

	return nil
}

func setupLogging() {
	// Set log format
	log.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime: "timestamp",
			logrus.FieldKeyMsg:  "message",
		},
	})

	// Set log level
	level := viper.GetString("log.level")
	switch level {
	case "debug":
		log.SetLevel(logrus.DebugLevel)
	case "info":
		log.SetLevel(logrus.InfoLevel)
	case "warn":
		log.SetLevel(logrus.WarnLevel)
	case "error":
		log.SetLevel(logrus.ErrorLevel)
	default:
		log.SetLevel(logrus.InfoLevel)
	}

	log.SetOutput(os.Stdout)
}

func setupMetrics() error {
	exporter, err := prometheus.New()
	if err != nil {
		return fmt.Errorf("failed to create prometheus exporter: %w", err)
	}

	provider := metric.NewMeterProvider(metric.WithReader(exporter))
	otel.SetMeterProvider(provider)

	return nil
}

var startTime = time.Now()
