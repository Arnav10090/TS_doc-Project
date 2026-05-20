# Testing Guide - TS Document Generator

This guide explains how to run tests for both frontend and backend in the Docker environment.

## Prerequisites

- Docker Desktop running
- All containers started: `ts_generator_db`, `ts_generator_backend`, `ts_generator_frontend`

## Quick Start

### Start All Services

```bash
# Start all Docker containers
docker-compose up -d

# Verify all containers are running
docker ps --filter "name=ts_generator"
```

You should see three containers:
- `ts_generator_db` (PostgreSQL database)
- `ts_generator_backend` (FastAPI backend)
- `ts_generator_frontend` (React frontend)

## Frontend Tests

Frontend tests run on your local machine (not in Docker) because they don't need database access.

### Run All Frontend Tests

```bash
cd frontend
npm test -- --run
```

### Run Specific Test File

```bash
cd frontend
npm test -- --run src/components/layout/SectionSidebar.test.tsx
```

### Run Tests in Watch Mode (for development)

```bash
cd frontend
npm test
```

### Current Frontend Test Status

- **Total**: 101 tests
- **Passing**: 91 tests ✅
- **Failing**: 10 tests ❌

**Known Failing Tests**:
1. SectionSidebar tests (6 failures) - completion calculation mismatch
2. RichTextEditor tests (2 failures) - button title mismatch
3. Home page test (1 failure) - timeout issue
4. Property test (1 failure) - dynamic section count

## Backend Tests

Backend tests **MUST** run inside the Docker container because they need to connect to the PostgreSQL database using the Docker network hostname `db`.

### Method 1: Using PowerShell Script (Recommended)

```powershell
# Run from project root
.\run-backend-tests.ps1
```

### Method 2: Using Bash Script (Git Bash/WSL)

```bash
# Run from project root
./run-backend-tests.sh
```

### Method 3: Manual Docker Exec

```bash
# Run all backend tests
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest -v"

# Run specific test file
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest tests/integration/test_database.py -v"

# Run specific test function
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest tests/integration/test_database.py::test_all_tables_exist_after_migrations -v"
```

### Current Backend Test Status

Backend tests require the database to be running. When run inside Docker:
- **Database Connection**: ✅ Working
- **Test Database**: `ts_generator_test` (automatically created)

## Database Connection Details

### Inside Docker Containers

When running inside Docker containers (backend tests), use:

```
Host: db
Port: 5432
Database: ts_generator_test
User: ts_user
Password: ts_password
```

### From Local Machine

When connecting from your local machine (e.g., using pgAdmin or psql), use:

```
Host: localhost
Port: 5432
Database: ts_generator
User: ts_user
Password: ts_password
```

## Database Management

### Create Test Database (if needed)

```bash
docker exec ts_generator_db psql -U ts_user -d ts_generator -c "CREATE DATABASE ts_generator_test;"
```

### Connect to Database

```bash
# Connect to main database
docker exec -it ts_generator_db psql -U ts_user -d ts_generator

# Connect to test database
docker exec -it ts_generator_db psql -U ts_user -d ts_generator_test
```

### View Database Tables

```bash
docker exec ts_generator_db psql -U ts_user -d ts_generator -c "\dt"
```

### Drop and Recreate Test Database

```bash
# Drop test database
docker exec ts_generator_db psql -U ts_user -d ts_generator -c "DROP DATABASE IF EXISTS ts_generator_test;"

# Create test database
docker exec ts_generator_db psql -U ts_user -d ts_generator -c "CREATE DATABASE ts_generator_test;"
```

## Troubleshooting

### Issue: "getaddrinfo failed" when running backend tests locally

**Problem**: Tests are trying to connect to hostname `db` which only exists in Docker network.

**Solution**: Run tests inside the Docker container using one of the methods above.

### Issue: "ModuleNotFoundError: No module named 'app'"

**Problem**: Python can't find the app module.

**Solution**: Make sure to set `PYTHONPATH=/app` when running tests:

```bash
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest -v"
```

### Issue: Database connection refused

**Problem**: Database container is not running or not healthy.

**Solution**: 

```bash
# Check container status
docker ps --filter "name=ts_generator_db"

# Check database health
docker exec ts_generator_db pg_isready -U ts_user -d ts_generator

# Restart database container
docker-compose restart db
```

### Issue: Tests are slow or hanging

**Problem**: Database might be under load or containers need restart.

**Solution**:

```bash
# Restart all containers
docker-compose restart

# Or rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Test Configuration Files

### Frontend Test Config

- **Config**: `frontend/vite.config.ts`
- **Setup**: `frontend/src/setupTests.ts`
- **Test Pattern**: `**/*.test.tsx`, `**/*.test.ts`

### Backend Test Config

- **Config**: `backend/pytest.ini`
- **Fixtures**: `backend/tests/conftest.py`
- **Test Pattern**: `tests/**/*test*.py`

## Running Tests in CI/CD

For CI/CD pipelines, use Docker Compose to ensure consistent environment:

```bash
# Start services
docker-compose up -d

# Wait for database to be healthy
docker-compose exec db pg_isready -U ts_user -d ts_generator

# Run backend tests
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest -v --junitxml=test-results.xml"

# Run frontend tests
docker exec ts_generator_frontend npm test -- --run --reporter=junit --outputFile=test-results.xml

# Stop services
docker-compose down
```

## Additional Commands

### View Container Logs

```bash
# Backend logs
docker logs ts_generator_backend

# Database logs
docker logs ts_generator_db

# Frontend logs
docker logs ts_generator_frontend

# Follow logs in real-time
docker logs -f ts_generator_backend
```

### Access Container Shell

```bash
# Backend shell
docker exec -it ts_generator_backend sh

# Database shell
docker exec -it ts_generator_db sh

# Frontend shell
docker exec -it ts_generator_frontend sh
```

### Clean Up

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v

# Remove all containers and rebuild
docker-compose down
docker-compose up -d --build
```

## Test Coverage

### Generate Frontend Coverage Report

```bash
cd frontend
npm test -- --run --coverage
```

### Generate Backend Coverage Report

```bash
docker exec ts_generator_backend sh -c "cd /app && PYTHONPATH=/app pytest --cov=app --cov-report=html"
```

Coverage reports will be generated in:
- Frontend: `frontend/coverage/`
- Backend: `backend/htmlcov/`

## Next Steps

1. **Fix Failing Frontend Tests**: See `.kiro/specs/add-custom-sections/IMPLEMENTATION_SUMMARY.md` for details
2. **Run Backend Tests**: Use the provided scripts to verify backend functionality
3. **Manual Testing**: Follow the manual testing checklist in the implementation summary
4. **Integration Testing**: Complete end-to-end workflow tests

## Support

For issues or questions:
1. Check container logs: `docker logs <container_name>`
2. Verify database connectivity: `docker exec ts_generator_db pg_isready -U ts_user`
3. Review test configuration files
4. Check Docker network: `docker network inspect ts-doc_project_ts_network`
