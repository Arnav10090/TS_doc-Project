# Requirements Document: Add Custom Sections Feature

## Introduction

This document specifies the requirements for adding a comprehensive "Add Custom Sections" feature to the document editor application. The feature enables users to insert custom sections and subsections at specific positions within the document preview, with support for various content types including tables, images, and rich text paragraphs. Custom sections are stored independently from the existing 31 predefined sections and appear only in the preview interface, not in the generated DOCX output.

## Glossary

- **Document_Editor**: The web-based application for creating and editing technical specification documents
- **Custom_Section**: A user-created section with a custom title that can be inserted between existing pages
- **Custom_Subsection**: A user-created subsection under a Custom_Section containing Table, Image, or Paragraph content
- **Page_Break_Area**: The visual separator between document pages in the preview interface
- **Add_Section_Button**: The interactive button displayed in Page_Break_Area for inserting new sections
- **Section_Type_Modal**: The dialog that prompts users to choose between New Section or New Subsection
- **Section_Input_Panel**: The right sidebar panel where users configure section and subsection content
- **Document_Preview**: The center panel displaying the rendered document with all sections
- **Section_Sidebar**: The left sidebar listing all sections including custom sections
- **Predefined_Section**: One of the 31 existing sections (cover, revision_history, etc.)
- **Section_Key**: The unique identifier for a section following the pattern `custom_section_{timestamp}_{uuid}` or `custom_subsection_{timestamp}_{uuid}`
- **Insert_Position**: The location in the document where a Custom_Section is inserted, tracked via `insertAfterKey` field
- **Base64_Image**: An image encoded as a base64 string for storage and rendering
- **Rich_Text_Editor**: A WYSIWYG editor component for creating formatted paragraph content
- **Auto_Save**: The automatic persistence mechanism that saves content changes to the backend
- **Section_Counter**: The sequential numbering system for sections in the document preview
- **Subsection_Counter**: The sequential numbering system for subsections within each section
- **Completion_Percentage**: The calculated metric showing progress on the 27 completable Predefined_Sections (excludes custom sections)

## Requirements

### Requirement 1: Page Break Button Display

**User Story:** As a document editor user, I want to see an "Add New Section" button in the page break area between every two pages, so that I can easily insert custom content at specific positions in my document.

#### Acceptance Criteria

1. WHEN the Document_Preview renders a Page_Break_Area between two pages, THE Document_Editor SHALL display an Add_Section_Button centered in the Page_Break_Area
2. THE Add_Section_Button SHALL display the text "+ Add New Section"
3. WHEN a user hovers over the Add_Section_Button, THE Document_Editor SHALL provide visual feedback (color change or highlight)
4. WHEN the document is in print mode, THE Document_Editor SHALL hide all Add_Section_Button instances
5. THE Add_Section_Button SHALL be positioned between all consecutive pages in the Document_Preview

### Requirement 2: Section Type Selection Modal

**User Story:** As a document editor user, I want to choose between adding a new section or a new subsection, so that I can organize my custom content hierarchically.

#### Acceptance Criteria

1. WHEN a user clicks an Add_Section_Button, THE Document_Editor SHALL display the Section_Type_Modal
2. THE Section_Type_Modal SHALL display the prompt text "What would you like to add?"
3. THE Section_Type_Modal SHALL provide two selectable options: "New Section" and "New Subsection"
4. WHEN a user selects "New Section", THE Document_Editor SHALL close the Section_Type_Modal and initiate the New Section Flow
5. WHEN a user selects "New Subsection", THE Document_Editor SHALL close the Section_Type_Modal and initiate the New Subsection Flow
6. WHEN a user clicks outside the Section_Type_Modal or presses the Escape key, THE Document_Editor SHALL close the Section_Type_Modal without creating content

### Requirement 3: New Section Creation and Rendering

**User Story:** As a document editor user, I want to create a new section with a custom title, so that I can add personalized content to my document.

#### Acceptance Criteria

