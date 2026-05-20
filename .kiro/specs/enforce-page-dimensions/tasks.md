# Implementation Plan: Enforce Page Dimensions

## Overview

This implementation plan restructures the DocumentPreview component to enforce consistent page dimensions (816px × 1056px) matching the target Word document format. The refactoring replaces the current single scrollable container with 10 discrete page containers, each with fixed height and overflow clipping. All existing functionality (zoom, navigation, conditional rendering, print styles) is preserved.

**Implementation Language:** TypeScript (React)

**Scope:** Modifications limited to `frontend/src/components/preview/DocumentPreview.tsx` only

**Approach:** 4-phase incremental implementation with checkpoints

## Tasks

- [ ] 1. Define page dimension constants and container style
  - Add three named constants at the top of DocumentPreview.tsx: PAGE_WIDTH_PX (816), PAGE_HEIGHT_PX (1056), PAGE_MARGIN_PX (97)
  - Define pageContainerStyle object with fixed height, overflow hidden, and all required CSS properties
  - Place constants before component definition and style object after other style constants
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [ ]* 1.1 Write unit tests for page dimension constants
  - Test that PAGE_WIDTH_PX equals 816
  - Test that PAGE_HEIGHT_PX equals 1056
  - Test that PAGE_MARGIN_PX equals 97
  - Test that pageContainerStyle has correct dimensions and overflow properties
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3, 2.7_

- [ ] 2. Restructure Page 1 (Cover page)
  - Locate the existing Cover section SectionWrapper in the JSX
  - Wrap the Cover SectionWrapper in a Page_Container div with pageContainerStyle
  - Move the existing PageBreak after the Cover section to be a sibling of the Page_Container (not inside it)
  - Verify the PageBreak is at the same level as the Page_Container in the JSX hierarchy
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

- [ ]* 2.1 Write unit tests for Page 1 structure
  - Test that Page 1 container is rendered with correct dimensions
  - Test that Cover section is wrapped in Page_Container
  - Test that PageBreak is a sibling of Page_Container, not a child
  - Test that Page_Container has overflow: hidden
  - _Requirements: 2.7, 3.1, 4.1, 4.2_

- [ ] 3. Restructure Page 2 (Revision History + Table of Contents)
  - Locate the Revision History and Table of Contents sections
  - Wrap both sections in a single Page_Container div with conditional rendering: {sectionExists('revision_history') && (...)}
  - Place PageBreak after the Page_Container as a sibling
  - Add conditional rendering to PageBreak: {sectionExists('executive_summary') && <PageBreak />}
  - _Requirements: 3.2, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 4. Restructure Page 3 (Executive Summary)
  - Locate the Executive Summary section
  - Wrap it in a Page_Container div with conditional rendering: {sectionExists('executive_summary') && (...)}
  - Place PageBreak after the Page_Container as a sibling
  - Add conditional rendering to PageBreak based on Page 4 sections existence
  - _Requirements: 3.3, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 5. Restructure Page 4 (General Overview group)
  - Locate Introduction, Abbreviations, Process Flow, and Overview sections
  - Wrap all four sections in a single Page_Container div
  - Add conditional rendering: {(sectionExists('introduction') || sectionExists('abbreviations') || sectionExists('process_flow') || sectionExists('overview')) && (...)}
  - Place PageBreak after the Page_Container as a sibling with conditional rendering for Page 5
  - _Requirements: 3.4, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 6. Restructure Page 5 (Offerings group)
  - Locate Features, Remote Support, Documentation Control, Customer Training, System Config, and FAT Condition sections
  - Wrap all six sections in a single Page_Container div
  - Add conditional rendering checking if any of the six sections exist
  - Place PageBreak after the Page_Container as a sibling with conditional rendering for Page 6
  - _Requirements: 3.5, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 7. Restructure Page 6 (Technology Stack group)
  - Locate Tech Stack, Hardware Specs, Software Specs, and Third Party SW sections
  - Wrap all four sections in a single Page_Container div
  - Add conditional rendering: {sectionExists('tech_stack') && (...)}
  - Place PageBreak after the Page_Container as a sibling with conditional rendering for Page 7
  - _Requirements: 3.6, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Restructure Page 7 (Schedule group)
  - Locate Overall Gantt, Shutdown Gantt, and Supervisors sections
  - Wrap all three sections in a single Page_Container div
  - Add conditional rendering checking if any of the three sections exist
  - Place PageBreak after the Page_Container as a sibling with conditional rendering for Page 8
  - _Requirements: 3.7, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 9. Restructure Page 8 (Scope of Supply group)
  - Locate all Scope Definitions through Cybersecurity sections
  - Wrap all sections in a single Page_Container div
  - Add conditional rendering checking if any of the scope sections exist
  - Place PageBreak after the Page_Container as a sibling with conditional rendering for Page 9
  - _Requirements: 3.8, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 10. Restructure Page 9 (Disclaimer)
  - Locate the Disclaimer section
  - Wrap it in a Page_Container div with conditional rendering: {sectionExists('disclaimer') && (...)}
  - Place PageBreak after the Page_Container as a sibling with conditional rendering for Page 10
  - _Requirements: 3.9, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 11. Restructure Page 10 (PoC + End text)
  - Locate the PoC section and "End of Technical Proposal" text
  - Wrap both in a single Page_Container div with conditional rendering: {sectionExists('poc') && (...)}
  - Do NOT add a PageBreak after this page (it's the last page)
  - _Requirements: 3.10, 4.1, 4.2, 4.3, 5.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 12. Checkpoint - Verify structural changes and run tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 12.1 Write integration tests for multi-page structure
  - Test that correct number of Page_Container elements are rendered based on section existence
  - Test that PageBreaks appear between pages but not inside pages
  - Test that empty pages are not rendered when all sections in group are missing
  - Test that the last page does not have a trailing PageBreak
  - _Requirements: 4.1, 4.2, 4.3, 5.3, 8.2, 8.3_

- [ ] 13. Verify zoom functionality across all pages
  - Test zoom in button (increases zoom level)
  - Test zoom out button (decreases zoom level)
  - Test fit-width button (resets to 100%)
  - Verify transform: scale() is applied to Preview_Wrapper, not individual pages
  - Verify all pages scale uniformly at different zoom levels (50%, 75%, 100%, 125%)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 13.1 Write unit tests for zoom functionality
  - Test that zoom controls update the zoom state correctly
  - Test that transform: scale() is applied to the wrapper element
  - Test that zoom value persists to localStorage
  - Test that all Page_Container elements scale uniformly
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 14. Verify section navigation and highlighting
  - Test clicking sections in sidebar scrolls to correct location within pages
  - Verify sectionRefs work correctly across Page_Container boundaries
  - Verify scrollIntoView behavior works for sections in any Page_Container
  - Test active section highlighting (yellow background with red border) works across pages
  - Test hover effects ("Click to edit" tooltip) work on sections within pages
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 14.1 Write integration tests for section navigation
  - Test that clicking a section in sidebar triggers scrollIntoView
  - Test that active section highlighting works across page boundaries
  - Test that hover effects work on sections within Page_Container elements
  - Test that sectionRefs are correctly assigned for sections in all pages
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 15. Verify content clipping at page boundaries
  - Manually test with content that exceeds 1056px height
  - Verify overflow: hidden clips content at page boundary
  - Verify clipped content is not visible outside Page_Container
  - Test with different zoom levels to ensure clipping works at all scales
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]* 15.1 Write unit tests for content clipping
  - Test that Page_Container has overflow: hidden style
  - Test that content exceeding PAGE_HEIGHT_PX is clipped
  - Test that boxSizing: border-box is applied (padding included in height)
  - _Requirements: 2.7, 2.10, 9.1, 9.2_

