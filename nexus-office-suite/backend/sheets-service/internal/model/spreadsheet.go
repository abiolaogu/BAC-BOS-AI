package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Spreadsheet struct {
	ID        uuid.UUID `json:"id" db:"id"`
	TenantID  uuid.UUID `json:"tenantId" db:"tenant_id"`
	Title     string    `json:"title" db:"title"`
	CreatedBy uuid.UUID `json:"createdBy" db:"created_by"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
	FolderID  *uuid.UUID `json:"folderId,omitempty" db:"folder_id"`
	IsDeleted bool      `json:"isDeleted" db:"is_deleted"`
	Sheets    []Sheet   `json:"sheets,omitempty" db:"-"`
}

type Sheet struct {
	ID             uuid.UUID `json:"id" db:"id"`
	SpreadsheetID  uuid.UUID `json:"spreadsheetId" db:"spreadsheet_id"`
	Name           string    `json:"name" db:"name"`
	Position       int       `json:"position" db:"position"`
	RowCount       int       `json:"rowCount" db:"row_count"`
	ColumnCount    int       `json:"columnCount" db:"column_count"`
	FrozenRows     int       `json:"frozenRows,omitempty" db:"frozen_rows"`
	FrozenColumns  int       `json:"frozenColumns,omitempty" db:"frozen_columns"`
	HiddenRows     IntArray  `json:"hiddenRows,omitempty" db:"hidden_rows"`
	HiddenColumns  IntArray  `json:"hiddenColumns,omitempty" db:"hidden_columns"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" db:"updated_at"`
}

type Cell struct {
	ID             uuid.UUID       `json:"id" db:"id"`
	SheetID        uuid.UUID       `json:"sheetId" db:"sheet_id"`
	RowIndex       int             `json:"rowIndex" db:"row_index"`
	ColumnIndex    int             `json:"columnIndex" db:"column_index"`
	Value          *CellValue      `json:"value,omitempty" db:"value"`
	Formula        *string         `json:"formula,omitempty" db:"formula"`
	DataType       string          `json:"dataType" db:"data_type"`
	FormattedValue *string         `json:"formattedValue,omitempty" db:"formatted_value"`
	Style          *CellStyle      `json:"style,omitempty" db:"style"`
	UpdatedAt      time.Time       `json:"updatedAt" db:"updated_at"`
}

type CellValue struct {
	String  *string
	Number  *float64
	Boolean *bool
	Date    *time.Time
}

func (cv *CellValue) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	var result interface{}
	if err := json.Unmarshal(bytes, &result); err != nil {
		return err
	}

	switch v := result.(type) {
	case string:
		cv.String = &v
	case float64:
		cv.Number = &v
	case bool:
		cv.Boolean = &v
	}

	return nil
}

func (cv CellValue) Value() (driver.Value, error) {
	if cv.String != nil {
		return json.Marshal(*cv.String)
	}
	if cv.Number != nil {
		return json.Marshal(*cv.Number)
	}
	if cv.Boolean != nil {
		return json.Marshal(*cv.Boolean)
	}
	if cv.Date != nil {
		return json.Marshal(*cv.Date)
	}
	return nil, nil
}

type CellStyle struct {
	Bold            bool          `json:"bold,omitempty"`
	Italic          bool          `json:"italic,omitempty"`
	Underline       bool          `json:"underline,omitempty"`
	Strikethrough   bool          `json:"strikethrough,omitempty"`
	FontSize        int           `json:"fontSize,omitempty"`
	FontFamily      string        `json:"fontFamily,omitempty"`
	TextColor       string        `json:"textColor,omitempty"`
	BackgroundColor string        `json:"backgroundColor,omitempty"`
	HorizontalAlign string        `json:"horizontalAlign,omitempty"`
	VerticalAlign   string        `json:"verticalAlign,omitempty"`
	NumberFormat    string        `json:"numberFormat,omitempty"`
	Borders         *CellBorders  `json:"borders,omitempty"`
}

func (cs *CellStyle) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, cs)
}

func (cs CellStyle) Value() (driver.Value, error) {
	return json.Marshal(cs)
}

type CellBorders struct {
	Top    *BorderStyle `json:"top,omitempty"`
	Right  *BorderStyle `json:"right,omitempty"`
	Bottom *BorderStyle `json:"bottom,omitempty"`
	Left   *BorderStyle `json:"left,omitempty"`
}

