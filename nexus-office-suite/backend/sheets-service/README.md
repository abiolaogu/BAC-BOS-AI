# NEXUS Sheets Service

A powerful spreadsheet engine with formula calculation, charts, and data analysis capabilities.

## Features

- **Spreadsheet Management**: Create, update, and organize spreadsheets
- **Sheet Operations**: Multiple sheets per spreadsheet with frozen rows/columns
- **Cell Operations**: Sparse cell storage for efficient memory usage
- **Formula Engine**: 50+ built-in functions including:
  - Math: SUM, AVERAGE, COUNT, MIN, MAX, ROUND, SQRT, POWER, etc.
  - Statistical: MEDIAN, MODE, STDEV, VAR
  - Logical: IF, AND, OR, NOT, IFERROR
  - Text: CONCATENATE, LEFT, RIGHT, MID, LEN, UPPER, LOWER, TRIM
  - Date: TODAY, NOW, YEAR, MONTH, DAY, DATE
- **Cell Styling**: Bold, italic, underline, colors, fonts, borders
- **Batch Updates**: Update multiple cells in a single request
- **Multi-Tenant**: Isolated data per tenant
- **JWT Authentication**: Secure API endpoints

## Tech Stack

- **Language**: Go 1.21+
- **Database**: PostgreSQL 15 with sparse cell storage
- **Cache**: Redis (optional, for formula caching)
- **Framework**: Gorilla Mux
- **Auth**: JWT with golang-jwt/jwt/v5

## API Endpoints

### Spreadsheets

- `POST /api/v1/spreadsheets` - Create spreadsheet
- `GET /api/v1/spreadsheets` - List spreadsheets
- `GET /api/v1/spreadsheets/:id` - Get spreadsheet
- `PUT /api/v1/spreadsheets/:id` - Update spreadsheet
- `DELETE /api/v1/spreadsheets/:id` - Delete spreadsheet

### Sheets

- `POST /api/v1/spreadsheets/:id/sheets` - Add sheet
- `PUT /api/v1/sheets/:sheetId` - Update sheet
- `DELETE /api/v1/sheets/:sheetId` - Delete sheet

### Cells

- `GET /api/v1/sheets/:sheetId/cells` - Get cells in range
- `PUT /api/v1/sheets/:sheetId/cells/:row/:col` - Update single cell
- `POST /api/v1/sheets/:sheetId/cells` - Batch update cells

## Getting Started

### Prerequisites

- Go 1.21+
- PostgreSQL 15+
- Redis (optional)

### Installation

1. Install dependencies:
```bash
go mod download
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
DATABASE_URL=postgres://user:password@localhost:5432/sheets?sslmode=disable
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PORT=8092
```

4. Run database migrations (see `database/migrations/002_create_sheets_tables.sql`)

### Running

Development:
```bash
make run
# or
go run cmd/main.go
```

Production:
```bash
make build
./bin/sheets-service
```

With Docker:
```bash
make docker-build
make docker-run
```

## Formula Examples

```javascript
// Math functions
=SUM(A1:A10)
=AVERAGE(B1:B5)
=ROUND(C1, 2)
=MAX(D1:D100)

// Logical functions
=IF(E1>100, "High", "Low")
=AND(F1>0, F2<100)
=OR(G1="A", G1="B")

// Text functions
=CONCATENATE(H1, " ", I1)
=UPPER(J1)
=LEN(K1)

// Date functions
=TODAY()
=YEAR(L1)
=DATE(2024, 12, 25)

// Nested functions
=IF(SUM(A1:A10)>100, "Pass", "Fail")
=ROUND(AVERAGE(B1:B10), 2)
```

## Architecture

```
cmd/
  main.go              # Application entry point
internal/
  handler/             # HTTP handlers
  service/             # Business logic
  repository/          # Data access layer
  middleware/          # Auth, logging, etc.
  formula/             # Formula engine
    engine.go          # Formula parser/evaluator
    functions.go       # Built-in functions (50+)
  model/               # Data models
config/                # Configuration
```

## Formula Engine

The formula engine supports:

- **Cell References**: `A1`, `B2`, `Z100`
- **Ranges**: `A1:A10`, `B1:Z100`
- **Operators**: `+`, `-`, `*`, `/`
- **Functions**: 50+ built-in functions
- **Nested Formulas**: `=SUM(A1:A10) / COUNT(A1:A10)`

### Adding Custom Functions

```go
// In internal/formula/functions.go
func (e *Engine) registerBuiltInFunctions() {
    // ... existing functions

    e.functions["CUSTOM"] = funcCustom
}

func funcCustom(args []interface{}) (interface{}, error) {
    // Your implementation
    return result, nil
}
```

## Performance

- **Sparse Cell Storage**: Only non-empty cells are stored
- **Batch Operations**: Update multiple cells in single transaction
- **Database Indexes**: Optimized for range queries
- **Connection Pooling**: Configured for high concurrency

## Testing

Run tests:
```bash
make test
```

Run with coverage:
```bash
go test -v -cover ./...
```

## Deployment

### Docker

```bash
docker build -t nexus-sheets:latest .
docker run -p 8092:8092 --env-file .env nexus-sheets:latest
```

### Docker Compose

See `nexus-office-suite/docker-compose.yml`

## License

Copyright (c) 2024 NEXUS Business Operating System
