# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Dynamic Total Calculation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when `sectionContents` has fewer than 27 sections (e.g., 24 sections after 3 deletions), the displayed total count equals the actual section count minus 4 auto-complete sections
  - The test assertions should match the Expected Behavior: `displayedTotal == Object.keys(sectionContents).length - 4`
  - Run test on UNFIXED code (line 127 has `const totalCompletable = 27;`)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: e.g., "With 24 sections in sectionContents, displays '14 / 27 sections' instead of '14 / 24 sections'"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Completion Calculation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (full project with 27 sections, completion count calculation, percentage calculation)
  - Write property-based tests capturing observed behavior patterns:
    - Completion count calculation continues to exclude 4 auto-complete sections
    - Completion percentage calculation continues to use `(completedCount / totalCompletable) * 100`
    - Visible sections filtering continues to check `sectionContents?.[section.key]`
    - Full project (27 sections) continues to display "X / 27 sections"
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for hardcoded section count

  - [x] 3.1 Implement the fix
    - Replace hardcoded `const totalCompletable = 27;` on line 127 with dynamic calculation
    - Calculate total from `sectionContents`: `Object.keys(sectionContents).length - 4`
    - Add fallback to 27 if `sectionContents` is undefined for backward compatibility
    - Implementation: `const totalCompletable = sectionContents ? Object.keys(sectionContents).length - 4 : 27;`
    - _Bug_Condition: isBugCondition(input) where actualSectionCount < 27 AND totalCompletable == 27_
    - _Expected_Behavior: totalCompletable dynamically reflects actual sections in sectionContents minus 4 auto-complete sections_
    - _Preservation: Completion count calculation, percentage calculation, and visible sections filtering remain unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dynamic Total Calculation
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Completion Calculation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Write bug condition exploration test for DocumentPreview
  - **Property 1: Bug Condition** - Dynamic Total Calculation (Preview)
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in DocumentPreview
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when `sectionContents` has fewer than 27 sections (e.g., 24 sections after 3 deletions), the displayed total count in preview equals the actual section count minus 4 auto-complete sections
  - The test assertions should match the Expected Behavior: `displayedTotal == Object.keys(sectionContents).length - 4`
  - Run test on UNFIXED code (line 884 has hardcoded `/ 27 complete`)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: e.g., "With 24 sections in sectionContents, displays 'Preview - 14 / 27 complete' instead of 'Preview - 14 / 24 complete'"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4, 1.5, 1.6, 2.1, 2.2, 2.4, 2.5, 2.6_

- [x] 6. Write preservation property tests for DocumentPreview (BEFORE implementing fix)
  - **Property 2: Preservation** - Completion Calculation Unchanged (Preview)
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (full project with 27 sections, completion count calculation on lines 165-176)
  - Write property-based tests capturing observed behavior patterns:
    - Completion count calculation continues to exclude 4 auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions)
    - Full project (27 sections) continues to display "Preview - X / 27 complete"
    - Preview rendering and scrolling behavior remains unchanged
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.4, 3.6_

- [ ] 7. Fix for hardcoded section count in DocumentPreview

  - [x] 7.1 Implement the fix
    - Add dynamic calculation before line 884: `const totalCompletable = sectionContents ? Object.keys(sectionContents).length - 4 : 27;`
    - Replace hardcoded `/ 27 complete` on line 884 with `/ {totalCompletable} complete`
    - Add fallback to 27 if `sectionContents` is undefined for backward compatibility
    - Implementation follows the exact same pattern as the sidebar fix
    - _Bug_Condition: isBugCondition(input) where actualSectionCount < 27 AND displayedTotal == 27_
    - _Expected_Behavior: totalCompletable dynamically reflects actual sections in sectionContents minus 4 auto-complete sections_
    - _Preservation: Completion count calculation (lines 165-176) and preview rendering remain unchanged_
    - _Requirements: 1.4, 1.5, 1.6, 2.1, 2.2, 2.4, 2.5, 2.6, 3.1, 3.2, 3.4, 3.6_

  - [x] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dynamic Total Calculation (Preview)
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - The test from task 5 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 5
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Completion Calculation Unchanged (Preview)
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.4, 3.6_

- [x] 8. Final Checkpoint - Ensure all tests pass for both components
  - Ensure all tests pass for both SectionSidebar and DocumentPreview, ask the user if questions arise.

- [x] 9. Write bug condition exploration test for Backend router.py
  - **Property 1: Bug Condition** - Dynamic Completion Percentage Calculation (Backend)
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in backend completion percentage calculation
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when a project has fewer than 27 sections (e.g., 24 sections after 3 deletions), the completion percentage is calculated using the actual section count: `(completed_count / (len(sections_dict) - 4)) * 100`
  - The test assertions should match the Expected Behavior: `completion_percentage == (completed_count / actual_total) * 100`
  - Run test on UNFIXED code (line 80 has `completion_percentage = int((completed_count / 27) * 100)`)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: e.g., "With 24 sections and 14 completed, calculates 51% instead of 58%"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.10, 1.11, 1.12, 2.7, 2.8_

