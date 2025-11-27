/**
 * NEXUS Time & Attendance - Overtime Management Service
 */

import { v4 as uuidv4 } from 'uuid';
import { differenceInMinutes } from 'date-fns';
import {
  OvertimeRequest,
  OvertimeStatus,
  OvertimeRequestCreate,
  TimeAttendanceError,
  ErrorCode,
} from '../types';
import { db } from '../utils/database';
import { logger } from '../utils/logger';

export class OvertimeService {
  /**
   * Create overtime request
   */
  async createOvertimeRequest(
    request: OvertimeRequestCreate
  ): Promise<OvertimeRequest> {
    const { userId, overtimeDate, startTime, endTime, reason } = request;

    // Calculate duration
    const durationMinutes = differenceInMinutes(endTime, startTime);

    if (durationMinutes <= 0) {
      throw new TimeAttendanceError(
        ErrorCode.INVALID_REQUEST,
        'Invalid overtime time range',
        400
      );
    }

    // Check if user has attendance record for this date
    const attendanceExists = await db.exists('attendance_records', {
      user_id: userId,
      attendance_date: overtimeDate,
    });

    if (!attendanceExists) {
      throw new TimeAttendanceError(
        ErrorCode.INVALID_REQUEST,
        'No attendance record found for this date',
        400
      );
    }

    // Check for overlapping overtime requests
    const overlapping = await db.queryOne(
      `SELECT id FROM overtime_requests
       WHERE user_id = $1
         AND overtime_date = $2
         AND status != 'rejected'
         AND (
           (start_time <= $3 AND end_time >= $3) OR
           (start_time <= $4 AND end_time >= $4) OR
           (start_time >= $3 AND end_time <= $4)
         )`,
      [userId, overtimeDate, startTime, endTime]
    );

    if (overlapping) {
      throw new TimeAttendanceError(
        ErrorCode.CONFLICT,
        'Overlapping overtime request already exists',
        409
      );
    }

    // Get user's policy to check if auto-approve is enabled
    const policy = await db.queryOne<{ overtimeAutoApprove: boolean }>(
      `SELECT ap.overtime_auto_approve as "overtimeAutoApprove"
       FROM user_policies up
       JOIN attendance_policies ap ON up.policy_id = ap.id
       WHERE up.user_id = $1
         AND up.effective_from <= $2
         AND (up.effective_to IS NULL OR up.effective_to >= $2)
       LIMIT 1`,
      [userId, overtimeDate]
    );

    const status =
      policy?.overtimeAutoApprove
        ? OvertimeStatus.APPROVED
        : OvertimeStatus.PENDING;

    // Create overtime request
    const overtimeRequest = await db.queryOne<OvertimeRequest>(
      `INSERT INTO overtime_requests (
        id, user_id, overtime_date, start_time, end_time,
        duration_minutes, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        uuidv4(),
        userId,
        overtimeDate,
        startTime,
        endTime,
        durationMinutes,
        reason,
        status,
      ]
    );

    if (!overtimeRequest) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create overtime request',
        500
      );
    }

    // If auto-approved, update attendance record
    if (status === OvertimeStatus.APPROVED) {
      await this.updateAttendanceRecord(
        userId,
        overtimeDate,
        durationMinutes
      );
    }

    logger.info('Overtime request created', {
      overtimeRequestId: overtimeRequest.id,
      userId,
      durationMinutes,
      status,
    });

    return overtimeRequest;
  }

  /**
   * Approve overtime request
   */
  async approveOvertimeRequest(
    requestId: string,
    approvedBy: string,
    comments?: string
  ): Promise<OvertimeRequest> {
    // Get overtime request
    const overtimeRequest = await db.queryOne<OvertimeRequest>(
      'SELECT * FROM overtime_requests WHERE id = $1',
      [requestId]
    );

    if (!overtimeRequest) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Overtime request not found',
        404
      );
    }

    if (overtimeRequest.status !== OvertimeStatus.PENDING) {
      throw new TimeAttendanceError(
        ErrorCode.INVALID_REQUEST,
        `Overtime request is already ${overtimeRequest.status}`,
        400
      );
    }

    // Update overtime request
    const updated = await db.queryOne<OvertimeRequest>(
      `UPDATE overtime_requests
       SET status = $1,
           approved_by = $2,
           approved_at = NOW(),
           comments = $3
       WHERE id = $4
       RETURNING *`,
      [OvertimeStatus.APPROVED, approvedBy, comments, requestId]
    );

    if (!updated) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to approve overtime request',
        500
      );
    }

    // Update attendance record
    await this.updateAttendanceRecord(
      overtimeRequest.userId,
      overtimeRequest.overtimeDate,
      overtimeRequest.durationMinutes
    );

    logger.info('Overtime request approved', {
      overtimeRequestId: requestId,
      approvedBy,
    });

    return updated;
  }

  /**
   * Reject overtime request
   */
  async rejectOvertimeRequest(
    requestId: string,
    rejectedBy: string,
    comments?: string
  ): Promise<OvertimeRequest> {
    const overtimeRequest = await db.queryOne<OvertimeRequest>(
      'SELECT * FROM overtime_requests WHERE id = $1',
      [requestId]
    );

    if (!overtimeRequest) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Overtime request not found',
        404
      );
    }

    if (overtimeRequest.status !== OvertimeStatus.PENDING) {
      throw new TimeAttendanceError(
        ErrorCode.INVALID_REQUEST,
        `Overtime request is already ${overtimeRequest.status}`,
        400
      );
    }

    // Update overtime request
    const updated = await db.queryOne<OvertimeRequest>(
      `UPDATE overtime_requests
       SET status = $1,
           approved_by = $2,
           approved_at = NOW(),
           comments = $3
       WHERE id = $4
       RETURNING *`,
      [OvertimeStatus.REJECTED, rejectedBy, comments, requestId]
    );

    if (!updated) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to reject overtime request',
        500
      );
    }

    logger.info('Overtime request rejected', {
      overtimeRequestId: requestId,
      rejectedBy,
    });

    return updated;
  }

  /**
   * Update attendance record with overtime
   */
  private async updateAttendanceRecord(
    userId: string,
    overtimeDate: Date,
    durationMinutes: number
  ): Promise<void> {
    await db.query(
      `UPDATE attendance_records
       SET overtime_minutes = COALESCE(overtime_minutes, 0) + $1,
           updated_at = NOW()
       WHERE user_id = $2 AND attendance_date = $3`,
      [durationMinutes, userId, overtimeDate]
    );
  }

  /**
   * Get overtime requests for user
   */
  async getUserOvertimeRequests(
    userId: string,
    status?: OvertimeStatus
  ): Promise<OvertimeRequest[]> {
    if (status) {
      return await db.queryMany<OvertimeRequest>(
        `SELECT * FROM overtime_requests
         WHERE user_id = $1 AND status = $2
         ORDER BY requested_at DESC`,
        [userId, status]
      );
    }

    return await db.queryMany<OvertimeRequest>(
      `SELECT * FROM overtime_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [userId]
    );
  }

