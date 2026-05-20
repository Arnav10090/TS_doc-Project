# Implementation Plan: Add Custom Sections Feature

## Overview

This implementation plan breaks down the custom sections feature into 7 phases covering backend validation, data models, UI components, preview integration, sidebar integration, DOCX filtering, and comprehensive testing. The feature enables users to insert custom sections with tables, images, and rich text at specific positions in the document preview while maintaining complete separation from the 31 predefined sections.

## Tasks

- [x] 1. Extend backend validation for custom section keys
  - [x] 1.1 Update section key validation in backend router
    - Modify `backend/app/sections/router.py` to accept custom section key patterns
    - Add regex patterns for `custom_section_{timestamp}_{uuid}` and `custom_subsection_{timestamp}_{uuid}`
    - Update validation function to check custom patterns in addition to predefined keys
    - Update error messages to include custom section patterns
    - _Requirements: 8.1, 8.2, 8.4, 15.1, 15.2, 15.3, 15.4_

  - [ ]* 1.2 Write property test for backend section key validation
    - **Property 6: Backend Section Key Validation**
    - **Validates: Requirements 8.4, 15.1, 15.2, 15.3, 15.4**
    - Generate random valid and invalid section keys
    - Verify backend accepts all valid patterns (predefined + custom)
    - Verify backend rejects invalid patterns with 400 Bad Request
    - _Requirements: 8.4, 15.1, 15.2, 15.3, 15.4_

  - [ ]* 1.3 Write unit tests for backend validation
    - Test validation accepts all 31 predefined section keys
    - Test validation accepts custom_section pattern with valid timestamp and UUID
    - Test validation accepts custom_subsection pattern with valid timestamp and UUID
    - Test validation rejects malformed custom keys
    - Test error response format for invalid keys
    - _Requirements: 8.4, 15.4_

