/**
 * NEXUS IDaaS - User Management Service
 * CRUD operations for users
 */

import { v4 as uuidv4 } from 'uuid';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  SearchUsersRequest,
  UserStatus,
  IDaaSError,
  ErrorCode,
} from '../types';
import { db } from '../database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { hashPassword, validatePassword } from '../utils/crypto';
import { AuditService } from './audit.service';

export class UserService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<User | null> {
    // Try cache first
    const cached = await cache.get<User>(`user:${userId}`);
    if (cached) {
      return cached;
    }

    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (user) {
      await cache.set(`user:${userId}`, user, 300); // 5 minutes
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<User | null> {
    return await db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );
  }

  /**
   * Create user
   */
  async create(
    data: CreateUserRequest,
    createdBy?: string
  ): Promise<User> {
    // Check if user already exists
    const existing = await this.getByEmail(data.email);
    if (existing) {
      throw new IDaaSError(
        ErrorCode.USER_ALREADY_EXISTS,
        'User with this email already exists',
        409
      );
    }

    // Validate password if provided
    if (data.password) {
      const validation = validatePassword(data.password);
      if (!validation.valid) {
        throw new IDaaSError(
          ErrorCode.WEAK_PASSWORD,
          validation.errors.join(', '),
          400
        );
      }
    }

    // Hash password if provided
    const passwordHash = data.password ? await hashPassword(data.password) : null;

    // Create user
    const user = await db.queryOne<User>(
      `INSERT INTO users (
        email, password_hash, username, first_name, last_name,
        phone_number, metadata, status, password_changed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.email.toLowerCase(),
        passwordHash,
        data.username || null,
        data.firstName || null,
        data.lastName || null,
        data.phoneNumber || null,
        JSON.stringify(data.metadata || {}),
        passwordHash ? UserStatus.PENDING : UserStatus.ACTIVE, // If no password, assume SSO
        passwordHash ? new Date() : null,
      ]
    );

    if (!user) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create user',
        500
      );
    }

    // Add to organization if specified
    if (data.organizationId) {
      await db.query(
        `INSERT INTO organization_memberships (user_id, organization_id, role)
         VALUES ($1, $2, $3)`,
        [user.id, data.organizationId, 'member']
      );
    }

    // Cache user
    await cache.set(`user:${user.id}`, user, 300);

    // Audit log
    await this.auditService.log({
      userId: createdBy,
      action: 'user_created',
      resource: 'users',
      resourceId: user.id,
      status: 'success',
      details: { email: user.email },
    });

    logger.info('User created', { userId: user.id, email: user.email });

    return user;
  }

  /**
   * Update user
   */
  async update(
    userId: string,
    data: UpdateUserRequest,
    updatedBy?: string
  ): Promise<User> {
    const user = await this.getById(userId);
    if (!user) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found',
        404
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName);
    }

    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName);
    }

    if (data.phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(data.phoneNumber);
    }

    if (data.avatar !== undefined) {
      updates.push(`avatar = $${paramIndex++}`);
      values.push(data.avatar);
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return user; // Nothing to update
    }

    values.push(userId);

    const updatedUser = await db.queryOne<User>(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!updatedUser) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update user',
        500
      );
    }

    // Update cache
    await cache.set(`user:${userId}`, updatedUser, 300);

    // Audit log
    await this.auditService.log({
      userId: updatedBy || userId,
      action: 'user_updated',
      resource: 'users',
      resourceId: userId,
      status: 'success',
      details: data,
    });

    logger.info('User updated', { userId });

    return updatedUser;
  }

  /**
   * Delete user (soft delete)
   */
  async delete(userId: string, deletedBy?: string): Promise<void> {
    const user = await this.getById(userId);
    if (!user) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found',
        404
      );
    }

    await db.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1',
      [userId]
    );

    // Clear cache
    await cache.delete(`user:${userId}`);

    // Delete all sessions
    await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    // Audit log
    await this.auditService.log({
      userId: deletedBy || userId,
      action: 'user_deleted',
      resource: 'users',
      resourceId: userId,
      status: 'success',
    });

    logger.info('User deleted', { userId });
  }

  /**
   * Suspend user
   */
  async suspend(userId: string, suspendedBy?: string): Promise<void> {
    await this.updateStatus(userId, UserStatus.SUSPENDED, suspendedBy);

    // Delete all sessions
    await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    logger.info('User suspended', { userId });
  }

  /**
   * Activate user
   */
  async activate(userId: string, activatedBy?: string): Promise<void> {
    await this.updateStatus(userId, UserStatus.ACTIVE, activatedBy);
    logger.info('User activated', { userId });
  }

  /**
   * Update user status
   */
  private async updateStatus(
    userId: string,
    status: UserStatus,
    updatedBy?: string
  ): Promise<void> {
    const user = await this.getById(userId);
    if (!user) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found',
        404
      );
    }

    await db.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, userId]
    );

    // Update cache
    await cache.delete(`user:${userId}`);

    // Audit log
    const action = status === UserStatus.SUSPENDED ? 'user_suspended' : 'user_activated';
    await this.auditService.log({
      userId: updatedBy || userId,
      action,
      resource: 'users',
      resourceId: userId,
      status: 'success',
      details: { newStatus: status },
    });
  }

  /**
   * Search users
   */
  async search(params: SearchUsersRequest): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      query,
      organizationId,
      status,
      emailVerified,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params;

    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];
    let paramIndex = 1;

    if (query) {
      conditions.push(`(
        email ILIKE $${paramIndex} OR
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        username ILIKE $${paramIndex}
      )`);
      values.push(`%${query}%`);
      paramIndex++;
    }

    if (organizationId) {
      conditions.push(`id IN (
        SELECT user_id FROM organization_memberships
        WHERE organization_id = $${paramIndex}
      )`);
      values.push(organizationId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (emailVerified !== undefined) {
      conditions.push(`email_verified = $${paramIndex}`);
      values.push(emailVerified);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get users
    const offset = (page - 1) * limit;
    const users = await db.queryMany<User>(
      `SELECT * FROM users
       WHERE ${whereClause}
       ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<any[]> {
    return await db.queryMany(
      `SELECT o.*, om.role, om.joined_at
       FROM organizations o
       JOIN organization_memberships om ON o.id = om.organization_id
       WHERE om.user_id = $1 AND o.deleted_at IS NULL
       ORDER BY om.joined_at DESC`,
      [userId]
    );
  }

  /**
   * Get user's sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    return await db.queryMany(
      `SELECT
        id, device_info, ip_address, user_agent,
        last_activity_at, created_at, expires_at
       FROM sessions
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [userId]
    );
  }

  /**
   * Revoke user session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await db.query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    logger.info('Session revoked', { userId, sessionId });
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    logger.info('All sessions revoked', { userId });
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    pending: number;
    emailVerified: number;
    mfaEnabled: number;
  }> {
    const results = await db.queryMany<{ status: string; count: string }>(
      `SELECT
        status,
        COUNT(*) as count
       FROM users
       WHERE deleted_at IS NULL
       GROUP BY status`
    );

    const emailVerifiedResult = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE email_verified = true AND deleted_at IS NULL'
    );

    const mfaEnabledResult = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE mfa_enabled = true AND deleted_at IS NULL'
    );

    const totalResult = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'
    );

    const stats: any = {
      total: parseInt(totalResult?.count || '0', 10),
      active: 0,
      suspended: 0,
      pending: 0,
      emailVerified: parseInt(emailVerifiedResult?.count || '0', 10),
      mfaEnabled: parseInt(mfaEnabledResult?.count || '0', 10),
    };

    results.forEach((row) => {
      stats[row.status] = parseInt(row.count, 10);
    });

    return stats;
  }
}
