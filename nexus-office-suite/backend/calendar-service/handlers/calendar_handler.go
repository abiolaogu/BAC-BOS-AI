package handlers

import (
	"nexus-calendar-service/models"
	"nexus-calendar-service/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CalendarHandler struct {
	calendarService *services.CalendarService
}

func NewCalendarHandler(calendarService *services.CalendarService) *CalendarHandler {
	return &CalendarHandler{calendarService: calendarService}
}

func (h *CalendarHandler) CreateCalendar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req models.CreateCalendarRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	calendar, err := h.calendarService.CreateCalendar(userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(calendar)
}

func (h *CalendarHandler) GetCalendar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	calendarID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid calendar ID",
		})
	}

	calendar, err := h.calendarService.GetCalendar(calendarID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(calendar)
}

func (h *CalendarHandler) GetUserCalendars(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	calendars, err := h.calendarService.GetUserCalendars(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(calendars)
}

func (h *CalendarHandler) UpdateCalendar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	calendarID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid calendar ID",
		})
	}

	var req models.UpdateCalendarRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	calendar, err := h.calendarService.UpdateCalendar(calendarID, userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(calendar)
}

func (h *CalendarHandler) DeleteCalendar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	calendarID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid calendar ID",
		})
	}

	err = h.calendarService.DeleteCalendar(calendarID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *CalendarHandler) ShareCalendar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	calendarID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid calendar ID",
		})
	}

	var req models.ShareCalendarRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	err = h.calendarService.ShareCalendar(calendarID, userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Calendar shared successfully",
	})
}
