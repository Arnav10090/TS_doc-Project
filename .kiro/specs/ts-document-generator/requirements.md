# Requirements Document

## Introduction

The TS Document Generator is a local MVP application for Hitachi India that enables users to create professional Technical Specification documents through a structured form-based interface. The system runs entirely via Docker Compose with no cloud dependencies or authentication requirements. Users fill out 31 sections of structured data and generate a formatted .docx document using a pre-defined Word template with Jinja2 templating.

## Glossary

- **System**: The TS Document Generator application (frontend + backend + database)
- **User**: A Hitachi India employee creating technical specification documents
- **Project**: A container for all section data related to one technical specification document
- **Section**: One of 31 predefined document sections (e.g., Cover, Features, Hardware Specs)
- **Section_Data**: JSON content stored for a specific section within a project
- **Document_Version**: A generated .docx file with version number and timestamp
- **Template**: The Word document file (TS_Template_jinja.docx) with Jinja2 placeholders
- **Auto_Save**: Background persistence of section changes with 800ms debounce
- **Completion_Status**: Boolean indicator whether a section meets required field criteria
- **Locked_Section**: A section with fixed content that cannot be edited by users
- **Solution_Name**: The primary identifier for the technical solution being documented
- **Client_Name**: The customer organization receiving the technical specification
- **Rich_Text_Editor**: Tiptap-based WYSIWYG editor for formatted text input
- **AI_Prompt_Generator**: Service that creates diagram generation prompts for external tools
- **Image_Upload**: File upload mechanism for architecture and Gantt chart diagrams
- **Sidebar**: Fixed left navigation panel showing all 31 sections with completion status
- **Generate_Button**: UI control that triggers document generation and download
- **Validation_Error**: HTTP 422 response listing incomplete required sections
- **Context_Builder**: Backend service that transforms section data into Jinja2 variables
- **Placeholder_Field**: Text input for template variables (e.g., {{TenderReference}})
- **Dynamic_List**: UI component for adding/removing repeating items
- **Editable_Table**: UI component for structured row-based data entry
- **Drag_Drop_Reorder**: UI interaction for changing feature sequence using @dnd-kit
- **Version_Number**: Integer incremented with each document generation
- **Database**: PostgreSQL 15 instance storing projects, sections, and versions
- **Backend**: FastAPI Python application providing REST API
- **Frontend**: React 18 TypeScript SPA with Vite build system
- **Docker_Compose**: Orchestration system running all three services locally
- **Zustand_Store**: Frontend state management for project data and UI state
- **Hitachi_Branding**: Color scheme and typography using Hitachi red (#E60012) and IBM Plex Sans


## Requirements

### Requirement 1: Project Management

**User Story:** As a User, I want to create and manage technical specification projects, so that I can organize document data by client and solution.

#### Acceptance Criteria

1. WHEN a User submits a new project form with solution_name, solution_full_name, client_name, and client_location, THE System SHALL create a Project record with a unique UUID identifier
2. THE System SHALL display all existing Projects in a list view showing solution name, client name, client location, creation date, and completion percentage
3. WHEN a User requests project details, THE System SHALL return the Project record with completion_summary showing total sections, completed sections, and percentage
4. WHEN a User updates project global fields, THE System SHALL persist changes to solution_name, solution_full_name, solution_abbreviation, client_name, client_location, client_abbreviation, ref_number, doc_date, or doc_version
5. WHEN a User deletes a Project, THE System SHALL remove the Project record and all associated Section_Data and Document_Version records
6. THE System SHALL set created_at timestamp to current UTC time when creating a Project
7. THE System SHALL update updated_at timestamp to current UTC time when modifying a Project


### Requirement 2: Section Data Persistence

**User Story:** As a User, I want my section edits to save automatically, so that I never lose work due to browser crashes or navigation.

#### Acceptance Criteria

1. WHEN a User modifies section content, THE System SHALL debounce save requests with 800ms delay
2. WHEN the debounce timer expires, THE System SHALL upsert Section_Data with project_id, section_key, and content JSON
3. THE System SHALL enforce unique constraint on (project_id, section_key) pairs
4. WHEN a User opens a section for the first time, THE System SHALL create a Section_Data record with empty content object to mark it as visited
5. THE System SHALL update Section_Data.updated_at timestamp to current UTC time on every save
6. WHEN a User requests section data, THE System SHALL return the content JSON or empty object if no record exists
7. THE System SHALL return all Section_Data records for a Project when requested via bulk endpoint


### Requirement 3: Completion Tracking

**User Story:** As a User, I want to see which sections are complete, so that I know what remains before generating the document.

#### Acceptance Criteria

1. WHEN a User requests Project details, THE System SHALL calculate completion status for all 31 sections based on required field rules
2. FOR section "cover", THE System SHALL mark complete when solution_full_name, client_name, and client_location are non-empty
3. FOR section "revision_history", THE System SHALL mark complete when at least one row has non-empty details field
4. FOR section "executive_summary", THE System SHALL mark complete when para1 contains text after HTML tag stripping
5. FOR section "introduction", THE System SHALL mark complete when tender_reference and tender_date are both non-empty
6. FOR section "abbreviations", THE System SHALL mark complete when row 13 abbreviation field is non-empty
7. FOR section "process_flow", THE System SHALL mark complete when text field contains content after HTML stripping
8. FOR section "overview", THE System SHALL mark complete when system_objective and existing_system are both non-empty
9. FOR section "features", THE System SHALL mark complete when at least one item has non-empty title and description
10. FOR section "remote_support", THE System SHALL mark complete when text field is non-empty
11. FOR section "documentation_control", THE System SHALL mark complete when Section_Data record exists
12. FOR section "customer_training", THE System SHALL mark complete when persons and days fields are both non-empty
13. FOR section "system_config", THE System SHALL mark complete when Section_Data record exists
14. FOR section "fat_condition", THE System SHALL mark complete when text field is non-empty
15. FOR section "tech_stack", THE System SHALL mark complete when first row has non-empty component and technology
16. FOR section "hardware_specs", THE System SHALL mark complete when first row has non-empty specs_line1 and maker
17. FOR section "software_specs", THE System SHALL mark complete when first row has non-empty name field
18. FOR section "third_party_sw", THE System SHALL mark complete when sw4_name is non-empty
19. FOR sections "overall_gantt" and "shutdown_gantt", THE System SHALL mark complete when Section_Data record exists
20. FOR section "supervisors", THE System SHALL mark complete when pm_days, dev_days, comm_days, and total_man_days are all non-empty
21. FOR sections "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations", "exclusion_list", "binding_conditions", "cybersecurity", and "disclaimer", THE System SHALL mark complete when Section_Data record exists
22. FOR section "value_addition", THE System SHALL mark complete when text field is non-empty
23. FOR section "buyer_prerequisites", THE System SHALL mark complete when at least one item is non-empty
24. FOR section "poc", THE System SHALL mark complete when name and description are both non-empty
25. THE System SHALL return completion_summary with total count of 27 completable sections, completed count, and percentage
26. THE 27 completable section count SHALL exclude 4 sections that auto-complete on first visit with no user input required: binding_conditions, cybersecurity, and disclaimer are locked sections that auto-complete, and scope_definitions auto-fills from project data
27. THE System SHALL return section_completion map with boolean completion status for each section key


### Requirement 4: Document Generation

**User Story:** As a User, I want to generate a formatted Word document from my project data, so that I can deliver professional technical specifications to clients.

#### Acceptance Criteria

1. WHEN a User requests document generation, THE System SHALL validate all required sections are complete
2. IF any required section is incomplete, THE System SHALL return HTTP 422 with list of missing section keys
3. WHEN all required sections are complete, THE System SHALL load all Section_Data records for the Project
4. THE System SHALL build a Jinja2 context dictionary mapping template variables to section content
5. THE System SHALL load the Template file from configured path
6. THE System SHALL render the Template with the context dictionary using docxtpl library
7. THE System SHALL query maximum version_number for the Project from Document_Version table
8. IF no versions exist, THE System SHALL set version_number to 1
9. IF versions exist, THE System SHALL set version_number to maximum plus 1
10. THE System SHALL generate filename as "TS_{client_name}_{solution_name}_v{version_number}.docx" with spaces replaced by underscores
11. THE System SHALL save the rendered document to uploads/versions/{project_id}/ directory
12. THE System SHALL create a Document_Version record with project_id, version_number, filename, file_path, and created_at timestamp
13. THE System SHALL return the document file as HTTP response with Content-Type "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
14. THE System SHALL set Content-Disposition header to "attachment; filename={filename}"
15. WHEN a User requests version history, THE System SHALL return all Document_Version records for the Project ordered by version_number descending
16. WHEN a User requests a specific version download, THE System SHALL return the file from the stored file_path


### Requirement 5: Context Builder

**User Story:** As a System, I want to transform section data into template variables, so that the Word template renders correctly with all user content.

#### Acceptance Criteria

1. THE Context_Builder SHALL map Project.solution_name to context variable "SolutionName"
2. THE Context_Builder SHALL map Project.solution_full_name to context variable "SolutionFullName"
3. THE Context_Builder SHALL map Project.solution_abbreviation to context variable "SolutionAbbreviation"
4. THE Context_Builder SHALL map Project.client_name to context variable "ClientName"
5. THE Context_Builder SHALL map Project.client_location to context variable "ClientLocation"
6. THE Context_Builder SHALL map Project.client_abbreviation to context variable "ClientAbbreviation"
7. THE Context_Builder SHALL map Project.ref_number to context variable "RefNumber"
8. THE Context_Builder SHALL map Project.doc_date to context variable "DocDate"
9. THE Context_Builder SHALL map Project.doc_version to context variable "DocVersion"
10. THE Context_Builder SHALL map executive_summary.para1 to context variable "ExecutiveSummaryPara1"
11. THE Context_Builder SHALL map introduction.tender_reference to context variable "TenderReference"
12. THE Context_Builder SHALL map introduction.tender_date to context variable "TenderDate"
13. THE Context_Builder SHALL map abbreviations.rows array to context variable "abbreviation_rows"
14. THE Context_Builder SHALL map process_flow.text to context variable "ProcessFlowDescription"
15. THE Context_Builder SHALL map overview.system_objective to context variable "SystemObjective"
16. THE Context_Builder SHALL map overview.existing_system to context variable "ExistingSystemDescription"
17. THE Context_Builder SHALL map overview.integration to context variable "IntegrationDescription"
18. THE Context_Builder SHALL map overview.tangible_benefits to context variable "TangibleBenefits"
19. THE Context_Builder SHALL map overview.intangible_benefits to context variable "IntangibleBenefits"
20. THE Context_Builder SHALL map features.items array to context variable "features"
21. THE Context_Builder SHALL map remote_support.text to context variable "RemoteSupportText"
22. THE Context_Builder SHALL map documentation_control.custom_items to context variable "doc_control_custom"
23. THE Context_Builder SHALL map customer_training.persons to context variable "TrainingPersons"
24. THE Context_Builder SHALL map customer_training.days to context variable "TrainingDays"
25. THE Context_Builder SHALL map fat_condition.text to context variable "FATCondition"
26. THE Context_Builder SHALL pad tech_stack.rows array to 6 elements with empty objects containing component and technology fields if fewer exist
27. THE Context_Builder SHALL map padded tech_stack.rows to context variable "ts_rows"
28. THE Context_Builder SHALL pad hardware_specs.rows array to 6 elements with empty objects containing specs_line1, specs_line2, specs_line3, specs_line4, maker, and qty fields if fewer exist
29. THE Context_Builder SHALL map padded hardware_specs.rows to context variable "hw_rows"
30. THE Context_Builder SHALL pad software_specs.rows array to 9 elements with empty objects containing name and maker fields with maker defaulting to "-" if fewer exist
31. THE Context_Builder SHALL map padded software_specs.rows to context variable "sw_rows"
32. THE Context_Builder SHALL map third_party_sw.sw4_name to context variable "ThirdPartySW"
33. THE Context_Builder SHALL map supervisors.pm_days to context variable "PMDays"
34. THE Context_Builder SHALL map supervisors.dev_days to context variable "DevDays"
35. THE Context_Builder SHALL map supervisors.comm_days to context variable "CommDays"
36. THE Context_Builder SHALL map supervisors.total_man_days to context variable "TotalManDays"
37. THE Context_Builder SHALL map value_addition.text to context variable "ValueAddedOfferings"
38. THE Context_Builder SHALL map work_completion.custom_items to context variable "work_completion_custom"
39. THE Context_Builder SHALL map buyer_obligations.custom_items to context variable "buyer_obligations_custom"
40. THE Context_Builder SHALL map exclusion_list.custom_items to context variable "exclusion_custom"
41. THE Context_Builder SHALL map buyer_prerequisites.items to context variable "buyer_prereqs"
42. THE Context_Builder SHALL map poc.name to context variable "POCName"
43. THE Context_Builder SHALL map poc.description to context variable "POCDescription"
44. FOR ALL missing section data, THE Context_Builder SHALL use empty string as default value
45. FOR ALL missing array elements, THE Context_Builder SHALL use empty object with appropriate default fields
46. THE Context_Builder SHALL use helper function s(key) to safely retrieve section content with fallback to empty dict
47. THE Context_Builder SHALL accept parameters: project object, all_sections dict, template DocxTemplate object, and upload_dir string


### Requirement 6: Image Upload and Management

**User Story:** As a User, I want to upload architecture and Gantt chart diagrams, so that my generated document includes visual representations of the system.

#### Acceptance Criteria

1. WHEN a User uploads an image file, THE System SHALL validate the file is PNG or JPG format
2. WHEN a User uploads an image file, THE System SHALL validate the file size does not exceed 10MB
3. IF validation fails, THE System SHALL return HTTP 400 with descriptive error message
4. WHEN validation succeeds, THE System SHALL save the file to uploads/images/{project_id}/{image_type}.png
5. IF a file already exists at that path, THE System SHALL overwrite it with the new upload
6. THE System SHALL return JSON response with url field containing "http://localhost:8000/uploads/images/{project_id}/{image_type}.png"
7. THE System SHALL support image_type values: "architecture", "gantt_overall", "gantt_shutdown"
8. WHEN a User requests image list for a Project, THE System SHALL return array of uploaded images with type and url
9. WHEN a User deletes an image, THE System SHALL remove the file from disk and return HTTP 204
10. WHEN Context_Builder processes system_config section, THE System SHALL check if uploads/images/{project_id}/architecture.png exists
11. IF architecture image exists, THE Context_Builder SHALL create InlineImage object with 15cm width
12. IF architecture image does not exist, THE Context_Builder SHALL use placeholder text "[Architecture Diagram — To Be Inserted]"
13. WHEN Context_Builder processes overall_gantt section, THE System SHALL check if uploads/images/{project_id}/gantt_overall.png exists
14. IF overall_gantt image exists, THE Context_Builder SHALL create InlineImage object with 15cm width
15. IF overall_gantt image does not exist, THE Context_Builder SHALL use placeholder text "[Overall Gantt Chart — To Be Inserted]"
16. WHEN Context_Builder processes shutdown_gantt section, THE System SHALL check if uploads/images/{project_id}/gantt_shutdown.png exists
17. IF shutdown_gantt image exists, THE Context_Builder SHALL create InlineImage object with 15cm width
18. IF shutdown_gantt image does not exist, THE Context_Builder SHALL use placeholder text "[Shutdown Gantt Chart — To Be Inserted]"


### Requirement 7: AI Prompt Generation

**User Story:** As a User, I want AI-generated prompts for creating diagrams, so that I can quickly produce professional visuals using external tools.

#### Acceptance Criteria

1. WHEN a User requests an architecture prompt, THE System SHALL load Project details and tech_stack section data
2. THE System SHALL generate a prompt describing the system architecture including solution name, client name, and technology stack components
3. THE architecture prompt SHALL include requirements for L1/L2/L3 layers, application server, database server, HMI interfaces, mobile devices, network boundaries, and data flow arrows
4. THE System SHALL return the prompt text and a list of recommended tools with name, url, and note fields
5. THE recommended tools for architecture SHALL include Eraser.io, Claude.ai, Mermaid Live Editor, and Draw.io
6. WHEN a User requests an overall_gantt prompt, THE System SHALL load Project details and supervisors section data
7. THE System SHALL generate a prompt describing project phases including kickoff, design, development, FAT, commissioning, training, and go-live
8. THE overall_gantt prompt SHALL include PM days, dev days, and comm days from supervisors section
9. THE recommended tools for overall_gantt SHALL include Claude.ai, Mermaid Live Editor, and Tom's Planner
10. WHEN a User requests a shutdown_gantt prompt, THE System SHALL load Project details
11. THE System SHALL generate a prompt describing commissioning activities over 14 days including preparation, installation, deployment, testing, training, parallel run, and go-live
12. THE recommended tools for shutdown_gantt SHALL include Claude.ai, Mermaid Live Editor, and Tom's Planner
13. FOR ALL prompt types, THE System SHALL include style requirements specifying clean professional appearance, white background, labeled components, and PNG export at minimum 1920x1080px


### Requirement 8: Frontend State Management

**User Story:** As a User, I want the solution name to update everywhere instantly when I change it, so that I see consistent information across all sections.

#### Acceptance Criteria

1. THE Frontend SHALL maintain a Zustand_Store with projectId, solutionName, solutionFullName, clientName, clientLocation, and sectionCompletion fields
2. WHEN a User loads a Project, THE Frontend SHALL populate the Zustand_Store with Project data from the API
3. WHEN a User updates solution_name in the cover section, THE Frontend SHALL call setSolutionName action to update the store
4. THE Frontend SHALL re-render all components reading solutionName from the store within 100ms of store update
5. THE Frontend SHALL display solutionName in section titles, table row labels, preview text, and locked section bodies
6. WHEN a User saves the cover section, THE Frontend SHALL call PATCH /api/v1/projects/{id} to persist global fields
7. THE Frontend SHALL update sectionCompletion map when receiving Project details from the API
8. THE Frontend SHALL provide setSectionComplete action to update individual section completion status
9. THE Frontend SHALL provide clearProject action to reset store state when navigating away from a Project


### Requirement 9: Auto-Save Functionality

**User Story:** As a User, I want my edits to save automatically without blocking my work, so that I can focus on content creation without worrying about manual saves.

#### Acceptance Criteria

1. THE Frontend SHALL implement useAutoSave hook accepting projectId, sectionKey, and delay parameters
2. THE useAutoSave hook SHALL default delay to 800ms
3. WHEN a User modifies section content, THE Frontend SHALL call the save function from useAutoSave
4. THE save function SHALL clear any existing debounce timer
5. THE save function SHALL set status to "saving"
6. THE save function SHALL start a new timer with the configured delay
7. WHEN the timer expires, THE Frontend SHALL call PUT /api/v1/projects/{projectId}/sections/{sectionKey} with content JSON
8. IF the API call succeeds, THE Frontend SHALL set status to "saved"
9. WHEN status is "saved", THE Frontend SHALL reset status to "idle" after 2000ms
10. IF the API call fails, THE Frontend SHALL set status to "error"
11. THE Frontend SHALL display save status indicator showing "Saved ✓" in green when status is "saved"
12. THE Frontend SHALL display save status indicator showing "Saving..." in grey when status is "saving"
13. THE Frontend SHALL display save status indicator showing "Error saving" in red when status is "error"
14. THE Auto_Save process SHALL NOT disable input fields or show blocking loading spinners


### Requirement 10: Section Sidebar Navigation

**User Story:** As a User, I want to see all sections with their completion status in a sidebar, so that I can navigate efficiently and track my progress.

#### Acceptance Criteria

1. THE Frontend SHALL display a Sidebar component fixed to the left side with 260px width
2. THE Sidebar SHALL be independently scrollable with overflow-y: auto to handle all 31 sections on small screens
3. THE Sidebar SHALL group sections into categories: "COVER & HISTORY", "GENERAL OVERVIEW", "OFFERINGS", "TECHNOLOGY STACK", "SCHEDULE", "SCOPE OF SUPPLY", and "LEGAL"
4. THE Sidebar SHALL display all 31 sections with their display names
5. FOR EACH section entry, THE Sidebar SHALL show a completion badge
6. THE completion badge SHALL display ✅ when section is complete
7. THE completion badge SHALL display 🟡 when section is visited but incomplete
8. THE completion badge SHALL display ⚪ when section is not started
9. FOR locked sections, THE Sidebar SHALL display 🔒 icon next to the section name
10. WHEN a User clicks a section entry, THE Frontend SHALL render that section component in the main content area
11. THE Sidebar SHALL highlight the currently active section with left red border and light red background
12. THE Sidebar SHALL display progress indicator at the top showing "X / 27 sections complete"
13. THE progress indicator SHALL count only the 27 completable sections excluding the 4 auto-complete locked sections (binding_conditions, cybersecurity, disclaimer, scope_definitions)
14. THE Sidebar SHALL display a thin red progress bar showing completion percentage
15. THE Sidebar SHALL display Generate_Button at the bottom
16. WHEN a User clicks Generate_Button, THE Frontend SHALL call POST /api/v1/projects/{id}/generate
17. IF generation fails with HTTP 422, THE Frontend SHALL display list of missing sections as clickable links
18. WHEN a User clicks a missing section link, THE Frontend SHALL navigate to that section in the Sidebar


### Requirement 11: Home Page and Project List

**User Story:** As a User, I want to see all my projects on the home page, so that I can quickly access existing work or create new projects.

#### Acceptance Criteria

1. THE Frontend SHALL display the home page at route "/"
2. THE home page SHALL display "HITACHI" wordmark in Hitachi red color #E60012
3. THE home page SHALL display "Technical Specification Generator" subtitle below the wordmark
4. THE home page SHALL display "New Project" button in the top right corner styled with red background
5. WHEN a User clicks "New Project" button, THE Frontend SHALL open NewProjectModal component
6. THE home page SHALL display all Projects in a grid or table layout
7. FOR EACH Project, THE home page SHALL display solution name in bold text
8. FOR EACH Project, THE home page SHALL display client name and client location
9. FOR EACH Project, THE home page SHALL display creation date formatted as "DD MMM YYYY"
10. FOR EACH Project, THE home page SHALL display completion badge showing "X / 27 sections" with percentage
11. FOR EACH Project, THE home page SHALL display "Open →" button
12. WHEN a User clicks "Open →" button, THE Frontend SHALL navigate to "/editor/{project_id}"
13. FOR EACH Project with existing versions, THE home page SHALL display "Download Latest" button
14. WHEN a User clicks "Download Latest" button, THE Frontend SHALL download the most recent Document_Version
15. FOR EACH Project, THE home page SHALL display "Delete" button
16. WHEN a User clicks "Delete" button, THE Frontend SHALL show confirmation dialog
17. WHEN a User confirms deletion, THE Frontend SHALL call DELETE /api/v1/projects/{id}
18. IF no Projects exist, THE home page SHALL display centered message "No projects yet. Create your first TS document."
19. IF no Projects exist, THE home page SHALL display large "New Project" button in the center


### Requirement 12: New Project Modal

**User Story:** As a User, I want to fill out a form to create a new project, so that I can start documenting a technical specification.

#### Acceptance Criteria

1. THE NewProjectModal SHALL display as an overlay dialog when opened
2. THE NewProjectModal SHALL display text input for "Solution Name" marked as required
3. THE NewProjectModal SHALL display text input for "Solution Full Name" marked as required
4. THE NewProjectModal SHALL display text input for "Solution Abbreviation" marked as optional
5. THE NewProjectModal SHALL display text input for "Client Name" marked as required
6. THE NewProjectModal SHALL display text input for "Client Location" marked as required
7. THE NewProjectModal SHALL display text input for "Client Abbreviation" marked as optional
8. THE NewProjectModal SHALL display text input for "Reference Number" marked as optional
9. THE NewProjectModal SHALL display text input for "Document Date" marked as optional
10. THE NewProjectModal SHALL display text input for "Document Version" with default value "0"
11. THE NewProjectModal SHALL display "Create Project" button
12. THE NewProjectModal SHALL disable "Create Project" button when required fields are empty
13. WHEN a User clicks "Create Project" button, THE Frontend SHALL call POST /api/v1/projects with form data
14. WHEN project creation succeeds, THE Frontend SHALL navigate to "/editor/{new_project_id}"
15. THE NewProjectModal SHALL display "Cancel" button
16. WHEN a User clicks "Cancel" button, THE Frontend SHALL close the modal without creating a project
17. WHEN a User clicks outside the modal overlay, THE Frontend SHALL close the modal without creating a project
18. WHEN a User presses the Escape key, THE Frontend SHALL close the modal without creating a project


### Requirement 13: Cover Section

**User Story:** As a User, I want to edit cover page fields, so that the document has correct title and metadata.

#### Acceptance Criteria

1. THE Cover Section SHALL display text input for "Solution Full Name" marked as required
2. THE Cover Section SHALL display text input for "Client Name" marked as required
3. THE Cover Section SHALL display text input for "Client Location" marked as required
4. THE Cover Section SHALL display text input for "Reference Number" marked as optional
5. THE Cover Section SHALL display text input for "Document Date" marked as optional
6. THE Cover Section SHALL display text input for "Document Version" marked as optional
7. THE Cover Section SHALL display visual preview of cover layout showing resolved field values
8. WHEN a User modifies any field, THE Frontend SHALL call useAutoSave to persist changes
9. WHEN a User saves the Cover Section, THE Frontend SHALL call PATCH /api/v1/projects/{id} to update Project record
10. THE Cover Section SHALL mark as complete when solution_full_name, client_name, and client_location are all non-empty


### Requirement 14: Revision History Section

**User Story:** As a User, I want to manage revision history rows, so that the document tracks all changes and approvals.

#### Acceptance Criteria

1. THE Revision History Section SHALL display an Editable_Table with columns: sr_no, revised_by, checked_by, approved_by, details, date, rev_no
2. THE Revision History Section SHALL initialize with one default row: sr_no=1, details="First issue", date="23-01-2026", rev_no="0"
3. THE Revision History Section SHALL display "Add Row" button below the table
4. WHEN a User clicks "Add Row" button, THE Frontend SHALL append a blank row to the table
5. FOR EACH row except the first, THE Revision History Section SHALL display delete ✕ button
6. WHEN a User clicks delete button, THE Frontend SHALL remove that row from the table
7. FOR ALL cells, THE Revision History Section SHALL provide text input fields
8. WHEN a User modifies any cell, THE Frontend SHALL call useAutoSave to persist the rows array
9. THE Revision History Section SHALL mark as complete when at least one row has non-empty details field


### Requirement 15: Executive Summary Section

**User Story:** As a User, I want to write a project-specific summary paragraph, so that the document provides context for the technical specification.

#### Acceptance Criteria

1. THE Executive Summary Section SHALL display Hitachi boilerplate opening text as read-only locked block
2. THE Executive Summary Section SHALL display client logos table as read-only locked block
3. THE Executive Summary Section SHALL display Rich_Text_Editor labeled "Project-specific summary paragraph"
4. THE Rich_Text_Editor SHALL support bold, italic, underline, bullet lists, and numbered lists
5. WHEN a User modifies the rich text content, THE Frontend SHALL call useAutoSave to persist para1 field as HTML
6. THE Executive Summary Section SHALL mark as complete when para1 contains text after HTML tag stripping


### Requirement 16: Introduction Section

**User Story:** As a User, I want to fill in tender reference and date placeholders, so that the introduction paragraph is complete.

#### Acceptance Criteria

1. THE Introduction Section SHALL display the full introduction paragraph text as read-only block
2. THE Introduction Section SHALL highlight {{TenderReference}} and {{TenderDate}} placeholders in the read-only text
3. THE Introduction Section SHALL display text input labeled "Tender Reference Number"
4. THE Introduction Section SHALL display text input labeled "Tender Date"
5. WHEN a User modifies either field, THE Frontend SHALL call useAutoSave to persist tender_reference and tender_date
6. THE Introduction Section SHALL mark as complete when both tender_reference and tender_date are non-empty


### Requirement 17: Abbreviations Section

**User Story:** As a User, I want to manage abbreviations with some locked standard entries, so that the document includes both standard and project-specific terms.

#### Acceptance Criteria

1. THE Abbreviations Section SHALL display an Editable_Table with columns: sr_no, abbreviation, description, locked
2. THE Abbreviations Section SHALL initialize with 14 default rows including standard abbreviations
3. FOR rows with locked=true, THE Abbreviations Section SHALL display 🔒 icon and grey background
4. FOR rows with locked=true, THE Abbreviations Section SHALL disable editing of abbreviation and description fields
5. FOR row 13, THE Abbreviations Section SHALL auto-fill abbreviation field from Project.solution_abbreviation
6. FOR row 13, THE Abbreviations Section SHALL display description as editable text input with default "Plate Mill Yard Management System"
7. THE Abbreviations Section SHALL display "Add Row" button below the table
8. WHEN a User clicks "Add Row" button, THE Frontend SHALL append a new editable row below row 14
9. FOR editable rows, THE Abbreviations Section SHALL provide text inputs for abbreviation and description
10. FOR editable rows added by user, THE Abbreviations Section SHALL display delete ✕ button
11. WHEN a User modifies any editable cell, THE Frontend SHALL call useAutoSave to persist the rows array
12. THE Abbreviations Section SHALL mark as complete when row 13 abbreviation field is non-empty


### Requirement 18: Process Flow Section

**User Story:** As a User, I want to write a process flow description with formatting, so that the document explains the operational workflow.

#### Acceptance Criteria

1. THE Process Flow Section SHALL display a Rich_Text_Editor with full toolbar
2. THE Rich_Text_Editor SHALL support bold, italic, underline, bullet lists, numbered lists, and clear formatting
3. WHEN a User modifies the rich text content, THE Frontend SHALL call useAutoSave to persist text field as HTML
4. THE Process Flow Section SHALL mark as complete when text field contains content after HTML tag stripping


### Requirement 19: Overview Section

**User Story:** As a User, I want to document system objectives, existing systems, integration, and benefits, so that the document provides comprehensive context.

#### Acceptance Criteria

1. THE Overview Section SHALL display section title as "Overview of {solutionName}" using value from Zustand_Store
2. THE Overview Section SHALL display Rich_Text_Editor labeled "System Objective"
3. THE Overview Section SHALL display Rich_Text_Editor labeled "Existing System Description"
4. THE Overview Section SHALL display Rich_Text_Editor labeled "Integration Description"
5. THE Overview Section SHALL display Rich_Text_Editor labeled "Tangible Benefits"
6. THE Overview Section SHALL display Rich_Text_Editor labeled "Intangible Benefits"
7. FOR ALL five editors, THE Frontend SHALL support bold, italic, underline, bullet lists, and numbered lists
8. WHEN a User modifies any editor, THE Frontend SHALL call useAutoSave to persist system_objective, existing_system, integration, tangible_benefits, and intangible_benefits fields
9. THE Overview Section SHALL mark as complete when system_objective and existing_system are both non-empty after HTML stripping


### Requirement 20: Features Section

**User Story:** As a User, I want to add and reorder feature cards with title, brief, and description, so that the document lists all solution capabilities.

#### Acceptance Criteria

1. THE Features Section SHALL display a Dynamic_List of feature cards
2. EACH feature card SHALL display text input for "Title" marked as required
3. EACH feature card SHALL display text input for "Brief" with 150 character maximum and character counter
4. EACH feature card SHALL display Rich_Text_Editor for "Description"
5. EACH feature card SHALL display drag handle ⠿ icon on the left side
6. EACH feature card SHALL be collapsible showing title when collapsed
7. EACH feature card SHALL display auto-generated label "Feature 1", "Feature 2", etc. based on position
8. THE Features Section SHALL display "Add Feature" button below all cards
9. WHEN a User clicks "Add Feature" button, THE Frontend SHALL append a blank feature card
10. EACH feature card SHALL display "Remove Feature" button
11. THE "Remove Feature" button SHALL be disabled when only one feature card exists
12. WHEN a User clicks "Remove Feature" button, THE Frontend SHALL remove that card from the list
13. WHEN a User drags a feature card, THE Frontend SHALL reorder the cards using @dnd-kit/sortable
14. WHEN a User modifies any feature field, THE Frontend SHALL call useAutoSave to persist items array with id, title, brief, and description
15. THE Features Section SHALL mark as complete when at least one item has non-empty title and description


### Requirement 21: Remote Support Section

**User Story:** As a User, I want to edit the remote support terms, so that the document reflects the support agreement.

#### Acceptance Criteria

1. THE Remote Support Section SHALL display a Rich_Text_Editor with full toolbar
2. THE Remote Support Section SHALL pre-populate with default text on first open: "SELLER will provide complimentary remote maintenance support for troubleshooting and issue resolution (if any) for a period of 6 months from the date of completion of project. Necessary infrastructure and network configuration will have to be enabled by BUYER to facilitate this. Remote maintenance support will be limited to scope of supply of this proposal. Also, access to remote terminal should be made available to SELLER as per requirement. Dedicated Internet/Lease line at site to be arranged by BUYER. The effective working hours at SELLER's Office shall be from 9:00 AM to 5:00 PM IST (Monday to Friday), excluding National Holidays. NON-DISCLOSURE AGREEMENT (NDA) will be signed between BUYER and SELLER before starting the remote support."
3. WHEN a User modifies the rich text content, THE Frontend SHALL call useAutoSave to persist text field as HTML
4. THE Remote Support Section SHALL mark as complete when text field is non-empty after HTML stripping


### Requirement 22: Documentation Control Section

**User Story:** As a User, I want to manage documentation deliverables with standard and custom items, so that the document lists all required documentation.

#### Acceptance Criteria

1. THE Documentation Control Section SHALL display four locked standard items with 🔒 icon: "Screen Design Document", "Hardware Specifications", "Software specifications", "Operation Manual"
2. THE locked items SHALL have grey background and be non-editable
3. THE Documentation Control Section SHALL display a Dynamic_List of custom items below the locked items
4. EACH custom item SHALL be a text input field
5. THE Documentation Control Section SHALL display "Add Item" button
6. WHEN a User clicks "Add Item" button, THE Frontend SHALL append a blank text input to custom_items array
7. EACH custom item SHALL display delete ✕ button
8. WHEN a User clicks delete button, THE Frontend SHALL remove that item from custom_items array
9. WHEN a User modifies any custom item, THE Frontend SHALL call useAutoSave to persist custom_items array
10. THE Documentation Control Section SHALL mark as complete when Section_Data record exists


### Requirement 23: Customer Training Section

**User Story:** As a User, I want to specify training persons and days, so that the document includes training commitments.

#### Acceptance Criteria

1. THE Customer Training Section SHALL display number input labeled "Number of persons to be trained" with minimum value 1
2. THE Customer Training Section SHALL display number input labeled "Number of training days" with minimum value 1
3. THE Customer Training Section SHALL display preview text: "SELLER shall provide training at site during commissioning to a maximum of [persons] people for a maximum of [days] days."
4. THE preview text SHALL update in real-time as User modifies the number inputs
5. WHEN a User modifies either field, THE Frontend SHALL call useAutoSave to persist persons and days
6. THE Customer Training Section SHALL mark as complete when both persons and days are non-empty


### Requirement 24: System Configuration Section (Architecture Diagram)

**User Story:** As a User, I want to generate an AI prompt and upload an architecture diagram, so that the document includes a visual system design.

#### Acceptance Criteria

1. THE System Configuration Section SHALL display "Generate AI Prompt" button
2. WHEN a User clicks "Generate AI Prompt" button, THE Frontend SHALL call POST /api/v1/projects/{id}/ai-prompt/architecture
3. WHEN the API returns the prompt, THE Frontend SHALL open AiPromptModal component
4. THE AiPromptModal SHALL display the prompt text in a scrollable read-only textarea
5. THE AiPromptModal SHALL display "Copy Prompt" button
6. WHEN a User clicks "Copy Prompt" button, THE Frontend SHALL copy the prompt text to clipboard
7. THE AiPromptModal SHALL display "Recommended Free Tools" section with clickable links to Eraser.io, Claude.ai, Mermaid Live Editor, and Draw.io
8. THE AiPromptModal SHALL display step-by-step instructions: "1. Copy the prompt above → 2. Open any tool and paste → 3. Export diagram as PNG → 4. Upload below"
9. THE System Configuration Section SHALL display image upload zone using react-dropzone
10. THE upload zone SHALL accept PNG and JPG files with maximum size 10MB
11. WHEN a User drops or selects a file, THE Frontend SHALL call POST /api/v1/projects/{id}/images/architecture
12. WHEN upload succeeds, THE System Configuration Section SHALL display thumbnail of the uploaded image
13. THE thumbnail SHALL display "Change" button to upload a different image
14. THE thumbnail SHALL display "Remove" button to delete the image
15. WHEN a User clicks "Remove" button, THE Frontend SHALL call DELETE /api/v1/projects/{id}/images/architecture
16. THE System Configuration Section SHALL mark as complete when Section_Data record exists regardless of image upload status


### Requirement 25: FAT Condition Section

**User Story:** As a User, I want to document Factory Acceptance Test conditions, so that the document specifies testing requirements.

#### Acceptance Criteria

1. THE FAT Condition Section SHALL display a Rich_Text_Editor with full toolbar
2. WHEN a User modifies the rich text content, THE Frontend SHALL call useAutoSave to persist text field as HTML
3. THE FAT Condition Section SHALL mark as complete when text field is non-empty after HTML stripping


### Requirement 26: Technology Stack Section

**User Story:** As a User, I want to specify technology components, so that the document lists the technical architecture.

#### Acceptance Criteria

1. THE Technology Stack Section SHALL display an Editable_Table with 6 fixed rows
2. THE table SHALL have columns: sr_no, component, technology, note
3. THE sr_no column SHALL be locked and display values 1 through 6
4. THE component column SHALL be locked for all rows with pre-filled values: "Frontend Application", "Backend Application", "Database", "Integration Layer", "Mobile/HHT Application", "Communication Protocol"
5. THE technology column SHALL provide text input for all rows
6. FOR row 1, THE Technology Stack Section SHALL display a note sub-field below the technology input with default text: "Application can be viewed on a standard web browser like Chrome, Edge & Mozilla"
7. WHEN a User modifies any technology field, THE Frontend SHALL call useAutoSave to persist rows array
8. THE Technology Stack Section SHALL mark as complete when first row has non-empty component and technology


### Requirement 27: Hardware Specifications Section

**User Story:** As a User, I want to specify hardware components with specs, maker, and quantity, so that the document lists all required hardware.

#### Acceptance Criteria

1. THE Hardware Specifications Section SHALL display an Editable_Table with 6 fixed rows
2. THE table SHALL have columns: sr_no, name, specs (multi-line), maker, qty
3. THE sr_no column SHALL be locked and display values 1 through 6
4. THE name column SHALL be locked with pre-filled values: "Server (Tower Based)", "Server Console & accessories", "GSM Modem", "HX Controller", "{SolutionName} Client Desktop", "{SolutionName} Client Console & accessories"
5. FOR row 5 and row 6, THE name field SHALL display current solutionName value from Zustand_Store
6. FOR rows 1 and 5, THE specs column SHALL provide four text inputs labeled specs_line1 through specs_line4
7. FOR rows 2, 3, 4, and 6, THE specs column SHALL provide single text input for specs_line1
8. FOR row 3, THE specs_line1 SHALL be pre-filled and locked with value: "2G/3G/4G Industrial Cellular GSM Model with Ethernet Port & 2dBi Antenna 2mtr cable"
9. FOR row 6, THE specs_line1 SHALL be pre-filled and locked with value: "23.8\" FHD (1920x1080) resolution monitor with USB Mouse and Keyboard"
10. THE maker column SHALL provide text input for all rows
11. THE qty column SHALL provide text input for all rows with pre-filled values: "", "2", "", "1 set", "4 set", "4 Set"
12. WHEN a User modifies any editable field, THE Frontend SHALL call useAutoSave to persist rows array
13. THE Hardware Specifications Section SHALL mark as complete when first row has non-empty specs_line1 and maker


### Requirement 28: Software Specifications Section

**User Story:** As a User, I want to specify software components with maker and quantity, so that the document lists all required software.

#### Acceptance Criteria

1. THE Software Specifications Section SHALL display an Editable_Table with 9 fixed rows
2. THE table SHALL have columns: sr_no, name, maker, qty
3. THE sr_no column SHALL be locked and display values 1 through 9
4. THE name column SHALL provide text input for all rows
5. THE maker column SHALL provide text input for all rows with pre-filled values: "Microsoft", "Microsoft", "Microsoft", "Microsoft/ Other", "", "-", "-", "-", ""
6. THE qty column SHALL be locked with pre-filled values: "2", "4", "6", "2", "6", "2", "2", "2", "2"
7. WHEN a User modifies any editable field, THE Frontend SHALL call useAutoSave to persist rows array
8. THE Software Specifications Section SHALL mark as complete when first row has non-empty name field


### Requirement 29: Third Party Software Section

**User Story:** As a User, I want to specify third-party software requirements, so that the document lists external dependencies.

#### Acceptance Criteria

1. THE Third Party Software Section SHALL display single text input labeled "Third-party software / remote link tool name"
2. WHEN a User modifies the field, THE Frontend SHALL call useAutoSave to persist sw4_name
3. THE Third Party Software Section SHALL mark as complete when sw4_name is non-empty


### Requirement 30: Overall Gantt Chart Section

**User Story:** As a User, I want to generate an AI prompt and upload an overall project Gantt chart, so that the document shows the project timeline.

#### Acceptance Criteria

1. THE Overall Gantt Chart Section SHALL display "Generate AI Prompt" button
2. WHEN a User clicks "Generate AI Prompt" button, THE Frontend SHALL call POST /api/v1/projects/{id}/ai-prompt/gantt_overall
3. THE Overall Gantt Chart Section SHALL follow the same three-step flow as System Configuration Section
4. THE image upload SHALL call POST /api/v1/projects/{id}/images/gantt_overall
5. THE image delete SHALL call DELETE /api/v1/projects/{id}/images/gantt_overall
6. THE Overall Gantt Chart Section SHALL mark as complete when Section_Data record exists regardless of image upload status


### Requirement 31: Shutdown Gantt Chart Section

**User Story:** As a User, I want to generate an AI prompt and upload a shutdown/commissioning Gantt chart, so that the document shows the deployment timeline.

#### Acceptance Criteria

1. THE Shutdown Gantt Chart Section SHALL display "Generate AI Prompt" button
2. WHEN a User clicks "Generate AI Prompt" button, THE Frontend SHALL call POST /api/v1/projects/{id}/ai-prompt/gantt_shutdown
3. THE Shutdown Gantt Chart Section SHALL follow the same three-step flow as System Configuration Section
4. THE image upload SHALL call POST /api/v1/projects/{id}/images/gantt_shutdown
5. THE image delete SHALL call DELETE /api/v1/projects/{id}/images/gantt_shutdown
6. THE Shutdown Gantt Chart Section SHALL mark as complete when Section_Data record exists regardless of image upload status


### Requirement 32: Supervisors Section

**User Story:** As a User, I want to specify man-days for different roles, so that the document includes resource planning.

#### Acceptance Criteria

1. THE Supervisors Section SHALL display number input labeled "Project Manager (days)" with minimum value 1
2. THE Supervisors Section SHALL display number input labeled "Developer (days)" with minimum value 1
3. THE Supervisors Section SHALL display number input labeled "Commissioning Supervisor (days)" with minimum value 1
4. THE Supervisors Section SHALL display number input labeled "Total Man-days" with minimum value 1
5. THE Supervisors Section SHALL display preview text: "Project Manager: X Days · Developer: Y Days · Commissioning: Z Days · Total: N man-days"
6. THE preview text SHALL update in real-time as User modifies the number inputs
7. WHEN a User modifies any field, THE Frontend SHALL call useAutoSave to persist pm_days, dev_days, comm_days, and total_man_days
8. THE Supervisors Section SHALL mark as complete when all four fields are non-empty


### Requirement 33: Scope Definitions Section

**User Story:** As a User, I want to see scope definitions with auto-filled client name, so that the document includes standard scope language.

#### Acceptance Criteria

1. THE Scope Definitions Section SHALL display the scope definitions text as read-only block
2. THE scope definitions text SHALL include {{ClientName}} placeholder resolved to current clientName from Zustand_Store
3. THE Scope Definitions Section SHALL display 🔒 badge indicating locked content
4. THE Scope Definitions Section SHALL mark as complete automatically when Section_Data record exists


### Requirement 34: Division of Engineering Section

**User Story:** As a User, I want to see the responsibility matrix with auto-filled solution name, so that the document clarifies roles.

#### Acceptance Criteria

1. THE Division of Engineering Section SHALL display the responsibility matrix table as styled read-only display
2. THE responsibility matrix SHALL include {{SolutionName}} placeholder resolved to current solutionName from Zustand_Store
3. THE Division of Engineering Section SHALL display two number inputs for training_days and training_persons if not already filled in customer_training section
4. WHEN a User modifies training fields, THE Frontend SHALL call useAutoSave to persist training_days and training_persons
5. THE Division of Engineering Section SHALL mark as complete automatically when Section_Data record exists


### Requirement 35: Value Addition Section

**User Story:** As a User, I want to describe value-added features, so that the document highlights additional capabilities.

#### Acceptance Criteria

1. THE Value Addition Section SHALL display a Rich_Text_Editor labeled "Describe the value-added features and capabilities included in this solution"
2. WHEN a User modifies the rich text content, THE Frontend SHALL call useAutoSave to persist text field as HTML
3. THE Value Addition Section SHALL mark as complete when text field is non-empty after HTML stripping


### Requirement 36: Work Completion Certificate Section

**User Story:** As a User, I want to manage work completion criteria with standard and custom items, so that the document specifies acceptance conditions.

#### Acceptance Criteria

1. THE Work Completion Certificate Section SHALL display four locked standard items with 🔒 icon
2. THE locked items SHALL be: "Supply of Hardware & Software as per the scope of supply (described in section 6.2)", "Submission of all documentation as per the scope (described in section 3.3)", "Commissioning work Man-days used (as described in section 5.2)", "Deployment of {SolutionName}"
3. FOR the fourth locked item, THE text SHALL resolve {SolutionName} to current solutionName from Zustand_Store
4. THE Work Completion Certificate Section SHALL display a Dynamic_List of custom items below the locked items
5. THE custom items SHALL follow the same pattern as Documentation Control Section
6. WHEN a User modifies any custom item, THE Frontend SHALL call useAutoSave to persist custom_items array
7. THE Work Completion Certificate Section SHALL mark as complete automatically when Section_Data record exists


### Requirement 37: Buyer Obligations Section

**User Story:** As a User, I want to manage buyer obligations with standard and custom items, so that the document specifies client responsibilities.

#### Acceptance Criteria

1. THE Buyer Obligations Section SHALL display six locked standard items with 🔒 icon
2. THE locked items SHALL be: "Responsible for the project execution (answer technical queries in reasonable time and coordinate with all the stake holders of the project)", "Arrange all the hardware in BUYER scope well ahead of the agreed time schedule.", "Network cables & accessories not included in this technical proposal to be provided by BUYER", "Site access to SELLER's representative for data collection and discussion with the technical team as per requirement.", "Dedicated internet connection", "In case of any health issue to SELLER's representative, BUYER to immediately provide best available medical facility. The expenses will be borne by the SELLER."
3. THE Buyer Obligations Section SHALL display a Dynamic_List of custom items below the locked items
4. THE custom items SHALL follow the same pattern as Documentation Control Section
5. WHEN a User modifies any custom item, THE Frontend SHALL call useAutoSave to persist custom_items array
6. THE Buyer Obligations Section SHALL mark as complete automatically when Section_Data record exists


### Requirement 38: Exclusion List Section

**User Story:** As a User, I want to manage exclusions with standard and custom items, so that the document clarifies what is not included.

#### Acceptance Criteria

1. THE Exclusion List Section SHALL display ten locked standard items with 🔒 icon
2. THE locked items SHALL be: "Interface with external devices other than explicitly described in the technical proposal document.", "Software patches including but not limited to Microsoft Security updates, Antivirus updates or any other software upgrades or patches.", "Any warranty, guarantee, liability, responsibility, etc. about productivity, quality, yield, etc.", "Source code of software of core technology.", "Erection activities wherever required for project execution. Any kind of Civil work.", "Hardware and software other than that is mentioned in technical document.", "Mechanical equipment supply, modification etc.", "Support for troubleshooting for mechanical/operation/process issues of customers.", "Firewall and other networking components", "Performance with respect to productivity, yield, quality, process capability, process performance, etc."
3. THE Exclusion List Section SHALL display a Dynamic_List of custom items below the locked items
4. THE custom items SHALL follow the same pattern as Documentation Control Section
5. WHEN a User modifies any custom item, THE Frontend SHALL call useAutoSave to persist custom_items array
6. THE Exclusion List Section SHALL mark as complete automatically when Section_Data record exists


### Requirement 39: Buyer Prerequisites Section

**User Story:** As a User, I want to list buyer prerequisites, so that the document specifies what the client must provide.

#### Acceptance Criteria

1. THE Buyer Prerequisites Section SHALL display a Dynamic_List starting with 3 blank text inputs
2. THE Buyer Prerequisites Section SHALL display "Add Prerequisite" button
3. WHEN a User clicks "Add Prerequisite" button, THE Frontend SHALL append a new text input to items array
4. EACH prerequisite SHALL display delete ✕ button
5. WHEN a User clicks delete button, THE Frontend SHALL remove that item from items array
6. THE Buyer Prerequisites Section SHALL maintain minimum of 1 item in the list
7. WHEN a User modifies any item, THE Frontend SHALL call useAutoSave to persist items array
8. THE Buyer Prerequisites Section SHALL mark as complete when at least one item is non-empty


### Requirement 40: Binding Conditions Section

**User Story:** As a User, I want to see standard binding conditions, so that the document includes legal terms.

#### Acceptance Criteria

1. THE Binding Conditions Section SHALL display the full binding conditions text as formatted read-only block
2. THE Binding Conditions Section SHALL display 🔒 badge indicating locked content
3. THE Binding Conditions Section SHALL mark as complete automatically when Section_Data record exists
4. THE section text SHALL be extracted from the TS_Template_original.docx file at the corresponding section heading and hardcoded as a constant string in the component


### Requirement 41: Cybersecurity Disclaimer Section

**User Story:** As a User, I want to see the cybersecurity disclaimer, so that the document includes security terms.

#### Acceptance Criteria

1. THE Cybersecurity Disclaimer Section SHALL display the full cybersecurity disclaimer text as formatted read-only block
2. THE Cybersecurity Disclaimer Section SHALL display 🔒 badge indicating locked content
3. THE Cybersecurity Disclaimer Section SHALL mark as complete automatically when Section_Data record exists
4. THE section text SHALL be extracted from the TS_Template_original.docx file at the corresponding section heading and hardcoded as a constant string in the component


### Requirement 42: Disclaimer Section

**User Story:** As a User, I want to see all four disclaimer subsections, so that the document includes standard legal disclaimers.

#### Acceptance Criteria

1. THE Disclaimer Section SHALL group four subsections under one sidebar navigation item
2. THE subsections SHALL be: "Software Licenses", "Changes Due to Technical Improvements", "Confidentiality of Information (NDA)", "Limitation of Liability & Consequential Damages"
3. THE Disclaimer Section SHALL display all four subsections as formatted read-only blocks
4. THE Disclaimer Section SHALL display 🔒 badge indicating locked content
5. THE Disclaimer Section SHALL mark as complete automatically when Section_Data record exists
6. THE section text for all four subsections SHALL be extracted from the TS_Template_original.docx file at the corresponding section headings and hardcoded as constant strings in the component


### Requirement 43: Proof of Concepts Section

**User Story:** As a User, I want to specify PoC details, so that the document includes complimentary proof of concept offerings.

#### Acceptance Criteria

1. THE Proof of Concepts Section SHALL display the standard PoC boilerplate text as locked read-only block
2. THE Proof of Concepts Section SHALL display text input labeled "PoC Solution Name"
3. THE Proof of Concepts Section SHALL display Rich_Text_Editor labeled "PoC description and capabilities"
4. WHEN a User modifies either field, THE Frontend SHALL call useAutoSave to persist name and description
5. THE Proof of Concepts Section SHALL mark as complete when both name and description are non-empty
6. THE PoC boilerplate text SHALL be extracted from the TS_Template_original.docx file at the corresponding section heading and hardcoded as a constant string in the component


### Requirement 44: UI Design and Branding

**User Story:** As a User, I want a professional interface with Hitachi branding, so that the application reflects corporate identity.

#### Acceptance Criteria

1. THE Frontend SHALL use Hitachi red color #E60012 as primary brand color
2. THE Frontend SHALL use IBM Plex Sans font family from Google Fonts with weights 400, 500, 600, and 700
3. THE Frontend SHALL use color palette: primary #E60012, primary-light #FFF0F0, bg #F5F7FA, surface #FFFFFF, text #1A1A2E, text-muted #6B7280, border #E5E7EB, locked-bg #F9FAFB, success #10B981, warning #F59E0B
4. THE Frontend SHALL display two-column layout with fixed 260px Sidebar on left and scrollable content area on right
5. THE Frontend SHALL display fixed header at top with 56px height
6. THE Frontend SHALL style section cards with white background, 1px border, 8px border-radius, and 24px padding
7. THE Frontend SHALL display section titles as h2 elements with 16px bold text
8. THE Frontend SHALL display auto-save status indicator at bottom of each section card
9. THE Frontend SHALL style locked sections with locked-bg background color and top banner showing "🔒 This section is fixed and cannot be edited."
10. THE Frontend SHALL style primary buttons with #E60012 background, white text, 6px border-radius, 8px-16px padding, and 600 font-weight
11. THE Frontend SHALL style secondary buttons with white background, 1.5px #E60012 border, and #E60012 text
12. THE Frontend SHALL style danger buttons with #E60012 text, no background, no border, and light red background on hover
13. THE Frontend SHALL style disabled buttons with 0.4 opacity and not-allowed cursor
14. THE Frontend SHALL display Tiptap toolbar with minimal design showing Bold, Italic, Underline, Bullet List, Ordered List, and Clear Formatting buttons


### Requirement 45: Database Schema and Persistence

**User Story:** As a System, I want to store project data in a relational database, so that all information persists reliably.

#### Acceptance Criteria

1. THE Database SHALL use PostgreSQL version 15
2. THE Database SHALL define a projects table with columns: id (UUID primary key), solution_name (string not null), solution_full_name (string not null), solution_abbreviation (string nullable), client_name (string not null), client_location (string not null), client_abbreviation (string nullable), ref_number (string nullable), doc_date (string nullable), doc_version (string nullable default "0"), created_at (timestamp default now), updated_at (timestamp default now with on-update trigger)
3. THE Database SHALL define a section_data table with columns: id (UUID primary key), project_id (UUID foreign key to projects with cascade delete), section_key (string not null), content (JSON not null default empty object), updated_at (timestamp default now with on-update trigger)
4. THE Database SHALL enforce unique constraint on (project_id, section_key) in section_data table
5. THE Database SHALL define a document_versions table with columns: id (UUID primary key), project_id (UUID foreign key to projects with cascade delete), version_number (integer not null), filename (string not null), file_path (string not null), created_at (timestamp default now)
6. THE Backend SHALL use SQLAlchemy async ORM with asyncpg driver for database operations
7. THE Backend SHALL use Alembic for database migrations
8. THE alembic/env.py file SHALL import Base from app.database and import all model modules (app.projects.models, app.sections.models, app.generation.models) before defining target_metadata = Base.metadata
9. THE Backend SHALL run "alembic upgrade head" command on startup before accepting requests


### Requirement 46: API Endpoints Specification

**User Story:** As a Frontend, I want well-defined REST API endpoints, so that I can interact with the backend reliably.

#### Acceptance Criteria

1. THE Backend SHALL expose GET /api/v1/projects endpoint returning array of all Projects with summary fields
2. THE Backend SHALL expose POST /api/v1/projects endpoint accepting ProjectCreate schema and returning ProjectDetail
3. THE Backend SHALL expose GET /api/v1/projects/{id} endpoint returning ProjectDetail with completion_summary and section_completion map
4. THE Backend SHALL expose PATCH /api/v1/projects/{id} endpoint accepting ProjectUpdate schema and returning ProjectDetail
5. THE Backend SHALL expose DELETE /api/v1/projects/{id} endpoint returning HTTP 204 on success
6. THE Backend SHALL expose GET /api/v1/projects/{id}/sections endpoint returning all Section_Data records for the Project
7. THE Backend SHALL expose GET /api/v1/projects/{id}/sections/{section_key} endpoint returning single Section_Data record
8. THE Backend SHALL expose PUT /api/v1/projects/{id}/sections/{section_key} endpoint accepting content JSON and upserting Section_Data
9. THE Backend SHALL expose POST /api/v1/projects/{id}/generate endpoint validating required sections and returning document file
10. THE Backend SHALL expose GET /api/v1/projects/{id}/versions endpoint returning array of Document_Version records ordered by version_number descending
11. THE Backend SHALL expose GET /api/v1/versions/{version_id}/download endpoint returning document file from stored path
12. THE Backend SHALL expose POST /api/v1/projects/{id}/images/{image_type} endpoint accepting multipart file upload and returning image URL
13. THE Backend SHALL expose GET /api/v1/projects/{id}/images endpoint returning array of uploaded images with type and url
14. THE Backend SHALL expose DELETE /api/v1/projects/{id}/images/{image_type} endpoint returning HTTP 204 on success
15. THE Backend SHALL expose POST /api/v1/projects/{id}/ai-prompt/{prompt_type} endpoint returning prompt text and recommended_tools array
16. THE Backend SHALL validate image_type parameter accepts only: "architecture", "gantt_overall", "gantt_shutdown"
17. THE Backend SHALL validate prompt_type parameter accepts only: "architecture", "gantt_overall", "gantt_shutdown"
18. THE Backend SHALL validate section_key parameter accepts only the 31 valid section keys
19. THE Backend SHALL return HTTP 404 when Project or Section_Data not found
20. THE Backend SHALL return HTTP 400 for invalid request parameters
21. THE Backend SHALL return HTTP 422 for validation errors with detailed error messages
22. THE Backend SHALL enable CORS for origins http://localhost:5173 and http://localhost:3000


### Requirement 47: Docker Compose Deployment

**User Story:** As a Developer, I want to run the entire application with one command, so that I can quickly start development or demonstration.

#### Acceptance Criteria

1. THE System SHALL provide docker-compose.yml file defining three services: db, backend, frontend
2. THE db service SHALL use postgres:15-alpine image
3. THE db service SHALL expose port 5432 and create volume postgres_data for persistence
4. THE db service SHALL set environment variables POSTGRES_DB=ts_generator, POSTGRES_USER=ts_user, POSTGRES_PASSWORD=ts_password
5. THE db service SHALL define healthcheck using pg_isready command with interval 5s, timeout 5s, and retries 10
6. THE backend service SHALL build from ./backend directory
7. THE backend service SHALL expose port 8000 and create volume uploads_data for file persistence
8. THE backend service SHALL set environment variables DATABASE_URL, SYNC_DATABASE_URL, UPLOAD_DIR=/app/uploads, TEMPLATE_PATH=/app/templates/TS_Template_jinja.docx
9. THE backend service SHALL depend on db service with condition service_healthy
10. THE backend service SHALL run command "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
11. THE frontend service SHALL build from ./frontend directory
12. THE frontend service SHALL expose port 5173
13. THE frontend service SHALL mount volume ./frontend/src:/app/src for hot reload
14. THE frontend service SHALL set environment variable VITE_API_URL=http://localhost:8000
15. THE frontend service SHALL depend on backend service
16. THE frontend service SHALL run command "npm run dev -- --host"
17. THE System SHALL provide .env file with safe local defaults for all environment variables
18. THE System SHALL create uploads directory at runtime if it does not exist
19. THE frontend vite.config.ts SHALL configure proxy to forward /api requests to http://backend:8000
20. THE frontend vite.config.ts SHALL configure proxy to forward /uploads requests to http://backend:8000 for image thumbnail loading


### Requirement 48: Template Conversion Process

**User Story:** As a Developer, I want to convert the Word template to Jinja2 syntax, so that docxtpl can render it correctly.

#### Acceptance Criteria

1. THE System SHALL provide TS_Template_original.docx file in backend/templates directory committed to repository
2. THE System SHALL provide convert_template.py script in backend/scripts directory
3. THE convert_template.py script SHALL read TS_Template_original.docx
4. THE convert_template.py script SHALL replace all {{DoubleHandlebars}} placeholders with {{ Jinja2Syntax }}
5. THE convert_template.py script SHALL apply 80+ replacement mappings for all template variables
6. THE convert_template.py script SHALL preserve run formatting while replacing text
7. THE convert_template.py script SHALL process all paragraphs in document body
8. THE convert_template.py script SHALL process all paragraphs in all table cells
9. THE convert_template.py script SHALL save output to TS_Template_jinja.docx
10. THE convert_template.py script SHALL print instructions to manually verify {%tr for feature in features %} and {%tr endfor %} tags in features table
11. THE System SHALL document the manual step required to add row-level for-loop tags in the features table
12. THE System SHALL provide fallback option to use 6 fixed feature variables if table for-loop is not working


### Requirement 49: Rich Text Handling

**User Story:** As a System, I want to store rich text as HTML and render it as plain text in documents, so that the MVP can handle formatted content.

#### Acceptance Criteria

1. THE Frontend SHALL use Tiptap Rich_Text_Editor to produce HTML output
2. THE Frontend SHALL store rich text content as HTML strings in Section_Data.content JSON
3. THE Context_Builder SHALL strip HTML tags from rich text fields before adding to Jinja2 context
4. THE Context_Builder SHALL use Python html.parser or equivalent to convert HTML to plain text
5. THE generated Word document SHALL display rich text content as plain text without formatting
6. THE System SHALL document this as an MVP constraint in README
7. THE System SHALL preserve HTML in database for potential future enhancement to preserve formatting


### Requirement 50: Critical Non-Negotiable Constraints

**User Story:** As a System, I want to enforce critical implementation rules, so that the application behaves correctly and reliably.

#### Acceptance Criteria

1. THE Frontend SHALL read solutionName from Zustand_Store for ALL displays of solution name in section titles, table labels, preview text, and locked section bodies
2. WHEN a User updates solution_name in Cover Section, THE Frontend SHALL update Zustand_Store immediately causing all components to re-render with new value
3. WHEN a User clicks Generate_Button, THE Frontend SHALL handle the response as binary blob and trigger browser download
4. THE Frontend SHALL NOT navigate to a new page or display the document inline when generating
5. THE Auto_Save process SHALL NOT disable input fields, show blocking spinners, or prevent user interaction
6. WHEN a User opens a Locked_Section for the first time, THE Backend SHALL create Section_Data record with empty content object
7. THE Context_Builder SHALL strip HTML tags from all rich text fields before adding to Jinja2 context
8. WHEN an image file does not exist, THE Context_Builder SHALL use placeholder text string instead of failing
9. THE generate endpoint SHALL NOT fail due to missing images
10. WHEN generating a document, THE Backend SHALL query maximum version_number and increment by 1
11. THE System SHALL NOT implement any authentication, login pages, JWT tokens, or user tables
12. THE home page SHALL be accessible at root path "/" without any authentication check
13. WHEN validation fails before generation, THE Backend SHALL return HTTP 422 with array of missing section keys
14. THE Frontend SHALL display missing sections as clickable links that navigate to those sections
15. THE Template SHALL use {%tr for feature in features %} and {%tr endfor %} tags for table row iteration
16. IF table row iteration is not working, THE System SHALL use 6 fixed feature variables as documented fallback


### Requirement 51: Complete Repository Structure

**User Story:** As a Developer, I want a well-organized repository structure, so that all components are logically organized and easy to locate.

#### Acceptance Criteria

1. THE Repository SHALL contain docker-compose.yml, .env, .gitignore, and README.md files in the root directory
2. THE Repository SHALL contain backend/ directory with Dockerfile, requirements.txt, alembic.ini, and migrations/versions/ subdirectory
3. THE Repository SHALL contain backend/templates/ directory with TS_Template_original.docx and TS_Template_jinja.docx files
4. THE Repository SHALL contain backend/uploads/ directory marked as gitignored and created at runtime
5. THE .gitignore file SHALL include backend/uploads/, frontend/node_modules/, frontend/dist/, .env.local, and __pycache__/ patterns
6. THE Repository SHALL contain backend/scripts/ directory with convert_template.py script
7. THE Repository SHALL contain backend/app/ directory with main.py, config.py, and database.py files
8. THE Repository SHALL contain backend/app/projects/ module with __init__.py, router.py, service.py, models.py, and schemas.py files
9. THE Repository SHALL contain backend/app/sections/ module with __init__.py, router.py, service.py, models.py, and schemas.py files
10. THE Repository SHALL contain backend/app/generation/ module with __init__.py, router.py, service.py, models.py, context_builder.py, and docx_generator.py files
11. THE Repository SHALL contain backend/app/images/ module with __init__.py, router.py, and service.py files
12. THE Repository SHALL contain backend/app/ai_prompts/ module with __init__.py, router.py, and builders.py files
13. THE Repository SHALL contain frontend/ directory with Dockerfile, package.json, tsconfig.json, vite.config.ts, tailwind.config.ts, and index.html files
14. THE Repository SHALL contain frontend/src/ directory with main.tsx and App.tsx files
15. THE Repository SHALL contain frontend/src/api/ directory with client.ts, projects.ts, sections.ts, generation.ts, and images.ts files
16. THE Repository SHALL contain frontend/src/store/ directory with project.store.ts and ui.store.ts files
17. THE Repository SHALL contain frontend/src/pages/ directory with Home.tsx and Editor.tsx files
18. THE Repository SHALL contain frontend/src/components/layout/ directory with SectionSidebar.tsx and Header.tsx files
19. THE Repository SHALL contain frontend/src/components/sections/ directory with all 31 section component files
20. THE section component files SHALL be named: CoverSection.tsx, RevisionHistory.tsx, ExecutiveSummary.tsx, IntroductionSection.tsx, AbbreviationsSection.tsx, ProcessFlowSection.tsx, OverviewSection.tsx, FeaturesSection.tsx, RemoteSupportSection.tsx, DocumentationControlSection.tsx, CustomerTrainingSection.tsx, SystemConfigSection.tsx, FATConditionSection.tsx, TechStackSection.tsx, HardwareSpecsSection.tsx, SoftwareSpecsSection.tsx, ThirdPartySwSection.tsx, OverallGanttSection.tsx, ShutdownGanttSection.tsx, SupervisorsSection.tsx, ScopeDefinitionsSection.tsx, DivisionOfEngSection.tsx, ValueAdditionSection.tsx, WorkCompletionSection.tsx, BuyerObligationsSection.tsx, ExclusionListSection.tsx, BuyerPrerequisitesSection.tsx, BindingConditionsSection.tsx, CybersecuritySection.tsx, DisclaimerSection.tsx, and PoCSection.tsx
21. THE Repository SHALL contain frontend/src/components/shared/ directory with RichTextEditor.tsx, EditableTable.tsx, DynamicList.tsx, DiagramUpload.tsx, AiPromptModal.tsx, LockedSection.tsx, PlaceholderField.tsx, and CompletionBadge.tsx files
22. THE Repository SHALL contain frontend/src/hooks/ directory with useAutoSave.ts and useGenerationPolling.ts files
23. THE Repository SHALL contain frontend/src/types/ directory with index.ts file
24. THE frontend/src/types/index.ts file SHALL export TypeScript interfaces for Project, ProjectDetail, ProjectSummary, SectionData, DocumentVersion, CompletionSummary, and all section-specific content types
25. THE frontend/src/types/index.ts file SHALL define ProjectStore interface matching the Zustand store shape with projectId, solutionName, solutionFullName, clientName, clientLocation, and sectionCompletion fields


### Requirement 52: Template Conversion Script Complete Specification

**User Story:** As a Developer, I want a complete template conversion script with all 80+ replacements, so that the Word template is correctly converted to Jinja2 syntax.

#### Acceptance Criteria

1. THE convert_template.py script SHALL import re, pathlib.Path, docx.Document, docx.oxml.ns.qn, and copy modules
2. THE convert_template.py script SHALL define INPUT path as Path("templates/TS_Template_original.docx")
3. THE convert_template.py script SHALL define OUTPUT path as Path("templates/TS_Template_jinja.docx")
4. THE convert_template.py script SHALL define REPLACEMENTS dictionary with 80+ key-value pairs
5. THE REPLACEMENTS dictionary SHALL include mappings for SolutionFullName, SolutionName, SolutionAbbreviation, CLIENTNAME, ClientName, ClientLocation, CLIENTLOCATION, ClientAbbreviation
6. THE REPLACEMENTS dictionary SHALL include mappings for ExecutiveSummaryPara1, TenderReference, TenderDate, ProcessFlowDescription
7. THE REPLACEMENTS dictionary SHALL include mappings for SystemObjective, ExistingSystemDescription, IntegrationDescription, TangibleBenefits, IntangibleBenefits
8. THE REPLACEMENTS dictionary SHALL include mappings for Feature1Title through Feature6Title with for-loop syntax
9. THE REPLACEMENTS dictionary SHALL include mappings for Feature1Brief through Feature6Brief with for-loop syntax
10. THE REPLACEMENTS dictionary SHALL include mappings for Feature1Description through Feature6Description with for-loop syntax and endfor tag
11. THE REPLACEMENTS dictionary SHALL include mappings for TrainingPersons, TrainingDays, ARCHITECTURE_DIAGRAM, FATCondition
12. THE REPLACEMENTS dictionary SHALL include mappings for TS1_Component through TS6_Component including TS5_Component
13. THE REPLACEMENTS dictionary SHALL include mappings for TS1_Technology through TS6_Technology
14. THE REPLACEMENTS dictionary SHALL include mappings for HW1_Specs_Line1 through HW1_Specs_Line4, HW1_Maker, HW1_Qty
15. THE REPLACEMENTS dictionary SHALL include mappings for HW2_Specs, HW2_Maker, HW2_Qty
16. THE REPLACEMENTS dictionary SHALL include mappings for HW3_Specs, HW3_Maker, HW3_Qty
17. THE REPLACEMENTS dictionary SHALL include mappings for HW4_Specs, HW4_Maker, HW4_Qty
18. THE REPLACEMENTS dictionary SHALL include mappings for HW5_Specs_Line1, HW5_Specs_Line2, HW5_Specs_Line3, HW5_Maker, HW5_Qty
19. THE REPLACEMENTS dictionary SHALL include mappings for HW6_Specs, HW6_Maker, HW6_Qty
20. THE REPLACEMENTS dictionary SHALL include mappings for SW1_Name through SW9_Name
21. THE REPLACEMENTS dictionary SHALL include mappings for SW1_Maker, SW2_Maker, SW3_Maker, SW4_Maker, SW5_Maker, SW6_Maker, SW7_Maker, SW8_Maker, SW9_Maker
22. THE REPLACEMENTS dictionary SHALL include mappings for OVERALL_GANTT_CHART, SHUTDOWN_GANTT_CHART
23. THE REPLACEMENTS dictionary SHALL include mappings for PMDays, DevDays, CommDays, TotalManDays
24. THE REPLACEMENTS dictionary SHALL include mappings for ValueAddedOfferings, BuyerObligation1-3, ExclusionSystemSpecific1-3, BuyerPrereq1-3
25. THE REPLACEMENTS dictionary SHALL include mappings for POCName, POCDescription
26. THE convert_template.py script SHALL replace the full Remote Support section paragraph text with {{ RemoteSupportText }}
27. THE convert_template.py script SHALL define replace_in_paragraph function that rebuilds paragraph text with replacements applied while preserving run formatting
28. THE replace_in_paragraph function SHALL concatenate all run texts, apply all replacements, and update first run with new text while clearing remaining runs
29. THE convert_template.py script SHALL define process_document function that processes all paragraphs in document body
30. THE process_document function SHALL process all paragraphs in all table cells
31. THE convert_template.py script SHALL load Document from INPUT path
32. THE convert_template.py script SHALL call process_document on loaded document
33. THE convert_template.py script SHALL save processed document to OUTPUT path
34. THE convert_template.py script SHALL print confirmation message with OUTPUT path
35. THE convert_template.py script SHALL print IMPORTANT warning to manually verify {%tr for feature in features %} tags
36. THE convert_template.py script SHALL print reference to docxtpl documentation URL
37. THE System SHALL document MVP fallback option to use 6 fixed feature variables if table for-loop is not working
38. THE REPLACEMENTS dictionary SHALL include mappings for placeholders that may not exist in the original template (such as TS5_Component, HW2_Qty, HW4_Qty) as no-op safety entries that will be silently ignored if the placeholder is not found
39. THE System SHALL NOT write tests that assert specific replacements were made for non-existent placeholders


### Requirement 53: Abbreviations Section Default Data

**User Story:** As a System, I want to initialize the abbreviations section with 14 standard rows, so that users have common abbreviations pre-populated.

#### Acceptance Criteria

1. THE Abbreviations Section SHALL initialize with row 1: sr_no=1, abbreviation="JSPL", description="Jindal Steel & Power Ltd.", locked=true
2. THE Abbreviations Section SHALL initialize with row 2: sr_no=2, abbreviation="HIL", description="Hitachi India Pvt. Ltd.", locked=true
3. THE Abbreviations Section SHALL initialize with row 3: sr_no=3, abbreviation="SV", description="Supervisor", locked=true
4. THE Abbreviations Section SHALL initialize with row 4: sr_no=4, abbreviation="HMI", description="Human Machine Interface", locked=true
5. THE Abbreviations Section SHALL initialize with row 5: sr_no=5, abbreviation="PLC", description="Programmable Logic Controller", locked=true
6. THE Abbreviations Section SHALL initialize with row 6: sr_no=6, abbreviation="EOT", description="Electric Overhead Travelling Crane", locked=true
7. THE Abbreviations Section SHALL initialize with row 7: sr_no=7, abbreviation="HHT", description="Hand-held Terminal", locked=true
8. THE Abbreviations Section SHALL initialize with row 8: sr_no=8, abbreviation="LT", description="Long Travel of EOT Crane", locked=true
9. THE Abbreviations Section SHALL initialize with row 9: sr_no=9, abbreviation="CT", description="Cross Travel of EOT Crane", locked=true
10. THE Abbreviations Section SHALL initialize with row 10: sr_no=10, abbreviation="L1", description="Level-1 system", locked=true
11. THE Abbreviations Section SHALL initialize with row 11: sr_no=11, abbreviation="L2", description="Level-2 system", locked=true
12. THE Abbreviations Section SHALL initialize with row 12: sr_no=12, abbreviation="L3", description="Level-3 system", locked=true
13. THE Abbreviations Section SHALL initialize with row 13: sr_no=13, abbreviation="", description="Plate Mill Yard Management System", locked=false
14. THE Abbreviations Section SHALL initialize with row 14: sr_no=14, abbreviation="HTC", description="Heat Treatment Complex", locked=true


### Requirement 54: Technology Stack Section Default Data

**User Story:** As a System, I want to initialize the technology stack section with 6 fixed component rows, so that users have the standard structure pre-populated.

#### Acceptance Criteria

1. THE Technology Stack Section SHALL initialize with row 1: sr_no=1, component="Frontend Application", technology="", note="Application can be viewed on a standard web browser like Chrome, Edge & Mozilla"
2. THE Technology Stack Section SHALL initialize with row 2: sr_no=2, component="Backend Application", technology=""
3. THE Technology Stack Section SHALL initialize with row 3: sr_no=3, component="Database", technology=""
4. THE Technology Stack Section SHALL initialize with row 4: sr_no=4, component="Integration Layer", technology=""
5. THE Technology Stack Section SHALL initialize with row 5: sr_no=5, component="Mobile/HHT Application", technology=""
6. THE Technology Stack Section SHALL initialize with row 6: sr_no=6, component="Communication Protocol", technology=""
7. THE Technology Stack Section SHALL lock sr_no column for all rows
8. THE Technology Stack Section SHALL lock component column for all rows
9. THE Technology Stack Section SHALL provide editable technology column for all rows
10. THE Technology Stack Section SHALL display note field only for row 1 below the technology input


### Requirement 55: Hardware Specifications Section Default Data

**User Story:** As a System, I want to initialize the hardware specifications section with 6 fixed rows and pre-filled data, so that users have the standard hardware structure.

#### Acceptance Criteria

1. THE Hardware Specifications Section SHALL initialize with row 1: sr_no=1, name="Server (Tower Based)", specs_line1="", specs_line2="", specs_line3="", specs_line4="", maker="", qty=""
2. THE Hardware Specifications Section SHALL initialize with row 2: sr_no=2, name="Server Console & accessories", specs_line1="", maker="", qty="2"
3. THE Hardware Specifications Section SHALL initialize with row 3: sr_no=3, name="GSM Modem", specs_line1="2G/3G/4G Industrial Cellular GSM Model with Ethernet Port & 2dBi Antenna 2mtr cable", maker="", qty=""
4. THE Hardware Specifications Section SHALL initialize with row 4: sr_no=4, name="HX Controller", specs_line1="", maker="", qty="1 set"
5. THE Hardware Specifications Section SHALL initialize with row 5: sr_no=5, name="{SolutionName} Client Desktop", specs_line1="", specs_line2="", specs_line3="", maker="", qty="4 set"
6. THE Hardware Specifications Section SHALL initialize with row 6: sr_no=6, name="{SolutionName} Client Console & accessories", specs_line1="23.8\" FHD (1920x1080) resolution monitor with USB Mouse and Keyboard", maker="", qty="4 Set"
7. THE Hardware Specifications Section SHALL lock sr_no column for all rows
8. THE Hardware Specifications Section SHALL lock name column for all rows
9. THE Hardware Specifications Section SHALL lock specs_line1 for row 3
10. THE Hardware Specifications Section SHALL lock specs_line1 for row 6
11. THE Hardware Specifications Section SHALL provide 4 spec line inputs for rows 1 and 5
12. THE Hardware Specifications Section SHALL provide single spec line input for rows 2, 3, 4, and 6
13. THE Hardware Specifications Section SHALL resolve {SolutionName} placeholder in row 5 and row 6 names from Zustand_Store


### Requirement 56: Software Specifications Section Default Data

**User Story:** As a System, I want to initialize the software specifications section with 9 fixed rows and pre-filled maker data, so that users have the standard software structure.

#### Acceptance Criteria

1. THE Software Specifications Section SHALL initialize with row 1: sr_no=1, name="", maker="Microsoft", qty="2"
2. THE Software Specifications Section SHALL initialize with row 2: sr_no=2, name="", maker="Microsoft", qty="4"
3. THE Software Specifications Section SHALL initialize with row 3: sr_no=3, name="", maker="Microsoft", qty="6"
4. THE Software Specifications Section SHALL initialize with row 4: sr_no=4, name="", maker="Microsoft/ Other", qty="2"
5. THE Software Specifications Section SHALL initialize with row 5: sr_no=5, name="", maker="", qty="6"
6. THE Software Specifications Section SHALL initialize with row 6: sr_no=6, name="", maker="-", qty="2"
7. THE Software Specifications Section SHALL initialize with row 7: sr_no=7, name="", maker="-", qty="2"
8. THE Software Specifications Section SHALL initialize with row 8: sr_no=8, name="", maker="-", qty="2"
9. THE Software Specifications Section SHALL initialize with row 9: sr_no=9, name="", maker="", qty="2"
10. THE Software Specifications Section SHALL lock sr_no column for all rows
11. THE Software Specifications Section SHALL lock qty column for all rows
12. THE Software Specifications Section SHALL provide editable name column for all rows
13. THE Software Specifications Section SHALL provide editable maker column for all rows with pre-filled values


### Requirement 57: AI Prompt Generation Complete Specification

**User Story:** As a System, I want to generate detailed AI prompts with specific requirements and tool recommendations, so that users can create professional diagrams.

#### Acceptance Criteria

1. THE build_architecture_prompt function SHALL accept project object and tech_stack_rows list as parameters
2. THE build_architecture_prompt function SHALL construct tech_list string by joining component and technology pairs from tech_stack_rows
3. THE build_architecture_prompt function SHALL use default "Python backend, Angular frontend, PostgreSQL database" if no technology rows exist
4. THE build_architecture_prompt function SHALL include project.solution_full_name, project.solution_name, project.client_name, and project.client_location in prompt
5. THE build_architecture_prompt function SHALL specify requirements for "L1 (PLC/Field), L2 (SCADA/Control), L3 (MES/ERP) layers" in diagram
6. THE build_architecture_prompt function SHALL specify requirements for application server, database server, HMI interfaces, mobile/HHT devices in diagram
7. THE build_architecture_prompt function SHALL specify requirement for "Network boundary between OT (Operational Technology) and IT layers" in diagram
8. THE build_architecture_prompt function SHALL specify requirements for external system interfaces and data flow arrows
9. THE build_architecture_prompt function SHALL specify style requirements: clean, professional, white background, labeled boxes, color-coded layers
10. THE build_architecture_prompt function SHALL specify export requirements: "Export as PNG, landscape orientation, minimum 1920x1080px"
11. THE build_architecture_prompt function SHALL return dict with prompt text and recommended_tools array
12. THE architecture recommended_tools SHALL include Eraser.io with URL https://www.eraser.io and note "Best for architecture diagrams — paste prompt, get diagram instantly"
13. THE architecture recommended_tools SHALL include Claude.ai with URL https://claude.ai and note "Ask for Mermaid diagram code, then paste at mermaid.live to export PNG"
14. THE architecture recommended_tools SHALL include Mermaid Live Editor with URL https://mermaid.live and note "Render Mermaid syntax to PNG — works great with Claude output"
15. THE architecture recommended_tools SHALL include Draw.io with URL https://app.diagrams.net and note "Free manual diagramming, export as PNG"
16. THE build_gantt_overall_prompt function SHALL accept project object and supervisors dict as parameters
17. THE build_gantt_overall_prompt function SHALL extract pm_days, dev_days, and comm_days from supervisors dict with default "X" if missing
18. THE build_gantt_overall_prompt function SHALL specify phase "1. Kickoff & Requirements Finalization — 2 weeks"
19. THE build_gantt_overall_prompt function SHALL specify phase "2. System Design Document Preparation — 3 weeks"
20. THE build_gantt_overall_prompt function SHALL specify phase "3. SDD Review & Approval — 2 weeks"
21. THE build_gantt_overall_prompt function SHALL specify phase "4. Software Development — 16 weeks (starts after SDD approval)"
22. THE build_gantt_overall_prompt function SHALL specify phase "5. Factory Acceptance Testing (FAT) — 1 week"
23. THE build_gantt_overall_prompt function SHALL specify phase "6. Site Preparation & Hardware Install — 2 weeks (BUYER scope)"
24. THE build_gantt_overall_prompt function SHALL specify phase "7. Commissioning & Site Testing — {comm} days"
25. THE build_gantt_overall_prompt function SHALL specify phase "8. Training ({pm} PM days, {dev} dev days) — within commissioning"
26. THE build_gantt_overall_prompt function SHALL specify phase "9. Go-Live & Handover — 1 week"
27. THE build_gantt_overall_prompt function SHALL specify requirements: horizontal Gantt, timeline in weeks, phase bars color-coded, dependency arrows
28. THE build_gantt_overall_prompt function SHALL specify "milestone markers (SDD Approval, FAT Complete, Go-Live)" requirement
29. THE build_gantt_overall_prompt function SHALL specify critical path highlighted, white background, landscape PNG, 1920x1080px minimum
30. THE gantt_overall recommended_tools SHALL include Claude.ai, Mermaid Live Editor, and Tom's Planner with appropriate URLs and notes
31. THE build_gantt_shutdown_prompt function SHALL accept project object as parameter
32. THE build_gantt_shutdown_prompt function SHALL specify 14-day commissioning timeline with activities: Day 1-2 pre-shutdown preparation, Day 2-3 server installation, Day 3-5 application deployment, Day 5-7 integration testing, Day 7-9 operator training, Day 9-12 parallel run
33. THE build_gantt_shutdown_prompt function SHALL specify "Day 12: Go-Live milestone, WCC issuance"
34. THE build_gantt_shutdown_prompt function SHALL specify style: compact horizontal Gantt, day-based X-axis (Day 1-14), Go-Live milestone marked
35. THE build_gantt_shutdown_prompt function SHALL specify "note 'Final schedule subject to mutual agreement'" in prompt
36. THE build_gantt_shutdown_prompt function SHALL specify white background, landscape PNG, 1920x1080px
37. THE gantt_shutdown recommended_tools SHALL include Claude.ai, Mermaid Live Editor, and Tom's Planner with appropriate URLs and notes


### Requirement 58: Document Generation Filename Logic

**User Story:** As a System, I want to generate safe filenames for documents, so that files are properly named and downloadable.

#### Acceptance Criteria

1. THE generate_document function SHALL accept project object, all_sections dict, template_path string, and upload_dir string as parameters
2. THE generate_document function SHALL create DocxTemplate instance from template_path
3. THE generate_document function SHALL call build_context to generate Jinja2 context dictionary
4. THE generate_document function SHALL call template.render with context dictionary
5. THE generate_document function SHALL construct output_dir as Path(upload_dir) / "versions" / project.id
6. THE generate_document function SHALL create output_dir with parents=True and exist_ok=True
7. THE generate_document function SHALL create safe_client by replacing spaces with underscores, replacing forward slashes with hyphens, and truncating to 30 characters
8. THE generate_document function SHALL create safe_solution by replacing spaces with underscores and truncating to 20 characters
9. THE generate_document function SHALL construct filename as "TS_{safe_client}_{safe_solution}_v{project.doc_version or 0}.docx"
10. THE generate_document function SHALL construct output_path as output_dir / filename
11. THE generate_document function SHALL save template to output_path as string
12. THE generate_document function SHALL return tuple of (output_path string, filename string)


### Requirement 59: Section Sidebar Groups and Navigation

**User Story:** As a User, I want to see sections organized into logical groups in the sidebar, so that I can navigate the document structure easily.

#### Acceptance Criteria

1. THE Section Sidebar SHALL display group "COVER & HISTORY" containing Cover Page and Revision History sections
2. THE Section Sidebar SHALL display group "GENERAL OVERVIEW" containing Executive Summary, Introduction, Abbreviations, Process Flow, and Overview sections
3. THE Section Sidebar SHALL display group "OFFERINGS" containing Features, Remote Support, Documentation Control, Customer Training, System Configuration, and FAT Condition sections
4. THE Section Sidebar SHALL display group "TECHNOLOGY STACK" containing Technology Stack, Hardware Specifications, Software Specifications, and Third Party SW sections
5. THE Section Sidebar SHALL display group "SCHEDULE" containing Overall Gantt Chart, Shutdown Gantt Chart, and Supervisors sections
6. THE Section Sidebar SHALL display group "SCOPE OF SUPPLY" containing Scope Definitions, Division of Engineering, Value Addition, Work Completion, Buyer Obligations, Exclusion List, and Buyer Prerequisites sections
7. THE Section Sidebar SHALL display group "LEGAL" containing Binding Conditions, Cybersecurity, Disclaimer, and PoC Section
8. THE Section Sidebar SHALL map Cover Page to section key "cover"
9. THE Section Sidebar SHALL map Revision History to section key "revision_history"
10. THE Section Sidebar SHALL map Executive Summary to section key "executive_summary"
11. THE Section Sidebar SHALL map Introduction to section key "introduction"
12. THE Section Sidebar SHALL map Abbreviations to section key "abbreviations"
13. THE Section Sidebar SHALL map Process Flow to section key "process_flow"
14. THE Section Sidebar SHALL map Overview to section key "overview"
15. THE Section Sidebar SHALL map Features (Design Scope) to section key "features"
16. THE Section Sidebar SHALL map Remote Support to section key "remote_support"
17. THE Section Sidebar SHALL map Documentation Control to section key "documentation_control"
18. THE Section Sidebar SHALL map Customer Training to section key "customer_training"
19. THE Section Sidebar SHALL map System Configuration to section key "system_config"
20. THE Section Sidebar SHALL map FAT Condition to section key "fat_condition"
21. THE Section Sidebar SHALL map Technology Stack to section key "tech_stack"
22. THE Section Sidebar SHALL map Hardware Specifications to section key "hardware_specs"
23. THE Section Sidebar SHALL map Software Specifications to section key "software_specs"
24. THE Section Sidebar SHALL map Third Party SW to section key "third_party_sw"
25. THE Section Sidebar SHALL map Overall Gantt Chart to section key "overall_gantt"
26. THE Section Sidebar SHALL map Shutdown Gantt Chart to section key "shutdown_gantt"
27. THE Section Sidebar SHALL map Supervisors to section key "supervisors"
28. THE Section Sidebar SHALL map Scope Definitions to section key "scope_definitions"
29. THE Section Sidebar SHALL map Division of Engineering to section key "division_of_eng"
30. THE Section Sidebar SHALL map Value Addition to section key "value_addition"
31. THE Section Sidebar SHALL map Work Completion to section key "work_completion"
32. THE Section Sidebar SHALL map Buyer Obligations to section key "buyer_obligations"
33. THE Section Sidebar SHALL map Exclusion List to section key "exclusion_list"
34. THE Section Sidebar SHALL map Buyer Prerequisites to section key "buyer_prerequisites"
35. THE Section Sidebar SHALL map Binding Conditions to section key "binding_conditions"
36. THE Section Sidebar SHALL map Cybersecurity to section key "cybersecurity"
37. THE Section Sidebar SHALL map Disclaimer to section key "disclaimer"
38. THE Section Sidebar SHALL map PoC Section to section key "poc"


### Requirement 60: Backend Dockerfile Specification

**User Story:** As a Developer, I want a properly configured backend Dockerfile, so that the Python application runs correctly in Docker.

#### Acceptance Criteria

1. THE Backend Dockerfile SHALL use python:3.11-slim as base image
2. THE Backend Dockerfile SHALL set WORKDIR to /app
3. THE Backend Dockerfile SHALL run apt-get update and install gcc package
4. THE Backend Dockerfile SHALL clean up apt lists with rm -rf /var/lib/apt/lists/*
5. THE Backend Dockerfile SHALL copy requirements.txt to working directory
6. THE Backend Dockerfile SHALL run pip install --no-cache-dir -r requirements.txt
7. THE Backend Dockerfile SHALL copy all application files to working directory
8. THE Backend Dockerfile SHALL create directories uploads/images, uploads/versions, and templates with mkdir -p command
9. THE Backend Dockerfile SHALL expose port 8000
10. THE Backend Dockerfile SHALL set CMD to run uvicorn app.main:app with host 0.0.0.0, port 8000, and reload flag


### Requirement 61: Frontend Dockerfile Specification

**User Story:** As a Developer, I want a properly configured frontend Dockerfile, so that the React application runs correctly in Docker.

#### Acceptance Criteria

1. THE Frontend Dockerfile SHALL use node:20-alpine as base image
2. THE Frontend Dockerfile SHALL set WORKDIR to /app
3. THE Frontend Dockerfile SHALL copy package.json and package-lock.json to working directory
4. THE Frontend Dockerfile SHALL run npm install
5. THE Frontend Dockerfile SHALL copy all application files to working directory
6. THE Frontend Dockerfile SHALL expose port 5173
7. THE Frontend Dockerfile SHALL set CMD to run npm run dev with -- --host flags


### Requirement 62: README Documentation

**User Story:** As a Developer, I want comprehensive README documentation, so that I can set up and run the application easily.

#### Acceptance Criteria

1. THE README SHALL include title "TS Document Generator — Local Setup"
2. THE README SHALL include Prerequisites section listing Docker Desktop (running) and Git
3. THE README SHALL include Setup (First Time) section with 5 numbered steps
4. THE README Setup step 1 SHALL instruct to clone repository and change to ts-generator directory
5. THE README Setup step 2 SHALL instruct to ensure TS_Template.docx is at backend/templates/TS_Template_original.docx
6. THE README Setup step 3 SHALL instruct to run docker-compose up --build to start all services
7. THE README Setup step 4 SHALL instruct to run docker-compose exec backend python scripts/convert_template.py to convert template
8. THE README Setup step 4 SHALL instruct to manually verify TS_Template_jinja.docx has correct {%tr for %} tags in features table
9. THE README Setup step 4 SHALL reference KIRO_REQUIREMENTS.md section 4 for details
10. THE README Setup step 5 SHALL instruct to open http://localhost:5173
11. THE README SHALL include Daily Use section with command docker-compose up
12. THE README SHALL include Reset database section with command docker-compose down -v && docker-compose up --build
13. THE README SHALL include API docs section with URL http://localhost:8000/docs


### Requirement 63: Backend Python Dependencies Complete Specification

**User Story:** As a Developer, I want all required backend dependencies specified with exact versions, so that the application runs correctly.

#### Acceptance Criteria

1. THE Backend requirements.txt SHALL include fastapi==0.111.0
2. THE Backend requirements.txt SHALL include uvicorn[standard]==0.29.0
3. THE Backend requirements.txt SHALL include sqlalchemy[asyncio]==2.0.30
4. THE Backend requirements.txt SHALL include asyncpg==0.29.0
5. THE Backend requirements.txt SHALL include psycopg2-binary==2.9.9
6. THE Backend requirements.txt SHALL include alembic==1.13.1
7. THE Backend requirements.txt SHALL include pydantic==2.7.1
8. THE Backend requirements.txt SHALL include pydantic-settings==2.2.1
9. THE Backend requirements.txt SHALL include python-multipart==0.0.9
10. THE Backend requirements.txt SHALL include docxtpl==0.16.8
11. THE Backend requirements.txt SHALL include python-docx==1.1.2
12. THE Backend requirements.txt SHALL include Pillow==10.3.0
13. THE Backend requirements.txt SHALL include aiofiles==23.2.1


### Requirement 64: Revision History Section Default Row

**User Story:** As a System, I want to initialize the revision history section with a default first row, so that users have a starting point.

#### Acceptance Criteria

1. THE Revision History Section SHALL initialize with one default row
2. THE default row SHALL have sr_no=1
3. THE default row SHALL have revised_by=""
4. THE default row SHALL have checked_by=""
5. THE default row SHALL have approved_by=""
6. THE default row SHALL have details="First issue"
7. THE default row SHALL have date="23-01-2026"
8. THE default row SHALL have rev_no="0"


### Requirement 65: Buyer Obligations Section Standard Items

**User Story:** As a System, I want to display 6 standard locked buyer obligation items, so that users see the standard terms.

#### Acceptance Criteria

1. THE Buyer Obligations Section SHALL display locked item 1: "Responsible for the project execution (answer technical queries in reasonable time and coordinate with all the stake holders of the project)"
2. THE Buyer Obligations Section SHALL display locked item 2: "Arrange all the hardware in BUYER scope well ahead of the agreed time schedule."
3. THE Buyer Obligations Section SHALL display locked item 3: "Network cables & accessories not included in this technical proposal to be provided by BUYER"
4. THE Buyer Obligations Section SHALL display locked item 4: "Site access to SELLER's representative for data collection and discussion with the technical team as per requirement."
5. THE Buyer Obligations Section SHALL display locked item 5: "Dedicated internet connection"
6. THE Buyer Obligations Section SHALL display locked item 6: "In case of any health issue to SELLER's representative, BUYER to immediately provide best available medical facility. The expenses will be borne by the SELLER."


### Requirement 66: Exclusion List Section Standard Items

**User Story:** As a System, I want to display 10 standard locked exclusion items, so that users see what is not included.

#### Acceptance Criteria

1. THE Exclusion List Section SHALL display locked item 1: "Interface with external devices other than explicitly described in the technical proposal document."
2. THE Exclusion List Section SHALL display locked item 2: "Software patches including but not limited to Microsoft Security updates, Antivirus updates or any other software upgrades or patches."
3. THE Exclusion List Section SHALL display locked item 3: "Any warranty, guarantee, liability, responsibility, etc. about productivity, quality, yield, etc."
4. THE Exclusion List Section SHALL display locked item 4: "Source code of software of core technology."
5. THE Exclusion List Section SHALL display locked item 5: "Erection activities wherever required for project execution. Any kind of Civil work."
6. THE Exclusion List Section SHALL display locked item 6: "Hardware and software other than that is mentioned in technical document."
7. THE Exclusion List Section SHALL display locked item 7: "Mechanical equipment supply, modification etc."
8. THE Exclusion List Section SHALL display locked item 8: "Support for troubleshooting for mechanical/operation/process issues of customers."
9. THE Exclusion List Section SHALL display locked item 9: "Firewall and other networking components"
10. THE Exclusion List Section SHALL display locked item 10: "Performance with respect to productivity, yield, quality, process capability, process performance, etc."


### Requirement 67: Work Completion Certificate Section Standard Items

**User Story:** As a System, I want to display 4 standard locked work completion items, so that users see the acceptance criteria.

#### Acceptance Criteria

1. THE Work Completion Certificate Section SHALL display locked item 1: "Supply of Hardware & Software as per the scope of supply (described in section 6.2)"
2. THE Work Completion Certificate Section SHALL display locked item 2: "Submission of all documentation as per the scope (described in section 3.3)"
3. THE Work Completion Certificate Section SHALL display locked item 3: "Commissioning work Man-days used (as described in section 5.2)"
4. THE Work Completion Certificate Section SHALL display locked item 4: "Deployment of {SolutionName}"
5. THE Work Completion Certificate Section SHALL resolve {SolutionName} placeholder in item 4 from Zustand_Store


### Requirement 68: Documentation Control Section Standard Items

**User Story:** As a System, I want to display 4 standard locked documentation items, so that users see the required deliverables.

#### Acceptance Criteria

1. THE Documentation Control Section SHALL display locked item 1: "Screen Design Document"
2. THE Documentation Control Section SHALL display locked item 2: "Hardware Specifications"
3. THE Documentation Control Section SHALL display locked item 3: "Software specifications"
4. THE Documentation Control Section SHALL display locked item 4: "Operation Manual"


### Requirement 69: Disclaimer Section Four Subsections

**User Story:** As a System, I want to display all four disclaimer subsections under one navigation item, so that users see all legal disclaimers together.

#### Acceptance Criteria

1. THE Disclaimer Section SHALL group four subsections under single sidebar navigation item
2. THE Disclaimer Section SHALL include subsection "Software Licenses"
3. THE Disclaimer Section SHALL include subsection "Changes Due to Technical Improvements"
4. THE Disclaimer Section SHALL include subsection "Confidentiality of Information (NDA)"
5. THE Disclaimer Section SHALL include subsection "Limitation of Liability & Consequential Damages"
6. THE Disclaimer Section SHALL display all four subsections as formatted read-only blocks
7. THE Disclaimer Section SHALL display 🔒 badge indicating locked content


### Requirement 70: File Download Implementation

**User Story:** As a Frontend, I want to properly handle document file downloads, so that users can save generated documents.

#### Acceptance Criteria

1. WHEN generateDocument API call succeeds, THE Frontend SHALL receive response with responseType 'blob'
2. THE Frontend SHALL create Blob object from response.data
3. THE Frontend SHALL create object URL using window.URL.createObjectURL
4. THE Frontend SHALL create anchor element with href set to object URL
5. THE Frontend SHALL set download attribute on anchor element to filename format "TS_{projectId}.docx"
6. THE Frontend SHALL append anchor element to document.body
7. THE Frontend SHALL programmatically click anchor element using link.click()
8. THE Frontend SHALL remove anchor element from document.body after click using link.remove()
9. THE Frontend SHALL display success message to user after download triggers
10. THE Frontend SHALL handle download errors and display error message to user


### Requirement 71: Frontend Hooks Complete Specification

**User Story:** As a Frontend, I want all required custom hooks implemented, so that the application has proper state management and side effects.

#### Acceptance Criteria

1. THE Frontend SHALL implement useAutoSave hook in src/hooks/useAutoSave.ts
2. THE Frontend SHALL implement useGenerationPolling hook in src/hooks/useGenerationPolling.ts as a placeholder stub for future async generation
3. THE useAutoSave hook SHALL accept projectId, sectionKey, and delay parameters with delay defaulting to 800ms
4. THE useAutoSave hook SHALL return save function and status state
5. THE useAutoSave hook SHALL use useCallback with dependencies [projectId, sectionKey, delay]
6. THE useAutoSave hook SHALL declare timerRef using useRef with type ReturnType<typeof setTimeout> | null
7. THE useGenerationPolling hook SHALL be a placeholder stub that is not used in the MVP because generation is synchronous
8. THE useGenerationPolling hook SHALL include documentation comment explaining it is reserved for future async generation implementation
9. FOR the MVP, THE Frontend SHALL download the document file directly from the POST /generate response without polling


### Requirement 72: Context Builder Helper Function

**User Story:** As a System, I want a helper function to safely retrieve section content, so that the context builder handles missing data gracefully.

#### Acceptance Criteria

1. THE backend/app/generation/context_builder.py file SHALL define helper function def s(key: str) -> dict
2. THE s function SHALL accept section key string as parameter
3. THE s function SHALL return all_sections.get(key, {}).get("content", {})
4. THE s function SHALL provide fallback to empty dict if section key does not exist
5. THE s function SHALL provide fallback to empty dict if content field does not exist
6. THE build_context function SHALL use s(key) helper throughout to retrieve section content


### Requirement 73: Document Generator Output Directory Creation

**User Story:** As a System, I want the output directory created with proper parameters, so that document generation succeeds.

#### Acceptance Criteria

1. THE backend/app/generation/docx_generator.py file SHALL construct output_dir as Path(upload_dir) / "versions" / project.id
2. THE docx_generator.py file SHALL call output_dir.mkdir(parents=True, exist_ok=True)
3. THE mkdir call SHALL use parents=True to create intermediate directories
4. THE mkdir call SHALL use exist_ok=True to avoid errors if directory already exists


### Requirement 74: UI Design Font Family Specification

**User Story:** As a Frontend, I want the exact font-family CSS specified, so that the application uses correct typography.

#### Acceptance Criteria

1. THE Frontend SHALL import IBM Plex Sans from Google Fonts with weights 400, 500, 600, 700
2. THE Frontend SHALL apply font-family CSS as 'IBM Plex Sans', sans-serif with single quotes around font name
3. THE font-family declaration SHALL include fallback to sans-serif
4. THE font-family SHALL be applied globally to all text elements


### Requirement 75: README Template Conversion Command

**User Story:** As a Developer, I want the exact template conversion command documented, so that I can run it correctly.

#### Acceptance Criteria

1. THE README.md file SHALL specify exact command: docker-compose exec backend python scripts/convert_template.py
2. THE command SHALL use docker-compose exec to run inside running backend container
3. THE command SHALL specify backend as the service name
4. THE command SHALL specify python scripts/convert_template.py as the command to execute


### Requirement 76: File Download Link Removal

**User Story:** As a Frontend, I want the download link properly cleaned up, so that the DOM is not polluted.

#### Acceptance Criteria

1. WHEN triggering file download, THE Frontend SHALL create anchor element
2. THE Frontend SHALL set href and download attributes on anchor element
3. THE Frontend SHALL append anchor element to document.body
4. THE Frontend SHALL call link.click() to trigger download
5. THE Frontend SHALL call link.remove() immediately after link.click()
6. THE link.remove() call SHALL remove the anchor element from the DOM


### Requirement 77: Remote Support Section Default Text Complete

**User Story:** As a System, I want the complete default remote support text specified, so that the section initializes correctly.

#### Acceptance Criteria

1. THE Remote Support Section SHALL pre-populate with exact text: "SELLER will provide complimentary remote maintenance support for troubleshooting and issue resolution (if any) for a period of 6 months from the date of completion of project. Necessary infrastructure and network configuration will have to be enabled by BUYER to facilitate this. Remote maintenance support will be limited to scope of supply of this proposal. Also, access to remote terminal should be made available to SELLER as per requirement. Dedicated Internet/Lease line at site to be arranged by BUYER. The effective working hours at SELLER's Office shall be from 9:00 AM to 5:00 PM IST (Monday to Friday), excluding National Holidays. NON-DISCLOSURE AGREEMENT (NDA) will be signed between BUYER and SELLER before starting the remote support."
2. THE text SHALL be exactly 641 characters long
3. THE text SHALL include all punctuation and capitalization as specified
4. THE text SHALL be stored in remote_support.text field on first section open


### Requirement 78: AI Prompt Tool Recommendations Complete

**User Story:** As a System, I want exact tool recommendations for each prompt type, so that users have clear guidance.

#### Acceptance Criteria

1. THE architecture prompt SHALL return 4 recommended tools
2. THE architecture tool 1 SHALL be name="Eraser.io", url="https://www.eraser.io", note="Best for architecture diagrams — paste prompt, get diagram instantly"
3. THE architecture tool 2 SHALL be name="Claude.ai (free)", url="https://claude.ai", note="Ask for Mermaid diagram code, then paste at mermaid.live to export PNG"
4. THE architecture tool 3 SHALL be name="Mermaid Live Editor", url="https://mermaid.live", note="Render Mermaid syntax to PNG — works great with Claude output"
5. THE architecture tool 4 SHALL be name="Draw.io", url="https://app.diagrams.net", note="Free manual diagramming, export as PNG"
6. THE overall_gantt prompt SHALL return 3 recommended tools
7. THE overall_gantt tool 1 SHALL be name="Claude.ai (free)", url="https://claude.ai", note="Generate Mermaid gantt syntax, render at mermaid.live"
8. THE overall_gantt tool 2 SHALL be name="Mermaid Live Editor", url="https://mermaid.live", note="Native gantt chart support, export to PNG"
9. THE overall_gantt tool 3 SHALL be name="Tom's Planner", url="https://www.tomsplanner.com", note="Free online Gantt tool with image export"
10. THE shutdown_gantt prompt SHALL return 3 recommended tools
11. THE shutdown_gantt tool 1 SHALL be name="Claude.ai (free)", url="https://claude.ai", note="Generate Mermaid gantt syntax, render at mermaid.live"
12. THE shutdown_gantt tool 2 SHALL be name="Mermaid Live Editor", url="https://mermaid.live", note="Best for compact day-based commissioning Gantts"
13. THE shutdown_gantt tool 3 SHALL be name="Tom's Planner", url="https://www.tomsplanner.com", note="Free online Gantt with image export"


### Requirement 79: Section Sidebar Complete Specification

**User Story:** As a User, I want the section sidebar with all groups and mappings, so that I can navigate the document structure.

#### Acceptance Criteria

1. THE Section Sidebar SHALL display exactly 7 section groups
2. THE "COVER & HISTORY" group SHALL contain 2 sections: Cover Page (cover), Revision History (revision_history)
3. THE "GENERAL OVERVIEW" group SHALL contain 5 sections: Executive Summary (executive_summary), Introduction (introduction), Abbreviations (abbreviations), Process Flow (process_flow), Overview (overview)
4. THE "OFFERINGS" group SHALL contain 6 sections: Features (features), Remote Support (remote_support), Documentation Control (documentation_control), Customer Training (customer_training), System Configuration (system_config), FAT Condition (fat_condition)
5. THE "TECHNOLOGY STACK" group SHALL contain 4 sections: Technology Stack (tech_stack), Hardware Specifications (hardware_specs), Software Specifications (software_specs), Third Party SW (third_party_sw)
6. THE "SCHEDULE" group SHALL contain 3 sections: Overall Gantt Chart (overall_gantt), Shutdown Gantt Chart (shutdown_gantt), Supervisors (supervisors)
7. THE "SCOPE OF SUPPLY" group SHALL contain 7 sections: Scope Definitions (scope_definitions), Division of Engineering (division_of_eng), Value Addition (value_addition), Work Completion (work_completion), Buyer Obligations (buyer_obligations), Exclusion List (exclusion_list), Buyer Prerequisites (buyer_prerequisites)
8. THE "LEGAL" group SHALL contain 4 sections: 🔒 Binding Conditions (binding_conditions), 🔒 Cybersecurity (cybersecurity), 🔒 Disclaimer (disclaimer), PoC Section (poc)
9. THE Section Sidebar SHALL display total of 31 sections across all groups
10. THE Section Sidebar SHALL mark binding_conditions, cybersecurity, and disclaimer with 🔒 icon indicating auto-complete locked sections


### Requirement 80: Required Fields Complete Specification

**User Story:** As a System, I want all 31 section completion rules specified, so that completion tracking works correctly.

#### Acceptance Criteria

1. THE System SHALL track completion for exactly 27 completable sections (excluding 4 auto-complete sections)
2. THE cover section SHALL complete when solution_full_name, client_name, and client_location are all non-empty
3. THE revision_history section SHALL complete when at least 1 row has non-empty details field
4. THE executive_summary section SHALL complete when para1 contains text after HTML tag stripping
5. THE introduction section SHALL complete when tender_reference and tender_date are both non-empty
6. THE abbreviations section SHALL complete when row 13 abbreviation field is non-empty
7. THE process_flow section SHALL complete when text field contains content after HTML stripping
8. THE overview section SHALL complete when system_objective and existing_system are both non-empty
9. THE features section SHALL complete when at least 1 item has non-empty title and description
10. THE remote_support section SHALL complete when text field is non-empty
11. THE documentation_control section SHALL auto-complete when Section_Data record exists
12. THE customer_training section SHALL complete when persons and days fields are both non-empty
13. THE system_config section SHALL auto-complete when Section_Data record exists
14. THE fat_condition section SHALL complete when text field is non-empty
15. THE tech_stack section SHALL complete when first row has non-empty component and technology
16. THE hardware_specs section SHALL complete when first row has non-empty specs_line1 and maker
17. THE software_specs section SHALL complete when first row has non-empty name field
18. THE third_party_sw section SHALL complete when sw4_name is non-empty
19. THE overall_gantt section SHALL auto-complete when Section_Data record exists
20. THE shutdown_gantt section SHALL auto-complete when Section_Data record exists
21. THE supervisors section SHALL complete when pm_days, dev_days, comm_days, and total_man_days are all non-empty
22. THE scope_definitions section SHALL auto-complete when Section_Data record exists
23. THE division_of_eng section SHALL auto-complete when Section_Data record exists
24. THE value_addition section SHALL complete when text field is non-empty
25. THE work_completion section SHALL auto-complete when Section_Data record exists
26. THE buyer_obligations section SHALL auto-complete when Section_Data record exists
27. THE exclusion_list section SHALL auto-complete when Section_Data record exists
28. THE buyer_prerequisites section SHALL complete when at least 1 item is non-empty
29. THE binding_conditions section SHALL auto-complete when Section_Data record exists (locked)
30. THE cybersecurity section SHALL auto-complete when Section_Data record exists (locked)
31. THE disclaimer section SHALL auto-complete when Section_Data record exists (locked)
32. THE poc section SHALL complete when name and description are both non-empty


### Requirement 81: API Section Keys Validation

**User Story:** As a Backend, I want to validate section_key parameter against 31 valid values, so that invalid requests are rejected.

#### Acceptance Criteria

1. THE Backend SHALL define list of 31 valid section_key values
2. THE valid section keys SHALL be: cover, revision_history, executive_summary, introduction, abbreviations, process_flow, overview, features, remote_support, documentation_control, customer_training, system_config, fat_condition, tech_stack, hardware_specs, software_specs, third_party_sw, overall_gantt, shutdown_gantt, supervisors, scope_definitions, division_of_eng, value_addition, work_completion, buyer_obligations, exclusion_list, buyer_prerequisites, binding_conditions, cybersecurity, disclaimer, poc
3. THE Backend SHALL return HTTP 400 when section_key parameter does not match any of the 31 valid values
4. THE Backend SHALL include error message specifying valid section_key values in 400 response