type BorderStyle struct {
	Style string `json:"style"`
	Color string `json:"color"`
}

type Chart struct {
	ID        uuid.UUID     `json:"id" db:"id"`
	SheetID   uuid.UUID     `json:"sheetId" db:"sheet_id"`
	Type      string        `json:"type" db:"type"`
	Title     *string       `json:"title,omitempty" db:"title"`
	DataRange string        `json:"dataRange" db:"data_range"`
	Config    *ChartConfig  `json:"config,omitempty" db:"config"`
	Position  *ChartPosition `json:"position,omitempty" db:"position"`
	CreatedAt time.Time     `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time     `json:"updatedAt" db:"updated_at"`
}

type ChartConfig struct {
	XAxis  *AxisConfig    `json:"xAxis,omitempty"`
	YAxis  *AxisConfig    `json:"yAxis,omitempty"`
	Series []SeriesConfig `json:"series,omitempty"`
	Legend *LegendConfig  `json:"legend,omitempty"`
}

func (cc *ChartConfig) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, cc)
}

func (cc ChartConfig) Value() (driver.Value, error) {
	return json.Marshal(cc)
}

type AxisConfig struct {
	Title string `json:"title,omitempty"`
	Range string `json:"range,omitempty"`
}

type SeriesConfig struct {
	Name  string `json:"name"`
	Range string `json:"range"`
	Color string `json:"color,omitempty"`
}

type LegendConfig struct {
	Position string `json:"position"`
}

type ChartPosition struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

func (cp *ChartPosition) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, cp)
}

func (cp ChartPosition) Value() (driver.Value, error) {
	return json.Marshal(cp)
}

// IntArray is a custom type for scanning PostgreSQL integer arrays
type IntArray []int

func (ia *IntArray) Scan(value interface{}) error {
	if value == nil {
		*ia = []int{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, ia)
}

func (ia IntArray) Value() (driver.Value, error) {
	if len(ia) == 0 {
		return "[]", nil
	}
	return json.Marshal(ia)
}

// Request/Response Models
type CreateSpreadsheetRequest struct {
	Title    string              `json:"title"`
	Sheets   []CreateSheetRequest `json:"sheets,omitempty"`
	FolderID *uuid.UUID          `json:"folderId,omitempty"`
}

type CreateSheetRequest struct {
	Name        string `json:"name"`
	RowCount    int    `json:"rowCount,omitempty"`
	ColumnCount int    `json:"columnCount,omitempty"`
}

type UpdateSpreadsheetRequest struct {
	Title *string `json:"title,omitempty"`
}

type UpdateSheetRequest struct {
	Name          *string  `json:"name,omitempty"`
	FrozenRows    *int     `json:"frozenRows,omitempty"`
	FrozenColumns *int     `json:"frozenColumns,omitempty"`
	HiddenRows    *IntArray `json:"hiddenRows,omitempty"`
	HiddenColumns *IntArray `json:"hiddenColumns,omitempty"`
}

type UpdateCellRequest struct {
	Value    interface{} `json:"value,omitempty"`
	Formula  *string     `json:"formula,omitempty"`
	Style    *CellStyle  `json:"style,omitempty"`
}

type BatchUpdateCellsRequest struct {
	Updates []CellUpdate `json:"updates"`
}

type CellUpdate struct {
	RowIndex    int         `json:"rowIndex"`
	ColumnIndex int         `json:"columnIndex"`
	Value       interface{} `json:"value,omitempty"`
	Formula     *string     `json:"formula,omitempty"`
	Style       *CellStyle  `json:"style,omitempty"`
}

type GetCellsQuery struct {
	StartRow    int `json:"startRow"`
	EndRow      int `json:"endRow"`
	StartColumn int `json:"startColumn"`
	EndColumn   int `json:"endColumn"`
}

type CreateChartRequest struct {
	Type      string         `json:"type"`
	Title     *string        `json:"title,omitempty"`
	DataRange string         `json:"dataRange"`
	Config    *ChartConfig   `json:"config,omitempty"`
	Position  *ChartPosition `json:"position,omitempty"`
}

type ListSpreadsheetsQuery struct {
	Page     int     `json:"page"`
	PageSize int     `json:"pageSize"`
	Search   *string `json:"search,omitempty"`
	FolderID *uuid.UUID `json:"folderId,omitempty"`
	SortBy   string  `json:"sortBy"`
	SortOrder string `json:"sortOrder"`
}
