package services

import (
	"fmt"
	"time"

	"nexus-calendar-service/models"
	"nexus-calendar-service/repositories"

	"github.com/google/uuid"
)

type CalendarService struct {
	calendarRepo *repositories.CalendarRepository
}

func NewCalendarService(calendarRepo *repositories.CalendarRepository) *CalendarService {
	return &CalendarService{calendarRepo: calendarRepo}
}

func (s *CalendarService) CreateCalendar(userID uuid.UUID, req *models.CreateCalendarRequest) (*models.Calendar, error) {
	calendar := &models.Calendar{
		ID:          uuid.New(),
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		TimeZone:    req.TimeZone,
		IsDefault:   req.IsDefault,
		IsVisible:   true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// If this is the default calendar, unset other defaults
	if calendar.IsDefault {
		// This would require additional repository method to handle, simplified here
	}

	err := s.calendarRepo.Create(calendar)
	if err != nil {
		return nil, fmt.Errorf("failed to create calendar: %w", err)
	}

	return calendar, nil
}

func (s *CalendarService) GetCalendar(calendarID, userID uuid.UUID) (*models.Calendar, error) {
	calendar, err := s.calendarRepo.GetByID(calendarID)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar: %w", err)
	}

	// Check permissions
	permission, err := s.calendarRepo.GetCalendarPermission(calendarID, userID)
	if err != nil {
		return nil, fmt.Errorf("access denied")
	}
	if permission == "" {
		return nil, fmt.Errorf("access denied")
	}

	return calendar, nil
}

func (s *CalendarService) GetUserCalendars(userID uuid.UUID) ([]models.Calendar, error) {
	// Get owned calendars
	ownedCalendars, err := s.calendarRepo.GetByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get owned calendars: %w", err)
	}

	// Get shared calendars
	sharedCalendars, err := s.calendarRepo.GetSharedCalendars(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get shared calendars: %w", err)
	}

	// Combine calendars
	allCalendars := append(ownedCalendars, sharedCalendars...)
	return allCalendars, nil
}

func (s *CalendarService) UpdateCalendar(calendarID, userID uuid.UUID, req *models.UpdateCalendarRequest) (*models.Calendar, error) {
	// Check permissions
	permission, err := s.calendarRepo.GetCalendarPermission(calendarID, userID)
	if err != nil || (permission != models.PermissionAdmin && permission != models.PermissionWrite) {
		return nil, fmt.Errorf("insufficient permissions")
	}

	calendar, err := s.calendarRepo.GetByID(calendarID)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar: %w", err)
	}

	// Update fields
	if req.Name != nil {
		calendar.Name = *req.Name
	}
	if req.Description != nil {
		calendar.Description = *req.Description
	}
	if req.Color != nil {
		calendar.Color = *req.Color
	}
	if req.TimeZone != nil {
		calendar.TimeZone = *req.TimeZone
	}
	if req.IsVisible != nil {
		calendar.IsVisible = *req.IsVisible
	}

	calendar.UpdatedAt = time.Now()

	err = s.calendarRepo.Update(calendar)
	if err != nil {
		return nil, fmt.Errorf("failed to update calendar: %w", err)
	}

	return calendar, nil
}

func (s *CalendarService) DeleteCalendar(calendarID, userID uuid.UUID) error {
	// Check permissions
	permission, err := s.calendarRepo.GetCalendarPermission(calendarID, userID)
	if err != nil || permission != models.PermissionAdmin {
		return fmt.Errorf("insufficient permissions")
	}

	err = s.calendarRepo.Delete(calendarID)
	if err != nil {
		return fmt.Errorf("failed to delete calendar: %w", err)
	}

	return nil
}

func (s *CalendarService) ShareCalendar(calendarID, userID uuid.UUID, req *models.ShareCalendarRequest) error {
	// Check permissions
	permission, err := s.calendarRepo.GetCalendarPermission(calendarID, userID)
	if err != nil || permission != models.PermissionAdmin {
		return fmt.Errorf("insufficient permissions")
	}

	share := &models.CalendarShare{
		ID:         uuid.New(),
		CalendarID: calendarID,
		SharedWith: req.SharedWith,
		Permission: req.Permission,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err = s.calendarRepo.ShareCalendar(share)
	if err != nil {
		return fmt.Errorf("failed to share calendar: %w", err)
	}

	return nil
}
