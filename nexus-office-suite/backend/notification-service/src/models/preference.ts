import { Pool } from 'pg';

export interface NotificationPreference {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  mention_email: boolean;
  mention_push: boolean;
  share_email: boolean;
  share_push: boolean;
  comment_email: boolean;
  comment_push: boolean;
  invite_email: boolean;
  invite_push: boolean;
  meeting_email: boolean;
  meeting_push: boolean;
  created_at: Date;
  updated_at: Date;
}

export class PreferenceModel {
  constructor(private pool: Pool) {}

  async create(userId: string): Promise<NotificationPreference> {
    const query = `
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    const query = 'SELECT * FROM notification_preferences WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  async update(userId: string, preferences: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(preferences).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    fields.push('updated_at = NOW()');
    values.push(userId);

    const query = `
      UPDATE notification_preferences
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}
