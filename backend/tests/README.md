# Backend Testing Suite

This directory contains comprehensive tests for the TS Document Generator backend.

## Test Structure

### Configuration
- **conftest.py**: Pytest configuration with fixtures for database sessions, test client, and helper functions
- **pytest.ini**: Pytest configuration with asyncio mode and test paths

### Unit Tests
- **test_completion.py**: Tests for completion calculation logic
  - Cover section completion validation
  - Features section validation
  - HTML stripping in rich text fields
  - Locked sections auto-completion
  - 27-section completion counting

- **test_context_builder.py**: Tests for Jinja2 context builder
  - Project field mapping
  - Tech stack padding to 6 rows
  - Missing section handling with empty defaults
  - Image file existence checking
  - InlineImage creation vs placeholder logic

- **test_filename.py**: Tests for filename generation
  - Space to underscore replacement
  - Slash to hyphen replacement
  - Long name truncation
  - Filename format validation

### Integration Tests
- **integration/test_projects_api.py**: Tests for Projects API endpoints
  - Create project
  - Get project with completion data
  - Update project fields
  - Delete project with cascade

- **integration/test_sections_api.py**: Tests for Sections API endpoints
  - Upsert section (create new)
  - Upsert section (update existing)
  - Invalid section key validation

- **integration/test_generation_api.py**: Tests for Generation API endpoints
  - Generate document with complete sections
  - Generate document with missing sections (422 error)
  - Version number increment

- **integration/test_images_api.py**: Tests for Images API endpoints
  - Upload valid image
  - Upload invalid file type
  - Upload oversized file

- **integration/test_database.py**: Tests for database schema
  - All tables exist after migrations
  - Projects table columns
  - Section_data unique constraint
  - Cascade delete behavior

## Running Tests

### Unit Tests Only (No Database Required)
```bash
pytest tests/test_completion.py tests/test_context_builder.py tests/test_filename.py -v
```

### All Tests (Requires Database)

There are two common ways to run the full test suite while using the Dockerized PostgreSQL database:

- Recommended: run tests inside the backend container (uses Docker network hostname `db`):

```bash
# Start only the DB (faster) or the full compose
docker compose up -d db

# Run tests inside the backend container (uses the compose network)
docker exec -w /app $(docker ps --filter "name=ts_generator_backend" --format "{{.ID}}") python -m pytest -q
```

- Alternative: run tests on the host but point the test DB to the container's mapped port (`localhost:5432`). This requires exporting the environment variables so tests connect to `localhost` instead of the compose network hostname `db`.

PowerShell (Windows):
```powershell
docker compose up -d db
$env:DATABASE_URL = "postgresql+asyncpg://ts_user:ts_password@localhost:5432/ts_generator_test"
$env:SYNC_DATABASE_URL = "postgresql://ts_user:ts_password@localhost:5432/ts_generator_test"
cd backend
python -m pytest -q
```

Bash (macOS / Linux):
```bash
docker compose up -d db
export DATABASE_URL="postgresql+asyncpg://ts_user:ts_password@localhost:5432/ts_generator_test"
export SYNC_DATABASE_URL="postgresql://ts_user:ts_password@localhost:5432/ts_generator_test"
cd backend
python -m pytest -q
```

Notes:
- Running tests inside the backend container is simpler because the default test configuration expects the DB hostname `db` (the Docker Compose service name).
- When running on host, you must set `DATABASE_URL`/`SYNC_DATABASE_URL` to `localhost` so the test engine connects to the container's published port.

### Integration Tests Only
```bash
pytest tests/integration/ -v
```

## Test Database

Integration tests use a separate test database:
- **Database**: `ts_generator_test`
- **Default URL (inside container network)**: `postgresql+asyncpg://ts_user:ts_password@db:5432/ts_generator_test`

When running tests on the host (not inside the backend container), set the `DATABASE_URL` and `SYNC_DATABASE_URL` environment variables to point to `localhost:5432` with the same credentials shown above. The test fixtures create and drop tables to ensure isolation per test run.

## Fixtures

### Session Fixtures
- **event_loop**: Creates event loop for async tests (session scope)

### Test Fixtures
- **db_session**: Fresh database session with tables created/dropped per test
- **client**: HTTP test client with database override
- **create_test_project**: Helper to create a minimal test project
- **create_complete_project**: Helper to create a project with all required sections

## Test Results

All unit tests (19 tests) pass successfully:
- ✅ 8 completion logic tests
- ✅ 7 context builder tests
- ✅ 4 filename generation tests

Integration tests require a running PostgreSQL database to execute.

## Notes

- Tests use pytest-asyncio for async test support
- Database tests use SQLAlchemy async sessions
- HTTP tests use httpx AsyncClient
- All tests follow the AAA pattern (Arrange, Act, Assert)
