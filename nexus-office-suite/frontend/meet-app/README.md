# NEXUS Meet - Video Conferencing Application

A professional video conferencing application built with Next.js 14, React 18, TypeScript, and WebRTC (mediasoup).

## Features

### Core Video Conferencing
- **HD Video & Audio**: High-quality video and audio streaming using WebRTC
- **Screen Sharing**: Share your screen with participants
- **Real-time Chat**: Send text messages to all participants or privately
- **Participant Management**: View all participants, their status, and controls
- **Responsive Grid Layout**: Automatic layout adjustment based on participant count
- **Pin & Spotlight**: Pin or spotlight specific participants

### Meeting Controls
- **Mute/Unmute Audio**: Toggle microphone on/off
- **Start/Stop Video**: Toggle camera on/off
- **Screen Sharing**: Share your screen with participants
- **Raise Hand**: Signal to other participants
- **Leave/End Meeting**: Leave meeting or end it for all (host only)

### User Interface
- **Clean, Modern Design**: Dark theme with smooth animations
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Real-time Status**: See participant audio/video status in real-time
- **Connection Quality**: Visual indicators for connection status
- **Notifications**: Toast notifications for important events

### Host Controls
- **Mute Participants**: Host can mute individual or all participants
- **Remove Participants**: Host can remove participants from the meeting
- **End Meeting**: Host can end the meeting for everyone

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **React 18**: Latest React with concurrent features
- **TypeScript**: Type-safe code
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management

### WebRTC
- **mediasoup-client**: WebRTC client library
- **Socket.IO Client**: Real-time bidirectional communication
- **getUserMedia API**: Access camera and microphone
- **getDisplayMedia API**: Screen sharing

### Additional Libraries
- **Lucide React**: Icon library
- **date-fns**: Date formatting
- **React Hot Toast**: Toast notifications
- **Axios**: HTTP client

## Architecture

### Directory Structure
```
meet-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── meeting/[id]/       # Meeting room page
│   │   ├── meetings/           # Meetings list page
│   │   ├── login/              # Login page
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   └── meeting/            # Meeting-specific components
│   │       ├── VideoGrid.tsx   # Video grid layout
│   │       ├── VideoTile.tsx   # Individual video tile
│   │       ├── ControlBar.tsx  # Meeting controls
│   │       ├── ChatPanel.tsx   # Chat side panel
│   │       └── ParticipantsPanel.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useMediaDevices.ts  # Media device management
│   │   └── useMeeting.ts       # Meeting logic
│   ├── lib/                    # Library code
│   │   ├── api/                # API client
│   │   ├── socket/             # Socket.IO client
│   │   └── webrtc/             # WebRTC client
│   ├── store/                  # Zustand stores
│   │   ├── meetingStore.ts     # Meeting state
│   │   └── chatStore.ts        # Chat state
│   ├── types/                  # TypeScript types
│   │   └── meeting.ts          # Meeting types
│   └── utils/                  # Utility functions
│       └── media.ts            # Media utilities
├── public/                     # Static files
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind config
├── next.config.js              # Next.js config
├── Dockerfile                  # Docker configuration
└── README.md                   # This file
```

### State Management
- **Meeting Store**: Manages meeting state, participants, media tracks, and UI state
- **Chat Store**: Manages chat messages and unread count

### WebRTC Architecture
1. **Mediasoup Device**: Manages WebRTC device capabilities
2. **Send Transport**: Sends audio/video to the server
3. **Receive Transport**: Receives audio/video from other participants
4. **Producers**: Produce audio, video, and screen tracks
5. **Consumers**: Consume tracks from other participants

### Socket.IO Events
- `join-meeting`: Join a meeting
- `leave-meeting`: Leave a meeting
- `toggle-audio`: Toggle audio on/off
- `toggle-video`: Toggle video on/off
- `start-screen-share`: Start screen sharing
- `stop-screen-share`: Stop screen sharing
- `send-message`: Send chat message
- `participant-joined`: New participant joined
- `participant-left`: Participant left
- `new-message`: New chat message received

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- NEXUS Meet backend running on port 8095
- Modern browser with WebRTC support

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8095
   NEXT_PUBLIC_WS_URL=ws://localhost:8095
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3004

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

1. **Build Docker image**:
   ```bash
   docker build -t nexus-meet .
   ```

2. **Run container**:
   ```bash
   docker run -p 3004:3004 \
     -e NEXT_PUBLIC_API_URL=http://localhost:8095 \
     -e NEXT_PUBLIC_WS_URL=ws://localhost:8095 \
     nexus-meet
   ```

## Usage

### Creating a Meeting
1. Click "New Meeting" on the landing page or meetings page
2. Enter meeting details (title, description, scheduled time)
3. Click "Create" to create and join the meeting

### Joining a Meeting
1. Enter the meeting ID on the landing page
2. Click "Join" or navigate to the meeting URL
3. Enter your name and email
4. Configure audio/video settings
5. Click "Join Meeting"

### During a Meeting
- **Toggle Audio**: Click the microphone button
- **Toggle Video**: Click the video button
- **Share Screen**: Click the screen share button
- **Open Chat**: Click the chat button
- **View Participants**: Click the participants button
- **Raise Hand**: Click the hand button
- **Leave Meeting**: Click the phone button

### Host Controls
- **Mute Participant**: Click mute button next to participant
- **Remove Participant**: Click remove button next to participant
- **Mute All**: Click "Mute All" in participants panel
- **End Meeting**: Click "End for All" button

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: WebRTC features require HTTPS in production (localhost works with HTTP).

## Performance Optimization

- **Simulcast**: Multiple quality layers for adaptive streaming
- **Audio Processing**: Noise suppression and echo cancellation
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtual Scrolling**: For large participant lists

## Troubleshooting

### Camera/Microphone Access Issues
- Check browser permissions for camera and microphone
- Ensure no other application is using the devices
- Try refreshing the page

### Connection Issues
- Check if the backend server is running
- Verify WebSocket connection is allowed
- Check firewall settings

### Audio/Video Quality Issues
- Check internet connection speed
- Reduce video quality in settings
- Disable screen sharing if not needed

## Security

- **HTTPS Required**: Production deployment requires HTTPS
- **Authentication**: JWT-based authentication
- **Permission Control**: Host-only controls for sensitive actions
- **Input Validation**: All inputs validated on client and server

## Future Enhancements

- [ ] Recording functionality
- [ ] Virtual backgrounds
- [ ] Breakout rooms
- [ ] Polls and Q&A
- [ ] Live captions
- [ ] Meeting analytics
- [ ] Mobile apps (React Native)
- [ ] Browser extensions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Part of the NEXUS Office Suite.

## Support

For issues and questions, please open an issue on the repository.

---

**NEXUS Meet** - Professional Video Conferencing Made Simple
