# Implementation Plan: Project Form Autofill

## Overview

This implementation plan converts the feature design into actionable coding tasks. The feature automatically populates Cover and Abbreviations section fields from New Project form data during project creation. All implementation occurs in the backend service layer, with no frontend changes required.

## Tasks

- [x] 1. Create data transformation helper functions
  - [x] 1.1 Implement `build_cover_content()` function in `backend/app/projects/service.py`
    - Accept `ProjectCreate` parameter
    - Return dictionary with Cover section content structure
    - Map form fields: solution_full_name, client_name, client_location, ref_number, doc_date, doc_version
    - Handle None values by converting to empty strings for optional fields
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.1, 6.4_
  
  - [x] 1.2 Define `DEFAULT_ROWS` constant in `backend/app/projects/service.py`
    - Create list of 14 default abbreviation rows (rows 1-14)
    - Each row contains: sr_no, abbreviation, description, locked fields
    - Row 13 has empty abbreviation and "Plate Mill Yard Management System" description
    - _Requirements: 2.1, 2.3, 2.4_
  
  - [x] 1.3 Implement `build_abbreviations_content()` function in `backend/app/projects/service.py`
    - Accept `ProjectCreate` parameter
    - Return dictionary with Abbreviations section content structure (rows array)
    - Copy DEFAULT_ROWS as base
    - Populate row 13 abbreviation if solution_abbreviation provided
    - Conditionally append row 15 if client_abbreviation provided
    - _Requirements: 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.2, 6.3_
  
  - [ ]* 1.4 Write unit tests for `build_cover_content()`
    - Test with all fields populated
    - Test with optional fields as None (verify empty strings)
    - Test with optional fields as empty strings
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.1, 6.4_
  
  - [ ]* 1.5 Write unit tests for `build_abbreviations_content()`
    - Test with no abbreviations (verify row 13 empty, no row 15)
    - Test with solution_abbreviation only (verify row 13 populated, no row 15)
    - Test with client_abbreviation only (verify row 13 empty, row 15 created)
    - Test with both abbreviations (verify both row 13 and row 15)
    - Test default rows integrity (verify rows 1-12, 14 match DEFAULT_ROWS)
    - _Requirements: 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.2, 6.3_

