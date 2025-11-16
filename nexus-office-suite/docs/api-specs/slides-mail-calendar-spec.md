# NEXUS Slides, Mail, Calendar API Specifications

## NEXUS Slides API (Port 8093)

### Overview
Presentation creation and editing similar to PowerPoint, Google Slides, and Zoho Show.

### Data Models

```typescript
interface Presentation {
  id: string;
  tenantId: string;
  title: string;
  themeId?: string;
  slides: Slide[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Slide {
  id: string;
  presentationId: string;
  position: number;
  layout: 'title' | 'title-content' | 'two-column' | 'blank' | 'title-only';
  elements: SlideElement[];
  notes?: string;
  transition?: {
    type: 'none' | 'fade' | 'slide' | 'zoom';
    duration: number;
  };
}

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'video';
  position: { x: number; y: number; width: number; height: number };
  zIndex: number;
  properties: Record<string, any>;
  rotation?: number;
}
```

### Key Endpoints

- `POST /presentations` - Create presentation
- `GET /presentations/:id` - Get presentation
- `PUT /presentations/:id` - Update presentation
- `POST /presentations/:id/slides` - Add slide
- `PUT /presentations/:id/slides/:slideId` - Update slide
- `DELETE /presentations/:id/slides/:slideId` - Delete slide
- `POST /presentations/:id/slides/:slideId/reorder` - Reorder slides
- `POST /presentations/:id/slides/:slideId/elements` - Add element
- `PUT /presentations/:id/slides/:slideId/elements/:elementId` - Update element
- `GET /presentations/:id/export/:format` - Export (pptx, pdf, images)
- `POST /presentations/import` - Import from PPTX
- `GET /themes` - List available themes
- `POST /presentations/:id/presenter-view` - Get presenter notes

### Special Features

**Animations**
```json
{
  "elementId": "element-1",
  "animation": {
    "type": "entrance",
    "effect": "fadeIn",
    "duration": 500,
    "delay": 0,
    "trigger": "click"
  }
}
```

**Collaboration**
- Real-time editing via WebSocket
- Comments on specific slides
- Presenter mode with notes

---

## NEXUS Mail API (Port 8094)

### Overview
Email client with SMTP/IMAP integration, similar to Outlook and Gmail.

### Data Models

```typescript
interface Mailbox {
  id: string;
  userId: string;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'custom';
  name: string;
  unreadCount: number;
}

interface Email {
  id: string;
  tenantId: string;
  mailboxId: string;
  messageId: string;              // RFC822 Message-ID
  threadId?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyText?: string;
  bodyHtml: string;
  attachments: EmailAttachment[];
  receivedAt: string;
  sentAt?: string;
  isRead: boolean;
  isStarred: boolean;
  isSpam: boolean;
  labels: string[];
  headers: Record<string, string>;
}

interface EmailAddress {
  email: string;
  name?: string;
}

interface EmailAttachment {
  id: string;
  emailId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  inline: boolean;
  contentId?: string;
}

interface EmailThread {
  id: string;
  subject: string;
  participants: EmailAddress[];
  messageCount: number;
  lastMessageAt: string;
  hasUnread: boolean;
}
```

### Key Endpoints

**Mailboxes**
- `GET /mail/mailboxes` - List mailboxes
- `POST /mail/mailboxes` - Create custom mailbox
- `PUT /mail/mailboxes/:id` - Update mailbox
- `DELETE /mail/mailboxes/:id` - Delete mailbox

**Emails**
- `GET /mail/emails` - List emails (with filters)
- `GET /mail/emails/:id` - Get email
- `POST /mail/emails` - Send email
- `PUT /mail/emails/:id` - Update email (mark read, star, move)
- `DELETE /mail/emails/:id` - Delete email
- `POST /mail/emails/:id/reply` - Reply to email
- `POST /mail/emails/:id/forward` - Forward email
- `POST /mail/emails/draft` - Save draft

**Attachments**
- `POST /mail/attachments` - Upload attachment
- `GET /mail/attachments/:id` - Download attachment

**Search**
- `GET /mail/search?q=query&from=user@example.com&hasAttachment=true&after=2025-01-01`

**Threads**
- `GET /mail/threads` - List email threads
- `GET /mail/threads/:id` - Get thread with all messages

**Filters & Rules**
- `POST /mail/filters` - Create email filter
  ```json
  {
    "name": "Move newsletters",
    "conditions": {
      "from": "*@newsletter.com",
      "subject": "contains:Newsletter"
    },
    "actions": {
      "moveToMailbox": "newsletters",
      "markAsRead": true,
      "addLabel": "auto-filtered"
    }
  }
  ```

