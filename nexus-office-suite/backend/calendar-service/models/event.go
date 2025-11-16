package models

import (
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	CalendarID     uuid.UUID  `json:"calendar_id" db:"calendar_id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	Title          string     `json:"title" db:"title"`
	Description    string     `json:"description" db:"description"`
	Location       string     `json:"location" db:"location"`
	StartTime      time.Time  `json:"start_time" db:"start_time"`
	EndTime        time.Time  `json:"end_time" db:"end_time"`
	IsAllDay       bool       `json:"is_all_day" db:"is_all_day"`
	TimeZone       string     `json:"time_zone" db:"time_zone"`
	RecurrenceRule string     `json:"recurrence_rule,omitempty" db:"recurrence_rule"` // RRULE format
	RecurrenceID   *uuid.UUID `json:"recurrence_id,omitempty" db:"recurrence_id"`     // Parent event for recurring instances
	Status         string     `json:"status" db:"status"`                             // confirmed, tentative, cancelled
	BusyStatus     string     `json:"busy_status" db:"busy_status"`                   // busy, free, tentative, out-of-office
	Category       string     `json:"category" db:"category"`
	Color          string     `json:"color" db:"color"`
	MeetingURL     string     `json:"meeting_url,omitempty" db:"meeting_url"` // NEXUS Meet integration
	Visibility     string     `json:"visibility" db:"visibility"`             // public, private
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type EventAttendee struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	EventID          uuid.UUID  `json:"event_id" db:"event_id"`
	UserID           *uuid.UUID `json:"user_id,omitempty" db:"user_id"` // Internal user
	Email            string     `json:"email" db:"email"`               // External attendee
	Name             string     `json:"name" db:"name"`
	ResponseStatus   string     `json:"response_status" db:"response_status"` // accepted, declined, tentative, needs-action
	IsOrganizer      bool       `json:"is_organizer" db:"is_organizer"`
	IsOptional       bool       `json:"is_optional" db:"is_optional"`
	NotificationSent bool       `json:"notification_sent" db:"notification_sent"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type CreateEventRequest struct {
	CalendarID     uuid.UUID             `json:"calendar_id" validate:"required"`
	Title          string                `json:"title" validate:"required"`
	Description    string                `json:"description"`
	Location       string                `json:"location"`
	StartTime      time.Time             `json:"start_time" validate:"required"`
	EndTime        time.Time             `json:"end_time" validate:"required"`
	IsAllDay       bool                  `json:"is_all_day"`
	TimeZone       string                `json:"time_zone" validate:"required"`
	RecurrenceRule string                `json:"recurrence_rule,omitempty"`
	Status         string                `json:"status"`
	BusyStatus     string                `json:"busy_status"`
	Category       string                `json:"category"`
	Color          string                `json:"color"`
	MeetingURL     string                `json:"meeting_url,omitempty"`
	Visibility     string                `json:"visibility"`
	Attendees      []CreateAttendeeInput `json:"attendees,omitempty"`
	Reminders      []CreateReminderInput `json:"reminders,omitempty"`
}

type UpdateEventRequest struct {
	Title          *string                `json:"title,omitempty"`
	Description    *string                `json:"description,omitempty"`
	Location       *string                `json:"location,omitempty"`
	StartTime      *time.Time             `json:"start_time,omitempty"`
	EndTime        *time.Time             `json:"end_time,omitempty"`
	IsAllDay       *bool                  `json:"is_all_day,omitempty"`
	TimeZone       *string                `json:"time_zone,omitempty"`
	RecurrenceRule *string                `json:"recurrence_rule,omitempty"`
	Status         *string                `json:"status,omitempty"`
	BusyStatus     *string                `json:"busy_status,omitempty"`
	Category       *string                `json:"category,omitempty"`
	Color          *string                `json:"color,omitempty"`
	MeetingURL     *string                `json:"meeting_url,omitempty"`
	Visibility     *string                `json:"visibility,omitempty"`
	Attendees      *[]CreateAttendeeInput `json:"attendees,omitempty"`
}

type CreateAttendeeInput struct {
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	Email      string     `json:"email" validate:"required,email"`
	Name       string     `json:"name"`
	IsOptional bool       `json:"is_optional"`
}

type EventResponse struct {
	Event     Event           `json:"event"`
	Attendees []EventAttendee `json:"attendees,omitempty"`
	Reminders []Reminder      `json:"reminders,omitempty"`
}

type RSVPRequest struct {
	ResponseStatus string `json:"response_status" validate:"required,oneof=accepted declined tentative"`
}

const (
	StatusConfirmed = "confirmed"
	StatusTentative = "tentative"
	StatusCancelled = "cancelled"

	BusyStatusBusy        = "busy"
	BusyStatusFree        = "free"
	BusyStatusTentative   = "tentative"
	BusyStatusOutOfOffice = "out-of-office"

	ResponseAccepted    = "accepted"
	ResponseDeclined    = "declined"
	ResponseTentative   = "tentative"
	ResponseNeedsAction = "needs-action"

	VisibilityPublic  = "public"
	VisibilityPrivate = "private"
)
