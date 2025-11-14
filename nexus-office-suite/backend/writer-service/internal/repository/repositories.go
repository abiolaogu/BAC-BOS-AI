// internal/repository/repositories.go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/writer-service/internal/model"
)

// VersionRepository handles document versions
type VersionRepository interface {
	Create(ctx context.Context, version *model.DocumentVersion) error
	List(ctx context.Context, documentID uuid.UUID) ([]*model.DocumentVersion, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.DocumentVersion, error)
}

type versionRepository struct {
	db *sqlx.DB
}

func NewVersionRepository(db *sqlx.DB) VersionRepository {
	return &versionRepository{db: db}
}

func (r *versionRepository) Create(ctx context.Context, version *model.DocumentVersion) error {
	query := `
		INSERT INTO document_versions (id, document_id, version, content, created_by, change_summary)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`
	return r.db.QueryRowContext(
		ctx, query,
		version.ID, version.DocumentID, version.Version, version.Content,
		version.CreatedBy, version.ChangeSummary,
	).Scan(&version.CreatedAt)
}

func (r *versionRepository) List(ctx context.Context, documentID uuid.UUID) ([]*model.DocumentVersion, error) {
	query := `
		SELECT id, document_id, version, content, created_by, created_at, change_summary
		FROM document_versions
		WHERE document_id = $1
		ORDER BY version DESC
	`
	var versions []*model.DocumentVersion
	err := r.db.SelectContext(ctx, &versions, query, documentID)
	return versions, err
}

func (r *versionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.DocumentVersion, error) {
	query := `
		SELECT id, document_id, version, content, created_by, created_at, change_summary
		FROM document_versions
		WHERE id = $1
	`
	var version model.DocumentVersion
	err := r.db.GetContext(ctx, &version, query, id)
	return &version, err
}

// CommentRepository handles comments
type CommentRepository interface {
	Create(ctx context.Context, comment *model.Comment) error
	GetByDocumentID(ctx context.Context, documentID uuid.UUID) ([]*model.Comment, error)
	Update(ctx context.Context, comment *model.Comment) error
	Delete(ctx context.Context, id uuid.UUID) error
	Resolve(ctx context.Context, id, resolvedBy uuid.UUID) error
}

type commentRepository struct {
	db *sqlx.DB
}

func NewCommentRepository(db *sqlx.DB) CommentRepository {
	return &commentRepository{db: db}
}

func (r *commentRepository) Create(ctx context.Context, comment *model.Comment) error {
	query := `
		INSERT INTO document_comments (id, document_id, user_id, content, position, parent_comment_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`
	return r.db.QueryRowContext(
		ctx, query,
		comment.ID, comment.DocumentID, comment.UserID, comment.Content,
		comment.Position, comment.ParentCommentID,
	).Scan(&comment.CreatedAt)
}

func (r *commentRepository) GetByDocumentID(ctx context.Context, documentID uuid.UUID) ([]*model.Comment, error) {
	query := `
		SELECT id, document_id, user_id, content, position, parent_comment_id,
		       created_at, updated_at, is_resolved, resolved_at, resolved_by
		FROM document_comments
		WHERE document_id = $1
		ORDER BY created_at DESC
	`
	var comments []*model.Comment
	err := r.db.SelectContext(ctx, &comments, query, documentID)
	return comments, err
}

func (r *commentRepository) Update(ctx context.Context, comment *model.Comment) error {
	query := `
		UPDATE document_comments
		SET content = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`
	return r.db.QueryRowContext(ctx, query, comment.Content, comment.ID).Scan(&comment.UpdatedAt)
}

func (r *commentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM document_comments WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *commentRepository) Resolve(ctx context.Context, id, resolvedBy uuid.UUID) error {
	query := `
		UPDATE document_comments
		SET is_resolved = TRUE, resolved_at = NOW(), resolved_by = $1
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, resolvedBy, id)
	return err
}

// ActivityRepository handles activity logs
type ActivityRepository interface {
	Create(ctx context.Context, activity *model.Activity) error
	GetByDocumentID(ctx context.Context, documentID uuid.UUID, limit int) ([]*model.Activity, error)
}

type activityRepository struct {
	db *sqlx.DB
}

func NewActivityRepository(db *sqlx.DB) ActivityRepository {
	return &activityRepository{db: db}
}

func (r *activityRepository) Create(ctx context.Context, activity *model.Activity) error {
	query := `
		INSERT INTO document_activity (id, document_id, user_id, action, metadata)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`
	return r.db.QueryRowContext(
		ctx, query,
		activity.ID, activity.DocumentID, activity.UserID, activity.Action, activity.Metadata,
	).Scan(&activity.CreatedAt)
}

func (r *activityRepository) GetByDocumentID(ctx context.Context, documentID uuid.UUID, limit int) ([]*model.Activity, error) {
	query := `
		SELECT id, document_id, user_id, action, metadata, created_at
		FROM document_activity
		WHERE document_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	var activities []*model.Activity
	err := r.db.SelectContext(ctx, &activities, query, documentID, limit)
	return activities, err
}
