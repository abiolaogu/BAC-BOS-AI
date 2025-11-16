package handlers

import (
	"time"

	"nexus-calendar-service/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CalDAVHandler struct {
	caldavService *services.CalDAVService
}

func NewCalDAVHandler(caldavService *services.CalDAVService) *CalDAVHandler {
	return &CalDAVHandler{caldavService: caldavService}
}

func (h *CalDAVHandler) ExportCalendar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	calendarID, err := uuid.Parse(c.Params("calendarId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid calendar ID",
		})
	}

	// Parse date range
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")

	var startTime, endTime time.Time
	if startTimeStr != "" {
		startTime, err = time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid start_time format",
			})
		}
	} else {
		// Default to 1 year ago
		startTime = time.Now().AddDate(-1, 0, 0)
	}

	if endTimeStr != "" {
		endTime, err = time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid end_time format",
			})
		}
	} else {
		// Default to 1 year from now
		endTime = time.Now().AddDate(1, 0, 0)
	}

	icsData, err := h.caldavService.ExportToICS(calendarID, userID, startTime, endTime)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	c.Set("Content-Type", "text/calendar; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=calendar.ics")
	return c.SendString(icsData)
}

func (h *CalDAVHandler) ImportCalendar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	calendarID, err := uuid.Parse(c.Params("calendarId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid calendar ID",
		})
	}

	icsData := string(c.Body())
	if icsData == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ICS data is required",
		})
	}

	err = h.caldavService.ImportFromICS(calendarID, userID, icsData)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Calendar imported successfully",
	})
}

func (h *CalDAVHandler) GetCalDAVURL(c *fiber.Ctx) error {
	calendarID, err := uuid.Parse(c.Params("calendarId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid calendar ID",
		})
	}

	baseURL := c.Query("base_url", "http://localhost:8083")
	caldavURL := h.caldavService.GetCalDAVURL(calendarID, baseURL)

	return c.JSON(fiber.Map{
		"caldav_url": caldavURL,
	})
}
