# NEXUS Sheets API Specification

## Overview

The Sheets API provides spreadsheet functionality with formula calculation, charts, and data analysis capabilities similar to Google Sheets, Microsoft Excel, and Zoho Sheet.

## Base URL
```
http://localhost:8092/api/v1
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Data Models

### Spreadsheet
```typescript
interface Spreadsheet {
  id: string;                    // UUID
  tenantId: string;
  title: string;                 // Spreadsheet title
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string;
  isDeleted: boolean;
  sheets: Sheet[];               // Array of sheets/tabs
}

interface Sheet {
  id: string;
  spreadsheetId: string;
  name: string;                  // Sheet name (e.g., "Sheet1")
  position: number;              // Tab order (0-indexed)
  rowCount: number;              // Number of rows (default: 1000)
  columnCount: number;           // Number of columns (default: 26)
  frozenRows?: number;           // Number of frozen rows
  frozenColumns?: number;        // Number of frozen columns
  hiddenRows?: number[];         // Array of hidden row indices
  hiddenColumns?: number[];      // Array of hidden column indices
}

interface Cell {
  id: string;
  sheetId: string;
  rowIndex: number;              // 0-indexed row
  columnIndex: number;           // 0-indexed column (A=0, B=1, ...)
  value?: string | number | boolean | Date;
  formula?: string;              // e.g., "=SUM(A1:A10)"
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'error';
  formattedValue?: string;       // Display value
  style?: CellStyle;
  updatedAt: string;
}

interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;             // Default: 12
  fontFamily?: string;           // Default: "Arial"
  textColor?: string;            // Hex color
  backgroundColor?: string;      // Hex color
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  numberFormat?: string;         // e.g., "$0.00", "0.00%"
  borders?: {
    top?: BorderStyle;
    right?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
  };
}

interface BorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'dashed' | 'dotted';
  color: string;
}

interface Chart {
  id: string;
  sheetId: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'column';
  title?: string;
  dataRange: string;             // e.g., "A1:B10"
  config: ChartConfig;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: string;
}

interface ChartConfig {
  xAxis?: {
    title?: string;
    range?: string;              // e.g., "A2:A10"
  };
  yAxis?: {
    title?: string;
    range?: string;
  };
  series?: Array<{
    name: string;
    range: string;
    color?: string;
  }>;
  legend?: {
    position: 'top' | 'bottom' | 'left' | 'right' | 'none';
  };
}

interface CellRange {
  sheet: string;                 // Sheet name
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}
```

## API Endpoints

### 1. Create Spreadsheet

**POST** `/spreadsheets`

Creates a new spreadsheet.

**Request Body:**
```json
{
  "title": "My Spreadsheet",
  "sheets": [
    {
      "name": "Sheet1",
      "rowCount": 1000,
      "columnCount": 26
    }
  ],
  "folderId": "optional-folder-id"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-123",
  "title": "My Spreadsheet",
  "createdBy": "user-123",
  "createdAt": "2025-11-14T10:00:00Z",
  "updatedAt": "2025-11-14T10:00:00Z",
  "sheets": [
    {
      "id": "sheet-1",
      "spreadsheetId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Sheet1",
      "position": 0,
      "rowCount": 1000,
      "columnCount": 26
    }
  ]
}
```

---

### 2. Get Spreadsheet

**GET** `/spreadsheets/:id`

Retrieves spreadsheet metadata (without cell data).

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Spreadsheet",
  "sheets": [
    {
      "id": "sheet-1",
      "name": "Sheet1",
      "position": 0,
      "rowCount": 1000,
      "columnCount": 26
    }
  ],
  "createdAt": "2025-11-14T10:00:00Z",
  "updatedAt": "2025-11-14T12:00:00Z"
}
```

---

### 3. Update Spreadsheet

**PUT** `/spreadsheets/:id`

Updates spreadsheet title or settings.

**Request Body:**
```json
{
  "title": "Updated Spreadsheet Title"
}
```

**Response:** `200 OK`

---

### 4. Delete Spreadsheet

**DELETE** `/spreadsheets/:id`

Deletes a spreadsheet.

**Response:** `204 No Content`

---

### 5. Add Sheet

**POST** `/spreadsheets/:id/sheets`

Adds a new sheet/tab to the spreadsheet.

**Request Body:**
```json
{
  "name": "Sheet2",
  "position": 1,
  "rowCount": 1000,
  "columnCount": 26
}
```

**Response:** `201 Created`
```json
{
  "id": "sheet-2",
  "spreadsheetId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Sheet2",
  "position": 1,
  "rowCount": 1000,
  "columnCount": 26
}
```

