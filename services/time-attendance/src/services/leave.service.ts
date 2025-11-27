/**
 * NEXUS Time & Attendance - Leave Management Service
 */

import { v4 as uuidv4 } from 'uuid';
import {
  differenceInDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isWeekend,
} from 'date-fns';
import {
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  LeaveStatus,
  LeaveRequestCreate,
  LeaveApprovalRequest,
  TimeAttendanceError,
  ErrorCode,
} from '../types';
import { db } from '../utils/database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';

export class LeaveService {
  /**
   * Create leave request
   */
  async createLeaveRequest(
    request: LeaveRequestCreate,
    attachmentPath?: string
  ): Promise<LeaveRequest> {
    const { userId, leaveType, startDate, endDate, reason } = request;

    // Calculate total days (excluding weekends)
    const totalDays = this.calculateLeaveDays(startDate, endDate);

    if (totalDays <= 0) {
      throw new TimeAttendanceError(
        ErrorCode.INVALID_REQUEST,
        'Invalid leave date range',
        400
      );
    }

    // Check leave balance
    const balance = await this.getLeaveBalance(userId, leaveType);
    if (!balance || balance.availableDays < totalDays) {
      throw new TimeAttendanceError(
        ErrorCode.LEAVE_BALANCE_INSUFFICIENT,
        `Insufficient leave balance. Available: ${balance?.availableDays || 0} days, Requested: ${totalDays} days`,
        400
      );
    }

    // Check for overlapping leave requests
    const overlapping = await db.queryOne(
      `SELECT id FROM leave_requests
       WHERE user_id = $1
         AND status NOT IN ('rejected', 'cancelled')
         AND (
           (start_date <= $2 AND end_date >= $2) OR
           (start_date <= $3 AND end_date >= $3) OR
           (start_date >= $2 AND end_date <= $3)
         )`,
      [userId, startDate, endDate]
    );

    if (overlapping) {
      throw new TimeAttendanceError(
        ErrorCode.CONFLICT,
        'Overlapping leave request already exists',
        409
      );
    }

    // Create leave request
    const leaveRequest = await db.queryOne<LeaveRequest>(
      `INSERT INTO leave_requests (
        id, user_id, leave_type, start_date, end_date,
        total_days, reason, status, attachment_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        uuidv4(),
        userId,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason,
        LeaveStatus.PENDING,
        attachmentPath,
      ]
    );

    if (!leaveRequest) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create leave request',
        500
      );
    }

    logger.info('Leave request created', {
      leaveRequestId: leaveRequest.id,
      userId,
      leaveType,
      totalDays,
    });

    return leaveRequest;
  }

  /**
   * Approve or reject leave request
   */
  async reviewLeaveRequest(
    review: LeaveApprovalRequest
  ): Promise<LeaveRequest> {
    const { requestId, approved, reviewedBy, comments } = review;

    // Get leave request
    const leaveRequest = await db.queryOne<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [requestId]
    );

    if (!leaveRequest) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Leave request not found',
        404
      );
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new TimeAttendanceError(
        ErrorCode.INVALID_REQUEST,
        `Leave request is already ${leaveRequest.status}`,
        400
      );
    }

    const newStatus = approved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;

    // Update leave request
    const updated = await db.queryOne<LeaveRequest>(
      `UPDATE leave_requests
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           review_comments = $3
       WHERE id = $4
       RETURNING *`,
      [newStatus, reviewedBy, comments, requestId]
    );

    if (!updated) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update leave request',
        500
      );
    }

    // Update leave balance if approved
    if (approved) {
      await this.deductLeaveBalance(
        leaveRequest.userId,
        leaveRequest.leaveType,
        leaveRequest.totalDays
      );
    }

    logger.info('Leave request reviewed', {
      leaveRequestId: requestId,
      status: newStatus,
      reviewedBy,
    });

    return updated;
  }

  /**
   * Cancel leave request
   */
  async cancelLeaveRequest(
    requestId: string,
    userId: string
  ): Promise<LeaveRequest> {
    const leaveRequest = await db.queryOne<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE id = $1 AND user_id = $2',
      [requestId, userId]
    );

    if (!leaveRequest) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Leave request not found',
        404
      );
    }

    if (leaveRequest.status === LeaveStatus.CANCELLED) {
      throw new TimeAttendanceError(
        ErrorCode.INVALID_REQUEST,
        'Leave request is already cancelled',
        400
      );
    }

    // Update status
    const updated = await db.queryOne<LeaveRequest>(
      `UPDATE leave_requests
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [LeaveStatus.CANCELLED, requestId]
    );

    if (!updated) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to cancel leave request',
        500
      );
    }

    // Restore leave balance if it was approved
    if (leaveRequest.status === LeaveStatus.APPROVED) {
      await this.restoreLeaveBalance(
        leaveRequest.userId,
        leaveRequest.leaveType,
        leaveRequest.totalDays
      );
    }

    logger.info('Leave request cancelled', {
      leaveRequestId: requestId,
      userId,
    });

    return updated;
  }

  /**
   * Get leave balance for user
   */
  async getLeaveBalance(
    userId: string,
    leaveType: LeaveType
  ): Promise<LeaveBalance | null> {
    const currentYear = new Date().getFullYear();

    return await db.queryOne<LeaveBalance>(
      `SELECT * FROM leave_balances
       WHERE user_id = $1 AND leave_type = $2 AND year = $3`,
      [userId, leaveType, currentYear]
    );
  }

  /**
   * Get all leave balances for user
   */
  async getAllLeaveBalances(userId: string): Promise<LeaveBalance[]> {
    const currentYear = new Date().getFullYear();

    return await db.queryMany<LeaveBalance>(
      `SELECT * FROM leave_balances
       WHERE user_id = $1 AND year = $2
       ORDER BY leave_type`,
      [userId, currentYear]
    );
  }

  /**
   * Initialize leave balances for user
   */
  async initializeLeaveBalances(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const currentYear = new Date().getFullYear();

    // Get organization's leave policy
    const policy = await db.queryOne<any>(
      'SELECT leave_policy FROM organizations WHERE id = $1',
      [organizationId]
    );

    const leavePolicy = policy?.leave_policy || {
      annual: 20,
      sick: 10,
      personal: 5,
    };

    // Create leave balances
    for (const [type, totalDays] of Object.entries(leavePolicy)) {
      await db.query(
        `INSERT INTO leave_balances (
          id, user_id, leave_type, total_days, used_days,
          available_days, carried_forward, year
        ) VALUES ($1, $2, $3, $4, 0, $4, 0, $5)
        ON CONFLICT (user_id, leave_type, year) DO NOTHING`,
        [uuidv4(), userId, type, totalDays, currentYear]
      );
    }

    logger.info('Leave balances initialized', { userId, year: currentYear });
  }

  /**
   * Deduct leave balance
   */
  private async deductLeaveBalance(
    userId: string,
    leaveType: LeaveType,
    days: number
  ): Promise<void> {
    await db.query(
      `UPDATE leave_balances
       SET used_days = used_days + $1,
           available_days = available_days - $1,
           updated_at = NOW()
       WHERE user_id = $2 AND leave_type = $3 AND year = $4`,
      [days, userId, leaveType, new Date().getFullYear()]
    );

    // Clear cache
    await cache.delete(`leave:balance:${userId}:${leaveType}`);
  }

  /**
   * Restore leave balance
   */
  private async restoreLeaveBalance(
    userId: string,
    leaveType: LeaveType,
    days: number
  ): Promise<void> {
    await db.query(
      `UPDATE leave_balances
       SET used_days = used_days - $1,
           available_days = available_days + $1,
           updated_at = NOW()
       WHERE user_id = $2 AND leave_type = $3 AND year = $4`,
      [days, userId, leaveType, new Date().getFullYear()]
    );

    // Clear cache
    await cache.delete(`leave:balance:${userId}:${leaveType}`);
  }

  /**
   * Calculate leave days (excluding weekends)
   */
  private calculateLeaveDays(startDate: Date, endDate: Date): number {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter((day) => !isWeekend(day)).length;
  }

  /**
   * Get leave requests for user
   */
  async getUserLeaveRequests(
    userId: string,
    status?: LeaveStatus
  ): Promise<LeaveRequest[]> {
    if (status) {
      return await db.queryMany<LeaveRequest>(
        `SELECT * FROM leave_requests
         WHERE user_id = $1 AND status = $2
         ORDER BY requested_at DESC`,
        [userId, status]
      );
    }

    return await db.queryMany<LeaveRequest>(
      `SELECT * FROM leave_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [userId]
    );
  }

  /**
   * Get pending leave requests for approval
   */
  async getPendingLeaveRequests(
    organizationId: string
  ): Promise<LeaveRequest[]> {
    return await db.queryMany<LeaveRequest>(
      `SELECT lr.*, u.email, u.full_name
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE om.organization_id = $1
         AND lr.status = $2
       ORDER BY lr.requested_at`,
      [organizationId, LeaveStatus.PENDING]
    );
  }

  /**
   * Get leave calendar for team
   */
  async getLeaveCalendar(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return await db.queryMany(
      `SELECT lr.*, u.email, u.full_name
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE om.organization_id = $1
         AND lr.status = $2
         AND (
           (lr.start_date <= $4 AND lr.end_date >= $3) OR
           (lr.start_date >= $3 AND lr.start_date <= $4)
         )
       ORDER BY lr.start_date, u.full_name`,
      [organizationId, LeaveStatus.APPROVED, startDate, endDate]
    );
  }
}
