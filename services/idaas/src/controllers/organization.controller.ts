/**
 * NEXUS IDaaS - Organization Controller
 */

import { Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';

const organizationService = new OrganizationService();

/**
 * List organizations
 * GET /api/v1/organizations
 */
export async function listOrganizations(req: Request, res: Response): Promise<void> {
  const options = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    status: req.query.status as any,
    plan: req.query.plan as any,
  };

  const result = await organizationService.list(options);

  res.json({
    success: true,
    data: result.organizations,
    meta: {
      pagination: {
        page: result.page,
        limit: options.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  });
}

/**
 * Create organization
 * POST /api/v1/organizations
 */
export async function createOrganization(req: Request, res: Response): Promise<void> {
  const createdBy = req.user?.userId;

  const org = await organizationService.create(req.body, createdBy);

  res.status(201).json({
    success: true,
    data: org,
  });
}

/**
 * Get organization by ID
 * GET /api/v1/organizations/:id
 */
export async function getOrganization(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const org = await organizationService.getById(id);

  if (!org) {
    res.status(404).json({
      success: false,
      error: {
        code: 'organization_not_found',
        message: 'Organization not found',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: org,
  });
}

/**
 * Update organization
 * PUT /api/v1/organizations/:id
 */
export async function updateOrganization(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const updatedBy = req.user?.userId;

  const org = await organizationService.update(id, req.body, updatedBy);

  res.json({
    success: true,
    data: org,
  });
}

/**
 * Delete organization
 * DELETE /api/v1/organizations/:id
 */
export async function deleteOrganization(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const deletedBy = req.user?.userId;

  await organizationService.delete(id, deletedBy);

  res.json({
    success: true,
    data: {
      message: 'Organization deleted successfully',
    },
  });
}

/**
 * Add member to organization
 * POST /api/v1/organizations/:id/members
 */
export async function addMember(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { userId, role } = req.body;
  const addedBy = req.user?.userId;

  await organizationService.addMember(id, userId, role, addedBy);

  res.json({
    success: true,
    data: {
      message: 'Member added successfully',
    },
  });
}

/**
 * Remove member from organization
 * DELETE /api/v1/organizations/:id/members/:userId
 */
export async function removeMember(req: Request, res: Response): Promise<void> {
  const { id, userId } = req.params;
  const removedBy = req.user?.userId;

  await organizationService.removeMember(id, userId, removedBy);

  res.json({
    success: true,
    data: {
      message: 'Member removed successfully',
    },
  });
}

/**
 * Update member role
 * PATCH /api/v1/organizations/:id/members/:userId
 */
export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const { id, userId } = req.params;
  const { role } = req.body;
  const updatedBy = req.user?.userId;

  await organizationService.updateMemberRole(id, userId, role, updatedBy);

  res.json({
    success: true,
    data: {
      message: 'Member role updated successfully',
    },
  });
}

/**
 * Get organization members
 * GET /api/v1/organizations/:id/members
 */
export async function getMembers(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const options = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    role: req.query.role as string,
  };

  const result = await organizationService.getMembers(id, options);

  res.json({
    success: true,
    data: result.members,
    meta: {
      pagination: {
        page: result.page,
        limit: options.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  });
}

/**
 * Get organization statistics
 * GET /api/v1/organizations/:id/stats
 */
export async function getOrganizationStats(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const stats = await organizationService.getStats(id);

  res.json({
    success: true,
    data: stats,
  });
}