- [ ] 16. Verify vertical scrolling through all pages
  - Test that Preview_Wrapper maintains overflowY: auto
  - Verify vertical scroll allows navigation through all rendered pages
  - Test scrolling behavior at different zoom levels
  - Verify smooth scrolling experience with multiple Page_Container elements
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 17. Verify completion badge display
  - Test that completion badge shows "Preview - {completedCount} / {totalCompletable} complete"
  - Verify completedCount calculation is unchanged
  - Verify totalCompletable calculation is unchanged
  - Test that badge positioning and styling remain unchanged
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 18. Verify print styles and functionality
  - Test print preview shows correct page breaks
  - Verify PageBreak components have page-break-after: always in print mode
  - Verify PageBreak visual indicators are hidden in print mode
  - Test that toolbar and completion badge are hidden in print mode
  - Verify all pages print correctly with proper page breaks
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ]* 18.1 Write integration tests for print styles
  - Test that print CSS styles are applied correctly
  - Test that PageBreak components have correct print styles
  - Test that toolbar and badge are hidden in print mode
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 19. Verify all existing component behavior is preserved
  - Verify SectionWrapper component works correctly within pages
  - Test that sectionStyle() function returns correct styles
  - Test section click handlers (handleSectionClick, onSectionClick) work correctly
  - Verify image loading logic (getImages, imageUrls) works correctly
  - Test templateReplacements and resolveTemplateText logic work correctly
  - Verify all style constants are applied correctly
  - Test counter management (sectionCounter, subsectionCounter) works correctly
  - Verify formatHeadingWithNumber function works correctly
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9, 13.10_

- [ ] 20. Final checkpoint - Run all existing tests
  - Run the complete test suite to ensure no regressions
  - Verify all existing tests pass without modifications
  - Confirm no test files were modified
  - Confirm only DocumentPreview.tsx was modified
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 14.1, 14.2, 14.3, 15.1, 15.2, 15.3, 15.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster implementation
- All modifications are limited to `frontend/src/components/preview/DocumentPreview.tsx` only
- No property-based testing required (UI restructuring without business logic)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Implementation follows 4 phases: Constants → Cover Page → Remaining Pages → Verification
- All existing functionality must be preserved: zoom, navigation, conditional rendering, print styles