1. WHEN a user selects "New Section" from the Section_Type_Modal, THE Document_Editor SHALL immediately render a new page in the Document_Preview with "NEW SECTION" placeholder text
2. THE Document_Editor SHALL generate a unique Section_Key following the pattern `custom_section_{timestamp}_{uuid}`
3. THE Document_Editor SHALL store the Insert_Position by recording the `insertAfterKey` field referencing the section immediately before the insertion point
4. THE Document_Editor SHALL calculate and display the correct Section_Counter number for the new Custom_Section (inserting between existing sections renumbers subsequent sections)
5. THE Section_Input_Panel SHALL display a custom section configuration interface with an "Add Section Title" button
6. WHEN a user clicks "Add Section Title", THE Section_Input_Panel SHALL display a text input field for entering the section title
7. WHEN a user enters a title and saves, THE Document_Editor SHALL replace the "NEW SECTION" placeholder with the user-provided title in the Document_Preview
8. THE Document_Editor SHALL persist the Custom_Section data to the backend using the Auto_Save mechanism

### Requirement 4: New Subsection Creation Flow

**User Story:** As a document editor user, I want to add subsections with different content types under my custom sections, so that I can include tables, images, or formatted text in my document.

#### Acceptance Criteria

1. WHEN a user selects "New Subsection" from the Section_Type_Modal, THE Document_Editor SHALL display a subsection configuration modal
2. THE subsection configuration modal SHALL prompt for a subsection name
3. THE subsection configuration modal SHALL provide three content type options: "Table", "Image", and "Paragraph"
4. WHEN a user selects "Table", THE Document_Editor SHALL initiate the Table Subsection Flow
5. WHEN a user selects "Image", THE Document_Editor SHALL initiate the Image Subsection Flow
6. WHEN a user selects "Paragraph", THE Document_Editor SHALL initiate the Paragraph Subsection Flow
7. THE Document_Editor SHALL generate a unique Section_Key following the pattern `custom_subsection_{timestamp}_{uuid}`
8. THE Document_Editor SHALL associate the Custom_Subsection with its parent Custom_Section
9. THE Document_Editor SHALL calculate and display the correct Subsection_Counter number within the parent section

### Requirement 5: Table Subsection Creation

**User Story:** As a document editor user, I want to create table subsections with configurable columns and rows, so that I can present structured data in my custom sections.

#### Acceptance Criteria

1. WHEN a user selects the "Table" content type, THE Section_Input_Panel SHALL display a table configuration interface
2. THE table configuration interface SHALL allow users to define column names and quantities
3. THE table configuration interface SHALL provide controls to add new rows to the table
4. THE table configuration interface SHALL provide controls to edit existing row data
5. WHEN a user saves the table configuration, THE Document_Editor SHALL generate an HTML table representation
6. THE Document_Preview SHALL render the HTML table under the parent Custom_Section with proper formatting
7. THE Document_Editor SHALL persist the table data (column definitions and row data) to the backend

### Requirement 6: Image Subsection Upload and Rendering

**User Story:** As a document editor user, I want to upload images to my custom subsections, so that I can include visual content in my document.

#### Acceptance Criteria

1. WHEN a user selects the "Image" content type, THE Section_Input_Panel SHALL display an image upload interface
2. THE image upload interface SHALL accept PNG and JPG file formats
3. WHEN a user attempts to upload a file larger than 10MB, THE Document_Editor SHALL reject the upload and display an error message
4. WHEN a user uploads a valid image file, THE Document_Editor SHALL convert the image to Base64_Image format
5. THE Document_Editor SHALL store the Base64_Image in the Custom_Subsection content
6. THE Document_Preview SHALL render the uploaded image under the parent Custom_Section
7. THE rendered image SHALL maintain its aspect ratio and fit within the document width constraints

### Requirement 7: Paragraph Subsection Rich Text Editing

**User Story:** As a document editor user, I want to create formatted text paragraphs in my custom subsections, so that I can add descriptive content with styling.

#### Acceptance Criteria

