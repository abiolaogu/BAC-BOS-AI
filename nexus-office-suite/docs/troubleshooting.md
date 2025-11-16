# Troubleshooting Guide

**Version**: 1.0
**Last Updated**: November 2025

---

## Login Issues

### Cannot log in / "Invalid credentials" error

**Symptoms**: Unable to log in despite correct credentials

**Possible Causes**:
- Incorrect email or password
- Account disabled
- Caps Lock enabled
- Browser cache issues

**Solutions**:
1. Verify email and password are correct
2. Check if Caps Lock is on
3. Try "Forgot Password" to reset
4. Clear browser cache and cookies:
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
5. Try incognito/private browsing mode
6. Try different browser
7. Contact administrator to check account status

### "Account locked" message

**Cause**: Too many failed login attempts

**Solution**:
1. Wait 30 minutes for automatic unlock
2. Or contact administrator to unlock immediately
3. Reset password via "Forgot Password"

### SSO not working

**Symptoms**: Error when logging in with SSO

**Solutions**:
1. Verify SSO is enabled for your organization
2. Check identity provider (IdP) is accessible
3. Clear browser cache
4. Contact administrator to verify SSO configuration
5. Check admin logs for SAML/OAuth errors

---

## Performance Issues

### Slow document loading

**Symptoms**: Documents take long to open

**Possible Causes**:
- Large document size
- Slow internet connection
- Server overload
- Browser issues

