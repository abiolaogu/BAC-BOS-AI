# Frequently Asked Questions (FAQ)

**Version**: 1.0
**Last Updated**: November 2025

---

## General Questions

### What is NEXUS?
NEXUS is a comprehensive, self-hosted productivity platform that includes document editing, spreadsheets, presentations, file storage, and video conferencing - similar to Microsoft 365 or Google Workspace.

### Is NEXUS free?
NEXUS is open-source (AGPL-3.0 license). You can self-host it for free. We also offer managed cloud hosting with various pricing plans.

### Can I migrate from Google Workspace/Microsoft 365?
Yes! NEXUS supports importing:
- Google Docs → NEXUS Writer
- Google Sheets → NEXUS Sheets
- Google Slides → NEXUS Slides
- Microsoft Office files (.docx, .xlsx, .pptx)

### What browsers are supported?
- Chrome/Edge 90+ (recommended)
- Firefox 88+
- Safari 14+
- Opera 76+

---

## User Questions

### How do I reset my password?
1. Click "Forgot Password" on login page
2. Enter your email address
3. Check email for reset link
4. Click link and create new password

### How do I enable two-factor authentication?
1. Settings → Security → Two-Factor Authentication
2. Choose method (Authenticator app, SMS, Email)
3. Follow setup wizard
4. Save backup codes

### Can I work offline?
Yes! Install the desktop app or enable offline mode in browser. Your changes sync when you reconnect.

### How much storage do I get?
- Free: 15 GB
- Pro: 100 GB
- Business: 1 TB per user
- Enterprise: Unlimited

### How do I share a document?
1. Open document
2. Click "Share" button
3. Enter email addresses
4. Choose permission (View, Comment, Edit)
5. Click "Send"

---

## Administrator Questions

### What are the system requirements?
**Minimum** (< 50 users):
- CPU: 4 cores
- RAM: 16 GB
- Storage: 100 GB SSD

**Recommended** (500+ users):
- CPU: 16 cores per node
- RAM: 64 GB per node
- Storage: 500 GB NVMe SSD

### How do I backup NEXUS?
1. **Database**: Automated pg_dump daily
2. **Files**: S3 replication or rsync
3. **Configuration**: Export secrets and configs

See [Backup Guide](admin-guide/05-backup-restore.md) for details.

### Can I integrate with Active Directory?
Yes! NEXUS supports:
- LDAP/Active Directory
- SAML 2.0 SSO
- OAuth 2.0 (Azure AD, Okta)

See [User Management](admin-guide/03-user-management.md).

### How do I upgrade NEXUS?
**Docker**:
```bash
docker compose pull
docker compose up -d
```

**Kubernetes**:
```bash
helm upgrade nexus nexus/nexus-platform
```

### What monitoring tools are available?
- Prometheus (metrics)
- Grafana (dashboards)
- Loki (logs)
- Jaeger (tracing)

---

## Security Questions

### Is NEXUS secure?
Yes! NEXUS includes:
- End-to-end encryption for video calls
- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- Regular security audits
- Vulnerability scanning

### Is my data private?
When self-hosted, you have complete control. Data never leaves your infrastructure. Cloud-hosted plans follow strict privacy policies and comply with GDPR, HIPAA, SOC 2.

### Can I audit user activity?
Yes! Admin Panel → Audit Logs shows:
- User logins
- Document access
- File uploads/downloads
- Configuration changes
- Permission changes

---

## Troubleshooting

### I can't log in. What should I do?
1. Check email and password are correct
2. Try "Forgot Password" to reset
3. Clear browser cache and cookies
4. Try different browser
5. Contact administrator

### My document isn't saving.
1. Check internet connection
2. Look for "Saving..." indicator
3. If stuck, copy content and refresh page
4. Contact support if problem persists

### Video calls have poor quality.
1. Check internet speed (need 3+ Mbps)
2. Close other applications
3. Turn off video (audio only)
4. Move closer to Wi-Fi router
5. Use wired connection

### Files won't upload.
1. Check file size (max 5 GB via web)
2. Check storage quota
3. Verify internet connection
4. Try smaller batches
5. Use desktop app for large files

---

## Feature Requests

### How do I request a feature?
1. Visit GitHub Issues
2. Search for existing requests
3. If not found, create new issue
4. Describe feature and use case
5. Community votes on features

### When will feature X be available?
Check our [public roadmap](https://roadmap.nexusplatform.io) for planned features and timelines.

---

## Billing Questions (Cloud Plans)

### How does billing work?
- Monthly or annual billing
- Pay per user per month
- Cancel anytime
- Pro-rated refunds

### Can I change my plan?
Yes! Upgrade or downgrade anytime in Settings → Billing.

### What payment methods do you accept?
- Credit/Debit cards (Visa, Mastercard, Amex)
- PayPal
- Wire transfer (Enterprise only)

---

## Support

### How do I get help?
- **Documentation**: docs.nexusplatform.io
- **Community**: community.nexusplatform.io
- **Email**: support@nexusplatform.io
- **Live Chat**: Available for Pro+ plans

### What are your support hours?
- **Free/Self-Hosted**: Community support (24/7)
- **Pro**: Email support (9 AM - 5 PM weekdays)
- **Business**: Priority support (24/5)
- **Enterprise**: 24/7 dedicated support

---

**Still have questions?** Contact us at support@nexusplatform.io or visit our [community forum](https://community.nexusplatform.io).
