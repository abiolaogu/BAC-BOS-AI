import { Pool } from 'pg';

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  tenant_id?: string;
  roles: string[];
  oauth_provider?: 'google' | 'microsoft' | null;
  oauth_id?: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

export interface CreateUserData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  tenant_id?: string;
  oauth_provider?: 'google' | 'microsoft';
  oauth_id?: string;
}

export class UserModel {
  constructor(private pool: Pool) {}

  async create(data: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, tenant_id, oauth_provider, oauth_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      data.email,
      data.password,
      data.first_name,
      data.last_name,
      data.tenant_id,
      data.oauth_provider,
      data.oauth_id,
    ]);

    return result.rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async findByOAuth(provider: string, oauthId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2';
    const result = await this.pool.query(query, [provider, oauthId]);
    return result.rows[0] || null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
    await this.pool.query(query, [passwordHash, userId]);
  }

  async updateMFA(userId: string, enabled: boolean, secret?: string): Promise<void> {
    const query = 'UPDATE users SET mfa_enabled = $1, mfa_secret = $2, updated_at = NOW() WHERE id = $3';
    await this.pool.query(query, [enabled, secret, userId]);
  }

  async verifyEmail(userId: string): Promise<void> {
    const query = 'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1';
    await this.pool.query(query, [userId]);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = 'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1';
    await this.pool.query(query, [userId]);
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.first_name !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(data.first_name);
    }

    if (data.last_name !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(data.last_name);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deactivate(userId: string): Promise<void> {
    const query = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1';
    await this.pool.query(query, [userId]);
  }
}