---

### 6. Update Sheet

**PUT** `/spreadsheets/:id/sheets/:sheetId`

Updates sheet properties.

**Request Body:**
```json
{
  "name": "Renamed Sheet",
  "frozenRows": 1,
  "frozenColumns": 1
}
```

**Response:** `200 OK`

---

### 7. Delete Sheet

**DELETE** `/spreadsheets/:id/sheets/:sheetId`

Deletes a sheet from the spreadsheet.

**Response:** `204 No Content`

---

### 8. Get Cells

**GET** `/spreadsheets/:id/sheets/:sheetId/cells`

Retrieves cell data for a range.

**Query Parameters:**
- `range` (required): Cell range in A1 notation (e.g., "A1:C10")
- `valueRenderOption` (optional): "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA"

**Examples:**
```
GET /spreadsheets/123/sheets/sheet-1/cells?range=A1:C10
GET /spreadsheets/123/sheets/sheet-1/cells?range=A:A
GET /spreadsheets/123/sheets/sheet-1/cells?range=1:5
```

**Response:** `200 OK`
```json
{
  "range": "A1:C10",
  "rows": [
    {
      "rowIndex": 0,
      "cells": [
        {
          "columnIndex": 0,
          "value": "Name",
          "dataType": "string",
          "style": {
            "bold": true,
            "backgroundColor": "#f0f0f0"
          }
        },
        {
          "columnIndex": 1,
          "value": "Age",
          "dataType": "string",
          "style": { "bold": true }
        },
        {
          "columnIndex": 2,
          "value": "Total",
          "dataType": "string",
          "style": { "bold": true }
        }
      ]
    },
    {
      "rowIndex": 1,
      "cells": [
        {
          "columnIndex": 0,
          "value": "John Doe",
          "dataType": "string"
        },
        {
          "columnIndex": 1,
          "value": 30,
          "dataType": "number"
        },
        {
          "columnIndex": 2,
          "formula": "=SUM(A2:B2)",
          "value": 30,
          "formattedValue": "30.00",
          "dataType": "formula"
        }
      ]
    }
  ]
}
```

---

### 9. Update Cells

**PUT** `/spreadsheets/:id/sheets/:sheetId/cells`

Updates cell values and/or styles.

**Request Body:**
```json
{
  "updates": [
    {
      "range": "A1",
      "value": "Updated Value",
      "style": {
        "bold": true,
        "textColor": "#ff0000"
      }
    },
    {
      "range": "B1:B10",
      "formula": "=A1*2"
    },
    {
      "range": "C1:C10",
      "value": [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "updatedCells": 21,
  "updatedRanges": ["A1", "B1:B10", "C1:C10"]
}
```

---

### 10. Batch Update

**POST** `/spreadsheets/:id/batch-update`

Performs multiple operations in a single request.

**Request Body:**
```json
{
  "requests": [
    {
      "updateCells": {
        "range": "A1:A10",
        "values": [["Header"], [1], [2], [3], [4], [5], [6], [7], [8], [9]]
      }
    },
    {
      "updateCellsFormat": {
        "range": "A1",
        "format": {
          "bold": true,
          "fontSize": 14
        }
      }
    },
    {
      "addSheet": {
        "name": "New Sheet"
      }
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "replies": [
    {
      "updateCells": {
        "updatedCells": 10
      }
    },
    {
      "updateCellsFormat": {
        "updatedCells": 1
      }
    },
    {
      "addSheet": {
        "sheetId": "new-sheet-id"
      }
    }
  ]
}
```

---

### 11. Calculate Formula

**POST** `/spreadsheets/:id/sheets/:sheetId/calculate`

Recalculates all formulas in a sheet or specific range.

**Request Body:**
```json
{
  "range": "A1:Z1000"  // Optional, defaults to entire sheet
}
```

**Response:** `200 OK`
```json
{
  "calculatedCells": 150,
  "errors": [
    {
      "cell": "B5",
      "error": "#DIV/0!",
      "message": "Division by zero"
    }
  ]
}
```

---

### 12. Create Chart

**POST** `/spreadsheets/:id/sheets/:sheetId/charts`

Creates a chart in the spreadsheet.

