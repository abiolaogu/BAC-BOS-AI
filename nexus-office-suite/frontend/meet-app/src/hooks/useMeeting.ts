import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMeetingStore } from '@/store/meetingStore';
import { useChatStore } from '@/store/chatStore';
import { getSocketClient } from '@/lib/socket/client';
import { getMediasoupClient } from '@/lib/webrtc/client';
import { getUserMedia, getDisplayMedia, stopMediaStream } from '@/utils/media';
import { meetingsAPI } from '@/lib/api/meetings';
import toast from 'react-hot-toast';
import type { ChatMessage, Participant } from '@/types/meeting';

export function useMeeting(meetingId: string) {
  const router = useRouter();
  const socketClient = useRef(getSocketClient());
  const mediasoupClient = useRef(getMediasoupClient());

  const {
    setCurrentMeeting,
    setCurrentParticipant,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setLocalStream,
    setLocalAudioTrack,
    setLocalVideoTrack,
    setLocalScreenTrack,
    addRemoteStream,
    removeRemoteStream,
    setConnecting,
    setConnected,
    setConnectionError,
    reset,
    isMuted,
    isVideoOn,
    isScreenSharing,
  } = useMeetingStore();

  const { addMessage, incrementUnread, isChatPanelOpen } = useChatStore();

  // Initialize local media
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await getUserMedia({
        audio: true,
        video: true,
      });

      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      setLocalStream(stream);
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // Initially mute based on meeting settings
      audioTrack.enabled = !isMuted;
      videoTrack.enabled = isVideoOn;

      return { audioTrack, videoTrack };
    } catch (error) {
      console.error('Failed to initialize media:', error);
      toast.error('Failed to access camera/microphone');
      throw error;
    }
  }, [setLocalStream, setLocalAudioTrack, setLocalVideoTrack, isMuted, isVideoOn]);

  // Join meeting
  const joinMeeting = useCallback(async (name: string, email: string) => {
    try {
      setConnecting(true);
      setConnectionError(null);

      // Get meeting details
      const meeting = await meetingsAPI.getMeeting(meetingId);
      setCurrentMeeting(meeting);

      // Initialize local media
      const { audioTrack, videoTrack } = await initializeMedia();

      // Connect to socket
      await socketClient.current.connect();

      // Join meeting via socket
      socketClient.current.joinMeeting(meetingId, name, email);

      // Setup socket event listeners
      setupSocketListeners();

      // Initialize mediasoup
      const routerCapabilities = await meetingsAPI.getRouterCapabilities(meetingId);
      await mediasoupClient.current.init(routerCapabilities);

      // Create send transport
      const sendTransportOptions = await meetingsAPI.createTransport(meetingId, 'send');
      await mediasoupClient.current.createSendTransport(
        sendTransportOptions,
        async (dtlsParameters) => {
          await meetingsAPI.connectTransport(meetingId, sendTransportOptions.id, dtlsParameters);
        },
        async (kind, rtpParameters) => {
          const { producerId } = await meetingsAPI.createProducer(
            meetingId,
            sendTransportOptions.id,
            kind,
            rtpParameters
          );
          return producerId;
        }
      );

      // Create receive transport
      const recvTransportOptions = await meetingsAPI.createTransport(meetingId, 'recv');
      await mediasoupClient.current.createRecvTransport(
        recvTransportOptions,
        async (dtlsParameters) => {
          await meetingsAPI.connectTransport(meetingId, recvTransportOptions.id, dtlsParameters);
        }
      );

      // Produce audio and video
      await mediasoupClient.current.produceAudio(audioTrack);
      await mediasoupClient.current.produceVideo(videoTrack);

      setConnected(true);
      setConnecting(false);
      toast.success('Joined meeting successfully');
    } catch (error) {
      console.error('Failed to join meeting:', error);
      setConnectionError('Failed to join meeting');
      setConnecting(false);
      toast.error('Failed to join meeting');
      throw error;
    }
  }, [meetingId, initializeMedia, setConnecting, setConnected, setConnectionError, setCurrentMeeting]);

  // Leave meeting
  const leaveMeeting = useCallback(async () => {
    try {
      // Leave via socket
      socketClient.current.leaveMeeting(meetingId);

      // Leave via API
      await meetingsAPI.leaveMeeting(meetingId);

      // Close mediasoup client
      mediasoupClient.current.close();

      // Disconnect socket
      socketClient.current.disconnect();

      // Reset store
      reset();

      toast.success('Left meeting');
      router.push('/meetings');
    } catch (error) {
      console.error('Failed to leave meeting:', error);
      toast.error('Failed to leave meeting');
    }
  }, [meetingId, reset, router]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const audioProducers = Array.from(mediasoupClient.current['producers'].values()).filter(
      (p) => p.track?.kind === 'audio'
    );

    audioProducers.forEach((producer) => {
      if (isMuted) {
        producer.resume();
      } else {
        producer.pause();
      }
    });

    socketClient.current.toggleAudio(!isMuted);
  }, [isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const videoProducers = Array.from(mediasoupClient.current['producers'].values()).filter(
      (p) => p.track?.kind === 'video'
    );

    videoProducers.forEach((producer) => {
      if (isVideoOn) {
        producer.pause();
      } else {
        producer.resume();
      }
    });

    socketClient.current.toggleVideo(!isVideoOn);
  }, [isVideoOn]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await getDisplayMedia();
      const screenTrack = stream.getVideoTracks()[0];

      setLocalScreenTrack(screenTrack);

      // Produce screen share
      await mediasoupClient.current.produceScreen(screenTrack);

      socketClient.current.startScreenShare();

      // Handle track ended (user stops sharing)
      screenTrack.onended = () => {
        stopScreenShare();
      };

      toast.success('Screen sharing started');
    } catch (error) {
      console.error('Failed to start screen share:', error);
      toast.error('Failed to start screen sharing');
    }
  }, [setLocalScreenTrack]);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    const screenProducers = Array.from(mediasoupClient.current['producers'].values()).filter(
      (p) => p.appData?.mediaType === 'screen'
    );

    screenProducers.forEach((producer) => {
      mediasoupClient.current.closeProducer(producer.id);
    });

    socketClient.current.stopScreenShare();
    setLocalScreenTrack(null);

    toast.success('Screen sharing stopped');
  }, [setLocalScreenTrack]);

  // Send chat message
  const sendMessage = useCallback((message: string, recipientId?: string) => {
    const chatMessage: Partial<ChatMessage> = {
      message,
      type: 'text',
      recipientId,
      isPrivate: !!recipientId,
    };

    socketClient.current.sendMessage(chatMessage);
  }, []);

  // Setup socket event listeners
  const setupSocketListeners = useCallback(() => {
    const socket = socketClient.current;

    socket.on('participant-joined', (participant: Participant) => {
      addParticipant(participant);
      toast.success(`${participant.name} joined`);
    });

    socket.on('participant-left', ({ participantId }: { participantId: string }) => {
      const participants = useMeetingStore.getState().participants;
      const participant = participants.find((p) => p.id === participantId);
      if (participant) {
        removeParticipant(participantId);
        toast.info(`${participant.name} left`);
      }
    });

    socket.on('participant-updated', (participant: Participant) => {
      updateParticipant(participant.id, participant);
    });

    socket.on('new-message', (message: ChatMessage) => {
      addMessage(message);
      if (!isChatPanelOpen) {
        incrementUnread();
      }
    });

    socket.on('meeting-ended', () => {
      toast.info('Meeting has ended');
      leaveMeeting();
    });

    socket.on('new-producer', async ({ producerId, participantId, kind }) => {
      try {
        // Consume the new producer
        const rtpCapabilities = mediasoupClient.current.getRtpCapabilities();
        const consumerData = await meetingsAPI.createConsumer(
          meetingId,
          'recv-transport-id', // This should come from state
          producerId,
          rtpCapabilities
        );

        const consumer = await mediasoupClient.current.consume(
          producerId,
          consumerData.id,
          kind,
          consumerData.rtpParameters,
          { participantId }
        );

        const stream = new MediaStream([consumer.track]);
        addRemoteStream(participantId, stream, kind);
      } catch (error) {
        console.error('Failed to consume producer:', error);
      }
    });

    socket.on('producer-closed', ({ producerId, participantId }) => {
      removeRemoteStream(participantId);
    });

    socket.on('error', ({ message }: { message: string }) => {
      toast.error(message);
    });
  }, [
    meetingId,
    addParticipant,
    removeParticipant,
    updateParticipant,
    addMessage,
    incrementUnread,
    isChatPanelOpen,
    addRemoteStream,
    removeRemoteStream,
    leaveMeeting,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mediasoupClient.current.close();
      socketClient.current.disconnect();
    };
  }, []);

  return {
    joinMeeting,
    leaveMeeting,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendMessage,
  };
}
