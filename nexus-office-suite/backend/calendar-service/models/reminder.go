package models

import (
	"time"

	"github.com/google/uuid"
)

type Reminder struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	EventID   uuid.UUID  `json:"event_id" db:"event_id"`
	UserID    uuid.UUID  `json:"user_id" db:"user_id"`
	Minutes   int        `json:"minutes" db:"minutes"` // Minutes before event
	Method    string     `json:"method" db:"method"`   // email, notification, popup
	Sent      bool       `json:"sent" db:"sent"`
	SentAt    *time.Time `json:"sent_at,omitempty" db:"sent_at"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateReminderInput struct {
	Minutes int    `json:"minutes" validate:"required"`
	Method  string `json:"method" validate:"required,oneof=email notification popup"`
}

const (
	ReminderMethodEmail        = "email"
	ReminderMethodNotification = "notification"
	ReminderMethodPopup        = "popup"
)