**Request Body:**
```json
{
  "type": "line",
  "title": "Sales Over Time",
  "dataRange": "A1:B10",
  "config": {
    "xAxis": {
      "title": "Month",
      "range": "A2:A10"
    },
    "yAxis": {
      "title": "Revenue",
      "range": "B2:B10"
    },
    "series": [
      {
        "name": "2024 Sales",
        "range": "B2:B10",
        "color": "#4285f4"
      }
    ],
    "legend": {
      "position": "bottom"
    }
  },
  "position": {
    "x": 500,
    "y": 100,
    "width": 600,
    "height": 400
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "chart-1",
  "sheetId": "sheet-1",
  "type": "line",
  "title": "Sales Over Time",
  "createdAt": "2025-11-14T15:00:00Z"
}
```

---

### 13. Update Chart

**PUT** `/spreadsheets/:id/sheets/:sheetId/charts/:chartId`

Updates chart configuration.

**Response:** `200 OK`

---

### 14. Delete Chart

**DELETE** `/spreadsheets/:id/sheets/:sheetId/charts/:chartId`

Deletes a chart.

**Response:** `204 No Content`

---

### 15. Export Spreadsheet

**GET** `/spreadsheets/:id/export/:format`

Exports spreadsheet to various formats.

**Path Parameters:**
- `format`: xlsx | csv | pdf | ods

**Query Parameters:**
- `sheetId` (optional): Export specific sheet only
- `range` (optional): Export specific range (for CSV)

**Response:** `200 OK`
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | text/csv | application/pdf
- Binary file stream

**Example:**
```
GET /spreadsheets/550e8400-e29b-41d4-a716-446655440000/export/xlsx
GET /spreadsheets/550e8400-e29b-41d4-a716-446655440000/export/csv?sheetId=sheet-1&range=A1:C100
```

---

### 16. Import Spreadsheet

**POST** `/spreadsheets/import`

Imports a spreadsheet from external format.

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data

file: <binary file>
format: xlsx | csv | ods
title: "Imported Spreadsheet"
folderId: "optional-folder-id"
```

**Response:** `201 Created`
```json
{
  "id": "new-spreadsheet-id",
  "title": "Imported Spreadsheet",
  "sheets": [ ... ],
  "createdAt": "2025-11-14T16:00:00Z"
}
```

---

### 17. Named Ranges

**POST** `/spreadsheets/:id/named-ranges`

Creates a named range (e.g., "Sales_Q1" = "A1:A10").

**Request Body:**
```json
{
  "name": "Sales_Q1",
  "range": "Sheet1!A1:A10"
}
```

**Response:** `201 Created`

**GET** `/spreadsheets/:id/named-ranges`

Lists all named ranges.

**Response:** `200 OK`
```json
{
  "namedRanges": [
    {
      "id": "range-1",
      "name": "Sales_Q1",
      "range": "Sheet1!A1:A10"
    }
  ]
}
```

---

### 18. Data Validation

**POST** `/spreadsheets/:id/sheets/:sheetId/validation`

Adds data validation rules to cells.

**Request Body:**
```json
{
  "range": "B2:B100",
  "rule": {
    "type": "number_between",
    "min": 0,
    "max": 100,
    "strict": true,
    "errorMessage": "Value must be between 0 and 100"
  }
}
```

**Validation Types:**
- `number_between`, `number_greater_than`, `number_less_than`
- `date_between`, `date_after`, `date_before`
- `list_from_range`, `list_explicit`
- `text_contains`, `text_matches_pattern`
- `checkbox`
- `custom_formula`

**Response:** `201 Created`

---

### 19. Conditional Formatting

**POST** `/spreadsheets/:id/sheets/:sheetId/conditional-formatting`

Adds conditional formatting rules.

**Request Body:**
```json
{
  "range": "A1:A10",
  "rules": [
    {
      "condition": {
        "type": "number_greater_than",
        "value": 100
      },
      "format": {
        "backgroundColor": "#00ff00",
        "textColor": "#ffffff",
        "bold": true
      }
    }
  ]
}
```

**Response:** `201 Created`

---

### 20. Pivot Tables

**POST** `/spreadsheets/:id/sheets/:sheetId/pivot-tables`

Creates a pivot table.

**Request Body:**
```json
{
  "sourceRange": "A1:D100",
  "rows": ["Category"],
  "columns": ["Month"],
  "values": [
    {
      "field": "Sales",
      "aggregation": "SUM"
    }
  ],
  "filters": ["Region"]
}
```

**Response:** `201 Created`
```json
{
  "id": "pivot-1",
  "sheetId": "new-sheet-id",
  "createdAt": "2025-11-14T17:00:00Z"
}
```

---

## Supported Formulas

### Math & Statistics
- `SUM(range)` - Sum of values
- `AVERAGE(range)` - Average of values
- `COUNT(range)` - Count of numeric values
- `COUNTA(range)` - Count of non-empty cells
- `MAX(range)` - Maximum value
- `MIN(range)` - Minimum value
- `MEDIAN(range)` - Median value
- `STDEV(range)` - Standard deviation
- `ROUND(number, decimals)` - Round number
- `ROUNDUP(number, decimals)` - Round up
- `ROUNDDOWN(number, decimals)` - Round down
- `ABS(number)` - Absolute value
- `SQRT(number)` - Square root
- `POWER(base, exponent)` - Power
- `MOD(number, divisor)` - Modulo

### Logical
- `IF(condition, value_if_true, value_if_false)`
- `AND(condition1, condition2, ...)`
- `OR(condition1, condition2, ...)`
- `NOT(condition)`
- `IFS(condition1, value1, condition2, value2, ...)`
- `IFERROR(value, value_if_error)`

### Text
- `CONCATENATE(text1, text2, ...)` or `&` operator
- `LEFT(text, num_chars)`
- `RIGHT(text, num_chars)`
- `MID(text, start, num_chars)`
- `LEN(text)` - Length of text
- `UPPER(text)` - Convert to uppercase
- `LOWER(text)` - Convert to lowercase
- `TRIM(text)` - Remove extra spaces
- `SUBSTITUTE(text, old_text, new_text)`
- `FIND(search_text, text)` - Find position
- `SPLIT(text, delimiter)` - Split text

### Date & Time
- `TODAY()` - Current date
- `NOW()` - Current date and time
- `DATE(year, month, day)`
- `YEAR(date)` - Extract year
- `MONTH(date)` - Extract month
- `DAY(date)` - Extract day
- `HOUR(time)` - Extract hour
- `MINUTE(time)` - Extract minute
- `SECOND(time)` - Extract second
- `DATEDIF(start_date, end_date, unit)` - Date difference
- `WEEKDAY(date)` - Day of week
- `EOMONTH(date, months)` - End of month

### Lookup & Reference
- `VLOOKUP(search_key, range, index, is_sorted)`
- `HLOOKUP(search_key, range, index, is_sorted)`
- `INDEX(range, row, column)`
- `MATCH(search_key, range, search_type)`
- `OFFSET(cell, rows, cols, height, width)`
- `INDIRECT(cell_reference_as_string)`

### Financial
- `PMT(rate, nper, pv)` - Payment
- `FV(rate, nper, pmt)` - Future value
- `PV(rate, nper, pmt)` - Present value
- `NPV(rate, value1, value2, ...)` - Net present value
- `IRR(values)` - Internal rate of return

---

## WebSocket Events

For real-time collaboration on spreadsheets.

**Connection URL:** `ws://localhost:8092/ws/spreadsheets/:spreadsheetId`

