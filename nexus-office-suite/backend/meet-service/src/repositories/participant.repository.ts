import { db } from '../database/client';
import { Participant } from '../types';
import logger from '../utils/logger';

export class ParticipantRepository {
  async create(participant: Omit<Participant, 'id' | 'joined_at' | 'left_at'>): Promise<Participant> {
    try {
      const query = `
        INSERT INTO participants (
          meeting_id, user_id, user_name, user_avatar, role,
          is_muted, is_video_on, is_screen_sharing, is_hand_raised
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        participant.meeting_id,
        participant.user_id,
        participant.user_name,
        participant.user_avatar || null,
        participant.role,
        participant.is_muted,
        participant.is_video_on,
        participant.is_screen_sharing,
        participant.is_hand_raised,
      ];

      const result = await db.query(query, values);
      logger.info('Participant created', {
        participantId: result.rows[0].id,
        meetingId: participant.meeting_id,
        userId: participant.user_id,
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating participant', { error });
      throw error;
    }
  }

  async getById(id: string): Promise<Participant | null> {
    try {
      const query = 'SELECT * FROM participants WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting participant by id', { id, error });
      throw error;
    }
  }

  async getByMeeting(meetingId: string, activeOnly: boolean = false): Promise<Participant[]> {
    try {
      let query = 'SELECT * FROM participants WHERE meeting_id = $1';

      if (activeOnly) {
        query += ' AND left_at IS NULL';
      }

      query += ' ORDER BY joined_at ASC';

      const result = await db.query(query, [meetingId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting participants by meeting', { meetingId, error });
      throw error;
    }
  }

  async getByUserAndMeeting(userId: string, meetingId: string): Promise<Participant | null> {
    try {
      const query = `
        SELECT * FROM participants
        WHERE user_id = $1 AND meeting_id = $2 AND left_at IS NULL
        ORDER BY joined_at DESC
        LIMIT 1
      `;
      const result = await db.query(query, [userId, meetingId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting participant by user and meeting', { userId, meetingId, error });
      throw error;
    }
  }

  async update(id: string, updates: Partial<Participant>): Promise<Participant | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'joined_at') {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return await this.getById(id);
      }

      values.push(id);
      const query = `
        UPDATE participants
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      logger.debug('Participant updated', { participantId: id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating participant', { id, error });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM participants WHERE id = $1 RETURNING id';
      const result = await db.query(query, [id]);
      logger.info('Participant deleted', { participantId: id });
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting participant', { id, error });
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: {
      is_muted?: boolean;
      is_video_on?: boolean;
      is_screen_sharing?: boolean;
      is_hand_raised?: boolean;
    }
  ): Promise<Participant | null> {
    try {
      return await this.update(id, status);
    } catch (error) {
      logger.error('Error updating participant status', { id, status, error });
      throw error;
    }
  }

  async markAsLeft(id: string): Promise<Participant | null> {
    try {
      const query = `
        UPDATE participants
        SET left_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await db.query(query, [id]);
      logger.info('Participant marked as left', { participantId: id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error marking participant as left', { id, error });
      throw error;
    }
  }

  async markAsLeftByUserAndMeeting(userId: string, meetingId: string): Promise<void> {
    try {
      const query = `
        UPDATE participants
        SET left_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND meeting_id = $2 AND left_at IS NULL
      `;
      await db.query(query, [userId, meetingId]);
      logger.info('Participant marked as left by user and meeting', { userId, meetingId });
    } catch (error) {
      logger.error('Error marking participant as left', { userId, meetingId, error });
      throw error;
    }
  }

  async getActiveCount(meetingId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM participants
        WHERE meeting_id = $1 AND left_at IS NULL
      `;
      const result = await db.query(query, [meetingId]);
      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      logger.error('Error getting active participant count', { meetingId, error });
      throw error;
    }
  }

  async updateRole(id: string, role: 'host' | 'co-host' | 'participant'): Promise<Participant | null> {
    try {
      const query = `
        UPDATE participants
        SET role = $1
        WHERE id = $2
        RETURNING *
      `;
      const result = await db.query(query, [role, id]);
      logger.info('Participant role updated', { participantId: id, role });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating participant role', { id, role, error });
      throw error;
    }
  }

  async isUserInMeeting(userId: string, meetingId: string): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM participants
        WHERE user_id = $1 AND meeting_id = $2 AND left_at IS NULL
      `;
      const result = await db.query(query, [userId, meetingId]);
      return parseInt(result.rows[0]?.count || '0', 10) > 0;
    } catch (error) {
      logger.error('Error checking if user is in meeting', { userId, meetingId, error });
      throw error;
    }
  }

  async getMeetingHost(meetingId: string): Promise<Participant | null> {
    try {
      const query = `
        SELECT * FROM participants
        WHERE meeting_id = $1 AND role = 'host' AND left_at IS NULL
        LIMIT 1
      `;
      const result = await db.query(query, [meetingId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting meeting host', { meetingId, error });
      throw error;
    }
  }

  async toggleMute(id: string): Promise<Participant | null> {
    try {
      const query = `
        UPDATE participants
        SET is_muted = NOT is_muted
        WHERE id = $1
        RETURNING *
      `;
      const result = await db.query(query, [id]);
      logger.debug('Participant mute toggled', { participantId: id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error toggling participant mute', { id, error });
      throw error;
    }
  }

  async toggleVideo(id: string): Promise<Participant | null> {
    try {
      const query = `
        UPDATE participants
        SET is_video_on = NOT is_video_on
        WHERE id = $1
        RETURNING *
      `;
      const result = await db.query(query, [id]);
      logger.debug('Participant video toggled', { participantId: id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error toggling participant video', { id, error });
      throw error;
    }
  }

  async toggleHandRaised(id: string): Promise<Participant | null> {
    try {
      const query = `
        UPDATE participants
        SET is_hand_raised = NOT is_hand_raised
        WHERE id = $1
        RETURNING *
      `;
      const result = await db.query(query, [id]);
      logger.debug('Participant hand raised toggled', { participantId: id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error toggling participant hand raised', { id, error });
      throw error;
    }
  }
}

export const participantRepository = new ParticipantRepository();
