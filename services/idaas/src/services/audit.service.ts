/**
 * NEXUS IDaaS - Audit Logging Service
 * Comprehensive audit trail for all actions
 */

import { v4 as uuidv4 } from 'uuid';
import { AuditLog, AuditAction, AuditStatus } from '../types';
import { db } from '../database';
import { logger } from '../utils/logger';

interface AuditLogRequest {
  userId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
}

export class AuditService {
  /**
   * Log an audit event
   */
  async log(data: AuditLogRequest): Promise<void> {
    try {
      await db.query(
        `INSERT INTO audit_logs (
          user_id, organization_id, action, resource, resource_id,
          details, ip_address, user_agent, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          data.userId || null,
          data.organizationId || null,
          data.action,
          data.resource,
          data.resourceId || null,
          JSON.stringify(data.details || {}),
          data.ipAddress || '0.0.0.0',
          data.userAgent || '',
          data.status || AuditStatus.SUCCESS,
        ]
      );

      logger.debug('Audit log created', {
        action: data.action,
        resource: data.resource,
        userId: data.userId,
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      logger.error('Failed to create audit log', { error, data });
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      startDate,
      endDate,
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (resource) {
      conditions.push(`resource = $${paramIndex++}`);
      params.push(resource);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get logs
    const logs = await db.queryMany<AuditLog>(
      `SELECT * FROM audit_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { logs, total };
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationLogs(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      startDate,
      endDate,
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (resource) {
      conditions.push(`resource = $${paramIndex++}`);
      params.push(resource);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get logs
    const logs = await db.queryMany<AuditLog>(
      `SELECT * FROM audit_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { logs, total };
  }

  /**
   * Get security events (failed logins, account lockouts, etc.)
   */
  async getSecurityEvents(
    options: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      organizationId?: string;
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const { page = 1, limit = 50, startDate, endDate, organizationId } = options;

    const offset = (page - 1) * limit;
    const securityActions = [
      'login_failed',
      'account_locked',
      'account_suspended',
      'mfa_failed',
      'password_reset',
    ];

    const conditions: string[] = [
      `action = ANY($1::text[])`,
      `status = '${AuditStatus.FAILURE}'`,
    ];
    const params: any[] = [securityActions];
    let paramIndex = 2;

    if (organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(organizationId);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get logs
    const logs = await db.queryMany<AuditLog>(
      `SELECT * FROM audit_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { logs, total };
  }

  /**
   * Get action statistics
   */
  async getActionStats(
    options: {
      startDate?: Date;
      endDate?: Date;
      organizationId?: string;
    } = {}
  ): Promise<Record<string, number>> {
    const { startDate, endDate, organizationId } = options;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(organizationId);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const results = await db.queryMany<{ action: string; count: string }>(
      `SELECT action, COUNT(*) as count
       FROM audit_logs
       ${whereClause}
       GROUP BY action
       ORDER BY count DESC`,
      params
    );

    const stats: Record<string, number> = {};
    results.forEach((row) => {
      stats[row.action] = parseInt(row.count, 10);
    });

    return stats;
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(
    userId: string,
    days: number = 30
  ): Promise<{
    totalActions: number;
    loginCount: number;
    failedLoginCount: number;
    lastLogin?: Date;
    recentActions: AuditLog[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalResult = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM audit_logs WHERE user_id = $1 AND created_at >= $2',
      [userId, startDate]
    );

    const loginResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE user_id = $1 AND action = 'login' AND status = 'success' AND created_at >= $2`,
      [userId, startDate]
    );

    const failedLoginResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE user_id = $1 AND action = 'login_failed' AND created_at >= $2`,
      [userId, startDate]
    );

    const lastLoginResult = await db.queryOne<{ created_at: Date }>(
      `SELECT created_at FROM audit_logs
       WHERE user_id = $1 AND action = 'login' AND status = 'success'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const recentActions = await db.queryMany<AuditLog>(
      `SELECT * FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    return {
      totalActions: parseInt(totalResult?.count || '0', 10),
      loginCount: parseInt(loginResult?.count || '0', 10),
      failedLoginCount: parseInt(failedLoginResult?.count || '0', 10),
      lastLogin: lastLoginResult?.created_at,
      recentActions,
    };
  }

  /**
   * Delete old audit logs (for cleanup)
   */
  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.query(
      'DELETE FROM audit_logs WHERE created_at < $1',
      [cutoffDate]
    );

    const deletedCount = result.rowCount || 0;
    logger.info('Old audit logs deleted', { deletedCount, daysToKeep });

    return deletedCount;
  }
}
