package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nexus/sheets-service/internal/formula"
	"github.com/nexus/sheets-service/internal/model"
	"github.com/nexus/sheets-service/internal/repository"
)

type SpreadsheetService interface {
	CreateSpreadsheet(ctx context.Context, req *model.CreateSpreadsheetRequest, tenantID, userID uuid.UUID) (*model.Spreadsheet, error)
	GetSpreadsheet(ctx context.Context, id, tenantID uuid.UUID) (*model.Spreadsheet, error)
	ListSpreadsheets(ctx context.Context, tenantID uuid.UUID, query *model.ListSpreadsheetsQuery) ([]*model.Spreadsheet, int, error)
	UpdateSpreadsheet(ctx context.Context, id, tenantID uuid.UUID, req *model.UpdateSpreadsheetRequest) (*model.Spreadsheet, error)
	DeleteSpreadsheet(ctx context.Context, id, tenantID uuid.UUID) error

	CreateSheet(ctx context.Context, spreadsheetID uuid.UUID, req *model.CreateSheetRequest) (*model.Sheet, error)
	UpdateSheet(ctx context.Context, sheetID uuid.UUID, req *model.UpdateSheetRequest) (*model.Sheet, error)
	DeleteSheet(ctx context.Context, sheetID uuid.UUID) error

	UpdateCell(ctx context.Context, sheetID uuid.UUID, rowIndex, columnIndex int, req *model.UpdateCellRequest) (*model.Cell, error)
	BatchUpdateCells(ctx context.Context, sheetID uuid.UUID, req *model.BatchUpdateCellsRequest) error
	GetCells(ctx context.Context, sheetID uuid.UUID, query *model.GetCellsQuery) ([]*model.Cell, error)
}

type spreadsheetService struct {
	spreadsheetRepo repository.SpreadsheetRepository
	sheetRepo       repository.SheetRepository
	cellRepo        repository.CellRepository
	formulaEngine   *formula.Engine
}

func NewSpreadsheetService(
	spreadsheetRepo repository.SpreadsheetRepository,
	sheetRepo repository.SheetRepository,
	cellRepo repository.CellRepository,
) SpreadsheetService {
	return &spreadsheetService{
		spreadsheetRepo: spreadsheetRepo,
		sheetRepo:       sheetRepo,
		cellRepo:        cellRepo,
		formulaEngine:   formula.NewEngine(),
	}
}

func (s *spreadsheetService) CreateSpreadsheet(ctx context.Context, req *model.CreateSpreadsheetRequest, tenantID, userID uuid.UUID) (*model.Spreadsheet, error) {
	spreadsheet := &model.Spreadsheet{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Title:     req.Title,
		CreatedBy: userID,
		FolderID:  req.FolderID,
		IsDeleted: false,
	}

	if err := s.spreadsheetRepo.Create(ctx, spreadsheet); err != nil {
		return nil, err
	}

	// Create default sheets
	sheets := req.Sheets
	if len(sheets) == 0 {
		sheets = []model.CreateSheetRequest{
			{Name: "Sheet1", RowCount: 1000, ColumnCount: 26},
		}
	}

	for i, sheetReq := range sheets {
		sheet := &model.Sheet{
			ID:            uuid.New(),
			SpreadsheetID: spreadsheet.ID,
			Name:          sheetReq.Name,
			Position:      i,
			RowCount:      sheetReq.RowCount,
			ColumnCount:   sheetReq.ColumnCount,
		}

		if sheet.RowCount == 0 {
			sheet.RowCount = 1000
		}
		if sheet.ColumnCount == 0 {
			sheet.ColumnCount = 26
		}

		if err := s.sheetRepo.Create(ctx, sheet); err != nil {
			return nil, err
		}

		spreadsheet.Sheets = append(spreadsheet.Sheets, *sheet)
	}

	return spreadsheet, nil
}

func (s *spreadsheetService) GetSpreadsheet(ctx context.Context, id, tenantID uuid.UUID) (*model.Spreadsheet, error) {
	spreadsheet, err := s.spreadsheetRepo.GetByID(ctx, id, tenantID)
	if err != nil {
		return nil, err
	}

	sheets, err := s.sheetRepo.ListBySpreadsheetID(ctx, id)
	if err != nil {
		return nil, err
	}

	for _, sheet := range sheets {
		spreadsheet.Sheets = append(spreadsheet.Sheets, *sheet)
	}

	return spreadsheet, nil
}

func (s *spreadsheetService) ListSpreadsheets(ctx context.Context, tenantID uuid.UUID, query *model.ListSpreadsheetsQuery) ([]*model.Spreadsheet, int, error) {
	return s.spreadsheetRepo.List(ctx, tenantID, query)
}

func (s *spreadsheetService) UpdateSpreadsheet(ctx context.Context, id, tenantID uuid.UUID, req *model.UpdateSpreadsheetRequest) (*model.Spreadsheet, error) {
	spreadsheet, err := s.spreadsheetRepo.GetByID(ctx, id, tenantID)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		spreadsheet.Title = *req.Title
	}

	if err := s.spreadsheetRepo.Update(ctx, spreadsheet); err != nil {
		return nil, err
	}

	return spreadsheet, nil
}

func (s *spreadsheetService) DeleteSpreadsheet(ctx context.Context, id, tenantID uuid.UUID) error {
	return s.spreadsheetRepo.Delete(ctx, id, tenantID)
}

