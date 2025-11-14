package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/drive-service/internal/model"
)

type PermissionRepository interface {
	Create(ctx context.Context, permission *model.Permission) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Permission, error)
	GetByResource(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType) ([]*model.Permission, error)
	GetByUser(ctx context.Context, userID uuid.UUID) ([]*model.Permission, error)
	Update(ctx context.Context, permission *model.Permission) error
	Delete(ctx context.Context, id uuid.UUID) error
	CheckPermission(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) (*model.PermissionRole, error)
	HasPermission(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID, role model.PermissionRole) (bool, error)
}

type permissionRepository struct {
	db *sqlx.DB
}

func NewPermissionRepository(db *sqlx.DB) PermissionRepository {
	return &permissionRepository{db: db}
}

func (r *permissionRepository) Create(ctx context.Context, permission *model.Permission) error {
	query := `
		INSERT INTO permissions (
			id, tenant_id, resource_id, resource_type, user_id, email,
			role, granted_by, expires_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		permission.ID, permission.TenantID, permission.ResourceID, permission.ResourceType,
		permission.UserID, permission.Email, permission.Role, permission.GrantedBy,
		permission.ExpiresAt, permission.CreatedAt, permission.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create permission: %w", err)
	}

	return nil
}

func (r *permissionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Permission, error) {
	var permission model.Permission
	query := `SELECT * FROM permissions WHERE id = $1`

	err := r.db.GetContext(ctx, &permission, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("permission not found")
		}
		return nil, fmt.Errorf("failed to get permission: %w", err)
	}

	return &permission, nil
}

func (r *permissionRepository) GetByResource(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType) ([]*model.Permission, error) {
	var permissions []*model.Permission
	query := `
		SELECT * FROM permissions
		WHERE resource_id = $1 AND resource_type = $2
		AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &permissions, query, resourceID, resourceType)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}

	return permissions, nil
}

func (r *permissionRepository) GetByUser(ctx context.Context, userID uuid.UUID) ([]*model.Permission, error) {
	var permissions []*model.Permission
	query := `
		SELECT * FROM permissions
		WHERE user_id = $1
		AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &permissions, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}

	return permissions, nil
}

func (r *permissionRepository) Update(ctx context.Context, permission *model.Permission) error {
	query := `
		UPDATE permissions SET
			role = $2, expires_at = $3, updated_at = $4
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		permission.ID, permission.Role, permission.ExpiresAt, time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update permission: %w", err)
	}

	return nil
}

func (r *permissionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM permissions WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete permission: %w", err)
	}

	return nil
}

func (r *permissionRepository) CheckPermission(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) (*model.PermissionRole, error) {
	var role model.PermissionRole
	query := `
		SELECT role FROM permissions
		WHERE resource_id = $1 AND resource_type = $2 AND user_id = $3
		AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY
			CASE role
				WHEN 'owner' THEN 1
				WHEN 'editor' THEN 2
				WHEN 'viewer' THEN 3
			END
		LIMIT 1
	`

	err := r.db.GetContext(ctx, &role, query, resourceID, resourceType, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}

	return &role, nil
}

func (r *permissionRepository) HasPermission(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID, role model.PermissionRole) (bool, error) {
	currentRole, err := r.CheckPermission(ctx, resourceID, resourceType, userID)
	if err != nil {
		return false, err
	}

	if currentRole == nil {
		return false, nil
	}

	// Check if current role has sufficient permissions
	roleHierarchy := map[model.PermissionRole]int{
		model.PermissionOwner:  3,
		model.PermissionEditor: 2,
		model.PermissionViewer: 1,
	}

	return roleHierarchy[*currentRole] >= roleHierarchy[role], nil
}

// ShareLinkRepository handles share links
type ShareLinkRepository interface {
	Create(ctx context.Context, link *model.ShareLink) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ShareLink, error)
	GetByToken(ctx context.Context, token string) (*model.ShareLink, error)
	GetByResource(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType) ([]*model.ShareLink, error)
	Delete(ctx context.Context, id uuid.UUID) error
	IncrementDownloadCount(ctx context.Context, id uuid.UUID) error
}

type shareLinkRepository struct {
	db *sqlx.DB
}

func NewShareLinkRepository(db *sqlx.DB) ShareLinkRepository {
	return &shareLinkRepository{db: db}
}

func (r *shareLinkRepository) Create(ctx context.Context, link *model.ShareLink) error {
	query := `
		INSERT INTO share_links (
			id, tenant_id, resource_id, resource_type, token, role,
			password_hash, expires_at, max_downloads, download_count,
			created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		link.ID, link.TenantID, link.ResourceID, link.ResourceType, link.Token, link.Role,
		link.Password, link.ExpiresAt, link.MaxDownloads, link.DownloadCount,
		link.CreatedBy, link.CreatedAt, link.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create share link: %w", err)
	}

	return nil
}

func (r *shareLinkRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ShareLink, error) {
	var link model.ShareLink
	query := `SELECT * FROM share_links WHERE id = $1`

	err := r.db.GetContext(ctx, &link, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("share link not found")
		}
		return nil, fmt.Errorf("failed to get share link: %w", err)
	}

	return &link, nil
}

func (r *shareLinkRepository) GetByToken(ctx context.Context, token string) (*model.ShareLink, error) {
	var link model.ShareLink
	query := `
		SELECT * FROM share_links
		WHERE token = $1
		AND (expires_at IS NULL OR expires_at > NOW())
		AND (max_downloads IS NULL OR download_count < max_downloads)
	`

	err := r.db.GetContext(ctx, &link, query, token)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("share link not found or expired")
		}
		return nil, fmt.Errorf("failed to get share link: %w", err)
	}

	return &link, nil
}

func (r *shareLinkRepository) GetByResource(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType) ([]*model.ShareLink, error) {
	var links []*model.ShareLink
	query := `
		SELECT * FROM share_links
		WHERE resource_id = $1 AND resource_type = $2
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &links, query, resourceID, resourceType)
	if err != nil {
		return nil, fmt.Errorf("failed to get share links: %w", err)
	}

	return links, nil
}

func (r *shareLinkRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM share_links WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete share link: %w", err)
	}

	return nil
}

func (r *shareLinkRepository) IncrementDownloadCount(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE share_links SET download_count = download_count + 1 WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to increment download count: %w", err)
	}

	return nil
}
