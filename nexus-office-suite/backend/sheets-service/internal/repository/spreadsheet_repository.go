package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/sheets-service/internal/model"
)

type SpreadsheetRepository interface {
	Create(ctx context.Context, spreadsheet *model.Spreadsheet) error
	GetByID(ctx context.Context, id, tenantID uuid.UUID) (*model.Spreadsheet, error)
	List(ctx context.Context, tenantID uuid.UUID, query *model.ListSpreadsheetsQuery) ([]*model.Spreadsheet, int, error)
	Update(ctx context.Context, spreadsheet *model.Spreadsheet) error
	Delete(ctx context.Context, id, tenantID uuid.UUID) error
}

type spreadsheetRepository struct {
	db *sqlx.DB
}

func NewSpreadsheetRepository(db *sqlx.DB) SpreadsheetRepository {
	return &spreadsheetRepository{db: db}
}

func (r *spreadsheetRepository) Create(ctx context.Context, spreadsheet *model.Spreadsheet) error {
	query := `
		INSERT INTO spreadsheets (id, tenant_id, title, created_by, folder_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at, updated_at
	`

	return r.db.QueryRowContext(
		ctx,
		query,
		spreadsheet.ID,
		spreadsheet.TenantID,
		spreadsheet.Title,
		spreadsheet.CreatedBy,
		spreadsheet.FolderID,
	).Scan(&spreadsheet.CreatedAt, &spreadsheet.UpdatedAt)
}

func (r *spreadsheetRepository) GetByID(ctx context.Context, id, tenantID uuid.UUID) (*model.Spreadsheet, error) {
	var spreadsheet model.Spreadsheet
	query := `
		SELECT id, tenant_id, title, created_by, created_at, updated_at, folder_id, is_deleted
		FROM spreadsheets
		WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
	`

	err := r.db.GetContext(ctx, &spreadsheet, query, id, tenantID)
	if err != nil {
		return nil, err
	}

	return &spreadsheet, nil
}

func (r *spreadsheetRepository) List(ctx context.Context, tenantID uuid.UUID, query *model.ListSpreadsheetsQuery) ([]*model.Spreadsheet, int, error) {
	conditions := []string{"tenant_id = $1", "is_deleted = FALSE"}
	args := []interface{}{tenantID}
	argIndex := 2

	if query.Search != nil && *query.Search != "" {
		conditions = append(conditions, fmt.Sprintf("title ILIKE $%d", argIndex))
		args = append(args, "%"+*query.Search+"%")
		argIndex++
	}

	if query.FolderID != nil {
		conditions = append(conditions, fmt.Sprintf("folder_id = $%d", argIndex))
		args = append(args, *query.FolderID)
		argIndex++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM spreadsheets WHERE %s", whereClause)
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Get spreadsheets
	sortBy := "created_at"
	if query.SortBy != "" {
		sortBy = query.SortBy
	}

	sortOrder := "DESC"
	if query.SortOrder != "" {
		sortOrder = strings.ToUpper(query.SortOrder)
	}

	offset := (query.Page - 1) * query.PageSize
	selectQuery := fmt.Sprintf(`
		SELECT id, tenant_id, title, created_by, created_at, updated_at, folder_id
		FROM spreadsheets
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortOrder, argIndex, argIndex+1)

	args = append(args, query.PageSize, offset)

	var spreadsheets []*model.Spreadsheet
	err = r.db.SelectContext(ctx, &spreadsheets, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	return spreadsheets, total, nil
}

func (r *spreadsheetRepository) Update(ctx context.Context, spreadsheet *model.Spreadsheet) error {
	query := `
		UPDATE spreadsheets
		SET title = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND tenant_id = $3 AND is_deleted = FALSE
	`

	result, err := r.db.ExecContext(ctx, query, spreadsheet.Title, spreadsheet.ID, spreadsheet.TenantID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("spreadsheet not found")
	}

	return nil
}

func (r *spreadsheetRepository) Delete(ctx context.Context, id, tenantID uuid.UUID) error {
	query := `
		UPDATE spreadsheets
		SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND tenant_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, id, tenantID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("spreadsheet not found")
	}

	return nil
}
