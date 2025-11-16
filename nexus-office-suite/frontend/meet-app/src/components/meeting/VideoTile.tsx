'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Pin, Hand, Volume2 } from 'lucide-react';
import type { Participant } from '@/types/meeting';
import { useMeetingStore } from '@/store/meetingStore';

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  isPinned?: boolean;
  isSpotlighted?: boolean;
}

export default function VideoTile({ participant, isLocal, isPinned, isSpotlighted }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const { remoteStreams, localStream, setPinnedParticipant, pinnedParticipantId } = useMeetingStore();

  useEffect(() => {
    if (!videoRef.current) return;

    if (isLocal && localStream) {
      // For local participant, use local stream
      videoRef.current.srcObject = localStream;
      videoRef.current.muted = true; // Always mute local video
    } else {
      // For remote participants, find their video stream
      const videoStream = remoteStreams.find(
        (rs) => rs.participantId === participant.id && rs.kind === 'video'
      );

      if (videoStream) {
        videoRef.current.srcObject = videoStream.stream;
        videoRef.current.muted = false;
      }
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [participant.id, isLocal, localStream, remoteStreams]);

  // Audio level visualization
  useEffect(() => {
    if (isLocal || !participant.isAudioEnabled) return;

    const audioStream = remoteStreams.find(
      (rs) => rs.participantId === participant.id && rs.kind === 'audio'
    );

    if (!audioStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream.stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      setAudioLevel(average);
      requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();

    return () => {
      source.disconnect();
      audioContext.close();
    };
  }, [participant.id, participant.isAudioEnabled, isLocal, remoteStreams]);

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedParticipant(isPinned ? null : participant.id);
  };

  const initials = participant.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative bg-gray-800 rounded-lg overflow-hidden ${
        isPinned ? 'ring-4 ring-blue-500' : ''
      } ${isSpotlighted ? 'col-span-full row-span-full' : ''}`}
    >
      {/* Video element */}
      {participant.isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
          <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center">
            <span className="text-4xl font-semibold text-white">{initials}</span>
          </div>
        </div>
      )}

      {/* Overlay with participant info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Top right controls */}
      <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto">
        <button
          onClick={handlePin}
          className={`p-2 rounded-full ${
            isPinned ? 'bg-blue-500' : 'bg-black/50 hover:bg-black/70'
          } transition-colors`}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium drop-shadow-lg">
            {participant.name} {isLocal && '(You)'}
          </span>
          {participant.isHandRaised && (
            <Hand className="w-4 h-4 text-yellow-400 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Audio indicator */}
          {participant.isAudioEnabled ? (
            <div className="flex items-center gap-1 bg-green-500/80 rounded-full px-2 py-1">
              <Mic className="w-4 h-4 text-white" />
              {!isLocal && audioLevel > 30 && (
                <Volume2
                  className="w-4 h-4 text-white animate-pulse"
                  style={{ opacity: Math.min(audioLevel / 100, 1) }}
                />
              )}
            </div>
          ) : (
            <div className="bg-red-500/80 rounded-full p-1">
              <MicOff className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Video indicator */}
          {participant.isVideoEnabled ? (
            <div className="bg-green-500/80 rounded-full p-1">
              <Video className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="bg-red-500/80 rounded-full p-1">
              <VideoOff className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Screen sharing indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          Sharing screen
        </div>
      )}

      {/* Connection quality indicator */}
      {!isLocal && (
        <div className="absolute top-2 left-2 flex gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-1 h-${i * 2} bg-green-500 rounded-full`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
