/**
 * NEXUS IDaaS - API Routes
 */

import { Router } from 'express';
import { authenticate, optionalAuthenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

// Import controllers
import * as authController from '../controllers/auth.controller';
import * as userController from '../controllers/user.controller';
import * as oauthController from '../controllers/oauth.controller';
import * as organizationController from '../controllers/organization.controller';

const router = Router();

// ==================== Health Check ====================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'nexus-idaas',
      version: '1.0.0',
    },
  });
});

// ==================== Authentication Routes ====================

// Public routes
router.post('/auth/register', asyncHandler(authController.register));
router.post('/auth/login', asyncHandler(authController.login));
router.post('/auth/verify-email', asyncHandler(authController.verifyEmail));
router.post('/auth/forgot-password', asyncHandler(authController.forgotPassword));
router.post('/auth/reset-password', asyncHandler(authController.resetPassword));
router.post('/auth/refresh', asyncHandler(authController.refresh));

// Protected routes
router.post('/auth/logout', authenticate, asyncHandler(authController.logout));
router.post('/auth/change-password', authenticate, asyncHandler(authController.changePassword));
router.get('/auth/me', authenticate, asyncHandler(authController.getProfile));

// MFA routes
router.post('/auth/mfa/enroll', authenticate, asyncHandler(authController.enrollMFA));
router.post('/auth/mfa/verify-enrollment', authenticate, asyncHandler(authController.verifyMFAEnrollment));
router.post('/auth/mfa/disable', authenticate, asyncHandler(authController.disableMFA));
router.post('/auth/mfa/sms/send', authenticate, asyncHandler(authController.sendSMSCode));
router.get('/auth/mfa/backup-codes', authenticate, asyncHandler(authController.getBackupCodes));
router.post('/auth/mfa/backup-codes/regenerate', authenticate, asyncHandler(authController.regenerateBackupCodes));

// ==================== User Routes ====================

// List and search users
router.get('/users', authenticate, asyncHandler(userController.getUsers));
router.get('/users/stats', authenticate, asyncHandler(userController.getUserStats));

// CRUD operations
router.post('/users', authenticate, asyncHandler(userController.createUser));
router.get('/users/:id', authenticate, asyncHandler(userController.getUserById));
router.put('/users/:id', authenticate, asyncHandler(userController.updateUser));
router.delete('/users/:id', authenticate, asyncHandler(userController.deleteUser));

// User management
router.post('/users/:id/suspend', authenticate, asyncHandler(userController.suspendUser));
router.post('/users/:id/activate', authenticate, asyncHandler(userController.activateUser));

// User relationships
router.get('/users/:id/organizations', authenticate, asyncHandler(userController.getUserOrganizations));

// Session management
router.get('/users/:id/sessions', authenticate, asyncHandler(userController.getUserSessions));
router.delete('/users/:id/sessions/:sessionId', authenticate, asyncHandler(userController.revokeSession));
router.delete('/users/:id/sessions', authenticate, asyncHandler(userController.revokeAllSessions));

// ==================== OAuth Routes ====================

// Initiate OAuth flow
router.get('/oauth/:provider', asyncHandler(oauthController.initiateOAuth));

// OAuth callback
router.get('/oauth/:provider/callback', asyncHandler(oauthController.handleOAuthCallback));

// Get user's OAuth connections
router.get('/oauth/connections', authenticate, asyncHandler(oauthController.getConnections));

// Disconnect OAuth provider
router.delete('/oauth/:provider', authenticate, asyncHandler(oauthController.disconnectOAuth));

// ==================== Organization Routes ====================

// List organizations
router.get('/organizations', authenticate, asyncHandler(organizationController.listOrganizations));

// Create organization
router.post('/organizations', authenticate, asyncHandler(organizationController.createOrganization));

// Get organization
router.get('/organizations/:id', authenticate, asyncHandler(organizationController.getOrganization));

// Update organization
router.put('/organizations/:id', authenticate, asyncHandler(organizationController.updateOrganization));

// Delete organization
router.delete('/organizations/:id', authenticate, asyncHandler(organizationController.deleteOrganization));

// Organization members
router.get('/organizations/:id/members', authenticate, asyncHandler(organizationController.getMembers));
router.post('/organizations/:id/members', authenticate, asyncHandler(organizationController.addMember));
router.delete('/organizations/:id/members/:userId', authenticate, asyncHandler(organizationController.removeMember));
router.patch('/organizations/:id/members/:userId', authenticate, asyncHandler(organizationController.updateMemberRole));

// Organization stats
router.get('/organizations/:id/stats', authenticate, asyncHandler(organizationController.getOrganizationStats));

// ==================== Roles & Permissions (Authorization) ====================

// Roles will be managed through a separate controller (to be added)
// For now, these are placeholders
router.get('/roles', authenticate, (req, res) => {
  res.json({ success: true, data: [], message: 'Roles management - coming soon' });
});

router.post('/roles', authenticate, (req, res) => {
  res.json({ success: true, message: 'Roles management - coming soon' });
});

// ==================== Webhooks ====================

// Webhook management will be added through a separate controller (to be added)
router.get('/webhooks', authenticate, (req, res) => {
  res.json({ success: true, data: [], message: 'Webhooks - coming soon' });
});

router.post('/webhooks', authenticate, (req, res) => {
  res.json({ success: true, message: 'Webhooks - coming soon' });
});

// ==================== Groups Routes (placeholder) ====================

// TODO: Implement groups routes
router.get('/groups', authenticate, (req, res) => {
  res.json({ success: true, data: [], message: 'Coming soon' });
});

// ==================== Audit Log Routes (placeholder) ====================

// TODO: Implement audit log routes
router.get('/audit-logs', authenticate, (req, res) => {
  res.json({ success: true, data: [], message: 'Coming soon' });
});

export default router;
