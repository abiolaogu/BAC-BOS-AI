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

type FileRepository interface {
	Create(ctx context.Context, file *model.File) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.File, error)
	GetByTenant(ctx context.Context, tenantID, userID uuid.UUID, folderID *uuid.UUID, includeShared bool) ([]*model.File, error)
	Update(ctx context.Context, file *model.File) error
	Delete(ctx context.Context, id uuid.UUID) error
	MoveToTrash(ctx context.Context, id uuid.UUID) error
	RestoreFromTrash(ctx context.Context, id uuid.UUID) error
	PermanentDelete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, tenantID uuid.UUID, query string, fileType *model.FileType) ([]*model.File, error)
	GetStarred(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.File, error)
	GetTrashed(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.File, error)
	GetRecent(ctx context.Context, tenantID, userID uuid.UUID, limit int) ([]*model.File, error)
	UpdateAccessTime(ctx context.Context, id uuid.UUID) error
}

type fileRepository struct {
	db *sqlx.DB
}

func NewFileRepository(db *sqlx.DB) FileRepository {
	return &fileRepository{db: db}
}

func (r *fileRepository) Create(ctx context.Context, file *model.File) error {
	query := `
		INSERT INTO files (
			id, tenant_id, owner_id, folder_id, name, original_name,
			mime_type, file_type, size, storage_path, version,
			is_starred, is_trashed, description, tags, metadata,
			thumbnail_path, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		file.ID, file.TenantID, file.OwnerID, file.FolderID, file.Name, file.OriginalName,
		file.MimeType, file.FileType, file.Size, file.StoragePath, file.Version,
		file.IsStarred, file.IsTrashed, file.Description, file.Tags, file.Metadata,
		file.ThumbnailPath, file.CreatedAt, file.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}

	return nil
}

func (r *fileRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.File, error) {
	var file model.File
	query := `
		SELECT * FROM files WHERE id = $1 AND is_trashed = false
	`

	err := r.db.GetContext(ctx, &file, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("file not found")
		}
		return nil, fmt.Errorf("failed to get file: %w", err)
	}

	return &file, nil
}

func (r *fileRepository) GetByTenant(ctx context.Context, tenantID, userID uuid.UUID, folderID *uuid.UUID, includeShared bool) ([]*model.File, error) {
	var files []*model.File

	var query string
	var args []interface{}

	if includeShared {
		// Include files owned by user or shared with user
		if folderID == nil {
			query = `
				SELECT DISTINCT f.* FROM files f
				LEFT JOIN permissions p ON f.id = p.resource_id AND p.resource_type = 'file'
				WHERE f.tenant_id = $1
				AND f.is_trashed = false
				AND f.folder_id IS NULL
				AND (f.owner_id = $2 OR p.user_id = $2)
				ORDER BY f.updated_at DESC
			`
			args = []interface{}{tenantID, userID}
		} else {
			query = `
				SELECT DISTINCT f.* FROM files f
				LEFT JOIN permissions p ON f.id = p.resource_id AND p.resource_type = 'file'
				WHERE f.tenant_id = $1
				AND f.is_trashed = false
				AND f.folder_id = $3
				AND (f.owner_id = $2 OR p.user_id = $2)
				ORDER BY f.updated_at DESC
			`
			args = []interface{}{tenantID, userID, folderID}
		}
	} else {
		// Only files owned by user
		if folderID == nil {
			query = `
				SELECT * FROM files
				WHERE tenant_id = $1 AND owner_id = $2 AND is_trashed = false AND folder_id IS NULL
				ORDER BY updated_at DESC
			`
			args = []interface{}{tenantID, userID}
		} else {
			query = `
				SELECT * FROM files
				WHERE tenant_id = $1 AND owner_id = $2 AND folder_id = $3 AND is_trashed = false
				ORDER BY updated_at DESC
			`
			args = []interface{}{tenantID, userID, folderID}
		}
	}

	err := r.db.SelectContext(ctx, &files, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get files: %w", err)
	}

	return files, nil
}

func (r *fileRepository) Update(ctx context.Context, file *model.File) error {
	query := `
		UPDATE files SET
			name = $2, folder_id = $3, description = $4, tags = $5,
			is_starred = $6, updated_at = $7
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		file.ID, file.Name, file.FolderID, file.Description, file.Tags,
		file.IsStarred, time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update file: %w", err)
	}

	return nil
}

func (r *fileRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.MoveToTrash(ctx, id)
}

func (r *fileRepository) MoveToTrash(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE files SET is_trashed = true, trashed_at = $2, updated_at = $2
		WHERE id = $1
	`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to move file to trash: %w", err)
	}

	return nil
}

func (r *fileRepository) RestoreFromTrash(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE files SET is_trashed = false, trashed_at = NULL, updated_at = $2
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, id, time.Now())
	if err != nil {
		return fmt.Errorf("failed to restore file: %w", err)
	}

	return nil
}

func (r *fileRepository) PermanentDelete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM files WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete file: %w", err)
	}

	return nil
}

func (r *fileRepository) Search(ctx context.Context, tenantID uuid.UUID, query string, fileType *model.FileType) ([]*model.File, error) {
	var files []*model.File

	searchQuery := `
		SELECT * FROM files
		WHERE tenant_id = $1 AND is_trashed = false
		AND (name ILIKE $2 OR description ILIKE $2 OR $2 = ANY(tags))
	`
	args := []interface{}{tenantID, "%" + query + "%"}

	if fileType != nil {
		searchQuery += ` AND file_type = $3`
		args = append(args, *fileType)
	}

	searchQuery += ` ORDER BY updated_at DESC LIMIT 50`

	err := r.db.SelectContext(ctx, &files, searchQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search files: %w", err)
	}

	return files, nil
}

func (r *fileRepository) GetStarred(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.File, error) {
	var files []*model.File
	query := `
		SELECT * FROM files
		WHERE tenant_id = $1 AND owner_id = $2 AND is_starred = true AND is_trashed = false
		ORDER BY updated_at DESC
	`

	err := r.db.SelectContext(ctx, &files, query, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get starred files: %w", err)
	}

	return files, nil
}

func (r *fileRepository) GetTrashed(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.File, error) {
	var files []*model.File
	query := `
		SELECT * FROM files
		WHERE tenant_id = $1 AND owner_id = $2 AND is_trashed = true
		ORDER BY trashed_at DESC
	`

	err := r.db.SelectContext(ctx, &files, query, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trashed files: %w", err)
	}

	return files, nil
}

func (r *fileRepository) GetRecent(ctx context.Context, tenantID, userID uuid.UUID, limit int) ([]*model.File, error) {
	var files []*model.File
	query := `
		SELECT * FROM files
		WHERE tenant_id = $1 AND owner_id = $2 AND is_trashed = false
		ORDER BY last_accessed_at DESC NULLS LAST, updated_at DESC
		LIMIT $3
	`

	err := r.db.SelectContext(ctx, &files, query, tenantID, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent files: %w", err)
	}

	return files, nil
}

func (r *fileRepository) UpdateAccessTime(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE files SET last_accessed_at = $2 WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update access time: %w", err)
	}

	return nil
}
