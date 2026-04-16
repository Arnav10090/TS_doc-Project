# File Storage Architecture - TS Document Generator

## Overview

The TS Document Generator uses a combination of **Docker volumes** and **local directories** for file storage. Understanding where files are stored is crucial for backup, debugging, and deployment.

---

## Storage Locations

### 1. **Docker Volumes (Persistent Storage)**

Docker volumes are used for data that needs to persist across container restarts:

#### A. Backend Uploads Volume
- **Volume Name**: `ts-doc_project_backend_uploads`
- **Container Path**: `/app/uploads`
- **Host Path**: `/var/lib/docker/volumes/ts-doc_project_backend_uploads/_data`
- **Purpose**: Stores all uploaded images and generated documents
- **Contents**:
  - `images/{project_id}/architecture.png`
  - `images/{project_id}/gantt_overall.png`
  - `images/{project_id}/gantt_shutdown.png`
  - `versions/{project_id}/TS_{client}_{solution}_v{N}.docx`

#### B. PostgreSQL Data Volume
- **Volume Name**: `ts-doc_project_postgres_data`
- **Container Path**: `/var/lib/postgresql/data`
- **Host Path**: `/var/lib/docker/volumes/ts-doc_project_postgres_data/_data`
- **Purpose**: Stores PostgreSQL database files
- **Contents**: Database tables, indexes, and transaction logs

---

### 2. **Local Directories (Development)**

These directories are mounted from your host machine into containers:

#### A. Backend Code Directory
- **Host Path**: `./backend`
- **Container Path**: `/app`
- **Mount Type**: Bind mount (read-write)
- **Purpose**: Hot reload for development
- **Key Subdirectories**:
  - `backend/app/` - Application code
  - `backend/templates/` - Word templates
  - `backend/scripts/` - Utility scripts
  - `backend/tests/` - Test files
  - `backend/uploads/` - **Empty placeholder** (actual data in Docker volume)

#### B. Frontend Code Directory
- **Host Path**: `./frontend`
- **Container Path**: `/app`
- **Mount Type**: Bind mount (read-write)
- **Purpose**: Hot reload for development
- **Excluded**: `node_modules` (separate anonymous volume)

---

## File Storage by Type

### Generated Documents (.docx)

**Storage Path**: Docker volume → `/app/uploads/versions/{project_id}/`

**Filename Format**: `TS_{client_name}_{solution_name}_v{version_number}.docx`

**Example**: `TS_Test_Client_Test_Solution_v1.docx`

**Database Record**: `document_versions` table stores metadata:
```sql
id              | UUID
project_id      | UUID (foreign key)
version_number  | Integer (1, 2, 3...)
filename        | String
file_path       | String (relative path)
created_at      | Timestamp
```

**Access**:
- Via API: `GET /api/v1/versions/{version_id}/download`
- Direct: Inside container at `/app/uploads/versions/{project_id}/`

---

### Uploaded Images (.png, .jpg)

**Storage Path**: Docker volume → `/app/uploads/images/{project_id}/`

**Filenames**:
- `architecture.png` - System architecture diagram
- `gantt_overall.png` - Overall project Gantt chart
- `gantt_shutdown.png` - Commissioning Gantt chart

**Database Record**: No database record (filesystem only)

**Access**:
- Via API: `GET /api/v1/projects/{id}/images`
- Via API: `POST /api/v1/projects/{id}/images/{image_type}` (upload)
- Via API: `DELETE /api/v1/projects/{id}/images/{image_type}`
- Direct: Inside container at `/app/uploads/images/{project_id}/`

---

### Templates (.docx)

**Storage Path**: Local directory → `./backend/templates/`

**Files**:
- `TS_Template_original.docx` - Original Word template (source)
- `TS_Template_jinja.docx` - **Active template** with Jinja2 variables
- `TS_Template_jinja_backup.docx` - Backup before repairs
- `test_output.docx` - Test render output

**Container Path**: `/app/templates/`

**Access**: Read-only by backend during document generation

---

## Accessing Files

### From Host Machine

#### Option 1: Docker Volume Inspection
```bash
# List all volumes
docker volume ls

# Inspect volume location
docker volume inspect ts-doc_project_backend_uploads

# Access files (requires root/admin on Linux/Mac)
# Windows: Docker Desktop manages volumes internally
```

