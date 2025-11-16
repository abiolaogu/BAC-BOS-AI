package services

import (
	"fmt"
	"time"

	"nexus-calendar-service/models"
	"nexus-calendar-service/repositories"

	"github.com/google/uuid"
)

type EventService struct {
	eventRepo    *repositories.EventRepository
	calendarRepo *repositories.CalendarRepository
	reminderRepo *repositories.ReminderRepository
}

func NewEventService(
	eventRepo *repositories.EventRepository,
	calendarRepo *repositories.CalendarRepository,
	reminderRepo *repositories.ReminderRepository,
) *EventService {
	return &EventService{
		eventRepo:    eventRepo,
		calendarRepo: calendarRepo,
		reminderRepo: reminderRepo,
	}
}

func (s *EventService) CreateEvent(userID uuid.UUID, req *models.CreateEventRequest) (*models.EventResponse, error) {
	// Check calendar permissions
	permission, err := s.calendarRepo.GetCalendarPermission(req.CalendarID, userID)
	if err != nil || (permission != models.PermissionAdmin && permission != models.PermissionWrite) {
		return nil, fmt.Errorf("insufficient permissions")
	}

	// Validate times
	if req.EndTime.Before(req.StartTime) {
		return nil, fmt.Errorf("end time must be after start time")
	}

	// Set defaults
	if req.Status == "" {
		req.Status = models.StatusConfirmed
	}
	if req.BusyStatus == "" {
		req.BusyStatus = models.BusyStatusBusy
	}
	if req.Visibility == "" {
		req.Visibility = models.VisibilityPublic
	}

	event := &models.Event{
		ID:             uuid.New(),
		CalendarID:     req.CalendarID,
		UserID:         userID,
		Title:          req.Title,
		Description:    req.Description,
		Location:       req.Location,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		IsAllDay:       req.IsAllDay,
		TimeZone:       req.TimeZone,
		RecurrenceRule: req.RecurrenceRule,
		Status:         req.Status,
		BusyStatus:     req.BusyStatus,
		Category:       req.Category,
		Color:          req.Color,
		MeetingURL:     req.MeetingURL,
		Visibility:     req.Visibility,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	err = s.eventRepo.Create(event)
	if err != nil {
		return nil, fmt.Errorf("failed to create event: %w", err)
	}

	// Create attendees
	var attendees []models.EventAttendee
	for _, attendeeReq := range req.Attendees {
		attendee := &models.EventAttendee{
			ID:             uuid.New(),
			EventID:        event.ID,
			UserID:         attendeeReq.UserID,
			Email:          attendeeReq.Email,
			Name:           attendeeReq.Name,
			ResponseStatus: models.ResponseNeedsAction,
			IsOrganizer:    false,
			IsOptional:     attendeeReq.IsOptional,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		err = s.eventRepo.CreateAttendee(attendee)
		if err != nil {
			return nil, fmt.Errorf("failed to create attendee: %w", err)
		}
		attendees = append(attendees, *attendee)
	}

	// Add organizer
	// For simplicity, we'll add the creating user as organizer
	// In production, you'd fetch user details from auth service
	organizer := &models.EventAttendee{
		ID:             uuid.New(),
		EventID:        event.ID,
		UserID:         &userID,
		Email:          "", // Should be fetched from user service
		Name:           "", // Should be fetched from user service
		ResponseStatus: models.ResponseAccepted,
		IsOrganizer:    true,
		IsOptional:     false,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	err = s.eventRepo.CreateAttendee(organizer)
	if err != nil {
		return nil, fmt.Errorf("failed to create organizer: %w", err)
	}
	attendees = append([]models.EventAttendee{*organizer}, attendees...)

	// Create reminders
	var reminders []models.Reminder
	for _, reminderReq := range req.Reminders {
		reminder := &models.Reminder{
			ID:        uuid.New(),
			EventID:   event.ID,
			UserID:    userID,
			Minutes:   reminderReq.Minutes,
			Method:    reminderReq.Method,
			Sent:      false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		err = s.reminderRepo.Create(reminder)
		if err != nil {
			return nil, fmt.Errorf("failed to create reminder: %w", err)
		}
		reminders = append(reminders, *reminder)
	}

	return &models.EventResponse{
		Event:     *event,
		Attendees: attendees,
		Reminders: reminders,
	}, nil
}

func (s *EventService) GetEvent(eventID, userID uuid.UUID) (*models.EventResponse, error) {
	event, err := s.eventRepo.GetByID(eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %w", err)
	}

	// Check calendar permissions
	permission, err := s.calendarRepo.GetCalendarPermission(event.CalendarID, userID)
	if err != nil {
		return nil, fmt.Errorf("access denied")
	}
	if permission == "" {
		return nil, fmt.Errorf("access denied")
	}

	// Get attendees
	attendees, err := s.eventRepo.GetAttendeesByEventID(eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendees: %w", err)
	}

	// Get reminders
	reminders, err := s.reminderRepo.GetByEventID(eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get reminders: %w", err)
	}

	return &models.EventResponse{
		Event:     *event,
		Attendees: attendees,
		Reminders: reminders,
	}, nil
}

func (s *EventService) GetCalendarEvents(calendarID, userID uuid.UUID, startTime, endTime time.Time) ([]models.EventResponse, error) {
	// Check calendar permissions
	permission, err := s.calendarRepo.GetCalendarPermission(calendarID, userID)
	if err != nil {
		return nil, fmt.Errorf("access denied")
	}
	if permission == "" {
		return nil, fmt.Errorf("access denied")
	}

	events, err := s.eventRepo.GetByCalendarID(calendarID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get events: %w", err)
	}

	return s.enrichEvents(events)
}

func (s *EventService) GetUserEvents(userID uuid.UUID, startTime, endTime time.Time) ([]models.EventResponse, error) {
	events, err := s.eventRepo.GetByUserID(userID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get events: %w", err)
	}

	return s.enrichEvents(events)
}

func (s *EventService) UpdateEvent(eventID, userID uuid.UUID, req *models.UpdateEventRequest) (*models.EventResponse, error) {
	event, err := s.eventRepo.GetByID(eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %w", err)
	}

	// Check calendar permissions
	permission, err := s.calendarRepo.GetCalendarPermission(event.CalendarID, userID)
	if err != nil || (permission != models.PermissionAdmin && permission != models.PermissionWrite) {
		return nil, fmt.Errorf("insufficient permissions")
	}

	// Update fields
	if req.Title != nil {
		event.Title = *req.Title
	}
	if req.Description != nil {
		event.Description = *req.Description
	}
	if req.Location != nil {
		event.Location = *req.Location
	}
	if req.StartTime != nil {
		event.StartTime = *req.StartTime
	}
	if req.EndTime != nil {
		event.EndTime = *req.EndTime
	}
	if req.IsAllDay != nil {
		event.IsAllDay = *req.IsAllDay
	}
	if req.TimeZone != nil {
		event.TimeZone = *req.TimeZone
	}
	if req.RecurrenceRule != nil {
		event.RecurrenceRule = *req.RecurrenceRule
	}
	if req.Status != nil {
		event.Status = *req.Status
	}
	if req.BusyStatus != nil {
		event.BusyStatus = *req.BusyStatus
	}
	if req.Category != nil {
		event.Category = *req.Category
	}
	if req.Color != nil {
		event.Color = *req.Color
	}
	if req.MeetingURL != nil {
		event.MeetingURL = *req.MeetingURL
	}
	if req.Visibility != nil {
		event.Visibility = *req.Visibility
	}

	event.UpdatedAt = time.Now()

	err = s.eventRepo.Update(event)
	if err != nil {
		return nil, fmt.Errorf("failed to update event: %w", err)
	}

	// Update attendees if provided
	if req.Attendees != nil {
		// Delete existing attendees (except organizer)
		err = s.eventRepo.DeleteAttendeesByEventID(eventID)
		if err != nil {
			return nil, fmt.Errorf("failed to delete attendees: %w", err)
		}

		// Recreate attendees
		for _, attendeeReq := range *req.Attendees {
			attendee := &models.EventAttendee{
				ID:             uuid.New(),
				EventID:        event.ID,
				UserID:         attendeeReq.UserID,
				Email:          attendeeReq.Email,
				Name:           attendeeReq.Name,
				ResponseStatus: models.ResponseNeedsAction,
				IsOrganizer:    false,
				IsOptional:     attendeeReq.IsOptional,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}
			err = s.eventRepo.CreateAttendee(attendee)
			if err != nil {
				return nil, fmt.Errorf("failed to create attendee: %w", err)
			}
		}
	}

	return s.GetEvent(eventID, userID)
}

func (s *EventService) DeleteEvent(eventID, userID uuid.UUID) error {
	event, err := s.eventRepo.GetByID(eventID)
	if err != nil {
		return fmt.Errorf("failed to get event: %w", err)
	}

	// Check calendar permissions
	permission, err := s.calendarRepo.GetCalendarPermission(event.CalendarID, userID)
	if err != nil || (permission != models.PermissionAdmin && permission != models.PermissionWrite) {
		return fmt.Errorf("insufficient permissions")
	}

	err = s.eventRepo.Delete(eventID)
	if err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}

	return nil
}

func (s *EventService) RespondToEvent(eventID, userID uuid.UUID, email string, req *models.RSVPRequest) error {
	// Verify event exists
	_, err := s.eventRepo.GetByID(eventID)
	if err != nil {
		return fmt.Errorf("failed to get event: %w", err)
	}

	err = s.eventRepo.UpdateAttendeeResponse(eventID, userID, email, req.ResponseStatus)
	if err != nil {
		return fmt.Errorf("failed to update response: %w", err)
	}

	return nil
}

func (s *EventService) SearchEvents(userID uuid.UUID, query string) ([]models.EventResponse, error) {
	events, err := s.eventRepo.SearchEvents(userID, query, 50)
	if err != nil {
		return nil, fmt.Errorf("failed to search events: %w", err)
	}

	return s.enrichEvents(events)
}

func (s *EventService) enrichEvents(events []models.Event) ([]models.EventResponse, error) {
	var eventResponses []models.EventResponse
	for _, event := range events {
		attendees, err := s.eventRepo.GetAttendeesByEventID(event.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get attendees: %w", err)
		}

		reminders, err := s.reminderRepo.GetByEventID(event.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get reminders: %w", err)
		}

		eventResponses = append(eventResponses, models.EventResponse{
			Event:     event,
			Attendees: attendees,
			Reminders: reminders,
		})
	}
	return eventResponses, nil
}
