/**
 * NEXUS Time & Attendance - Reporting Service
 * Generate comprehensive reports for attendance, productivity, and compliance
 */

import { startOfMonth, endOfMonth, format } from 'date-fns';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import {
  AttendanceReportQuery,
  AttendanceRecord,
  AttendanceStats,
  ProductivityStats,
} from '../types';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { AttendanceService } from './attendance.service';
import { RemoteWorkService } from './remote-work.service';

export class ReportService {
  private attendanceService: AttendanceService;
  private remoteWorkService: RemoteWorkService;

  constructor() {
    this.attendanceService = new AttendanceService();
    this.remoteWorkService = new RemoteWorkService();
  }

  /**
   * Generate attendance report in Excel format
   */
  async generateAttendanceReportExcel(
    query: AttendanceReportQuery
  ): Promise<Buffer> {
    const records = await this.attendanceService.generateReport(query);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Employee ID', key: 'userId', width: 15 },
      { header: 'Employee Name', key: 'userName', width: 25 },
      { header: 'Check In', key: 'checkIn', width: 12 },
      { header: 'Check Out', key: 'checkOut', width: 12 },
      { header: 'Work Hours', key: 'workHours', width: 12 },
      { header: 'Overtime', key: 'overtime', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Late Minutes', key: 'lateMinutes', width: 12 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const record of records) {
      worksheet.addRow({
        date: format(record.attendanceDate, 'yyyy-MM-dd'),
        userId: record.userId,
        userName: await this.getUserName(record.userId),
        checkIn: record.checkInTime
          ? format(record.checkInTime, 'HH:mm')
          : '-',
        checkOut: record.checkOutTime
          ? format(record.checkOutTime, 'HH:mm')
          : '-',
        workHours: record.workMinutes
          ? (record.workMinutes / 60).toFixed(2)
          : '0',
        overtime: record.overtimeMinutes
          ? (record.overtimeMinutes / 60).toFixed(2)
          : '0',
        status: record.status,
        lateMinutes: record.lateMinutes || 0,
        notes: record.notes || '',
      });
    }

    // Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: 'J1',
    };

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('Attendance report generated (Excel)', {
      recordCount: records.length,
    });

