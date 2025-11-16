'use client';

import React, { useState } from 'react';
import { X, Search, Mic, MicOff, Video, VideoOff, Hand, UserX, Crown } from 'lucide-react';
import { useMeetingStore } from '@/store/meetingStore';
import type { Participant } from '@/types/meeting';

interface ParticipantsPanelProps {
  onClose: () => void;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  isHost?: boolean;
}

export default function ParticipantsPanel({
  onClose,
  onMuteParticipant,
  onRemoveParticipant,
  isHost,
}: ParticipantsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { participants, currentParticipant } = useMeetingStore();

  // Include current participant
  const allParticipants = currentParticipant
    ? [currentParticipant, ...participants.filter(p => p.id !== currentParticipant.id)]
    : participants;

  // Filter participants based on search
  const filteredParticipants = allParticipants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMute = (participantId: string) => {
    if (onMuteParticipant) {
      onMuteParticipant(participantId);
    }
  };

  const handleRemove = (participantId: string, name: string) => {
    if (onRemoveParticipant && confirm(`Remove ${name} from the meeting?`)) {
      onRemoveParticipant(participantId);
    }
  };

  const ParticipantItem = ({ participant }: { participant: Participant }) => {
    const isCurrentUser = participant.id === currentParticipant?.id;
    const isParticipantHost = participant.role === 'host';

    return (
      <div className="flex items-center justify-between p-3 hover:bg-gray-700 rounded-lg transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {participant.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </span>
          </div>

          {/* Name and status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-medium truncate">
                {participant.name}
                {isCurrentUser && ' (You)'}
              </p>
              {isParticipantHost && (
                <Crown className="w-4 h-4 text-yellow-400" title="Host" />
              )}
              {participant.isHandRaised && (
                <Hand className="w-4 h-4 text-yellow-400 animate-pulse" title="Hand raised" />
              )}
            </div>
            <p className="text-xs text-gray-400">{participant.email}</p>
          </div>

          {/* Media status indicators */}
          <div className="flex items-center gap-2">
            {participant.isAudioEnabled ? (
              <Mic className="w-4 h-4 text-green-400" title="Microphone on" />
            ) : (
              <MicOff className="w-4 h-4 text-red-400" title="Microphone off" />
            )}
            {participant.isVideoEnabled ? (
              <Video className="w-4 h-4 text-green-400" title="Video on" />
            ) : (
              <VideoOff className="w-4 h-4 text-red-400" title="Video off" />
            )}
          </div>
        </div>

        {/* Host controls */}
        {isHost && !isCurrentUser && (
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => handleMute(participant.id)}
              className="p-2 hover:bg-gray-600 rounded-full transition-colors"
              title="Mute participant"
              aria-label="Mute participant"
            >
              <MicOff className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleRemove(participant.id, participant.name)}
              className="p-2 hover:bg-red-600 rounded-full transition-colors"
              title="Remove participant"
              aria-label="Remove participant"
            >
              <UserX className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed right-0 top-0 bottom-20 w-80 bg-gray-800 border-l border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">
          Participants ({allParticipants.length})
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close participants panel"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search participants..."
            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Host controls */}
      {isHost && (
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => {
              if (confirm('Mute all participants?')) {
                participants.forEach((p) => {
                  if (p.id !== currentParticipant?.id && p.isAudioEnabled) {
                    handleMute(p.id);
                  }
                });
              }
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 transition-colors"
          >
            Mute All
          </button>
        </div>
      )}

      {/* Participants list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredParticipants.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>No participants found</p>
          </div>
        ) : (
          filteredParticipants.map((participant) => (
            <ParticipantItem key={participant.id} participant={participant} />
          ))
        )}
      </div>
    </div>
  );
}
