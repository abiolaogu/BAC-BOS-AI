package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"nexus-calendar-service/models"

	"github.com/google/uuid"
)

type EventRepository struct {
	db *sql.DB
}

func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

func (r *EventRepository) Create(event *models.Event) error {
	query := `
		INSERT INTO events (id, calendar_id, user_id, title, description, location, start_time, end_time,
			is_all_day, time_zone, recurrence_rule, recurrence_id, status, busy_status, category, color,
			meeting_url, visibility, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
	`
	_, err := r.db.Exec(query,
		event.ID, event.CalendarID, event.UserID, event.Title, event.Description, event.Location,
		event.StartTime, event.EndTime, event.IsAllDay, event.TimeZone, event.RecurrenceRule,
		event.RecurrenceID, event.Status, event.BusyStatus, event.Category, event.Color,
		event.MeetingURL, event.Visibility, event.CreatedAt, event.UpdatedAt,
	)
	return err
}

func (r *EventRepository) GetByID(id uuid.UUID) (*models.Event, error) {
	query := `
		SELECT id, calendar_id, user_id, title, description, location, start_time, end_time,
			is_all_day, time_zone, recurrence_rule, recurrence_id, status, busy_status, category, color,
			meeting_url, visibility, created_at, updated_at, deleted_at
		FROM events
		WHERE id = $1 AND deleted_at IS NULL
	`
	var event models.Event
	err := r.db.QueryRow(query, id).Scan(
		&event.ID, &event.CalendarID, &event.UserID, &event.Title, &event.Description, &event.Location,
		&event.StartTime, &event.EndTime, &event.IsAllDay, &event.TimeZone, &event.RecurrenceRule,
		&event.RecurrenceID, &event.Status, &event.BusyStatus, &event.Category, &event.Color,
		&event.MeetingURL, &event.Visibility, &event.CreatedAt, &event.UpdatedAt, &event.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *EventRepository) GetByCalendarID(calendarID uuid.UUID, startTime, endTime time.Time) ([]models.Event, error) {
	query := `
		SELECT id, calendar_id, user_id, title, description, location, start_time, end_time,
			is_all_day, time_zone, recurrence_rule, recurrence_id, status, busy_status, category, color,
			meeting_url, visibility, created_at, updated_at, deleted_at
		FROM events
		WHERE calendar_id = $1
			AND deleted_at IS NULL
			AND (
				(start_time >= $2 AND start_time <= $3)
				OR (end_time >= $2 AND end_time <= $3)
				OR (start_time <= $2 AND end_time >= $3)
			)
		ORDER BY start_time ASC
	`
	rows, err := r.db.Query(query, calendarID, startTime, endTime)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanEvents(rows)
}

func (r *EventRepository) GetByUserID(userID uuid.UUID, startTime, endTime time.Time) ([]models.Event, error) {
	query := `
		SELECT e.id, e.calendar_id, e.user_id, e.title, e.description, e.location, e.start_time, e.end_time,
			e.is_all_day, e.time_zone, e.recurrence_rule, e.recurrence_id, e.status, e.busy_status, e.category, e.color,
			e.meeting_url, e.visibility, e.created_at, e.updated_at, e.deleted_at
		FROM events e
		INNER JOIN calendars c ON e.calendar_id = c.id
		WHERE c.user_id = $1
			AND e.deleted_at IS NULL
			AND c.deleted_at IS NULL
			AND (
				(e.start_time >= $2 AND e.start_time <= $3)
				OR (e.end_time >= $2 AND e.end_time <= $3)
				OR (e.start_time <= $2 AND e.end_time >= $3)
			)
		ORDER BY e.start_time ASC
	`
	rows, err := r.db.Query(query, userID, startTime, endTime)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanEvents(rows)
}

func (r *EventRepository) Update(event *models.Event) error {
	query := `
		UPDATE events
		SET title = $1, description = $2, location = $3, start_time = $4, end_time = $5,
			is_all_day = $6, time_zone = $7, recurrence_rule = $8, status = $9, busy_status = $10,
			category = $11, color = $12, meeting_url = $13, visibility = $14, updated_at = $15
		WHERE id = $16 AND deleted_at IS NULL
	`
	result, err := r.db.Exec(query,
		event.Title, event.Description, event.Location, event.StartTime, event.EndTime,
		event.IsAllDay, event.TimeZone, event.RecurrenceRule, event.Status, event.BusyStatus,
		event.Category, event.Color, event.MeetingURL, event.Visibility, time.Now(), event.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("event not found")
	}
	return nil
}

func (r *EventRepository) Delete(id uuid.UUID) error {
	query := `
		UPDATE events
		SET deleted_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`
	result, err := r.db.Exec(query, time.Now(), id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("event not found")
	}
	return nil
}

func (r *EventRepository) SearchEvents(userID uuid.UUID, query string, limit int) ([]models.Event, error) {
	searchQuery := `
		SELECT e.id, e.calendar_id, e.user_id, e.title, e.description, e.location, e.start_time, e.end_time,
			e.is_all_day, e.time_zone, e.recurrence_rule, e.recurrence_id, e.status, e.busy_status, e.category, e.color,
			e.meeting_url, e.visibility, e.created_at, e.updated_at, e.deleted_at
		FROM events e
		INNER JOIN calendars c ON e.calendar_id = c.id
		WHERE c.user_id = $1
			AND e.deleted_at IS NULL
			AND c.deleted_at IS NULL
			AND (e.title ILIKE $2 OR e.description ILIKE $2 OR e.location ILIKE $2)
		ORDER BY e.start_time DESC
		LIMIT $3
	`
	rows, err := r.db.Query(searchQuery, userID, "%"+query+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanEvents(rows)
}

func (r *EventRepository) scanEvents(rows *sql.Rows) ([]models.Event, error) {
	var events []models.Event
	for rows.Next() {
		var event models.Event
		err := rows.Scan(
			&event.ID, &event.CalendarID, &event.UserID, &event.Title, &event.Description, &event.Location,
			&event.StartTime, &event.EndTime, &event.IsAllDay, &event.TimeZone, &event.RecurrenceRule,
			&event.RecurrenceID, &event.Status, &event.BusyStatus, &event.Category, &event.Color,
			&event.MeetingURL, &event.Visibility, &event.CreatedAt, &event.UpdatedAt, &event.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, nil
}

// Attendee methods
func (r *EventRepository) CreateAttendee(attendee *models.EventAttendee) error {
	query := `
		INSERT INTO event_attendees (id, event_id, user_id, email, name, response_status, is_organizer, is_optional, notification_sent, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.Exec(query,
		attendee.ID, attendee.EventID, attendee.UserID, attendee.Email, attendee.Name,
		attendee.ResponseStatus, attendee.IsOrganizer, attendee.IsOptional, attendee.NotificationSent,
		attendee.CreatedAt, attendee.UpdatedAt,
	)
	return err
}

func (r *EventRepository) GetAttendeesByEventID(eventID uuid.UUID) ([]models.EventAttendee, error) {
	query := `
		SELECT id, event_id, user_id, email, name, response_status, is_organizer, is_optional, notification_sent, created_at, updated_at, deleted_at
		FROM event_attendees
		WHERE event_id = $1 AND deleted_at IS NULL
		ORDER BY is_organizer DESC, name ASC
	`
	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attendees []models.EventAttendee
	for rows.Next() {
		var attendee models.EventAttendee
		err := rows.Scan(
			&attendee.ID, &attendee.EventID, &attendee.UserID, &attendee.Email, &attendee.Name,
			&attendee.ResponseStatus, &attendee.IsOrganizer, &attendee.IsOptional, &attendee.NotificationSent,
			&attendee.CreatedAt, &attendee.UpdatedAt, &attendee.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		attendees = append(attendees, attendee)
	}
	return attendees, nil
}

func (r *EventRepository) UpdateAttendeeResponse(eventID, userID uuid.UUID, email, responseStatus string) error {
	query := `
		UPDATE event_attendees
		SET response_status = $1, updated_at = $2
		WHERE event_id = $3 AND (user_id = $4 OR email = $5) AND deleted_at IS NULL
	`
	result, err := r.db.Exec(query, responseStatus, time.Now(), eventID, userID, email)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("attendee not found")
	}
	return nil
}

func (r *EventRepository) DeleteAttendeesByEventID(eventID uuid.UUID) error {
	query := `
		UPDATE event_attendees
		SET deleted_at = $1
		WHERE event_id = $2 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(query, time.Now(), eventID)
	return err
}