    return Buffer.from(buffer);
  }

  /**
   * Generate attendance report in CSV format
   */
  async generateAttendanceReportCSV(
    query: AttendanceReportQuery
  ): Promise<string> {
    const records = await this.attendanceService.generateReport(query);

    const data = await Promise.all(
      records.map(async (record) => ({
        Date: format(record.attendanceDate, 'yyyy-MM-dd'),
        'Employee ID': record.userId,
        'Employee Name': await this.getUserName(record.userId),
        'Check In': record.checkInTime
          ? format(record.checkInTime, 'HH:mm')
          : '-',
        'Check Out': record.checkOutTime
          ? format(record.checkOutTime, 'HH:mm')
          : '-',
        'Work Hours': record.workMinutes
          ? (record.workMinutes / 60).toFixed(2)
          : '0',
        Overtime: record.overtimeMinutes
          ? (record.overtimeMinutes / 60).toFixed(2)
          : '0',
        Status: record.status,
        'Late Minutes': record.lateMinutes || 0,
        Notes: record.notes || '',
      }))
    );

    const csv = stringify(data, { header: true });

    logger.info('Attendance report generated (CSV)', {
      recordCount: records.length,
    });

    return csv;
  }

  /**
   * Generate productivity report in Excel format
   */
  async generateProductivityReportExcel(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    // Get all users in organization
    const users = await db.queryMany<{ id: string; email: string; fullName: string }>(
      `SELECT u.id, u.email, u.full_name as "fullName"
       FROM users u
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY u.full_name`,
      [organizationId]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Productivity Report');

    // Add headers
    worksheet.columns = [
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Total Active Hours', key: 'activeHours', width: 18 },
      { header: 'Productive Hours', key: 'productiveHours', width: 18 },
      { header: 'Communication Hours', key: 'communicationHours', width: 20 },
      { header: 'Neutral Hours', key: 'neutralHours', width: 15 },
      { header: 'Unproductive Hours', key: 'unproductiveHours', width: 20 },
      { header: 'Productivity Score', key: 'score', width: 18 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const user of users) {
      const stats = await this.remoteWorkService.getProductivityStats({
        userId: user.id,
        startDate,
        endDate,
      });

      const row = worksheet.addRow({
        name: user.fullName,
        email: user.email,
        activeHours: stats.totalActiveHours.toFixed(2),
        productiveHours: stats.productiveHours.toFixed(2),
        communicationHours: stats.communicationHours.toFixed(2),
        neutralHours: stats.neutralHours.toFixed(2),
        unproductiveHours: stats.unproductiveHours.toFixed(2),
        score: `${stats.avgProductivityScore}%`,
      });

      // Color code productivity score
      const scoreCell = row.getCell('score');
      if (stats.avgProductivityScore >= 80) {
        scoreCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF92D050' },
        };
      } else if (stats.avgProductivityScore >= 60) {
        scoreCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC000' },
        };
      } else {
        scoreCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' },
        };
        scoreCell.font = { color: { argb: 'FFFFFFFF' } };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('Productivity report generated (Excel)', {
      userCount: users.length,
    });

    return Buffer.from(buffer);
  }

  /**
   * Generate monthly attendance summary
   */
  async generateMonthlySummary(
    organizationId: string,
    year: number,
    month: number
  ): Promise<any[]> {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);

    const users = await db.queryMany<{ id: string; email: string; fullName: string }>(
      `SELECT u.id, u.email, u.full_name as "fullName"
       FROM users u
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY u.full_name`,
      [organizationId]
    );

    const summary = [];

    for (const user of users) {
      const stats = await this.attendanceService.getAttendanceStats(
        user.id,
        startDate,
        endDate
      );

      summary.push({
        userId: user.id,
        name: user.fullName,
        email: user.email,
        ...stats,
      });
    }

    logger.info('Monthly summary generated', {
      year,
      month,
      userCount: users.length,
    });

    return summary;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Get users with low attendance rate or compliance issues
    const issues = await db.queryMany(
      `SELECT
         u.id,
         u.email,
         u.full_name as name,
         COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absences,
         COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_arrivals,
         AVG(CASE WHEN ar.late_minutes > 0 THEN ar.late_minutes ELSE NULL END) as avg_late_minutes,
         COUNT(CASE WHEN ar.status IN ('present', 'late', 'remote') THEN 1 END) as present_days,
         COUNT(*) as total_days
       FROM users u
       JOIN organization_memberships om ON u.id = om.user_id
       LEFT JOIN attendance_records ar ON u.id = ar.user_id
         AND ar.attendance_date BETWEEN $2 AND $3
       WHERE om.organization_id = $1
       GROUP BY u.id, u.email, u.full_name
       HAVING
         COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) > 3 OR
         COUNT(CASE WHEN ar.status = 'late' THEN 1 END) > 5
       ORDER BY absences DESC, late_arrivals DESC`,
      [organizationId, startDate, endDate]
    );

    logger.info('Compliance report generated', {
      issueCount: issues.length,
    });

    return issues;
  }

  /**
   * Generate payroll export
   */
  async generatePayrollExport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    const users = await db.queryMany<{ id: string; email: string; fullName: string }>(
      `SELECT u.id, u.email, u.full_name as "fullName"
       FROM users u
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY u.full_name`,
      [organizationId]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll Data');

    // Add headers
    worksheet.columns = [
      { header: 'Employee ID', key: 'id', width: 15 },
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Working Days', key: 'workingDays', width: 15 },
      { header: 'Present Days', key: 'presentDays', width: 15 },
      { header: 'Absent Days', key: 'absentDays', width: 15 },
      { header: 'Leave Days', key: 'leaveDays', width: 15 },
      { header: 'Total Work Hours', key: 'workHours', width: 18 },
      { header: 'Overtime Hours', key: 'overtimeHours', width: 18 },
      { header: 'Late Count', key: 'lateCount', width: 12 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    for (const user of users) {
      const stats = await this.attendanceService.getAttendanceStats(
        user.id,
        startDate,
        endDate
      );

      worksheet.addRow({
        id: user.id,
        name: user.fullName,
        email: user.email,
        workingDays: stats.totalDays - stats.holidays - stats.weekends,
        presentDays: stats.presentDays,
        absentDays: stats.absentDays,
        leaveDays: stats.leaveDays,
        workHours: (stats.avgWorkHours * stats.presentDays).toFixed(2),
        overtimeHours: stats.totalOvertimeHours.toFixed(2),
        lateCount: stats.lateDays,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('Payroll export generated', { userCount: users.length });

    return Buffer.from(buffer);
  }

  /**
   * Helper: Get user name
   */
  private async getUserName(userId: string): Promise<string> {
    const user = await db.queryOne<{ fullName: string }>(
      'SELECT full_name as "fullName" FROM users WHERE id = $1',
      [userId]
    );
    return user?.fullName || 'Unknown';
  }
}
