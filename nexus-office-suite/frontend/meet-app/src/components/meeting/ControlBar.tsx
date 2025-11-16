'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  MessageSquare,
  Users,
  Settings,
  Phone,
  PhoneOff,
} from 'lucide-react';
import { useMeetingStore } from '@/store/meetingStore';
import { useChatStore } from '@/store/chatStore';

interface ControlBarProps {
  onLeave?: () => void;
  onEndForAll?: () => void;
  isHost?: boolean;
}

export default function ControlBar({ onLeave, onEndForAll, isHost }: ControlBarProps) {
  const router = useRouter();
  const {
    isMuted,
    isVideoOn,
    isScreenSharing,
    isHandRaised,
    isChatPanelOpen,
    isParticipantsPanelOpen,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleHandRaise,
    toggleChatPanel,
    toggleParticipantsPanel,
    toggleSettings,
  } = useMeetingStore();

  const { unreadCount } = useChatStore();

  const handleLeave = () => {
    if (onLeave) {
      onLeave();
    } else {
      router.push('/meetings');
    }
  };

  const handleEndForAll = () => {
    if (onEndForAll && confirm('Are you sure you want to end this meeting for everyone?')) {
      onEndForAll();
    }
  };

  const ControlButton = ({
    icon: Icon,
    label,
    onClick,
    active,
    danger,
    badge,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    badge?: number;
  }) => (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        className={`relative p-4 rounded-full transition-all ${
          danger
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : active
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title={label}
        aria-label={label}
      >
        <Icon className="w-6 h-6" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
      <span className="text-xs text-gray-300 mt-1">{label}</span>
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-6 py-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left section - Media controls */}
        <div className="flex items-center gap-4">
          <ControlButton
            icon={isMuted ? MicOff : Mic}
            label={isMuted ? 'Unmute' : 'Mute'}
            onClick={toggleMute}
            active={!isMuted}
            danger={isMuted}
          />
          <ControlButton
            icon={isVideoOn ? Video : VideoOff}
            label={isVideoOn ? 'Stop Video' : 'Start Video'}
            onClick={toggleVideo}
            active={isVideoOn}
            danger={!isVideoOn}
          />
          <ControlButton
            icon={isScreenSharing ? MonitorOff : Monitor}
            label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            onClick={toggleScreenShare}
            active={isScreenSharing}
          />
        </div>

        {/* Center section - Meeting controls */}
        <div className="flex items-center gap-4">
          <ControlButton
            icon={Hand}
            label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
            onClick={toggleHandRaise}
            active={isHandRaised}
          />
          <ControlButton
            icon={MessageSquare}
            label="Chat"
            onClick={toggleChatPanel}
            active={isChatPanelOpen}
            badge={unreadCount}
          />
          <ControlButton
            icon={Users}
            label="Participants"
            onClick={toggleParticipantsPanel}
            active={isParticipantsPanelOpen}
          />
          <ControlButton
            icon={Settings}
            label="Settings"
            onClick={toggleSettings}
          />
        </div>

        {/* Right section - Leave/End meeting */}
        <div className="flex items-center gap-4">
          <ControlButton
            icon={Phone}
            label="Leave"
            onClick={handleLeave}
            danger
          />
          {isHost && (
            <ControlButton
              icon={PhoneOff}
              label="End for All"
              onClick={handleEndForAll}
              danger
            />
          )}
        </div>
      </div>
    </div>
  );
}
