import { Pool } from 'pg';

export type NotificationType =
  | 'mention'
  | 'share'
  | 'comment'
  | 'invite'
  | 'system'
  | 'meeting'
  | 'file_update';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
}

export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
}

export class NotificationModel {
  constructor(private pool: Pool) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data, link)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      data.user_id,
      data.type,
      data.title,
      data.message,
      JSON.stringify(data.data || {}),
      data.link,
    ]);

    return result.rows[0];
  }

  async findById(id: string): Promise<Notification | null> {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND is_read = false
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const query = `
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const query = `
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `;
    await this.pool.query(query, [userId]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM notifications WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const query = 'DELETE FROM notifications WHERE user_id = $1';
    await this.pool.query(query, [userId]);
  }

  async deleteOlderThan(days: number): Promise<void> {
    const query = `
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    await this.pool.query(query);
  }
}
