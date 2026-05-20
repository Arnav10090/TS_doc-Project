# Requirements Document

## Introduction

This document specifies requirements for adding an explicit Save button to every section in the right-side Section Input Panel of the TS Document Generator application. The Save button will provide immediate save functionality alongside the existing autosave mechanism, enabling users to manually trigger saves and see instant preview updates.

## Glossary

- **Section_Input_Panel**: The right-side panel in the Editor that displays form inputs for editing section content
- **Section_Header**: A shared React component that displays the section title, save status, and delete button at the top of each section
- **Section_Component**: One of 31 React components (e.g., CoverSection, ExecutiveSummary) that render section-specific form inputs
- **Document_Preview**: The center panel that displays a live Word document preview
- **Auto_Save_Hook**: The useAutoSave React hook that debounces API saves by 800ms
- **Save_Button**: The new explicit Save button to be added to Section_Header
- **Content_Change_Callback**: The onContentChange callback function that propagates content updates from Section_Component to Editor to Document_Preview
- **Immediate_Save**: A save operation that executes without debounce delay, triggered by Save_Button click
- **Backend_API**: The FastAPI backend that persists section data via the upsertSection endpoint
- **Save_Status**: Visual indicator showing saving/saved/error states in Section_Header

## Requirements

### Requirement 1: Add Save Button to Section Header

**User Story:** As a user, I want to see a Save button in every section header, so that I can explicitly trigger saves when needed.

#### Acceptance Criteria

