# NEXUS Mail - Frontend Application

A modern, feature-rich email client built with Next.js 14, React 18, and TypeScript. Provides a comprehensive email experience similar to Gmail/Outlook with real-time updates and intuitive UI.

## Features

### Email Management
- **Inbox View** - Clean, organized inbox with email previews
- **Rich Text Composer** - Full-featured email composer with TipTap editor
- **Email Threading** - Conversation view for email threads
- **Drag & Drop Attachments** - Easy file attachment with drag-and-drop
- **Read/Unread Status** - Mark emails as read/unread
- **Star/Unstar** - Star important emails
- **Delete/Archive** - Move emails to trash or archive

### Organization
- **Folders** - Inbox, Sent, Drafts, Trash, Spam, Starred, Custom folders
- **Labels** - Color-coded labels for email organization
- **Search** - Full-text search with advanced filters
- **Bulk Actions** - Select multiple emails for bulk operations
- **Keyboard Shortcuts** - Efficient keyboard navigation

### Composer Features
- **Rich Text Editor** - Bold, italic, underline, lists, links, colors
- **Auto-save Drafts** - Automatic draft saving
- **CC/BCC** - Carbon copy and blind carbon copy
- **Priority Flags** - Mark emails as high/low priority
- **Scheduled Sending** - Schedule emails for later
- **Attachment Support** - Upload multiple file attachments
- **Reply/Forward** - Reply, Reply All, Forward functionality

### UI/UX
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Live email updates with React Query
- **Toast Notifications** - User-friendly notifications
- **Loading States** - Smooth loading indicators
- **Error Handling** - Graceful error messages
- **Dark Mode Ready** - Theme support (configurable)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query (formerly React Query)
- **Rich Text Editor**: TipTap
- **Form Handling**: React Hook Form
- **File Upload**: React Dropzone
- **Notifications**: React Hot Toast
- **Icons**: Heroicons
- **Date Formatting**: date-fns
- **HTML Sanitization**: DOMPurify

## Project Structure

```
mail-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── inbox/             # Inbox page
│   │   ├── compose/           # Compose page (optional)
│   │   ├── providers/         # React Query provider
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (redirects to inbox)
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   └── email/
│   │       ├── EmailList.tsx      # Email list view
│   │       ├── EmailViewer.tsx    # Email reading pane
│   │       ├── EmailComposer.tsx  # Email composer modal
│   │       ├── Sidebar.tsx        # Folder/label sidebar
│   │       └── SearchBar.tsx      # Search component
│   ├── lib/                   # Utilities and helpers
│   │   └── api/
│   │       └── emails.ts      # API client
│   ├── store/                 # Zustand state stores
│   │   └── emailStore.ts      # Email, Composer, UI stores
│   └── types/                 # TypeScript types
│       └── email.ts           # Email-related types
├── public/                    # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- NEXUS Mail backend service running

### Installation

1. **Navigate to the project directory**
```bash
cd nexus-office-suite/frontend/mail-app
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Configure environment variables**
```bash
cp .env.local.example .env.local
# Edit .env.local with your backend API URL
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
```

The application will start at http://localhost:3005

### Build for Production

```bash
npm run build
npm start
```

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8085/api/v1
```

### Backend Connection

Ensure the backend service is running and accessible at the configured API URL. The frontend communicates with the backend via REST API.

## Components

### EmailList
Displays a list of emails with:
- Email preview (sender, subject, snippet)
- Read/unread indicators
- Star buttons
- Selection checkboxes
- Labels and attachments badges
- Pagination

### EmailViewer
Displays full email content with:
- Email metadata (from, to, cc, date)
- HTML/plain text body
- Attachments list
- Action buttons (reply, forward, delete, star)
- Sanitized HTML rendering

### EmailComposer
Rich text email composer with:
- Recipient management (To, Cc, Bcc)
- Subject line
- TipTap rich text editor
- Attachment upload
- Priority selection
- Send/Save draft actions

### Sidebar
Navigation sidebar with:
- Compose button
- System folders (Inbox, Sent, etc.)
- Custom folders
- Labels
- Storage indicator

### SearchBar
Email search with:
- Full-text search
- Advanced filters
- Search suggestions

## State Management

### Zustand Stores

**EmailStore**
- Current folder
- Selected email
- Selected emails (for bulk actions)
- View mode (list/reading)
- Sort options
- Search query
- Folders and labels

**ComposerStore**
- Composer state (open/closed)
- Email fields (to, cc, bcc, subject, body)
- Attachments
- Priority
- Draft ID

**UIStore**
- Sidebar collapsed state
- Show/hide CC/BCC
- Theme preference

## API Integration

The application uses Axios for HTTP requests and React Query for data fetching and caching.

### API Client

Located in `src/lib/api/emails.ts`:
- `emailAPI` - Email operations
- `folderAPI` - Folder management
- `labelAPI` - Label management
- `attachmentAPI` - Attachment handling

### React Query

Configured with:
- 1-minute stale time
- Automatic background refetching
- Error handling
- Loading states

## Keyboard Shortcuts

- `c` - Compose new email
- `r` - Reply to selected email
- `a` - Reply all
- `f` - Forward
- `e` - Archive
- `#` - Delete
- `s` - Star/unstar
- `u` - Mark as unread
- `j/k` - Navigate up/down
- `Enter` - Open selected email
- `Esc` - Close viewer

## Responsive Design

The application is fully responsive:
- **Desktop** - Full three-column layout (sidebar, list, viewer)
- **Tablet** - Collapsible sidebar, two-column layout
- **Mobile** - Single column, stack navigation

## Performance Optimization

- **Code Splitting** - Automatic with Next.js
- **Lazy Loading** - Components loaded on demand
- **Image Optimization** - Next.js Image component
- **Data Caching** - React Query intelligent caching
- **Memoization** - React.memo for expensive components

## Security

- **XSS Protection** - DOMPurify for HTML sanitization
- **CSRF Protection** - Implemented in backend
- **Input Validation** - Client-side validation with React Hook Form
- **Secure Communication** - HTTPS in production
- **Authentication** - JWT token support (to be integrated)

## Customization

### Theming

Modify `tailwind.config.ts` to customize colors, fonts, and spacing:

```typescript
theme: {
  extend: {
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
    },
  },
},
```

### Email Templates

Customize email templates in the composer by modifying the TipTap editor configuration.

## Troubleshooting

### Common Issues

**API Connection Errors**
- Check backend service is running
- Verify API URL in `.env.local`
- Check CORS configuration in backend

**Emails Not Loading**
- Check React Query DevTools
- Verify API response format
- Check browser console for errors

**Composer Not Opening**
- Check Zustand store state
- Verify modal z-index
- Check for JavaScript errors

## Development

### Adding New Features

1. **New Component**
   - Create in `src/components/email/`
   - Export from component
   - Import in parent

2. **New API Endpoint**
   - Add to `src/lib/api/emails.ts`
   - Update TypeScript types
   - Use with React Query

3. **New State**
   - Add to appropriate Zustand store
   - Create actions
   - Use in components

### Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

### Vercel (Recommended)

```bash
vercel
```

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3005
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t nexus-mail-app .
docker run -p 3005:3005 nexus-mail-app
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Part of the NEXUS Office Suite platform.

## Support

For issues and questions, please refer to the main NEXUS platform documentation.