#### Option 2: Copy from Container
```bash
# Copy file from container to host
docker cp ts_generator_backend:/app/uploads/versions/{project_id}/file.docx ./

# Copy entire directory
docker cp ts_generator_backend:/app/uploads ./local_uploads
```

#### Option 3: Execute Commands in Container
```bash
# List files
docker exec ts_generator_backend ls -la /app/uploads/versions/

# Find all documents
docker exec ts_generator_backend find /app/uploads -name "*.docx"

# Check disk usage
docker exec ts_generator_backend du -sh /app/uploads/*
```

---

### From API

#### Download Generated Document
```bash
GET /api/v1/versions/{version_id}/download
```

#### List Project Versions
```bash
GET /api/v1/projects/{project_id}/versions
```

#### Get Uploaded Images
```bash
GET /api/v1/projects/{project_id}/images
```

---

## Backup Strategy

### 1. Database Backup
```bash
# Export database
docker exec ts_generator_db pg_dump -U ts_user ts_generator > backup.sql

# Restore database
docker exec -i ts_generator_db psql -U ts_user ts_generator < backup.sql
```

### 2. Files Backup
```bash
# Backup uploads volume
docker run --rm -v ts-doc_project_backend_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz /data

# Restore uploads volume
docker run --rm -v ts-doc_project_backend_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads_backup.tar.gz -C /
```

### 3. Complete Backup (Database + Files)
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup database
docker exec ts_generator_db pg_dump -U ts_user ts_generator > backups/$(date +%Y%m%d)/database.sql

# Backup uploads
docker cp ts_generator_backend:/app/uploads backups/$(date +%Y%m%d)/uploads
```

---

## Cleanup

### Remove All Data (Reset)
```bash
# Stop containers
docker-compose down

# Remove volumes (WARNING: Deletes all data!)
docker volume rm ts-doc_project_backend_uploads
docker volume rm ts-doc_project_postgres_data

# Restart fresh
docker-compose up -d
```

### Remove Old Documents
```bash
# Delete documents older than 30 days
docker exec ts_generator_backend find /app/uploads/versions -name "*.docx" -mtime +30 -delete
```

---

## Production Considerations

### For Production Deployment:

1. **Use Named Volumes with Backup**
   - Configure regular volume backups
   - Consider cloud storage integration (S3, Azure Blob)

2. **External Storage Options**
   - Mount external NFS/SMB shares
   - Use object storage (MinIO, S3-compatible)
   - Database: Use managed PostgreSQL (RDS, Cloud SQL)

3. **File Retention Policy**
   - Implement automatic cleanup of old versions
   - Archive old projects to cold storage
   - Set maximum storage limits per project

4. **Monitoring**
   - Track volume disk usage
   - Alert on low disk space
   - Monitor file upload sizes

---

## Troubleshooting

### Files Not Appearing

**Problem**: Uploaded files or generated documents not visible

**Check**:
1. Container is running: `docker-compose ps`
2. Volume is mounted: `docker inspect ts_generator_backend | grep Mounts`
3. Permissions: `docker exec ts_generator_backend ls -la /app/uploads`
4. Disk space: `docker exec ts_generator_backend df -h`

### Cannot Access Files from Host

**Problem**: Files in Docker volume not accessible from Windows/Mac

**Solution**: Docker Desktop manages volumes internally. Use `docker cp` to extract files:
```bash
docker cp ts_generator_backend:/app/uploads ./local_uploads
```

### Volume Corruption

**Problem**: Volume data corrupted or inaccessible

**Solution**:
1. Stop containers: `docker-compose down`
2. Backup if possible: `docker cp ts_generator_backend:/app/uploads ./backup`
3. Remove volume: `docker volume rm ts-doc_project_backend_uploads`
4. Recreate: `docker-compose up -d`
5. Restore from backup if available

---

## Summary

| File Type | Storage Location | Persistence | Backup Method |
|-----------|-----------------|-------------|---------------|
| Generated Documents | Docker Volume | Persistent | `docker cp` or volume backup |
| Uploaded Images | Docker Volume | Persistent | `docker cp` or volume backup |
| Database | Docker Volume | Persistent | `pg_dump` |
| Templates | Local Directory | Persistent | Git repository |
| Application Code | Local Directory | Persistent | Git repository |
| Node Modules | Anonymous Volume | Temporary | Rebuild with `npm install` |

**Key Takeaway**: User-generated content (documents, images, database) is stored in Docker volumes and persists across container restarts. Application code and templates are in local directories for easy development.
