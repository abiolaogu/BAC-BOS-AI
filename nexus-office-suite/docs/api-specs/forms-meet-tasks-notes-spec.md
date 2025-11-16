# NEXUS Forms, Meet, Tasks, Notes API Specifications

## NEXUS Forms API (Port 8097)

### Overview
Form builder and response collection similar to Google Forms and Typeform.

### Data Models

```typescript
interface Form {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  isPublished: boolean;
  responseCount: number;
}

interface FormField {
  id: string;
  type: 'short_text' | 'long_text' | 'email' | 'phone' | 'number' |
        'dropdown' | 'multiple_choice' | 'checkboxes' | 'date' |
        'time' | 'file_upload' | 'rating' | 'scale' | 'matrix';
  label: string;
  description?: string;
  required: boolean;
  position: number;
  validation?: FieldValidation;
  options?: string[];            // For dropdown, multiple_choice, etc.
  properties?: Record<string, any>;
}

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;              // Regex pattern
  errorMessage?: string;
}

interface FormSettings {
  allowMultipleResponses: boolean;
  requireLogin: boolean;
  showProgressBar: boolean;
  shuffleQuestions: boolean;
  collectEmail: boolean;
  confirmationMessage: string;
  redirectUrl?: string;
  notifyOnResponse: boolean;
  notificationEmails: string[];
  theme: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
}

interface FormResponse {
  id: string;
  formId: string;
  answers: FormAnswer[];
  submittedBy?: string;          // User ID if logged in
  submittedAt: string;
  ipAddress?: string;
}

interface FormAnswer {
  fieldId: string;
  value: any;                    // String, number, array, etc.
  fileUrls?: string[];           // For file uploads
}
```

### Key Endpoints

**Forms**
- `POST /forms` - Create form
- `GET /forms/:id` - Get form
- `PUT /forms/:id` - Update form
- `DELETE /forms/:id` - Delete form
- `GET /forms` - List forms
- `POST /forms/:id/publish` - Publish form
- `POST /forms/:id/unpublish` - Unpublish form
- `POST /forms/:id/duplicate` - Duplicate form

**Responses**
- `POST /forms/:id/responses` - Submit response (public endpoint)
- `GET /forms/:id/responses` - Get all responses (requires auth)
- `GET /responses/:id` - Get single response
- `DELETE /responses/:id` - Delete response
- `GET /forms/:id/responses/export?format=csv|xlsx` - Export responses

**Analytics**
- `GET /forms/:id/analytics` - Get form analytics
  ```json
  {
    "totalResponses": 150,
    "averageCompletionTime": 180,
    "completionRate": 0.85,
    "fieldStats": {
      "field-1": {
        "totalAnswers": 145,
        "uniqueAnswers": 50,
        "averageValue": 4.2,
        "distribution": {
          "option1": 30,
          "option2": 65,
          "option3": 50
        }
      }
    }
  }
  ```

**Templates**
- `GET /forms/templates` - List form templates
- `POST /forms/from-template/:templateId` - Create form from template

### Special Features

1. **Conditional Logic** - Show/hide fields based on answers
2. **Calculations** - Compute values from responses
3. **Payment Integration** - Collect payments via Stripe
4. **File Uploads** - Upload attachments
5. **Email Notifications** - Auto-send emails on submission
6. **Quiz Mode** - Create quizzes with correct answers and scoring

---

## NEXUS Meet API (Port 8098)

### Overview
Video conferencing service similar to Zoom, Google Meet, and Microsoft Teams.

### Data Models

```typescript
interface Meeting {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  hostId: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  joinUrl: string;
  password?: string;
  settings: MeetingSettings;
  participants: Participant[];
  recording?: Recording;
}

interface MeetingSettings {
  allowGuests: boolean;
  requirePassword: boolean;
  enableWaitingRoom: boolean;
  enableRecording: boolean;
  autoRecord: boolean;
  maxParticipants: number;
  muteOnEntry: boolean;
  enableChat: boolean;
  enableScreenSharing: boolean;
  enableBreakoutRooms: boolean;
}

interface Participant {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  role: 'host' | 'co-host' | 'participant';
  joinedAt: string;
  leftAt?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

interface Recording {
  id: string;
  meetingId: string;
  startTime: string;
  endTime: string;
  duration: number;              // Seconds
  fileSize: number;              // Bytes
  videoUrl: string;
  transcriptUrl?: string;
  thumbnailUrl?: string;
}

interface ChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  isPrivate: boolean;
  recipientId?: string;
}
```