### Events

#### Client → Server

**Cell Update**
```json
{
  "type": "cell:update",
  "sheetId": "sheet-1",
  "updates": [
    {
      "row": 0,
      "column": 0,
      "value": "New Value"
    }
  ]
}
```

#### Server → Client

**Cell Updated**
```json
{
  "type": "cell:updated",
  "userId": "user-456",
  "sheetId": "sheet-1",
  "updates": [ ... ]
}
```

---

## Error Responses

```json
{
  "statusCode": 422,
  "message": "Formula error",
  "errors": [
    {
      "cell": "A1",
      "error": "#REF!",
      "message": "Invalid cell reference"
    }
  ]
}
```

**Formula Errors:**
- `#DIV/0!` - Division by zero
- `#N/A` - Value not available
- `#NAME?` - Unrecognized name
- `#NULL!` - Invalid intersection
- `#NUM!` - Invalid numeric value
- `#REF!` - Invalid cell reference
- `#VALUE!` - Wrong type of argument

---

## Rate Limiting

- **Rate Limit:** 2000 requests per hour per user
- Cell updates are more expensive (5 requests per batch update)

---

## Extensibility Notes

### Future Enhancements

1. **Advanced Features**
   - Macros and scripting (JavaScript-based)
   - Custom functions
   - Add-ons/plugins marketplace

2. **Data Integration**
   - Import from databases (SQL queries)
   - Connect to external APIs
   - Real-time data feeds

3. **AI Features**
   - Auto-complete formulas
   - Data insights and recommendations
   - Natural language queries ("show sales by region")
   - Automatic chart suggestions

4. **Collaboration**
   - Cell-level comments
   - @mentions in comments
   - Suggested edits

5. **Advanced Analytics**
   - What-if analysis
   - Goal seek
   - Solver for optimization problems
   - Statistical analysis tools

---

**Version:** 1.0
**Last Updated:** 2025-11-14
