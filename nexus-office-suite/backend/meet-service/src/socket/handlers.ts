import { Server, Socket } from 'socket.io';
import { types as mediasoupTypes } from 'mediasoup';
import { meetingService } from '../services/meeting.service';
import { roomService } from '../services/room.service';
import { participantRepository } from '../repositories/participant.repository';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { JWTPayload } from '../types';

interface SocketData {
  userId: string;
  userName: string;
  tenantId: string;
  meetingId?: string;
  participantId?: string;
}

export function setupSocketHandlers(io: Server): void {
  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      (socket.data as SocketData) = {
        userId: decoded.user_id,
        userName: decoded.name,
        tenantId: decoded.tenant_id,
      };

      next();
    } catch (error) {
      logger.error('Socket authentication error', { error });
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const socketData = socket.data as SocketData;
    logger.info('Client connected', { socketId: socket.id, userId: socketData.userId });

    // Join meeting room
    socket.on('join-meeting', async (data: { meetingId: string; password?: string }, callback) => {
      try {
        const { meetingId, password } = data;

        const result = await meetingService.joinMeeting(
          meetingId,
          {
            user_id: socketData.userId,
            user_name: socketData.userName,
            user_avatar: undefined,
          },
          password
        );

        // Store meeting and participant IDs in socket data
        socketData.meetingId = meetingId;
        socketData.participantId = result.participant.id;

        // Join Socket.IO room
        socket.join(meetingId);

        // Notify other participants
        socket.to(meetingId).emit('participant-joined', {
          participant: result.participant,
        });

        // Get existing participants and their producers
        const existingParticipants = await meetingService.getParticipants(meetingId, true);
        const producers = roomService.getProducers(meetingId, result.participant.id);

        callback({
          success: true,
          data: {
            meeting: result.meeting,
            participant: result.participant,
            rtpCapabilities: result.rtpCapabilities,
            existingParticipants: existingParticipants.filter(
              p => p.id !== result.participant.id
            ),
            producers,
          },
        });

        logger.info('Participant joined meeting via socket', {
          meetingId,
          participantId: result.participant.id,
        });
      } catch (error: any) {
        logger.error('Error joining meeting via socket', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Leave meeting
    socket.on('leave-meeting', async (callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await meetingService.leaveMeeting(meetingId, participantId);

        // Leave Socket.IO room
        socket.leave(meetingId);

        // Notify other participants
        socket.to(meetingId).emit('participant-left', { participantId });

        // Clear socket data
        delete socketData.meetingId;
        delete socketData.participantId;

        if (callback) {
          callback({ success: true });
        }

        logger.info('Participant left meeting via socket', { meetingId, participantId });
      } catch (error: any) {
        logger.error('Error leaving meeting via socket', { error });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Create WebRTC transport
    socket.on('create-transport', async (data: { direction: 'send' | 'recv' }, callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        const transport = await roomService.createWebRtcTransport(meetingId, participantId);

        callback({
          success: true,
          data: transport,
        });

        logger.debug('Transport created', {
          meetingId,
          participantId,
          transportId: transport.id,
          direction: data.direction,
        });
      } catch (error: any) {
        logger.error('Error creating transport', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Connect WebRTC transport
    socket.on(
      'connect-transport',
      async (
        data: { transportId: string; dtlsParameters: mediasoupTypes.DtlsParameters },
        callback
      ) => {
        try {
          const { meetingId, participantId } = socketData;
          if (!meetingId || !participantId) {
            throw new Error('Not in a meeting');
          }

          await roomService.connectWebRtcTransport(
            meetingId,
            participantId,
            data.transportId,
            data.dtlsParameters
          );

          callback({ success: true });

          logger.debug('Transport connected', {
            meetingId,
            participantId,
            transportId: data.transportId,
          });
        } catch (error: any) {
          logger.error('Error connecting transport', { error });
          callback({ success: false, error: error.message });
        }
      }
    );

    // Produce media (audio/video)
    socket.on(
      'produce',
      async (
        data: {
          transportId: string;
          kind: mediasoupTypes.MediaKind;
          rtpParameters: mediasoupTypes.RtpParameters;
          appData?: any;
        },
        callback
      ) => {
        try {
          const { meetingId, participantId } = socketData;
          if (!meetingId || !participantId) {
            throw new Error('Not in a meeting');
          }

          const producerId = await roomService.produce(
            meetingId,
            participantId,
            data.transportId,
            data.kind,
            data.rtpParameters,
            data.appData
          );

          // Notify other participants about new producer
          socket.to(meetingId).emit('new-producer', {
            participantId,
            producerId,
            kind: data.kind,
          });

          callback({ success: true, data: { producerId } });

          logger.info('Producer created via socket', {
            meetingId,
            participantId,
            producerId,
            kind: data.kind,
          });
        } catch (error: any) {
          logger.error('Error producing media', { error });
          callback({ success: false, error: error.message });
        }
      }
    );

    // Consume media from another participant
    socket.on(
      'consume',
      async (
        data: {
          transportId: string;
          producerId: string;
          rtpCapabilities: mediasoupTypes.RtpCapabilities;
        },
        callback
      ) => {
        try {
          const { meetingId, participantId } = socketData;
          if (!meetingId || !participantId) {
            throw new Error('Not in a meeting');
          }

          const consumer = await roomService.consume(
            meetingId,
            participantId,
            data.transportId,
            data.producerId,
            data.rtpCapabilities
          );

          if (!consumer) {
            callback({ success: false, error: 'Cannot consume' });
            return;
          }

          callback({ success: true, data: consumer });

          logger.debug('Consumer created via socket', {
            meetingId,
            participantId,
            consumerId: consumer.id,
            producerId: data.producerId,
          });
        } catch (error: any) {
          logger.error('Error consuming media', { error });
          callback({ success: false, error: error.message });
        }
      }
    );

    // Resume consumer
    socket.on('resume-consumer', async (data: { consumerId: string }, callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await roomService.resumeConsumer(meetingId, participantId, data.consumerId);

        callback({ success: true });

        logger.debug('Consumer resumed', { meetingId, participantId, consumerId: data.consumerId });
      } catch (error: any) {
        logger.error('Error resuming consumer', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Pause producer (mute audio/video)
    socket.on('pause-producer', async (data: { producerId: string }, callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await roomService.pauseProducer(meetingId, participantId, data.producerId);

        // Notify other participants
        socket.to(meetingId).emit('producer-paused', {
          participantId,
          producerId: data.producerId,
        });

        callback({ success: true });
      } catch (error: any) {
        logger.error('Error pausing producer', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Resume producer (unmute audio/video)
    socket.on('resume-producer', async (data: { producerId: string }, callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await roomService.resumeProducer(meetingId, participantId, data.producerId);

        // Notify other participants
        socket.to(meetingId).emit('producer-resumed', {
          participantId,
          producerId: data.producerId,
        });

        callback({ success: true });
      } catch (error: any) {
        logger.error('Error resuming producer', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Close producer (stop sharing)
    socket.on('close-producer', async (data: { producerId: string }, callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await roomService.closeProducer(meetingId, participantId, data.producerId);

        // Notify other participants
        socket.to(meetingId).emit('producer-closed', {
          participantId,
          producerId: data.producerId,
        });

        callback({ success: true });
      } catch (error: any) {
        logger.error('Error closing producer', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Toggle mute
    socket.on('toggle-mute', async (callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        const participant = await participantRepository.toggleMute(participantId);

        // Notify other participants
        socket.to(meetingId).emit('participant-updated', {
          participantId,
          updates: { is_muted: participant?.is_muted },
        });

        callback({ success: true, data: { is_muted: participant?.is_muted } });
      } catch (error: any) {
        logger.error('Error toggling mute', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Toggle video
    socket.on('toggle-video', async (callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        const participant = await participantRepository.toggleVideo(participantId);

        // Notify other participants
        socket.to(meetingId).emit('participant-updated', {
          participantId,
          updates: { is_video_on: participant?.is_video_on },
        });

        callback({ success: true, data: { is_video_on: participant?.is_video_on } });
      } catch (error: any) {
        logger.error('Error toggling video', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Toggle hand raised
    socket.on('toggle-hand', async (callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        const participant = await participantRepository.toggleHandRaised(participantId);

        // Notify other participants
        socket.to(meetingId).emit('participant-updated', {
          participantId,
          updates: { is_hand_raised: participant?.is_hand_raised },
        });

        callback({ success: true, data: { is_hand_raised: participant?.is_hand_raised } });
      } catch (error: any) {
        logger.error('Error toggling hand raised', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Send chat message
    socket.on('send-message', async (data: { message: string; type?: 'text' | 'file' }, callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await meetingService.saveChatMessage(
          meetingId,
          socketData.userId,
          socketData.userName,
          data.message,
          data.type || 'text'
        );

        // Broadcast message to all participants
        io.to(meetingId).emit('new-message', {
          sender_id: socketData.userId,
          sender_name: socketData.userName,
          message: data.message,
          type: data.type || 'text',
          timestamp: new Date(),
        });

        callback({ success: true });
      } catch (error: any) {
        logger.error('Error sending message', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Get chat history
    socket.on('get-messages', async (data: { limit?: number }, callback) => {
      try {
        const { meetingId } = socketData;
        if (!meetingId) {
          throw new Error('Not in a meeting');
        }

        const messages = await meetingService.getChatMessages(meetingId, data.limit);

        callback({ success: true, data: messages });
      } catch (error: any) {
        logger.error('Error getting messages', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Handle screen sharing
    socket.on('start-screen-share', async (callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await participantRepository.update(participantId, { is_screen_sharing: true });

        // Notify other participants
        socket.to(meetingId).emit('participant-updated', {
          participantId,
          updates: { is_screen_sharing: true },
        });

        callback({ success: true });
      } catch (error: any) {
        logger.error('Error starting screen share', { error });
        callback({ success: false, error: error.message });
      }
    });

    socket.on('stop-screen-share', async (callback) => {
      try {
        const { meetingId, participantId } = socketData;
        if (!meetingId || !participantId) {
          throw new Error('Not in a meeting');
        }

        await participantRepository.update(participantId, { is_screen_sharing: false });

        // Notify other participants
        socket.to(meetingId).emit('participant-updated', {
          participantId,
          updates: { is_screen_sharing: false },
        });

        callback({ success: true });
      } catch (error: any) {
        logger.error('Error stopping screen share', { error });
        callback({ success: false, error: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        const { meetingId, participantId, userId } = socketData;

        if (meetingId && participantId) {
          await meetingService.leaveMeeting(meetingId, participantId);

          // Notify other participants
          socket.to(meetingId).emit('participant-left', { participantId });

          logger.info('Participant disconnected', { meetingId, participantId, userId });
        }

        logger.info('Client disconnected', { socketId: socket.id, userId });
      } catch (error) {
        logger.error('Error handling disconnect', { error });
      }
    });
  });

  logger.info('Socket.IO handlers setup complete');
}
