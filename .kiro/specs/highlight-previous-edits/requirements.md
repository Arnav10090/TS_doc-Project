# Requirements Document

## Introduction

This document specifies requirements for a visual highlighting feature in the TS Document Generator's Word preview panel. The feature enables users to identify sections that were edited during their previous work session by applying orange visual highlights. This helps users quickly resume work by showing what they modified last time they worked on the project.

## Glossary

- **Editor**: The main page component (Editor.tsx) that manages project state and coordinates between sidebar, input panel, and preview
- **DocumentPreview**: The Word preview component that renders the document with visual styling
- **SectionWrapper**: A component within DocumentPreview that wraps each section and applies conditional styling
- **LocalStorage**: Browser-based persistent storage mechanism that survives page refreshes and browser sessions
- **Session**: A continuous period of work on a project, from opening to closing/navigating away
- **Previous_Session**: The most recently completed work session before the current one
- **Current_Session**: The active work session where the user is currently editing
- **Section_Key**: A unique string identifier for each document section (e.g., "cover", "introduction", "features")
- **Active_Section**: The section currently selected for editing, highlighted in yellow (#FFF9C4)
- **Orange_Accent_2**: Microsoft Word standard color (#ED7D31) used for previous-edit highlighting
- **SectionSidebar**: The left sidebar component displaying the list of all sections with completion badges

## Requirements

### Requirement 1: Track Last-Session Edits with LocalStorage

**User Story:** As a user, I want the system to remember which sections I edited in my previous session, so that I can quickly identify where I left off when I reopen the project.

#### Acceptance Criteria

1. WHEN a section is successfully saved via upsertSection (autosave or Save button), THE Editor SHALL add the section_key to an in-memory set tracking current session edits
2. WHEN a section is successfully saved via upsertSection, THE Editor SHALL write the updated current session edits set to localStorage using key pattern `edited_sections_<projectId>` as a JSON array
3. WHEN the Editor loads a project on mount, THE Editor SHALL read the localStorage entry `edited_sections_<projectId>` into a state variable `lastEditedSections` as a string array
4. WHEN the Editor loads a project and no localStorage entry exists for that projectId, THE Editor SHALL initialize `lastEditedSections` as an empty array
5. WHEN the Editor passes props to DocumentPreview, THE Editor SHALL include `lastEditedSections` as a new prop
6. THE Editor SHALL maintain two separate tracking mechanisms: `lastEditedSections` (from previous session, read-only) and `currentSessionEdits` (in-memory set for current session)
7. WHEN a user navigates away from the project or closes the browser, THE localStorage entry SHALL persist unchanged
8. FOR ALL projects, THE localStorage keys SHALL be namespaced by projectId to prevent cross-project contamination

### Requirement 2: Visual Highlighting in Word Preview

**User Story:** As a user, I want to see orange highlights on previously edited sections in the Word preview, so that I can visually identify which sections I worked on last time.

#### Acceptance Criteria

1. WHEN DocumentPreview receives the `lastEditedSections` prop, THE DocumentPreview SHALL accept it in its props interface as `lastEditedSections: string[]`
2. WHEN the sectionStyle function evaluates a section_key that is in `lastEditedSections` AND is NOT the currently active section, THE sectionStyle function SHALL apply a left border of `3px solid #ED7D31`
3. WHEN the sectionStyle function evaluates a section_key that is in `lastEditedSections` AND is NOT the currently active section, THE sectionStyle function SHALL apply a background color of `#FFF3EC`
4. WHEN a section is both in `lastEditedSections` AND is the active section, THE sectionStyle function SHALL apply the active section styling (yellow background #FFF9C4 with red left border) and NOT the orange highlight
5. WHEN a section is both in `lastEditedSections` AND is hovered, THE sectionStyle function SHALL apply the hover styling (blue border #BFDBFE) and NOT the orange highlight
6. THE orange highlight SHALL only be visible in the DocumentPreview component and NOT in the section input panel
7. THE exact color value for Orange Accent 2 SHALL be `#ED7D31` (Microsoft Word standard)
8. THE exact color value for the light orange background SHALL be `#FFF3EC`

### Requirement 3: Highlight Removal on Current Session Edit

**User Story:** As a user, I want orange highlights to disappear once I edit those sections in my current session, so that the highlights only show sections I haven't touched yet today.

#### Acceptance Criteria

1. WHEN a section in `lastEditedSections` is saved during the current session, THE Editor SHALL add that section_key to the `currentSessionEdits` in-memory set
2. WHEN a section_key exists in both `lastEditedSections` and `currentSessionEdits`, THE DocumentPreview SHALL NOT apply orange highlighting to that section
3. WHEN all sections in `lastEditedSections` have been edited in the current session, THE DocumentPreview SHALL display no orange highlights
4. THE `currentSessionEdits` set SHALL be maintained only in memory and SHALL NOT be persisted to localStorage during the current session
5. WHEN the current session ends (user navigates away or closes browser), THE `currentSessionEdits` SHALL be written to localStorage as the new `edited_sections_<projectId>` value

### Requirement 4: Persistence Across Page Refreshes

**User Story:** As a user, I want the orange highlights to persist when I refresh the page, so that I don't lose track of my previous work.

#### Acceptance Criteria

1. WHEN a user refreshes the page during a session, THE Editor SHALL reload `lastEditedSections` from localStorage
2. WHEN a user refreshes the page during a session, THE DocumentPreview SHALL display orange highlights for all sections in `lastEditedSections` that have not been edited in the current session
3. WHEN a user refreshes the page, THE `currentSessionEdits` in-memory set SHALL be reset to empty
4. WHEN a user edits sections after a page refresh, THE Editor SHALL rebuild the `currentSessionEdits` set based on saves that occur after the refresh

### Requirement 5: Optional Sidebar Indicator

**User Story:** As a user, I want to see a visual indicator in the section sidebar for previously edited sections, so that I can identify them without looking at the preview panel.

#### Acceptance Criteria

1. WHERE the SectionSidebar component is modified, WHEN a section_key is in `lastEditedSections`, THE SectionSidebar SHALL display a small orange dot indicator next to the section label
2. WHERE the SectionSidebar component is modified, WHEN a section_key is in `lastEditedSections`, THE SectionSidebar MAY display the text "(edited)" next to the section label as an alternative to the orange dot
3. WHERE the SectionSidebar component is modified, THE indicator SHALL be purely visual and SHALL NOT change any click behavior or section navigation
4. WHERE the SectionSidebar component is modified, THE indicator SHALL use the same orange color (#ED7D31) as the preview highlighting

### Requirement 6: No Backend Modifications

**User Story:** As a developer, I want this feature to be implemented entirely in the frontend, so that no backend changes or database migrations are required.

#### Acceptance Criteria

1. THE feature SHALL NOT modify any backend models or database schemas
2. THE feature SHALL NOT create or modify any API endpoints
3. THE feature SHALL NOT modify the SectionData model's `updated_at` timestamp behavior
4. THE feature SHALL use localStorage as the sole persistence mechanism
5. THE feature SHALL NOT modify the `upsertSection` API function signature or behavior

### Requirement 7: No Impact on Existing Functionality

**User Story:** As a user, I want the new highlighting feature to work alongside existing features without breaking anything, so that my current workflow remains unchanged.

#### Acceptance Criteria

1. THE feature SHALL NOT modify the active section highlight (yellow #FFF9C4 with red left border)
2. THE feature SHALL NOT modify the hover highlight behavior (blue border #BFDBFE)
3. THE feature SHALL NOT modify section completion logic or the 4 auto-complete sections exclusion
4. THE feature SHALL NOT modify completion percentage calculation
5. THE feature SHALL NOT change click-to-edit behavior in the preview panel
6. THE feature SHALL NOT affect section save behavior (autosave or manual save)
7. THE feature SHALL NOT modify any section component files
8. THE feature SHALL NOT modify the SectionHeader component

### Requirement 8: Fresh Project Behavior

**User Story:** As a user, I want no orange highlights to appear when I create a new project, so that the feature only activates after I've completed at least one work session.

#### Acceptance Criteria

1. WHEN a project is newly created and has no `edited_sections_<projectId>` entry in localStorage, THE DocumentPreview SHALL display no orange highlights
2. WHEN a user edits and saves sections in a fresh project, THE Editor SHALL create the `edited_sections_<projectId>` localStorage entry
3. WHEN a user closes and reopens a project after the first session, THE DocumentPreview SHALL display orange highlights for sections edited in that first session
