# NEXUS Time & Attendance - Administrator Guide

## System Administration

This guide covers system configuration, device management, policy setup, and advanced administration for the NEXUS Time & Attendance system.

## Table of Contents

1. [System Configuration](#system-configuration)
2. [Biometric Device Management](#biometric-device-management)
3. [Policy Administration](#policy-administration)
4. [User Management](#user-management)
5. [Remote Agent Management](#remote-agent-management)
6. [Reporting and Compliance](#reporting-and-compliance)
7. [Integration and API](#integration-and-api)
8. [Security and Privacy](#security-and-privacy)
9. [Troubleshooting](#troubleshooting)

---

## System Configuration

### Initial Setup

#### 1. Organization Configuration

```bash
# Access admin portal
https://nexus.platform/admin

# Navigate to Settings → Organization
```

**Configure:**
```
Organization Details:
- Name: [Company Name]
- Industry: [Select]
- Time Zone: [Select primary timezone]
- Business Hours: [9 AM - 5 PM]
- Work Week: [Monday - Friday]
```

#### 2. Global Settings

**Attendance Settings:**
```yaml
Grace Period: 15 minutes
Auto Check-out: Enabled
  - After: 30 minutes idle
Minimum Hours/Day: 8 hours
Overtime Threshold: 8 hours
Break Policy:
  - Paid: 30 minutes (2x15min)
  - Unpaid: 60 minutes (lunch)
```

**Biometric Settings:**
```yaml
Verification Threshold: 90%
Anti-passback: Enabled
Duplicate Check: Enabled
Enrollment:
  - Min Fingerprints: 2
  - Face Photo Quality: High
  - Iris Scan Quality: High
```

**Remote Work Settings:**
```yaml
Tracking Enabled: Yes
Screenshot Capture: Optional (Employee choice)
Screenshot Interval: 10 minutes
Blur Screenshots: Yes (default)
Productivity Tracking: Yes
Idle Timeout: 5 minutes
```

---

## Biometric Device Management

### Supported Devices

#### 1. ZKTeco Devices

**Models Supported:**
- ZK4500 (Fingerprint)
- ZKFace (Face Recognition)
- MultiBio800 (Fingerprint + Face)
- iClock Series

**Connection Setup:**
```javascript
Device Type: ZKTeco
Connection: TCP/IP
IP Address: 192.168.1.100
Port: 4370
Password: [Device password]
```

#### 2. Suprema BioStar

**Models:**
- BioStation 2
- BioStation A2
- BioLite Net

**Connection:**
```javascript
Device Type: Suprema
Connection: HTTP API
API Endpoint: http://192.168.1.101
API Key: [Your API key]
```

#### 3. HID Global

**Models:**
- DigitalPersona
- HID iCLASS
- Crescendo Series

**Connection:**
```javascript
Device Type: HID
Connection: Serial/USB
SDK Path: /opt/hid/sdk
```

#### 4. Generic HTTP Devices

```javascript
Device Type: Generic
Connection: HTTP
API Endpoint: http://device.local/api
Authentication: Bearer Token
```

### Adding New Device

#### Step-by-Step

1. **Physical Installation**
   - Mount device at entry point
   - Connect power supply
   - Connect to network (Ethernet recommended)
   - Note IP address

2. **System Registration**
   ```bash
   Admin Portal → Devices → Add Device

   Device Details:
   - Name: Main Entrance
   - Manufacturer: ZKTeco
   - Model: MultiBio800
   - Serial Number: ZK20251234
   - Location: Building A, Floor 1
   ```

3. **Network Configuration**
   ```
   Connection Type: TCP/IP
   IP Address: 192.168.1.100
   Port: 4370
   Device Password: [Set during install]
   ```

4. **Test Connection**
   - Click "Test Connection"
   - Should see: ✅ Connected Successfully
   - Device status: Online

5. **Configure Settings**
   ```
   Verification Mode: Fingerprint + PIN
   Verification Threshold: 90%
   Wiegand Output: Disabled
   Voice Feedback: Enabled
   Display Language: English
   ```

6. **Sync Users**
   - Click "Sync Users"
   - Select employees to enroll
   - Generates enrollment tasks

### Device Monitoring

#### Health Dashboard

```
┌──────────────────────────────────────┐
│ Device Health Overview                │
├──────────────────────────────────────┤
│ Total Devices: 15                     │
│ Online: 14        (93%)              │
│ Offline: 1        (7%)               │
│ Errors: 0         (0%)               │
└──────────────────────────────────────┘

Recent Alerts:
⚠️  Building C - Main Gate
    Status: Offline
    Since: 2:35 PM
    Action: [Investigate] [Dismiss]
```

#### Device Logs

View detailed logs:
```bash
Admin → Devices → [Select Device] → Logs

Filter By:
- Event Type: [All/Verification/Error/Sync]
- Date Range: [Last 7 days]
- Employee: [All]
```

Sample log entry:
```
2025-11-21 09:15:23 | VERIFICATION_SUCCESS
User: John Doe (ID: 12345)
Method: Fingerprint
Confidence: 95%
Device: Main Entrance
Action: Check-in
```

### Firmware Updates

```bash
# Check for updates
Admin → Devices → Firmware Management

Available Updates:
- ZKTeco MultiBio800: v8.2.1 → v8.3.0
  Release Notes: Bug fixes, improved recognition
  [Update Now] [Schedule] [Skip]

# Schedule update
Select: During off-hours (2:00 AM - 4:00 AM)
Notify: Yes
Rollback on Failure: Yes
```

---

## Policy Administration

### Creating Attendance Policies

#### Standard Policy (9-5 Office)

```yaml
Policy Name: Standard Office Hours
Type: Regular
Organization: All Departments

Work Schedule:
  Days: Monday - Friday
  Start Time: 09:00 AM
  End Time: 05:00 PM
  Core Hours: 10:00 AM - 04:00 PM
  Grace Period: 15 minutes
  Minimum Hours: 8.0 hours/day

Overtime:
  Enabled: Yes
  After Hours: 8.0
  Multiplier: 1.5x
  Requires Approval: Yes

Breaks:
  Paid Breaks:
    - Duration: 15 minutes
    - Count: 2 per day
  Unpaid Break:
    - Duration: 60 minutes
    - Count: 1 per day

Remote Work:
  Allowed: Yes
  Track Productivity: Yes
  Screenshots: Optional
  Min Active %: 70%
```

#### Flexible Policy

```yaml
Policy Name: Flexible Hours
Type: Flexible

Work Schedule:
  Days: Monday - Friday
  Core Hours: 10:00 AM - 04:00 PM (must be present)
  Flexible Start: 07:00 AM - 10:00 AM
  Flexible End: 04:00 PM - 08:00 PM
  Minimum Hours: 8.0 hours/day
  Grace Period: 30 minutes

Note: Employees choose start time within window
```

#### Shift Policy

```yaml
Policy Name: 24/7 Operations
Type: Shift-based

Shifts:
  Morning Shift:
    Time: 06:00 AM - 02:00 PM
    Days: Monday - Friday

  Evening Shift:
    Time: 02:00 PM - 10:00 PM
    Days: Monday - Friday

  Night Shift:
    Time: 10:00 PM - 06:00 AM
    Days: Sunday - Thursday
    Multiplier: 1.25x (night differential)

Rotation: Weekly
```

### Assigning Policies

#### Bulk Assignment

```bash
Admin → Policies → [Select Policy] → Assign Users

Options:
1. Assign to Department:
   - Select: Engineering
   - Effective From: Next Monday
   - [Assign All]

2. Assign to Individuals:
   - Search and select users
   - Effective From: Specific date
   - [Assign Selected]

3. Assign to Location:
   - Select: Building A
   - All employees in location
   - [Assign All]
```

---

## User Management

### Bulk User Operations

#### Import Users

```bash
Admin → Users → Import

# Download template
[Download CSV Template]

# Template format:
email,first_name,last_name,department,employee_id,policy_id
john@company.com,John,Doe,Engineering,EMP001,policy-uuid
jane@company.com,Jane,Smith,Marketing,EMP002,policy-uuid

# Upload
[Choose File] → [Validate] → [Import]

Results:
✅ Successfully imported: 45 users
⚠️  Warnings: 3 (duplicate emails - skipped)
❌ Errors: 0
```

#### Bulk Enrollment

```bash
Admin → Devices → Bulk Enrollment

1. Select Device: Main Entrance
2. Select Users:
   - Department: All New Hires
   - Date Range: Last 30 days
   - [Select All]

3. Enrollment Method:
   ☑ Fingerprint (minimum 2)
   ☑ Face
   ☐ Iris

4. Schedule:
   - Date: Tomorrow
   - Time: 9:00 AM - 12:00 PM
   - Location: HR Office

5. [Generate Enrollment List]
   - Email sent to users
   - Calendar invites sent
   - HR notified
```

### User Deactivation

```bash
# When employee leaves
Admin → Users → [Select User] → Deactivate

Options:
☑ Remove from all devices
☑ Revoke remote agent access
☑ Disable login
☑ Mark attendance records
☐ Delete data (not recommended)

Last Working Day: [Select Date]

[Deactivate User]

Cleanup:
- Biometric data: Encrypted and archived
- Attendance records: Retained (7 years)
- Personal data: Anonymized after 90 days
```

---

## Remote Agent Management

### Agent Deployment

#### Windows Deployment

```powershell
# MSI installer
msiexec /i NexusTimeAgent-v2.0.msi /quiet COMPANY_URL=https://nexus.company.com

# Group Policy deployment
1. Upload MSI to network share
2. Create GPO
3. Assign to user/computer
4. Reboot to install

# Configuration file
%PROGRAMDATA%\NexusTime\config.json
{
  "serverUrl": "https://nexus.company.com",
  "autoStart": true,
  "screenshotEnabled": false,
  "privacyMode": true,
  "updateChannel": "stable"
}
```

#### macOS Deployment

```bash
# DMG installer
sudo installer -pkg NexusTimeAgent-v2.0.pkg -target /

# MDM deployment (Jamf, Intune)
- Upload PKG
- Create policy
- Scope to users
- Deploy

# Launch agent
~/Library/LaunchAgents/com.nexus.timeagent.plist
```

#### Linux Deployment

```bash
# Debian/Ubuntu
dpkg -i nexus-time-agent_2.0_amd64.deb

# RHEL/CentOS
rpm -i nexus-time-agent-2.0.x86_64.rpm

# Configuration
/etc/nexus-time/config.json
```

### Agent Monitoring

```bash
Admin → Remote Agents → Overview

Status:
- Total Agents: 250
- Online: 245 (98%)
- Offline: 5 (2%)
- Outdated: 12 (need update)

Versions:
- v2.0: 238 agents
- v1.9: 12 agents (update available)

Alerts:
⚠️  5 agents offline >24 hours
⚠️  12 agents need update
⚠️  2 agents reporting errors
```

### Forced Updates

```bash
Admin → Remote Agents → Updates

# Select outdated agents
Filter: Version < 2.0
Select All (12 agents)

# Push update
Update Method: Automatic
Schedule: Tonight 11:00 PM
Retry on Failure: Yes
Max Retries: 3

[Push Update]

# Monitor progress
Real-time status updates
Email notification when complete
```

---

## Reporting and Compliance

### Compliance Reports

#### GDPR Compliance

```bash
Admin → Compliance → GDPR

Reports:
1. Data Processing Inventory
   - What data we collect
   - Why we collect it
   - How long we keep it
   - Who has access

2. User Consent Log
   - Employee consent records
   - Date of consent
   - What they consented to
   - Opt-outs

3. Data Access Log
   - Who accessed what data
   - When
   - Purpose
   - Export available

4. Data Retention Report
   - Data scheduled for deletion
   - Retention periods
   - Archive status
```

#### Labor Law Compliance

```bash
Admin → Compliance → Labor Laws

Select Region: [United States - California]

Reports:
1. Overtime Compliance
   - Employees working >40h/week
   - Overtime pay calculation
   - Unpaid overtime alerts

2. Break Compliance
   - Employees missing required breaks
   - Break duration compliance
   - Meal period violations

3. Working Hours Audit
   - Weekly hours per employee
   - Excessive hours (>60h/week)
   - Minimum rest periods

4. Child Labor (if applicable)
   - Hours worked by minors
   - Time restrictions compliance
   - Work permit status
```

### Audit Logs

```bash
Admin → Security → Audit Logs

Filter:
- Action: [All/Create/Update/Delete/View]
- User: [All/Specific user]
- Resource: [Attendance/Policy/Device/User]
- Date Range: [Last 30 days]
- Export: [CSV/PDF]

Sample Entries:
2025-11-21 14:35:22 | UPDATE | admin@company.com
  Resource: Attendance Policy "Standard Hours"
  Changes: grace_period: 10min → 15min
  IP: 192.168.1.50

2025-11-21 09:15:10 | DELETE | hr@company.com
  Resource: User "John Doe"
  Reason: Employee termination
  IP: 192.168.1.45
```

---

## Integration and API

### REST API

#### Authentication

```bash
# Generate API key
Admin → API → Create Key

Key Details:
Name: Payroll Integration
Scopes:
  ☑ attendance:read
  ☑ reports:read
  ☐ users:write
Expires: Never (or set expiration)

[Generate]

API Key: nxs_api_1234567890abcdef...
Secret: [Copy - shown only once]
```

#### Example API Calls

```bash
# Get attendance for date range
curl -X GET https://nexus.platform/api/v1/attendance \
  -H "Authorization: Bearer nxs_api_1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-11-01",
    "end_date": "2025-11-30",
    "user_ids": ["user-123", "user-456"]
  }'

# Export for payroll
curl -X POST https://nexus.platform/api/v1/reports/payroll \
  -H "Authorization: Bearer nxs_api_1234567890abcdef" \
  -d '{
    "pay_period_start": "2025-11-01",
    "pay_period_end": "2025-11-15",
    "format": "adp"
  }' \
  -o payroll_export.csv
```

### Webhook Integration

```bash
Admin → Integrations → Webhooks

# Add webhook
URL: https://your-system.com/webhooks/attendance
Events:
  ☑ attendance.checked_in
  ☑ attendance.checked_out
  ☑ overtime.approved
  ☑ leave.approved
Secret: [Auto-generated]

[Create Webhook]

# Test webhook
[Send Test Event]

# Webhook payload example
{
  "event": "attendance.checked_in",
  "timestamp": "2025-11-21T09:00:00Z",
  "data": {
    "user_id": "user-123",
    "check_in_time": "2025-11-21T09:00:00Z",
    "location": "office",
    "device_id": "device-001"
  }
}
```

### HRIS Integration

#### Supported Systems

- **Workday**: OAuth 2.0, REST API
- **BambooHR**: API Key
- **ADP**: SFTP + API
- **SAP SuccessFactors**: OData API
- **Custom**: REST API

#### Setup Example (Workday)

```bash
Admin → Integrations → HRIS

Select System: Workday

Authentication:
Client ID: [Your client ID]
Client Secret: [Your secret]
Tenant: [Your tenant]
Authorize: [Click to OAuth flow]

Sync Configuration:
- Import employees: Daily at 2:00 AM
- Export attendance: Daily at 11:00 PM
- Two-way sync: Employee updates

Field Mapping:
Workday Field → NEXUS Field
employee_id → user_id
email → email
department → department
manager_id → manager_id

[Save & Test]
```

---

## Security and Privacy

### Access Control

#### Role Definitions

```yaml
Super Admin:
  - Full system access
  - Add/remove admins
  - Configure global settings
  - Access all data

HR Admin:
  - User management
  - Policy configuration
  - Compliance reports
  - No system settings

IT Admin:
  - Device management
  - Agent deployment
  - System monitoring
  - No user data access

Manager:
  - View team data only
  - Approve requests
  - Team reports
  - No policy changes

Employee:
  - View own data only
  - Submit requests
  - Download own reports
  - No access to others
```

#### Two-Factor Authentication

```bash
Admin → Security → 2FA

Enforce 2FA:
☑ All Admins (required)
☑ Managers (optional)
☐ Employees (optional)

Methods Allowed:
☑ Authenticator App (Google/Microsoft)
☑ SMS
☐ Email (less secure)

Grace Period: 7 days to enroll
Backup Codes: 10 codes per user
```

### Data Protection

#### Encryption

```yaml
At Rest:
  - Database: AES-256 encryption
  - Biometric Templates: Encrypted with organization key
  - Screenshots: Encrypted in MinIO
  - Backups: Encrypted before upload

In Transit:
  - API: TLS 1.3
  - Device Communication: TLS 1.2+
  - Agent Communication: WSS (WebSocket Secure)

Key Management:
  - Rotation: Every 90 days
  - Storage: Hardware Security Module (HSM)
  - Backup: Encrypted key escrow
```

#### Data Retention

```bash
Admin → Settings → Data Retention

Policies:
Attendance Records: 7 years (required by law)
Activity Logs: 1 year
Screenshots: 90 days
Audit Logs: 5 years
Deleted Users: 90 days (then anonymized)

Automatic Cleanup:
☑ Run monthly
☑ Email report to admin
☑ Archive before deletion
```

### Privacy Controls

```bash
Admin → Privacy → Employee Controls

Employee Rights:
☑ View own data
☑ Export own data (GDPR)
☑ Request deletion (within policy)
☑ Opt-out of screenshots
☑ Mark personal time

Manager Restrictions:
☑ Cannot see employee passwords
☑ Cannot access deleted users
☑ Cannot bypass privacy settings
☑ Cannot export biometric data
☑ Audit log for all access

Anonymization:
After termination + 90 days:
- Name → "Former Employee 12345"
- Email → Hashed
- Biometrics → Deleted
- Attendance → Retained (anonymous)
```

---

## Troubleshooting

### Common Issues

#### Device Connectivity

**Problem: Device shows offline**

```bash
Diagnostics:
1. Check physical connection
   - LED lights on?
   - Network cable connected?
   - Power supply okay?

2. Network test
   - Ping device IP
   - Check firewall rules
   - Verify VLAN configuration

3. Device reboot
   - Power cycle device
   - Wait 2 minutes
   - Check status

4. Re-add device
   - Delete from system
   - Factory reset device
   - Re-add with wizard
```

#### Sync Issues

**Problem: Data not syncing**

```bash
Admin → Devices → [Select Device] → Diagnostics

Run Diagnostics:
✅ Network: Connected
✅ Time Sync: Correct
❌ Database: Connection timeout
⚠️  Memory: 95% full

Actions:
1. Clear device memory
   - Archive old records
   - Free up space
   - Retry sync

2. Manual sync
   - Click "Force Sync"
   - Monitor progress
   - Verify data

3. Check logs
   - Review error logs
   - Identify root cause
   - Apply fix
```

#### Agent Issues

**Problem: Agent not tracking**

```bash
Admin → Remote Agents → [Select User] → Troubleshoot

Checks:
✅ Agent installed: Yes (v2.0)
✅ Internet: Connected
❌ Last heartbeat: 2 hours ago
⚠️  Error count: 15

Actions:
1. Send wake-up ping
2. Request agent restart
3. Push configuration update
4. Reinstall if needed

User Self-Service:
Email reinstall link to user
Include troubleshooting steps
Schedule support call if needed
```

---

## Appendix

### System Requirements

#### Server

```yaml
Minimum:
  CPU: 4 cores
  RAM: 8 GB
  Storage: 100 GB SSD
  Network: 1 Gbps

Recommended (1000+ users):
  CPU: 16 cores
  RAM: 32 GB
  Storage: 500 GB SSD (NVMe)
  Network: 10 Gbps
  Database: Separate server
  Cache: Separate Redis cluster
```

#### Devices

```yaml
Network Requirements:
  - Static IP (recommended)
  - Open ports: 4370, 443
  - Ping latency: <50ms
  - Bandwidth: 1 Mbps

Power:
  - UPS recommended
  - Power over Ethernet (PoE) supported
  - Battery backup (device dependent)
```

#### Agent (Desktop)

```yaml
Windows:
  OS: Windows 10/11 (64-bit)
  RAM: 2 GB
  Disk: 100 MB

macOS:
  OS: macOS 10.15+
  RAM: 2 GB
  Disk: 100 MB

Linux:
  OS: Ubuntu 20.04+, RHEL 8+
  RAM: 1 GB
  Disk: 50 MB
```

### Performance Benchmarks

```
Operation               | Response Time | Throughput
------------------------|---------------|------------
Check-in (biometric)    | <2 seconds    | 100/minute
Check-in (remote)       | <500ms        | 1000/minute
Activity logging        | <100ms        | 10000/minute
Report generation       | <5 seconds    | 10 concurrent
Device sync             | <30 seconds   | 5000 records
Agent heartbeat         | <1 second     | 1000/minute
```

---

**Document Version**: 2.0
**Last Updated**: November 2025
**Admin Support**: admin-support@nexus.platform
**Emergency**: +1-800-NEXUS-911

---

*For detailed API documentation, see: https://docs.nexus.platform/api/time-attendance*
