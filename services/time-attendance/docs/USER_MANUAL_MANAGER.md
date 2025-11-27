# NEXUS Time & Attendance - Manager User Manual

## Introduction

As a manager, you're responsible for overseeing your team's attendance, approving time-off requests, and ensuring accurate time tracking. This guide covers everything you need to manage your team effectively.

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Team Attendance Management](#team-attendance-management)
3. [Approvals](#approvals)
4. [Reports and Analytics](#reports-and-analytics)
5. [Team Productivity](#team-productivity)
6. [Policy Enforcement](#policy-enforcement)

---

## Dashboard Overview

### Accessing Manager Portal

1. **Login**: https://nexus.platform/manager
2. **Dashboard**: Your landing page shows:
   - Team attendance status (real-time)
   - Pending approvals
   - Today's absent employees
   - This week's productivity trends
   - Alerts and notifications

### Key Metrics at a Glance

```
┌─────────────────────────────────────┐
│ Today's Team Status                 │
├─────────────────────────────────────┤
│ ✅ Present: 23/25                   │
│ ❌ Absent: 2                        │
│ 🏠 Remote: 15                       │
│ 🏢 Office: 8                        │
│ ⏰ Late: 3                          │
│ ⚠️  Pending Check-out: 5            │
└─────────────────────────────────────┘
```

---

## Team Attendance Management

### Viewing Team Attendance

#### Daily View

1. **Navigate to "Team" → "Daily Attendance"**
2. **Select Date** (defaults to today)
3. **View Team Status**:

| Employee | Check-in | Check-out | Hours | Status | Location |
|----------|----------|-----------|-------|--------|----------|
| John Doe | 9:05 AM | 6:15 PM | 9.2h | ✅ Present | Remote |
| Jane Smith | 8:55 AM | - | - | 🟡 Working | Office |
| Bob Wilson | - | - | 0h | ❌ Absent | - |

4. **Actions Available**:
   - View details (click name)
   - Send reminder (for missing check-out)
   - Mark exception
   - Export to Excel

#### Weekly View

- See trends over 7 days
- Identify patterns (late arrivals, early departures)
- Export for review meetings

#### Monthly View

- Calendar-style grid
- Color-coded by status
- Hours worked per day
- Leave days highlighted

### Real-Time Monitoring

**Live Dashboard Features:**

1. **Who's Working Now**
   - Green dot = Active
   - Yellow dot = Idle (>5 minutes)
   - Gray = Offline

2. **Current Activity**
   - For remote workers only
   - Shows current application
   - Productivity status

3. **Alerts**
   - Unusual patterns
   - Extended idle time
   - Multiple devices logged in
   - Location anomalies

---

## Approvals

### Leave Requests

#### Approval Workflow

1. **Navigate to "Approvals" → "Leave Requests"**
2. **View Pending Requests**:

```
Employee: Sarah Johnson
Type: Vacation
Dates: Dec 20-30, 2025 (7 working days)
Reason: Family trip
Balance After: 3 days remaining
```

3. **Review Details**:
   - Check team coverage
   - View employee's leave history
   - Check current workload
   - Review leave balance

4. **Make Decision**:

   **To Approve**:
   - Click "Approve"
   - Add comment (optional)
   - Confirm

   **To Reject**:
   - Click "Reject"
   - Provide clear reason (required)
   - Suggest alternative dates (optional)
   - Confirm

5. **Automated Actions**:
   - Employee notified immediately
   - Calendar updated
   - Leave balance adjusted
   - Team calendar shows absence

#### Bulk Approvals

For multiple requests:
1. Select checkboxes
2. Click "Bulk Approve" or "Bulk Reject"
3. Add common comment
4. Confirm

### Overtime Requests

#### Pre-Approval Process

1. **Review Request**:
   ```
   Employee: Mike Chen
   Date: Nov 15, 2025
   Estimated Hours: 3 hours
   Reason: Critical release deployment
   Project: Web App v2.0
   ```

2. **Considerations**:
   - Is overtime necessary?
   - Budget availability
   - Project deadline criticality
   - Employee burnout risk

3. **Decision**:
   - Approve: OT will be tracked and paid
   - Reject: Suggest alternative approach
   - Request modification: Ask for fewer hours

#### Post-Work Review

After overtime is worked:
1. Review actual hours vs. estimated
2. Validate work was performed
3. Confirm overtime justification
4. Approve for payroll

### Manual Time Entry

#### When Employees Submit Manual Entries

**Common Scenarios:**
- Device was offline
- Forgot to check in
- Technical issues
- Work from unusual location

**Review Process:**

1. **Verify Legitimacy**:
   - Check if device was actually offline
   - Confirm with other team members
   - Review work output for that day
   - Check email/chat timestamps

2. **Approve or Reject**:
   ```
   ✅ Approve if:
   - Reason is valid
   - Times are reasonable
   - Work evidence exists

   ❌ Reject if:
   - Pattern of "forgetting"
   - Times don't match work output
   - No supporting evidence
   ```

3. **Best Practice**:
   - Add notes explaining decision
   - If rejecting, guide employee
   - Track patterns

---

## Reports and Analytics

### Standard Reports

#### 1. Team Attendance Summary

**Weekly Report**
```
Team: Engineering (25 members)
Week: Nov 13-19, 2025

Metrics:
- Attendance Rate: 96%
- Average Hours/Day: 8.3h
- Late Arrivals: 12 instances
- Overtime Hours: 45.5h
- Leave Days: 8 days
```

**How to Generate**:
1. Go to "Reports" → "Attendance Summary"
2. Select: Team, Date Range, Format
3. Click "Generate"
4. Download or Email

#### 2. Productivity Report

**Team Productivity Overview**
```
Remote Workers: 15/25

Average Productivity: 78%
- High Performers (>85%): 6 employees
- Average (70-85%): 7 employees
- Needs Attention (<70%): 2 employees

Top Productive Apps:
1. VS Code - 145 hours
2. Figma - 89 hours
3. Slack - 67 hours
```

**How to Use**:
- Identify training needs
- Recognize high performers
- Address low productivity (privately)
- Don't use for punishment

#### 3. Leave Analysis

```
Department Leave Utilization
- Total Leave Days Available: 500
- Used: 287 (57%)
- Pending: 45 (9%)
- Remaining: 168 (34%)

Trends:
- Peak months: December, July
- Unused leave risk: 23 employees
```

### Custom Reports

#### Creating Custom Report

1. **Go to "Reports" → "Custom Report Builder"**
2. **Select Data Points**:
   - Metrics: Hours, productivity, overtime
   - Filters: Department, date range, status
   - Grouping: By employee, by day, by week
3. **Preview**
4. **Save Template** (for recurring use)
5. **Schedule** (optional - auto-email weekly/monthly)

### Exporting Data

**Supported Formats**:
- Excel (.xlsx) - For analysis
- PDF - For printing/archiving
- CSV - For import to other systems
- JSON - For API integration

---

## Team Productivity

### Understanding Productivity Metrics

#### Productivity Score Calculation

```
Productivity Score = (Productive Time / Total Active Time) × 100

Where:
- Productive Time = Time in productive apps
- Total Active Time = All time except idle/breaks
```

**Score Ranges**:
- 85-100%: Excellent
- 70-84%: Good
- 60-69%: Fair
- <60%: Needs review

#### Application Categories

**You Can Customize**:
1. Go to "Settings" → "App Categories"
2. Search for application
3. Change category or productivity score
4. Applies to your team only

Example: Mark "Slack" as productive for support team

### Productivity Insights

#### Individual Employee View

```
Employee: Alex Kumar
This Week: Nov 13-19

Daily Breakdown:
Mon: 8.5h (82% productive)
Tue: 7.8h (88% productive)
Wed: 9.2h (75% productive)
Thu: 8.1h (85% productive)
Fri: 7.5h (79% productive)

Top Apps:
1. IntelliJ IDEA - 28h
2. Chrome - 12h
3. Slack - 8h

Focus Sessions:
- Average: 2.3 hours
- Longest: 4.2 hours
- Deep work: 15.5 hours
```

#### Team Comparison

- See team average
- Identify outliers (high and low)
- Respect privacy - no public shaming
- Use for 1-on-1 discussions

### Coaching for Productivity

**Best Practices**:

1. **Don't Micromanage**
   - Focus on output, not activity
   - Trust your team
   - Use data to support, not punish

2. **Have Conversations**
   - If productivity drops, ask "What's wrong?"
   - Maybe personal issues, burnout, or unclear tasks
   - Offer support, not criticism

3. **Context Matters**
   - Low productivity + high output = Good work
   - High productivity + low output = Busy work
   - Consider project phases (planning vs. execution)

4. **Address Patterns, Not Incidents**
   - One bad day is normal
   - Week-long trend needs discussion
   - Month-long issue needs intervention

---

## Policy Enforcement

### Attendance Policies

#### Your Team's Policy

View current policy:
1. Go to "Team" → "Attendance Policy"
2. See:
   - Work hours: 9 AM - 5 PM
   - Grace period: 15 minutes
   - Core hours: 10 AM - 4 PM
   - Minimum hours: 8 hours/day
   - Break allowances
   - Overtime rules

#### Enforcing Policies

**Late Arrivals**:

```
Employee has been late 3 times this week

Actions:
1. Automated warning sent
2. Manager notification
3. Option to:
   - Send reminder
   - Schedule discussion
   - Escalate to HR
   - Mark as excused (with reason)
```

**Procedure**:
1. First instance: Verbal reminder
2. Second instance: Email warning
3. Third+ instance: Formal discussion
4. Persistent pattern: Performance improvement plan

**Early Departures**:
- Same process as late arrivals
- Consider flex time requests
- Verify completion of work

### Exception Management

#### Marking Exceptions

For valid reasons (medical, emergency, etc.):

1. **Select Attendance Record**
2. **Click "Mark Exception"**
3. **Fill Form**:
   ```
   Exception Type: [Medical/Emergency/Approved]
   Reason: [Detailed explanation]
   Supporting Documents: [Upload if needed]
   ```
4. **Approve Exception**
   - Won't count against employee
   - Noted in records for auditing

### Flexible Work Arrangements

#### Approving Flexible Schedules

Some employees may need:
- Early start/late end
- Compressed work week (4x10 hours)
- Split shifts
- Partial remote

**How to Set Up**:
1. Discuss with employee
2. Document agreement
3. Go to "Team" → "Employee" → "Work Schedule"
4. Create custom schedule
5. Set effective dates
6. Monitor for 30-60 days
7. Review and adjust

---

## Best Practices

### Do's

✅ **Review Daily**
- Check team status each morning
- Address missing check-ins promptly
- Clear pending approvals

✅ **Be Fair and Consistent**
- Apply policies equally
- Document all decisions
- Give clear feedback

✅ **Communicate**
- Set expectations clearly
- Address issues quickly
- Keep team informed of changes

✅ **Use Data Wisely**
- Look for trends, not incidents
- Consider context
- Focus on outcomes

### Don'ts

❌ **Don't Micromanage**
- Tracking tools aren't for surveillance
- Trust your team
- Focus on results, not activity

❌ **Don't Ignore Patterns**
- Address issues early
- Don't let problems fester
- Small issues become big ones

❌ **Don't Punish Without Discussion**
- Always hear the employee's side
- There's usually a valid reason
- Work together on solutions

❌ **Don't Share Individual Data Publicly**
- Productivity scores are private
- No team-wide comparisons
- One-on-one discussions only

---

## Troubleshooting

### Common Issues

**Problem: Employee Says Check-in Failed But System Shows Present**

Solution:
1. Check audit log
2. Verify device records
3. Check for duplicate entry
4. Review timestamp
5. Correct if needed, document decision

**Problem: Productivity Score Seems Wrong**

Solution:
1. Review application categorization
2. Check for personal time blocks
3. Consider work type (meetings, planning)
4. Discuss with employee
5. Adjust categories if needed

**Problem: Team Not Following Policy**

Solution:
1. Review policy with team
2. Ensure policy is clear and reasonable
3. Address non-compliance individually
4. Consider if policy needs adjustment
5. Escalate persistent issues to HR

---

## Advanced Features

### Analytics Dashboard

**Custom Widgets**:
- Team attendance heatmap
- Productivity trends
- Overtime tracking
- Leave forecasting

**Alerts Configuration**:
- Set custom thresholds
- Email/Slack notifications
- Escalation rules

### Integration

**Export to Payroll**:
1. Go to "Reports" → "Payroll Export"
2. Select pay period
3. Review hours
4. Export format (ADP, QuickBooks, etc.)
5. Submit to payroll

---

## Appendix

### Approval Response Time SLA

| Request Type | Target Response Time |
|--------------|---------------------|
| Urgent Leave | 4 hours |
| Regular Leave | 24 hours |
| Overtime | Same day |
| Manual Entry | 48 hours |

### Policy Violation Severity

| Level | Examples | Action |
|-------|----------|--------|
| Minor | 1-2 late arrivals/month | Verbal warning |
| Moderate | 5+ late arrivals/month | Formal warning |
| Severe | Attendance fraud | Disciplinary action |

---

**Document Version**: 2.0
**Last Updated**: November 2025
**Manager Support**: managers@nexus.platform
