# NEXUS Time & Attendance

Enterprise-grade time and attendance management system with biometric verification and remote work tracking capabilities.

## Features

### 🏢 Office Attendance
- **Biometric Verification**: Support for multiple authentication methods
  - Fingerprint scanning
  - Iris recognition
  - Facial recognition
  - RFID card
  - PIN
- **Multi-OEM Support**: Compatible with major biometric device manufacturers
  - ZKTeco
  - Suprema (BioStar)
  - HID Global
  - Morpho
  - Anviz
  - Generic HTTP/TCP devices
- **Geo-fencing**: Location-based check-in/out validation
- **Real-time Synchronization**: Automatic attendance data sync from devices

### 💼 Remote Work Tracking
- **Desktop Agent**: Cross-platform monitoring agent (Windows, macOS, Linux)
- **Activity Tracking**: Non-invasive productivity monitoring
  - Application usage tracking
  - Active/idle time detection
  - Optional screenshot capture (with privacy controls)
  - URL monitoring for browsers
- **Productivity Scoring**: AI-powered categorization
  - Productive applications (development tools, design software)
  - Communication tools (email, messaging, video calls)
  - Neutral activities (file management, system tools)
  - Unproductive activities (social media, entertainment)
- **Privacy-First Design**:
  - Employee consent required
  - Personal time marking
  - Screenshot blurring option
  - Data access controls

### 📊 Attendance Management
- **Flexible Policies**:
  - Regular working hours
  - Flexible time
  - Shift-based schedules
  - Remote work policies
- **Auto-absence Marking**: Automatic tracking of absences
- **Manual Entry**: Admin override for special cases
- **Grace Period**: Configurable late arrival threshold
- **Overtime Tracking**: Request and approval workflow

### 🏖️ Leave Management
- **Multiple Leave Types**:
  - Annual leave
  - Sick leave
  - Personal leave
  - Maternity/Paternity leave
  - Bereavement leave
  - Unpaid leave
  - Compensatory leave
- **Balance Tracking**: Automatic leave balance calculation
- **Approval Workflow**: Manager review and approval
- **Leave Calendar**: Team leave visibility

### 📈 Reporting & Analytics
- **Attendance Reports**:
  - Daily/weekly/monthly summaries
  - Attendance rate calculation
  - Late arrival tracking
  - Absence reports
- **Productivity Reports**:
  - Individual productivity scores
  - Team productivity trends
  - Application usage analytics
  - Time utilization breakdown
- **Compliance Reports**:
  - Policy violation tracking
  - Audit logs
  - GDPR/CCPA compliance
- **Payroll Export**:
  - Working hours calculation
  - Overtime hours
  - Absence deductions
  - Excel/CSV export formats

## Architecture

### Technology Stack
- **Backend**: Node.js 20+, TypeScript, Express
- **Database**: PostgreSQL 14+ with TimescaleDB
- **Cache**: Redis 7+
- **Time-series**: TimescaleDB for efficient activity data storage
- **File Storage**: Local filesystem (screenshots, attachments)
- **Image Processing**: Sharp for screenshot optimization

### System Components
```
┌─────────────────────────────────────────────────────────────┐
│                     Time & Attendance System                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Attendance  │  │  Biometric   │  │ Remote Work  │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Leave     │  │   Overtime   │  │   Report     │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL + TimescaleDB + Redis                │
└─────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
    ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
    │Biometric│         │ Remote  │         │  Web    │
    │ Devices │         │ Agents  │         │  App    │
    └─────────┘         └─────────┘         └─────────┘
```

## Installation

### Prerequisites
- Node.js 20+ and npm 10+
- PostgreSQL 14+ with TimescaleDB extension
- Redis 7+

### Setup

1. **Clone the repository**
```bash
cd services/time-attendance
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**
```bash
psql -U postgres -d nexus_time_attendance -f database/schema.sql
```

5. **Start development server**
```bash
npm run dev
```

## Configuration

### Environment Variables

```bash
# Server
PORT=3006
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nexus_time_attendance
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# IDaaS Integration
IDAAS_URL=http://localhost:3005
IDAAS_API_KEY=your-idaas-api-key

# Biometric Devices
BIOMETRIC_DEVICE_POLL_INTERVAL=30000
BIOMETRIC_MAX_RETRY_ATTEMPTS=3

# Remote Work Agent
AGENT_HEARTBEAT_INTERVAL=300000
AGENT_ACTIVITY_UPLOAD_INTERVAL=600000
AGENT_SCREENSHOT_INTERVAL=600000

# Storage
UPLOAD_PATH=./uploads
SCREENSHOT_RETENTION_DAYS=30
```

## API Documentation

### Authentication
All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

### Endpoints

#### Attendance

**Check In**
```http
POST /api/v1/attendance/check-in
Content-Type: application/json
Authorization: Bearer <token>

{
  "policyId": "uuid",
  "verificationMethod": "fingerprint",
  "deviceId": "uuid",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "notes": "Optional notes"
}
```

**Check Out**
```http
POST /api/v1/attendance/check-out
Content-Type: application/json
Authorization: Bearer <token>

{
  "verificationMethod": "fingerprint",
  "deviceId": "uuid"
}
```

**Get Attendance Records**
```http
GET /api/v1/attendance?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Get Attendance Statistics**
```http
GET /api/v1/attendance/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

#### Remote Work

**Agent Heartbeat**
```http
POST /api/v1/agent/heartbeat
Content-Type: application/json
Authorization: Bearer <token>

