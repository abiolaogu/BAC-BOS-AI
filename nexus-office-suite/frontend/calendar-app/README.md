# NEXUS Calendar App

A modern, feature-rich calendar application built with Next.js 14, TypeScript, and Tailwind CSS. Provides a comprehensive interface for managing calendars and events with support for recurring events, attendees, reminders, and more.

## Features

### Calendar Views
- **Month View** - Traditional month grid layout with events
- **Week View** - Detailed week view with time slots
- **Day View** - Single day view with hourly breakdown
- **Agenda View** - List view of upcoming events

### Event Management
- **Create Events** - Quick event creation with drag-and-drop
- **Edit Events** - Full event editing with all details
- **Delete Events** - Remove events with confirmation
- **Recurring Events** - Support for daily, weekly, monthly, yearly patterns
- **All-Day Events** - Toggle for all-day events
- **Event Colors** - Custom colors per event or inherit from calendar
- **Event Categories** - Organize events by category

### Calendar Features
- **Multiple Calendars** - Create and manage multiple calendars
- **Calendar Colors** - Color-coded calendars for easy identification
- **Calendar Visibility** - Show/hide calendars independently
- **Default Calendar** - Set a default calendar for new events
- **Shared Calendars** - View calendars shared with you

### Collaboration
- **Event Invitations** - Invite attendees to events
- **RSVP Tracking** - Track attendee responses (accepted, declined, tentative)
- **External Attendees** - Invite people outside your organization
- **Optional Attendees** - Mark attendees as optional

### Reminders & Notifications
- **Multiple Reminders** - Set multiple reminders per event
- **Reminder Methods** - Email, notification, or popup
- **Customizable Timing** - Set reminders at any time before event

### Search & Navigation
- **Event Search** - Search events by title, description, or location
- **Quick Navigation** - Jump to today, previous, or next period
- **Date Picker** - Click any date to navigate

### Integration
- **NEXUS Meet Integration** - Add meeting URLs directly to events
- **iCalendar Export** - Export calendars to .ics format
- **iCalendar Import** - Import events from .ics files
- **CalDAV Support** - Sync with external calendar clients

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Big Calendar** - Full-featured calendar component
- **React Hook Form** - Form management
- **date-fns** - Modern date utility library
- **Axios** - HTTP client
- **Lucide React** - Beautiful icons

## Project Structure

```
calendar-app/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main calendar page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── CalendarGrid.tsx   # Main calendar view
│   │   ├── EventModal.tsx     # Event create/edit modal
│   │   ├── CalendarModal.tsx  # Calendar create modal
│   │   ├── Sidebar.tsx        # Calendar list sidebar
│   │   ├── ViewSelector.tsx   # View and navigation controls
│   │   └── SearchBar.tsx      # Event search
│   ├── lib/                   # Utilities
│   │   └── api.ts            # API client
│   ├── store/                 # State management
│   │   └── calendarStore.ts  # Zustand store
│   └── types/                 # TypeScript types
│       └── index.ts          # Type definitions
├── public/                    # Static files
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind config
└── next.config.js            # Next.js config
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm
- NEXUS Calendar backend service running

### Installation

```bash
# Navigate to the calendar app directory
cd nexus-office-suite/frontend/calendar-app

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Configuration

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_CALENDAR_API_URL=http://localhost:8083
```

### Development

```bash
# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3003](http://localhost:3003) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Usage Guide

### Creating a Calendar

1. Click the **+** button next to "My Calendars" in the sidebar
2. Enter a name, description, and choose a color
3. Select your time zone
4. Optionally set as default calendar
5. Click "Create Calendar"

### Creating an Event

**Quick Create:**
1. Click the "Create Event" button in the sidebar
2. Fill in event details
3. Click "Create"

**Drag to Create:**
1. Click and drag on the calendar grid
2. Event modal opens with selected time range
3. Fill in details and save

### Managing Events

**View Event:**
- Click any event on the calendar to see details

**Edit Event:**
- Click an event and modify details in the modal
- Click "Update" to save changes

