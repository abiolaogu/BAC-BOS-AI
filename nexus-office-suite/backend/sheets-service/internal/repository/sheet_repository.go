package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/sheets-service/internal/model"
)

type SheetRepository interface {
	Create(ctx context.Context, sheet *model.Sheet) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Sheet, error)
	ListBySpreadsheetID(ctx context.Context, spreadsheetID uuid.UUID) ([]*model.Sheet, error)
	Update(ctx context.Context, sheet *model.Sheet) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type sheetRepository struct {
	db *sqlx.DB
}

func NewSheetRepository(db *sqlx.DB) SheetRepository {
	return &sheetRepository{db: db}
}

func (r *sheetRepository) Create(ctx context.Context, sheet *model.Sheet) error {
	query := `
		INSERT INTO sheets (
			id, spreadsheet_id, name, position, row_count, column_count,
			frozen_rows, frozen_columns, hidden_rows, hidden_columns
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at
	`

	return r.db.QueryRowContext(
		ctx,
		query,
		sheet.ID,
		sheet.SpreadsheetID,
		sheet.Name,
		sheet.Position,
		sheet.RowCount,
		sheet.ColumnCount,
		sheet.FrozenRows,
		sheet.FrozenColumns,
		sheet.HiddenRows,
		sheet.HiddenColumns,
	).Scan(&sheet.CreatedAt, &sheet.UpdatedAt)
}

func (r *sheetRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Sheet, error) {
	var sheet model.Sheet
	query := `
		SELECT id, spreadsheet_id, name, position, row_count, column_count,
			   frozen_rows, frozen_columns, hidden_rows, hidden_columns,
			   created_at, updated_at
		FROM sheets
		WHERE id = $1
	`

	err := r.db.GetContext(ctx, &sheet, query, id)
	if err != nil {
		return nil, err
	}

	return &sheet, nil
}

func (r *sheetRepository) ListBySpreadsheetID(ctx context.Context, spreadsheetID uuid.UUID) ([]*model.Sheet, error) {
	var sheets []*model.Sheet
	query := `
		SELECT id, spreadsheet_id, name, position, row_count, column_count,
			   frozen_rows, frozen_columns, hidden_rows, hidden_columns,
			   created_at, updated_at
		FROM sheets
		WHERE spreadsheet_id = $1
		ORDER BY position ASC
	`

	err := r.db.SelectContext(ctx, &sheets, query, spreadsheetID)
	if err != nil {
		return nil, err
	}

	return sheets, nil
}

func (r *sheetRepository) Update(ctx context.Context, sheet *model.Sheet) error {
	query := `
		UPDATE sheets
		SET name = $1, frozen_rows = $2, frozen_columns = $3,
			hidden_rows = $4, hidden_columns = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
	`

	result, err := r.db.ExecContext(
		ctx,
		query,
		sheet.Name,
		sheet.FrozenRows,
		sheet.FrozenColumns,
		sheet.HiddenRows,
		sheet.HiddenColumns,
		sheet.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("sheet not found")
	}

	return nil
}

func (r *sheetRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM sheets WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("sheet not found")
	}

	return nil
}