1. WHEN a user selects the "Paragraph" content type, THE Section_Input_Panel SHALL display a Rich_Text_Editor
2. THE Rich_Text_Editor SHALL support basic formatting options (bold, italic, underline, lists)
3. WHEN a user enters and formats text in the Rich_Text_Editor, THE Document_Editor SHALL store the formatted content as HTML
4. THE Document_Preview SHALL render the formatted paragraph content under the parent Custom_Section
5. THE rendered paragraph SHALL preserve all formatting applied in the Rich_Text_Editor
6. THE Document_Editor SHALL persist the HTML content to the backend using the Auto_Save mechanism

### Requirement 8: Custom Section Data Model and Storage

**User Story:** As a system administrator, I want custom sections to be stored with unique identifiers and position tracking, so that the system can maintain document structure integrity.

#### Acceptance Criteria

1. THE Document_Editor SHALL store Custom_Section data with Section_Key following the pattern `custom_section_{timestamp}_{uuid}`
2. THE Document_Editor SHALL store Custom_Subsection data with Section_Key following the pattern `custom_subsection_{timestamp}_{uuid}`
3. WHEN storing a Custom_Section, THE Document_Editor SHALL include an `insertAfterKey` field referencing the section immediately before the insertion point
4. THE backend validation SHALL accept Section_Key values matching the custom section key pattern
5. THE Document_Editor SHALL use the existing `upsertSection` API endpoint for persisting custom section data
6. THE Custom_Section content SHALL include fields for title, subsections array, and metadata
7. THE Custom_Subsection content SHALL include fields for name, content type, and type-specific data (table structure, base64 image, or HTML paragraph)

### Requirement 9: Document Preview Integration and Positioning

**User Story:** As a document editor user, I want my custom sections to appear in the correct position within the document preview, so that I can see how they fit with existing content.

#### Acceptance Criteria

1. WHEN rendering the Document_Preview, THE Document_Editor SHALL insert Custom_Section content at the position specified by the `insertAfterKey` field
2. THE Document_Editor SHALL maintain the sequential Section_Counter numbering across both Predefined_Section and Custom_Section instances
3. WHEN a Custom_Section is inserted between two Predefined_Sections, THE Document_Editor SHALL renumber all subsequent sections
4. THE Document_Preview SHALL render Custom_Subsection content under their parent Custom_Section with correct Subsection_Counter numbering
5. THE Document_Preview SHALL apply consistent styling to Custom_Section headings matching the existing section heading styles
6. THE Document_Preview SHALL apply consistent styling to Custom_Subsection content matching the existing subsection styles

### Requirement 10: Section Sidebar Custom Sections Group

**User Story:** As a document editor user, I want to see all my custom sections listed in the sidebar, so that I can easily navigate to and edit them.

#### Acceptance Criteria

1. THE Section_Sidebar SHALL display a "CUSTOM SECTIONS" group category
2. THE "CUSTOM SECTIONS" group SHALL list all Custom_Section instances created by the user
3. WHEN a user clicks a Custom_Section in the Section_Sidebar, THE Document_Editor SHALL activate that section and display its configuration in the Section_Input_Panel
4. THE Section_Sidebar SHALL display Custom_Section titles (or "NEW SECTION" placeholder if no title is set)
5. THE Section_Sidebar SHALL NOT display completion badges for Custom_Section entries
6. THE "CUSTOM SECTIONS" group SHALL appear after all Predefined_Section groups in the Section_Sidebar

### Requirement 11: Completion Percentage Exclusion

**User Story:** As a document editor user, I want custom sections to not affect my completion percentage, so that my progress tracking remains focused on the required predefined sections.

#### Acceptance Criteria

1. WHEN calculating the Completion_Percentage, THE Document_Editor SHALL exclude all Custom_Section instances from the calculation
2. THE Completion_Percentage SHALL only consider the 27 completable Predefined_Sections (excluding binding_conditions, cybersecurity, disclaimer, and scope_definitions)
3. THE completion count display SHALL show "X / 27 sections complete" regardless of the number of Custom_Sections
4. THE progress bar SHALL reflect only the completion status of Predefined_Sections

### Requirement 12: DOCX Generation Inclusion

**User Story:** As a document editor user, I want custom sections to appear in the generated DOCX file with the same numbering and order as in the preview, so that the official document includes all my custom content.

