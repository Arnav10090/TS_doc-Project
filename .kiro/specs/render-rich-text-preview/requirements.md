# Requirements Document

## Introduction

This document specifies the requirements for rendering rich text formatting correctly in the DocumentPreview component. Currently, the preview strips all HTML tags from TipTap editor output, resulting in plain unformatted text. This feature will enable users to see their rich text formatting (bullet lists, numbered lists, bold, italic, underline) rendered correctly in the Word-like document preview, matching the appearance of the final generated Word document.

## Glossary

- **TipTap_Editor**: The rich text editor component used for user input that outputs HTML strings
- **DocumentPreview**: The React component that displays a Word-like preview of the document
- **RichTextRenderer**: A new component or utility that safely parses and renders HTML as styled JSX
- **stripHtml**: An existing utility function that removes all HTML tags from a string
- **Template_Interpolation**: The process of replacing template placeholders (e.g., `{{SolutionName}}`) with actual values in hardcoded template strings
- **User_Authored_Field**: A rich text field where users enter content using the TipTap editor
- **Template_String**: A hardcoded string containing placeholders that are replaced during template interpolation

## Requirements

### Requirement 1: Safe HTML Parsing and Rendering

**User Story:** As a developer, I want to safely parse TipTap HTML output without using dangerouslySetInnerHTML, so that the application remains secure against XSS attacks.

#### Acceptance Criteria

1. THE RichTextRenderer SHALL parse HTML strings using DOMParser or a React-safe parsing method
2. THE RichTextRenderer SHALL NOT use dangerouslySetInnerHTML anywhere in its implementation
3. WHEN the input HTML is null or empty, THE RichTextRenderer SHALL return null or an empty fragment
4. WHEN the input HTML contains malicious scripts, THE RichTextRenderer SHALL sanitize or ignore them during parsing
5. THE RichTextRenderer SHALL convert parsed HTML nodes into React JSX elements

### Requirement 2: Paragraph Rendering

**User Story:** As a user, I want paragraph tags to render with proper Word document styling, so that the preview matches the final document appearance.

#### Acceptance Criteria

1. WHEN the HTML contains a `<p>` tag, THE RichTextRenderer SHALL render it as a paragraph with bodyParagraphStyle
2. THE RichTextRenderer SHALL apply justified text alignment to paragraphs (matching bodyParagraphStyle)
3. WHEN multiple `<p>` tags are present, THE RichTextRenderer SHALL render each as a separate styled paragraph
4. WHEN a `<p>` tag is empty, THE RichTextRenderer SHALL render it as an empty paragraph element

### Requirement 3: Inline Text Formatting

**User Story:** As a user, I want bold, italic, and underline formatting to display correctly in the preview, so that I can verify my text styling before generating the document.

#### Acceptance Criteria

1. WHEN the HTML contains a `<strong>` tag, THE RichTextRenderer SHALL render the text with fontWeight: 'bold'
2. WHEN the HTML contains an `<em>` tag, THE RichTextRenderer SHALL render the text with fontStyle: 'italic'
3. WHEN the HTML contains a `<u>` tag, THE RichTextRenderer SHALL render the text with textDecoration: 'underline'
4. WHEN multiple inline styles are nested (e.g., `<strong><em>text</em></strong>`), THE RichTextRenderer SHALL apply all styles correctly
5. THE RichTextRenderer SHALL preserve text content exactly as provided within inline formatting tags

### Requirement 4: Bullet List Rendering

**User Story:** As a user, I want bullet lists to render with disc bullets and proper indentation, so that the preview matches Word document list formatting.

#### Acceptance Criteria

1. WHEN the HTML contains a `<ul>` tag, THE RichTextRenderer SHALL render it as a bulleted list
2. WHEN the HTML contains `<li>` tags within a `<ul>`, THE RichTextRenderer SHALL render each as a list item with disc bullet style
3. THE RichTextRenderer SHALL apply 16px left margin to bullet list items (matching listParagraphStyle)
4. THE RichTextRenderer SHALL apply bodyParagraphStyle text properties to bullet list items
5. WHEN a `<li>` contains nested `<p>` tags, THE RichTextRenderer SHALL render the paragraph content within the list item

### Requirement 5: Numbered List Rendering

**User Story:** As a user, I want numbered lists to render with decimal numbering and proper indentation, so that the preview matches Word document list formatting.

#### Acceptance Criteria

1. WHEN the HTML contains an `<ol>` tag, THE RichTextRenderer SHALL render it as a numbered list
2. WHEN the HTML contains `<li>` tags within an `<ol>`, THE RichTextRenderer SHALL render each as a list item with decimal numbering
3. THE RichTextRenderer SHALL apply 16px left margin to numbered list items (matching listParagraphStyle)
4. THE RichTextRenderer SHALL apply bodyParagraphStyle text properties to numbered list items
5. WHEN a `<li>` contains nested `<p>` tags, THE RichTextRenderer SHALL render the paragraph content within the list item

### Requirement 6: Replace stripHtml for User-Authored Fields

**User Story:** As a user, I want my rich text formatting to display in the preview for all user-authored fields, so that I can see exactly how my content will appear in the final document.

