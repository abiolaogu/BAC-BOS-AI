# NEXUS Time & Attendance - Employee User Manual

## Welcome

Welcome to NEXUS Time & Attendance! This guide will help you understand how to clock in/out, track your work time, and manage your attendance.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Clocking In/Out](#clocking-inout)
3. [Remote Work Tracking](#remote-work-tracking)
4. [Viewing Your Attendance](#viewing-your-attendance)
5. [Requesting Time Off](#requesting-time-off)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First-Time Setup

#### For Office-Based Employees

1. **Biometric Enrollment**
   - Visit HR department
   - Enroll your biometric data (fingerprint/face/iris)
   - Test the enrollment at the attendance device
   - You're ready to start tracking attendance!

2. **What You'll Need:**
   - Valid employee ID
   - Clean fingers (for fingerprint)
   - Look directly at camera (for face recognition)

#### For Remote Employees

1. **Install Desktop Agent**
   - Download from: https://nexus.platform/downloads
   - Run installer (Windows/Mac/Linux)
   - Log in with your credentials
   - Grant necessary permissions

2. **Mobile App (Optional)**
   - Download "NEXUS Time" from App Store/Play Store
   - Log in with your credentials
   - Enable location services (for field work)

---

## Clocking In/Out

### Office Attendance (Biometric)

#### Clocking In

1. **Approach the Device**
   - Locate your nearest attendance device
   - Wait for the green light

2. **Verify Your Identity**

   **For Fingerprint:**
   - Place your enrolled finger on the scanner
   - Wait for beep and green light
   - Check screen for confirmation

   **For Face Recognition:**
   - Stand in front of camera (arms length)
   - Look directly at the camera
   - Wait for confirmation message

   **For Iris Scan:**
   - Align your eye with the scanner
   - Keep steady until beep
   - Check confirmation

3. **Confirmation**
   - ✅ Green screen = Successful check-in
   - ❌ Red screen = Verification failed (try again)
   - Screen shows: Your name, time, and "Check-in Successful"

#### Clocking Out

1. Follow the same process as check-in
2. Device automatically knows it's check-out time
3. Screen shows total hours worked

### Remote Work (Desktop Agent)

#### Starting Your Day

1. **Automatic Check-in**
   - Turn on your computer
   - Agent starts automatically
   - Automatically clocks you in
   - Tray icon shows green = tracking active

2. **Manual Check-in** (if automatic fails)
   - Click tray icon
   - Select "Check In"
   - Confirm your status

#### Ending Your Day

1. **Manual Check-out**
   - Click tray icon
   - Select "Check Out"
   - Review your day's summary
   - Confirm

2. **Automatic Check-out**
   - Agent automatically clocks you out after inactivity
   - Default: 30 minutes of no activity

---

## Remote Work Tracking

### What Gets Tracked?

#### Automatically Tracked:
- ✅ Active time (when you're using your computer)
- ✅ Application usage (what programs you use)
- ✅ Productive vs. idle time
- ✅ Focus time (uninterrupted work)

#### NOT Tracked:
- ❌ Personal browsing (in privacy mode)
- ❌ Passwords or keystrokes
- ❌ Personal files content
- ❌ Personal communications

### Privacy Settings

#### Adjusting Your Privacy

1. **Open Agent Settings**
   - Right-click tray icon
   - Select "Settings"

2. **Privacy Options:**
   - **Blur Screenshots**: ON (recommended)
   - **Exclude Personal Apps**: Add apps to exclude
   - **Personal Time**: Mark personal time blocks

3. **Personal Time Blocks**
   - Click "Add Personal Time"
   - Select time range
   - These hours won't be tracked

### Understanding Productivity

#### Productivity Categories:

**Productive Applications (Green):**
- IDEs (VS Code, IntelliJ)
- Design tools (Figma, Adobe CC)
- Office apps (Word, Excel, PowerPoint)
- Project management (Jira, Asana)

**Communication (Blue):**
- Email (Outlook, Gmail)
- Chat (Slack, Teams, Zoom)
- Calendar applications

**Neutral (Yellow):**
- Web browsers (context-dependent)
- File explorers
- System utilities

**Unproductive (Red):**
- Games
- Entertainment apps
- Social media (personal accounts)

#### Your Productivity Score

- Calculated daily: 0-100%
- Based on: Active time vs. total time
- Factors:
  - Time in productive apps
  - Focus sessions (no interruptions)
  - Active vs. idle ratio
  - Meeting time

---

## Viewing Your Attendance

### Web Portal

1. **Log In**
   - Go to https://nexus.platform
   - Enter credentials
   - Navigate to "My Attendance"

2. **Dashboard Overview**
   - Today's status
   - This week's hours
   - This month's summary
   - Leave balance

3. **Detailed Views**

   **Daily View:**
   - Check-in/out times
   - Total hours worked
   - Productive hours
   - Break time
   - Activity timeline

   **Weekly View:**
   - 7-day summary
   - Total hours
   - Average productivity
   - Overtime hours

   **Monthly View:**
   - Calendar view
   - Working days
   - Absent days
   - Leave days
   - Total hours

### Mobile App

1. **Quick Status**
   - Open app
   - See today's status
   - Swipe for weekly summary

2. **Check-in/Out**
   - Tap large button
   - For field work: Enable location
   - Add notes (optional)

---

## Requesting Time Off

### Leave Request Process

#### Step 1: Submit Request

1. **Navigate to Leave**
   - Open web portal
   - Click "Time Off" → "Request Leave"

2. **Fill Details**
   ```
   Leave Type: [Vacation/Sick/Personal/Other]
   Start Date: [Select date]
   End Date: [Select date]
   Total Days: [Auto-calculated]
   Reason: [Brief explanation]
   ```

3. **Submit**
   - Review details
   - Click "Submit Request"
   - Email notification sent to manager

#### Step 2: Track Status

1. **Pending Approval**
   - Status shows "Pending"
   - Manager receives notification
   - You receive email when reviewed

2. **Approved**
   - ✅ Status changes to "Approved"
   - Leave balance updated
   - Calendar marked

3. **Rejected**
   - ❌ Status shows "Rejected"
   - View rejection reason
   - Can resubmit with changes

### Leave Balance

**Viewing Your Balance:**
1. Go to "Time Off" → "Leave Balance"
2. See breakdown:
   - Vacation: X days remaining
   - Sick leave: X days remaining
   - Personal: X days remaining
   - Comp time: X hours

**Types of Leave:**

| Type | Annual Allowance | Carry Forward |
|------|------------------|---------------|
| Vacation | 20 days | Up to 5 days |
| Sick Leave | 10 days | No |
| Personal | 3 days | No |
| Bereavement | 3 days | No |

---

## Breaks and Lunch

### Taking Breaks

#### Official Break Times:

**Paid Breaks:**
- Morning: 15 minutes (9:30-10:30 AM window)
- Afternoon: 15 minutes (3:00-4:00 PM window)
- Automatically detected if you leave desk

**Unpaid Lunch:**
- 1 hour (12:00-2:00 PM window)
- Must clock out or pause tracking

#### How to Log Breaks

**Office:**
1. No action needed
2. Breaks auto-detected when away from desk
3. System prompts if break seems long

**Remote:**
1. Click agent icon
2. Select "Start Break"
3. Select break type
4. Click "End Break" when returning

---

## Overtime

### Recording Overtime

#### Pre-Approval Required

1. **Request Overtime** (before working)
   - Go to "Overtime" → "Request"
   - Enter: Date, estimated hours, reason
   - Submit to manager
   - Wait for approval

2. **Work Overtime**
   - Only work if pre-approved
   - Clock in/out normally
   - System tracks actual overtime

3. **Overtime Calculation**
   - Hours beyond 8/day or 40/week
   - Multiplier: 1.5x (time and a half)
   - Paid in next payroll cycle

### Comp Time

- Alternative to overtime pay
- 1 hour OT = 1.5 hours comp time
- Use comp time for future time off
- Must be used within 90 days

---

## Troubleshooting

### Common Issues

#### Biometric Device Issues

**Problem: Device doesn't recognize you**

Solutions:
1. Clean your finger/face
2. Try different finger (if enrolled)
3. Try different angle
4. Contact HR to re-enroll

**Problem: Device is offline**

Solutions:
1. Check if screen is on
2. Try different device
3. Use manual check-in
4. Contact IT support

#### Remote Agent Issues

**Problem: Agent not tracking**

Solutions:
1. Check if agent is running (tray icon)
2. Check internet connection
3. Restart agent
4. Re-login to agent
5. Reinstall if persists

**Problem: Inaccurate productivity**

Solutions:
1. Check app categorization
2. Mark personal time
3. Contact your manager to review
4. Request app recategorization

### Manual Time Entry

**When to Use:**
- Device was offline
- Forgot to check in
- Technical issues
- Work from client site

**How to Submit:**

1. **Go to "Attendance" → "Manual Entry"**

2. **Fill Form:**
   ```
   Date: [Select date]
   Check-in Time: [HH:MM AM/PM]
   Check-out Time: [HH:MM AM/PM]
   Location: [Office/Remote/Field]
   Reason: [Explain why manual entry needed]
   ```

3. **Submit for Approval**
   - Manager receives notification
   - Approve/reject with comments
   - You get email notification

---

## Best Practices

### For Accurate Tracking

1. **Be Consistent**
   - Check in when you start work
   - Check out when you finish
   - Take regular breaks

2. **Communicate**
   - Inform manager of field work
   - Request leave in advance
   - Report issues promptly

3. **Privacy Management**
   - Use privacy mode for personal tasks
   - Mark personal time blocks
   - Review your data regularly

4. **Productivity**
   - Focus on actual work during work hours
   - Take breaks to avoid burnout
   - Don't worry about micro-management

### Rights and Privacy

**Your Rights:**
- ✅ Access your own data anytime
- ✅ Request data deletion (per policy)
- ✅ Opt-in to screenshots
- ✅ Privacy mode for personal time
- ✅ Know what's being tracked

**Company Policy:**
- Data used only for attendance
- No surveillance during breaks
- Productivity data is confidential
- No disciplinary action without review
- Human review of all flags

---

## Getting Help

### Support Channels

1. **IT Help Desk**
   - Email: helpdesk@company.com
   - Phone: ext. 1234
   - For: Technical issues, agent problems

2. **HR Department**
   - Email: hr@company.com
   - Phone: ext. 5678
   - For: Leave, policies, biometric enrollment

3. **Your Manager**
   - For: Approvals, clarifications, disputes

4. **Self-Service Portal**
   - FAQ: https://nexus.platform/help
   - Video tutorials
   - Knowledge base

### Emergency Contact

**Urgent Issues:**
- Cannot check in for important meeting
- System down during critical work
- Data privacy concerns

Contact: emergency@company.com or ext. 9999

---

## Appendix

### Keyboard Shortcuts (Desktop Agent)

| Action | Windows | Mac |
|--------|---------|-----|
| Check In | Ctrl+Shift+I | ⌘+Shift+I |
| Check Out | Ctrl+Shift+O | ⌘+Shift+O |
| Start Break | Ctrl+Shift+B | ⌘+Shift+B |
| Show Dashboard | Ctrl+Shift+D | ⌘+Shift+D |

### Policy Quick Reference

- **Grace Period**: 15 minutes
- **Minimum Hours**: 8 hours/day
- **Core Hours**: 10 AM - 4 PM (must be present)
- **Overtime Threshold**: After 8 hours
- **Auto Check-out**: After 30 min idle

### Glossary

- **Biometric**: Physical characteristics for ID (fingerprint, face)
- **Check-in**: Recording arrival at work
- **Check-out**: Recording departure from work
- **Productivity Score**: Measure of active work time
- **Grace Period**: Extra time allowed for late arrival
- **Overtime**: Work beyond regular hours
- **Comp Time**: Time off in lieu of overtime pay

---

**Document Version**: 2.0
**Last Updated**: November 2025
**For Support**: support@nexus.platform

---

*Remember: This system is designed to help track work time fairly and accurately. If you have concerns about privacy or tracking, please speak with HR. Your feedback helps us improve!*
