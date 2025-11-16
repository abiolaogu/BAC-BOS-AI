package model

import (
	"time"

	"github.com/google/uuid"
)

// PermissionRole represents the type of permission
type PermissionRole string

const (
	PermissionOwner  PermissionRole = "owner"
	PermissionEditor PermissionRole = "editor"
	PermissionViewer PermissionRole = "viewer"
)

// ResourceType represents the type of resource being shared
type ResourceType string

const (
	ResourceTypeFile   ResourceType = "file"
	ResourceTypeFolder ResourceType = "folder"
)

// Permission represents access permissions for a file or folder
type Permission struct {
	ID           uuid.UUID      `json:"id" db:"id"`
	TenantID     uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	ResourceID   uuid.UUID      `json:"resource_id" db:"resource_id"`
	ResourceType ResourceType   `json:"resource_type" db:"resource_type"`
	UserID       *uuid.UUID     `json:"user_id,omitempty" db:"user_id"`
	Email        *string        `json:"email,omitempty" db:"email"`
	Role         PermissionRole `json:"role" db:"role"`
	GrantedBy    uuid.UUID      `json:"granted_by" db:"granted_by"`
	ExpiresAt    *time.Time     `json:"expires_at,omitempty" db:"expires_at"`
	CreatedAt    time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at" db:"updated_at"`
}

// ShareLink represents a public share link
type ShareLink struct {
	ID           uuid.UUID      `json:"id" db:"id"`
	TenantID     uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	ResourceID   uuid.UUID      `json:"resource_id" db:"resource_id"`
	ResourceType ResourceType   `json:"resource_type" db:"resource_type"`
	Token        string         `json:"token" db:"token"`
	Role         PermissionRole `json:"role" db:"role"`
	Password     *string        `json:"-" db:"password_hash"`
	ExpiresAt    *time.Time     `json:"expires_at,omitempty" db:"expires_at"`
	MaxDownloads *int           `json:"max_downloads,omitempty" db:"max_downloads"`
	DownloadCount int           `json:"download_count" db:"download_count"`
	CreatedBy    uuid.UUID      `json:"created_by" db:"created_by"`
	CreatedAt    time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at" db:"updated_at"`
}

// ShareInfo represents sharing information
type ShareInfo struct {
	UserID    *uuid.UUID     `json:"user_id,omitempty"`
	Email     *string        `json:"email,omitempty"`
	Role      PermissionRole `json:"role"`
	GrantedBy uuid.UUID      `json:"granted_by"`
	GrantedAt time.Time      `json:"granted_at"`
}

// CreatePermissionRequest represents a request to grant permission
type CreatePermissionRequest struct {
	ResourceID   uuid.UUID      `json:"resource_id"`
	ResourceType ResourceType   `json:"resource_type"`
	UserID       *uuid.UUID     `json:"user_id,omitempty"`
	Email        *string        `json:"email,omitempty"`
	Role         PermissionRole `json:"role"`
	ExpiresAt    *time.Time     `json:"expires_at,omitempty"`
}

// UpdatePermissionRequest represents a request to update permission
type UpdatePermissionRequest struct {
	Role      *PermissionRole `json:"role,omitempty"`
	ExpiresAt *time.Time      `json:"expires_at,omitempty"`
}

// CreateShareLinkRequest represents a request to create a share link
type CreateShareLinkRequest struct {
	ResourceID   uuid.UUID      `json:"resource_id"`
	ResourceType ResourceType   `json:"resource_type"`
	Role         PermissionRole `json:"role"`
	Password     *string        `json:"password,omitempty"`
	ExpiresAt    *time.Time     `json:"expires_at,omitempty"`
	MaxDownloads *int           `json:"max_downloads,omitempty"`
}
