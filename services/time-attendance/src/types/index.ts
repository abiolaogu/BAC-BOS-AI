/**
 * NEXUS Time & Attendance - Type Definitions
 */

// ==================== Enums ====================

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
  WEEKEND = 'weekend',
  REMOTE = 'remote',
}

export enum CheckType {
  IN = 'in',
  OUT = 'out',
}

export enum VerificationMethod {
  FINGERPRINT = 'fingerprint',
  FACE = 'face',
  IRIS = 'iris',
  CARD = 'card',
  PIN = 'pin',
  MANUAL = 'manual',
  AGENT = 'agent',
}

export enum PolicyType {
  REGULAR = 'regular',
  FLEXIBLE = 'flexible',
  SHIFT_BASED = 'shift_based',
  REMOTE = 'remote',
}

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  UNPAID = 'unpaid',
  COMPENSATORY = 'compensatory',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum OvertimeStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export enum DeviceManufacturer {
  ZKTECO = 'zkteco',
  SUPREMA = 'suprema',
  HID_GLOBAL = 'hid_global',
  MORPHO = 'morpho',
  ANVIZ = 'anviz',
  GENERIC = 'generic',
}

export enum ActivityCategory {
  PRODUCTIVE = 'productive',
  COMMUNICATION = 'communication',
  NEUTRAL = 'neutral',
  UNPRODUCTIVE = 'unproductive',
  PERSONAL = 'personal',
}

export enum WebhookEvent {
  CHECK_IN = 'attendance.check_in',
  CHECK_OUT = 'attendance.check_out',
  LATE_ARRIVAL = 'attendance.late_arrival',
  EARLY_DEPARTURE = 'attendance.early_departure',
  ABSENCE = 'attendance.absence',
  LEAVE_REQUESTED = 'leave.requested',
  LEAVE_APPROVED = 'leave.approved',
  LEAVE_REJECTED = 'leave.rejected',
  OVERTIME_REQUESTED = 'overtime.requested',
  OVERTIME_APPROVED = 'overtime.approved',
  POLICY_VIOLATION = 'policy.violation',
}

export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  NOT_CHECKED_IN = 'NOT_CHECKED_IN',
  OUTSIDE_GEO_FENCE = 'OUTSIDE_GEO_FENCE',
  DEVICE_ERROR = 'DEVICE_ERROR',
  BIOMETRIC_MISMATCH = 'BIOMETRIC_MISMATCH',
  LEAVE_BALANCE_INSUFFICIENT = 'LEAVE_BALANCE_INSUFFICIENT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ==================== Core Entities ====================

export interface AttendancePolicy {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  policyType: PolicyType;
  workDays: number[]; // 0-6 (Sunday-Saturday)
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  graceTimeMinutes: number;
  lateThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  requireCheckout: boolean;
  allowRemoteWork: boolean;
  requireBiometric: boolean;
  geoFenceEnabled: boolean;
  geoFenceRadius?: number;
  geoFenceLatitude?: number;
  geoFenceLongitude?: number;
  overtimeEnabled: boolean;
  overtimeAutoApprove: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  policyId: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  workDays: number[];
  isRotating: boolean;
  rotationDays?: number;
  color?: string;
  createdAt: Date;
}

