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

type FolderRepository interface {
	Create(ctx context.Context, folder *model.Folder) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Folder, error)
	GetByTenant(ctx context.Context, tenantID, userID uuid.UUID, parentID *uuid.UUID, includeShared bool) ([]*model.Folder, error)
	Update(ctx context.Context, folder *model.Folder) error
	Delete(ctx context.Context, id uuid.UUID) error
	MoveToTrash(ctx context.Context, id uuid.UUID) error
	RestoreFromTrash(ctx context.Context, id uuid.UUID) error
	PermanentDelete(ctx context.Context, id uuid.UUID) error
	GetPath(ctx context.Context, folderID uuid.UUID) (string, error)
	GetStarred(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Folder, error)
	GetTrashed(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Folder, error)
}

type folderRepository struct {
	db *sqlx.DB
}

func NewFolderRepository(db *sqlx.DB) FolderRepository {
	return &folderRepository{db: db}
}

func (r *folderRepository) Create(ctx context.Context, folder *model.Folder) error {
	query := `
		INSERT INTO folders (
			id, tenant_id, owner_id, parent_id, name, color,
			is_starred, is_trashed, description, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		folder.ID, folder.TenantID, folder.OwnerID, folder.ParentID, folder.Name, folder.Color,
		folder.IsStarred, folder.IsTrashed, folder.Description, folder.CreatedAt, folder.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create folder: %w", err)
	}

	return nil
}

func (r *folderRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Folder, error) {
	var folder model.Folder
	query := `
		SELECT * FROM folders WHERE id = $1 AND is_trashed = false
	`

	err := r.db.GetContext(ctx, &folder, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("folder not found")
		}
		return nil, fmt.Errorf("failed to get folder: %w", err)
	}

	return &folder, nil
}

func (r *folderRepository) GetByTenant(ctx context.Context, tenantID, userID uuid.UUID, parentID *uuid.UUID, includeShared bool) ([]*model.Folder, error) {
	var folders []*model.Folder

	var query string
	var args []interface{}

	if includeShared {
		// Include folders owned by user or shared with user
		if parentID == nil {
			query = `
				SELECT DISTINCT f.* FROM folders f
				LEFT JOIN permissions p ON f.id = p.resource_id AND p.resource_type = 'folder'
				WHERE f.tenant_id = $1
				AND f.is_trashed = false
				AND f.parent_id IS NULL
				AND (f.owner_id = $2 OR p.user_id = $2)
				ORDER BY f.name ASC
			`
			args = []interface{}{tenantID, userID}
		} else {
			query = `
				SELECT DISTINCT f.* FROM folders f
				LEFT JOIN permissions p ON f.id = p.resource_id AND p.resource_type = 'folder'
				WHERE f.tenant_id = $1
				AND f.is_trashed = false
				AND f.parent_id = $3
				AND (f.owner_id = $2 OR p.user_id = $2)
				ORDER BY f.name ASC
			`
			args = []interface{}{tenantID, userID, parentID}
		}
	} else {
		// Only folders owned by user
		if parentID == nil {
			query = `
				SELECT * FROM folders
				WHERE tenant_id = $1 AND owner_id = $2 AND is_trashed = false AND parent_id IS NULL
				ORDER BY name ASC
			`
			args = []interface{}{tenantID, userID}
		} else {
			query = `
				SELECT * FROM folders
				WHERE tenant_id = $1 AND owner_id = $2 AND parent_id = $3 AND is_trashed = false
				ORDER BY name ASC
			`
			args = []interface{}{tenantID, userID, parentID}
		}
	}

	err := r.db.SelectContext(ctx, &folders, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get folders: %w", err)
	}

	return folders, nil
}

func (r *folderRepository) Update(ctx context.Context, folder *model.Folder) error {
	query := `
		UPDATE folders SET
			name = $2, parent_id = $3, color = $4, description = $5,
			is_starred = $6, updated_at = $7
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		folder.ID, folder.Name, folder.ParentID, folder.Color, folder.Description,
		folder.IsStarred, time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update folder: %w", err)
	}

	return nil
}

func (r *folderRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.MoveToTrash(ctx, id)
}

func (r *folderRepository) MoveToTrash(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE folders SET is_trashed = true, trashed_at = $2, updated_at = $2
		WHERE id = $1
	`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to move folder to trash: %w", err)
	}

	// Also move all child folders and files to trash
	_ = r.moveChildrenToTrash(ctx, id, now)

	return nil
}

func (r *folderRepository) moveChildrenToTrash(ctx context.Context, folderID uuid.UUID, trashedAt time.Time) error {
	// Move child folders
	folderQuery := `
		UPDATE folders SET is_trashed = true, trashed_at = $2, updated_at = $2
		WHERE parent_id = $1
	`
	_, _ = r.db.ExecContext(ctx, folderQuery, folderID, trashedAt)

	// Move child files
	fileQuery := `
		UPDATE files SET is_trashed = true, trashed_at = $2, updated_at = $2
		WHERE folder_id = $1
	`
	_, _ = r.db.ExecContext(ctx, fileQuery, folderID, trashedAt)

	return nil
}

func (r *folderRepository) RestoreFromTrash(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE folders SET is_trashed = false, trashed_at = NULL, updated_at = $2
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, id, time.Now())
	if err != nil {
		return fmt.Errorf("failed to restore folder: %w", err)
	}

	return nil
}

func (r *folderRepository) PermanentDelete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM folders WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete folder: %w", err)
	}

	return nil
}

func (r *folderRepository) GetPath(ctx context.Context, folderID uuid.UUID) (string, error) {
	// Use recursive CTE to build folder path
	query := `
		WITH RECURSIVE folder_path AS (
			SELECT id, name, parent_id, name as path, 1 as level
			FROM folders
			WHERE id = $1

			UNION ALL

			SELECT f.id, f.name, f.parent_id, f.name || '/' || fp.path, fp.level + 1
			FROM folders f
			INNER JOIN folder_path fp ON f.id = fp.parent_id
		)
		SELECT path FROM folder_path ORDER BY level DESC LIMIT 1
	`

	var path string
	err := r.db.GetContext(ctx, &path, query, folderID)
	if err != nil {
		return "", fmt.Errorf("failed to get folder path: %w", err)
	}

	return "/" + path, nil
}

func (r *folderRepository) GetStarred(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Folder, error) {
	var folders []*model.Folder
	query := `
		SELECT * FROM folders
		WHERE tenant_id = $1 AND owner_id = $2 AND is_starred = true AND is_trashed = false
		ORDER BY name ASC
	`

	err := r.db.SelectContext(ctx, &folders, query, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get starred folders: %w", err)
	}

	return folders, nil
}

func (r *folderRepository) GetTrashed(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Folder, error) {
	var folders []*model.Folder
	query := `
		SELECT * FROM folders
		WHERE tenant_id = $1 AND owner_id = $2 AND is_trashed = true
		ORDER BY trashed_at DESC
	`

	err := r.db.SelectContext(ctx, &folders, query, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trashed folders: %w", err)
	}

	return folders, nil
}
