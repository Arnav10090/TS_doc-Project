# Implementation Plan: Add Save Button

## Overview

This implementation adds an explicit Save button to the SectionHeader component that appears across all 31 section components. The Save button provides immediate save functionality alongside the existing 800ms autosave mechanism, enabling users to manually trigger saves and see instant preview updates.

**Key Implementation Strategy**:
- Enhance useAutoSave hook to expose `saveNow()` function for immediate saves
- Update SectionHeader component to render Save button with state management
- Apply mechanical prop passing pattern to all 31 section components
- Ensure coexistence of manual save and autosave without conflicts

## Tasks

- [ ] 1. Enhance useAutoSave hook with immediate save functionality
  - [ ] 1.1 Add saveNow function to useAutoSave hook
    - Modify `frontend/src/hooks/useAutoSave.ts` to add `saveNow` function
    - Implement timer clearing logic to prevent duplicate saves
    - Ensure immediate invocation of onContentChange callback
    - Update return type interface to include `saveNow`
    - _Requirements: 2.1, 2.2, 2.3, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 1.2 Write unit tests for saveNow function
    - Test immediate execution without debounce delay
    - Test clearing of pending autosave timers
    - Test onContentChange callback invocation
    - Test status transitions (idle → saving → saved)
    - Test error handling and status update to 'error'
    - Test status reset to 'idle' after 2 seconds
    - Test concurrent saveNow calls clear previous reset timer
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ] 1.3 Verify existing autosave tests still pass
    - Run existing test suite for useAutoSave hook
    - Ensure no regressions in autosave behavior
    - _Requirements: 4.1, 4.2_

- [ ] 2. Update SectionHeader component with Save button
  - [ ] 2.1 Add Save button UI to SectionHeader component
    - Modify `frontend/src/components/shared/SectionHeader.tsx`
    - Add `onSave` prop to SectionHeaderProps interface
    - Implement Save button with Hitachi red (#E60012) styling
    - Add button state logic based on status prop (Save/Saving.../Saved ✓)
    - Implement disabled state during save operations
    - Add hover effects matching Delete button styling
    - Add keyboard accessibility (Tab and Enter support)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 2.2 Write unit tests for SectionHeader Save button
    - Test Save button renders with correct text based on status
    - Test button disabled state during save
    - Test onSave callback invocation on click
    - Test error state display
    - Test keyboard accessibility (Tab + Enter)
    - Test hover effects
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 8.5_
  
  - [ ] 2.3 Verify existing SectionHeader tests still pass
    - Run existing test suite for SectionHeader component
    - Ensure no regressions in Delete button or status display
    - _Requirements: 1.1_

- [ ] 3. Checkpoint - Verify hook and header components work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Update section components with Save button integration (Part 1: Components 1-10)
  - [ ] 4.1 Update CoverSection component
    - Destructure `saveNow` from useAutoSave hook
    - Create `handleSaveClick` callback that invokes `saveNow(content)`
    - Pass `onSave={handleSaveClick}` prop to SectionHeader
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.2 Update ExecutiveSummary component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.3 Update IntroductionSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.4 Update ScopeSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.5 Update DefinitionsSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.6 Update AbbreviationsSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.7 Update ReferencesSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.8 Update OverviewSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.9 Update SystemContextSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 4.10 Update UserCharacteristicsSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_

- [ ] 5. Update section components with Save button integration (Part 2: Components 11-20)
  - [ ] 5.1 Update ConstraintsSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.2 Update AssumptionsSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.3 Update FunctionalRequirementsSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.4 Update ExternalInterfaceSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.5 Update PerformanceSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.6 Update SafetySection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.7 Update SecuritySection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.8 Update SoftwareQualitySection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.9 Update BusinessRulesSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.10 Update UserDocumentationSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_

- [ ] 6. Update section components with Save button integration (Part 3: Components 21-31)
  - [ ] 6.1 Update ComponentsSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.2 Update ArchitectureSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.3 Update DataDesignSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.4 Update InterfaceDesignSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.5 Update ProcedureDesignSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.6 Update TestPlanSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.7 Update TestCasesSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.8 Update TraceabilitySection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.9 Update AppendixASection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.10 Update AppendixBSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 6.11 Update AppendixCSection component
    - Apply same pattern as CoverSection
    - _Requirements: 1.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_

- [ ] 7. Checkpoint - Verify all section components updated correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 8. Write unit tests for representative section components
  - [ ]* 8.1 Write unit tests for CoverSection Save button integration
    - Test handleSaveClick invokes saveNow with current content
    - Test onSave prop passed to SectionHeader
    - Test autosave still works after adding Save button
    - _Requirements: 5.3, 5.4, 7.3, 7.4_
  
  - [ ]* 8.2 Write unit tests for ExecutiveSummary Save button integration
    - Apply same test pattern as CoverSection
    - _Requirements: 5.3, 5.4, 7.3, 7.4_
  
  - [ ]* 8.3 Write unit tests for FunctionalRequirementsSection Save button integration
    - Apply same test pattern as CoverSection
    - _Requirements: 5.3, 5.4, 7.3, 7.4_

- [ ]* 9. Write integration tests for end-to-end save flow
  - [ ]* 9.1 Write test for Save button triggering API call and preview update
    - Render Editor with CoverSection
    - Update form field and click Save button
    - Assert API called with correct content
    - Assert preview re-renders with updated content
    - Assert status shows "Saved ✓"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3_
  
  - [ ]* 9.2 Write test for Save button and autosave coexistence
    - Update form field and click Save button before 800ms
    - Assert only one API call occurred
    - Verify no duplicate saves
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 9.3 Write test for multiple rapid Save button clicks
    - Click Save button 3 times rapidly
    - Assert only one API call in progress
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 9.4 Write test for Save button across all 31 sections
    - Iterate through all section components
    - Assert Save button present in each
    - Click Save button and verify API called with correct section_key
    - _Requirements: 1.5, 7.5_
  
  - [ ]* 9.5 Write test for error handling and recovery
    - Mock API to return error
    - Click Save button
    - Assert status shows "Error saving"
    - Assert Save button remains enabled for retry
    - Click Save button again and verify retry
    - _Requirements: 2.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Final checkpoint - Ensure all tests pass and feature is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Section component updates (tasks 4-6) follow identical mechanical pattern
- No property-based tests included as this feature involves UI interactions and event-driven behavior
- Integration tests validate end-to-end flows and component interactions
- Checkpoints ensure incremental validation at key milestones
