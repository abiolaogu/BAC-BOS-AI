'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import VideoGrid from '@/components/meeting/VideoGrid';
import ControlBar from '@/components/meeting/ControlBar';
import ChatPanel from '@/components/meeting/ChatPanel';
import ParticipantsPanel from '@/components/meeting/ParticipantsPanel';
import { useMeetingStore } from '@/store/meetingStore';
import { useChatStore } from '@/store/chatStore';
import { useMeeting } from '@/hooks/useMeeting';
import toast from 'react-hot-toast';

export default function MeetingRoomPage() {
  const params = useParams();
  const meetingId = params.id as string;

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const {
    isChatPanelOpen,
    isParticipantsPanelOpen,
    currentMeeting,
    currentParticipant,
    isConnected,
    toggleChatPanel,
    toggleParticipantsPanel,
  } = useMeetingStore();

  const { markAsRead } = useChatStore();

  const {
    joinMeeting,
    leaveMeeting,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendMessage,
  } = useMeeting(meetingId);

  const { isMuted, isVideoOn, isScreenSharing } = useMeetingStore();

  useEffect(() => {
    // Mark chat as read when panel is opened
    if (isChatPanelOpen) {
      markAsRead();
    }
  }, [isChatPanelOpen, markAsRead]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      toast.error('Please enter your name and email');
      return;
    }

    setIsJoining(true);
    try {
      await joinMeeting(userName, userEmail);
      setHasJoined(true);
    } catch (error) {
      console.error('Failed to join meeting:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave this meeting?')) {
      await leaveMeeting();
    }
  };

  const handleEndForAll = async () => {
    if (confirm('Are you sure you want to end this meeting for everyone?')) {
      await leaveMeeting();
      toast.success('Meeting ended for all participants');
    }
  };

  const handleToggleAudio = () => {
    toggleAudio();
    useMeetingStore.getState().toggleMute();
  };

  const handleToggleVideo = () => {
    toggleVideo();
    useMeetingStore.getState().toggleVideo();
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      useMeetingStore.getState().toggleScreenShare();
    } else {
      await startScreenShare();
      useMeetingStore.getState().toggleScreenShare();
    }
  };

  const isHost = currentParticipant?.role === 'host';

  // Join form
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-white mb-2">Join Meeting</h2>
          <p className="text-gray-400 mb-8">
            {currentMeeting ? currentMeeting.title : 'Enter your details to join'}
          </p>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john@example.com"
              />
            </div>

            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">Microphone</span>
                <button
                  type="button"
                  onClick={() => useMeetingStore.getState().toggleMute()}
                  className={`px-3 py-1 rounded ${
                    isMuted ? 'bg-red-600' : 'bg-green-600'
                  } text-white text-sm`}
                >
                  {isMuted ? 'Muted' : 'Unmuted'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Camera</span>
                <button
                  type="button"
                  onClick={() => useMeetingStore.getState().toggleVideo()}
                  className={`px-3 py-1 rounded ${
                    isVideoOn ? 'bg-green-600' : 'bg-red-600'
                  } text-white text-sm`}
                >
                  {isVideoOn ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isJoining ? 'Joining...' : 'Join Meeting'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Meeting room
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Main video area */}
      <div className="flex-1 relative overflow-hidden">
        <VideoGrid />

        {/* Chat panel */}
        {isChatPanelOpen && (
          <ChatPanel onSendMessage={sendMessage} onClose={toggleChatPanel} />
        )}

        {/* Participants panel */}
        {isParticipantsPanelOpen && (
          <ParticipantsPanel
            onClose={toggleParticipantsPanel}
            isHost={isHost}
            onMuteParticipant={(participantId) => {
              // TODO: Implement mute participant
              toast.info('Mute participant feature coming soon');
            }}
            onRemoveParticipant={(participantId) => {
              // TODO: Implement remove participant
              toast.info('Remove participant feature coming soon');
            }}
          />
        )}

        {/* Connection status */}
        {!isConnected && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-2 rounded-lg">
            Connecting...
          </div>
        )}
      </div>

      {/* Control bar */}
      <ControlBar onLeave={handleLeave} onEndForAll={handleEndForAll} isHost={isHost} />
    </div>
  );
}
