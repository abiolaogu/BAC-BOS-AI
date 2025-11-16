package repositories

import (
	"database/sql"
	"time"

	"nexus-calendar-service/models"

	"github.com/google/uuid"
)

type ReminderRepository struct {
	db *sql.DB
}

func NewReminderRepository(db *sql.DB) *ReminderRepository {
	return &ReminderRepository{db: db}
}

func (r *ReminderRepository) Create(reminder *models.Reminder) error {
	query := `
		INSERT INTO reminders (id, event_id, user_id, minutes, method, sent, sent_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.Exec(query,
		reminder.ID,
		reminder.EventID,
		reminder.UserID,
		reminder.Minutes,
		reminder.Method,
		reminder.Sent,
		reminder.SentAt,
		reminder.CreatedAt,
		reminder.UpdatedAt,
	)
	return err
}

func (r *ReminderRepository) GetByEventID(eventID uuid.UUID) ([]models.Reminder, error) {
	query := `
		SELECT id, event_id, user_id, minutes, method, sent, sent_at, created_at, updated_at
		FROM reminders
		WHERE event_id = $1
		ORDER BY minutes ASC
	`
	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []models.Reminder
	for rows.Next() {
		var reminder models.Reminder
		err := rows.Scan(
			&reminder.ID,
			&reminder.EventID,
			&reminder.UserID,
			&reminder.Minutes,
			&reminder.Method,
			&reminder.Sent,
			&reminder.SentAt,
			&reminder.CreatedAt,
			&reminder.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		reminders = append(reminders, reminder)
	}
	return reminders, nil
}

func (r *ReminderRepository) GetPendingReminders() ([]models.Reminder, error) {
	query := `
		SELECT r.id, r.event_id, r.user_id, r.minutes, r.method, r.sent, r.sent_at, r.created_at, r.updated_at
		FROM reminders r
		INNER JOIN events e ON r.event_id = e.id
		WHERE r.sent = false
			AND e.deleted_at IS NULL
			AND e.start_time - (r.minutes * INTERVAL '1 minute') <= NOW()
			AND e.start_time > NOW()
		ORDER BY e.start_time ASC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []models.Reminder
	for rows.Next() {
		var reminder models.Reminder
		err := rows.Scan(
			&reminder.ID,
			&reminder.EventID,
			&reminder.UserID,
			&reminder.Minutes,
			&reminder.Method,
			&reminder.Sent,
			&reminder.SentAt,
			&reminder.CreatedAt,
			&reminder.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		reminders = append(reminders, reminder)
	}
	return reminders, nil
}

func (r *ReminderRepository) MarkAsSent(id uuid.UUID) error {
	query := `
		UPDATE reminders
		SET sent = true, sent_at = $1, updated_at = $2
		WHERE id = $3
	`
	_, err := r.db.Exec(query, time.Now(), time.Now(), id)
	return err
}

func (r *ReminderRepository) DeleteByEventID(eventID uuid.UUID) error {
	query := `DELETE FROM reminders WHERE event_id = $1`
	_, err := r.db.Exec(query, eventID)
	return err
}
