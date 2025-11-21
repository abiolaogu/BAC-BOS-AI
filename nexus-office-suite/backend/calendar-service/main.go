package main

import (
	"database/sql"
	"fmt"
	"log"

	"nexus-calendar-service/config"
	"nexus-calendar-service/handlers"
	"nexus-calendar-service/repositories"
	"nexus-calendar-service/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	_ "github.com/lib/pq"
)

func main() {
	// Load configuration
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	db, err := sql.Open("postgres", cfg.Database.ConnectionString())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to database successfully")

	// Initialize repositories
	calendarRepo := repositories.NewCalendarRepository(db)
	eventRepo := repositories.NewEventRepository(db)
	reminderRepo := repositories.NewReminderRepository(db)

	// Initialize services
	calendarService := services.NewCalendarService(calendarRepo)
	eventService := services.NewEventService(eventRepo, calendarRepo, reminderRepo)
	caldavService := services.NewCalDAVService(eventRepo, calendarRepo)

	// Initialize handlers
	calendarHandler := handlers.NewCalendarHandler(calendarService)
	eventHandler := handlers.NewEventHandler(eventService)
	caldavHandler := handlers.NewCalDAVHandler(caldavService)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(handlers.CORSMiddleware(cfg))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"service": "nexus-calendar-service",
		})
	})

	// API routes
	api := app.Group("/api/v1")

	// Calendar routes
	calendars := api.Group("/calendars", handlers.AuthMiddleware(cfg))
	calendars.Post("/", calendarHandler.CreateCalendar)
	calendars.Get("/", calendarHandler.GetUserCalendars)
	calendars.Get("/:id", calendarHandler.GetCalendar)
	calendars.Put("/:id", calendarHandler.UpdateCalendar)
	calendars.Delete("/:id", calendarHandler.DeleteCalendar)
	calendars.Post("/:id/share", calendarHandler.ShareCalendar)

	// Event routes
	events := api.Group("/events", handlers.AuthMiddleware(cfg))
	events.Post("/", eventHandler.CreateEvent)
	events.Get("/", eventHandler.GetUserEvents)
	events.Get("/search", eventHandler.SearchEvents)
	events.Get("/:id", eventHandler.GetEvent)
	events.Put("/:id", eventHandler.UpdateEvent)
	events.Delete("/:id", eventHandler.DeleteEvent)
	events.Post("/:id/rsvp", eventHandler.RespondToEvent)

	// Calendar-specific events
	api.Get("/calendars/:calendarId/events", eventHandler.GetCalendarEvents, handlers.AuthMiddleware(cfg))

	// CalDAV routes
	if cfg.CalDAV.Enabled {
		caldav := api.Group("/caldav", handlers.AuthMiddleware(cfg))
		caldav.Get("/calendars/:calendarId/export", caldavHandler.ExportCalendar)
		caldav.Post("/calendars/:calendarId/import", caldavHandler.ImportCalendar)
		caldav.Get("/calendars/:calendarId/url", caldavHandler.GetCalDAVURL)
	}

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Starting NEXUS Calendar Service on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
