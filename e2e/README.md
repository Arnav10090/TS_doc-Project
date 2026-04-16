# End-to-End Tests

This directory contains Playwright end-to-end tests for the TS Document Generator application.

## Running E2E Tests

### Prerequisites
- Backend server must be running on `http://localhost:8000`
- Frontend dev server will be started automatically by Playwright

### Commands

```bash
# Run all e2e tests
npm run test:e2e

# Run e2e tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- workflows.spec.ts

# Debug mode
npm run test:e2e -- --debug
```

## Test Coverage

The e2e tests cover the following critical workflows:

1. **Project Creation and Editing**
   - Create new project and navigate to editor
   - Auto-save section changes
   - Update solution name across all sections

2. **Document Generation**
   - Generate document when all sections complete
   - Show missing sections on incomplete project

3. **Image Upload**
   - Upload architecture diagram

## Notes

- Tests use test project IDs that should exist in the test database
- Some tests require specific project states (complete, incomplete)
- Image upload tests require test fixtures in `tests/fixtures/`