{
  "agentVersion": "1.0.0",
  "isActive": true,
  "osInfo": {
    "platform": "win32",
    "version": "10.0.19045",
    "hostname": "DESKTOP-ABC123"
  }
}
```

**Upload Activity Data**
```http
POST /api/v1/agent/activity
Content-Type: application/json
Authorization: Bearer <token>

{
  "activities": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "applicationName": "Visual Studio Code",
      "windowTitle": "index.ts - Project",
      "url": null,
      "activeTimeSeconds": 300,
      "idleTimeSeconds": 60,
      "keystrokes": 1500,
      "mouseClicks": 200
    }
  ],
  "screenshot": {
    "data": "base64-encoded-image",
    "timestamp": "2024-01-15T10:00:00Z",
    "isBlurred": false
  }
}
```

**Get Productivity Statistics**
```http
GET /api/v1/productivity/stats?startDate=2024-01-01&endDate=2024-01-31&groupBy=day
Authorization: Bearer <token>
```

#### Leave Management

**Create Leave Request**
```http
POST /api/v1/leave/requests
Content-Type: application/json
Authorization: Bearer <token>

{
  "leaveType": "annual",
  "startDate": "2024-02-01",
  "endDate": "2024-02-05",
  "reason": "Family vacation"
}
```

**Review Leave Request**
```http
POST /api/v1/leave/requests/:id/review
Content-Type: application/json
Authorization: Bearer <token>

{
  "approved": true,
  "comments": "Approved"
}
```

**Get Leave Balance**
```http
GET /api/v1/leave/balance
Authorization: Bearer <token>
```

#### Overtime

**Create Overtime Request**
```http
POST /api/v1/overtime/requests
Content-Type: application/json
Authorization: Bearer <token>

{
  "overtimeDate": "2024-01-15",
  "startTime": "2024-01-15T18:00:00Z",
  "endTime": "2024-01-15T21:00:00Z",
  "reason": "Project deadline"
}
```

#### Reports

**Generate Attendance Report (Excel)**
```http
GET /api/v1/reports/attendance/excel?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Generate Productivity Report**
```http
GET /api/v1/reports/productivity/excel?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Generate Payroll Export**
```http
GET /api/v1/reports/payroll?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

## Biometric Device Integration

### Supported Manufacturers

#### ZKTeco
- Protocol: TCP Socket
- Default Port: 4370
- Features: Fingerprint, Face, RFID

#### Suprema (BioStar)
- Protocol: HTTP REST API
- Default Port: 443
- Features: Fingerprint, Face, Mobile

#### HID Global
- Protocol: HTTPS REST API
- Features: Card, Biometric

#### Generic HTTP/TCP
- Configurable endpoints
- Custom protocol support

### Device Configuration

```typescript
{
  "organizationId": "uuid",
  "name": "Main Entrance",
  "manufacturer": "zkteco",
  "model": "ZK-F19",
  "serialNumber": "ABC123",
  "ipAddress": "192.168.1.100",
  "port": 4370,
  "protocol": "tcp",
  "capabilities": ["fingerprint", "face"],
  "maxUsers": 1000,
  "settings": {
    // Manufacturer-specific settings
  }
}
```

## Remote Work Agent

### Installation

The desktop agent can be downloaded from the organization's portal.

**Windows:**
```powershell
# Download and install
./nexus-agent-installer-win.exe
```

**macOS:**
```bash
# Download and install
sudo installer -pkg nexus-agent-mac.pkg -target /
```

**Linux:**
```bash
# Download and install
sudo dpkg -i nexus-agent-linux.deb
```

### Agent Features

- **Automatic startup**: Starts with system boot
- **System tray icon**: Easy access to controls
- **Privacy controls**:
  - Enable/disable tracking
  - Blur screenshots
  - Mark personal time
- **Low resource usage**: < 50MB RAM, < 1% CPU
- **Secure communication**: TLS encryption for all data transfer

## Development

### Project Structure
```
services/time-attendance/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── types/                      # TypeScript type definitions
│   ├── services/                   # Business logic
│   │   ├── attendance.service.ts
│   │   ├── biometric.service.ts
│   │   ├── remote-work.service.ts
│   │   ├── leave.service.ts
│   │   ├── overtime.service.ts
│   │   └── report.service.ts
│   ├── routes/                     # API routes
│   ├── middleware/                 # Express middleware
│   └── utils/                      # Utilities
├── database/
│   └── schema.sql                  # Database schema
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md
│   ├── USER_MANUAL_EMPLOYEE.md
│   ├── USER_MANUAL_MANAGER.md
│   └── ADMIN_GUIDE.md
├── package.json
├── tsconfig.json
└── README.md
```

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

### Lint
```bash
npm run lint
```

## Deployment

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 3006
CMD ["node", "dist/index.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  time-attendance:
    build: .
    ports:
      - "3006:3006"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/nexus_ta
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: timescale/timescaledb:latest-pg14
    environment:
      POSTGRES_DB: nexus_ta
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine
```

## Security

- **Data Encryption**: All sensitive data encrypted at rest
- **TLS/SSL**: Enforced for all API communication
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Fine-grained permission control
- **Audit Logging**: Complete audit trail of all actions
- **GDPR Compliance**: Data privacy controls and user consent
- **Biometric Data**: Never stored in plain text

## Performance

- **Response Time**: < 100ms for most operations
- **Throughput**: 1000+ check-ins per minute
- **Database**: Optimized with TimescaleDB for time-series data
- **Caching**: Redis for sub-millisecond data access
- **Scalability**: Horizontal scaling supported

## Support

For technical support and documentation:
- Documentation: `/docs`
- GitHub Issues: [Report Issues]
- Email: support@nexusplatform.com

## License

Apache License 2.0

---

**NEXUS Platform** - Enterprise Business Operating System
