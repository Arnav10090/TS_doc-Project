# Bugfix Requirements Document

## Introduction

When a user deletes a section in the Editor, the section is correctly removed from the database and from the `sectionContents` state. The DocumentPreview component correctly hides the deleted section. However, the SectionSidebar component continues to display the deleted section's title in the left navigation panel because it renders sections from a hardcoded `SECTION_GROUPS` array without checking whether those sections actually exist in `sectionContents`.

This bugfix ensures that deleted sections are immediately removed from the sidebar navigation, providing consistent behavior across all UI components.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user deletes a section THEN the SectionSidebar continues to display the deleted section's title in the navigation list

1.2 WHEN a section does not exist in `sectionContents` THEN the SectionSidebar still renders a navigation item for that section from the hardcoded `SECTION_GROUPS` array

1.3 WHEN a user clicks on a deleted section's title in the sidebar THEN the system navigates to a non-existent section

### Expected Behavior (Correct)

2.1 WHEN a user deletes a section THEN the SectionSidebar SHALL immediately remove the deleted section's title from the navigation list

2.2 WHEN a section does not exist in `sectionContents` THEN the SectionSidebar SHALL NOT render a navigation item for that section

2.3 WHEN the sidebar renders its navigation list THEN the SectionSidebar SHALL only display sections that exist in `sectionContents`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a section exists in `sectionContents` THEN the SectionSidebar SHALL CONTINUE TO display that section's title in the navigation list

3.2 WHEN a user clicks on an existing section's title in the sidebar THEN the system SHALL CONTINUE TO navigate to that section correctly

3.3 WHEN calculating completion statistics THEN the SectionSidebar SHALL CONTINUE TO exclude auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions) from the count

3.4 WHEN rendering section status badges THEN the SectionSidebar SHALL CONTINUE TO show 'complete', 'visited', or 'not_started' status correctly

3.5 WHEN a section is locked THEN the SectionSidebar SHALL CONTINUE TO display the lock icon (🔒) next to the section label

3.6 WHEN the active section exists THEN the SectionSidebar SHALL CONTINUE TO highlight it with the red background (#FFF0F0) and red border (#E60012)

3.7 WHEN displaying category headers THEN the SectionSidebar SHALL CONTINUE TO show them in uppercase with proper styling

3.8 WHEN the "Generate Document" button is clicked THEN the SectionSidebar SHALL CONTINUE TO validate required sections and show missing section alerts
