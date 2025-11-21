/**
 * NEXUS IDaaS - Type Definitions
 * Enterprise-grade identity and access management types
 */

// ==================== User Types ====================

export interface User {
  id: string;
  email: string;
  username?: string;
  passwordHash?: string; // Optional for SSO-only users
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatar?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaMethod?: MFAMethod;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  LOCKED = 'locked',
  DELETED = 'deleted'
}

export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backup_codes'
}

export interface CreateUserRequest {
  email: string;
  password?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  metadata?: Record<string, any>;
  organizationId?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

// ==================== Organization Types ====================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  plan: PlanType;
  status: OrgStatus;
  settings: OrgSettings;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrgStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  DELETED = 'deleted'
}

export enum PlanType {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export interface OrgSettings {
  ssoEnabled: boolean;
  mfaRequired: boolean;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number; // minutes
  ipWhitelist?: string[];
  allowedDomains?: string[];
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge?: number; // days
  preventReuse?: number; // last N passwords
}

// ==================== Group & Role Types ====================

export interface Group {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  roles: string[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  resource: string; // e.g., "users", "organizations", "billing"
  action: string; // e.g., "read", "write", "delete", "manage"
  conditions?: Record<string, any>;
}

// ==================== Authentication Types ====================

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
  requiresMfa: boolean;
  mfaToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  organizationId?: string;
  roles?: string[];
  type: TokenType;
  iat: number;
  exp: number;
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  MFA = 'mfa',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset'
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  organizations: OrganizationMembership[];
}

export interface OrganizationMembership {
  id: string;
  name: string;
  slug: string;
  role: string;
  permissions: string[];
}

// ==================== Session Types ====================

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface DeviceInfo {
  id?: string;
  type: DeviceType;
  name?: string;
  os?: string;
  browser?: string;
  fingerprint?: string;
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown'
}

// ==================== MFA Types ====================

export interface MFAEnrollmentRequest {
  method: MFAMethod;
  phoneNumber?: string; // For SMS
  email?: string; // For email OTP
}

export interface MFAEnrollmentResponse {
  secret?: string; // For TOTP
  qrCode?: string; // For TOTP
  backupCodes?: string[]; // Backup codes
}

export interface MFAVerificationRequest {
  code: string;
  mfaToken?: string;
}

// ==================== OAuth & SSO Types ====================

export interface OAuthProvider {
  id: string;
  name: string;
  type: OAuthProviderType;
  clientId: string;
  clientSecret: string;
  authorizationURL: string;
  tokenURL: string;
  userInfoURL: string;
  scope: string[];
  enabled: boolean;
}

export enum OAuthProviderType {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  GITHUB = 'github',
  LINKEDIN = 'linkedin',
  CUSTOM = 'custom'
}

export interface SAMLConfig {
  id: string;
  organizationId: string;
  entityId: string;
  ssoURL: string;
  sloURL?: string;
  certificate: string;
  signRequests: boolean;
  enabled: boolean;
}

// ==================== LDAP Types ====================

export interface LDAPConfig {
  id: string;
  organizationId: string;
  url: string;
  bindDN: string;
  bindPassword: string;
  searchBase: string;
  searchFilter: string;
  userAttributes: LDAPAttributeMapping;
  syncEnabled: boolean;
  syncInterval: number; // minutes
  lastSyncAt?: Date;
}

export interface LDAPAttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber?: string;
}

// ==================== Audit Log Types ====================

export interface AuditLog {
  id: string;
  userId?: string;
  organizationId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: AuditStatus;
  createdAt: Date;
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_SUSPENDED = 'user_suspended',
  USER_ACTIVATED = 'user_activated',
  ORG_CREATED = 'org_created',
  ORG_UPDATED = 'org_updated',
  ORG_DELETED = 'org_deleted',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REVOKED = 'role_revoked',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  SSO_CONFIGURED = 'sso_configured',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked'
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  BLOCKED = 'blocked'
}

// ==================== API Key Types ====================

export interface APIKey {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  key: string; // Hashed
  keyPrefix: string; // First 8 chars for display
  scopes: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  revokedAt?: Date;
}

// ==================== Webhook Types ====================

export interface Webhook {
  id: string;
  organizationId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  enabled: boolean;
  failureCount: number;
  lastTriggeredAt?: Date;
  createdAt: Date;
}

export enum WebhookEvent {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  ORG_CREATED = 'organization.created',
  ORG_UPDATED = 'organization.updated'
}

// ==================== Error Types ====================

export class IDaaSError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'IDaaSError';
  }
}

export enum ErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  USER_ALREADY_EXISTS = 'user_already_exists',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_SUSPENDED = 'account_suspended',
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
  MFA_REQUIRED = 'mfa_required',
  INVALID_MFA_CODE = 'invalid_mfa_code',
  WEAK_PASSWORD = 'weak_password',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  ORGANIZATION_NOT_FOUND = 'organization_not_found',
  INVALID_REQUEST = 'invalid_request',
  INTERNAL_ERROR = 'internal_error'
}

// ==================== Response Types ====================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchUsersRequest extends PaginatedRequest {
  query?: string;
  organizationId?: string;
  status?: UserStatus;
  emailVerified?: boolean;
}
