import { Meeting, Participant } from '../types';
import { meetingRepository } from '../repositories/meeting.repository';
import { participantRepository } from '../repositories/participant.repository';
import { roomService } from './room.service';
import { redis } from '../database/redis';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

class MeetingService {
  async createMeeting(
    tenantId: string,
    hostId: string,
    data: {
      title: string;
      description?: string;
      scheduled_start?: Date;
      scheduled_end?: Date;
      recording_enabled?: boolean;
      is_public?: boolean;
      max_participants?: number;
      password?: string;
      lobby_enabled?: boolean;
    }
  ): Promise<Meeting> {
    try {
      const meeting = await meetingRepository.create({
        tenant_id: tenantId,
        host_id: hostId,
        title: data.title,
        description: data.description,
        status: data.scheduled_start ? 'scheduled' : 'active',
        recording_enabled: data.recording_enabled || false,
        is_public: data.is_public || false,
        max_participants: data.max_participants || 100,
        password: data.password,
        lobby_enabled: data.lobby_enabled || false,
        scheduled_start: data.scheduled_start,
        scheduled_end: data.scheduled_end,
      });

      logger.info('Meeting created', { meetingId: meeting.id, tenantId, hostId });

      // If meeting is starting immediately, create room
      if (meeting.status === 'active') {
        await roomService.createRoom(meeting);
      }

      return meeting;
    } catch (error) {
      logger.error('Error creating meeting', { tenantId, hostId, error });
      throw error;
    }
  }

