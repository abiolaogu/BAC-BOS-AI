import { db } from '../database/client';
import { Meeting } from '../types';
import logger from '../utils/logger';

export class MeetingRepository {
  async create(meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>): Promise<Meeting> {
    try {
      const query = `
        INSERT INTO meetings (
          tenant_id, title, description, host_id, status,
          recording_enabled, is_public, max_participants, password,
          lobby_enabled, scheduled_start, scheduled_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        meeting.tenant_id,
        meeting.title,
        meeting.description || null,
        meeting.host_id,
        meeting.status,
        meeting.recording_enabled,
        meeting.is_public,
        meeting.max_participants,
        meeting.password || null,
        meeting.lobby_enabled,
        meeting.scheduled_start || null,
        meeting.scheduled_end || null,
      ];

      const result = await db.query(query, values);
      logger.info('Meeting created', { meetingId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating meeting', { error });
      throw error;
    }
  }

  async getById(id: string): Promise<Meeting | null> {
    try {
      const query = 'SELECT * FROM meetings WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting meeting by id', { id, error });
      throw error;
    }
  }

  async getByTenant(tenantId: string, limit: number = 50, offset: number = 0): Promise<Meeting[]> {
    try {
      const query = `
        SELECT * FROM meetings
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await db.query(query, [tenantId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting meetings by tenant', { tenantId, error });
      throw error;
    }
  }

  async update(id: string, updates: Partial<Meeting>): Promise<Meeting | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
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
        UPDATE meetings
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      logger.info('Meeting updated', { meetingId: id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating meeting', { id, error });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM meetings WHERE id = $1 RETURNING id';
      const result = await db.query(query, [id]);
      logger.info('Meeting deleted', { meetingId: id });
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting meeting', { id, error });
      throw error;
    }
  }

  async updateStatus(id: string, status: 'scheduled' | 'active' | 'ended'): Promise<Meeting | null> {
    try {
      const query = `
        UPDATE meetings
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await db.query(query, [status, id]);
      logger.info('Meeting status updated', { meetingId: id, status });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating meeting status', { id, status, error });
      throw error;
    }
  }

  async getActive(tenantId?: string): Promise<Meeting[]> {
    try {
      let query = "SELECT * FROM meetings WHERE status = 'active'";
      const values: any[] = [];

      if (tenantId) {
        query += ' AND tenant_id = $1';
        values.push(tenantId);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active meetings', { tenantId, error });
      throw error;
    }
  }

  async getScheduled(tenantId: string, startDate?: Date, endDate?: Date): Promise<Meeting[]> {
    try {
      let query = `
        SELECT * FROM meetings
        WHERE tenant_id = $1 AND status = 'scheduled'
      `;
      const values: any[] = [tenantId];
      let paramCount = 2;

      if (startDate) {
        query += ` AND scheduled_start >= $${paramCount}`;
        values.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND scheduled_start <= $${paramCount}`;
        values.push(endDate);
        paramCount++;
      }

      query += ' ORDER BY scheduled_start ASC';

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting scheduled meetings', { tenantId, error });
      throw error;
    }
  }

  async getParticipantCount(meetingId: string): Promise<number> {
    try {
      const query = 'SELECT get_participant_count($1) as count';
      const result = await db.query(query, [meetingId]);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting participant count', { meetingId, error });
      throw error;
    }
  }

  async validatePassword(meetingId: string, password: string): Promise<boolean> {
    try {
      const query = 'SELECT password FROM meetings WHERE id = $1';
      const result = await db.query(query, [meetingId]);

      if (!result.rows[0]) {
        return false;
      }

      const storedPassword = result.rows[0].password;

      // If no password is set, validation succeeds
      if (!storedPassword) {
        return true;
      }

      // Direct comparison (in production, use bcrypt or similar)
      return storedPassword === password;
    } catch (error) {
      logger.error('Error validating password', { meetingId, error });
      throw error;
    }
  }

  async saveChatMessage(message: {
    meeting_id: string;
    sender_id: string;
    sender_name: string;
    message: string;
    type: 'text' | 'file' | 'system';
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO chat_messages (meeting_id, sender_id, sender_name, message, type)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(query, [
        message.meeting_id,
        message.sender_id,
        message.sender_name,
        message.message,
        message.type,
      ]);
      logger.debug('Chat message saved', { meetingId: message.meeting_id });
    } catch (error) {
      logger.error('Error saving chat message', { error });
      throw error;
    }
  }

  async getChatMessages(meetingId: string, limit: number = 100): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM chat_messages
        WHERE meeting_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;
      const result = await db.query(query, [meetingId, limit]);
      return result.rows.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Error getting chat messages', { meetingId, error });
      throw error;
    }
  }
}

export const meetingRepository = new MeetingRepository();
