# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Deleted Sections Disappear from Preview
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when a section key does not exist in `sectionContents` (excluding "cover"), the DocumentPreview component does NOT render a SectionWrapper for that section
  - Test cases to include:
    - Single section delete: Delete "abbreviations" section, verify it does not render in preview
    - Multiple section delete: Delete "features" and "hardware_specs", verify they do not render
    - Group heading test: Delete all sections in "OFFERINGS" group, verify heading does not render
    - Empty vs deleted distinction: Verify deleted sections behave differently from empty sections
  - The test assertions should match the Expected Behavior Properties from design:
    - For any section key NOT in `sectionContents` (excluding "cover"), DocumentPreview SHALL NOT render a SectionWrapper for that section
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "deleted 'abbreviations' section still renders with empty table")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Deleted Section Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (sections that exist in `sectionContents` or are "cover")
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Existing sections with content render correctly with all styling and functionality
    - Existing sections with empty content show placeholder text
    - Cover section always renders unconditionally
    - Section numbering works correctly and skips deleted sections
    - Click handlers and visual feedback work correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Test cases to include:
    - Generate random `sectionContents` with various combinations of existing sections
    - Verify sections with keys in `sectionContents` render with correct content
    - Verify empty sections show placeholder text
    - Verify cover section always renders
    - Verify section numbering adjusts correctly
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for deleted sections appearing in DocumentPreview

  - [x] 3.1 Add `sectionExists` helper function to DocumentPreview.tsx
    - Create helper function: `const sectionExists = (key: string): boolean => key in sectionContents;`
    - This function explicitly checks if a section key exists in `sectionContents`
    - Returns `true` if key exists (even if value is empty), `false` if key has been deleted
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents) AND input.sectionKey != "cover"_
    - _Expected_Behavior: For any section key NOT in sectionContents (excluding "cover"), DocumentPreview SHALL NOT render a SectionWrapper for that section_
    - _Preservation: Sections that exist in sectionContents must continue to render with placeholder text for empty content; cover section must render unconditionally; section numbering must skip deleted sections automatically_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.2 Wrap GENERAL OVERVIEW sections in conditional rendering
    - Conditionally render "GENERAL OVERVIEW" heading if any of: introduction, abbreviations, process_flow, overview exist
    - Wrap each section in conditional check: `{sectionExists('introduction') && <SectionWrapper ...>}`
    - Apply to: introduction, abbreviations, process_flow, overview
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents)_
    - _Expected_Behavior: Deleted sections SHALL NOT render_
    - _Preservation: Existing sections SHALL continue to render with all functionality_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3_

  - [x] 3.3 Wrap OFFERINGS sections in conditional rendering
    - Conditionally render "OFFERINGS" heading if any of: features, remote_support, documentation_control, customer_training, system_config, fat_condition exist
    - Wrap each section in conditional check
    - Apply to: features, remote_support, documentation_control, customer_training, system_config, fat_condition
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents)_
    - _Expected_Behavior: Deleted sections SHALL NOT render_
    - _Preservation: Existing sections SHALL continue to render with all functionality_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3_

  - [x] 3.4 Wrap TECHNOLOGY STACK sections in conditional rendering
    - Conditionally render "TECHNOLOGY STACK" heading if tech_stack exists
    - Wrap tech_stack section and subsections (hardware_specs, software_specs, third_party_sw) in conditional checks
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents)_
    - _Expected_Behavior: Deleted sections SHALL NOT render_
    - _Preservation: Existing sections SHALL continue to render with all functionality_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3_

  - [x] 3.5 Wrap SCHEDULE sections in conditional rendering
    - Conditionally render "SCHEDULE" heading if any of: overall_gantt, shutdown_gantt, supervisors exist
    - Wrap each section in conditional check
    - Apply to: overall_gantt, shutdown_gantt, supervisors
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents)_
    - _Expected_Behavior: Deleted sections SHALL NOT render_
    - _Preservation: Existing sections SHALL continue to render with all functionality_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3_

  - [x] 3.6 Wrap SCOPE OF SUPPLY sections in conditional rendering
    - Conditionally render "SCOPE OF SUPPLY" heading if any of: scope_definitions, division_of_eng, value_addition, work_completion, buyer_obligations, exclusion_list, buyer_prerequisites, binding_conditions, cybersecurity exist
    - Wrap each section in conditional check
    - Apply to: scope_definitions, division_of_eng, value_addition, work_completion, buyer_obligations, exclusion_list, buyer_prerequisites, binding_conditions, cybersecurity
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents)_
    - _Expected_Behavior: Deleted sections SHALL NOT render_
    - _Preservation: Existing sections SHALL continue to render with all functionality_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3_

  - [x] 3.7 Wrap DISCLAIMER, PROOF OF CONCEPT, and other sections in conditional rendering
    - Conditionally render "DISCLAIMER" heading if disclaimer exists
    - Conditionally render "PROOF OF CONCEPT" heading if poc exists
    - Wrap revision_history and Table of Contents placeholder in conditional checks
    - Cover section: No changes (always renders unconditionally)
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents)_
    - _Expected_Behavior: Deleted sections SHALL NOT render_
    - _Preservation: Cover section SHALL continue to render unconditionally; existing sections SHALL continue to render with all functionality_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.8 Wrap PageBreaks conditionally
    - Wrap PageBreak components in conditional checks to avoid extra page breaks when sections are deleted
    - Example: `{(sectionExists('section_before') || sectionExists('section_after')) && <PageBreak />}`
    - Apply to all PageBreak components between deletable sections
    - _Bug_Condition: isBugCondition(input) where input.sectionKey NOT IN keys(input.sectionContents)_
    - _Expected_Behavior: PageBreaks SHALL NOT render when adjacent sections are deleted_
    - _Preservation: PageBreaks SHALL continue to render correctly when sections exist_
    - _Requirements: 2.1, 2.3, 3.3_

  - [x] 3.9 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Deleted Sections Disappear from Preview
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify deleted sections no longer render in preview
    - Verify group headings disappear when all sections in group are deleted
    - Verify empty vs deleted sections are now distinguishable
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.10 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Deleted Section Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - Verify existing sections with content render correctly
    - Verify empty sections show placeholder text
    - Verify cover section always renders
    - Verify section numbering works correctly
    - Verify click handlers and visual feedback work correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise
  - Verify bug condition test passes (deleted sections disappear)
  - Verify preservation tests pass (existing behavior unchanged)
  - Verify no regressions in section rendering, numbering, or functionality
  - Test full delete flow: click delete → backend removes → Editor refreshes → preview updates immediately