  async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      return await meetingRepository.getById(meetingId);
    } catch (error) {
      logger.error('Error getting meeting', { meetingId, error });
      throw error;
    }
  }

  async getMeetingsByTenant(tenantId: string, limit?: number, offset?: number): Promise<Meeting[]> {
    try {
      return await meetingRepository.getByTenant(tenantId, limit, offset);
    } catch (error) {
      logger.error('Error getting meetings by tenant', { tenantId, error });
      throw error;
    }
  }

  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<Meeting | null> {
    try {
      const meeting = await meetingRepository.update(meetingId, updates);
      logger.info('Meeting updated', { meetingId });
      return meeting;
    } catch (error) {
      logger.error('Error updating meeting', { meetingId, error });
      throw error;
    }
  }

  async deleteMeeting(meetingId: string): Promise<boolean> {
    try {
      // End the meeting first if it's active
      const meeting = await meetingRepository.getById(meetingId);
      if (meeting && meeting.status === 'active') {
        await this.endMeeting(meetingId);
      }

      const result = await meetingRepository.delete(meetingId);
      logger.info('Meeting deleted', { meetingId });
      return result;
    } catch (error) {
      logger.error('Error deleting meeting', { meetingId, error });
      throw error;
    }
  }

  async joinMeeting(
    meetingId: string,
    user: {
      user_id: string;
      user_name: string;
      user_avatar?: string;
      role?: 'host' | 'co-host' | 'participant';
    },
    password?: string
  ): Promise<{ meeting: Meeting; participant: Participant; rtpCapabilities: any }> {
    try {
      // Get meeting
      const meeting = await meetingRepository.getById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Check if meeting is active or scheduled
      if (meeting.status === 'ended') {
        throw new Error('Meeting has ended');
      }

      // Validate password if required
      if (meeting.password) {
        const isValid = await meetingRepository.validatePassword(meetingId, password || '');
        if (!isValid) {
          throw new Error('Invalid password');
        }
      }

      // Check participant limit
      const currentParticipants = await participantRepository.getActiveCount(meetingId);
      if (currentParticipants >= meeting.max_participants) {
        throw new Error('Meeting is full');
      }

      // Check if user is already in the meeting
      const existingParticipant = await participantRepository.getByUserAndMeeting(
        user.user_id,
        meetingId
      );
      if (existingParticipant) {
        // User is rejoining, return existing participant
        const room = roomService.getRoom(meetingId);
        if (!room) {
          // Create room if it doesn't exist
          await this.startMeeting(meetingId);
        }

        const rtpCapabilities = roomService.getRouterRtpCapabilities(meetingId);
        return { meeting, participant: existingParticipant, rtpCapabilities };
      }

      // Determine role - first participant should be host if not specified
      let role = user.role || 'participant';
      if (user.user_id === meeting.host_id) {
        role = 'host';
      }

      // Create participant
      const participant = await participantRepository.create({
        meeting_id: meetingId,
        user_id: user.user_id,
        user_name: user.user_name,
        user_avatar: user.user_avatar,
        role,
        is_muted: false,
        is_video_on: true,
        is_screen_sharing: false,
        is_hand_raised: false,
      });

      // Start meeting if it's the first participant (host)
      if (meeting.status === 'scheduled' && role === 'host') {
        await this.startMeeting(meetingId);
      }

      // Ensure room exists
      let room = roomService.getRoom(meetingId);
      if (!room) {
        const updatedMeeting = await meetingRepository.getById(meetingId);
        room = await roomService.createRoom(updatedMeeting!);
      }

      // Add participant to room
      await roomService.addParticipant(meetingId, participant);

      // Get RTP capabilities for the participant
      const rtpCapabilities = roomService.getRouterRtpCapabilities(meetingId);

      // Cache participant session in Redis
      await redis.hSet(
        `meeting:${meetingId}:participants`,
        participant.id,
        JSON.stringify({
          user_id: user.user_id,
          user_name: user.user_name,
          joined_at: new Date().toISOString(),
        })
      );

      logger.info('User joined meeting', {
        meetingId,
        userId: user.user_id,
        participantId: participant.id,
        role,
      });

      return { meeting, participant, rtpCapabilities };
    } catch (error) {
      logger.error('Error joining meeting', { meetingId, userId: user.user_id, error });
      throw error;
    }
  }

  async leaveMeeting(meetingId: string, participantId: string): Promise<void> {
    try {
      // Mark participant as left in database
      await participantRepository.markAsLeft(participantId);

      // Remove from room
      await roomService.removeParticipant(meetingId, participantId);

      // Remove from Redis cache
      await redis.hDel(`meeting:${meetingId}:participants`, participantId);

      // Check if meeting should end (no more active participants)
      const activeCount = await participantRepository.getActiveCount(meetingId);
      if (activeCount === 0) {
        logger.info('Last participant left, ending meeting', { meetingId });
        // Optionally auto-end the meeting
        // await this.endMeeting(meetingId);
      }

      logger.info('User left meeting', { meetingId, participantId });
    } catch (error) {
      logger.error('Error leaving meeting', { meetingId, participantId, error });
      throw error;
    }
  }

  async startMeeting(meetingId: string): Promise<Meeting> {
    try {
      // Update meeting status to active
      const meeting = await meetingRepository.updateStatus(meetingId, 'active');
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Create room
      await roomService.createRoom(meeting);

      logger.info('Meeting started', { meetingId });
      return meeting;
    } catch (error) {
      logger.error('Error starting meeting', { meetingId, error });
      throw error;
    }
  }

  async endMeeting(meetingId: string): Promise<Meeting> {
    try {
      // Update meeting status to ended
      const meeting = await meetingRepository.updateStatus(meetingId, 'ended');
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Mark all active participants as left
      const activeParticipants = await participantRepository.getByMeeting(meetingId, true);
      for (const participant of activeParticipants) {
        await participantRepository.markAsLeft(participant.id);
      }

      // Delete room
      await roomService.deleteRoom(meetingId);

      // Clear Redis cache
      await redis.del(`meeting:${meetingId}:participants`);

      logger.info('Meeting ended', { meetingId });
      return meeting;
    } catch (error) {
      logger.error('Error ending meeting', { meetingId, error });
      throw error;
    }
  }

  async updateMeetingSettings(
    meetingId: string,
    settings: {
      recording_enabled?: boolean;
      lobby_enabled?: boolean;
      max_participants?: number;
    }
  ): Promise<Meeting | null> {
    try {
      return await meetingRepository.update(meetingId, settings);
    } catch (error) {
      logger.error('Error updating meeting settings', { meetingId, error });
      throw error;
    }
  }

  async getParticipants(meetingId: string, activeOnly: boolean = false): Promise<Participant[]> {
    try {
      return await participantRepository.getByMeeting(meetingId, activeOnly);
    } catch (error) {
      logger.error('Error getting participants', { meetingId, error });
      throw error;
    }
  }

  async updateParticipantStatus(
    participantId: string,
    status: {
      is_muted?: boolean;
      is_video_on?: boolean;
      is_screen_sharing?: boolean;
      is_hand_raised?: boolean;
    }
  ): Promise<Participant | null> {
    try {
      return await participantRepository.updateStatus(participantId, status);
    } catch (error) {
      logger.error('Error updating participant status', { participantId, error });
      throw error;
    }
  }

  async updateParticipantRole(
    participantId: string,
    role: 'host' | 'co-host' | 'participant'
  ): Promise<Participant | null> {
    try {
      return await participantRepository.updateRole(participantId, role);
    } catch (error) {
      logger.error('Error updating participant role', { participantId, error });
      throw error;
    }
  }

  async saveChatMessage(
    meetingId: string,
    senderId: string,
    senderName: string,
    message: string,
    type: 'text' | 'file' | 'system' = 'text'
  ): Promise<void> {
    try {
      await meetingRepository.saveChatMessage({
        meeting_id: meetingId,
        sender_id: senderId,
        sender_name: senderName,
        message,
        type,
      });
      logger.debug('Chat message saved', { meetingId, senderId });
    } catch (error) {
      logger.error('Error saving chat message', { meetingId, error });
      throw error;
    }
  }

  async getChatMessages(meetingId: string, limit?: number): Promise<any[]> {
    try {
      return await meetingRepository.getChatMessages(meetingId, limit);
    } catch (error) {
      logger.error('Error getting chat messages', { meetingId, error });
      throw error;
    }
  }

  async getMeetingStats(meetingId: string): Promise<any> {
    try {
      const meeting = await meetingRepository.getById(meetingId);
      const participants = await participantRepository.getByMeeting(meetingId, true);
      const roomStats = roomService.getRoomStats(meetingId);

      return {
        meeting,
        participantCount: participants.length,
        participants: participants.map(p => ({
          id: p.id,
          user_name: p.user_name,
          role: p.role,
          is_muted: p.is_muted,
          is_video_on: p.is_video_on,
          is_screen_sharing: p.is_screen_sharing,
          is_hand_raised: p.is_hand_raised,
        })),
        roomStats,
      };
    } catch (error) {
      logger.error('Error getting meeting stats', { meetingId, error });
      throw error;
    }
  }

  async getActiveMeetings(tenantId?: string): Promise<Meeting[]> {
    try {
      return await meetingRepository.getActive(tenantId);
    } catch (error) {
      logger.error('Error getting active meetings', { tenantId, error });
      throw error;
    }
  }

  async getScheduledMeetings(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Meeting[]> {
    try {
      return await meetingRepository.getScheduled(tenantId, startDate, endDate);
    } catch (error) {
      logger.error('Error getting scheduled meetings', { tenantId, error });
      throw error;
    }
  }
}

export const meetingService = new MeetingService();
