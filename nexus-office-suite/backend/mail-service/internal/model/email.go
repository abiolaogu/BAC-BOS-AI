package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// Email represents an email message
type Email struct {
	ID              string          `json:"id" db:"id"`
	UserID          string          `json:"user_id" db:"user_id"`
	MessageID       string          `json:"message_id" db:"message_id"`
	ThreadID        string          `json:"thread_id" db:"thread_id"`
	InReplyTo       *string         `json:"in_reply_to,omitempty" db:"in_reply_to"`
	References      StringArray     `json:"references,omitempty" db:"references"`
	From            string          `json:"from" db:"from_address"`
	FromName        string          `json:"from_name" db:"from_name"`
	To              StringArray     `json:"to" db:"to_addresses"`
	CC              StringArray     `json:"cc,omitempty" db:"cc_addresses"`
	BCC             StringArray     `json:"bcc,omitempty" db:"bcc_addresses"`
	Subject         string          `json:"subject" db:"subject"`
	Body            string          `json:"body" db:"body"`
	BodyHTML        string          `json:"body_html" db:"body_html"`
	FolderID        string          `json:"folder_id" db:"folder_id"`
	IsRead          bool            `json:"is_read" db:"is_read"`
	IsStarred       bool            `json:"is_starred" db:"is_starred"`
	IsDraft         bool            `json:"is_draft" db:"is_draft"`
	IsSpam          bool            `json:"is_spam" db:"is_spam"`
	IsDeleted       bool            `json:"is_deleted" db:"is_deleted"`
	HasAttachments  bool            `json:"has_attachments" db:"has_attachments"`
	Priority        string          `json:"priority" db:"priority"` // low, normal, high
	SpamScore       float64         `json:"spam_score" db:"spam_score"`
	Size            int64           `json:"size" db:"size"`
	ReceivedAt      time.Time       `json:"received_at" db:"received_at"`
	SentAt          *time.Time      `json:"sent_at,omitempty" db:"sent_at"`
	ScheduledAt     *time.Time      `json:"scheduled_at,omitempty" db:"scheduled_at"`
	ReadAt          *time.Time      `json:"read_at,omitempty" db:"read_at"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
	Attachments     []Attachment    `json:"attachments,omitempty" db:"-"`
	Labels          []Label         `json:"labels,omitempty" db:"-"`
	Headers         Headers         `json:"headers,omitempty" db:"headers"`
}

// Folder represents an email folder
type Folder struct {
	ID        string     `json:"id" db:"id"`
	UserID    string     `json:"user_id" db:"user_id"`
	Name      string     `json:"name" db:"name"`
	Type      string     `json:"type" db:"type"` // inbox, sent, drafts, trash, spam, custom
	ParentID  *string    `json:"parent_id,omitempty" db:"parent_id"`
	Icon      string     `json:"icon" db:"icon"`
	Color     string     `json:"color" db:"color"`
	Order     int        `json:"order" db:"sort_order"`
	UnreadCount int      `json:"unread_count" db:"-"`
	TotalCount  int      `json:"total_count" db:"-"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

// Label represents an email label/tag
type Label struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Name      string    `json:"name" db:"name"`
	Color     string    `json:"color" db:"color"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// EmailLabel represents the many-to-many relationship between emails and labels
type EmailLabel struct {
	EmailID   string    `json:"email_id" db:"email_id"`
	LabelID   string    `json:"label_id" db:"label_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Attachment represents an email attachment
type Attachment struct {
	ID          string    `json:"id" db:"id"`
	EmailID     string    `json:"email_id" db:"email_id"`
	Filename    string    `json:"filename" db:"filename"`
	ContentType string    `json:"content_type" db:"content_type"`
	Size        int64     `json:"size" db:"size"`
	StoragePath string    `json:"storage_path" db:"storage_path"`
	ContentID   *string   `json:"content_id,omitempty" db:"content_id"` // For inline images
	IsInline    bool      `json:"is_inline" db:"is_inline"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Contact represents an email contact
type Contact struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Email     string    `json:"email" db:"email"`
	Name      string    `json:"name" db:"name"`
	Company   string    `json:"company,omitempty" db:"company"`
	Phone     string    `json:"phone,omitempty" db:"phone"`
	Notes     string    `json:"notes,omitempty" db:"notes"`
	IsFavorite bool     `json:"is_favorite" db:"is_favorite"`
	LastEmailedAt *time.Time `json:"last_emailed_at,omitempty" db:"last_emailed_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Filter represents an email filter/rule
type Filter struct {
	ID          string          `json:"id" db:"id"`
	UserID      string          `json:"user_id" db:"user_id"`
	Name        string          `json:"name" db:"name"`
	Enabled     bool            `json:"enabled" db:"enabled"`
	Priority    int             `json:"priority" db:"priority"`
	Conditions  FilterConditions `json:"conditions" db:"conditions"`
	Actions     FilterActions    `json:"actions" db:"actions"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at" db:"updated_at"`
}

// FilterConditions represents filter matching conditions
type FilterConditions struct {
	From        string   `json:"from,omitempty"`
	To          string   `json:"to,omitempty"`
	Subject     string   `json:"subject,omitempty"`
	Body        string   `json:"body,omitempty"`
	HasAttachment bool   `json:"has_attachment,omitempty"`
	Labels      []string `json:"labels,omitempty"`
}

// FilterActions represents actions to perform when filter matches
type FilterActions struct {
	MarkAsRead    bool     `json:"mark_as_read,omitempty"`
	MarkAsStarred bool     `json:"mark_as_starred,omitempty"`
	MoveTo        string   `json:"move_to,omitempty"`
	AddLabels     []string `json:"add_labels,omitempty"`
	Forward       string   `json:"forward,omitempty"`
	Delete        bool     `json:"delete,omitempty"`
}

// Signature represents an email signature
type Signature struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Name      string    `json:"name" db:"name"`
	Content   string    `json:"content" db:"content"`
	IsDefault bool      `json:"is_default" db:"is_default"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// AutoResponder represents an auto-responder configuration
type AutoResponder struct {
	ID        string     `json:"id" db:"id"`
	UserID    string     `json:"user_id" db:"user_id"`
	Enabled   bool       `json:"enabled" db:"enabled"`
	Subject   string     `json:"subject" db:"subject"`
	Message   string     `json:"message" db:"message"`
	StartDate *time.Time `json:"start_date,omitempty" db:"start_date"`
	EndDate   *time.Time `json:"end_date,omitempty" db:"end_date"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

// Alias represents an email alias
type Alias struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Alias     string    `json:"alias" db:"alias"`
	Enabled   bool      `json:"enabled" db:"enabled"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Custom types for PostgreSQL arrays and JSON

// StringArray handles PostgreSQL text arrays
type StringArray []string

func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan StringArray")
	}

	return json.Unmarshal(bytes, a)
}

func (a StringArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return []byte("[]"), nil
	}
	return json.Marshal(a)
}

// Headers handles PostgreSQL JSONB for email headers
type Headers map[string][]string

func (h *Headers) Scan(value interface{}) error {
	if value == nil {
		*h = make(map[string][]string)
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan Headers")
	}

	return json.Unmarshal(bytes, h)
}

func (h Headers) Value() (driver.Value, error) {
	if len(h) == 0 {
		return []byte("{}"), nil
	}
	return json.Marshal(h)
}

// Value implements driver.Valuer for FilterConditions
func (fc FilterConditions) Value() (driver.Value, error) {
	return json.Marshal(fc)
}

// Scan implements sql.Scanner for FilterConditions
func (fc *FilterConditions) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan FilterConditions")
	}
	return json.Unmarshal(bytes, fc)
}

// Value implements driver.Valuer for FilterActions
func (fa FilterActions) Value() (driver.Value, error) {
	return json.Marshal(fa)
}

// Scan implements sql.Scanner for FilterActions
func (fa *FilterActions) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan FilterActions")
	}
	return json.Unmarshal(bytes, fa)
}

// DTO types for API requests/responses

type ComposeEmailRequest struct {
	To             []string          `json:"to" binding:"required"`
	CC             []string          `json:"cc,omitempty"`
	BCC            []string          `json:"bcc,omitempty"`
	Subject        string            `json:"subject" binding:"required"`
	Body           string            `json:"body"`
	BodyHTML       string            `json:"body_html"`
	Attachments    []string          `json:"attachments,omitempty"` // Attachment IDs
	Priority       string            `json:"priority,omitempty"`
	ScheduledAt    *time.Time        `json:"scheduled_at,omitempty"`
	SignatureID    string            `json:"signature_id,omitempty"`
	InReplyTo      string            `json:"in_reply_to,omitempty"`
	References     []string          `json:"references,omitempty"`
}

type EmailListResponse struct {
	Emails      []Email `json:"emails"`
	Total       int     `json:"total"`
	Page        int     `json:"page"`
	PageSize    int     `json:"page_size"`
	HasMore     bool    `json:"has_more"`
}

type SearchEmailRequest struct {
	Query       string    `json:"query"`
	FolderID    string    `json:"folder_id,omitempty"`
	Labels      []string  `json:"labels,omitempty"`
	HasAttachment bool    `json:"has_attachment,omitempty"`
	IsUnread    bool      `json:"is_unread,omitempty"`
	DateFrom    *time.Time `json:"date_from,omitempty"`
	DateTo      *time.Time `json:"date_to,omitempty"`
	Page        int       `json:"page"`
	PageSize    int       `json:"page_size"`
}

type BulkActionRequest struct {
	EmailIDs  []string `json:"email_ids" binding:"required"`
	Action    string   `json:"action" binding:"required"` // mark_read, mark_unread, star, unstar, delete, move, add_label
	FolderID  string   `json:"folder_id,omitempty"`
	LabelIDs  []string `json:"label_ids,omitempty"`
}