- [x] 2. Modify project creation service to pre-populate sections
  - [x] 2.1 Update `create_project()` function in `backend/app/projects/service.py`
    - Import `upsert_section` from `app.sections.service`
    - After creating project record, call `db.flush()` to get project.id
    - Call `upsert_section()` to create Cover section with `build_cover_content()` result
    - Call `upsert_section()` to create Abbreviations section with `build_abbreviations_content()` result
    - Wrap all operations in try-except block for transaction integrity
    - On exception, rollback transaction and re-raise
    - _Requirements: 1.1, 2.1, 7.1, 7.2, 7.3_
  
  - [ ]* 2.2 Write unit tests for modified `create_project()`
    - Test successful project creation with sections
    - Test transaction rollback on section creation failure (mock upsert_section to raise exception)
    - Verify project not created when section creation fails
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 4. Write property-based tests for correctness properties
  - [x] 4.1 Create Hypothesis strategy for ProjectCreate in `backend/tests/test_project_autofill_properties.py`
    - Define `project_create_strategy()` using `st.builds()`
    - Generate random text for required fields (solution_name, solution_full_name, client_name, client_location)
    - Generate optional text or None for optional fields (solution_abbreviation, client_abbreviation, ref_number, doc_date, doc_version)
    - _Requirements: All_
  
  - [ ]* 4.2 Write property test for Property 1: Cover Section Content Matches Form Data
    - **Property 1: Cover Section Content Matches Form Data**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.1, 6.4**
    - Use `@given(project_data=project_create_strategy())`
    - Set `@settings(max_examples=100)`
    - Create project, query Cover section from database
    - Assert all form fields present in section content with correct values
    - Assert optional fields converted to empty strings when None
  
  - [ ]* 4.3 Write property test for Property 2: Abbreviations Section Contains Default Rows
    - **Property 2: Abbreviations Section Contains Default Rows**
    - **Validates: Requirements 2.1, 2.3, 2.4**
    - Use `@given(project_data=project_create_strategy())`
    - Set `@settings(max_examples=100)`
    - Create project, query Abbreviations section from database
    - Assert rows 1-12 and 14 match DEFAULT_ROWS exactly
    - Assert each row has correct sr_no, abbreviation, description, locked values
  
  - [ ]* 4.4 Write property test for Property 3: Row 13 Abbreviation Matches Input
    - **Property 3: Row 13 Abbreviation Matches Input**
    - **Validates: Requirements 2.2, 2.5, 6.2**
    - Use `@given(project_data=project_create_strategy())`
    - Set `@settings(max_examples=100)`
    - Create project, query Abbreviations section from database
    - If solution_abbreviation provided, assert row 13 abbreviation matches input
    - If solution_abbreviation not provided, assert row 13 abbreviation is empty
    - Assert row 13 description always "Plate Mill Yard Management System"
  
  - [ ]* 4.5 Write property test for Property 4: Row 15 Created When Client Abbreviation Provided
    - **Property 4: Row 15 Created When Client Abbreviation Provided**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.3**
    - Use `@given(project_data=project_create_strategy())`
    - Set `@settings(max_examples=100)`
    - Create project, query Abbreviations section from database
    - If client_abbreviation provided, assert row 15 exists with correct values
    - If client_abbreviation not provided, assert row 15 does not exist
    - Assert row 15 has sr_no=15, abbreviation=client_abbreviation, description=client_name, locked=false
  
  - [ ]* 4.6 Write property test for Property 5: Project Record Persists All Form Fields
    - **Property 5: Project Record Persists All Form Fields**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - Use `@given(project_data=project_create_strategy())`
    - Set `@settings(max_examples=100)`
    - Create project, query project record from database
    - Assert all form fields present in project record with values matching input
    - Assert fields: solution_name, solution_full_name, solution_abbreviation, client_name, client_location, client_abbreviation, ref_number, doc_date, doc_version
  
  - [ ]* 4.7 Write property test for Property 6: Pre-populated Sections Not Auto-created
    - **Property 6: Pre-populated Sections Not Auto-created**
    - **Validates: Requirements 4.3**
    - Use `@given(project_data=project_create_strategy())`
    - Set `@settings(max_examples=100)`
    - Create project (which pre-populates Cover and Abbreviations sections)
    - Call `get_section()` for Cover section
    - Assert returned content matches pre-populated data, not empty default content
    - Call `get_section()` for Abbreviations section
    - Assert returned content matches pre-populated data, not empty default content

- [ ] 5. Write integration tests for end-to-end flows
  - [ ]* 5.1 Write integration test for full project creation flow
    - POST to `/api/v1/projects` with complete form data
    - Assert 201 response with ProjectDetail
    - Query database directly to verify project record created
    - Query database directly to verify Cover section created with correct content
    - Query database directly to verify Abbreviations section created with correct content
    - _Requirements: 1.1, 2.1, 5.1, 7.1_
  
  - [ ]* 5.2 Write integration test for project creation with minimal data
    - POST to `/api/v1/projects` with only required fields
    - Assert 201 response
    - Verify Cover section has empty strings for optional fields
    - Verify Abbreviations section has row 13 empty and no row 15
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 5.3 Write integration test for non-pre-populated section auto-creation
    - Create project (pre-populates Cover and Abbreviations)
    - GET `/api/v1/sections/{project_id}/executive_summary` (non-pre-populated section)
    - Assert 200 response with empty content (auto-created)
    - Verify auto-creation logic still works for other sections
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ]* 5.4 Write integration test for error handling and rollback
    - Mock database to raise exception during section creation
    - POST to `/api/v1/projects`
    - Assert 500 error response
    - Query database to verify project record NOT created (transaction rolled back)
    - Query database to verify no section records created
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using Hypothesis
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end API behavior and transaction integrity
- No frontend changes required - existing components already handle pre-populated data
