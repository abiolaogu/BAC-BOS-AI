import { types as mediasoupTypes } from 'mediasoup';
import { mediasoupService } from './mediasoup.service';
import { Meeting, Participant } from '../types';
import logger from '../utils/logger';

interface RoomParticipant {
  id: string;
  participant: Participant;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
}

interface Room {
  id: string;
  meeting: Meeting;
  router: mediasoupTypes.Router;
  participants: Map<string, RoomParticipant>;
}

class RoomService {
  private rooms: Map<string, Room> = new Map();

  async createRoom(meeting: Meeting): Promise<Room> {
    try {
      if (this.rooms.has(meeting.id)) {
        logger.warn('Room already exists', { meetingId: meeting.id });
        return this.rooms.get(meeting.id)!;
      }

      const router = await mediasoupService.createRouter();

      const room: Room = {
        id: meeting.id,
        meeting,
        router,
        participants: new Map(),
      };

      this.rooms.set(meeting.id, room);
      logger.info('Room created', { meetingId: meeting.id, routerId: router.id });

      return room;
    } catch (error) {
      logger.error('Error creating room', { meetingId: meeting.id, error });
      throw error;
    }
  }

  getRoom(meetingId: string): Room | undefined {
    return this.rooms.get(meetingId);
  }

  async deleteRoom(meetingId: string): Promise<void> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        logger.warn('Room not found for deletion', { meetingId });
        return;
      }

      // Close all transports, producers, and consumers
      for (const [, participant] of room.participants) {
        await this.removeParticipant(meetingId, participant.id);
      }

      // Close router
      room.router.close();

      this.rooms.delete(meetingId);
      logger.info('Room deleted', { meetingId });
    } catch (error) {
      logger.error('Error deleting room', { meetingId, error });
      throw error;
    }
  }

  async addParticipant(meetingId: string, participant: Participant): Promise<RoomParticipant> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      if (room.participants.has(participant.id)) {
        logger.warn('Participant already in room', { meetingId, participantId: participant.id });
        return room.participants.get(participant.id)!;
      }

      const roomParticipant: RoomParticipant = {
        id: participant.id,
        participant,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      };

      room.participants.set(participant.id, roomParticipant);
      logger.info('Participant added to room', { meetingId, participantId: participant.id });

      return roomParticipant;
    } catch (error) {
      logger.error('Error adding participant to room', { meetingId, participantId: participant.id, error });
      throw error;
    }
  }

  async removeParticipant(meetingId: string, participantId: string): Promise<void> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        logger.warn('Room not found for participant removal', { meetingId });
        return;
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        logger.warn('Participant not found in room', { meetingId, participantId });
        return;
      }

      // Close all consumers
      for (const [, consumer] of participant.consumers) {
        consumer.close();
      }

      // Close all producers
      for (const [, producer] of participant.producers) {
        producer.close();
      }

      // Close all transports
      for (const [, transport] of participant.transports) {
        transport.close();
      }

      room.participants.delete(participantId);
      logger.info('Participant removed from room', { meetingId, participantId });
    } catch (error) {
      logger.error('Error removing participant from room', { meetingId, participantId, error });
      throw error;
    }
  }

  async createWebRtcTransport(
    meetingId: string,
    participantId: string
  ): Promise<{
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
  }> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const transport = await mediasoupService.createWebRtcTransport(room.router);
      participant.transports.set(transport.id, transport);

      logger.info('WebRTC transport created', {
        meetingId,
        participantId,
        transportId: transport.id,
      });

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      logger.error('Error creating WebRTC transport', { meetingId, participantId, error });
      throw error;
    }
  }

  async connectWebRtcTransport(
    meetingId: string,
    participantId: string,
    transportId: string,
    dtlsParameters: mediasoupTypes.DtlsParameters
  ): Promise<void> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const transport = participant.transports.get(transportId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      await transport.connect({ dtlsParameters });

      logger.info('WebRTC transport connected', { meetingId, participantId, transportId });
    } catch (error) {
      logger.error('Error connecting WebRTC transport', { meetingId, participantId, transportId, error });
      throw error;
    }
  }

  async produce(
    meetingId: string,
    participantId: string,
    transportId: string,
    kind: mediasoupTypes.MediaKind,
    rtpParameters: mediasoupTypes.RtpParameters,
    appData?: any
  ): Promise<string> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const transport = participant.transports.get(transportId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { ...appData, participantId },
      });

      participant.producers.set(producer.id, producer);

      logger.info('Producer created', {
        meetingId,
        participantId,
        producerId: producer.id,
        kind,
      });

      // Notify other participants to consume this producer
      this.notifyNewProducer(meetingId, participantId, producer.id);

      return producer.id;
    } catch (error) {
      logger.error('Error creating producer', { meetingId, participantId, transportId, error });
      throw error;
    }
  }

  async consume(
    meetingId: string,
    participantId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: mediasoupTypes.RtpCapabilities
  ): Promise<{
    id: string;
    producerId: string;
    kind: mediasoupTypes.MediaKind;
    rtpParameters: mediasoupTypes.RtpParameters;
  } | null> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const transport = participant.transports.get(transportId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        logger.warn('Cannot consume producer', { meetingId, participantId, producerId });
        return null;
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Start paused, resume after client is ready
      });

      participant.consumers.set(consumer.id, consumer);

      logger.info('Consumer created', {
        meetingId,
        participantId,
        consumerId: consumer.id,
        producerId,
      });

      return {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      logger.error('Error creating consumer', { meetingId, participantId, producerId, error });
      throw error;
    }
  }

  async resumeConsumer(meetingId: string, participantId: string, consumerId: string): Promise<void> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const consumer = participant.consumers.get(consumerId);
      if (!consumer) {
        throw new Error('Consumer not found');
      }

      await consumer.resume();
      logger.debug('Consumer resumed', { meetingId, participantId, consumerId });
    } catch (error) {
      logger.error('Error resuming consumer', { meetingId, participantId, consumerId, error });
      throw error;
    }
  }

  async pauseProducer(meetingId: string, participantId: string, producerId: string): Promise<void> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const producer = participant.producers.get(producerId);
      if (!producer) {
        throw new Error('Producer not found');
      }

      await producer.pause();
      logger.debug('Producer paused', { meetingId, participantId, producerId });
    } catch (error) {
      logger.error('Error pausing producer', { meetingId, participantId, producerId, error });
      throw error;
    }
  }

  async resumeProducer(meetingId: string, participantId: string, producerId: string): Promise<void> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const producer = participant.producers.get(producerId);
      if (!producer) {
        throw new Error('Producer not found');
      }

      await producer.resume();
      logger.debug('Producer resumed', { meetingId, participantId, producerId });
    } catch (error) {
      logger.error('Error resuming producer', { meetingId, participantId, producerId, error });
      throw error;
    }
  }

  async closeProducer(meetingId: string, participantId: string, producerId: string): Promise<void> {
    try {
      const room = this.rooms.get(meetingId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(participantId);
      if (!participant) {
        throw new Error('Participant not found in room');
      }

      const producer = participant.producers.get(producerId);
      if (!producer) {
        throw new Error('Producer not found');
      }

      producer.close();
      participant.producers.delete(producerId);

      logger.info('Producer closed', { meetingId, participantId, producerId });
    } catch (error) {
      logger.error('Error closing producer', { meetingId, participantId, producerId, error });
      throw error;
    }
  }

  getRouterRtpCapabilities(meetingId: string): mediasoupTypes.RtpCapabilities | null {
    const room = this.rooms.get(meetingId);
    return room ? room.router.rtpCapabilities : null;
  }

  getParticipants(meetingId: string): RoomParticipant[] {
    const room = this.rooms.get(meetingId);
    return room ? Array.from(room.participants.values()) : [];
  }

  getProducers(meetingId: string, excludeParticipantId?: string): Array<{ participantId: string; producerId: string; kind: mediasoupTypes.MediaKind }> {
    const room = this.rooms.get(meetingId);
    if (!room) return [];

    const producers: Array<{ participantId: string; producerId: string; kind: mediasoupTypes.MediaKind }> = [];

    for (const [participantId, participant] of room.participants) {
      if (excludeParticipantId && participantId === excludeParticipantId) {
        continue;
      }

      for (const [producerId, producer] of participant.producers) {
        producers.push({
          participantId,
          producerId,
          kind: producer.kind,
        });
      }
    }

    return producers;
  }

  private notifyNewProducer(meetingId: string, producerParticipantId: string, producerId: string): void {
    // This will be handled by the socket.io handlers
    // Just logging here for now
    logger.debug('New producer to notify', { meetingId, producerParticipantId, producerId });
  }

  getRoomStats(meetingId: string): any {
    const room = this.rooms.get(meetingId);
    if (!room) return null;

    return {
      id: room.id,
      participantCount: room.participants.size,
      routerId: room.router.id,
      participants: Array.from(room.participants.values()).map(p => ({
        id: p.id,
        transportCount: p.transports.size,
        producerCount: p.producers.size,
        consumerCount: p.consumers.size,
      })),
    };
  }

  getAllRooms(): string[] {
    return Array.from(this.rooms.keys());
  }
}

export const roomService = new RoomService();
