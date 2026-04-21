# Implementation Plan: Revision History Auto-Tracking

## Overview

This implementation plan breaks down the revision history auto-tracking feature into discrete coding tasks. The feature automatically creates and manages revision history entries when projects are created or modified, eliminating manual tracking overhead while preserving user control over reviewer fields.

The implementation follows this sequence:
1. Create utility functions for ordinal generation and date formatting
2. Build the revision service module with core logic
3. Integrate revision service into project creation workflow
4. Integrate revision service into section update workflow
5. Update frontend components to display auto-generated fields as read-only
6. Add comprehensive testing coverage

## Tasks

- [x] 1. Create revision service module with utility functions
  - [x] 1.1 Create `backend/app/projects/revision_service.py` module
    - Define module structure with imports (AsyncSession, UUID, datetime)
    - Add module-level docstring explaining purpose
    - _Requirements: 1.1, 2.1, 7.1_

  - [x] 1.2 Implement `generate_ordinal_text()` utility function
    - Create list of ordinal names for 1-20 ("First" through "Twentieth")
    - Implement numeric ordinal logic for 21+ with suffix rules (st, nd, rd, th)
    - Handle special cases (11th, 12th, 13th)
    - Return formatted string with " issue" suffix
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 1.3 Write unit tests for `generate_ordinal_text()`
    - Test ordinals 1-20 return correct names
    - Test 21st, 22nd, 23rd, 24th suffixes
    - Test special cases: 11th, 12th, 13th
    - Test large numbers: 100th, 101st, 102nd
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 1.4 Implement `format_date_dd_mm_yyyy()` utility function
    - Use datetime.now() to get current date
    - Format using strftime("%d-%m-%Y") for DD-MM-YYYY pattern
    - Return formatted string
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 1.5 Write unit tests for `format_date_dd_mm_yyyy()`
    - Test date formatting with single-digit day/month
    - Test date formatting with double-digit day/month
    - Verify DD-MM-YYYY pattern with zero-padding
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [x] 1.6 Implement `calculate_next_revision_number()` utility function
    - Accept list of existing revision entry dictionaries
    - Extract rev_no values and convert to integers
    - Return max(rev_no) + 1, or 1 if no entries exist
    - Handle invalid rev_no values gracefully
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 1.7 Write unit tests for `calculate_next_revision_number()`
    - Test empty rows returns 1
    - Test existing rows with rev_no "0", "1" returns 2
    - Test rows with gaps returns max + 1
    - Test invalid rev_no values (non-numeric)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Implement core revision service functions
  - [x] 2.1 Implement `create_initial_revision_entry()` function
    - Accept db session and project_id parameters
    - Create revision entry dict with details="First issue"
    - Set date using format_date_dd_mm_yyyy()
    - Set rev_no="0"
    - Set user-editable fields to empty strings
    - Call section service to upsert revision_history section
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write unit tests for `create_initial_revision_entry()`
    - Test creates entry with "First issue" details
    - Test sets rev_no to "0"
    - Test sets date to current date in DD-MM-YYYY format
    - Test leaves user-editable fields empty
    - Mock database session and section service
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.3 Implement `append_revision_entry()` function
    - Accept db session and project_id parameters
    - Fetch existing revision_history section content
    - Extract existing rows array
    - Calculate next revision number using calculate_next_revision_number()
    - Generate ordinal text using generate_ordinal_text()
    - Format current date using format_date_dd_mm_yyyy()
    - Create new revision entry dict
    - Append to rows array
    - Call section service to update revision_history section
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.4 Write unit tests for `append_revision_entry()`
    - Test generates correct ordinal text for second, third entries
    - Test increments rev_no correctly
    - Test formats date correctly
    - Test preserves existing entries
    - Test appends new entry to rows array
    - Mock database session and section service
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate revision service into project creation workflow
  - [x] 4.1 Modify `backend/app/projects/service.py` to import revision_service
    - Add import statement for revision_service module
    - _Requirements: 1.1, 7.2_

  - [x] 4.2 Update `create_project()` function to call revision service
    - After project creation, call create_initial_revision_entry(db, project.id)
    - Ensure call happens within the same transaction
    - Handle exceptions and rollback on failure
    - _Requirements: 1.1, 1.5, 7.1, 7.2_

  - [ ]* 4.3 Write integration test for project creation with revision entry
    - Test creates project and verifies revision_history section exists
    - Test initial entry has correct structure (First issue, rev_no 0, current date)
    - Test transaction rollback on failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2_

