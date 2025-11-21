/**
 * NEXUS IDaaS - User Management Controller
 */

import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserRequest, UpdateUserRequest, SearchUsersRequest } from '../types';

const userService = new UserService();

/**
 * Get all users
 * GET /api/v1/users
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  const params: SearchUsersRequest = {
    query: req.query.query as string,
    organizationId: req.query.organizationId as string,
    status: req.query.status as any,
    emailVerified: req.query.emailVerified === 'true' ? true : req.query.emailVerified === 'false' ? false : undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    sortBy: (req.query.sortBy as string) || 'created_at',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
  };

  const result = await userService.search(params);

  res.json({
    success: true,
    data: result.users,
    meta: {
      pagination: {
        page: result.page,
        limit: params.limit || 20,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  });
}

/**
 * Create user
 * POST /api/v1/users
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  const data: CreateUserRequest = req.body;
  const createdBy = req.user?.userId;

  const user = await userService.create(data, createdBy);

  res.status(201).json({
    success: true,
    data: user,
  });
}

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const user = await userService.getById(id);

  if (!user) {
    res.status(404).json({
      success: false,
      error: {
        code: 'user_not_found',
        message: 'User not found',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
}

/**
 * Update user
 * PUT /api/v1/users/:id
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data: UpdateUserRequest = req.body;
  const updatedBy = req.user?.userId;

  const user = await userService.update(id, data, updatedBy);

  res.json({
    success: true,
    data: user,
  });
}

/**
 * Delete user
 * DELETE /api/v1/users/:id
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const deletedBy = req.user?.userId;

  await userService.delete(id, deletedBy);

  res.json({
    success: true,
    data: { message: 'User deleted successfully' },
  });
}

/**
 * Suspend user
 * POST /api/v1/users/:id/suspend
 */
export async function suspendUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const suspendedBy = req.user?.userId;

  await userService.suspend(id, suspendedBy);

  res.json({
    success: true,
    data: { message: 'User suspended successfully' },
  });
}

/**
 * Activate user
 * POST /api/v1/users/:id/activate
 */
export async function activateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const activatedBy = req.user?.userId;

  await userService.activate(id, activatedBy);

  res.json({
    success: true,
    data: { message: 'User activated successfully' },
  });
}

/**
 * Get user's organizations
 * GET /api/v1/users/:id/organizations
 */
export async function getUserOrganizations(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const organizations = await userService.getUserOrganizations(id);

  res.json({
    success: true,
    data: organizations,
  });
}

/**
 * Get user's sessions
 * GET /api/v1/users/:id/sessions
 */
export async function getUserSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const sessions = await userService.getUserSessions(id);

  res.json({
    success: true,
    data: sessions,
  });
}

/**
 * Revoke user session
 * DELETE /api/v1/users/:id/sessions/:sessionId
 */
export async function revokeSession(req: Request, res: Response): Promise<void> {
  const { id, sessionId } = req.params;

  await userService.revokeSession(id, sessionId);

  res.json({
    success: true,
    data: { message: 'Session revoked successfully' },
  });
}

/**
 * Revoke all user sessions
 * DELETE /api/v1/users/:id/sessions
 */
export async function revokeAllSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  await userService.revokeAllSessions(id);

  res.json({
    success: true,
    data: { message: 'All sessions revoked successfully' },
  });
}

/**
 * Get user statistics
 * GET /api/v1/users/stats
 */
export async function getUserStats(req: Request, res: Response): Promise<void> {
  const stats = await userService.getStats();

  res.json({
    success: true,
    data: stats,
  });
}
