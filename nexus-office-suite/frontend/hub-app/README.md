# NEXUS Hub - Unified Portal

A modern, unified portal that serves as the central dashboard for all NEXUS services. Built with Next.js 14, React 18, TypeScript, and Tailwind CSS.

## Features

### Dashboard
- **App Launcher Grid**: Quick access to all NEXUS applications
- **Recent Activity Feed**: Real-time updates from all services
- **Quick Actions**: One-click shortcuts to create documents, meetings, and more
- **Recent Items**: Quick access to recently accessed files and documents

### Universal Search
- Search across all NEXUS services simultaneously
- Categorized results by type (documents, spreadsheets, presentations, files, meetings)
- Real-time search with debouncing
- Quick preview and navigation
- Keyboard shortcuts (⌘K or Ctrl+K)

### Notification Center
- Unified notifications from all services
- Real-time updates via WebSocket
- Mark as read/unread
- Priority indicators
- Deep links to related items

### Application Management
- Service status monitoring
- Health checks for all services
- Grid and list view modes
- Category filtering
- Usage analytics

### User Settings
- Profile management
- Notification preferences
- Theme customization (light/dark/system)
- Font size adjustment
- Compact mode
- Language and timezone settings

## Architecture

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Real-time**: Socket.IO Client

### Project Structure

```
hub-app/
├── src/
│   ├── app/                      # Next.js 14 App Router pages
│   │   ├── page.tsx             # Dashboard (home page)
│   │   ├── apps/page.tsx        # All apps grid view
│   │   ├── search/page.tsx      # Full search page
│   │   ├── settings/page.tsx    # User settings
│   │   ├── login/page.tsx       # Login page
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   │
│   ├── components/              # React components
│   │   ├── dashboard/           # Dashboard components
│   │   │   ├── AppCard.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── search/              # Search components
│   │   │   ├── UniversalSearch.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── notifications/       # Notification components
│   │   │   ├── NotificationCenter.tsx
│   │   │   └── NotificationItem.tsx
│   │   └── layout/              # Layout components
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   │
│   ├── lib/                     # Utilities and API clients
│   │   └── api/                 # API clients
│   │       ├── client.ts        # Base API client
│   │       ├── apps.ts          # Apps API
│   │       ├── activity.ts      # Activity API
│   │       ├── search.ts        # Search API
│   │       └── notifications.ts # Notifications API
│   │
│   ├── store/                   # Zustand stores
│   │   ├── authStore.ts         # Authentication state
│   │   ├── hubStore.ts          # Hub data state
│   │   └── themeStore.ts        # Theme preferences
│   │
│   └── types/                   # TypeScript types
│       └── hub.ts               # Hub type definitions
│
├── public/                      # Static assets
├── .env.local.example          # Environment variables template
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- All NEXUS backend services running (Writer, Sheets, Slides, Drive, Meet)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and configure service URLs:
   ```env
   NEXT_PUBLIC_WRITER_API_URL=http://localhost:8091/api
   NEXT_PUBLIC_SHEETS_API_URL=http://localhost:8092/api
   NEXT_PUBLIC_SLIDES_API_URL=http://localhost:8094/api
   NEXT_PUBLIC_DRIVE_API_URL=http://localhost:8093/api
   NEXT_PUBLIC_MEET_API_URL=http://localhost:8095/api
   NEXT_PUBLIC_AUTH_API_URL=http://localhost:8080/api
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Service Integration

The Hub integrates with all NEXUS services:

### NEXUS Writer (Port 8091)
- Recent documents
- Document search
- Create new documents
- Document activity

### NEXUS Sheets (Port 8092)
- Recent spreadsheets
- Spreadsheet search
- Create new spreadsheets
- Spreadsheet activity

### NEXUS Slides (Port 8094)
- Recent presentations
- Presentation search
- Create new presentations
- Presentation activity

### NEXUS Drive (Port 8093)
- Recent files
- File search
- File uploads
- File activity

