# Quick Test Commands Reference

## Frontend Tests (Run from your local machine)

```bash
# All tests
cd frontend && npm test -- --run

# Specific test file
cd frontend && npm test -- --run src/components/layout/SectionSidebar.test.tsx

# Watch mode (for development)
cd frontend && npm test
```

## Backend Tests (Run inside Docker container)

### Using PowerShell Script (Easiest)

```powershell
.\run-backend-tests.ps1
```

### Using Docker Exec Directly

```bash
# All tests
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest -v"

# Unit tests only
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest tests/unit/ -v"

# Integration tests only
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest tests/integration/ -v"

# Specific test file
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest tests/unit/test_section_key_validation.py -v"
```

## Database Commands

```bash
# Connect to database
docker exec -it ts_generator_db psql -U ts_user -d ts_generator

# View tables
docker exec ts_generator_db psql -U ts_user -d ts_generator -c "\dt"

# Check database health
docker exec ts_generator_db pg_isready -U ts_user -d ts_generator
```

## Container Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View running containers
docker ps --filter "name=ts_generator"

# View logs
docker logs ts_generator_backend
docker logs ts_generator_db
docker logs ts_generator_frontend
```

## Test Results Summary

### Frontend Tests
- **Status**: ✅ 91 passed | ❌ 10 failed (out of 101 total)
- **Location**: Run on local machine
- **Command**: `cd frontend && npm test -- --run`

### Backend Tests
- **Status**: ✅ 7 unit tests passed
- **Location**: Run inside Docker container
- **Command**: `.\run-backend-tests.ps1` or use docker exec

## Common Issues

### "getaddrinfo failed" error
**Solution**: Run backend tests inside Docker container, not locally

### "ModuleNotFoundError: No module named 'app'"
**Solution**: Use `PYTHONPATH=/app` when running pytest

### Database connection refused
**Solution**: Make sure database container is running: `docker ps --filter "name=ts_generator_db"`

## Full Documentation

See `TESTING_GUIDE.md` for complete testing documentation.
