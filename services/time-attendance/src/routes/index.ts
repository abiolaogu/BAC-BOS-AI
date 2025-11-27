/**
 * NEXUS Time & Attendance - API Routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { AttendanceService } from '../services/attendance.service';
import { BiometricService } from '../services/biometric.service';
import { RemoteWorkService } from '../services/remote-work.service';
import { LeaveService } from '../services/leave.service';
import { OvertimeService } from '../services/overtime.service';
import { ReportService } from '../services/report.service';

const router = Router();

// Initialize services
const attendanceService = new AttendanceService();
const biometricService = new BiometricService();
const remoteWorkService = new RemoteWorkService();
const leaveService = new LeaveService();
const overtimeService = new OvertimeService();
const reportService = new ReportService();

// ==================== Health Check ====================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'nexus-time-attendance',
      version: '1.0.0',
    },
  });
});

// ==================== Attendance Routes ====================

// Check in
router.post('/attendance/check-in', authenticate, asyncHandler(async (req: any, res) => {
  const record = await attendanceService.checkIn({
    userId: req.user.userId,
    policyId: req.body.policyId,
    verificationMethod: req.body.verificationMethod,
    deviceId: req.body.deviceId,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    notes: req.body.notes,
  });

  res.json({ success: true, data: record });
}));

// Check out
router.post('/attendance/check-out', authenticate, asyncHandler(async (req: any, res) => {
  const record = await attendanceService.checkOut({
    userId: req.user.userId,
    verificationMethod: req.body.verificationMethod,
    deviceId: req.body.deviceId,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    notes: req.body.notes,
  });

  res.json({ success: true, data: record });
}));

// Get attendance by date
router.get('/attendance/:date', authenticate, asyncHandler(async (req: any, res) => {
  const record = await attendanceService.getAttendanceByDate(
    req.user.userId,
    new Date(req.params.date)
  );

  res.json({ success: true, data: record });
}));

// Get attendance range
router.get('/attendance', authenticate, asyncHandler(async (req: any, res) => {
  const records = await attendanceService.getAttendanceRange(
    req.user.userId,
    new Date(req.query.startDate as string),
    new Date(req.query.endDate as string)
  );

  res.json({ success: true, data: records });
}));

// Get attendance statistics
router.get('/attendance/stats', authenticate, asyncHandler(async (req: any, res) => {
  const stats = await attendanceService.getAttendanceStats(
    req.user.userId,
    new Date(req.query.startDate as string),
    new Date(req.query.endDate as string)
  );

  res.json({ success: true, data: stats });
}));

// Manual entry (requires admin role)
router.post('/attendance/manual', authenticate, asyncHandler(async (req: any, res) => {
  const record = await attendanceService.createManualEntry({
    userId: req.body.userId,
    policyId: req.body.policyId,
    attendanceDate: new Date(req.body.attendanceDate),
    checkInTime: new Date(req.body.checkInTime),
    checkOutTime: req.body.checkOutTime ? new Date(req.body.checkOutTime) : undefined,
    reason: req.body.reason,
    approvedBy: req.user.userId,
  });

  res.json({ success: true, data: record });
}));

// ==================== Biometric Device Routes ====================

// Register device
router.post('/devices', authenticate, asyncHandler(async (req, res) => {
  const device = await biometricService.registerDevice(req.body);
  res.json({ success: true, data: device });
}));

// Get devices
router.get('/devices', authenticate, asyncHandler(async (req: any, res) => {
  const devices = await biometricService.getDevicesByOrganization(
    req.user.organizationId
  );
  res.json({ success: true, data: devices });
}));

// Connect to device
router.post('/devices/:id/connect', authenticate, asyncHandler(async (req, res) => {
  await biometricService.connectDevice(req.params.id);
  res.json({ success: true, message: 'Device connected' });
}));

// Sync attendance from device
router.post('/devices/:id/sync', authenticate, asyncHandler(async (req, res) => {
  const records = await biometricService.syncAttendance(req.params.id);
  res.json({ success: true, data: records });
}));

// ==================== Remote Work Routes ====================

// Agent heartbeat
router.post('/agent/heartbeat', authenticate, asyncHandler(async (req: any, res) => {
  await remoteWorkService.handleHeartbeat({
    userId: req.user.userId,
    agentVersion: req.body.agentVersion,
    osInfo: req.body.osInfo,
    timestamp: new Date(),
    isActive: req.body.isActive,
  });

  res.json({ success: true, message: 'Heartbeat received' });
}));

// Agent activity upload
router.post('/agent/activity', authenticate, asyncHandler(async (req: any, res) => {
  await remoteWorkService.processAgentActivity({
    userId: req.user.userId,
    activities: req.body.activities,
    screenshot: req.body.screenshot,
  });

  res.json({ success: true, message: 'Activity processed' });
}));

// Get productivity stats
router.get('/productivity/stats', authenticate, asyncHandler(async (req: any, res) => {
  const stats = await remoteWorkService.getProductivityStats({
    userId: req.user.userId,
    startDate: new Date(req.query.startDate as string),
    endDate: new Date(req.query.endDate as string),
    groupBy: req.query.groupBy as any,
  });

  res.json({ success: true, data: stats });
}));

// Mark personal time
router.post('/productivity/personal-time', authenticate, asyncHandler(async (req: any, res) => {
  await remoteWorkService.markPersonalTime(
    req.user.userId,
    new Date(req.body.startTime),
    new Date(req.body.endTime)
  );

  res.json({ success: true, message: 'Personal time marked' });
}));

// Get activity details
router.get('/productivity/activities', authenticate, asyncHandler(async (req: any, res) => {
  const activities = await remoteWorkService.getActivityDetails(
    req.user.userId,
    new Date(req.query.startTime as string),
    new Date(req.query.endTime as string)
  );

  res.json({ success: true, data: activities });
}));

// ==================== Leave Routes ====================

// Create leave request
router.post('/leave/requests', authenticate, asyncHandler(async (req: any, res) => {
  const leaveRequest = await leaveService.createLeaveRequest({
    userId: req.user.userId,
    leaveType: req.body.leaveType,
    startDate: new Date(req.body.startDate),
    endDate: new Date(req.body.endDate),
    reason: req.body.reason,
  });

  res.json({ success: true, data: leaveRequest });
}));

// Get user's leave requests
router.get('/leave/requests', authenticate, asyncHandler(async (req: any, res) => {
  const requests = await leaveService.getUserLeaveRequests(
    req.user.userId,
    req.query.status as any
  );

  res.json({ success: true, data: requests });
}));

// Approve/reject leave request
router.post('/leave/requests/:id/review', authenticate, asyncHandler(async (req: any, res) => {
  const leaveRequest = await leaveService.reviewLeaveRequest({
    requestId: req.params.id,
    approved: req.body.approved,
    reviewedBy: req.user.userId,
    comments: req.body.comments,
  });

  res.json({ success: true, data: leaveRequest });
}));

// Cancel leave request
router.post('/leave/requests/:id/cancel', authenticate, asyncHandler(async (req: any, res) => {
  const leaveRequest = await leaveService.cancelLeaveRequest(
    req.params.id,
    req.user.userId
  );

  res.json({ success: true, data: leaveRequest });
}));

// Get leave balance
router.get('/leave/balance', authenticate, asyncHandler(async (req: any, res) => {
  const balances = await leaveService.getAllLeaveBalances(req.user.userId);
  res.json({ success: true, data: balances });
}));

// Get pending leave requests (for managers)
router.get('/leave/pending', authenticate, asyncHandler(async (req: any, res) => {
  const requests = await leaveService.getPendingLeaveRequests(
    req.user.organizationId
  );

  res.json({ success: true, data: requests });
}));

// ==================== Overtime Routes ====================

// Create overtime request
router.post('/overtime/requests', authenticate, asyncHandler(async (req: any, res) => {
  const overtimeRequest = await overtimeService.createOvertimeRequest({
    userId: req.user.userId,
    overtimeDate: new Date(req.body.overtimeDate),
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
    reason: req.body.reason,
  });

  res.json({ success: true, data: overtimeRequest });
}));

// Get user's overtime requests
router.get('/overtime/requests', authenticate, asyncHandler(async (req: any, res) => {
  const requests = await overtimeService.getUserOvertimeRequests(
    req.user.userId,
    req.query.status as any
  );

  res.json({ success: true, data: requests });
}));

// Approve overtime request
router.post('/overtime/requests/:id/approve', authenticate, asyncHandler(async (req: any, res) => {
  const overtimeRequest = await overtimeService.approveOvertimeRequest(
    req.params.id,
    req.user.userId,
    req.body.comments
  );

  res.json({ success: true, data: overtimeRequest });
}));

// Reject overtime request
router.post('/overtime/requests/:id/reject', authenticate, asyncHandler(async (req: any, res) => {
  const overtimeRequest = await overtimeService.rejectOvertimeRequest(
    req.params.id,
    req.user.userId,
    req.body.comments
  );

  res.json({ success: true, data: overtimeRequest });
}));

// Get overtime summary
router.get('/overtime/summary', authenticate, asyncHandler(async (req: any, res) => {
  const summary = await overtimeService.getOvertimeSummary(
    req.user.userId,
    new Date(req.query.startDate as string),
    new Date(req.query.endDate as string)
  );

  res.json({ success: true, data: summary });
}));

// ==================== Report Routes ====================

// Generate attendance report (Excel)
router.get('/reports/attendance/excel', authenticate, asyncHandler(async (req: any, res) => {
  const buffer = await reportService.generateAttendanceReportExcel({
    organizationId: req.user.organizationId,
    startDate: new Date(req.query.startDate as string),
    endDate: new Date(req.query.endDate as string),
    userId: req.query.userId as string,
    status: req.query.status as any,
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
  res.send(buffer);
}));

// Generate attendance report (CSV)
router.get('/reports/attendance/csv', authenticate, asyncHandler(async (req: any, res) => {
  const csv = await reportService.generateAttendanceReportCSV({
    organizationId: req.user.organizationId,
    startDate: new Date(req.query.startDate as string),
    endDate: new Date(req.query.endDate as string),
    userId: req.query.userId as string,
    status: req.query.status as any,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
  res.send(csv);
}));

// Generate productivity report (Excel)
router.get('/reports/productivity/excel', authenticate, asyncHandler(async (req: any, res) => {
  const buffer = await reportService.generateProductivityReportExcel(
    req.user.organizationId,
    new Date(req.query.startDate as string),
    new Date(req.query.endDate as string)
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=productivity-report.xlsx');
  res.send(buffer);
}));

// Generate monthly summary
router.get('/reports/monthly-summary', authenticate, asyncHandler(async (req: any, res) => {
  const summary = await reportService.generateMonthlySummary(
    req.user.organizationId,
    parseInt(req.query.year as string),
    parseInt(req.query.month as string)
  );

  res.json({ success: true, data: summary });
}));

// Generate payroll export
router.get('/reports/payroll', authenticate, asyncHandler(async (req: any, res) => {
  const buffer = await reportService.generatePayrollExport(
    req.user.organizationId,
    new Date(req.query.startDate as string),
    new Date(req.query.endDate as string)
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=payroll-export.xlsx');
  res.send(buffer);
}));

export default router;