**Signatures**
- `POST /mail/signatures` - Create email signature
- `GET /mail/signatures` - List signatures
- `PUT /mail/signatures/:id/default` - Set default signature

### SMTP/IMAP Integration

**Connect External Account**
```json
POST /mail/accounts

{
  "provider": "gmail" | "outlook" | "custom",
  "email": "user@gmail.com",
  "imapSettings": {
    "host": "imap.gmail.com",
    "port": 993,
    "secure": true,
    "username": "user@gmail.com",
    "password": "app-password"
  },
  "smtpSettings": {
    "host": "smtp.gmail.com",
    "port": 465,
    "secure": true,
    "username": "user@gmail.com",
    "password": "app-password"
  }
}
```

### Special Features

1. **Smart Compose** - AI-powered email composition
2. **Spam Detection** - Automatic spam filtering
3. **Email Templates** - Reusable email templates
4. **Scheduled Send** - Schedule emails for later
5. **Read Receipts** - Request read receipts
6. **Encryption** - PGP/S-MIME support

---

## NEXUS Calendar API (Port 8095)

### Overview
Event scheduling and calendar management similar to Google Calendar and Outlook Calendar.

### Data Models

```typescript
interface Calendar {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  color: string;                 // Hex color
  timeZone: string;              // IANA timezone
  isDefault: boolean;
  isPublic: boolean;
  shareUrl?: string;
}

interface Event {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;             // ISO 8601
  endTime: string;
  isAllDay: boolean;
  recurrence?: RecurrenceRule;
  attendees: Attendee[];
  reminders: Reminder[];
  conferenceData?: ConferenceData;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;              // Every X days/weeks/months
  until?: string;                // End date
  count?: number;                // Number of occurrences
  byDay?: string[];              // ['MO', 'WE', 'FR']
  byMonthDay?: number[];         // [1, 15]
  byMonth?: number[];            // [1, 6, 12]
}

interface Attendee {
  email: string;
  name?: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  isOrganizer: boolean;
  isOptional: boolean;
  responseTime?: string;
}

interface Reminder {
  method: 'email' | 'notification' | 'sms';
  minutesBefore: number;
}

interface ConferenceData {
  provider: 'nexus-meet' | 'zoom' | 'google-meet' | 'teams';
  conferenceId: string;
  joinUrl: string;
  dialIn?: {
    phone: string;
    pin: string;
  };
}
```

### Key Endpoints

**Calendars**
- `GET /calendars` - List calendars
- `POST /calendars` - Create calendar
- `GET /calendars/:id` - Get calendar
- `PUT /calendars/:id` - Update calendar
- `DELETE /calendars/:id` - Delete calendar
- `POST /calendars/:id/share` - Share calendar

**Events**
- `GET /events` - List events (with date range filter)
- `POST /events` - Create event
- `GET /events/:id` - Get event
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event (or series)
- `POST /events/:id/instances/:date` - Update single recurrence instance

**Event Responses**
- `POST /events/:id/accept` - Accept invitation
- `POST /events/:id/decline` - Decline invitation
- `POST /events/:id/tentative` - Mark as tentative

**Availability**
- `POST /availability/check` - Check availability
  ```json
  {
    "attendees": ["user1@example.com", "user2@example.com"],
    "startDate": "2025-11-15",
    "endDate": "2025-11-15",
    "duration": 60
  }
  ```
- `GET /availability/free-busy?start=2025-11-15&end=2025-11-16&users=user1,user2`

**Meeting Scheduler**
- `POST /meetings/suggest-times` - AI-powered meeting time suggestions
- `POST /meetings/schedule` - Schedule meeting with best available time

**Calendar Views**
- `GET /events/day?date=2025-11-15`
- `GET /events/week?start=2025-11-11`
- `GET /events/month?year=2025&month=11`
- `GET /events/agenda?start=2025-11-15&end=2025-11-30`

**Import/Export**
- `GET /calendars/:id/export/ical` - Export to iCalendar format
- `POST /calendars/import/ical` - Import iCalendar file

### Special Features

1. **Smart Scheduling** - AI suggests best meeting times
2. **Time Zone Support** - Automatic timezone conversion
3. **Working Hours** - Set availability windows
4. **Out of Office** - Automatic decline during OOO
5. **Meeting Rooms** - Resource booking
6. **Calendar Subscriptions** - Subscribe to external calendars (holidays, sports, etc.)
7. **Group Calendars** - Team calendars

---

## Common Patterns

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

### Error Handling
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

### Webhooks
All services support webhooks for real-time notifications:

```json
POST /webhooks

{
  "url": "https://your-app.com/webhook",
  "events": ["email.received", "event.created", "slide.updated"],
  "secret": "webhook-secret"
}
```

---

**Version:** 1.0
**Last Updated:** 2025-11-14
