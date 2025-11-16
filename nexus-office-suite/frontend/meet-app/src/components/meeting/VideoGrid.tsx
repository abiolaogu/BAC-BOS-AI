'use client';

import React from 'react';
import { useMeetingStore } from '@/store/meetingStore';
import VideoTile from './VideoTile';

export default function VideoGrid() {
  const { participants, currentParticipant, pinnedParticipantId, spotlightedParticipantId } = useMeetingStore();

  // Calculate grid layout based on participant count
  const getGridLayout = (count: number): string => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    if (count <= 12) return 'grid-cols-4 grid-rows-3';
    return 'grid-cols-4 grid-rows-4';
  };

  // Include current participant in the list
  const allParticipants = currentParticipant
    ? [currentParticipant, ...participants.filter(p => p.id !== currentParticipant.id)]
    : participants;

  // Handle pinned or spotlighted participants
  const displayParticipants = React.useMemo(() => {
    if (pinnedParticipantId) {
      const pinned = allParticipants.find(p => p.id === pinnedParticipantId);
      const others = allParticipants.filter(p => p.id !== pinnedParticipantId);
      return pinned ? [pinned, ...others] : allParticipants;
    }
    if (spotlightedParticipantId) {
      const spotlighted = allParticipants.find(p => p.id === spotlightedParticipantId);
      return spotlighted ? [spotlighted] : allParticipants;
    }
    return allParticipants;
  }, [allParticipants, pinnedParticipantId, spotlightedParticipantId]);

  const gridLayout = spotlightedParticipantId
    ? 'grid-cols-1'
    : getGridLayout(displayParticipants.length);

  if (displayParticipants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Waiting for participants to join...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gridLayout} gap-2 h-full w-full p-4 bg-gray-900 overflow-auto`}>
      {displayParticipants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          isLocal={participant.id === currentParticipant?.id}
          isPinned={participant.id === pinnedParticipantId}
          isSpotlighted={participant.id === spotlightedParticipantId}
        />
      ))}
    </div>
  );
}
