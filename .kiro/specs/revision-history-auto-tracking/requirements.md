# Requirements Document

## Introduction

This document specifies the requirements for automatic revision history tracking in technical specification documents. The system will automatically manage revision history entries when projects are created or modified, reducing manual data entry and ensuring consistent tracking of document changes.

## Glossary

- **Revision_History_System**: The component responsible for automatically creating and managing revision history table entries
- **Project**: A technical specification document with associated metadata and sections
- **Revision_Entry**: A single row in the revision history table containing details, date, and revision number
- **Project_Creation_Event**: The event triggered when a user creates a new project
- **Project_Modification_Event**: The event triggered when a user makes any change to an existing project
- **Auto_Generated_Field**: A field in the revision entry that is automatically populated by the system (Details, Date, Rev No)
- **User_Editable_Field**: A field in the revision entry that can be manually edited by the user (Sr. No., Revised By, Checked By, Approved By)

## Requirements

### Requirement 1: Initial Revision Entry on Project Creation

**User Story:** As a user, I want the first revision entry to be automatically created when I create a new project, so that I don't have to manually add the initial revision record.

#### Acceptance Criteria

1. WHEN a Project_Creation_Event occurs, THE Revision_History_System SHALL create a Revision_Entry with Details set to "First issue"
2. WHEN a Project_Creation_Event occurs, THE Revision_History_System SHALL set the Date field to the current date in DD-MM-YYYY format
3. WHEN a Project_Creation_Event occurs, THE Revision_History_System SHALL set the Rev No field to "0"
4. THE Revision_History_System SHALL leave User_Editable_Fields (Sr. No., Revised By, Checked By, Approved By) empty for user input
5. WHEN a Project_Creation_Event occurs, THE Revision_History_System SHALL store the project creation timestamp in the database

### Requirement 2: Automatic Revision Entry on Project Modification

**User Story:** As a user, I want a new revision entry to be automatically added when I modify an existing project, so that all changes are tracked without manual intervention.

#### Acceptance Criteria

1. WHEN a Project_Modification_Event occurs, THE Revision_History_System SHALL create a new Revision_Entry
2. WHEN creating a new Revision_Entry, THE Revision_History_System SHALL set Details to an auto-incremented text value following the pattern "Second issue", "Third issue", "Fourth issue", etc.
3. WHEN creating a new Revision_Entry, THE Revision_History_System SHALL set the Date field to the current date in DD-MM-YYYY format
4. WHEN creating a new Revision_Entry, THE Revision_History_System SHALL set the Rev No field to an auto-incremented number (1, 2, 3, etc.)
5. THE Revision_History_System SHALL preserve existing User_Editable_Fields from previous entries
6. THE Revision_History_System SHALL leave User_Editable_Fields empty in the new entry for user input

### Requirement 3: Revision Number Sequencing

**User Story:** As a user, I want revision numbers to increment sequentially, so that I can easily track the chronological order of changes.

#### Acceptance Criteria

1. THE Revision_History_System SHALL maintain a sequential counter for Rev No starting from 0
2. WHEN a new Revision_Entry is created, THE Revision_History_System SHALL increment the Rev No by 1 from the previous highest value
3. IF the revision history contains entries, THEN THE Revision_History_System SHALL calculate the next Rev No based on the maximum existing Rev No plus 1
4. THE Revision_History_System SHALL ensure Rev No values are unique within a single Project

### Requirement 4: Details Text Generation

**User Story:** As a user, I want the Details field to automatically describe the revision sequence, so that I can quickly identify which revision I'm looking at.

#### Acceptance Criteria

1. THE Revision_History_System SHALL generate Details text following the pattern: "First issue", "Second issue", "Third issue", etc.
2. WHEN generating Details text, THE Revision_History_System SHALL use ordinal numbers (First, Second, Third, Fourth, Fifth, etc.)
3. THE Revision_History_System SHALL append the word "issue" to each ordinal number
4. WHEN the revision count exceeds common ordinal names, THE Revision_History_System SHALL use numeric ordinals (e.g., "21st issue", "22nd issue", "23rd issue")

### Requirement 5: Date Formatting

**User Story:** As a user, I want dates to be consistently formatted, so that the revision history table maintains a professional appearance.

#### Acceptance Criteria

1. THE Revision_History_System SHALL format all Date fields using the DD-MM-YYYY pattern
2. WHEN generating a Date value, THE Revision_History_System SHALL use the current system date at the time of entry creation
3. THE Revision_History_System SHALL use two-digit day values with leading zeros (01-31)
4. THE Revision_History_System SHALL use two-digit month values with leading zeros (01-12)
5. THE Revision_History_System SHALL use four-digit year values

### Requirement 6: Change Detection

**User Story:** As a user, I want the system to detect when I make meaningful changes to a project, so that revision entries are created only when necessary.

#### Acceptance Criteria

1. WHEN any section content is modified, THE Revision_History_System SHALL trigger a Project_Modification_Event
2. WHEN project metadata is updated, THE Revision_History_System SHALL trigger a Project_Modification_Event
3. WHEN a user edits User_Editable_Fields in the revision history, THE Revision_History_System SHALL NOT trigger a Project_Modification_Event
4. THE Revision_History_System SHALL track the timestamp of the last modification to determine when changes occur

### Requirement 7: Data Persistence

**User Story:** As a developer, I want revision history data to be stored in the database, so that it persists across sessions and can be retrieved reliably.

#### Acceptance Criteria

1. THE Revision_History_System SHALL store all Revision_Entry data in the database
2. THE Revision_History_System SHALL associate each Revision_Entry with its parent Project using a foreign key relationship
3. WHEN a Project is deleted, THE Revision_History_System SHALL delete all associated Revision_Entry records
4. THE Revision_History_System SHALL maintain the order of Revision_Entry records based on Rev No

### Requirement 8: User Editability Preservation

**User Story:** As a user, I want to be able to edit certain fields in the revision history, so that I can add reviewer names and other manual information.

#### Acceptance Criteria

1. THE Revision_History_System SHALL allow users to edit Sr. No., Revised By, Checked By, and Approved By fields at any time
2. WHEN a user edits a User_Editable_Field, THE Revision_History_System SHALL save the change immediately
3. THE Revision_History_System SHALL NOT allow users to edit Auto_Generated_Fields (Details, Date, Rev No)
4. THE Revision_History_System SHALL preserve user edits to User_Editable_Fields when new Revision_Entry records are created

### Requirement 9: Backward Compatibility

**User Story:** As a developer, I want existing projects to work with the new automatic revision tracking, so that users don't lose their existing revision history data.

#### Acceptance Criteria

1. WHEN an existing Project without revision history is opened, THE Revision_History_System SHALL create an initial Revision_Entry as if it were a new project
2. WHEN an existing Project with manual revision entries is opened, THE Revision_History_System SHALL preserve all existing entries
3. THE Revision_History_System SHALL calculate the next Rev No based on existing entries in legacy projects
4. THE Revision_History_System SHALL NOT duplicate the initial "First issue" entry if one already exists

### Requirement 10: Display Integration

**User Story:** As a user, I want to see the automatically generated revision history in the document preview, so that I can verify the tracking is working correctly.

#### Acceptance Criteria

1. THE DocumentPreview component SHALL display all Revision_Entry records in a table format
2. THE DocumentPreview component SHALL show Auto_Generated_Fields as read-only text
3. THE DocumentPreview component SHALL render the revision history table with proper formatting matching the template
4. WHEN no revision history exists, THE DocumentPreview component SHALL display the default first entry as a fallback
