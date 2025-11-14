# NEXUS Writer - Web Frontend

Professional document editing and collaboration platform built with Next.js 14 and Lexical.

## Features

- **Rich Text Editing**: Powered by Lexical editor with support for:
  - Text formatting (bold, italic, underline, strikethrough)
  - Headings (H1-H6)
  - Lists (ordered and unordered)
  - Links
  - Quotes
  - Markdown shortcuts

- **Real-time Collaboration**:
  - See who's editing the document
  - Live cursor positions
  - WebSocket-based updates

- **Document Management**:
  - Create, edit, and delete documents
  - Organize with folders
  - Search functionality
  - Version history

- **Comments & Activity**:
  - Add comments to documents
  - Resolve/unresolve comments
  - Activity log tracking

- **Export & Import**:
  - Export to PDF, DOCX, HTML, TXT, Markdown
  - Import from various formats

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Editor**: Lexical
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Animations**: Framer Motion
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend service running (see `backend/writer-service`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:8091/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8091
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── documents/[id]/    # Document editor page
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── editor/           # Lexical editor components
│   ├── documents/        # Document list
│   ├── comments/         # Comments UI
│   ├── activity/         # Activity log
│   ├── layout/           # Header, Sidebar
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
│   ├── useDocuments.ts   # Document operations
│   ├── useComments.ts    # Comment operations
│   ├── useFolders.ts     # Folder operations
│   └── useWebSocket.ts   # WebSocket connection
├── lib/                  # Libraries and utilities
│   ├── api/              # API clients
│   └── utils.ts          # Utility functions
├── store/                # Zustand stores
│   ├── authStore.ts      # Authentication state
│   ├── documentStore.ts  # Document state
│   └── uiStore.ts        # UI state
└── types/                # TypeScript types
    ├── document.ts       # Document types
    ├── auth.ts           # Auth types
    └── api.ts            # API types
```

## Key Features Implementation

### Authentication

The app uses JWT-based authentication with token storage in localStorage. Auth state is managed by Zustand with persistence.

### Auto-save

Documents are automatically saved 2 seconds after the last edit using the `AutoSavePlugin`.

### Real-time Collaboration

WebSocket connection is established when editing a document, broadcasting:
- Cursor positions
- Content updates
- User join/leave events

### Version History

Every document save creates a new version. Users can view and restore previous versions.

### Comments

Comments can be added to documents with optional position/selection information.

## API Integration

All API calls go through the API client (`src/lib/api/client.ts`) which handles:
- Authentication tokens
- Request/response interceptors
- Error handling
- Token refresh

## Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow the component naming conventions
4. Add appropriate error handling
5. Test thoroughly before committing

## License

Copyright (c) 2024 NEXUS Business Operating System
