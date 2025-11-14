package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/sheets-service/internal/model"
)

type CellRepository interface {
	Upsert(ctx context.Context, cell *model.Cell) error
	BatchUpsert(ctx context.Context, cells []*model.Cell) error
	GetByPosition(ctx context.Context, sheetID uuid.UUID, rowIndex, columnIndex int) (*model.Cell, error)
	GetRange(ctx context.Context, sheetID uuid.UUID, query *model.GetCellsQuery) ([]*model.Cell, error)
	GetAll(ctx context.Context, sheetID uuid.UUID) ([]*model.Cell, error)
	Delete(ctx context.Context, sheetID uuid.UUID, rowIndex, columnIndex int) error
}

type cellRepository struct {
	db *sqlx.DB
}

func NewCellRepository(db *sqlx.DB) CellRepository {
	return &cellRepository{db: db}
}

func (r *cellRepository) Upsert(ctx context.Context, cell *model.Cell) error {
	query := `
		INSERT INTO cells (
			id, sheet_id, row_index, column_index, value, formula,
			data_type, formatted_value, style
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (sheet_id, row_index, column_index)
		DO UPDATE SET
			value = EXCLUDED.value,
			formula = EXCLUDED.formula,
			data_type = EXCLUDED.data_type,
			formatted_value = EXCLUDED.formatted_value,
			style = EXCLUDED.style,
			updated_at = CURRENT_TIMESTAMP
		RETURNING updated_at
	`

	return r.db.QueryRowContext(
		ctx,
		query,
		cell.ID,
		cell.SheetID,
		cell.RowIndex,
		cell.ColumnIndex,
		cell.Value,
		cell.Formula,
		cell.DataType,
		cell.FormattedValue,
		cell.Style,
	).Scan(&cell.UpdatedAt)
}

func (r *cellRepository) BatchUpsert(ctx context.Context, cells []*model.Cell) error {
	if len(cells) == 0 {
		return nil
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO cells (
			id, sheet_id, row_index, column_index, value, formula,
			data_type, formatted_value, style
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (sheet_id, row_index, column_index)
		DO UPDATE SET
			value = EXCLUDED.value,
			formula = EXCLUDED.formula,
			data_type = EXCLUDED.data_type,
			formatted_value = EXCLUDED.formatted_value,
			style = EXCLUDED.style,
			updated_at = CURRENT_TIMESTAMP
	`

	for _, cell := range cells {
		_, err := tx.ExecContext(
			ctx,
			query,
			cell.ID,
			cell.SheetID,
			cell.RowIndex,
			cell.ColumnIndex,
			cell.Value,
			cell.Formula,
			cell.DataType,
			cell.FormattedValue,
			cell.Style,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *cellRepository) GetByPosition(ctx context.Context, sheetID uuid.UUID, rowIndex, columnIndex int) (*model.Cell, error) {
	var cell model.Cell
	query := `
		SELECT id, sheet_id, row_index, column_index, value, formula,
			   data_type, formatted_value, style, updated_at
		FROM cells
		WHERE sheet_id = $1 AND row_index = $2 AND column_index = $3
	`

	err := r.db.GetContext(ctx, &cell, query, sheetID, rowIndex, columnIndex)
	if err != nil {
		return nil, err
	}

	return &cell, nil
}

func (r *cellRepository) GetRange(ctx context.Context, sheetID uuid.UUID, query *model.GetCellsQuery) ([]*model.Cell, error) {
	var cells []*model.Cell
	sqlQuery := `
		SELECT id, sheet_id, row_index, column_index, value, formula,
			   data_type, formatted_value, style, updated_at
		FROM cells
		WHERE sheet_id = $1
		  AND row_index >= $2 AND row_index <= $3
		  AND column_index >= $4 AND column_index <= $5
		ORDER BY row_index, column_index
	`

	err := r.db.SelectContext(
		ctx,
		&cells,
		sqlQuery,
		sheetID,
		query.StartRow,
		query.EndRow,
		query.StartColumn,
		query.EndColumn,
	)
	if err != nil {
		return nil, err
	}

	return cells, nil
}

func (r *cellRepository) GetAll(ctx context.Context, sheetID uuid.UUID) ([]*model.Cell, error) {
	var cells []*model.Cell
	query := `
		SELECT id, sheet_id, row_index, column_index, value, formula,
			   data_type, formatted_value, style, updated_at
		FROM cells
		WHERE sheet_id = $1
		ORDER BY row_index, column_index
	`

	err := r.db.SelectContext(ctx, &cells, query, sheetID)
	if err != nil {
		return nil, err
	}

	return cells, nil
}

func (r *cellRepository) Delete(ctx context.Context, sheetID uuid.UUID, rowIndex, columnIndex int) error {
	query := `
		DELETE FROM cells
		WHERE sheet_id = $1 AND row_index = $2 AND column_index = $3
	`

	result, err := r.db.ExecContext(ctx, query, sheetID, rowIndex, columnIndex)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("cell not found")
	}

	return nil
}
