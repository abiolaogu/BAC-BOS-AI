package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// FileType represents the type of file
type FileType string

const (
	FileTypeDocument    FileType = "document"
	FileTypeSpreadsheet FileType = "spreadsheet"
	FileTypePresentation FileType = "presentation"
	FileTypeImage       FileType = "image"
	FileTypeVideo       FileType = "video"
	FileTypeAudio       FileType = "audio"
	FileTypeArchive     FileType = "archive"
	FileTypeOther       FileType = "other"
)

// File represents a file in the drive
type File struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	TenantID        uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	OwnerID         uuid.UUID  `json:"owner_id" db:"owner_id"`
	FolderID        *uuid.UUID `json:"folder_id,omitempty" db:"folder_id"`
	Name            string     `json:"name" db:"name"`
	OriginalName    string     `json:"original_name" db:"original_name"`
	MimeType        string     `json:"mime_type" db:"mime_type"`
	FileType        FileType   `json:"file_type" db:"file_type"`
	Size            int64      `json:"size" db:"size"`
	StoragePath     string     `json:"storage_path" db:"storage_path"`
	Version         int        `json:"version" db:"version"`
	IsStarred       bool       `json:"is_starred" db:"is_starred"`
	IsTrashed       bool       `json:"is_trashed" db:"is_trashed"`
	TrashedAt       *time.Time `json:"trashed_at,omitempty" db:"trashed_at"`
	Description     *string    `json:"description,omitempty" db:"description"`
	Tags            Tags       `json:"tags,omitempty" db:"tags"`
	Metadata        Metadata   `json:"metadata,omitempty" db:"metadata"`
	ThumbnailPath   *string    `json:"thumbnail_path,omitempty" db:"thumbnail_path"`
	LastAccessedAt  *time.Time `json:"last_accessed_at,omitempty" db:"last_accessed_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// Folder represents a folder in the drive
type Folder struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	TenantID    uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	OwnerID     uuid.UUID  `json:"owner_id" db:"owner_id"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty" db:"parent_id"`
	Name        string     `json:"name" db:"name"`
	Color       *string    `json:"color,omitempty" db:"color"`
	IsStarred   bool       `json:"is_starred" db:"is_starred"`
	IsTrashed   bool       `json:"is_trashed" db:"is_trashed"`
	TrashedAt   *time.Time `json:"trashed_at,omitempty" db:"trashed_at"`
	Description *string    `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// FileVersion represents a version of a file
type FileVersion struct {
	ID          uuid.UUID `json:"id" db:"id"`
	FileID      uuid.UUID `json:"file_id" db:"file_id"`
	VersionNum  int       `json:"version_num" db:"version_num"`
	Size        int64     `json:"size" db:"size"`
	StoragePath string    `json:"storage_path" db:"storage_path"`
	CreatedBy   uuid.UUID `json:"created_by" db:"created_by"`
	Comment     *string   `json:"comment,omitempty" db:"comment"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Tags is a custom type for file tags
type Tags []string

// Value implements the driver.Valuer interface
func (t Tags) Value() (driver.Value, error) {
	if t == nil {
		return nil, nil
	}
	return json.Marshal(t)
}

// Scan implements the sql.Scanner interface
func (t *Tags) Scan(value interface{}) error {
	if value == nil {
		*t = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, t)
}

// Metadata is a custom type for file metadata
type Metadata map[string]interface{}

// Value implements the driver.Valuer interface
func (m Metadata) Value() (driver.Value, error) {
	if m == nil {
		return nil, nil
	}
	return json.Marshal(m)
}

// Scan implements the sql.Scanner interface
func (m *Metadata) Scan(value interface{}) error {
	if value == nil {
		*m = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, m)
}

// FileInfo combines file and folder information
type FileInfo struct {
	*File
	*Folder
	Type         string           `json:"type"` // "file" or "folder"
	Path         string           `json:"path,omitempty"`
	Permissions  *Permission      `json:"permissions,omitempty"`
	SharedWith   []ShareInfo      `json:"shared_with,omitempty"`
}

// CreateFileRequest represents a request to create a file
type CreateFileRequest struct {
	Name        string    `json:"name"`
	FolderID    *uuid.UUID `json:"folder_id,omitempty"`
	Description *string   `json:"description,omitempty"`
	Tags        []string  `json:"tags,omitempty"`
}

// UpdateFileRequest represents a request to update a file
type UpdateFileRequest struct {
	Name        *string  `json:"name,omitempty"`
	FolderID    *uuid.UUID `json:"folder_id,omitempty"`
	Description *string  `json:"description,omitempty"`
	Tags        *[]string `json:"tags,omitempty"`
	IsStarred   *bool    `json:"is_starred,omitempty"`
}

// CreateFolderRequest represents a request to create a folder
type CreateFolderRequest struct {
	Name        string     `json:"name"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty"`
	Color       *string    `json:"color,omitempty"`
	Description *string    `json:"description,omitempty"`
}

// UpdateFolderRequest represents a request to update a folder
type UpdateFolderRequest struct {
	Name        *string    `json:"name,omitempty"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty"`
	Color       *string    `json:"color,omitempty"`
	Description *string    `json:"description,omitempty"`
	IsStarred   *bool      `json:"is_starred,omitempty"`
}