**Solutions**:
1. Check internet speed: [speedtest.net](https://speedtest.net) (need 1+ Mbps)
2. Close other tabs and applications
3. Clear browser cache
4. Try different browser
5. Check system resources (CPU, RAM)
6. Administrators: Check server load and database performance

### Application feels slow/laggy

**Solutions**:
1. Refresh the page (F5 or Ctrl+R)
2. Close unused tabs
3. Restart browser
4. Check internet connection
5. Disable browser extensions
6. Update browser to latest version
7. Check CPU/RAM usage (close other apps)

---

## Connection Problems

### "Connection lost" error

**Symptoms**: Intermittent disconnections, "Connection lost" banner

**Solutions**:
1. Check internet connection
2. Refresh page (F5)
3. Check Wi-Fi signal strength
4. Switch to wired connection
5. Restart router/modem
6. Contact network administrator (firewall may block WebSocket)
7. Administrators: Check service health and logs

### WebSocket connection failed

**Cause**: Firewall or proxy blocking WebSocket connections

**Solution for Users**:
1. Contact IT/Network administrator
2. Try different network (mobile hotspot)
3. Use VPN (if permitted)

**Solution for Administrators**:
1. Ensure port 443 allows WebSocket connections
2. Configure proxy to allow WebSocket upgrade:
   ```nginx
   location / {
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```
3. Check firewall rules

---

## Document/File Issues

### Document not saving / Stuck on "Saving..."

**Symptoms**: Changes not saving, persistent "Saving..." indicator

**Solutions**:
1. **Do NOT close the tab** - content may be lost
2. Select all content (Ctrl+A) and copy (Ctrl+C)
3. Check internet connection
4. Wait 1-2 minutes for auto-retry
5. Open new tab, create new document, paste content
6. Refresh original tab to see if save completed
7. Check browser console for errors (F12)

### Cannot upload files

**Symptoms**: Upload fails or gets stuck

**Possible Causes**:
- File too large (> 5 GB)
- Storage quota exceeded
- Network timeout
- Unsupported file type

**Solutions**:
1. Check file size (max 5 GB via web, 50 GB via desktop app)
2. Check storage quota: Settings → Storage
3. Verify internet connection is stable
4. Try smaller files or batches
5. Use desktop app for large uploads
6. Compress files before uploading
7. Check file name (avoid special characters)

### File download failed

**Solutions**:
1. Try again (right-click file → Download)
2. Check available disk space
3. Try different browser
4. Disable download managers
5. Check antivirus isn't blocking download

---

## Meeting Quality Issues

### Poor video/audio quality in meetings

**Symptoms**: Choppy video, echo, audio drops

**Solutions**:
1. **Check internet speed**: Need 3+ Mbps for video
   - Run speed test: speedtest.net
   - Close bandwidth-heavy apps (Netflix, downloads)
2. **Reduce video quality**:
   - Click Settings → Video → Lower resolution to 720p or 360p
3. **Turn off video**: Use audio-only mode
4. **Use headphones**: Eliminates echo
5. **Close other tabs and apps**
6. **Move closer to Wi-Fi router** or use wired connection
7. **Reduce participant count**: Ask others to turn off video
8. **Restart router**

### Echo or audio feedback

**Cause**: Multiple devices in same room or speakers too loud

**Solutions**:
1. Use headphones/earbuds
2. Mute all but one device if multiple in same room
3. Reduce speaker volume
4. Enable echo cancellation (Settings → Audio)
5. Use push-to-talk mode

### Camera not working

**Solutions**:
1. Check camera is turned on (click video icon)
2. Verify browser has camera permission:
   - Chrome: Settings → Privacy → Camera
   - Look for camera icon in address bar
3. Close other apps using camera (Zoom, Teams, Skype)
4. Restart browser
5. Try different browser
6. Check camera works in other apps
7. Update camera drivers (Windows: Device Manager)

### Cannot hear others

**Solutions**:
1. Check volume is not muted (system and browser)
2. Select correct speaker device:
   - Click Settings → Audio → Speaker
3. Test speakers in Settings
4. Refresh browser
5. Try headphones
6. Update audio drivers

---

## Search Not Working

### Cannot find files/documents

**Solutions**:
1. Check spelling
2. Try different keywords
3. Use filters (type, owner, date)
4. Check "Trash" folder
5. Check "Shared with me" section
6. Verify document wasn't deleted
7. Ask document owner

---

## Browser-Specific Issues

### Chrome/Edge

**Clear cache**:
1. Settings → Privacy and security → Clear browsing data
2. Select: Cached images and files, Cookies
3. Time range: All time
4. Clear data

### Firefox

**Clear cache**:
1. Settings → Privacy & Security → Cookies and Site Data
2. Click "Clear Data"
3. Select both options
4. Clear

### Safari

**Clear cache**:
1. Safari → Preferences → Privacy
2. Manage Website Data
3. Remove All
4. Also: Develop → Empty Caches

---

## Mobile App Issues

### App crashes on mobile

**Solutions**:
1. Update app to latest version
2. Restart device
3. Clear app cache:
   - iOS: Settings → General → iPhone Storage → NEXUS → Delete App (reinstall)
   - Android: Settings → Apps → NEXUS → Storage → Clear Cache
4. Reinstall app
5. Check for OS updates

### Sync not working

**Solutions**:
1. Check internet connection
2. Enable auto-sync: Settings → Sync
3. Manual sync: Pull down to refresh
4. Log out and log back in
5. Check storage space on device

---

## Administrator Troubleshooting

### Service not starting

**Docker**:
```bash
# Check logs
docker compose logs -f <service-name>

# Common issues:
# - Port already in use
# - Environment variables missing
# - Database connection failed

# Restart service
docker compose restart <service-name>
```

**Kubernetes**:
```bash
# Check pod status
kubectl get pods -n nexus

# View logs
kubectl logs -f <pod-name> -n nexus

# Describe pod (see events)
kubectl describe pod <pod-name> -n nexus

# Restart deployment
kubectl rollout restart deployment/<deployment-name> -n nexus
```

### Database connection errors

**Symptoms**: Services can't connect to database

**Solutions**:
1. Verify database is running: `docker compose ps postgres`
2. Check database credentials in .env
3. Test connection: `psql -h localhost -U nexus -d nexus`
4. Check network connectivity
5. Verify firewall allows port 5432
6. Check PostgreSQL logs: `docker compose logs postgres`

### High memory/CPU usage

**Investigate**:
```bash
# Docker
docker stats

# Kubernetes
kubectl top pods -n nexus
kubectl top nodes

# Check for:
# - Memory leaks
# - Infinite loops
# - Database query issues
# - Too many concurrent users
```

**Solutions**:
1. Scale up resources (CPU, RAM)
2. Scale horizontally (more replicas)
3. Optimize database queries
4. Add caching
5. Review application logs for errors

---

## Error Codes

### HTTP Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Log in again |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify URL/resource exists |
| 429 | Too Many Requests | Wait and retry |
| 500 | Server Error | Retry, contact support |
| 502 | Bad Gateway | Server issue, wait |
| 503 | Service Unavailable | Server maintenance |

---

## Getting Additional Help

If you've tried the solutions above and still have issues:

1. **Check Status Page**: status.nexusplatform.io (cloud only)
2. **Community Forum**: community.nexusplatform.io
3. **Support Email**: support@nexusplatform.io
4. **Live Chat**: Available for Pro+ customers
5. **GitHub Issues**: For bugs and feature requests

### Information to Include

When contacting support, provide:
- Browser and version
- Operating system
- Steps to reproduce issue
- Screenshots or error messages
- Time when issue occurred
- User email (if relevant)

---

**Need more help?** Contact support@nexusplatform.io or visit our [community forum](https://community.nexusplatform.io).
