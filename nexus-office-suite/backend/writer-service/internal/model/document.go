// internal/model/document.go
package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Document struct {
	ID          uuid.UUID       `json:"id" db:"id"`
	TenantID    uuid.UUID       `json:"tenantId" db:"tenant_id"`
	Title       string          `json:"title" db:"title"`
	Content     DocumentContent `json:"content" db:"content"`
	CreatedBy   uuid.UUID       `json:"createdBy" db:"created_by"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
	Version     int             `json:"version" db:"version"`
	Status      string          `json:"status" db:"status"`
	FolderID    *uuid.UUID      `json:"folderId,omitempty" db:"folder_id"`
	IsDeleted   bool            `json:"isDeleted" db:"is_deleted"`
	Permissions []Permission    `json:"permissions,omitempty" db:"-"`
}

type DocumentContent struct {
	Type    string        `json:"type"`
	Content []ContentNode `json:"content"`
}

type ContentNode struct {
	Type    string        `json:"type"`
	Attrs   *Attrs        `json:"attrs,omitempty"`
	Content []ContentNode `json:"content,omitempty"`
	Text    string        `json:"text,omitempty"`
	Marks   []TextMark    `json:"marks,omitempty"`
}

type Attrs map[string]interface{}

type TextMark struct {
	Type  string `json:"type"`
	Attrs *Attrs `json:"attrs,omitempty"`
}

// Implement sql.Scanner for DocumentContent
func (dc *DocumentContent) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal(value.([]byte), dc)
	}
	return json.Unmarshal(bytes, dc)
}

// Implement driver.Valuer for DocumentContent
func (dc DocumentContent) Value() (driver.Value, error) {
	return json.Marshal(dc)
}

type Permission struct {
	DocumentID uuid.UUID `json:"documentId" db:"document_id"`
	UserID     uuid.UUID `json:"userId" db:"user_id"`
	Permission string    `json:"permission" db:"permission"`
	AddedBy    uuid.UUID `json:"addedBy" db:"added_by"`
	AddedAt    time.Time `json:"addedAt" db:"added_at"`
}

type DocumentVersion struct {
	ID            uuid.UUID       `json:"id" db:"id"`
	DocumentID    uuid.UUID       `json:"documentId" db:"document_id"`
	Version       int             `json:"version" db:"version"`
	Content       DocumentContent `json:"content" db:"content"`
	CreatedBy     uuid.UUID       `json:"createdBy" db:"created_by"`
	CreatedAt     time.Time       `json:"createdAt" db:"created_at"`
	ChangeSummary *string         `json:"changeSummary,omitempty" db:"change_summary"`
}

type Comment struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	DocumentID      uuid.UUID  `json:"documentId" db:"document_id"`
	UserID          uuid.UUID  `json:"userId" db:"user_id"`
	Content         string     `json:"content" db:"content"`
	Position        *Position  `json:"position,omitempty" db:"position"`
	ParentCommentID *uuid.UUID `json:"parentCommentId,omitempty" db:"parent_comment_id"`
	CreatedAt       time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt       *time.Time `json:"updatedAt,omitempty" db:"updated_at"`
	IsResolved      bool       `json:"isResolved" db:"is_resolved"`
	ResolvedAt      *time.Time `json:"resolvedAt,omitempty" db:"resolved_at"`
	ResolvedBy      *uuid.UUID `json:"resolvedBy,omitempty" db:"resolved_by"`
}

type Position struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// Implement sql.Scanner for Position
func (p *Position) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal(value.([]byte), p)
	}
	return json.Unmarshal(bytes, p)
}

// Implement driver.Valuer for Position
func (p Position) Value() (driver.Value, error) {
	return json.Marshal(p)
}

type Activity struct {
	ID         uuid.UUID              `json:"id" db:"id"`
	DocumentID uuid.UUID              `json:"documentId" db:"document_id"`
	UserID     uuid.UUID              `json:"userId" db:"user_id"`
	Action     string                 `json:"action" db:"action"`
	Metadata   map[string]interface{} `json:"metadata,omitempty" db:"metadata"`
	CreatedAt  time.Time              `json:"createdAt" db:"created_at"`
}

// DTOs for API requests/responses

type CreateDocumentRequest struct {
	Title    string          `json:"title"`
	Content  DocumentContent `json:"content"`
	FolderID *uuid.UUID      `json:"folderId,omitempty"`
}

type UpdateDocumentRequest struct {
	Title   *string          `json:"title,omitempty"`
	Content *DocumentContent `json:"content,omitempty"`
	Status  *string          `json:"status,omitempty"`
}

type CreateVersionRequest struct {
	ChangeSummary string `json:"changeSummary"`
}

type ShareDocumentRequest struct {
	Users   []ShareRecipient `json:"users"`
	Message *string          `json:"message,omitempty"`
}

type ShareRecipient struct {
	UserID     *uuid.UUID `json:"userId,omitempty"`
	Email      *string    `json:"email,omitempty"`
	Permission string     `json:"permission"`
}

type CreateCommentRequest struct {
	Content  string    `json:"content"`
	Position *Position `json:"position,omitempty"`
}

type UpdateCommentRequest struct {
	Content string `json:"content"`
}

type ListDocumentsQuery struct {
	FolderID  *uuid.UUID
	Status    *string
	Search    *string
	Page      int
	Limit     int
	SortBy    string
	SortOrder string
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasMore    bool `json:"hasMore"`
}

type ErrorResponse struct {
	StatusCode int            `json:"statusCode"`
	Message    string         `json:"message"`
	Errors     []FieldError   `json:"errors,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}
