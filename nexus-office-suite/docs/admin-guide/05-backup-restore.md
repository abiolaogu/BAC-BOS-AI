# Backup and Restore Guide

**Version**: 1.0
**Last Updated**: November 2025

---

## Backup Strategies

### 3-2-1 Backup Rule

- **3** copies of data
- **2** different media types
- **1** offsite copy

---

## Database Backups

### PostgreSQL Backup

**Automated Backup Script**:
```bash
#!/bin/bash
# /usr/local/bin/backup-postgres.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nexus_$TIMESTAMP.sql.gz"

# Create backup
pg_dump -h localhost -U nexus -d nexus | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://nexus-backups/postgres/

# Delete local backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Delete S3 backups older than 90 days
aws s3 ls s3://nexus-backups/postgres/ | awk '{print $4}' | \
  while read file; do
    # Logic to delete old files
  done
```

**Cron Schedule**:
```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/backup-postgres.sh
```

**Continuous Archiving (WAL)**:
```conf
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://nexus-backups/wal/%f'
```

### Restore Database

```bash
# Stop services
docker compose stop api-gateway writer-service sheets-service

# Restore from backup
gunzip < nexus_20251116_020000.sql.gz | psql -h localhost -U nexus -d nexus

# Restart services
docker compose start
```

---

## File Storage Backups

### MinIO/S3 Backup

**Using Rclone**:
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone
rclone config
# Add MinIO source and S3 destination

# Sync script
#!/bin/bash
rclone sync minio:nexus-files s3:nexus-backups-files \
  --transfers 10 \
  --checkers 8 \
  --log-file /var/log/rclone-backup.log

# Schedule daily
0 3 * * * /usr/local/bin/backup-minio.sh
```

**Versioning**:
```bash
# Enable versioning on S3
aws s3api put-bucket-versioning \
  --bucket nexus-files \
  --versioning-configuration Status=Enabled

# Set lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket nexus-files \
  --lifecycle-configuration file://lifecycle.json
```

---

## Application Configuration Backup

```bash
# Export environment variables
docker compose exec api-gateway env > env_backup_$(date +%Y%m%d).txt

# Kubernetes secrets
kubectl get secrets -n nexus -o yaml > secrets_backup_$(date +%Y%m%d).yaml

# ConfigMaps
kubectl get configmaps -n nexus -o yaml > configmaps_backup_$(date +%Y%m%d).yaml
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)

- **Critical services**: < 1 hour
- **Full platform**: < 4 hours

### Recovery Point Objective (RPO)

- **Database**: < 5 minutes (WAL archiving)
- **Files**: < 24 hours (daily backups)

### DR Procedure

1. **Provision Infrastructure** (if needed)
2. **Restore Database** from latest backup
3. **Restore Files** from storage backup
4. **Deploy Application** using Docker/K8s
5. **Verify Functionality**
6. **Update DNS** (if failover)

---

**Previous**: [Monitoring](04-monitoring.md) | **Next**: [Scaling →](06-scaling.md)