### Key Endpoints

**Meetings**
- `POST /meetings` - Create/schedule meeting
- `GET /meetings/:id` - Get meeting details
- `PUT /meetings/:id` - Update meeting
- `DELETE /meetings/:id` - Cancel meeting
- `GET /meetings` - List meetings
- `POST /meetings/:id/start` - Start meeting (WebRTC signaling)
- `POST /meetings/:id/end` - End meeting
- `POST /meetings/:id/join` - Join meeting (get WebRTC credentials)

**Participants**
- `GET /meetings/:id/participants` - List participants
- `POST /meetings/:id/participants/:participantId/mute` - Mute participant
- `POST /meetings/:id/participants/:participantId/remove` - Remove participant
- `POST /meetings/:id/participants/:participantId/make-host` - Transfer host role

**Recording**
- `POST /meetings/:id/recording/start` - Start recording
- `POST /meetings/:id/recording/stop` - Stop recording
- `GET /meetings/:id/recordings` - List recordings
- `GET /recordings/:id` - Get recording
- `DELETE /recordings/:id` - Delete recording
- `GET /recordings/:id/transcript` - Get transcript

**Chat**
- `GET /meetings/:id/chat` - Get chat history
- `POST /meetings/:id/chat` - Send chat message

**Breakout Rooms**
- `POST /meetings/:id/breakout-rooms` - Create breakout rooms
- `POST /meetings/:id/breakout-rooms/:roomId/assign` - Assign participants

### WebRTC Signaling

**WebSocket:** `ws://localhost:8098/ws/meetings/:meetingId`

**Events:**
```json
// Join meeting
{
  "type": "join",
  "token": "jwt-token"
}

// Offer/Answer/ICE (WebRTC)
{
  "type": "offer",
  "sdp": "..."
}

{
  "type": "answer",
  "sdp": "..."
}

{
  "type": "ice-candidate",
  "candidate": "..."
}

// Media controls
{
  "type": "mute",
  "audio": true
}

{
  "type": "video",
  "enabled": false
}
```

### Special Features

1. **Screen Sharing** - Share entire screen or specific window
2. **Virtual Backgrounds** - AI-powered background replacement
3. **Noise Cancellation** - AI noise suppression
4. **Live Transcription** - Real-time speech-to-text
5. **Polls** - Create in-meeting polls
6. **Whiteboard** - Collaborative whiteboard
7. **Reactions** - Emoji reactions during meeting

---

## NEXUS Tasks API (Port 8099)

### Overview
Task and project management similar to Asana, Trello, and Microsoft Planner.

### Data Models

```typescript
interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  ownerId: string;
  members: ProjectMember[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

interface ProjectSettings {
  defaultView: 'list' | 'board' | 'calendar' | 'timeline';
  taskNumberPrefix: string;      // e.g., "PROJ-"
  autoAssignTasks: boolean;
}

interface Task {
  id: string;
  projectId: string;
  taskNumber: string;            // e.g., "PROJ-123"
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  createdBy: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: string[];
  subtasks: Subtask[];
  dependencies: string[];        // Task IDs this task depends on
  position: number;              // For ordering
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

interface TaskList {
  id: string;
  projectId: string;
  name: string;
  position: number;
  tasks: Task[];
}
```

### Key Endpoints

**Projects**
- `POST /projects` - Create project
- `GET /projects/:id` - Get project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `GET /projects` - List projects
- `POST /projects/:id/members` - Add member
- `DELETE /projects/:id/members/:userId` - Remove member

**Tasks**
- `POST /projects/:projectId/tasks` - Create task
- `GET /tasks/:id` - Get task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `GET /projects/:projectId/tasks` - List tasks (with filters)
- `POST /tasks/:id/assign` - Assign task
- `POST /tasks/:id/move` - Move to different status/list
- `POST /tasks/:id/duplicate` - Duplicate task