**Delete Event:**
- Open an event
- Click "Delete Event" at the bottom
- Confirm deletion

### Recurring Events

Set the recurrence rule using RRULE format:

- **Daily:** `FREQ=DAILY`
- **Weekly on Monday:** `FREQ=WEEKLY;BYDAY=MO`
- **Monthly:** `FREQ=MONTHLY`
- **Yearly:** `FREQ=YEARLY`

### Inviting Attendees

1. When creating/editing an event
2. Enter email addresses in the "Add guests" field (comma-separated)
3. Attendees will receive invitations (if email is configured)

### Setting Reminders

1. Choose minutes before event (e.g., 15, 30, 60)
2. Select reminder method (notification, email, popup)
3. Multiple reminders can be set per event (backend feature)

### Searching Events

1. Use the search bar in the header
2. Type at least 3 characters
3. Click a result to open the event

### Importing/Exporting

**Export Calendar:**
- Available through CalDAV API endpoint
- Use GET `/api/v1/caldav/calendars/{id}/export`

**Import Calendar:**
- Available through CalDAV API endpoint
- Use POST `/api/v1/caldav/calendars/{id}/import`

## Component Documentation

### CalendarGrid
Main calendar component using React Big Calendar. Supports month, week, and day views with drag-and-drop.

### EventModal
Modal for creating and editing events. Includes form validation and handles all event properties.

### CalendarModal
Modal for creating new calendars with color picker and timezone selection.

### Sidebar
Displays list of calendars with visibility toggles and quick event creation button.

### ViewSelector
Navigation controls for switching between views and moving through time.

### SearchBar
Real-time event search with dropdown results.

## State Management

The app uses Zustand for state management. The main store (`calendarStore.ts`) manages:

- Calendars list and selection
- Events list and filtering
- Current view and date
- Modal states
- Loading and error states

## API Integration

The app communicates with the NEXUS Calendar backend service through the API client (`lib/api.ts`). All requests include JWT authentication.

Key API endpoints:
- `GET /api/v1/calendars` - Fetch user calendars
- `POST /api/v1/calendars` - Create calendar
- `GET /api/v1/events` - Fetch events
- `POST /api/v1/events` - Create event
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event

## Styling

The app uses Tailwind CSS for styling with custom configurations:

- Custom calendar styles in `globals.css`
- React Big Calendar theme overrides
- Responsive design for mobile and desktop
- Custom color scheme for calendars and events

## Keyboard Shortcuts

- **n** - Create new event
- **t** - Go to today
- **←/→** - Navigate previous/next
- **Esc** - Close modal

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimization

- Code splitting with Next.js
- Lazy loading of modals
- Memoized event calculations
- Efficient re-renders with Zustand
- Optimized calendar rendering

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management in modals
- Screen reader friendly

## Development Tips

### Adding New Views

1. Add view type to `types/index.ts`
2. Update `ViewSelector` component
3. Implement view logic in `CalendarGrid`

### Custom Event Rendering

Modify the `eventStyleGetter` function in `CalendarGrid.tsx` to customize event appearance.

### Extending the API Client

Add new methods to `lib/api.ts` following the existing pattern with proper TypeScript types.

## Troubleshooting

### Events Not Showing
- Check that calendars are visible in sidebar
- Verify date range includes events
- Check browser console for errors

### Cannot Create Events
- Ensure backend service is running
- Check authentication token is valid
- Verify API URL in environment variables

### Styling Issues
- Clear browser cache
- Rebuild Tailwind: `npm run build`
- Check for CSS conflicts

## Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Offline support with service workers
- [ ] Real-time updates with WebSocket
- [ ] Event attachments
- [ ] Custom calendar templates
- [ ] Advanced recurring event UI
- [ ] Time zone conversion helper
- [ ] Conflict detection
- [ ] Calendar analytics
- [ ] Print view

## Contributing

1. Follow TypeScript best practices
2. Use Tailwind for styling
3. Write meaningful commit messages
4. Test on multiple browsers
5. Update documentation

## License

Part of the NEXUS Office Suite platform.
