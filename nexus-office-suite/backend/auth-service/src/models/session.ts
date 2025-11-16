import { Pool } from 'pg';

export interface Session {
  id: string;
  user_id: string;
  refresh_token: string;
  device_info?: string;
  ip_address?: string;
  expires_at: Date;
  created_at: Date;
}

export class SessionModel {
  constructor(private pool: Pool) {}

  async create(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<Session> {
    const query = `
      INSERT INTO sessions (user_id, refresh_token, device_info, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      userId,
      refreshToken,
      deviceInfo,
      ipAddress,
      expiresAt,
    ]);

    return result.rows[0];
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const query = 'SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()';
    const result = await this.pool.query(query, [refreshToken]);
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const query = 'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC';
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async delete(refreshToken: string): Promise<void> {
    const query = 'DELETE FROM sessions WHERE refresh_token = $1';
    await this.pool.query(query, [refreshToken]);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const query = 'DELETE FROM sessions WHERE user_id = $1';
    await this.pool.query(query, [userId]);
  }

  async deleteExpired(): Promise<void> {
    const query = 'DELETE FROM sessions WHERE expires_at < NOW()';
    await this.pool.query(query);
  }

  async countForUser(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND expires_at > NOW()';
    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }
}
