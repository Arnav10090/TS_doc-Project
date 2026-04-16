# Quality Fixes: Database Credentials and Docker Command Override

## Issue 10: Integration Test Database Credentials Fixed

### Problem
The integration test configuration in `backend/tests/conftest.py` used incorrect database credentials:

```python
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/ts_generator_test"
os.environ["SYNC_DATABASE_URL"] = "postgresql://postgres:postgres@db:5432/ts_generator_test"
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@db:5432/ts_generator_test"
```

The actual Docker Compose database service uses:
- Username: `ts_user`
- Password: `ts_password`

Not the default PostgreSQL credentials (`postgres:postgres`).

### Impact
- Integration tests would fail to connect to the database
- Tests would show authentication errors when run in Docker environment
- CI/CD pipelines using Docker would fail
- Developers couldn't run integration tests in the containerized environment

### Solution
Updated all three database URL references to use the correct credentials:

```python
os.environ["DATABASE_URL"] = "postgresql+asyncpg://ts_user:ts_password@db:5432/ts_generator_test"
os.environ["SYNC_DATABASE_URL"] = "postgresql://ts_user:ts_password@db:5432/ts_generator_test"
TEST_DATABASE_URL = "postgresql+asyncpg://ts_user:ts_password@db:5432/ts_generator_test"
```

### Verification
- Integration tests can now connect to the test database in Docker
- Credentials match the Docker Compose configuration exactly
- Tests can run successfully in containerized environment

---

## Issue 11: Docker Compose Command Override Added

### Problem
The `docker-compose.yml` had no `command` override for the backend service. It relied on `main.py` running Alembic migrations via subprocess:

```python
# In main.py
result = subprocess.run(["alembic", "upgrade", "head"], ...)
if result.returncode != 0:
    sys.exit(1)  # Kills container silently on failure
```

### Issues with this approach:
1. **Silent failures**: If Alembic migration fails on first run, `sys.exit(1)` kills the container with no clear error message
2. **Subprocess overhead**: Running Alembic as a subprocess adds complexity and potential failure points
3. **Debugging difficulty**: Container exits immediately, making it hard to diagnose migration issues
4. **Not idiomatic**: Docker best practice is to use `command` override for startup sequences

### Solution
Added explicit `command` override in `docker-compose.yml`:

```yaml
backend:
  command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
```

### Benefits
1. **Clear startup sequence**: Migration runs first, then server starts
2. **Better error visibility**: If migration fails, Docker logs show the Alembic error output clearly
3. **Container stays alive**: On migration failure, container stops but logs are preserved
4. **Standard Docker pattern**: Uses shell command chaining (`&&`) which is idiomatic
5. **Easier debugging**: Can inspect container logs to see exactly where startup failed

### Migration Failure Behavior
**Before (subprocess in main.py)**:
- Migration fails → `sys.exit(1)` → Container exits silently → Hard to debug

**After (command override)**:
- Migration fails → Shell command fails → Container stops → Full error logs visible in `docker-compose logs backend`

### Verification
- Backend container now runs migrations explicitly before starting server
- Migration errors are clearly visible in Docker logs
- Follows Docker Compose best practices for multi-step startup sequences
- Can still use `--reload` for development hot-reloading

---

## Issue 12: HardwareSpecsSection TypeScript Type - Already Fixed

### Status
**No fix needed** - The `locked_specs_line1` field is already properly typed in the interface.

### Verification
Checked `frontend/src/types/index.ts`:

```typescript
export interface HardwareSpecsRow {
  sr_no: number
  name: string
  specs_line1: string
  specs_line2: string
  specs_line3: string
  specs_line4: string
  maker: string
  qty: string
  locked_specs_line1?: boolean  // ✓ Already defined as optional boolean
}
```

The component in `HardwareSpecsSection.tsx` correctly accesses `row.locked_specs_line1` with full type safety:

```typescript
const isSpecsLocked = row.locked_specs_line1;
```

TypeScript diagnostics confirm no type errors in the file.

---

## Requirements Traceability
- **Requirement 1**: PostgreSQL database with async SQLAlchemy → Integration tests now use correct credentials
- **Requirement 2**: FastAPI backend with async endpoints → Docker command ensures migrations run before server starts
- **Requirement 77**: Complete user workflow testing → Integration tests can now run successfully in Docker

## Files Modified
1. `backend/tests/conftest.py` - Updated database credentials from `postgres:postgres` to `ts_user:ts_password`
2. `docker-compose.yml` - Added `command` override to run Alembic migrations before starting server

## Files Verified (No Changes Needed)
1. `frontend/src/types/index.ts` - `locked_specs_line1` already properly typed as optional boolean

## Testing Notes
- Integration tests now require Docker Compose to be running (`docker-compose up db`)
- Backend container will fail fast if migrations fail, with clear error messages in logs
- Use `docker-compose logs backend` to see migration output and any errors
- The `--reload` flag in the command enables hot-reloading during development