- [x] 10. Write preservation property tests for Backend router.py (BEFORE implementing fix)
  - **Property 2: Preservation** - Completion Count and API Fields Unchanged (Backend)
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (full project with 27 sections, completed_count calculation, existing API response fields)
  - Write property-based tests capturing observed behavior patterns:
    - Completion count calculation continues to exclude 4 auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions)
    - Full project (27 sections) continues to calculate percentage with 27
    - All existing ProjectSummary fields (id, solution_name, client_name, client_location, created_at, completion_percentage) continue to be returned
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.7, 3.9_

- [ ] 11. Fix for hardcoded section count in Backend router.py

  - [x] 11.1 Implement the backend fix
    - Calculate dynamic total from `sections_dict`: `total_sections = len(sections_dict) - 4`
    - Replace hardcoded 27 in completion percentage calculation on line 80
    - Add safety check for division by zero: `completion_percentage = int((completed_count / total_sections) * 100) if total_sections > 0 else 0`
    - Add `total_sections` field to ProjectSummary schema in `backend/app/projects/schemas.py`
    - Update ProjectSummary construction to include `total_sections` field
    - Add `total_sections: int` field to frontend `ProjectSummary` interface in `frontend/src/types/index.ts`
    - Implementation follows the same pattern as frontend fixes: calculate from actual data, exclude 4 auto-complete sections
    - _Bug_Condition: isBugCondition(input) where actualSectionCount < 27 AND completion_percentage calculated with 27_
    - _Expected_Behavior: completion_percentage uses actual section count, total_sections field included in response_
    - _Preservation: completed_count calculation and all existing API response fields remain unchanged_
    - _Requirements: 1.10, 1.11, 1.12, 2.7, 2.8, 2.9, 3.1, 3.2, 3.7, 3.9_

  - [x] 11.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dynamic Completion Percentage Calculation (Backend)
    - **IMPORTANT**: Re-run the SAME test from task 9 - do NOT write a new test
    - The test from task 9 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 9
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.7, 2.8, 2.9_

  - [x] 11.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Completion Count and API Fields Unchanged (Backend)
    - **IMPORTANT**: Re-run the SAME tests from task 10 - do NOT write new tests
    - Run preservation property tests from step 10
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.7, 3.9_

- [x] 12. Checkpoint - Ensure backend tests pass
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 13. Write bug condition exploration test for Home.tsx
  - **Property 1: Bug Condition** - Dynamic Section Count Display (Home)
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in Home.tsx project card display
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when the API returns a project with `total_sections` field (e.g., 24 sections), the Home page displays the correct section count using `project.total_sections` instead of calculating from percentage with hardcoded 27
  - The test assertions should match the Expected Behavior: `displayedTotal == project.total_sections`
  - Run test on UNFIXED code (line 141 has `Math.round((project.completion_percentage / 100) * 27) / 27`)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: e.g., "With total_sections=24, displays '16 / 27 sections' instead of '14 / 24 sections'"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.7, 1.8, 1.9, 2.10, 2.11_

- [x] 14. Write preservation property tests for Home.tsx (BEFORE implementing fix)
  - **Property 2: Preservation** - Project Display Unchanged (Home)
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (full project with 27 sections, completion percentage display, project card layout)
  - Write property-based tests capturing observed behavior patterns:
    - Full project (27 sections) continues to display "X / 27 sections"
    - Completion percentage display continues to work correctly
    - Project card styling, layout, and interactions remain unchanged
    - All project information (solution_name, client_name, etc.) continues to display correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.4, 3.8_

- [ ] 15. Fix for hardcoded section count in Home.tsx

  - [x] 15.1 Implement the Home.tsx fix
    - Replace hardcoded calculation on line 141: `Math.round((project.completion_percentage / 100) * 27) / 27 sections`
    - Use `project.total_sections` field from API: `Math.round((project.completion_percentage / 100) * project.total_sections) / {project.total_sections} sections`
    - This requires the backend fix (task 11) to be completed first so the API returns `total_sections`
    - Implementation removes hardcoded 27 from both calculation and display
    - _Bug_Condition: isBugCondition(input) where actualSectionCount < 27 AND displayedTotal calculated with 27_
    - _Expected_Behavior: displayedTotal uses project.total_sections from API response_
    - _Preservation: Completion percentage display, project card layout, and all other project information display remain unchanged_
    - _Requirements: 1.7, 1.8, 1.9, 2.10, 2.11, 3.2, 3.4, 3.8_

  - [x] 15.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dynamic Section Count Display (Home)
    - **IMPORTANT**: Re-run the SAME test from task 13 - do NOT write a new test
    - The test from task 13 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 13
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.10, 2.11_

  - [x] 15.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Project Display Unchanged (Home)
    - **IMPORTANT**: Re-run the SAME tests from task 14 - do NOT write new tests
    - Run preservation property tests from step 14
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.2, 3.4, 3.8_

- [x] 16. Final Checkpoint - Ensure all tests pass for all four components
  - Ensure all tests pass for SectionSidebar, DocumentPreview, Backend router.py, and Home.tsx
  - Verify end-to-end flow: backend calculates and returns total_sections, Home page displays it correctly
  - Ask the user if questions arise.
