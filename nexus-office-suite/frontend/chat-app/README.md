# NEXUS Chat - Frontend Application

Modern, real-time messaging application built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

### Real-time Messaging
- **Instant Communication**: WebSocket-based real-time message delivery
- **Message Threading**: Reply to messages in organized threads
- **Rich Text Support**: Format messages with Markdown
- **File Sharing**: Drag-and-drop file uploads
- **Emoji Reactions**: Quick reactions to messages

### User Experience
- **Channel List**: Organized view of all channels with unread indicators
- **Message List**: Infinite scroll with automatic loading
- **Message Composer**: Rich text editor with auto-resize
- **Typing Indicators**: See when others are typing
- **User Presence**: Online/offline status indicators
- **Read Receipts**: Track message read status

### Channel Management
- **Direct Messages**: 1-on-1 private conversations
- **Group Channels**: Team collaboration spaces
- **Public Channels**: Open discussions
- **Private Channels**: Restricted access channels
- **Channel Search**: Quick channel discovery

### UI/UX Features
- **Dark Mode**: Automatic dark/light mode support
- **Responsive Design**: Mobile, tablet, and desktop optimized
- **Keyboard Shortcuts**: Efficient navigation
- **Smooth Animations**: Polished user experience
- **Toast Notifications**: Non-intrusive alerts

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **WebSocket**: Socket.IO Client
- **HTTP Client**: Axios
- **Data Fetching**: TanStack Query
- **Icons**: Lucide React
- **Date Formatting**: date-fns

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- NEXUS Chat backend service running

## Installation

1. **Navigate to project directory**
```bash
cd /home/user/BAC-BOS-AI/nexus-office-suite/frontend/chat-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3003/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3003
```

4. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### Development
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run type-check # Run TypeScript compiler check
```

## Project Structure

```
src/
├── app/                # Next.js app directory
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main chat page
│   └── globals.css     # Global styles
├── components/         # React components
│   ├── ChannelList.tsx
│   ├── MessageList.tsx
│   ├── MessageComposer.tsx
│   ├── UserList.tsx
│   └── TypingIndicator.tsx
├── store/             # Zustand stores
│   ├── chatStore.ts   # Chat state management
│   └── userStore.ts   # User state management
├── lib/               # Utilities and helpers
│   ├── api.ts         # API client
│   ├── socket.ts      # WebSocket client
│   └── utils.ts       # Utility functions
└── types/             # TypeScript types
    └── index.ts       # Type definitions
```

## Key Components

### ChannelList
Displays all channels with:
- Unread message indicators
- Channel search
- Channel categories (Direct, Public, Private)
- Quick channel switching

### MessageList
Shows channel messages with:
- Infinite scroll
- Message grouping by user
- Reactions and threads
- Edit and delete actions
- File attachments

### MessageComposer
Rich message input with:
- Auto-resizing textarea
- File upload support
- Emoji picker
- Keyboard shortcuts
- Typing indicators

### UserList
Shows channel members with:
- Online status indicators
- User profiles
- Direct message creation

## State Management

### Chat Store (Zustand)
Manages:
- Channels list
- Messages by channel
- Active channel
- Typing indicators
- Thread messages
- UI state (sidebar, user list)

### User Store (Zustand)
Manages:
- Current user
- Online users
- User statuses

## WebSocket Events

### Client Sends
- `authenticate` - Authenticate WebSocket connection
- `channel:join` - Join a channel
- `message:send` - Send a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `reaction:add` - Add reaction
- `message:read` - Mark as read
- `status:update` - Update status

### Client Receives
- `message:created` - New message
- `message:updated` - Message edited
- `message:deleted` - Message deleted
- `user:typing` - User typing
- `reaction:added` - Reaction added
- `status:updated` - User status changed
- `user:online` - User came online
- `user:offline` - User went offline

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `Escape` - Cancel edit/reply
- `Ctrl/Cmd + K` - Search channels

## Styling

The application uses Tailwind CSS with a custom configuration:

### Colors
- Primary: Blue (#0ea5e9)
- Gray scale: Custom gray palette
- Status colors: Green (online), Yellow (away), Red (busy), Gray (offline)

### Dark Mode
Automatic dark mode support using system preferences:
```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles */
}
```

### Custom Animations
- `slide-in-right` - Slide animations
- `fade-in` - Fade animations
- `pulse-dot` - Typing indicator animation

## API Integration

### REST API
All HTTP requests are handled through the `api` client:

```typescript
import { api } from '@/lib/api';

// Get channels
const channels = await api.getChannels();

// Send message
const message = await api.createMessage({
  channelId: 'channel-id',
  content: 'Hello!',
});
```

### WebSocket
Real-time features use the `socket` client:

```typescript
import { socket } from '@/lib/socket';

// Connect
socket.connect(token);

// Send message
socket.sendMessage({
  channelId: 'channel-id',
  content: 'Hello!',
});

// Listen for events
socket.on('message:created', (message) => {
  console.log('New message:', message);
});
```

## Performance Optimization

- **Code Splitting**: Automatic by Next.js
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Messages loaded on scroll
- **Debounced Typing**: Typing indicators throttled
- **Memoization**: React.memo for expensive components
- **Virtual Scrolling**: For large message lists

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Environment Variables
Ensure production environment variables are set:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL

### Docker
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
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### WebSocket Connection Issues
- Ensure backend is running
- Check `NEXT_PUBLIC_WS_URL` in `.env.local`
- Verify CORS settings on backend

### Messages Not Loading
- Check authentication token
- Verify API endpoint configuration
- Check browser console for errors

### Styling Issues
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`
- Check Tailwind configuration

## Contributing

1. Create a feature branch
2. Make changes
3. Run linter: `npm run lint`
4. Type check: `npm run type-check`
5. Submit pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