export interface UserPolicy {
  userId: string;
  policyId: string;
  shiftId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  assignedAt: Date;
  assignedBy: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  policyId: string;
  shiftId?: string;
  attendanceDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  checkInMethod?: VerificationMethod;
  checkOutMethod?: VerificationMethod;
  checkInDeviceId?: string;
  checkOutDeviceId?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  status: AttendanceStatus;
  workMinutes?: number;
  overtimeMinutes?: number;
  lateMinutes?: number;
  earlyDepartureMinutes?: number;
  breakMinutes?: number;
  isManualEntry: boolean;
  manualEntryReason?: string;
  manualEntryBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BiometricDevice {
  id: string;
  organizationId: string;
  locationId?: string;
  name: string;
  manufacturer: DeviceManufacturer;
  model: string;
  serialNumber: string;
  ipAddress: string;
  port: number;
  protocol: string; // tcp, http, serial
  apiKey?: string;
  status: DeviceStatus;
  capabilities: VerificationMethod[];
  maxUsers: number;
  currentUsers: number;
  firmwareVersion?: string;
  lastSyncAt?: Date;
  lastHeartbeatAt?: Date;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BiometricTemplate {
  id: string;
  userId: string;
  deviceId: string;
  templateType: VerificationMethod;
  templateData: Buffer;
  fingerIndex?: number; // For fingerprint
  quality: number;
  enrolledAt: Date;
  lastUsedAt?: Date;
}

export interface ActivityRecord {
  id: string;
  userId: string;
  activityTimestamp: Date;
  applicationName?: string;
  windowTitle?: string;
  url?: string;
  category?: ActivityCategory;
  productivityScore?: number;
  activeTimeSeconds: number;
  idleTimeSeconds: number;
  keystrokes?: number;
  mouseClicks?: number;
  screenshotPath?: string;
  isPersonalTime: boolean;
  deviceInfo?: Record<string, any>;
  createdAt: Date;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  availableDays: number;
  carriedForward: number;
  year: number;
  expiresAt?: Date;
  updatedAt: Date;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  requestedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;
  attachmentPath?: string;
}

export interface OvertimeRequest {
  id: string;
  userId: string;
  overtimeDate: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  reason: string;
  status: OvertimeStatus;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
}

export interface Holiday {
  id: string;
  organizationId: string;
  name: string;
  holidayDate: Date;
  isOptional: boolean;
  createdAt: Date;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

// ==================== Request/Response Types ====================

export interface CheckInRequest {
  userId: string;
  policyId: string;
  verificationMethod: VerificationMethod;
  deviceId?: string;
  biometricData?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface CheckOutRequest {
  userId: string;
  verificationMethod: VerificationMethod;
  deviceId?: string;
  biometricData?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ManualEntryRequest {
  userId: string;
  policyId: string;
  attendanceDate: Date;
  checkInTime: Date;
  checkOutTime?: Date;
  reason: string;
  approvedBy: string;
}

export interface LeaveRequestCreate {
  userId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  attachment?: Buffer;
}

export interface LeaveApprovalRequest {
  requestId: string;
  approved: boolean;
  reviewedBy: string;
  comments?: string;
}

export interface OvertimeRequestCreate {
  userId: string;
  overtimeDate: Date;
  startTime: Date;
  endTime: Date;
  reason: string;
}

export interface AttendanceReportQuery {
  organizationId?: string;
  userId?: string;
  startDate: Date;
  endDate: Date;
  status?: AttendanceStatus;
  policyId?: string;
  locationId?: string;
}

export interface ProductivityReportQuery {
  userId: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month';
}

// ==================== Statistics & Analytics ====================

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidays: number;
  weekends: number;
  attendanceRate: number;
  avgWorkHours: number;
  totalOvertimeHours: number;
}

export interface ProductivityStats {
  avgProductivityScore: number;
  totalActiveHours: number;
  totalIdleHours: number;
  productiveHours: number;
  communicationHours: number;
  neutralHours: number;
  unproductiveHours: number;
  topApplications: Array<{ name: string; hours: number; score: number }>;
  productivityTrend: Array<{ date: string; score: number }>;
}

// ==================== Webhook & Events ====================

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
  updatedAt: Date;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: any;
  organizationId: string;
}

// ==================== Error Handling ====================

export class TimeAttendanceError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'TimeAttendanceError';
    Object.setPrototypeOf(this, TimeAttendanceError.prototype);
  }
}

// ==================== Device Integration ====================

export interface DeviceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  syncUsers(): Promise<void>;
  syncAttendance(): Promise<AttendanceRecord[]>;
  enrollBiometric(
    userId: string,
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<void>;
  verifyBiometric(
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<{ userId: string; confidence: number }>;
  getDeviceInfo(): Promise<any>;
  testConnection(): Promise<boolean>;
}

export interface DeviceConfig {
  id: string;
  manufacturer: DeviceManufacturer;
  ipAddress: string;
  port: number;
  protocol: string;
  apiKey?: string;
  settings: Record<string, any>;
}

// ==================== Agent Communication ====================

export interface AgentHeartbeat {
  userId: string;
  agentVersion: string;
  osInfo: {
    platform: string;
    version: string;
    hostname: string;
  };
  timestamp: Date;
  isActive: boolean;
}

export interface AgentActivity {
  userId: string;
  activities: Array<{
    timestamp: Date;
    applicationName: string;
    windowTitle?: string;
    url?: string;
    activeTimeSeconds: number;
    idleTimeSeconds: number;
    keystrokes?: number;
    mouseClicks?: number;
  }>;
  screenshot?: {
    data: Buffer;
    timestamp: Date;
    isBlurred: boolean;
  };
}

// ==================== Configuration ====================

export interface TimeAttendanceConfig {
  database: {
    url: string;
    poolMin: number;
    poolMax: number;
  };
  redis: {
    url: string;
    password?: string;
    db: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  biometric: {
    pollInterval: number;
    maxRetryAttempts: number;
    connectionTimeout: number;
  };
  agent: {
    heartbeatInterval: number;
    activityUploadInterval: number;
    screenshotInterval: number;
    screenshotQuality: number;
  };
  productivity: {
    scoreProductive: number;
    scoreCommunication: number;
    scoreNeutral: number;
    scoreUnproductive: number;
  };
  notifications: {
    lateArrivalThreshold: number;
    earlyDepartureThreshold: number;
    overtimeThreshold: number;
  };
}
