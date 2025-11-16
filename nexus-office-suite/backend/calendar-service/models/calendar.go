package models

import (
	"time"

	"github.com/google/uuid"
)

type Calendar struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	UserID      uuid.UUID  `json:"user_id" db:"user_id"`
	Name        string     `json:"name" db:"name"`
	Description string     `json:"description" db:"description"`
	Color       string     `json:"color" db:"color"`
	TimeZone    string     `json:"time_zone" db:"time_zone"`
	IsDefault   bool       `json:"is_default" db:"is_default"`
	IsVisible   bool       `json:"is_visible" db:"is_visible"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type CalendarShare struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	CalendarID uuid.UUID  `json:"calendar_id" db:"calendar_id"`
	SharedWith uuid.UUID  `json:"shared_with" db:"shared_with"`
	Permission string     `json:"permission" db:"permission"` // read, write, admin
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type CreateCalendarRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	Color       string `json:"color" validate:"required"`
	TimeZone    string `json:"time_zone" validate:"required"`
	IsDefault   bool   `json:"is_default"`
}

type UpdateCalendarRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Color       *string `json:"color,omitempty"`
	TimeZone    *string `json:"time_zone,omitempty"`
	IsVisible   *bool   `json:"is_visible,omitempty"`
}

type ShareCalendarRequest struct {
	SharedWith uuid.UUID `json:"shared_with" validate:"required"`
	Permission string    `json:"permission" validate:"required,oneof=read write admin"`
}

const (
	PermissionRead  = "read"
	PermissionWrite = "write"
	PermissionAdmin = "admin"
)
