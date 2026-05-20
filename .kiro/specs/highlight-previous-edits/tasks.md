# Implementation Plan: Highlight Previous Edits

## Overview

This implementation adds visual highlighting to the Word preview panel to help users identify sections they edited during their previous work session. The feature uses browser localStorage for persistence and applies orange visual styling (#ED7D31) to previously edited sections that haven't been touched in the current session.

**Key Implementation Points:**
- Dual tracking: `lastEditedSections` (previous session, read-only) + `currentSessionEdits` (current session, in-memory)
- Orange highlights only for sections in `lastEditedSections` but NOT in `currentSessionEdits`
- No backend changes - localStorage only
- Highlight priority: Active (yellow) > Hover (blue) > Previous-edit (orange)

## Tasks

- [ ] 1. Add localStorage tracking to Editor component
  - [ ] 1.1 Add state variables for tracking edited sections
    - Add `lastEditedSections` state (string array) for previous session edits
    - Add `currentSessionEdits` state (Set<string>) for current session tracking
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ] 1.2 Implement localStorage read on component mount
    - Create useEffect hook that runs on projectId change
    - Read `edited_sections_<projectId>` from localStorage
    - Parse JSON and validate it's an array
    - Set `lastEditedSections` state with parsed data or empty array
    - Handle localStorage errors gracefully (privacy mode, quota exceeded)
    - Handle JSON parse errors and clean up corrupted data
    - _Requirements: 1.3, 1.4, 1.7, 1.8_

  - [ ] 1.3 Implement section edit tracking in handleSectionContentChange
    - Add section_key to `currentSessionEdits` Set when section is saved
    - Convert Set to array and write to localStorage as `edited_sections_<projectId>`
    - Handle localStorage write errors gracefully
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ]* 1.4 Write unit tests for Editor localStorage logic
    - Test localStorage read with valid data
    - Test localStorage read with no data (fresh project)
    - Test localStorage read with corrupted data
    - Test currentSessionEdits Set updates on section save
    - Test localStorage write on section save
    - Test project-scoped localStorage keys
    - _Requirements: 1.3, 1.4, 1.8, 8.1, 8.2_

- [ ] 2. Update DocumentPreview component for orange highlighting
  - [ ] 2.1 Update DocumentPreview props interface
    - Add optional `lastEditedSections?: string[]` prop
    - Add optional `currentSessionEdits?: string[]` prop
    - Ensure backward compatibility with optional props
    - _Requirements: 2.1, 7.1_

  - [ ] 2.2 Modify sectionStyle function to apply orange highlighting
    - Add logic to check if section is in `lastEditedSections` but NOT in `currentSessionEdits`
    - Apply orange border (`3px solid #ED7D31`) for non-cover previously edited sections
    - Apply orange background (`#FFF3EC`) for previously edited sections
    - Handle cover section separately (background only, no border)
    - Ensure active section styling takes priority over orange
    - Ensure hover styling takes priority over orange
    - Handle undefined props gracefully for backward compatibility
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 3.2_

  - [ ]* 2.3 Write unit tests for DocumentPreview styling logic
    - Test orange styling applied for previously edited sections
    - Test active styling overrides orange (priority)
    - Test hover styling overrides orange (priority)
    - Test no orange styling for sections in currentSessionEdits
    - Test cover section receives background only (no border)
    - Test undefined props handled gracefully
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 3.2_

- [ ] 3. Wire Editor and DocumentPreview together
  - [ ] 3.1 Pass new props from Editor to DocumentPreview
    - Add `lastEditedSections={lastEditedSections}` prop
    - Add `currentSessionEdits={Array.from(currentSessionEdits)}` prop
    - Verify props are passed correctly in Editor.tsx
    - _Requirements: 1.5, 2.1_

  - [ ] 3.2 Test highlight removal on current session edit
    - Verify orange highlight appears for previously edited section
    - Edit the highlighted section and save
    - Verify orange highlight disappears after save
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Checkpoint - Verify core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Add optional sidebar orange dot indicators
  - [ ] 5.1 Update SectionSidebar props interface
    - Add optional `lastEditedSections?: string[]` prop
    - Add optional `currentSessionEdits?: string[]` prop
    - _Requirements: 5.1_

  - [ ] 5.2 Add orange dot visual indicator to sidebar section items
    - Check if section is in `lastEditedSections` but NOT in `currentSessionEdits`
    - Render small orange dot (6px circle, #ED7D31) next to section label
    - Position dot before section label text
    - Ensure dot doesn't affect click behavior
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 5.3 Pass props from Editor to SectionSidebar
    - Add `lastEditedSections={lastEditedSections}` prop
    - Add `currentSessionEdits={Array.from(currentSessionEdits)}` prop
    - _Requirements: 5.1_

  - [ ]* 5.4 Write unit tests for SectionSidebar orange dots
    - Test orange dot renders for previously edited sections
    - Test orange dot does not render for sections in currentSessionEdits
    - Test orange dot does not render when props are undefined
    - _Requirements: 5.1, 5.2_

- [ ] 6. Integration testing and validation
  - [ ]* 6.1 Write integration tests for full workflow
    - Test fresh project shows no orange highlights
    - Test editing section creates localStorage entry
    - Test page refresh shows orange highlights for previous session
    - Test highlight removal after re-editing section
    - Test multiple projects maintain separate localStorage entries
    - Test session persistence across browser close/reopen
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.1, 8.2_

  - [ ]* 6.2 Write integration tests for highlight priority
    - Test active section shows yellow (not orange)
    - Test hovered section shows blue border (not orange)
    - Test previously edited section shows orange when not active/hovered
    - _Requirements: 2.4, 2.5, 7.1, 7.2_

  - [ ]* 6.3 Write integration tests for error handling
    - Test localStorage read failure (privacy mode simulation)
    - Test localStorage write failure
    - Test corrupted JSON data in localStorage
    - Verify graceful degradation in all error cases
    - _Requirements: 1.3, 1.4_

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- No backend changes required - this is a frontend-only feature
- Feature is backward compatible with optional props
- Graceful error handling ensures feature degrades gracefully if localStorage fails
- Orange highlights use Microsoft Word's Orange Accent 2 color (#ED7D31)