#### Acceptance Criteria

1. WHEN rendering executiveSummary.para1, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
2. WHEN rendering processFlow.text, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
3. WHEN rendering overview.system_objective, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
4. WHEN rendering overview.existing_system, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
5. WHEN rendering overview.integration, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
6. WHEN rendering overview.tangible_benefits, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
7. WHEN rendering overview.intangible_benefits, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
8. WHEN rendering remoteSupport.text, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
9. WHEN rendering fatCondition.text, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
10. WHEN rendering valueAddition.text, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
11. WHEN rendering poc.description, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml
12. WHEN rendering features[].description, THE DocumentPreview SHALL use RichTextRenderer instead of stripHtml

### Requirement 7: Preserve stripHtml for Template Interpolation

**User Story:** As a developer, I want stripHtml to remain in use for template string interpolation, so that placeholder replacement continues to work correctly without HTML tags interfering.

#### Acceptance Criteria

1. THE DocumentPreview SHALL continue using stripHtml within the templateReplacements useMemo
2. THE DocumentPreview SHALL NOT modify the stripHtml function implementation
3. WHEN template strings contain placeholders like `{{SolutionName}}`, THE DocumentPreview SHALL use stripped values for replacement
4. THE resolveTemplateText function SHALL continue to receive stripped HTML values from templateReplacements
5. THE stripHtml function SHALL remain unchanged in the codebase

### Requirement 8: Preserve Placeholder Display Logic

**User Story:** As a user, I want to see placeholder text when rich text fields are empty, so that I know which fields still need content.

#### Acceptance Criteria

1. WHEN a user-authored rich text field is empty or null, THE DocumentPreview SHALL display the placeholder text
2. THE DocumentPreview SHALL apply placeholderStyle to empty field placeholders
3. WHEN a user-authored rich text field contains content, THE DocumentPreview SHALL render the content using RichTextRenderer
4. THE placeholder text SHALL match the existing placeholder messages (e.g., "[Enter text]")
5. THE placeholder display logic SHALL work identically to the current implementation

### Requirement 9: Word Document Style Consistency

**User Story:** As a user, I want the rich text preview styling to match the Word document template exactly, so that the preview is an accurate representation of the final output.

#### Acceptance Criteria

1. THE RichTextRenderer SHALL use bodyParagraphStyle for paragraph elements (justified alignment, 8px bottom margin)
2. THE RichTextRenderer SHALL use listParagraphStyle for list items (16px left margin, justified alignment)
3. THE RichTextRenderer SHALL use the document font family (Hitachi Sans with Arial fallback)
4. THE RichTextRenderer SHALL use 11pt font size for body text
5. THE RichTextRenderer SHALL use 1.5 line height for text content
6. THE rendered output SHALL visually match the Word document appearance with no visible HTML tags

### Requirement 10: TipTap HTML Format Support

**User Story:** As a developer, I want the renderer to support all TipTap HTML output formats, so that all editor features work correctly in the preview.

#### Acceptance Criteria

1. THE RichTextRenderer SHALL support TipTap paragraph format: `<p>Some text</p>`
2. THE RichTextRenderer SHALL support TipTap bullet list format: `<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>`
3. THE RichTextRenderer SHALL support TipTap numbered list format: `<ol><li><p>Item 1</p></li><li><p>Item 2</p></li></ol>`
4. THE RichTextRenderer SHALL support TipTap bold format: `<strong>text</strong>`
5. THE RichTextRenderer SHALL support TipTap italic format: `<em>text</em>`
6. THE RichTextRenderer SHALL support TipTap underline format: `<u>text</u>`
7. THE RichTextRenderer SHALL support nested combinations of all supported formats

### Requirement 11: Component Integration

**User Story:** As a developer, I want the RichTextRenderer to integrate seamlessly with the existing DocumentPreview component, so that implementation is straightforward and maintainable.

#### Acceptance Criteria

1. THE RichTextRenderer SHALL accept an HTML string as input via a value or content prop
2. THE RichTextRenderer SHALL accept optional style overrides for customization
3. THE RichTextRenderer SHALL return JSX that can be directly rendered in DocumentPreview
4. THE RichTextRenderer SHALL be implemented as either a separate component file or a utility function within DocumentPreview
5. THE DocumentPreview component SHALL import and use RichTextRenderer for all user-authored rich text fields
6. THE implementation SHALL NOT modify any files outside of frontend/src/components/preview/

### Requirement 12: Backward Compatibility

**User Story:** As a developer, I want the changes to maintain backward compatibility with existing functionality, so that no regressions are introduced.

#### Acceptance Criteria

1. THE DocumentPreview SHALL continue to render all non-rich-text fields identically to the current implementation
2. THE DocumentPreview SHALL continue to use stripHtml for template interpolation in templateReplacements
3. THE DocumentPreview SHALL continue to support all existing section rendering logic
4. THE DocumentPreview SHALL continue to support section click, hover, and scroll behaviors
5. THE implementation SHALL NOT modify the TipTap editor component or its configuration
6. THE implementation SHALL NOT modify any backend files or API endpoints