**Subtasks**
- `POST /tasks/:taskId/subtasks` - Add subtask
- `PUT /subtasks/:id` - Update subtask
- `POST /subtasks/:id/complete` - Mark subtask complete

**Comments**
- `POST /tasks/:taskId/comments` - Add comment
- `GET /tasks/:taskId/comments` - Get comments
- `PUT /comments/:id` - Edit comment
- `DELETE /comments/:id` - Delete comment

**Views**
- `GET /projects/:projectId/board` - Kanban board view
- `GET /projects/:projectId/list` - List view
- `GET /projects/:projectId/calendar` - Calendar view
- `GET /projects/:projectId/timeline` - Gantt chart view

**Time Tracking**
- `POST /tasks/:taskId/time-entries` - Log time
- `GET /tasks/:taskId/time-entries` - Get time entries
- `GET /projects/:projectId/time-report` - Time report

### Special Features

1. **Custom Fields** - Add custom fields to tasks
2. **Templates** - Project and task templates
3. **Recurring Tasks** - Auto-create tasks on schedule
4. **Task Dependencies** - Block tasks based on dependencies
5. **Notifications** - Email/push notifications for updates
6. **Automations** - Auto-assign, auto-status based on rules
7. **Sprint Planning** - Agile sprint management

---

## NEXUS Notes API (Port 8100)

### Overview
Note-taking application similar to OneNote, Evernote, and Notion.

### Data Models

```typescript
interface Notebook {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  icon?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: NoteContent;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastViewedAt?: string;
}

interface NoteContent {
  type: 'doc';
  content: ContentBlock[];
}

interface ContentBlock {
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' |
        'codeBlock' | 'blockquote' | 'image' | 'table' |
        'checkbox' | 'divider' | 'embed';
  attrs?: Record<string, any>;
  content?: ContentBlock[];
  text?: string;
  marks?: TextMark[];
}

interface TextMark {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' |
        'code' | 'link' | 'highlight' | 'textColor';
  attrs?: Record<string, any>;
}
```

### Key Endpoints

**Notebooks**
- `POST /notebooks` - Create notebook
- `GET /notebooks/:id` - Get notebook
- `PUT /notebooks/:id` - Update notebook
- `DELETE /notebooks/:id` - Delete notebook
- `GET /notebooks` - List notebooks

**Notes**
- `POST /notebooks/:notebookId/notes` - Create note
- `GET /notes/:id` - Get note
- `PUT /notes/:id` - Update note
- `DELETE /notes/:id` - Delete note (soft delete)
- `GET /notebooks/:notebookId/notes` - List notes
- `POST /notes/:id/duplicate` - Duplicate note
- `POST /notes/:id/move` - Move to different notebook

**Organization**
- `POST /notes/:id/pin` - Pin note
- `POST /notes/:id/favorite` - Mark as favorite
- `POST /notes/:id/archive` - Archive note
- `POST /notes/:id/tags` - Add tags
- `GET /notes/pinned` - Get pinned notes
- `GET /notes/favorites` - Get favorite notes

**Search**
- `GET /search?q=query&notebook=id&tags=tag1,tag2`

**Sharing**
- `POST /notes/:id/share` - Share note
- `GET /notes/:id/shares` - List shares

**Export**
- `GET /notes/:id/export/:format` - Export (pdf, markdown, html)

### Special Features

1. **Rich Media** - Embed images, videos, audio
2. **Web Clipper** - Save web pages as notes
3. **OCR** - Extract text from images
4. **Handwriting** - Digital ink support
5. **Templates** - Note templates
6. **Linking** - Link notes together
7. **Version History** - View note history
8. **Encryption** - Encrypt sensitive notes

---

## Common Features Across All Services

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

### Pagination
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```

### Error Responses
```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

### Webhooks
Subscribe to events across all services:

```json
POST /webhooks

{
  "url": "https://your-app.com/webhook",
  "events": [
    "form.response.created",
    "meeting.started",
    "task.completed",
    "note.created"
  ],
  "secret": "webhook-secret"
}
```

### Rate Limiting
- **Default:** 1000 requests/hour per user
- **Headers:**
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

**Version:** 1.0
**Last Updated:** 2025-11-14