- [x] 5. Integrate revision service into section update workflow
  - [x] 5.1 Modify `backend/app/sections/service.py` to import revision_service
    - Add import statement for revision_service module
    - _Requirements: 2.1, 6.1, 6.2_

  - [x] 5.2 Update `upsert_section()` function to trigger revision creation
    - After section upsert, check if section_key != 'revision_history'
    - If true, call append_revision_entry(db, project_id)
    - Ensure call happens within the same transaction
    - Handle exceptions and rollback on failure
    - _Requirements: 2.1, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 5.3 Write integration test for section update triggering revision
    - Test updating non-revision section creates new revision entry
    - Test updating revision_history section does NOT create new entry
    - Test revision number increments correctly
    - Test transaction rollback on failure
    - _Requirements: 2.1, 6.1, 6.2, 6.3_

  - [ ]* 5.4 Write integration test for revision number sequencing
    - Create project (rev_no 0)
    - Update section (rev_no 1)
    - Update section again (rev_no 2)
    - Verify sequence is correct
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update frontend components for read-only auto-generated fields
  - [x] 7.1 Update `frontend/src/components/sections/RevisionHistory.tsx` component
    - Add read-only styling for auto-generated fields (details, date, rev_no)
    - Set disabled={true} for auto-generated field inputs
    - Add visual indicators (background color, cursor style, tooltip)
    - Keep user-editable fields (sr_no, revised_by, checked_by, approved_by) editable
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.2_

  - [ ]* 7.2 Write unit tests for RevisionHistory component
    - Test auto-generated fields are disabled
    - Test auto-generated fields have read-only styling
    - Test user-editable fields are enabled
    - Test save functionality for user-editable fields
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 7.3 Verify DocumentPreview component displays revision history correctly
    - Review existing DocumentPreview implementation
    - Confirm it displays revision_history section content
    - Confirm fallback logic works for empty revision history
    - No code changes needed (already implemented)
    - _Requirements: 10.1, 10.3, 10.4_

- [x] 8. Add backward compatibility handling
  - [x] 8.1 Implement `ensure_revision_history_exists()` function in revision_service
    - Accept db session and project_id parameters
    - Check if revision_history section exists and has rows
    - If not, call create_initial_revision_entry()
    - Handle existing manual entries gracefully
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 8.2 Write integration test for backward compatibility
    - Test project without revision history gets initial entry on first access
    - Test project with existing entries preserves them
    - Test next rev_no calculated from existing entries
    - Test does not duplicate "First issue" if already exists
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 9. Add comprehensive integration and E2E tests
  - [ ]* 9.1 Write integration test for complete revision tracking workflow
    - Create project → verify initial entry
    - Update section → verify second entry
    - Update section again → verify third entry
    - Verify ordinal text progression (First, Second, Third)
    - Verify rev_no progression (0, 1, 2)
    - Verify dates are current
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [ ]* 9.2 Write E2E test for user workflow
    - Create project via API
    - Verify revision history displayed in frontend
    - Edit section via API
    - Verify new revision entry appears in frontend
    - Edit user-editable fields
    - Verify changes persist
    - _Requirements: 8.1, 8.2, 10.1, 10.2, 10.3_

  - [ ]* 9.3 Write E2E test for document preview display
    - Create project with multiple revisions
    - Open document preview
    - Verify revision history table renders correctly
    - Verify auto-generated fields displayed
    - Verify user-editable fields displayed
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design uses Python, so all backend code will be in Python
- Frontend uses TypeScript/React (existing stack)
- No database schema changes required - uses existing section_data table
- All revision operations happen within database transactions for atomicity
- Backward compatibility is handled through lazy migration approach