  /**
   * Get pending overtime requests for approval
   */
  async getPendingOvertimeRequests(
    organizationId: string
  ): Promise<OvertimeRequest[]> {
    return await db.queryMany<OvertimeRequest>(
      `SELECT ot.*, u.email, u.full_name
       FROM overtime_requests ot
       JOIN users u ON ot.user_id = u.id
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE om.organization_id = $1
         AND ot.status = $2
       ORDER BY ot.requested_at`,
      [organizationId, OvertimeStatus.PENDING]
    );
  }

  /**
   * Get overtime summary for user
   */
  async getOvertimeSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalMinutes: number;
    totalHours: number;
    approvedMinutes: number;
    pendingMinutes: number;
    rejectedMinutes: number;
  }> {
    const result = await db.queryOne<{
      total: number;
      approved: number;
      pending: number;
      rejected: number;
    }>(
      `SELECT
         COALESCE(SUM(duration_minutes), 0)::int as total,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN duration_minutes ELSE 0 END), 0)::int as approved,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN duration_minutes ELSE 0 END), 0)::int as pending,
         COALESCE(SUM(CASE WHEN status = 'rejected' THEN duration_minutes ELSE 0 END), 0)::int as rejected
       FROM overtime_requests
       WHERE user_id = $1
         AND overtime_date BETWEEN $2 AND $3`,
      [userId, startDate, endDate]
    );

    return {
      totalMinutes: result?.total || 0,
      totalHours: Math.round(((result?.total || 0) / 60) * 10) / 10,
      approvedMinutes: result?.approved || 0,
      pendingMinutes: result?.pending || 0,
      rejectedMinutes: result?.rejected || 0,
    };
  }

  /**
   * Get overtime report for organization
   */
  async getOvertimeReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return await db.queryMany(
      `SELECT
         u.id as user_id,
         u.email,
         u.full_name,
         COUNT(ot.id) as request_count,
         SUM(CASE WHEN ot.status = 'approved' THEN ot.duration_minutes ELSE 0 END) as approved_minutes,
         SUM(CASE WHEN ot.status = 'pending' THEN ot.duration_minutes ELSE 0 END) as pending_minutes
       FROM users u
       JOIN organization_memberships om ON u.id = om.user_id
       LEFT JOIN overtime_requests ot ON u.id = ot.user_id
         AND ot.overtime_date BETWEEN $2 AND $3
       WHERE om.organization_id = $1
       GROUP BY u.id, u.email, u.full_name
       HAVING COUNT(ot.id) > 0
       ORDER BY approved_minutes DESC`,
      [organizationId, startDate, endDate]
    );
  }
}