func (s *spreadsheetService) CreateSheet(ctx context.Context, spreadsheetID uuid.UUID, req *model.CreateSheetRequest) (*model.Sheet, error) {
	sheets, err := s.sheetRepo.ListBySpreadsheetID(ctx, spreadsheetID)
	if err != nil {
		return nil, err
	}

	position := len(sheets)
	if req.RowCount == 0 {
		req.RowCount = 1000
	}
	if req.ColumnCount == 0 {
		req.ColumnCount = 26
	}

	sheet := &model.Sheet{
		ID:            uuid.New(),
		SpreadsheetID: spreadsheetID,
		Name:          req.Name,
		Position:      position,
		RowCount:      req.RowCount,
		ColumnCount:   req.ColumnCount,
	}

	if err := s.sheetRepo.Create(ctx, sheet); err != nil {
		return nil, err
	}

	return sheet, nil
}

func (s *spreadsheetService) UpdateSheet(ctx context.Context, sheetID uuid.UUID, req *model.UpdateSheetRequest) (*model.Sheet, error) {
	sheet, err := s.sheetRepo.GetByID(ctx, sheetID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		sheet.Name = *req.Name
	}
	if req.FrozenRows != nil {
		sheet.FrozenRows = *req.FrozenRows
	}
	if req.FrozenColumns != nil {
		sheet.FrozenColumns = *req.FrozenColumns
	}
	if req.HiddenRows != nil {
		sheet.HiddenRows = *req.HiddenRows
	}
	if req.HiddenColumns != nil {
		sheet.HiddenColumns = *req.HiddenColumns
	}

	if err := s.sheetRepo.Update(ctx, sheet); err != nil {
		return nil, err
	}

	return sheet, nil
}

func (s *spreadsheetService) DeleteSheet(ctx context.Context, sheetID uuid.UUID) error {
	return s.sheetRepo.Delete(ctx, sheetID)
}

func (s *spreadsheetService) UpdateCell(ctx context.Context, sheetID uuid.UUID, rowIndex, columnIndex int, req *model.UpdateCellRequest) (*model.Cell, error) {
	cell, err := s.cellRepo.GetByPosition(ctx, sheetID, rowIndex, columnIndex)
	if err != nil {
		// Cell doesn't exist, create new one
		cell = &model.Cell{
			ID:          uuid.New(),
			SheetID:     sheetID,
			RowIndex:    rowIndex,
			ColumnIndex: columnIndex,
			UpdatedAt:   time.Now(),
		}
	}

	// Handle formula
	if req.Formula != nil {
		cell.Formula = req.Formula
		cell.DataType = "formula"

		// Evaluate formula
		cellGetter := func(row, col int) (interface{}, error) {
			c, err := s.cellRepo.GetByPosition(ctx, sheetID, row, col)
			if err != nil {
				return nil, err
			}
			if c.Value != nil {
				if c.Value.Number != nil {
					return *c.Value.Number, nil
				}
				if c.Value.String != nil {
					return *c.Value.String, nil
				}
			}
			return nil, nil
		}

		result, err := s.formulaEngine.Evaluate(*req.Formula, cellGetter)
		if err == nil {
			// Store result as value
			cell.Value = &model.CellValue{}
			switch v := result.(type) {
			case float64:
				cell.Value.Number = &v
				cell.FormattedValue = strPtr(fmt.Sprintf("%v", v))
			case string:
				cell.Value.String = &v
				cell.FormattedValue = &v
			case bool:
				cell.Value.Boolean = &v
				cell.FormattedValue = strPtr(fmt.Sprintf("%v", v))
			}
		} else {
			cell.DataType = "error"
			errStr := fmt.Sprintf("#ERROR: %s", err.Error())
			cell.FormattedValue = &errStr
		}
	} else if req.Value != nil {
		// Handle regular value
		cell.Formula = nil
		cell.Value = &model.CellValue{}

		switch v := req.Value.(type) {
		case float64:
			cell.DataType = "number"
			cell.Value.Number = &v
			cell.FormattedValue = strPtr(fmt.Sprintf("%v", v))
		case string:
			cell.DataType = "string"
			cell.Value.String = &v
			cell.FormattedValue = &v
		case bool:
			cell.DataType = "boolean"
			cell.Value.Boolean = &v
			cell.FormattedValue = strPtr(fmt.Sprintf("%v", v))
		default:
			str := fmt.Sprintf("%v", v)
			cell.DataType = "string"
			cell.Value.String = &str
			cell.FormattedValue = &str
		}
	}

	if req.Style != nil {
		cell.Style = req.Style
	}

	if err := s.cellRepo.Upsert(ctx, cell); err != nil {
		return nil, err
	}

	return cell, nil
}

func (s *spreadsheetService) BatchUpdateCells(ctx context.Context, sheetID uuid.UUID, req *model.BatchUpdateCellsRequest) error {
	cells := make([]*model.Cell, 0, len(req.Updates))

	for _, update := range req.Updates {
		updateReq := model.UpdateCellRequest{
			Value:   update.Value,
			Formula: update.Formula,
			Style:   update.Style,
		}

		cell, err := s.UpdateCell(ctx, sheetID, update.RowIndex, update.ColumnIndex, &updateReq)
		if err != nil {
			return err
		}

		cells = append(cells, cell)
	}

	return nil
}

func (s *spreadsheetService) GetCells(ctx context.Context, sheetID uuid.UUID, query *model.GetCellsQuery) ([]*model.Cell, error) {
	return s.cellRepo.GetRange(ctx, sheetID, query)
}

func strPtr(s string) *string {
	return &s
}
