import { create } from 'zustand';
import type { Meeting, Participant } from '@/types/meeting';

interface RemoteStream {
  participantId: string;
  stream: MediaStream;
  kind: 'audio' | 'video' | 'screen';
}

interface MeetingState {
  // Meeting data
  currentMeeting: Meeting | null;
  participants: Participant[];
  currentParticipant: Participant | null;

  // Local media state
  localStream: MediaStream | null;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  localScreenTrack: MediaStreamTrack | null;

  // Remote streams
  remoteStreams: RemoteStream[];

  // Media controls
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;

  // UI state
  isParticipantsPanelOpen: boolean;
  isChatPanelOpen: boolean;
  isSettingsOpen: boolean;
  pinnedParticipantId: string | null;
  spotlightedParticipantId: string | null;

  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  setCurrentMeeting: (meeting: Meeting | null) => void;
  setCurrentParticipant: (participant: Participant | null) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;

  setLocalStream: (stream: MediaStream | null) => void;
  setLocalAudioTrack: (track: MediaStreamTrack | null) => void;
  setLocalVideoTrack: (track: MediaStreamTrack | null) => void;
  setLocalScreenTrack: (track: MediaStreamTrack | null) => void;

  addRemoteStream: (participantId: string, stream: MediaStream, kind: 'audio' | 'video' | 'screen') => void;
  removeRemoteStream: (participantId: string, kind?: 'audio' | 'video' | 'screen') => void;

  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleHandRaise: () => void;

  toggleParticipantsPanel: () => void;
  toggleChatPanel: () => void;
  toggleSettings: () => void;

  setPinnedParticipant: (participantId: string | null) => void;
  setSpotlightedParticipant: (participantId: string | null) => void;

  setConnecting: (isConnecting: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  setConnectionError: (error: string | null) => void;

  reset: () => void;
}

const initialState = {
  currentMeeting: null,
  participants: [],
  currentParticipant: null,
  localStream: null,
  localAudioTrack: null,
  localVideoTrack: null,
  localScreenTrack: null,
  remoteStreams: [],
  isMuted: false,
  isVideoOn: false,
  isScreenSharing: false,
  isHandRaised: false,
  isParticipantsPanelOpen: false,
  isChatPanelOpen: false,
  isSettingsOpen: false,
  pinnedParticipantId: null,
  spotlightedParticipantId: null,
  isConnecting: false,
  isConnected: false,
  connectionError: null,
};

export const useMeetingStore = create<MeetingState>((set, get) => ({
  ...initialState,

  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),

  setCurrentParticipant: (participant) => set({ currentParticipant: participant }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (participantId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
      remoteStreams: state.remoteStreams.filter((s) => s.participantId !== participantId),
    })),

  updateParticipant: (participantId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    })),

  setLocalStream: (stream) => set({ localStream: stream }),

  setLocalAudioTrack: (track) => set({ localAudioTrack: track }),

  setLocalVideoTrack: (track) => set({ localVideoTrack: track }),

  setLocalScreenTrack: (track) => set({ localScreenTrack: track }),

  addRemoteStream: (participantId, stream, kind) =>
    set((state) => {
      // Remove existing stream of the same kind for this participant
      const filtered = state.remoteStreams.filter(
        (s) => !(s.participantId === participantId && s.kind === kind)
      );
      return {
        remoteStreams: [...filtered, { participantId, stream, kind }],
      };
    }),

  removeRemoteStream: (participantId, kind) =>
    set((state) => ({
      remoteStreams: state.remoteStreams.filter(
        (s) => s.participantId !== participantId || (kind && s.kind !== kind)
      ),
    })),

  toggleMute: () =>
    set((state) => {
      const newMuted = !state.isMuted;
      if (state.localAudioTrack) {
        state.localAudioTrack.enabled = !newMuted;
      }
      return { isMuted: newMuted };
    }),

  toggleVideo: () =>
    set((state) => {
      const newVideoOn = !state.isVideoOn;
      if (state.localVideoTrack) {
        state.localVideoTrack.enabled = newVideoOn;
      }
      return { isVideoOn: newVideoOn };
    }),

  toggleScreenShare: () =>
    set((state) => ({
      isScreenSharing: !state.isScreenSharing,
    })),

  toggleHandRaise: () =>
    set((state) => ({
      isHandRaised: !state.isHandRaised,
    })),

  toggleParticipantsPanel: () =>
    set((state) => ({
      isParticipantsPanelOpen: !state.isParticipantsPanelOpen,
    })),

  toggleChatPanel: () =>
    set((state) => ({
      isChatPanelOpen: !state.isChatPanelOpen,
    })),

  toggleSettings: () =>
    set((state) => ({
      isSettingsOpen: !state.isSettingsOpen,
    })),

  setPinnedParticipant: (participantId) =>
    set({ pinnedParticipantId: participantId }),

  setSpotlightedParticipant: (participantId) =>
    set({ spotlightedParticipantId: participantId }),

  setConnecting: (isConnecting) => set({ isConnecting }),

  setConnected: (isConnected) => set({ isConnected }),

  setConnectionError: (error) => set({ connectionError: error }),

  reset: () => {
    // Stop all local tracks
    const state = get();
    if (state.localAudioTrack) {
      state.localAudioTrack.stop();
    }
    if (state.localVideoTrack) {
      state.localVideoTrack.stop();
    }
    if (state.localScreenTrack) {
      state.localScreenTrack.stop();
    }
    if (state.localStream) {
      state.localStream.getTracks().forEach((track) => track.stop());
    }

    // Stop all remote streams
    state.remoteStreams.forEach((rs) => {
      rs.stream.getTracks().forEach((track) => track.stop());
    });

    set(initialState);
  },
}));