#### Acceptance Criteria

1. WHEN generating a DOCX document, THE Document_Editor SHALL include all Custom_Section content in the output
2. THE generated DOCX SHALL contain both the 31 Predefined_Sections and all Custom_Sections
3. THE Custom_Sections SHALL appear in the DOCX at the same positions as in the Document_Preview (based on insertAfterKey)
4. THE section numbering in the generated DOCX SHALL match the Document_Preview numbering exactly, including Custom_Sections in the sequence
5. THE Custom_Section titles and subsection content (tables, images, paragraphs) SHALL be rendered in the DOCX with the same formatting as in the preview

### Requirement 13: Print Mode UI Hiding

**User Story:** As a document editor user, I want all interactive UI elements to be hidden when printing the preview, so that I get a clean printed output.

#### Acceptance Criteria

1. WHEN the document enters print mode, THE Document_Editor SHALL hide all Add_Section_Button instances
2. WHEN the document enters print mode, THE Document_Editor SHALL hide the preview toolbar (zoom controls)
3. WHEN the document enters print mode, THE Document_Editor SHALL hide the completion badge
4. WHEN the document enters print mode, THE Document_Editor SHALL hide section hover indicators and click-to-edit prompts
5. THE print output SHALL display only the document content without any interactive UI elements

### Requirement 14: Existing Section Functionality Preservation

**User Story:** As a system maintainer, I want all existing section functionality to remain unchanged, so that the new feature does not introduce regressions.

#### Acceptance Criteria

1. THE Document_Editor SHALL NOT modify the rendering logic for any of the 31 Predefined_Sections
2. THE Document_Editor SHALL NOT modify the data storage or retrieval logic for Predefined_Sections
3. THE Document_Editor SHALL NOT modify the completion tracking logic for Predefined_Sections
4. THE Document_Editor SHALL NOT modify the DOCX generation logic for Predefined_Sections
5. THE existing Auto_Save mechanism SHALL continue to function identically for Predefined_Sections
6. THE existing section navigation and activation logic SHALL continue to function identically for Predefined_Sections

### Requirement 15: Backend Validation Pattern Extension

**User Story:** As a backend developer, I want the section key validation to accept custom section patterns, so that custom sections can be stored using the existing API.

#### Acceptance Criteria

1. THE backend validation SHALL accept Section_Key values matching the pattern `custom_section_{timestamp}_{uuid}`
2. THE backend validation SHALL accept Section_Key values matching the pattern `custom_subsection_{timestamp}_{uuid}`
3. THE backend validation SHALL continue to accept all 31 existing Predefined_Section keys
4. WHEN an invalid Section_Key is provided, THE backend SHALL return a 400 Bad Request error with a descriptive message
5. THE backend SHALL NOT require database schema changes to support custom section keys

### Requirement 16: Inline Styling Consistency

**User Story:** As a frontend developer, I want all new UI components to use inline styles, so that the styling approach remains consistent with the existing codebase.

#### Acceptance Criteria

1. THE Add_Section_Button SHALL use inline styles for all visual properties
2. THE Section_Type_Modal SHALL use inline styles for all visual properties
3. THE custom section configuration interfaces SHALL use inline styles for all visual properties
4. THE rendered Custom_Section and Custom_Subsection content SHALL use inline styles for all visual properties
5. THE Document_Editor SHALL NOT introduce any new CSS classes or Tailwind utility classes for the custom sections feature

### Requirement 17: No External Dependencies

**User Story:** As a project maintainer, I want the custom sections feature to be implemented without adding new NPM packages, so that the dependency footprint remains minimal.

#### Acceptance Criteria

1. THE Document_Editor SHALL implement the custom sections feature using only existing NPM packages
2. THE Rich_Text_Editor SHALL be implemented using an existing editor library already in the project dependencies
3. THE image upload and Base64 conversion SHALL use native browser APIs
4. THE table rendering SHALL use standard HTML table elements without additional libraries
5. THE modal components SHALL be implemented using existing React patterns without additional modal libraries
