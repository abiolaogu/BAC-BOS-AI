package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"nexus-calendar-service/models"

	"github.com/google/uuid"
)

type CalendarRepository struct {
	db *sql.DB
}

func NewCalendarRepository(db *sql.DB) *CalendarRepository {
	return &CalendarRepository{db: db}
}

func (r *CalendarRepository) Create(calendar *models.Calendar) error {
	query := `
		INSERT INTO calendars (id, user_id, name, description, color, time_zone, is_default, is_visible, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(query,
		calendar.ID,
		calendar.UserID,
		calendar.Name,
		calendar.Description,
		calendar.Color,
		calendar.TimeZone,
		calendar.IsDefault,
		calendar.IsVisible,
		calendar.CreatedAt,
		calendar.UpdatedAt,
	)
	return err
}

func (r *CalendarRepository) GetByID(id uuid.UUID) (*models.Calendar, error) {
	query := `
		SELECT id, user_id, name, description, color, time_zone, is_default, is_visible, created_at, updated_at, deleted_at
		FROM calendars
		WHERE id = $1 AND deleted_at IS NULL
	`
	var calendar models.Calendar
	err := r.db.QueryRow(query, id).Scan(
		&calendar.ID,
		&calendar.UserID,
		&calendar.Name,
		&calendar.Description,
		&calendar.Color,
		&calendar.TimeZone,
		&calendar.IsDefault,
		&calendar.IsVisible,
		&calendar.CreatedAt,
		&calendar.UpdatedAt,
		&calendar.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &calendar, nil
}

func (r *CalendarRepository) GetByUserID(userID uuid.UUID) ([]models.Calendar, error) {
	query := `
		SELECT id, user_id, name, description, color, time_zone, is_default, is_visible, created_at, updated_at, deleted_at
		FROM calendars
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY is_default DESC, name ASC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var calendars []models.Calendar
	for rows.Next() {
		var calendar models.Calendar
		err := rows.Scan(
			&calendar.ID,
			&calendar.UserID,
			&calendar.Name,
			&calendar.Description,
			&calendar.Color,
			&calendar.TimeZone,
			&calendar.IsDefault,
			&calendar.IsVisible,
			&calendar.CreatedAt,
			&calendar.UpdatedAt,
			&calendar.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		calendars = append(calendars, calendar)
	}
	return calendars, nil
}

func (r *CalendarRepository) Update(calendar *models.Calendar) error {
	query := `
		UPDATE calendars
		SET name = $1, description = $2, color = $3, time_zone = $4, is_visible = $5, updated_at = $6
		WHERE id = $7 AND deleted_at IS NULL
	`
	result, err := r.db.Exec(query,
		calendar.Name,
		calendar.Description,
		calendar.Color,
		calendar.TimeZone,
		calendar.IsVisible,
		time.Now(),
		calendar.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("calendar not found")
	}
	return nil
}

func (r *CalendarRepository) Delete(id uuid.UUID) error {
	query := `
		UPDATE calendars
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
		return fmt.Errorf("calendar not found")
	}
	return nil
}

func (r *CalendarRepository) ShareCalendar(share *models.CalendarShare) error {
	query := `
		INSERT INTO calendar_shares (id, calendar_id, shared_with, permission, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(query,
		share.ID,
		share.CalendarID,
		share.SharedWith,
		share.Permission,
		share.CreatedAt,
		share.UpdatedAt,
	)
	return err
}

func (r *CalendarRepository) GetSharedCalendars(userID uuid.UUID) ([]models.Calendar, error) {
	query := `
		SELECT c.id, c.user_id, c.name, c.description, c.color, c.time_zone, c.is_default, c.is_visible, c.created_at, c.updated_at, c.deleted_at
		FROM calendars c
		INNER JOIN calendar_shares cs ON c.id = cs.calendar_id
		WHERE cs.shared_with = $1 AND c.deleted_at IS NULL AND cs.deleted_at IS NULL
		ORDER BY c.name ASC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var calendars []models.Calendar
	for rows.Next() {
		var calendar models.Calendar
		err := rows.Scan(
			&calendar.ID,
			&calendar.UserID,
			&calendar.Name,
			&calendar.Description,
			&calendar.Color,
			&calendar.TimeZone,
			&calendar.IsDefault,
			&calendar.IsVisible,
			&calendar.CreatedAt,
			&calendar.UpdatedAt,
			&calendar.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		calendars = append(calendars, calendar)
	}
	return calendars, nil
}

func (r *CalendarRepository) GetCalendarPermission(calendarID, userID uuid.UUID) (string, error) {
	// Check if user owns the calendar
	var ownerID uuid.UUID
	err := r.db.QueryRow("SELECT user_id FROM calendars WHERE id = $1 AND deleted_at IS NULL", calendarID).Scan(&ownerID)
	if err == nil && ownerID == userID {
		return models.PermissionAdmin, nil
	}

	// Check shared permissions
	var permission string
	query := `
		SELECT permission FROM calendar_shares
		WHERE calendar_id = $1 AND shared_with = $2 AND deleted_at IS NULL
	`
	err = r.db.QueryRow(query, calendarID, userID).Scan(&permission)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("no permission found")
		}
		return "", err
	}
	return permission, nil
}
