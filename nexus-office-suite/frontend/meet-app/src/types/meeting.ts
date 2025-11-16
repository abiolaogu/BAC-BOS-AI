// Meeting Types matching backend API

export type MeetingStatus = 'scheduled' | 'in_progress' | 'ended';
export type ParticipantRole = 'host' | 'co_host' | 'participant';
export type ParticipantStatus = 'waiting' | 'joined' | 'left';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  status: MeetingStatus;
  scheduledTime?: string;
  startTime?: string;
  endTime?: string;
  hostId: string;
  participants: Participant[];
  settings: MeetingSettings;
  recordingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  userId: string;
  meetingId: string;
  name: string;
  email: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt?: string;
  leftAt?: string;
  // WebRTC specific
  stream?: MediaStream;
  audioLevel?: number;
  isPinned?: boolean;
  isSpotlighted?: boolean;
}

export interface MeetingSettings {
  maxParticipants: number;
  allowRecording: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  muteOnEntry: boolean;
  waitingRoom: boolean;
  requirePassword: boolean;
  password?: string;
  autoRecording: boolean;
}

export interface ChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  message: string;
  type: 'text' | 'file';
  fileUrl?: string;
  fileName?: string;
  timestamp: string;
  isPrivate?: boolean;
  recipientId?: string;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduledTime?: string;
  settings?: Partial<MeetingSettings>;
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  scheduledTime?: string;
  settings?: Partial<MeetingSettings>;
}

export interface JoinMeetingRequest {
  name: string;
  email: string;
  password?: string;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export interface MediaSettings {
  audioDeviceId?: string;
  videoDeviceId?: string;
  audioOutputDeviceId?: string;
  resolution: '720p' | '1080p' | '480p';
  frameRate: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
}

// WebRTC Transport Types
export interface TransportOptions {
  id: string;
  iceParameters: RTCIceParameters;
  iceCandidates: RTCIceCandidate[];
  dtlsParameters: RTCDtlsParameters;
}

export interface ProducerOptions {
  id: string;
  kind: 'audio' | 'video';
}

export interface ConsumerOptions {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RTCRtpParameters;
  participantId: string;
}

// Socket.IO Event Types
export interface SocketEvents {
  // Client -> Server
  'join-meeting': (data: { meetingId: string; name: string; email: string }) => void;
  'leave-meeting': (data: { meetingId: string }) => void;
  'toggle-audio': (data: { enabled: boolean }) => void;
  'toggle-video': (data: { enabled: boolean }) => void;
  'start-screen-share': () => void;
  'stop-screen-share': () => void;
  'raise-hand': (data: { raised: boolean }) => void;
  'send-message': (data: ChatMessage) => void;
  'request-transport': (data: { direction: 'send' | 'recv' }) => void;
  'connect-transport': (data: { transportId: string; dtlsParameters: RTCDtlsParameters }) => void;
  'produce': (data: { transportId: string; kind: 'audio' | 'video'; rtpParameters: RTCRtpParameters }) => void;
  'consume': (data: { transportId: string; producerId: string; rtpParameters: RTCRtpParameters }) => void;

  // Server -> Client
  'participant-joined': (data: Participant) => void;
  'participant-left': (data: { participantId: string }) => void;
  'participant-updated': (data: Participant) => void;
  'new-message': (data: ChatMessage) => void;
  'meeting-ended': (data: { meetingId: string }) => void;
  'error': (data: { message: string }) => void;
  'new-producer': (data: { producerId: string; participantId: string; kind: 'audio' | 'video' }) => void;
  'producer-closed': (data: { producerId: string; participantId: string }) => void;
}

export interface RTCStats {
  timestamp: number;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
}
