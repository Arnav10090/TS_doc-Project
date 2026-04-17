# Docker Hot-Reload Configuration Guide

## Overview
This guide explains how your Docker setup is configured for real-time hot-reloading, so changes to your code are immediately reflected in the running application.

## ✅ Current Configuration Status

### Frontend (React + Vite)
**Status**: ✅ Configured for hot-reloading

**Key Settings**:
1. **Volume Mounting** (docker-compose.yml):
   ```yaml
   volumes:
     - ./frontend:/app
     - /app/node_modules
   ```
   - Maps your local `frontend` folder to `/app` in the container
   - Excludes `node_modules` to use container's version

2. **Vite Dev Server** (vite.config.ts):
   ```typescript
   server: {
     host: true,              // Listen on all network interfaces
     port: 5173,
     watch: {
       usePolling: true,      // Required for Docker file watching
     },
     hmr: {
       host: 'localhost',     // Hot Module Replacement host
       port: 5173,
     },
   }
   ```

3. **Dev Command** (Dockerfile):
   ```dockerfile
   CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
   ```

### Backend (FastAPI + Python)
**Status**: ✅ Configured for hot-reloading

**Key Settings**:
1. **Volume Mounting** (docker-compose.yml):
   ```yaml
   volumes:
     - ./backend:/app
     - backend_uploads:/app/uploads
   ```
   - Maps your local `backend` folder to `/app` in the container

2. **Uvicorn Reload** (docker-compose.yml):
   ```yaml
   command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
   ```
   - `--reload` flag enables auto-restart on file changes

---

## How to Use

### 1. Start Docker Containers
```bash
docker-compose up
```

Or run in detached mode:
```bash
docker-compose up -d
```

### 2. Make Changes to Your Code

**Frontend Changes** (React/TypeScript):
- Edit any file in `frontend/src/`
- Changes are detected instantly
- Browser auto-refreshes (Hot Module Replacement)
- **No rebuild needed!**

**Backend Changes** (Python/FastAPI):
- Edit any file in `backend/app/`
- Uvicorn detects changes
- Server auto-restarts (takes 1-2 seconds)
- **No rebuild needed!**

### 3. View Logs (Optional)
To see real-time logs and confirm hot-reloading is working:

```bash
# All services
docker-compose logs -f

# Frontend only
docker-compose logs -f frontend

# Backend only
docker-compose logs -f backend
```

---

## What Changes Trigger Hot-Reload?

### ✅ Frontend - Auto-Reloads
- `.tsx` / `.ts` files (React components, utilities)
- `.css` files (styles)
- `.json` files (configuration)
- Any file in `frontend/src/`

### ✅ Backend - Auto-Restarts
- `.py` files (routes, models, services)
- Any Python file in `backend/app/`

### ❌ Requires Rebuild
- `package.json` (new dependencies)
- `requirements.txt` (new Python packages)
- `Dockerfile` changes
- `docker-compose.yml` changes

---

## When You Need to Rebuild

### Adding New Dependencies

**Frontend** (new npm packages):
```bash
# Stop containers
docker-compose down

# Rebuild frontend
docker-compose build frontend

# Start again
docker-compose up
```

**Backend** (new Python packages):
```bash
# Stop containers
docker-compose down

# Rebuild backend
docker-compose build backend

# Start again
docker-compose up
```

**Both**:
```bash
docker-compose down
docker-compose build
docker-compose up
```

---

## Troubleshooting

### Issue: Changes Not Detected

**Solution 1: Check if containers are running**
```bash
docker-compose ps
```

**Solution 2: Check logs for errors**
```bash
docker-compose logs -f frontend
docker-compose logs -f backend
```

**Solution 3: Restart containers**
```bash
docker-compose restart frontend
docker-compose restart backend
```

**Solution 4: Full rebuild**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Issue: Frontend Hot-Reload Not Working

**Check 1: Verify volume mounting**
```bash
docker-compose exec frontend ls -la /app/src
```
You should see your source files.

**Check 2: Verify Vite is running in dev mode**
```bash
docker-compose logs frontend | grep "Local:"
```
You should see: `Local: http://localhost:5173/`

**Check 3: Browser cache**
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or open DevTools and disable cache

### Issue: Backend Hot-Reload Not Working

**Check 1: Verify uvicorn reload is enabled**
```bash
docker-compose logs backend | grep "reload"
```
You should see `--reload` in the command.

**Check 2: Check for Python syntax errors**
```bash
docker-compose logs backend
```
Look for any error messages.

### Issue: "ENOSPC: System limit for number of file watchers reached"

This happens on Linux when the system runs out of file watchers.

**Solution**:
```bash
# Increase the limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Performance Tips

### 1. Use Docker Desktop's File Sharing Settings
- On Windows/Mac: Ensure your project folder is in a shared location
- Docker Desktop → Settings → Resources → File Sharing

### 2. Exclude Unnecessary Files
Add to `.dockerignore`:
```
node_modules
__pycache__
*.pyc
.git
.env
dist
build
```

### 3. Use Polling Only When Needed
Polling (enabled in vite.config.ts) works reliably but uses more CPU. If you're on Linux and file watching works without it, you can remove:
```typescript
watch: {
  usePolling: true,
},
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start containers | `docker-compose up` |
| Start in background | `docker-compose up -d` |
| Stop containers | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Restart service | `docker-compose restart frontend` |
| Rebuild service | `docker-compose build frontend` |
| Full rebuild | `docker-compose build --no-cache` |
| Check status | `docker-compose ps` |

---

## Summary

Your Docker setup is **fully configured for hot-reloading**:

✅ **Frontend**: Vite HMR with file polling  
✅ **Backend**: Uvicorn auto-reload  
✅ **Volumes**: Properly mounted for live code sync  

**Just run `docker-compose up` and start coding!** Changes will appear automatically in your browser at `http://localhost:5173`.
