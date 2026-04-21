# Requirements Document

## Introduction

This feature enables automatic population of editor section fields from the New Project form data. When a user creates a new project through the NewProjectModal, the form values (solution names, client details, reference information) should automatically populate the corresponding fields in the Cover and Abbreviations sections, eliminating manual re-entry and improving user experience.

## Glossary

- **New_Project_Form**: The modal interface (NewProjectModal.tsx) where users input initial project details
- **Cover_Section**: The editor section (section_key: 'cover') containing document metadata fields
- **Abbreviations_Section**: The editor section (section_key: 'abbreviations') containing abbreviation rows
- **Section_Record**: A database record in the section_data table storing section content as JSONB
- **Project_Creation_Endpoint**: The POST /api/v1/projects endpoint that creates new projects
- **Backend**: The Python FastAPI application handling API requests and database operations
- **Frontend**: The React TypeScript application providing the user interface

## Requirements

### Requirement 1: Auto-populate Cover Section Fields

**User Story:** As a user, I want the Cover section fields to be automatically filled with my New Project form data, so that I don't have to manually re-enter the same information in the editor.

#### Acceptance Criteria

1. WHEN a project is created via the New_Project_Form, THE Backend SHALL create a Section_Record for the Cover_Section with content populated from form fields
2. THE Backend SHALL map solution_full_name from the form to content.solution_full_name in the Cover_Section
3. THE Backend SHALL map client_name from the form to content.client_name in the Cover_Section
4. THE Backend SHALL map client_location from the form to content.client_location in the Cover_Section
5. THE Backend SHALL map ref_number from the form to content.ref_number in the Cover_Section
6. THE Backend SHALL map doc_date from the form to content.doc_date in the Cover_Section
7. THE Backend SHALL map doc_version from the form to content.doc_version in the Cover_Section
8. WHEN the user navigates to the editor after project creation, THE Frontend SHALL display the pre-populated Cover_Section fields

### Requirement 2: Auto-populate Abbreviations Section Row 13

**User Story:** As a user, I want the solution abbreviation I entered in the New Project form to automatically appear in row 13 of the Abbreviations section, so that my custom solution abbreviation is immediately available.

#### Acceptance Criteria

1. WHEN a project is created via the New_Project_Form, THE Backend SHALL create a Section_Record for the Abbreviations_Section with default rows
2. WHERE solution_abbreviation is provided in the form, THE Backend SHALL populate row 13 abbreviation field with the solution_abbreviation value
3. THE Backend SHALL preserve the row 13 description as "Plate Mill Yard Management System"
4. THE Backend SHALL preserve all other default rows (rows 1-12, 14) with their standard values
5. WHERE solution_abbreviation is empty in the form, THE Backend SHALL leave row 13 abbreviation field empty
6. WHEN the user navigates to the Abbreviations_Section in the editor, THE Frontend SHALL display row 13 with the pre-populated abbreviation

### Requirement 3: Auto-populate Abbreviations Section with Client Abbreviation

**User Story:** As a user, I want the client abbreviation I entered in the New Project form to automatically appear as a new row in the Abbreviations section, so that my client abbreviation is immediately available.

#### Acceptance Criteria

1. WHERE client_abbreviation is provided in the form, THE Backend SHALL add a new row (row 15) to the Abbreviations_Section
2. THE Backend SHALL set the new row's abbreviation field to the client_abbreviation value
3. THE Backend SHALL set the new row's description field to the client_name value
4. THE Backend SHALL set the new row's sr_no field to 15
5. THE Backend SHALL set the new row's locked field to false
6. WHERE client_abbreviation is empty in the form, THE Backend SHALL NOT add row 15
7. WHEN the user navigates to the Abbreviations_Section in the editor, THE Frontend SHALL display the client abbreviation row if it was created

### Requirement 4: Maintain Section Auto-creation Behavior

**User Story:** As a developer, I want the existing section auto-creation behavior to remain functional, so that sections without pre-populated data still work correctly.

#### Acceptance Criteria

1. WHEN a section is requested that was not pre-populated during project creation, THE Backend SHALL create an empty Section_Record with default content
2. THE Backend SHALL preserve the existing auto-creation logic in the get_section service function
3. WHEN the Cover_Section or Abbreviations_Section are pre-populated, THE Backend SHALL NOT trigger auto-creation for those sections
4. FOR ALL other sections not pre-populated during project creation, THE Backend SHALL use the existing auto-creation behavior

### Requirement 5: Preserve Form Data in Project Record

**User Story:** As a developer, I want all form data to be stored in the project record, so that the data remains accessible for future features and updates.

#### Acceptance Criteria

1. WHEN a project is created, THE Backend SHALL store all form fields in the projects table
2. THE Backend SHALL store solution_name, solution_full_name, and solution_abbreviation fields
3. THE Backend SHALL store client_name, client_location, and client_abbreviation fields
4. THE Backend SHALL store ref_number, doc_date, and doc_version fields
5. THE Backend SHALL preserve the existing project creation logic for all non-section-related operations

### Requirement 6: Handle Empty Optional Fields

**User Story:** As a user, I want the system to handle empty optional fields gracefully, so that I can create projects without filling in all optional information.

#### Acceptance Criteria

1. WHERE an optional form field is empty, THE Backend SHALL store an empty string in the corresponding Section_Record field
2. WHERE solution_abbreviation is empty, THE Backend SHALL leave row 13 abbreviation empty in the Abbreviations_Section
3. WHERE client_abbreviation is empty, THE Backend SHALL NOT create row 15 in the Abbreviations_Section
4. WHERE ref_number, doc_date, or doc_version are empty, THE Backend SHALL store empty strings in the Cover_Section content
5. WHEN the Frontend displays sections with empty fields, THE Frontend SHALL show placeholder text or empty input fields

### Requirement 7: Maintain Transaction Integrity

**User Story:** As a developer, I want all section pre-population to occur within the project creation transaction, so that data consistency is maintained.

#### Acceptance Criteria

1. WHEN a project is created, THE Backend SHALL create the project record and all pre-populated Section_Records within a single database transaction
2. IF any section creation fails, THE Backend SHALL roll back the entire project creation transaction
3. THE Backend SHALL commit all changes only after successful creation of the project and all pre-populated sections
4. WHEN a project creation error occurs, THE Backend SHALL return an appropriate error response to the Frontend
5. THE Frontend SHALL display an error message to the user if project creation fails