1. THE Section_Header SHALL display a Save_Button adjacent to the existing save status indicator
2. THE Save_Button SHALL use Hitachi red (#E60012) as the primary color
3. THE Save_Button SHALL display the text "Save" by default
4. THE Save_Button SHALL be visually consistent with the existing Delete button styling
5. THE Save_Button SHALL appear in all 31 Section_Components without requiring individual component modifications beyond prop passing

### Requirement 2: Immediate Save Functionality

**User Story:** As a user, I want the Save button to immediately save my changes, so that I can control when saves occur without waiting for autosave.

#### Acceptance Criteria

1. WHEN the Save_Button is clicked, THE Section_Component SHALL immediately invoke the Content_Change_Callback with current content
2. WHEN the Save_Button is clicked, THE Section_Component SHALL immediately call the Backend_API upsertSection endpoint without debounce delay
3. WHEN the Content_Change_Callback is invoked, THE Document_Preview SHALL re-render with the updated content in real time
4. WHEN the Backend_API save completes successfully, THE Save_Button text SHALL briefly change to "Saved ✓" for 2 seconds
5. WHEN the Backend_API save fails, THE Save_Status SHALL display "Error saving"
6. FOR ALL Section_Components, clicking Save_Button then waiting 100ms SHALL result in Document_Preview displaying the saved content (round-trip property)

### Requirement 3: Save Button State Management

**User Story:** As a user, I want the Save button to show its current state, so that I know when a save is in progress.

#### Acceptance Criteria

1. WHILE a save operation is in progress, THE Save_Button SHALL be disabled
2. WHILE a save operation is in progress, THE Save_Button SHALL display the text "Saving..."
3. WHILE a save operation is in progress, THE Save_Button cursor SHALL change to "not-allowed"
4. WHEN no save operation is in progress, THE Save_Button SHALL be enabled
5. WHEN the save completes successfully, THE Save_Button SHALL display "Saved ✓" for exactly 2 seconds then revert to "Save"

### Requirement 4: Coexistence with Autosave

**User Story:** As a user, I want both autosave and manual save to work together, so that I have flexibility in how I save my work.

#### Acceptance Criteria

1. THE Auto_Save_Hook debounce behavior SHALL remain unchanged at 800ms
2. WHEN a user types in a Section_Component, THE Auto_Save_Hook SHALL trigger after 800ms of inactivity
3. WHEN a user clicks Save_Button before the 800ms debounce completes, THE Immediate_Save SHALL execute without waiting
4. WHEN a user clicks Save_Button, THE Auto_Save_Hook debounce timer SHALL be cleared to prevent duplicate saves
5. FOR ALL Section_Components, both autosave and manual save SHALL persist identical content to Backend_API (idempotence property)

### Requirement 5: Callback Propagation Architecture

**User Story:** As a developer, I want a clean callback propagation pattern, so that Save button functionality is maintainable and consistent.

#### Acceptance Criteria

1. THE Section_Header SHALL accept an onSave prop of type () => void
2. WHEN onSave is provided, THE Section_Header SHALL invoke it when Save_Button is clicked
3. THE Section_Component SHALL pass an onSave callback to Section_Header that captures current content state
4. WHEN the onSave callback is invoked, THE Section_Component SHALL call Content_Change_Callback with current content
5. THE Section_Input_Panel SHALL pass the Content_Change_Callback from Editor to Section_Component via onContentChange prop

### Requirement 6: Auto Save Hook Enhancement

**User Story:** As a developer, I want the useAutoSave hook to expose an immediate save function, so that Save button can trigger non-debounced saves.

#### Acceptance Criteria

1. THE Auto_Save_Hook SHALL expose a saveNow function that accepts content as a parameter
2. WHEN saveNow is called, THE Auto_Save_Hook SHALL immediately call Backend_API upsertSection without debounce
3. WHEN saveNow is called, THE Auto_Save_Hook SHALL immediately invoke Content_Change_Callback if provided
4. WHEN saveNow is called, THE Auto_Save_Hook SHALL clear any pending debounce timer
5. WHEN saveNow is called, THE Auto_Save_Hook SHALL update Save_Status to "saving" then "saved" or "error"
6. FOR ALL valid content objects, calling saveNow(content) then save(content) SHALL result in Backend_API receiving identical content (confluence property)

### Requirement 7: Minimal Section Component Changes

**User Story:** As a developer, I want to minimize changes to 31 section components, so that implementation is efficient and low-risk.

#### Acceptance Criteria

1. THE Section_Component modifications SHALL be limited to mechanical prop passing only
2. THE Section_Component SHALL NOT require new state management logic beyond existing patterns
3. THE Section_Component SHALL pass onSave callback to Section_Header that invokes saveNow from Auto_Save_Hook
4. THE Section_Component SHALL continue using the existing save function from Auto_Save_Hook for autosave
5. FOR ALL 31 Section_Components, the modification pattern SHALL be identical (uniformity property)

### Requirement 8: Visual Feedback and Accessibility

**User Story:** As a user, I want clear visual feedback when I click Save, so that I know my action was successful.

#### Acceptance Criteria

1. WHEN Save_Button is clicked, THE Save_Status SHALL immediately change to "Saving..."
2. WHEN the save completes successfully, THE Save_Button SHALL display "Saved ✓" with a green checkmark
3. WHEN the save fails, THE Save_Status SHALL display "Error saving" in red (#E60012)
4. THE Save_Button SHALL have hover effects consistent with existing button patterns
5. THE Save_Button SHALL be keyboard accessible via Tab and Enter keys

### Requirement 9: Error Handling and Recovery

**User Story:** As a user, I want to know when saves fail and be able to retry, so that I don't lose my work.

#### Acceptance Criteria

1. IF the Backend_API returns an error, THEN THE Save_Status SHALL display "Error saving"
2. IF the Backend_API returns an error, THEN THE Save_Button SHALL remain enabled for retry
3. WHEN a save error occurs, THE Auto_Save_Hook SHALL log the error to the browser console
4. WHEN a save error occurs, THE Save_Button SHALL NOT display "Saved ✓"
5. WHEN the user clicks Save_Button after an error, THE Auto_Save_Hook SHALL retry the save operation

### Requirement 10: Performance and Responsiveness

**User Story:** As a user, I want the Save button to respond instantly, so that the interface feels responsive.

#### Acceptance Criteria

1. WHEN Save_Button is clicked, THE Save_Status SHALL update within 50ms
2. WHEN Save_Button is clicked, THE Content_Change_Callback SHALL be invoked within 50ms
3. WHEN Save_Button is clicked, THE Backend_API request SHALL be initiated within 100ms
4. THE Save_Button click handler SHALL NOT block the UI thread
5. FOR ALL Section_Components with content size < 100KB, clicking Save_Button SHALL complete the save within 500ms under normal network conditions

