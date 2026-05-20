# Implementation Plan: Render Rich Text Preview

## Overview

This implementation plan converts the design for rich text rendering in DocumentPreview into discrete coding tasks. The implementation adds a `RichTextRenderer` utility function that safely parses TipTap HTML output and converts it to styled React JSX elements, enabling rich text formatting (bullet lists, numbered lists, bold, italic, underline) in the Word-like document preview.

The approach is incremental:
1. Implement the core RichTextRenderer utility function
2. Update all 12 user-authored fields to use RichTextRenderer
3. Verify backward compatibility with stripHtml for template interpolation
4. Add comprehensive testing (unit, integration, and property-based tests)

## Tasks

- [ ] 1. Implement RichTextRenderer utility function
  - [ ] 1.1 Create RichTextRenderer function with HTML parsing logic
    - Add RichTextRenderer function to DocumentPreview.tsx
    - Implement DOMParser-based HTML parsing with null/empty input handling
    - Implement recursive DOM-to-JSX conversion for supported tags (p, ul, ol, li, strong, em, u)
    - Add inline style application for formatting tags (bold, italic, underline)
    - Apply bodyParagraphStyle and listParagraphStyle to appropriate elements
    - Ignore unsupported/malicious elements (script, style, iframe, etc.)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 1.2 Write unit tests for RichTextRenderer
    - Test null/empty input returns null
    - Test paragraph rendering with bodyParagraphStyle
    - Test bullet list rendering with disc bullets and listParagraphStyle
    - Test numbered list rendering with decimal numbering and listParagraphStyle
    - Test inline formatting (bold, italic, underline)
    - Test nested inline formatting
    - Test nested list item structure (li > p)
    - Test malformed HTML handling
    - Test unsupported element filtering
    - _Requirements: 1.3, 1.4, 2.1, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.5, 5.2, 5.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 2. Update DocumentPreview to use RichTextRenderer for user-authored fields
  - [ ] 2.1 Update executiveSummary.para1 field
    - Replace stripHtml with RichTextRenderer for executiveSummary.para1 (line ~1323)
    - Preserve placeholder display logic for empty values
    - _Requirements: 6.1, 8.1, 8.2, 8.3, 8.4, 11.3_

  - [ ] 2.2 Update processFlow.text field
    - Replace stripHtml with RichTextRenderer for processFlow.text (lines ~1323, ~1353)
    - Preserve placeholder display logic for empty values
    - _Requirements: 6.2, 8.1, 8.2, 8.3, 8.4, 11.3_

  - [ ] 2.3 Update overview section fields
    - Replace stripHtml with RichTextRenderer for overview.system_objective (line ~1369)
    - Replace stripHtml with RichTextRenderer for overview.existing_system (line ~1379)
    - Replace stripHtml with RichTextRenderer for overview.integration (line ~1389)
    - Replace stripHtml with RichTextRenderer for overview.tangible_benefits (line ~1400)
    - Replace stripHtml with RichTextRenderer for overview.intangible_benefits (line ~1410)
    - Preserve placeholder display logic for all overview fields
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.2, 8.3, 8.4, 11.3_

  - [ ] 2.4 Update remaining user-authored fields
    - Replace stripHtml with RichTextRenderer for remoteSupport.text (line ~1516)
    - Replace stripHtml with RichTextRenderer for fatCondition.text (line ~1649)
    - Replace stripHtml with RichTextRenderer for valueAddition.text (line ~2273)
    - Replace stripHtml with RichTextRenderer for poc.description (line ~2523)
    - Replace stripHtml with RichTextRenderer for features[].description (line ~1479)
    - Preserve placeholder display logic for all fields
    - _Requirements: 6.8, 6.9, 6.10, 6.11, 6.12, 8.1, 8.2, 8.3, 8.4, 11.3_

  - [ ]* 2.5 Write integration tests for all 12 user-authored fields
    - Test RichTextRenderer is called for all 12 user-authored fields
    - Test placeholder display when fields are empty
    - Test rich text rendering when fields contain HTML
    - Test stripHtml is still used in templateReplacements useMemo
    - Test backward compatibility: non-rich-text fields unchanged
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 7.1, 7.3, 8.1, 8.3, 8.5, 11.5, 12.1, 12.2_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Add property-based tests for correctness properties
  - [ ]* 4.1 Write property test for script sanitization
    - **Property 1: Script Sanitization**
    - **Validates: Requirements 1.4**
    - Generate HTML with various script tag formats (inline, nested, uppercase)
    - Verify no script content appears in rendered output
    - Run 100+ iterations with fast-check
    - _Requirements: 1.4_

  - [ ]* 4.2 Write property test for valid React element output
    - **Property 2: Valid React Element Output**
    - **Validates: Requirements 1.5**
    - Generate random valid TipTap HTML (paragraphs, lists, formatted text)
    - Verify result renders without errors
    - Run 100+ iterations with fast-check
    - _Requirements: 1.5_

  - [ ]* 4.3 Write property test for paragraph rendering with correct style
    - **Property 3: Paragraph Rendering with Correct Style**
    - **Validates: Requirements 2.1, 2.3**
    - Generate HTML with N paragraphs (1-10)
    - Verify each paragraph has bodyParagraphStyle (justified alignment, 8px margin)
    - Run 100+ iterations with fast-check
    - _Requirements: 2.1, 2.3_

  - [ ]* 4.4 Write property test for inline formatting styles
    - **Property 4: Inline Formatting Styles**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - Generate HTML with nested inline formatting (strong, em, u)
    - Verify all styles are applied correctly (fontWeight, fontStyle, textDecoration)
    - Run 100+ iterations with fast-check
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 4.5 Write property test for text content preservation
    - **Property 5: Text Content Preservation**
    - **Validates: Requirements 3.5**
    - Generate random text with inline formatting
    - Verify text content is preserved exactly in rendered output
    - Run 100+ iterations with fast-check
    - _Requirements: 3.5_

  - [ ]* 4.6 Write property test for bullet list rendering
    - **Property 6: Bullet List Rendering**
    - **Validates: Requirements 4.1, 4.2, 4.5**
    - Generate HTML with N bullet list items (1-10)
    - Verify list structure, disc bullets, and listParagraphStyle (16px margin)
    - Run 100+ iterations with fast-check
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 4.7 Write property test for numbered list rendering
    - **Property 7: Numbered List Rendering**
    - **Validates: Requirements 5.1, 5.2, 5.5**
    - Generate HTML with N numbered list items (1-10)
    - Verify list structure, decimal numbering, and listParagraphStyle (16px margin)
    - Run 100+ iterations with fast-check
    - _Requirements: 5.1, 5.2, 5.5_

  - [ ]* 4.8 Write property test for nested list item structure
    - **Property 8: Nested List Item Structure**
    - **Validates: Requirements 4.5, 5.5**
    - Generate HTML with li containing nested p tags
    - Verify nested structure is preserved correctly
    - Run 100+ iterations with fast-check
    - _Requirements: 4.5, 5.5_

- [ ] 5. Verify backward compatibility
  - [ ] 5.1 Verify stripHtml usage in templateReplacements
    - Confirm stripHtml is still used in templateReplacements useMemo (lines 348-402)
    - Confirm stripHtml function implementation is unchanged
    - Confirm template placeholder replacement works correctly
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.2_

  - [ ] 5.2 Verify non-rich-text fields unchanged
    - Confirm all non-rich-text fields render identically to current implementation
    - Confirm section rendering logic unchanged
    - Confirm section click, hover, and scroll behaviors unchanged
    - _Requirements: 12.1, 12.3, 12.4_

  - [ ]* 5.3 Write backward compatibility tests
    - Test stripHtml still used for template interpolation
    - Test non-rich-text fields unchanged
    - Test section behaviors unchanged
    - Test no modifications to TipTap editor or backend
    - _Requirements: 7.1, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check (100+ iterations)
- Unit tests validate specific examples and edge cases
- Integration tests verify all 12 user-authored fields work correctly
- All changes are confined to frontend/src/components/preview/ directory
- No modifications to TipTap editor, backend, or API endpoints
