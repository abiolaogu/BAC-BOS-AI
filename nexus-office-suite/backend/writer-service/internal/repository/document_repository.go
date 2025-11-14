// internal/repository/document_repository.go
package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/writer-service/internal/model"
)

type DocumentRepository interface {
	Create(ctx context.Context, doc *model.Document) error
	GetByID(ctx context.Context, id, tenantID uuid.UUID) (*model.Document, error)
	Update(ctx context.Context, doc *model.Document) error
	Delete(ctx context.Context, id, tenantID uuid.UUID, permanent bool) error
	List(ctx context.Context, tenantID uuid.UUID, query *model.ListDocumentsQuery) ([]*model.Document, int, error)
	Search(ctx context.Context, tenantID uuid.UUID, searchQuery string, limit, offset int) ([]*model.Document, error)
	GetPermissions(ctx context.Context, documentID uuid.UUID) ([]model.Permission, error)
	AddPermission(ctx context.Context, perm *model.Permission) error
	RevokePermission(ctx context.Context, documentID, userID uuid.UUID) error
}

type documentRepository struct {
	db *sqlx.DB
}

func NewDocumentRepository(db *sqlx.DB) DocumentRepository {
	return &documentRepository{db: db}
}

func (r *documentRepository) Create(ctx context.Context, doc *model.Document) error {
	query := `
		INSERT INTO documents (id, tenant_id, title, content, created_by, version, status, folder_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`
	return r.db.QueryRowContext(
		ctx, query,
		doc.ID, doc.TenantID, doc.Title, doc.Content,
		doc.CreatedBy, doc.Version, doc.Status, doc.FolderID,
	).Scan(&doc.CreatedAt, &doc.UpdatedAt)
}

func (r *documentRepository) GetByID(ctx context.Context, id, tenantID uuid.UUID) (*model.Document, error) {
	query := `
		SELECT id, tenant_id, title, content, created_by, created_at, updated_at,
		       version, status, folder_id, is_deleted
		FROM documents
		WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
	`
	var doc model.Document
	err := r.db.GetContext(ctx, &doc, query, id, tenantID)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("document not found")
	}
	return &doc, err
}

func (r *documentRepository) Update(ctx context.Context, doc *model.Document) error {
	query := `
		UPDATE documents
		SET title = $1, content = $2, status = $3, version = version + 1, updated_at = NOW()
		WHERE id = $4 AND tenant_id = $5 AND is_deleted = FALSE
		RETURNING version, updated_at
	`
	return r.db.QueryRowContext(
		ctx, query,
		doc.Title, doc.Content, doc.Status, doc.ID, doc.TenantID,
	).Scan(&doc.Version, &doc.UpdatedAt)
}

func (r *documentRepository) Delete(ctx context.Context, id, tenantID uuid.UUID, permanent bool) error {
	var query string
	if permanent {
		query = `DELETE FROM documents WHERE id = $1 AND tenant_id = $2`
	} else {
		query = `UPDATE documents SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`
	}
	result, err := r.db.ExecContext(ctx, query, id, tenantID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("document not found")
	}
	return nil
}

func (r *documentRepository) List(ctx context.Context, tenantID uuid.UUID, query *model.ListDocumentsQuery) ([]*model.Document, int, error) {
	// Build WHERE clause
	conditions := []string{"tenant_id = $1", "is_deleted = FALSE"}
	args := []interface{}{tenantID}
	argIndex := 2

	if query.FolderID != nil {
		conditions = append(conditions, fmt.Sprintf("folder_id = $%d", argIndex))
		args = append(args, *query.FolderID)
		argIndex++
	}

	if query.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *query.Status)
		argIndex++
	}

	if query.Search != nil && *query.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR content::text ILIKE $%d)", argIndex, argIndex))
		searchPattern := "%" + *query.Search + "%"
		args = append(args, searchPattern)
		argIndex++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM documents WHERE %s", whereClause)
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	// Build ORDER BY
	orderBy := "updated_at DESC"
	if query.SortBy != "" {
		orderBy = fmt.Sprintf("%s %s", query.SortBy, query.SortOrder)
	}

	// Query documents
	selectQuery := fmt.Sprintf(`
		SELECT id, tenant_id, title, content, created_by, created_at, updated_at,
		       version, status, folder_id, is_deleted
		FROM documents
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, query.Limit, (query.Page-1)*query.Limit)

	var documents []*model.Document
	if err := r.db.SelectContext(ctx, &documents, selectQuery, args...); err != nil {
		return nil, 0, err
	}

	return documents, total, nil
}

func (r *documentRepository) Search(ctx context.Context, tenantID uuid.UUID, searchQuery string, limit, offset int) ([]*model.Document, error) {
	query := `
		SELECT id, tenant_id, title, content, created_by, created_at, updated_at,
		       version, status, folder_id
		FROM documents
		WHERE tenant_id = $1 AND is_deleted = FALSE
		  AND (to_tsvector('english', title) @@ plainto_tsquery('english', $2)
		       OR to_tsvector('english', content::text) @@ plainto_tsquery('english', $2))
		ORDER BY ts_rank(to_tsvector('english', title || ' ' || content::text),
		                 plainto_tsquery('english', $2)) DESC
		LIMIT $3 OFFSET $4
	`
	var documents []*model.Document
	err := r.db.SelectContext(ctx, &documents, query, tenantID, searchQuery, limit, offset)
	return documents, err
}

func (r *documentRepository) GetPermissions(ctx context.Context, documentID uuid.UUID) ([]model.Permission, error) {
	query := `
		SELECT document_id, user_id, permission, added_by, added_at
		FROM document_collaborators
		WHERE document_id = $1
	`
	var permissions []model.Permission
	err := r.db.SelectContext(ctx, &permissions, query, documentID)
	return permissions, err
}

func (r *documentRepository) AddPermission(ctx context.Context, perm *model.Permission) error {
	query := `
		INSERT INTO document_collaborators (document_id, user_id, permission, added_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (document_id, user_id) DO UPDATE
		SET permission = EXCLUDED.permission, added_at = NOW()
		RETURNING added_at
	`
	return r.db.QueryRowContext(
		ctx, query,
		perm.DocumentID, perm.UserID, perm.Permission, perm.AddedBy,
	).Scan(&perm.AddedAt)
}

func (r *documentRepository) RevokePermission(ctx context.Context, documentID, userID uuid.UUID) error {
	query := `DELETE FROM document_collaborators WHERE document_id = $1 AND user_id = $2`
	result, err := r.db.ExecContext(ctx, query, documentID, userID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("permission not found")
	}
	return nil
}