### NEXUS Meet (Port 8095)
- Recent meetings
- Meeting search
- Start/schedule meetings
- Meeting activity

## Features in Detail

### Universal Search
The Hub provides a powerful universal search feature that queries all NEXUS services simultaneously:

```typescript
// Search across all services
const results = await universalSearch("quarterly report");

// Search within a specific app
const writerResults = await searchInApp("writer", "quarterly report");
```

### Activity Feed
Real-time activity feed shows recent actions from all services:
- Document creation/editing
- File uploads
- Meeting scheduling
- Sharing and collaboration

### Notifications
Unified notification system aggregates notifications from all services:
- Mentions
- Shares
- Comments
- Meeting invites
- File uploads
- System notifications

### Theme System
Advanced theming with multiple options:
- Light/Dark/System modes
- Font size adjustment (small/medium/large)
- Compact mode for dense layouts
- Persistent preferences

## API Integration

### Authentication
The Hub uses token-based authentication with automatic refresh:

```typescript
// Login
await authStore.login(email, password);

// Auto-refresh on token expiry
// Tokens stored in localStorage
```

### Service Health Checks
Monitor the status of all services:

```typescript
const statuses = await getAllServiceStatuses();
// Returns online/offline/degraded status for each service
```

## Keyboard Shortcuts

- `⌘K` or `Ctrl+K` - Open universal search
- `Esc` - Close modals and dropdowns

## Docker Deployment

### Build Docker Image

```bash
docker build -t nexus-hub:latest .
```

### Run with Docker

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_WRITER_API_URL=http://localhost:8091/api \
  -e NEXT_PUBLIC_SHEETS_API_URL=http://localhost:8092/api \
  -e NEXT_PUBLIC_SLIDES_API_URL=http://localhost:8094/api \
  -e NEXT_PUBLIC_DRIVE_API_URL=http://localhost:8093/api \
  -e NEXT_PUBLIC_MEET_API_URL=http://localhost:8095/api \
  nexus-hub:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  nexus-hub:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_WRITER_API_URL=http://nexus-writer:8091/api
      - NEXT_PUBLIC_SHEETS_API_URL=http://nexus-sheets:8092/api
      - NEXT_PUBLIC_SLIDES_API_URL=http://nexus-slides:8094/api
      - NEXT_PUBLIC_DRIVE_API_URL=http://nexus-drive:8093/api
      - NEXT_PUBLIC_MEET_API_URL=http://nexus-meet:8095/api
    depends_on:
      - nexus-writer
      - nexus-sheets
      - nexus-slides
      - nexus-drive
      - nexus-meet
```

## Development

### Code Structure
- Components follow a functional, hooks-based pattern
- State management uses Zustand for simplicity
- Type-safe API calls with TypeScript
- Responsive design with Tailwind CSS

### Adding a New Service

1. **Add service configuration** in `src/lib/api/apps.ts`:
   ```typescript
   {
     id: 'newservice',
     name: 'NEXUS NewService',
     description: 'Description',
     icon: 'IconName',
     color: '#color',
     url: 'http://localhost:port',
     apiUrl: 'http://localhost:port/api',
     category: 'productivity',
     features: ['Feature 1', 'Feature 2']
   }
   ```

2. **Add API client** in `src/lib/api/client.ts`

3. **Add activity fetcher** in `src/lib/api/activity.ts`

4. **Add search function** in `src/lib/api/search.ts`

5. **Add notification fetcher** in `src/lib/api/notifications.ts`

## Performance

- Lazy loading for app cards
- Debounced search (300ms)
- Virtualized lists for large datasets
- Optimistic UI updates
- Service worker for offline support (coming soon)

## Security

- Token-based authentication
- Automatic token refresh
- CORS protection
- XSS protection
- CSRF protection
- Secure headers

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

See main NEXUS repository for contribution guidelines.

## License

Proprietary - NEXUS Office Suite

## Support

For issues and questions, please contact the NEXUS development team.

---

**NEXUS Hub** - Your Unified Workspace
