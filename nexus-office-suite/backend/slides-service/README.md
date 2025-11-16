# NEXUS Slides Service

Presentation management service with slide editing, themes, and layouts.

## Features

- **Presentation Management**: Create, edit, and delete presentations
- **Slide Editor**: Rich slide editing with elements (text, images, shapes, charts)
- **Themes**: Customizable themes with color palettes and fonts
- **Layouts**: Predefined slide layouts for quick creation
- **Element Positioning**: Precise positioning and sizing of elements
- **Transitions**: Slide transitions with multiple effects
- **Multi-tenant**: Complete isolation between tenants
- **Collaboration**: Share and collaborate on presentations (future)
- **Export**: Export to PDF, images (future)

## Tech Stack

- **Language**: Go 1.21+
- **Database**: PostgreSQL 15
- **Authentication**: JWT
- **HTTP Framework**: Gorilla Mux

## Getting Started

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 15
- Make (optional)

### Installation

1. Clone the repository
2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Run database migrations:
```bash
psql -U nexus -d nexus_slides -f migrations/001_initial_schema.sql
```

5. Install dependencies:
```bash
go mod download
```

### Development

Run the service:
```bash
go run cmd/main.go
# or with make
make run
```

The service will start on `http://localhost:8094`

### Production Build

```bash
make build
./bin/slides-service
```

### Docker

Build Docker image:
```bash
make docker-build
```

Run with Docker:
```bash
make docker-run
```

## API Endpoints

### Presentations

- `POST /api/v1/presentations` - Create presentation
- `GET /api/v1/presentations` - List presentations
- `GET /api/v1/presentations/{id}` - Get presentation
- `PUT /api/v1/presentations/{id}` - Update presentation
- `DELETE /api/v1/presentations/{id}` - Delete presentation

### Slides

- `POST /api/v1/slides` - Create slide
- `GET /api/v1/slides/{id}` - Get slide
- `PUT /api/v1/slides/{id}` - Update slide
- `DELETE /api/v1/slides/{id}` - Delete slide
- `GET /api/v1/presentations/{presentation_id}/slides` - List slides

## Data Model

### Presentation
- Title, description
- Theme association
- Slide dimensions (width × height)
- Slide count
- Public/private visibility

### Slide
- Order/position in presentation
- Title and speaker notes
- Background (solid, gradient, image)
- Elements collection
- Transition effects

### Element Types
1. **Text**: Rich text with formatting
2. **Image**: Images with URL and alt text
3. **Shape**: Rectangles, circles, triangles, etc.
4. **Video**: Embedded videos
5. **Chart**: Data visualizations

### Element Properties
- Position (x, y coordinates)
- Size (width, height)
- Rotation angle
- Z-index (layering)
- Style (colors, borders, shadows)
- Content (type-specific data)

### Theme
- Color palette (primary, secondary, accent, etc.)
- Font families (heading, body, code)
- Slide layouts

## Example Usage

### Create Presentation
```bash
curl -X POST http://localhost:8094/api/v1/presentations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q4 Marketing Strategy",
    "description": "Marketing plan for Q4 2024",
    "width": 1920,
    "height": 1080
  }'
```

### Create Slide with Elements
```bash
curl -X POST http://localhost:8094/api/v1/slides \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "presentation-uuid",
    "title": "Introduction",
    "background": {
      "type": "solid",
      "color": "#FFFFFF"
    },
    "elements": [
      {
        "id": "title",
        "type": "text",
        "position": {"x": 100, "y": 400},
        "size": {"width": 1720, "height": 200},
        "z_index": 1,
        "rotation": 0,
        "content": {
          "text": "Welcome",
          "font_family": "Inter",
          "font_size": 72,
          "font_weight": "bold",
          "color": "#1F2937",
          "text_align": "center"
        }
      }
    ]
  }'
```

## Project Structure

```
.
├── cmd/
│   └── main.go              # Application entry point
├── config/
│   └── config.go            # Configuration management
├── internal/
│   ├── handler/
│   │   └── presentation_handler.go  # HTTP handlers
│   ├── middleware/
│   │   └── middleware.go    # JWT auth, logging, CORS
│   ├── model/
│   │   └── presentation.go  # Data models
│   ├── repository/
│   │   ├── presentation_repository.go
│   │   ├── slide_repository.go
│   │   └── theme_repository.go
│   └── service/
│       └── presentation_service.go  # Business logic
├── migrations/
│   └── 001_initial_schema.sql
├── Dockerfile
├── Makefile
└── README.md
```

## Slide Elements

Elements are stored as JSONB in the database for flexibility.

### Text Element
```json
{
  "id": "text-1",
  "type": "text",
  "position": {"x": 100, "y": 200},
  "size": {"width": 500, "height": 100},
  "z_index": 1,
  "rotation": 0,
  "content": {
    "text": "Hello World",
    "font_family": "Inter",
    "font_size": 24,
    "font_weight": "normal",
    "color": "#000000",
    "text_align": "left"
  }
}
```

### Image Element
```json
{
  "id": "img-1",
  "type": "image",
  "position": {"x": 200, "y": 300},
  "size": {"width": 400, "height": 300},
  "z_index": 2,
  "rotation": 0,
  "content": {
    "url": "https://example.com/image.jpg",
    "alt": "Description"
  }
}
```

### Shape Element
```json
{
  "id": "shape-1",
  "type": "shape",
  "position": {"x": 300, "y": 400},
  "size": {"width": 200, "height": 200},
  "z_index": 3,
  "rotation": 45,
  "style": {
    "background_color": "#3B82F6",
    "border_color": "#1F2937",
    "border_width": 2
  },
  "content": {
    "shape_type": "rectangle",
    "fill_color": "#3B82F6"
  }
}
```

## Themes

Themes provide consistent styling across presentations.

### Default Theme Structure
```json
{
  "name": "Default",
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#64748B",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#1F2937"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter",
    "code": "JetBrains Mono"
  },
  "layouts": [...]
}
```

## Slide Layouts

Layouts provide pre-configured slide templates.

Available default layouts:
- **Title Slide**: Large centered title
- **Content Slide**: Title + content area

Custom layouts can be created per theme.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | HTTP server port | 8094 |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | nexus_slides |
| JWT_SECRET | JWT signing secret | (required) |
| DEFAULT_SLIDE_WIDTH | Default slide width | 1920 |
| DEFAULT_SLIDE_HEIGHT | Default slide height | 1080 |
| MAX_SLIDES_PER_PRESENTATION | Max slides per presentation | 500 |

## Security Features

- JWT authentication required for all endpoints
- Multi-tenant isolation at database level
- Owner-only edit/delete access
- SQL injection protection via parameterized queries
- CORS configuration for web clients

## Future Enhancements

- Real-time collaboration
- Export to PDF/PNG
- Slide animations
- Master slides
- Presenter view
- Comments and suggestions
- Version history
- Template marketplace

## License

Copyright (c) 2024 NEXUS Business Operating System
