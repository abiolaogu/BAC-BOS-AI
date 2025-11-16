# NEXUS Slides - Web Frontend

A modern presentation editor built with Next.js 14, React 18, and TypeScript. Part of the NEXUS Office Suite.

## Features

- **Presentation Management**: Create, edit, and delete presentations
- **Slide Editor**: Visual slide editor with drag-and-drop elements
- **Element Types**: Text, images, shapes (rectangles, circles)
- **Slide Thumbnails**: Side panel with slide previews and quick navigation
- **Zoom Controls**: Zoom in/out for precise editing
- **Presentation Mode**: Full-screen presentation view
- **Real-time Updates**: State management with Zustand
- **Authentication**: JWT-based authentication with persistent sessions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Drag & Drop**: react-draggable
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- NEXUS Slides backend service running (default: `http://localhost:8094`)

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8094/api/v1
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3003](http://localhost:3003) in your browser

## Project Structure

```
slides-app/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── editor/[id]/        # Presentation editor
│   │   ├── presentations/      # Presentation list
│   │   ├── login/              # Authentication
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home redirect
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   └── editor/             # Editor components
│   │       ├── SlideCanvas.tsx # Main slide canvas
│   │       ├── SlideThumbnails.tsx # Slide sidebar
│   │       └── Toolbar.tsx     # Editor toolbar
│   ├── lib/                    # Utilities
│   │   └── api/                # API clients
│   │       ├── client.ts       # Axios instance
│   │       ├── presentations.ts # Presentation API
│   │       └── auth.ts         # Authentication API
│   ├── store/                  # Zustand state stores
│   │   ├── authStore.ts        # Authentication state
│   │   └── presentationStore.ts # Presentation editing state
│   └── types/                  # TypeScript types
│       ├── presentation.ts     # Presentation types
│       └── auth.ts             # Auth types
├── public/                     # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Key Components

### SlideCanvas
Main canvas component for editing slides. Supports:
- Rendering slide background (color/image)
- Draggable elements (text, images, shapes)
- Element selection and deletion
- Zoom support

### SlideThumbnails
Sidebar component with:
- Slide thumbnails with simplified previews
- "New Slide" button
- Current slide highlighting
- Delete slide functionality

### Toolbar
Top toolbar with:
- Element insertion buttons (Text, Image, Shape)
- Quick shape buttons (Rectangle, Circle)
- Zoom controls with percentage display
- Present button for full-screen mode

## State Management

### presentationStore
Manages presentation editing state:
- Current presentation and slides
- Current slide index
- Selected elements
- Zoom level
- Presentation mode

### authStore
Manages authentication state:
- User information
- JWT token (persisted to localStorage)
- Login/logout actions

## API Integration

All API calls go through the `lib/api` modules:

```typescript
// Create presentation
const presentation = await presentationsApi.create({
  title: 'My Presentation',
  description: 'Optional description',
});

// Create slide
const slide = await presentationsApi.createSlide({
  presentation_id: presentationId,
  order: 0,
});

// Update slide
const updated = await presentationsApi.updateSlide(slideId, {
  elements: [...elements],
});
```

## Element Types

### Text Element
```typescript
{
  type: 'text',
  content: {
    text: 'Hello World',
    font_family: 'Inter',
    font_size: 24,
    font_weight: 'normal',
    color: '#1F2937',
    text_align: 'left',
  },
}
```

### Image Element
```typescript
{
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    alt: 'Description',
  },
}
```

### Shape Element
```typescript
{
  type: 'shape',
  content: {
    shape_type: 'rectangle', // or 'circle'
  },
  style: {
    background_color: '#3B82F6',
    border_color: '#1E40AF',
    border_width: 2,
  },
}
```

## Building for Production

```bash
npm run build
npm start
```

The app will be available at `http://localhost:3003`.

## Docker Deployment

```bash
# Build Docker image
docker build -t nexus-slides-frontend:latest .

# Run container
docker run -p 3003:3003 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8094/api/v1 \
  nexus-slides-frontend:latest
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8094/api/v1` |
| `PORT` | Development server port | `3003` |

## Development

### Code Style
- ESLint configured with Next.js core web vitals
- TypeScript strict mode enabled
- Prettier recommended for formatting

### Testing
```bash
# Run tests (if configured)
npm test
```

## License

Part of the NEXUS Office Suite
