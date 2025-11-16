export interface User {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  avatar?: string;
}

export interface Meeting {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  host_id: string;
  scheduled_start?: Date;
  scheduled_end?: Date;
  status: 'scheduled' | 'active' | 'ended';
  recording_enabled: boolean;
  is_public: boolean;
  max_participants: number;
  password?: string;
  lobby_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  role: 'host' | 'co-host' | 'participant';
  is_muted: boolean;
  is_video_on: boolean;
  is_screen_sharing: boolean;
  is_hand_raised: boolean;
  joined_at: Date;
  left_at?: Date;
}

export interface ChatMessage {
  id: string;
  meeting_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  type: 'text' | 'file' | 'system';
  timestamp: Date;
}

export interface Recording {
  id: string;
  meeting_id: string;
  file_url: string;
  duration: number;
  size: number;
  format: string;
  started_at: Date;
  ended_at: Date;
  created_at: Date;
}

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  signal: any;
}

export interface Room {
  id: string;
  meeting: Meeting;
  participants: Map<string, Participant>;
  router: any; // mediasoup Router
  transports: Map<string, any>; // mediasoup Transports
  producers: Map<string, any>; // mediasoup Producers
  consumers: Map<string, any>; // mediasoup Consumers
}

export interface MeetingStats {
  meeting_id: string;
  participant_count: number;
  duration: number;
  avg_bitrate: number;
  packet_loss: number;
  jitter: number;
  timestamp: Date;
}

export interface JWTPayload {
  user_id: string;
  email: string;
  name: string;
  tenant_id: string;
  iat: number;
  exp: number;
}

export interface Config {
  server: {
    port: number;
    host: string;
    cors_origins: string[];
  };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expiry: string;
  };
  mediasoup: {
    worker: {
      rtcMinPort: number;
      rtcMaxPort: number;
      logLevel: string;
      logTags: string[];
    };
    router: {
      mediaCodecs: any[];
    };
    webRtcTransport: {
      listenIps: any[];
      enableUdp: boolean;
      enableTcp: boolean;
      preferUdp: boolean;
      initialAvailableOutgoingBitrate: number;
    };
  };
  recording: {
    enabled: boolean;
    storage_path: string;
    max_duration: number;
  };
}