- [x] 2. Create data models and utility functions
  - [x] 2.1 Create TypeScript interfaces for custom sections
    - Create `frontend/src/types/customSections.ts`
    - Define `CustomSectionContent`, `CustomSubsection`, `TableData`, `ImageData`, `ParagraphData` interfaces
    - Define content type union types
    - _Requirements: 8.6, 8.7_

  - [x] 2.2 Implement section key generation utilities
    - Create `frontend/src/utils/customSectionUtils.ts`
    - Implement `generateCustomSectionKey()` function using timestamp and UUID v4
    - Implement `generateCustomSubsectionKey()` function using timestamp and UUID v4
    - _Requirements: 3.2, 4.7, 8.1, 8.2_

  - [ ]* 2.3 Write property tests for key generation
    - **Property 1: Section Key Format Validation**
    - **Validates: Requirements 3.2, 8.1**
    - **Property 2: Subsection Key Format Validation**
    - **Validates: Requirements 4.7, 8.2**
    - Generate 100+ random keys and verify pattern matching
    - Verify timestamp is valid Unix milliseconds
    - Verify UUID is valid v4 format
    - _Requirements: 3.2, 4.7, 8.1, 8.2_

  - [x] 2.4 Implement image validation utilities
    - Create image file type validation function (PNG/JPG only)
    - Create image size validation function (max 10MB)
    - Create base64 conversion function using FileReader API
    - Return appropriate error messages for validation failures
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ]* 2.5 Write property tests for image validation
    - **Property 7: Image File Type Validation**
    - **Validates: Requirement 6.2**
    - **Property 8: Image Size Validation**
    - **Validates: Requirement 6.3**
    - **Property 9: Base64 Image Conversion Round-Trip**
    - **Validates: Requirement 6.4**
    - Generate random file types and sizes
    - Verify PNG/JPG acceptance and other rejections
    - Verify 10MB boundary enforcement
    - Verify base64 encode/decode produces identical data
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 2.6 Implement position tracking utilities
    - Create function to calculate insertion position based on `insertAfterKey`
    - Create function to determine ordered sections list (predefined + custom)
    - Create function to calculate section numbers including custom sections
    - Create function to calculate subsection numbers within parent sections
    - _Requirements: 3.3, 3.4, 4.9, 8.3, 9.2, 9.3, 9.4_

  - [ ]* 2.7 Write property tests for position tracking and numbering
    - **Property 3: Insert Position Tracking**
    - **Validates: Requirements 3.3, 8.3**
    - **Property 4: Sequential Section Numbering**
    - **Validates: Requirements 3.4, 9.2, 9.3**
    - **Property 5: Subsection Numbering Within Parent**
    - **Validates: Requirements 4.9, 9.4**
    - Generate random document structures with mixed section types
    - Verify insertAfterKey always references correct preceding section
    - Verify section numbering is sequential (1, 2, 3, ...)
    - Verify insertion causes correct renumbering of subsequent sections
    - Verify subsection numbering resets to 1 for each parent section
    - _Requirements: 3.3, 3.4, 4.9, 8.3, 9.2, 9.3, 9.4_

  - [x] 2.8 Implement table HTML generation utility
    - Create function to generate HTML table from TableData structure
    - Include proper table, thead, tbody, tr, th, td elements
    - Apply inline styles for table formatting
    - _Requirements: 5.5_

  - [ ]* 2.9 Write property test for table HTML generation
    - **Property 10: Table HTML Generation**
    - **Validates: Requirement 5.5**
    - Generate random table configurations (N columns, M rows)
    - Verify HTML contains exactly one table element
    - Verify thead contains N th elements
    - Verify tbody contains M tr elements each with N td elements
    - _Requirements: 5.5_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build UI components for custom section creation
  - [x] 4.1 Create PageBreakWithButton component
    - Create `frontend/src/components/preview/PageBreakWithButton.tsx`
    - Display "+ Add New Section" button centered in page break area
    - Implement hover effect (color change to #E60012)
    - Add onClick handler to trigger section type modal
    - Use inline styles for all visual properties
    - Add CSS class for print mode hiding
    - _Requirements: 1.1, 1.2, 1.3, 13.1, 16.1_

  - [x] 4.2 Create SectionTypeModal component
    - Create `frontend/src/components/modals/SectionTypeModal.tsx`
    - Display modal overlay with centered dialog
    - Show prompt "What would you like to add?"
    - Provide "New Section" and "New Subsection" option buttons
    - Handle outside click and Escape key to close
    - Call appropriate handler based on selection
    - Use inline styles for modal overlay and content
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 16.2_

  - [x] 4.3 Create CustomSectionInput component
    - Create `frontend/src/components/input/CustomSectionInput.tsx`
    - Display "Add Section Title" button
    - Show text input field when button clicked
    - Handle title input and save on blur/Enter
    - Trigger auto-save to backend via upsertSection API
    - Use inline styles for all elements
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 16.3_

  - [x] 4.4 Create CustomSubsectionInput component
    - Create `frontend/src/components/input/CustomSubsectionInput.tsx`
    - Display subsection name input field
    - Provide content type selector (Table, Image, Paragraph)
    - Render appropriate editor based on content type selection
    - Handle subsection data updates
    - Use inline styles for all elements
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 16.3_

  - [x] 4.5 Create TableSubsectionEditor component
    - Create `frontend/src/components/input/TableSubsectionEditor.tsx`
    - Provide interface to define column names
    - Provide controls to add/remove columns
    - Provide controls to add/remove rows
    - Provide interface to edit cell data
    - Generate HTML table representation on save
    - Use inline styles for table configuration UI
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 16.3_

  - [x] 4.6 Create ImageSubsectionEditor component
    - Create `frontend/src/components/input/ImageSubsectionEditor.tsx`
    - Provide file input for PNG/JPG uploads
    - Validate file type and size (max 10MB)
    - Convert valid images to base64 using FileReader API
    - Display image preview after upload
    - Show error messages for invalid uploads
    - Use inline styles for upload UI
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 16.3_

  - [x] 4.7 Create ParagraphSubsectionEditor component
    - Create `frontend/src/components/input/ParagraphSubsectionEditor.tsx`
    - Integrate TipTap editor with StarterKit and Underline extensions
    - Provide formatting toolbar (bold, italic, underline, lists)
    - Store content as HTML
    - Implement auto-save with 500ms debounce
    - Use inline styles for editor container
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 16.3, 17.2_

  - [ ]* 4.8 Write unit tests for UI components
    - Test PageBreakWithButton renders and handles clicks
    - Test SectionTypeModal opens, closes, and handles selections
    - Test CustomSectionInput title input and save
    - Test CustomSubsectionInput content type switching
    - Test TableSubsectionEditor column/row operations
    - Test ImageSubsectionEditor file validation and upload
    - Test ParagraphSubsectionEditor formatting preservation
    - Test all components use inline styles (no CSS classes)
    - Test print mode hides Add Section buttons
    - _Requirements: 1.1, 1.2, 1.3, 2.1-2.6, 3.5-3.8, 4.1-4.6, 5.1-5.7, 6.1-6.6, 7.1-7.6, 13.1, 16.1-16.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate custom sections into document preview
  - [x] 6.1 Modify DocumentPreview component to render custom sections
    - Update `frontend/src/components/preview/DocumentPreview.tsx`
    - Implement function to get ordered sections (predefined + custom by insertAfterKey)
    - Implement custom section rendering function
    - Implement custom subsection rendering function
    - Render PageBreakWithButton between all consecutive sections
    - Apply consistent heading styles to custom sections (matching predefined)
    - Apply consistent subsection styles to custom subsections
    - _Requirements: 3.1, 9.1, 9.5, 9.6, 1.5_

  - [x] 6.2 Implement section numbering with custom sections
    - Calculate sequential section numbers across predefined and custom sections
    - Update section counter to increment for both types
    - Renumber subsequent sections when custom section inserted
    - Display correct section numbers in preview headings
    - _Requirements: 3.4, 9.2, 9.3_

  - [x] 6.3 Implement subsection numbering within custom sections
    - Calculate subsection numbers within each parent section
    - Reset subsection counter to 1 for each new parent section
    - Display correct subsection numbers in preview headings
    - _Requirements: 4.9, 9.4_

  - [x] 6.4 Render custom subsection content by type
    - Implement table rendering using generated HTML with inline styles
    - Implement image rendering from base64 data with aspect ratio preservation
    - Implement paragraph rendering from HTML with formatting preservation
    - Ensure all rendered content fits within document width constraints
    - _Requirements: 5.5, 5.6, 6.5, 6.6, 6.7, 7.4, 7.5, 16.4_

  - [ ]* 6.5 Write property test for rich text formatting preservation
    - **Property 11: Rich Text Formatting Preservation**
    - **Validates: Requirements 7.3, 7.5**
    - Generate random formatted text (bold, italic, underline, lists)
    - Store in backend and retrieve
    - Verify rendered output preserves all formatting
    - Verify visual appearance matches editor state
    - _Requirements: 7.3, 7.5_

  - [ ]* 6.6 Write property test for predefined section rendering preservation
    - **Property 16: Predefined Section Rendering Preservation**
    - **Validates: Requirement 14.1**
    - Generate random predefined section content
    - Render with and without custom sections present
    - Verify rendering is identical (no regression)
    - _Requirements: 14.1_

  - [ ]* 6.7 Write unit tests for preview integration
    - Test ordered sections calculation with various insertAfterKey values
    - Test section numbering with mixed predefined and custom sections
    - Test subsection numbering resets per parent
    - Test table HTML rendering with inline styles
    - Test image rendering with base64 data
    - Test paragraph HTML rendering with formatting
    - Test PageBreakWithButton appears between all sections
    - _Requirements: 3.1, 3.4, 4.9, 5.5, 5.6, 6.5, 6.6, 6.7, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 7. Integrate custom sections into section sidebar
  - [x] 7.1 Add "CUSTOM SECTIONS" group to sidebar
    - Modify `frontend/src/components/layout/SectionSidebar.tsx`
    - Create "CUSTOM SECTIONS" group category
    - Filter custom sections from sectionContents
    - Display custom section titles or "NEW SECTION" placeholder
    - Position group after all predefined section groups
    - _Requirements: 10.1, 10.2, 10.4, 10.6_

  - [x] 7.2 Implement custom section navigation
    - Handle click on custom section in sidebar
    - Activate selected custom section
    - Display custom section configuration in Section Input Panel
    - Ensure no completion badges appear for custom sections
    - _Requirements: 10.3, 10.5_

  - [x] 7.3 Update completion percentage calculation
    - Modify completion percentage logic to exclude custom sections
    - Ensure calculation only considers 27 completable predefined sections
    - Display "X / 27 sections complete" regardless of custom section count
    - Update progress bar to reflect only predefined section completion
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 7.4 Write property test for completion percentage exclusion
    - **Property 12: Completion Percentage Exclusion**
    - **Validates: Requirement 11.1**
    - Generate random numbers of custom sections (0 to 100)
    - Verify completion percentage always uses 27 as denominator
    - Verify custom sections never affect numerator
    - Verify progress bar reflects only predefined sections
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 7.5 Write unit tests for sidebar integration
    - Test "CUSTOM SECTIONS" group appears in sidebar
    - Test custom sections listed with correct titles
    - Test custom section activation and navigation
    - Test no completion badges for custom sections
    - Test completion percentage excludes custom sections
    - Test completion count displays "X / 27" format
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Include custom sections in DOCX generation
  - [x] 9.1 Modify DOCX generation to include custom sections
    - Update DOCX generation logic in `backend/app/generation/docx_generator.py`
    - Include all sections with keys matching custom section patterns
    - Ensure custom sections appear at correct positions based on insertAfterKey
    - Render custom section titles and subsection content (tables, images, paragraphs) in DOCX
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

  - [x] 9.2 Ensure DOCX section numbering matches preview
    - Calculate section numbers for DOCX including custom sections
    - Ensure numbering matches preview exactly (1, 2, 3, ... with custom sections in sequence)
    - Verify custom sections have same numbers as in preview
    - _Requirements: 12.4_

  - [ ]* 9.3 Write property tests for DOCX generation
    - **Property 13: DOCX Generation Inclusion**
    - **Validates: Requirements 12.1, 12.3, 12.4**
    - **Property 14: DOCX Generation Stability**
    - **Validates: Requirement 12.3**
    - **Property 15: DOCX Section Numbering Consistency**
    - **Validates: Requirement 12.4**
    - Generate random custom sections in various positions with different content types
    - Verify DOCX contains all custom section content at correct positions
    - Verify DOCX generation always succeeds regardless of custom sections
    - Verify DOCX numbering exactly matches preview numbering
    - _Requirements: 12.1, 12.3, 12.4_

  - [ ]* 9.4 Write unit tests for DOCX inclusion
    - Test DOCX generation with zero custom sections
    - Test DOCX generation with multiple custom sections
    - Test DOCX contains both predefined and custom sections
    - Test DOCX renders custom section tables correctly
    - Test DOCX renders custom section images correctly
    - Test DOCX renders custom section paragraphs with formatting
    - Test DOCX generation succeeds with custom sections present
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 10. Implement print mode UI hiding
  - [x] 10.1 Add print mode CSS media queries
    - Add CSS media query to hide Add Section buttons in print mode
    - Add CSS media query to hide preview toolbar in print mode
    - Add CSS media query to hide completion badge in print mode
    - Add CSS media query to hide section hover indicators in print mode
    - Add CSS media query to hide click-to-edit prompts in print mode
    - Ensure page breaks render correctly in print mode
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 10.2 Write unit tests for print mode
    - Test Add Section buttons hidden in print mode
    - Test preview toolbar hidden in print mode
    - Test completion badge hidden in print mode
    - Test section hover indicators hidden in print mode
    - Test click-to-edit prompts hidden in print mode
    - Test page breaks render correctly in print mode
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 11. Comprehensive integration testing
  - [ ]* 11.1 Write end-to-end workflow tests
    - Test complete flow: click Add Section → select New Section → enter title → verify in sidebar and preview
    - Test complete flow: click Add Section → select New Subsection → configure table → verify rendering
    - Test complete flow: click Add Section → select New Subsection → upload image → verify rendering
    - Test complete flow: click Add Section → select New Subsection → create paragraph → verify rendering
    - Test custom section insertion between predefined sections
    - Test section renumbering after custom section insertion
    - Test auto-save persistence for custom sections
    - Test page refresh preserves custom sections
    - Test DOCX generation includes custom sections with correct numbering
    - Test print mode hides interactive elements
    - _Requirements: All requirements_

  - [ ]* 11.2 Write regression tests for existing functionality
    - Test all 31 predefined sections render identically
    - Test predefined section data storage unchanged
    - Test predefined section completion tracking unchanged
    - Test predefined section DOCX generation unchanged
    - Test auto-save mechanism unchanged for predefined sections
    - Test section navigation unchanged for predefined sections
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 12. Final checkpoint and documentation
  - [x] 12.1 Run full test suite
    - Execute all unit tests
    - Execute all property-based tests (minimum 100 iterations each)
    - Execute all integration tests
    - Verify all tests pass
    - Fix any failing tests

  - [x] 12.2 Perform manual testing
    - Verify Add Section button appears in all page breaks
    - Verify Section Type Modal opens and closes correctly
    - Verify custom section creation and rendering
    - Verify table subsection configuration and rendering
    - Verify image subsection upload and rendering
    - Verify paragraph subsection formatting and rendering
    - Verify section and subsection numbering
    - Verify sidebar "CUSTOM SECTIONS" group
    - Verify completion percentage excludes custom sections
    - Verify DOCX generation includes custom sections with correct numbering
    - Verify print mode hides interactive elements
    - Verify auto-save persistence
    - Verify page refresh preserves custom sections

  - [x] 12.3 Update documentation
    - Document custom section key patterns
    - Document API usage for custom sections
    - Document inline styling patterns used
    - Document testing approach and property tests
    - Update user-facing documentation if needed

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and UI interactions
- Checkpoints ensure incremental validation throughout implementation
- All property tests must run minimum 100 iterations
- All new UI components must use inline styles (no CSS classes or Tailwind)
- Feature uses existing dependencies only (TipTap for rich text, native APIs for images)
- Custom sections appear only in preview, never in DOCX output
- Completion percentage always based on 27 predefined sections regardless of custom sections
