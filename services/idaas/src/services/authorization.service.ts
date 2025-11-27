/**
 * NEXUS IDaaS - Authorization Service
 * Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC)
 */

import { v4 as uuidv4 } from 'uuid';
import { Role, Permission, IDaaSError, ErrorCode } from '../types';
import { db } from '../database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';

interface CreateRoleRequest {
  name: string;
  description?: string;
  organizationId?: string;
  permissions: Array<{
    resource: string;
    action: string;
    conditions?: Record<string, any>;
  }>;
}

interface CheckPermissionRequest {
  userId: string;
  resource: string;
  action: string;
  context?: Record<string, any>;
}

export class AuthorizationService {
  /**
   * Check if user has permission
   */
  async checkPermission(request: CheckPermissionRequest): Promise<boolean> {
    const { userId, resource, action, context = {} } = request;

    // Try cache first
    const cacheKey = `perm:${userId}:${resource}:${action}`;
    const cached = await cache.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Get user's roles
    const userRoles = await this.getUserRoles(userId);

    // Check if user has permission through any role
    for (const role of userRoles) {
      const permissions = await this.getRolePermissions(role.id);

      for (const permission of permissions) {
        // Check resource and action
        if (
          (permission.resource === '*' || permission.resource === resource) &&
          (permission.action === '*' || permission.action === action)
        ) {
          // Check conditions if any
          if (permission.conditions) {
            const conditionsMet = this.evaluateConditions(
              permission.conditions,
              context
            );
            if (conditionsMet) {
              await cache.set(cacheKey, true, 60); // Cache for 1 minute
              return true;
            }
          } else {
            // No conditions, permission granted
            await cache.set(cacheKey, true, 60);
            return true;
          }
        }
      }
    }

    // No matching permission found
    await cache.set(cacheKey, false, 60);
    return false;
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleRequest, createdBy?: string): Promise<Role> {
    // Check if role already exists
    const existing = await db.queryOne(
      'SELECT id FROM roles WHERE name = $1 AND organization_id = $2',
      [data.name, data.organizationId || null]
    );

    if (existing) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Role with this name already exists',
        409
      );
    }

    // Create role
    const role = await db.queryOne<Role>(
      `INSERT INTO roles (name, description, organization_id, is_system)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [data.name, data.description || null, data.organizationId || null]
    );

    if (!role) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create role',
        500
      );
    }

    // Add permissions
    for (const perm of data.permissions) {
      await db.query(
        `INSERT INTO permissions (role_id, resource, action, conditions)
         VALUES ($1, $2, $3, $4)`,
        [role.id, perm.resource, perm.action, JSON.stringify(perm.conditions || null)]
      );
    }

    logger.info('Role created', { roleId: role.id, name: role.name });

    return role;
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    data: Partial<CreateRoleRequest>
  ): Promise<Role> {
    const role = await db.queryOne<Role>(
      'SELECT * FROM roles WHERE id = $1',
      [roleId]
    );

    if (!role) {
      throw new IDaaSError(ErrorCode.INVALID_REQUEST, 'Role not found', 404);
    }

    if (role.isSystem) {
      throw new IDaaSError(
        ErrorCode.PERMISSION_DENIED,
        'Cannot modify system roles',
        403
      );
    }

    // Update role
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (updates.length > 0) {
      values.push(roleId);
      await db.query(
        `UPDATE roles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    // Update permissions if provided
    if (data.permissions) {
      // Delete existing permissions
      await db.query('DELETE FROM permissions WHERE role_id = $1', [roleId]);

      // Add new permissions
      for (const perm of data.permissions) {
        await db.query(
          `INSERT INTO permissions (role_id, resource, action, conditions)
           VALUES ($1, $2, $3, $4)`,
          [roleId, perm.resource, perm.action, JSON.stringify(perm.conditions || null)]
        );
      }
    }

    // Clear permission cache for all users with this role
    await this.clearRoleCache(roleId);

    const updatedRole = await db.queryOne<Role>(
      'SELECT * FROM roles WHERE id = $1',
      [roleId]
    );

    logger.info('Role updated', { roleId });

    return updatedRole!;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await db.queryOne(
      'SELECT is_system FROM roles WHERE id = $1',
      [roleId]
    );

    if (!role) {
      throw new IDaaSError(ErrorCode.INVALID_REQUEST, 'Role not found', 404);
    }

    if (role.is_system) {
      throw new IDaaSError(
        ErrorCode.PERMISSION_DENIED,
        'Cannot delete system roles',
        403
      );
    }

    await db.query('DELETE FROM roles WHERE id = $1', [roleId]);

    // Clear cache
    await this.clearRoleCache(roleId);

    logger.info('Role deleted', { roleId });
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    groupId?: string
  ): Promise<void> {
    // Check if user exists
    const userExists = await db.exists('users', { id: userId });
    if (!userExists) {
      throw new IDaaSError(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // Check if role exists
    const roleExists = await db.exists('roles', { id: roleId });
    if (!roleExists) {
      throw new IDaaSError(ErrorCode.INVALID_REQUEST, 'Role not found', 404);
    }

    if (groupId) {
      // Assign role to group
      const existing = await db.queryOne(
        'SELECT id FROM group_roles WHERE group_id = $1 AND role_id = $2',
        [groupId, roleId]
      );

      if (!existing) {
        await db.query(
          'INSERT INTO group_roles (group_id, role_id) VALUES ($1, $2)',
          [groupId, roleId]
        );
      }
    }

    // Clear user's permission cache
    await cache.deletePattern(`perm:${userId}:*`);

    logger.info('Role assigned to user', { userId, roleId, groupId });
  }

  /**
   * Revoke role from user
   */
  async revokeRoleFromUser(
    userId: string,
    roleId: string,
    groupId?: string
  ): Promise<void> {
    if (groupId) {
      await db.query(
        'DELETE FROM group_roles WHERE group_id = $1 AND role_id = $2',
        [groupId, roleId]
      );
    }

    // Clear user's permission cache
    await cache.deletePattern(`perm:${userId}:*`);

    logger.info('Role revoked from user', { userId, roleId, groupId });
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    // Get roles from groups user belongs to
    const roles = await db.queryMany<Role>(
      `SELECT DISTINCT r.*
       FROM roles r
       INNER JOIN group_roles gr ON r.id = gr.role_id
       INNER JOIN group_memberships gm ON gr.group_id = gm.group_id
       WHERE gm.user_id = $1
       UNION
       SELECT r.*
       FROM roles r
       INNER JOIN organization_memberships om ON r.name = om.role
       WHERE om.user_id = $1 AND r.is_system = true`,
      [userId]
    );

    return roles;
  }

  /**
   * Get role's permissions
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return await db.queryMany<Permission>(
      'SELECT * FROM permissions WHERE role_id = $1',
      [roleId]
    );
  }

  /**
   * Get all user's permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(userId);
    const allPermissions: Permission[] = [];

    for (const role of roles) {
      const permissions = await this.getRolePermissions(role.id);
      allPermissions.push(...permissions);
    }

    return allPermissions;
  }

  /**
   * List roles
   */
  async listRoles(
    organizationId?: string,
    includeSystem: boolean = true
  ): Promise<Role[]> {
    if (organizationId) {
      return await db.queryMany<Role>(
        `SELECT * FROM roles
         WHERE (organization_id = $1 OR (is_system = true AND $2))
         ORDER BY name`,
        [organizationId, includeSystem]
      );
    }

    return await db.queryMany<Role>(
      `SELECT * FROM roles
       WHERE organization_id IS NULL AND is_system = true
       ORDER BY name`
    );
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    return await db.queryOne<Role>('SELECT * FROM roles WHERE id = $1', [
      roleId,
    ]);
  }

  /**
   * Evaluate conditions for ABAC
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      // Simple equality check
      if (context[key] !== value) {
        // Check for operators
        if (typeof value === 'object' && value !== null) {
          // Handle operators like { $eq, $ne, $gt, $lt, $in, etc. }
          for (const [operator, operand] of Object.entries(value)) {
            switch (operator) {
              case '$eq':
                if (context[key] !== operand) return false;
                break;
              case '$ne':
                if (context[key] === operand) return false;
                break;
              case '$gt':
                if (!(context[key] > operand)) return false;
                break;
              case '$gte':
                if (!(context[key] >= operand)) return false;
                break;
              case '$lt':
                if (!(context[key] < operand)) return false;
                break;
              case '$lte':
                if (!(context[key] <= operand)) return false;
                break;
              case '$in':
                if (!Array.isArray(operand) || !operand.includes(context[key]))
                  return false;
                break;
              case '$nin':
                if (Array.isArray(operand) && operand.includes(context[key]))
                  return false;
                break;
              default:
                return false;
            }
          }
        } else {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Clear role cache
   */
  private async clearRoleCache(roleId: string): Promise<void> {
    // Get all users with this role
    const users = await db.queryMany<{ user_id: string }>(
      `SELECT DISTINCT gm.user_id
       FROM group_memberships gm
       INNER JOIN group_roles gr ON gm.group_id = gr.group_id
       WHERE gr.role_id = $1`,
      [roleId]
    );

    // Clear permission cache for each user
    for (const user of users) {
      await cache.deletePattern(`perm:${user.user_id}:*`);
    }
  }

  /**
   * Bulk permission check (for optimization)
   */
  async checkPermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const perm of permissions) {
      const key = `${perm.resource}:${perm.action}`;
      results[key] = await this.checkPermission({
        userId,
        resource: perm.resource,
        action: perm.action,
      });
    }

    return results;
  }
}
