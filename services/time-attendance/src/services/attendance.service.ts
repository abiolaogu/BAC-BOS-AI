/**
 * NEXUS Time & Attendance - Core Attendance Service
 * Handles check-in, check-out, and attendance tracking
 */

import { v4 as uuidv4 } from 'uuid';
import {
  format,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  parseISO,
  addMinutes,
  parse,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import {
  AttendanceRecord,
  AttendancePolicy,
  AttendanceStatus,
  CheckInRequest,
  CheckOutRequest,
  ManualEntryRequest,
  VerificationMethod,
  TimeAttendanceError,
  ErrorCode,
  AttendanceStats,
  AttendanceReportQuery,
} from '../types';
import { db } from '../utils/database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';

export class AttendanceService {
  /**
   * Check in
   */
  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    const { userId, policyId, verificationMethod, deviceId, latitude, longitude, notes } = request;

    // Get policy
    const policy = await this.getPolicyById(policyId);
    if (!policy) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Attendance policy not found',
        404
      );
    }

    if (!policy.isActive) {
      throw new TimeAttendanceError(
        ErrorCode.FORBIDDEN,
        'Attendance policy is not active',
        403
      );
    }

    const now = new Date();
    const attendanceDate = startOfDay(now);

    // Check if already checked in today
    const existing = await db.queryOne<AttendanceRecord>(
      `SELECT * FROM attendance_records
       WHERE user_id = $1 AND attendance_date = $2`,
      [userId, attendanceDate]
    );

    if (existing && existing.checkInTime && !existing.checkOutTime) {
      throw new TimeAttendanceError(
        ErrorCode.ALREADY_CHECKED_IN,
        'User is already checked in',
        409
      );
    }

    // Verify geofencing if enabled
    if (policy.geoFenceEnabled && latitude && longitude) {
      const isWithinGeoFence = this.checkGeoFence(
        latitude,
        longitude,
        policy.geoFenceLatitude!,
        policy.geoFenceLongitude!,
        policy.geoFenceRadius!
      );

      if (!isWithinGeoFence) {
        throw new TimeAttendanceError(
          ErrorCode.OUTSIDE_GEO_FENCE,
          'Check-in location is outside allowed geofence',
          403
        );
      }
    }

    // Calculate status
    const status = this.calculateCheckInStatus(now, policy);

    // Calculate late minutes
    let lateMinutes = 0;
    if (status === AttendanceStatus.LATE && policy.startTime) {
      const scheduledStart = this.parseTimeToDate(policy.startTime, attendanceDate);
      lateMinutes = differenceInMinutes(now, scheduledStart);
    }

    // Create or update attendance record
    let record: AttendanceRecord;

    if (existing) {
      // Update existing record (re-check-in scenario)
      record = await db.queryOne<AttendanceRecord>(
        `UPDATE attendance_records
         SET check_in_time = $1,
             check_in_method = $2,
             check_in_device_id = $3,
             check_in_location = $4,
             status = $5,
             late_minutes = $6,
             notes = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          now,
          verificationMethod,
          deviceId,
          latitude && longitude ? `${latitude},${longitude}` : null,
          status,
          lateMinutes,
          notes,
          existing.id,
        ]
      )!;
    } else {
      // Create new record
      record = await db.queryOne<AttendanceRecord>(
        `INSERT INTO attendance_records (
          id, user_id, policy_id, attendance_date,
          check_in_time, check_in_method, check_in_device_id,
          check_in_location, status, late_minutes, notes,
          is_manual_entry
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
        RETURNING *`,
        [
          uuidv4(),
          userId,
          policyId,
          attendanceDate,
          now,
          verificationMethod,
          deviceId,
          latitude && longitude ? `${latitude},${longitude}` : null,
          status,
          lateMinutes,
          notes,
        ]
      )!;
    }

    // Clear cache
    await cache.delete(`attendance:${userId}:${format(attendanceDate, 'yyyy-MM-dd')}`);

    logger.info('User checked in', {
      userId,
      policyId,
      status,
      verificationMethod,
      lateMinutes,
    });

    return record;
  }

  /**
   * Check out
   */
  async checkOut(request: CheckOutRequest): Promise<AttendanceRecord> {
    const { userId, verificationMethod, deviceId, latitude, longitude, notes } = request;

    const now = new Date();
    const attendanceDate = startOfDay(now);

    // Get today's attendance record
    const existing = await db.queryOne<AttendanceRecord>(
      `SELECT ar.*, ap.*
       FROM attendance_records ar
       JOIN attendance_policies ap ON ar.policy_id = ap.id
       WHERE ar.user_id = $1 AND ar.attendance_date = $2`,
      [userId, attendanceDate]
    );

    if (!existing) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_CHECKED_IN,
        'User has not checked in today',
        400
      );
    }

    if (existing.checkOutTime) {
      throw new TimeAttendanceError(
        ErrorCode.CONFLICT,
        'User has already checked out',
        409
      );
    }

    const policy = await this.getPolicyById(existing.policyId);
    if (!policy) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Attendance policy not found',
        404
      );
    }

    // Calculate work minutes
    const workMinutes = differenceInMinutes(now, existing.checkInTime!);

    // Calculate early departure
    let earlyDepartureMinutes = 0;
    if (policy.endTime) {
      const scheduledEnd = this.parseTimeToDate(policy.endTime, attendanceDate);
      if (now < scheduledEnd) {
        earlyDepartureMinutes = differenceInMinutes(scheduledEnd, now);
      }
    }

    // Calculate overtime
    let overtimeMinutes = 0;
    if (policy.overtimeEnabled && policy.endTime) {
      const scheduledEnd = this.parseTimeToDate(policy.endTime, attendanceDate);
      if (now > scheduledEnd) {
        overtimeMinutes = differenceInMinutes(now, scheduledEnd);
      }
    }

    // Update status if half day
    let status = existing.status;
    if (workMinutes < policy.halfDayThresholdMinutes) {
      status = AttendanceStatus.HALF_DAY;
    }

    // Update record
    const record = await db.queryOne<AttendanceRecord>(
      `UPDATE attendance_records
       SET check_out_time = $1,
           check_out_method = $2,
           check_out_device_id = $3,
           check_out_location = $4,
           work_minutes = $5,
           overtime_minutes = $6,
           early_departure_minutes = $7,
           status = $8,
           notes = CASE WHEN notes IS NULL THEN $9 ELSE notes || ' | ' || $9 END,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        now,
        verificationMethod,
        deviceId,
        latitude && longitude ? `${latitude},${longitude}` : null,
        workMinutes,
        overtimeMinutes,
        earlyDepartureMinutes,
        status,
        notes,
        existing.id,
      ]
    )!;

    // Clear cache
    await cache.delete(`attendance:${userId}:${format(attendanceDate, 'yyyy-MM-dd')}`);

    logger.info('User checked out', {
      userId,
      workMinutes,
      overtimeMinutes,
      status,
    });

    return record;
  }

  /**
   * Manual attendance entry
   */
  async createManualEntry(request: ManualEntryRequest): Promise<AttendanceRecord> {
    const { userId, policyId, attendanceDate, checkInTime, checkOutTime, reason, approvedBy } = request;

    // Check if entry already exists
    const existing = await db.queryOne(
      'SELECT id FROM attendance_records WHERE user_id = $1 AND attendance_date = $2',
      [userId, attendanceDate]
    );

    if (existing) {
      throw new TimeAttendanceError(
        ErrorCode.CONFLICT,
        'Attendance record already exists for this date',
        409
      );
    }

    const policy = await this.getPolicyById(policyId);
    if (!policy) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Attendance policy not found',
        404
      );
    }

    // Calculate work minutes
    let workMinutes = 0;
    let status = AttendanceStatus.PRESENT;

    if (checkOutTime) {
      workMinutes = differenceInMinutes(checkOutTime, checkInTime);
      if (workMinutes < policy.halfDayThresholdMinutes) {
        status = AttendanceStatus.HALF_DAY;
      }
    }

    // Create manual entry
    const record = await db.queryOne<AttendanceRecord>(
      `INSERT INTO attendance_records (
        id, user_id, policy_id, attendance_date,
        check_in_time, check_out_time, status,
        work_minutes, is_manual_entry, manual_entry_reason,
        manual_entry_by, check_in_method, check_out_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $11)
      RETURNING *`,
      [
        uuidv4(),
        userId,
        policyId,
        attendanceDate,
        checkInTime,
        checkOutTime,
        status,
        workMinutes,
        reason,
        approvedBy,
        VerificationMethod.MANUAL,
      ]
    )!;

    // Clear cache
    await cache.delete(`attendance:${userId}:${format(attendanceDate, 'yyyy-MM-dd')}`);

    logger.info('Manual attendance entry created', {
      userId,
      attendanceDate,
      approvedBy,
      reason,
    });

    return record;
  }

  /**
   * Get attendance record for a specific date
   */
  async getAttendanceByDate(
    userId: string,
    date: Date
  ): Promise<AttendanceRecord | null> {
    const cacheKey = `attendance:${userId}:${format(date, 'yyyy-MM-dd')}`;
    const cached = await cache.get<AttendanceRecord>(cacheKey);

    if (cached) {
      return cached;
    }

    const record = await db.queryOne<AttendanceRecord>(
      `SELECT * FROM attendance_records
       WHERE user_id = $1 AND attendance_date = $2`,
      [userId, startOfDay(date)]
    );

    if (record) {
      await cache.set(cacheKey, record, 300); // Cache for 5 minutes
    }

    return record;
  }

  /**
   * Get attendance records for date range
   */
  async getAttendanceRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AttendanceRecord[]> {
    return await db.queryMany<AttendanceRecord>(
      `SELECT * FROM attendance_records
       WHERE user_id = $1
         AND attendance_date BETWEEN $2 AND $3
       ORDER BY attendance_date DESC`,
      [userId, startOfDay(startDate), startOfDay(endDate)]
    );
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AttendanceStats> {
    const records = await this.getAttendanceRange(userId, startDate, endDate);

    const stats: AttendanceStats = {
      totalDays: records.length,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      halfDays: 0,
      leaveDays: 0,
      holidays: 0,
      weekends: 0,
      attendanceRate: 0,
      avgWorkHours: 0,
      totalOvertimeHours: 0,
    };

    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;

    for (const record of records) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
        case AttendanceStatus.REMOTE:
          stats.presentDays++;
          break;
        case AttendanceStatus.LATE:
          stats.lateDays++;
          stats.presentDays++;
          break;
        case AttendanceStatus.ABSENT:
          stats.absentDays++;
          break;
        case AttendanceStatus.HALF_DAY:
          stats.halfDays++;
          break;
        case AttendanceStatus.ON_LEAVE:
          stats.leaveDays++;
          break;
        case AttendanceStatus.HOLIDAY:
          stats.holidays++;
          break;
        case AttendanceStatus.WEEKEND:
          stats.weekends++;
          break;
      }

      if (record.workMinutes) {
        totalWorkMinutes += record.workMinutes;
      }

      if (record.overtimeMinutes) {
        totalOvertimeMinutes += record.overtimeMinutes;
      }
    }

    const workingDays = stats.totalDays - stats.holidays - stats.weekends;
    stats.attendanceRate = workingDays > 0
      ? Math.round((stats.presentDays / workingDays) * 100)
      : 0;

    stats.avgWorkHours = stats.presentDays > 0
      ? Math.round((totalWorkMinutes / stats.presentDays) / 60 * 10) / 10
      : 0;

    stats.totalOvertimeHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

    return stats;
  }

  /**
   * Generate attendance report
   */
  async generateReport(query: AttendanceReportQuery): Promise<AttendanceRecord[]> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.organizationId) {
      conditions.push(`ap.organization_id = $${paramIndex++}`);
      params.push(query.organizationId);
    }

    if (query.userId) {
      conditions.push(`ar.user_id = $${paramIndex++}`);
      params.push(query.userId);
    }

    if (query.policyId) {
      conditions.push(`ar.policy_id = $${paramIndex++}`);
      params.push(query.policyId);
    }

    if (query.status) {
      conditions.push(`ar.status = $${paramIndex++}`);
      params.push(query.status);
    }

    conditions.push(`ar.attendance_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
    params.push(startOfDay(query.startDate), startOfDay(query.endDate));

    return await db.queryMany<AttendanceRecord>(
      `SELECT ar.*, ap.name as policy_name
       FROM attendance_records ar
       JOIN attendance_policies ap ON ar.policy_id = ap.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ar.attendance_date DESC, ar.user_id`,
      params
    );
  }

  /**
   * Calculate check-in status
   */
  private calculateCheckInStatus(
    checkInTime: Date,
    policy: AttendancePolicy
  ): AttendanceStatus {
    if (!policy.startTime) {
      return AttendanceStatus.PRESENT;
    }

    const attendanceDate = startOfDay(checkInTime);
    const scheduledStart = this.parseTimeToDate(policy.startTime, attendanceDate);
    const graceEnd = addMinutes(scheduledStart, policy.graceTimeMinutes);
    const lateThreshold = addMinutes(scheduledStart, policy.lateThresholdMinutes);

    if (checkInTime <= graceEnd) {
      return AttendanceStatus.PRESENT;
    } else if (checkInTime <= lateThreshold) {
      return AttendanceStatus.LATE;
    } else {
      return AttendanceStatus.ABSENT;
    }
  }

  /**
   * Parse time string to Date
   */
  private parseTimeToDate(timeStr: string, date: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Check geofence
   */
  private checkGeoFence(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusMeters: number
  ): boolean {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance <= radiusMeters;
  }

  /**
   * Get policy by ID
   */
  private async getPolicyById(policyId: string): Promise<AttendancePolicy | null> {
    return await db.queryOne<AttendancePolicy>(
      'SELECT * FROM attendance_policies WHERE id = $1',
      [policyId]
    );
  }

  /**
   * Mark absences for previous day
   */
  async markAbsences(date: Date): Promise<void> {
    const attendanceDate = startOfDay(date);

    // Get all active users with policies
    const usersWithPolicies = await db.queryMany<{ userId: string; policyId: string }>(
      `SELECT DISTINCT up.user_id as "userId", up.policy_id as "policyId"
       FROM user_policies up
       JOIN attendance_policies ap ON up.policy_id = ap.id
       WHERE up.effective_from <= $1
         AND (up.effective_to IS NULL OR up.effective_to >= $1)
         AND ap.is_active = true`,
      [attendanceDate]
    );

    for (const { userId, policyId } of usersWithPolicies) {
      // Check if attendance record exists
      const existing = await db.queryOne(
        'SELECT id FROM attendance_records WHERE user_id = $1 AND attendance_date = $2',
        [userId, attendanceDate]
      );

      if (!existing) {
        // Check if it's a leave day or holiday
        const isLeaveDay = await this.isLeaveDay(userId, attendanceDate);
        const isHoliday = await this.isHoliday(policyId, attendanceDate);
        const isWeekend = await this.isWeekend(policyId, attendanceDate);

        let status = AttendanceStatus.ABSENT;
        if (isLeaveDay) {
          status = AttendanceStatus.ON_LEAVE;
        } else if (isHoliday) {
          status = AttendanceStatus.HOLIDAY;
        } else if (isWeekend) {
          status = AttendanceStatus.WEEKEND;
        }

        // Create absence record
        await db.query(
          `INSERT INTO attendance_records (
            id, user_id, policy_id, attendance_date, status, is_manual_entry
          ) VALUES ($1, $2, $3, $4, $5, false)`,
          [uuidv4(), userId, policyId, attendanceDate, status]
        );

        logger.info('Absence marked', { userId, attendanceDate, status });
      }
    }
  }

  /**
   * Check if date is a leave day
   */
  private async isLeaveDay(userId: string, date: Date): Promise<boolean> {
    const count = await db.count('leave_requests', {
      user_id: userId,
      status: 'approved',
    });

    if (count === 0) return false;

    const result = await db.queryOne(
      `SELECT EXISTS(
        SELECT 1 FROM leave_requests
        WHERE user_id = $1
          AND status = 'approved'
          AND start_date <= $2
          AND end_date >= $2
      )`,
      [userId, date]
    );

    return result?.exists || false;
  }

  /**
   * Check if date is a holiday
   */
  private async isHoliday(policyId: string, date: Date): Promise<boolean> {
    const policy = await this.getPolicyById(policyId);
    if (!policy) return false;

    const result = await db.queryOne(
      `SELECT EXISTS(
        SELECT 1 FROM holidays
        WHERE organization_id = $1
          AND holiday_date = $2
      )`,
      [policy.organizationId, date]
    );

    return result?.exists || false;
  }

  /**
   * Check if date is a weekend
   */
  private async isWeekend(policyId: string, date: Date): Promise<boolean> {
    const policy = await this.getPolicyById(policyId);
    if (!policy) return false;

    const dayOfWeek = date.getDay();
    return !policy.workDays.includes(dayOfWeek);
  }
}
