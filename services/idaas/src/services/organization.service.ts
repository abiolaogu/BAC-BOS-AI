/**
 * NEXUS IDaaS - Organization Management Service
 * Multi-tenancy support with organizations
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Organization,
  OrgStatus,
  PlanType,
  OrgSettings,
  IDaaSError,
  ErrorCode,
} from '../types';
import { db } from '../database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';

interface CreateOrganizationRequest {
  name: string;
  domain?: string;
  plan?: PlanType;
  settings?: Partial<OrgSettings>;
  metadata?: Record<string, any>;
}

interface UpdateOrganizationRequest {
  name?: string;
  domain?: string;
  logo?: string;
  plan?: PlanType;
  settings?: Partial<OrgSettings>;
  metadata?: Record<string, any>;
}

export class OrganizationService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Get organization by ID
   */
  async getById(orgId: string): Promise<Organization | null> {
    // Try cache first
    const cached = await cache.get<Organization>(`org:${orgId}`);
    if (cached) {
      return cached;
    }

    const org = await db.queryOne<Organization>(
      'SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL',
      [orgId]
    );

    if (org) {
      await cache.set(`org:${orgId}`, org, 300); // 5 minutes
    }

    return org;
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    return await db.queryOne<Organization>(
      'SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
  }

  /**
   * Create organization
   */
  async create(
    data: CreateOrganizationRequest,
    createdBy?: string
  ): Promise<Organization> {
    // Generate slug from name
    const slug = this.generateSlug(data.name);

    // Check if slug already exists
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Organization with this name already exists',
        409
      );
    }

    // Default settings
    const defaultSettings: OrgSettings = {
      ssoEnabled: false,
      mfaRequired: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90,
        preventReuse: 5,
      },
      sessionTimeout: 60,
      ipWhitelist: [],
      allowedDomains: data.domain ? [data.domain] : [],
    };

    const settings = { ...defaultSettings, ...data.settings };

    // Create organization
    const org = await db.queryOne<Organization>(
      `INSERT INTO organizations (
        name, slug, domain, plan, settings, metadata, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.name,
        slug,
        data.domain || null,
        data.plan || PlanType.FREE,
        JSON.stringify(settings),
        JSON.stringify(data.metadata || {}),
        OrgStatus.ACTIVE,
      ]
    );

    if (!org) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create organization',
        500
      );
    }

    // Cache organization
    await cache.set(`org:${org.id}`, org, 300);

    // Audit log
    await this.auditService.log({
      userId: createdBy,
      organizationId: org.id,
      action: 'org_created',
      resource: 'organizations',
      resourceId: org.id,
      status: 'success',
      details: { name: org.name, slug: org.slug },
    });

    logger.info('Organization created', { orgId: org.id, slug: org.slug });

    return org;
  }

  /**
   * Update organization
   */
  async update(
    orgId: string,
    data: UpdateOrganizationRequest,
    updatedBy?: string
  ): Promise<Organization> {
    const org = await this.getById(orgId);
    if (!org) {
      throw new IDaaSError(
        ErrorCode.ORGANIZATION_NOT_FOUND,
        'Organization not found',
        404
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.domain !== undefined) {
      updates.push(`domain = $${paramIndex++}`);
      values.push(data.domain);
    }

    if (data.logo !== undefined) {
      updates.push(`logo = $${paramIndex++}`);
      values.push(data.logo);
    }

    if (data.plan !== undefined) {
      updates.push(`plan = $${paramIndex++}`);
      values.push(data.plan);
    }

    if (data.settings !== undefined) {
      const newSettings = { ...org.settings, ...data.settings };
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(newSettings));
    }

    if (data.metadata !== undefined) {
      const newMetadata = { ...org.metadata, ...data.metadata };
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(newMetadata));
    }

    if (updates.length === 0) {
      return org; // Nothing to update
    }

    values.push(orgId);

    const updatedOrg = await db.queryOne<Organization>(
      `UPDATE organizations
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!updatedOrg) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update organization',
        500
      );
    }

    // Update cache
    await cache.set(`org:${orgId}`, updatedOrg, 300);

    // Audit log
    await this.auditService.log({
      userId: updatedBy,
      organizationId: orgId,
      action: 'org_updated',
      resource: 'organizations',
      resourceId: orgId,
      status: 'success',
      details: data,
    });

    logger.info('Organization updated', { orgId });

    return updatedOrg;
  }

  /**
   * Delete organization (soft delete)
   */
  async delete(orgId: string, deletedBy?: string): Promise<void> {
    const org = await this.getById(orgId);
    if (!org) {
      throw new IDaaSError(
        ErrorCode.ORGANIZATION_NOT_FOUND,
        'Organization not found',
        404
      );
    }

    await db.query(
      'UPDATE organizations SET deleted_at = NOW() WHERE id = $1',
      [orgId]
    );

    // Clear cache
    await cache.delete(`org:${orgId}`);

    // Audit log
    await this.auditService.log({
      userId: deletedBy,
      organizationId: orgId,
      action: 'org_deleted',
      resource: 'organizations',
      resourceId: orgId,
      status: 'success',
    });

    logger.info('Organization deleted', { orgId });
  }

  /**
   * Add user to organization
   */
  async addMember(
    orgId: string,
    userId: string,
    role: string = 'member',
    addedBy?: string
  ): Promise<void> {
    // Check if org exists
    const org = await this.getById(orgId);
    if (!org) {
      throw new IDaaSError(
        ErrorCode.ORGANIZATION_NOT_FOUND,
        'Organization not found',
        404
      );
    }

    // Check if user exists
    const userExists = await db.exists('users', { id: userId });
    if (!userExists) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found',
        404
      );
    }

    // Check if already a member
    const alreadyMember = await db.queryOne(
      `SELECT id FROM organization_memberships
       WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId]
    );

    if (alreadyMember) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'User is already a member of this organization',
        409
      );
    }

    // Add membership
    await db.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role)
       VALUES ($1, $2, $3)`,
      [userId, orgId, role]
    );

    // Audit log
    await this.auditService.log({
      userId: addedBy,
      organizationId: orgId,
      action: 'user_added_to_org',
      resource: 'organizations',
      resourceId: orgId,
      status: 'success',
      details: { userId, role },
    });

    logger.info('User added to organization', { orgId, userId, role });
  }

  /**
   * Remove user from organization
   */
  async removeMember(
    orgId: string,
    userId: string,
    removedBy?: string
  ): Promise<void> {
    await db.query(
      `DELETE FROM organization_memberships
       WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId]
    );

    // Audit log
    await this.auditService.log({
      userId: removedBy,
      organizationId: orgId,
      action: 'user_removed_from_org',
      resource: 'organizations',
      resourceId: orgId,
      status: 'success',
      details: { userId },
    });

    logger.info('User removed from organization', { orgId, userId });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    userId: string,
    newRole: string,
    updatedBy?: string
  ): Promise<void> {
    await db.query(
      `UPDATE organization_memberships
       SET role = $1
       WHERE user_id = $2 AND organization_id = $3`,
      [newRole, userId, orgId]
    );

    // Audit log
    await this.auditService.log({
      userId: updatedBy,
      organizationId: orgId,
      action: 'member_role_updated',
      resource: 'organizations',
      resourceId: orgId,
      status: 'success',
      details: { userId, newRole },
    });

    logger.info('Member role updated', { orgId, userId, newRole });
  }

  /**
   * Get organization members
   */
  async getMembers(
    orgId: string,
    options: {
      page?: number;
      limit?: number;
      role?: string;
    } = {}
  ): Promise<{
    members: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, role } = options;

    const conditions: string[] = ['om.organization_id = $1'];
    const values: any[] = [orgId];
    let paramIndex = 2;

    if (role) {
      conditions.push(`om.role = $${paramIndex++}`);
      values.push(role);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM organization_memberships om
       WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get members
    const offset = (page - 1) * limit;
    const members = await db.queryMany(
      `SELECT
        u.id, u.email, u.first_name, u.last_name, u.avatar,
        u.status, u.email_verified, om.role, om.joined_at
       FROM organization_memberships om
       JOIN users u ON om.user_id = u.id
       WHERE ${whereClause}
       ORDER BY om.joined_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      members,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List organizations
   */
  async list(
    options: {
      page?: number;
      limit?: number;
      status?: OrgStatus;
      plan?: PlanType;
    } = {}
  ): Promise<{
    organizations: Organization[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, plan } = options;

    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (plan) {
      conditions.push(`plan = $${paramIndex++}`);
      values.push(plan);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM organizations WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get organizations
    const offset = (page - 1) * limit;
    const organizations = await db.queryMany<Organization>(
      `SELECT * FROM organizations
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      organizations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get organization statistics
   */
  async getStats(orgId: string): Promise<{
    memberCount: number;
    activeUsers: number;
    pendingUsers: number;
    createdAt: Date;
  }> {
    const stats = await db.queryOne<any>(
      `SELECT
        COUNT(DISTINCT om.user_id) as member_count,
        COUNT(DISTINCT CASE WHEN u.status = 'active' THEN om.user_id END) as active_users,
        COUNT(DISTINCT CASE WHEN u.status = 'pending' THEN om.user_id END) as pending_users
       FROM organization_memberships om
       LEFT JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1`,
      [orgId]
    );

    const org = await this.getById(orgId);

    return {
      memberCount: parseInt(stats?.member_count || '0', 10),
      activeUsers: parseInt(stats?.active_users || '0', 10),
      pendingUsers: parseInt(stats?.pending_users || '0', 10),
      createdAt: org?.createdAt || new Date(),
    };
  }

  /**
   * Generate slug from organization name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
