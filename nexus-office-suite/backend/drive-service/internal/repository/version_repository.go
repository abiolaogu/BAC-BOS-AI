package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/drive-service/internal/model"
)

type VersionRepository interface {
	Create(ctx context.Context, version *model.FileVersion) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.FileVersion, error)
	GetByFile(ctx context.Context, fileID uuid.UUID) ([]*model.FileVersion, error)
	GetByVersion(ctx context.Context, fileID uuid.UUID, versionNum int) (*model.FileVersion, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetLatestVersionNum(ctx context.Context, fileID uuid.UUID) (int, error)
}

type versionRepository struct {
	db *sqlx.DB
}

func NewVersionRepository(db *sqlx.DB) VersionRepository {
	return &versionRepository{db: db}
}

func (r *versionRepository) Create(ctx context.Context, version *model.FileVersion) error {
	query := `
		INSERT INTO file_versions (
			id, file_id, version_num, size, storage_path,
			created_by, comment, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		version.ID, version.FileID, version.VersionNum, version.Size,
		version.StoragePath, version.CreatedBy, version.Comment, version.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create file version: %w", err)
	}

	return nil
}

func (r *versionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.FileVersion, error) {
	var version model.FileVersion
	query := `SELECT * FROM file_versions WHERE id = $1`

	err := r.db.GetContext(ctx, &version, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("file version not found")
		}
		return nil, fmt.Errorf("failed to get file version: %w", err)
	}

	return &version, nil
}

func (r *versionRepository) GetByFile(ctx context.Context, fileID uuid.UUID) ([]*model.FileVersion, error) {
	var versions []*model.FileVersion
	query := `
		SELECT * FROM file_versions
		WHERE file_id = $1
		ORDER BY version_num DESC
	`

	err := r.db.SelectContext(ctx, &versions, query, fileID)
	if err != nil {
		return nil, fmt.Errorf("failed to get file versions: %w", err)
	}

	return versions, nil
}

func (r *versionRepository) GetByVersion(ctx context.Context, fileID uuid.UUID, versionNum int) (*model.FileVersion, error) {
	var version model.FileVersion
	query := `
		SELECT * FROM file_versions
		WHERE file_id = $1 AND version_num = $2
	`

	err := r.db.GetContext(ctx, &version, query, fileID, versionNum)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("file version not found")
		}
		return nil, fmt.Errorf("failed to get file version: %w", err)
	}

	return &version, nil
}

func (r *versionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM file_versions WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete file version: %w", err)
	}

	return nil
}

func (r *versionRepository) GetLatestVersionNum(ctx context.Context, fileID uuid.UUID) (int, error) {
	var versionNum int
	query := `
		SELECT COALESCE(MAX(version_num), 0)
		FROM file_versions
		WHERE file_id = $1
	`

	err := r.db.GetContext(ctx, &versionNum, query, fileID)
	if err != nil {
		return 0, fmt.Errorf("failed to get latest version number: %w", err)
	}

	return versionNum, nil
}
