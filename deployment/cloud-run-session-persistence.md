# Cloud Run Session Persistence Configuration

This document outlines how to configure persistent session storage for the Vana ADK application on Google Cloud Run.

## Overview

The Vana application supports multiple session storage configurations:

1. **Development**: Local SQLite with GCS backup
2. **Production**: Persistent volume with SQLite and GCS backup/restore
3. **Enterprise**: Custom database URI (Cloud SQL, etc.)

## Configuration Options

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CLOUD_RUN_SESSION_DB_PATH` | Path to persistent session database in Cloud Run | `/data/sessions/vana_sessions.db` |
| `SESSION_DB_URI` | Custom database URI | `postgresql://user:pass@host:5432/dbname` |

### Deployment Configurations

#### 1. Cloud Run with Persistent Volume (Recommended)

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: vana
  annotations:
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/vana:latest
        env:
        - name: CLOUD_RUN_SESSION_DB_PATH
          value: "/data/sessions/vana_sessions.db"
        volumeMounts:
        - name: session-storage
          mountPath: "/data/sessions"
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
      volumes:
      - name: session-storage
        persistentVolumeClaim:
          claimName: vana-session-pvc
```

#### 2. Using Cloud SQL

```bash
# Set environment variable for Cloud SQL
export SESSION_DB_URI="postgresql://username:password@/database?host=/cloudsql/project:region:instance"
```

#### 3. Development/Local

No additional configuration needed. Uses local SQLite with automatic GCS backup.

## Deployment Commands

### Terraform Configuration

```hcl
# deployment/terraform/cloud_run.tf
resource "google_cloud_run_service" "vana" {
  name     = "vana"
  location = var.region

  template {
    metadata {
      annotations = {
        "run.googleapis.com/execution-environment" = "gen2"
        "run.googleapis.com/cpu-throttling" = "false"
      }
    }

    spec {
      containers {
        image = var.container_image
        
        env {
          name  = "CLOUD_RUN_SESSION_DB_PATH"
          value = "/data/sessions/vana_sessions.db"
        }
        
        volume_mounts {
          name       = "session-storage"
          mount_path = "/data/sessions"
        }
        
        resources {
          limits = {
            cpu    = "2"
            memory = "4Gi"
          }
        }
      }
      
      volumes {
        name = "session-storage"
        
        persistent_volume_claim {
          claim_name = google_persistent_volume_claim.session_storage.metadata[0].name
        }
      }
    }
  }
}

resource "google_persistent_volume_claim" "session_storage" {
  metadata {
    name = "vana-session-pvc"
  }
  
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "10Gi"
      }
    }
  }
}
```

### Manual Deployment

```bash
# Deploy with session persistence
gcloud run deploy vana \
  --image gcr.io/PROJECT_ID/vana:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars CLOUD_RUN_SESSION_DB_PATH=/data/sessions/vana_sessions.db \
  --add-volume name=session-storage,type=cloud-storage,bucket=PROJECT_ID-vana-session-storage \
  --add-volume-mount volume=session-storage,mount-path=/data/sessions \
  --execution-environment gen2 \
  --cpu 2 \
  --memory 4Gi
```

## Session Backup Strategy

### Automatic Backups

The application automatically:

1. **Creates GCS bucket** for session backups if it doesn't exist
2. **Restores from backup** if no local session database exists
3. **Periodic backups** every 6 hours to GCS (development mode)
4. **Backup on shutdown** (production mode with persistent volumes)

### Manual Backup/Restore

```python
from app.utils.session_backup import backup_session_db_to_gcs, restore_session_db_from_gcs

# Manual backup
backup_path = backup_session_db_to_gcs(
    local_db_path="/tmp/vana_sessions.db",
    bucket_name="PROJECT_ID-vana-session-storage", 
    project_id="PROJECT_ID"
)

# Manual restore
success = restore_session_db_from_gcs(
    local_db_path="/tmp/vana_sessions.db",
    bucket_name="PROJECT_ID-vana-session-storage",
    project_id="PROJECT_ID"
)
```

### Backup Monitoring

Session backup operations are logged to Cloud Logging with structured logs:

```json
{
  "message": "Session storage configured with local SQLite, GCS backup, and periodic backups",
  "local_db": "/tmp/vana_sessions.db",
  "backup_bucket": "analystai-454200-vana-session-storage",
  "uri": "sqlite:////tmp/vana_sessions.db",
  "severity": "INFO"
}
```

## Health Monitoring

The `/health` endpoint provides session storage status:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-04T15:03:49.866790",
  "service": "vana",
  "version": "1.0.0",
  "session_storage_enabled": true,
  "session_storage_uri": "sqlite:////tmp/vana_sessions.db",
  "session_storage_bucket": "analystai-454200-vana-session-storage"
}
```

## Security Considerations

1. **IAM Permissions**: Ensure Cloud Run service account has:
   - `storage.buckets.create` (for bucket creation)
   - `storage.objects.create` (for backups)
   - `storage.objects.get` (for restores)

2. **Encryption**: All session data is encrypted at rest in GCS and SQLite

3. **Access Control**: Session data is isolated per project and bucket

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check service account IAM permissions
2. **Bucket Not Found**: Verify bucket name and region
3. **Database Locked**: Ensure no concurrent access to SQLite file

### Debug Commands

```bash
# Check session storage status
curl https://vana-prod-PROJECT_NUMBER.us-central1.run.app/health

# View logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50 --format=json

# List backups
gsutil ls gs://PROJECT_ID-vana-session-storage/session_backups/
```

## Migration Guide

### From In-Memory to Persistent

1. Deploy with new configuration
2. Existing sessions will be lost (one-time migration)
3. New sessions will persist across restarts

### From Development to Production

1. Create final backup in development
2. Deploy to production with `CLOUD_RUN_SESSION_DB_PATH`
3. Sessions will restore from latest backup automatically

## Performance Considerations

- **SQLite**: Suitable for moderate concurrent users (< 1000)
- **Cloud SQL**: Recommended for high concurrency (> 1000 users)
- **Backup frequency**: Adjust based on session criticality
- **Storage costs**: Monitor GCS usage for backup files