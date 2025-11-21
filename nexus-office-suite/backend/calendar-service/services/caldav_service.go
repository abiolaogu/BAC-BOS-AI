package services

import (
	"fmt"
	"time"

	"nexus-calendar-service/models"
	"nexus-calendar-service/repositories"

	"github.com/emersion/go-ical"
	"github.com/google/uuid"
)

type CalDAVService struct {
	eventRepo    *repositories.EventRepository
	calendarRepo *repositories.CalendarRepository
}

func NewCalDAVService(
	eventRepo *repositories.EventRepository,
	calendarRepo *repositories.CalendarRepository,
) *CalDAVService {
	return &CalDAVService{
		eventRepo:    eventRepo,
		calendarRepo: calendarRepo,
	}
}

// ExportToICS exports a calendar to iCalendar format
func (s *CalDAVService) ExportToICS(calendarID, userID uuid.UUID, startTime, endTime time.Time) (string, error) {
	// Check permissions
	permission, err := s.calendarRepo.GetCalendarPermission(calendarID, userID)
	if err != nil {
		return "", fmt.Errorf("access denied")
	}
	if permission == "" {
		return "", fmt.Errorf("access denied")
	}

	// Get calendar
	calendar, err := s.calendarRepo.GetByID(calendarID)
	if err != nil {
		return "", fmt.Errorf("failed to get calendar: %w", err)
	}

	// Get events
	events, err := s.eventRepo.GetByCalendarID(calendarID, startTime, endTime)
	if err != nil {
		return "", fmt.Errorf("failed to get events: %w", err)
	}

	// Create iCalendar
	cal := ical.NewCalendar()
	cal.Props.SetText(ical.PropVersion, "2.0")
	cal.Props.SetText(ical.PropProductID, "-//NEXUS Calendar//EN")
	cal.Props.SetText(ical.PropCalendarName, calendar.Name)
	cal.Props.SetText(ical.PropTimezoneID, calendar.TimeZone)

	// Add events
	for _, event := range events {
		calEvent := s.eventToICalEvent(&event)
		cal.Children = append(cal.Children, calEvent)
	}

	return cal.Encode(), nil
}

// ImportFromICS imports events from iCalendar format
func (s *CalDAVService) ImportFromICS(calendarID, userID uuid.UUID, icsData string) error {
	// Check permissions
	permission, err := s.calendarRepo.GetCalendarPermission(calendarID, userID)
	if err != nil || (permission != models.PermissionAdmin && permission != models.PermissionWrite) {
		return fmt.Errorf("insufficient permissions")
	}

	// Parse iCalendar
	cal, err := ical.NewDecoder([]byte(icsData)).Decode()
	if err != nil {
		return fmt.Errorf("failed to parse iCalendar: %w", err)
	}

	// Import events
	for _, component := range cal.Children {
		if component.Name == ical.CompEvent {
			event, err := s.iCalEventToEvent(component, calendarID, userID)
			if err != nil {
				continue // Skip invalid events
			}
			err = s.eventRepo.Create(event)
			if err != nil {
				return fmt.Errorf("failed to import event: %w", err)
			}
		}
	}

	return nil
}

// eventToICalEvent converts an Event model to iCalendar event
func (s *CalDAVService) eventToICalEvent(event *models.Event) *ical.Component {
	calEvent := ical.NewComponent(ical.CompEvent)

	calEvent.Props.SetText(ical.PropUID, event.ID.String())
	calEvent.Props.SetText(ical.PropSummary, event.Title)
	calEvent.Props.SetText(ical.PropDescription, event.Description)
	calEvent.Props.SetText(ical.PropLocation, event.Location)
	calEvent.Props.SetDateTime(ical.PropDateTimeStamp, time.Now())
	calEvent.Props.SetDateTime(ical.PropDateTimeStart, event.StartTime)
	calEvent.Props.SetDateTime(ical.PropDateTimeEnd, event.EndTime)
	calEvent.Props.SetText(ical.PropStatus, s.statusToICalStatus(event.Status))
	calEvent.Props.SetText(ical.PropTransparency, s.busyStatusToTransparency(event.BusyStatus))
	calEvent.Props.SetText(ical.PropCategories, event.Category)

	if event.RecurrenceRule != "" {
		calEvent.Props.SetText(ical.PropRecurrenceRule, event.RecurrenceRule)
	}

	return calEvent
}

// iCalEventToEvent converts an iCalendar event to Event model
func (s *CalDAVService) iCalEventToEvent(component *ical.Component, calendarID, userID uuid.UUID) (*models.Event, error) {
	uidProp := component.Props.Get(ical.PropUID)
	if uidProp == nil {
		return nil, fmt.Errorf("event missing UID")
	}

	summaryProp := component.Props.Get(ical.PropSummary)
	if summaryProp == nil {
		return nil, fmt.Errorf("event missing summary")
	}

	dtStartProp := component.Props.Get(ical.PropDateTimeStart)
	if dtStartProp == nil {
		return nil, fmt.Errorf("event missing start time")
	}

	dtEndProp := component.Props.Get(ical.PropDateTimeEnd)
	if dtEndProp == nil {
		return nil, fmt.Errorf("event missing end time")
	}

	startTime, err := dtStartProp.DateTime(time.UTC)
	if err != nil {
		return nil, fmt.Errorf("invalid start time")
	}

	endTime, err := dtEndProp.DateTime(time.UTC)
	if err != nil {
		return nil, fmt.Errorf("invalid end time")
	}

	event := &models.Event{
		ID:          uuid.New(),
		CalendarID:  calendarID,
		UserID:      userID,
		Title:       summaryProp.Value,
		Description: component.Props.Text(ical.PropDescription),
		Location:    component.Props.Text(ical.PropLocation),
		StartTime:   startTime,
		EndTime:     endTime,
		IsAllDay:    false,
		TimeZone:    "UTC",
		Status:      s.iCalStatusToStatus(component.Props.Text(ical.PropStatus)),
		BusyStatus:  s.transparencyToBusyStatus(component.Props.Text(ical.PropTransparency)),
		Category:    component.Props.Text(ical.PropCategories),
		Visibility:  models.VisibilityPublic,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	rruleProp := component.Props.Get(ical.PropRecurrenceRule)
	if rruleProp != nil {
		event.RecurrenceRule = rruleProp.Value
	}

	return event, nil
}

func (s *CalDAVService) statusToICalStatus(status string) string {
	switch status {
	case models.StatusConfirmed:
		return "CONFIRMED"
	case models.StatusTentative:
		return "TENTATIVE"
	case models.StatusCancelled:
		return "CANCELLED"
	default:
		return "CONFIRMED"
	}
}

func (s *CalDAVService) iCalStatusToStatus(icalStatus string) string {
	switch icalStatus {
	case "CONFIRMED":
		return models.StatusConfirmed
	case "TENTATIVE":
		return models.StatusTentative
	case "CANCELLED":
		return models.StatusCancelled
	default:
		return models.StatusConfirmed
	}
}

func (s *CalDAVService) busyStatusToTransparency(busyStatus string) string {
	if busyStatus == models.BusyStatusFree {
		return "TRANSPARENT"
	}
	return "OPAQUE"
}

func (s *CalDAVService) transparencyToBusyStatus(transparency string) string {
	if transparency == "TRANSPARENT" {
		return models.BusyStatusFree
	}
	return models.BusyStatusBusy
}

// GetCalDAVURL returns the CalDAV URL for a calendar
func (s *CalDAVService) GetCalDAVURL(calendarID uuid.UUID, baseURL string) string {
	return fmt.Sprintf("%s/caldav/calendars/%s", baseURL, calendarID.String())
}
