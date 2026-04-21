# Bugfix Requirements Document

## Introduction

The section count display shows an incorrect total when sections are deleted. This bug appears in four locations across the frontend and backend:

1. **SectionSidebar.tsx (line 127)**: The total is hardcoded to 27 sections
2. **DocumentPreview.tsx (line 884)**: The total is hardcoded to 27 sections in the preview header
3. **Home.tsx (line 141)**: The total is hardcoded to 27 in the project card display calculation
4. **router.py (line 80)**: The completion percentage calculation uses hardcoded 27 instead of actual section count

All locations should dynamically reflect the actual number of existing sections, excluding the 4 auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions).

This causes confusion for users who delete sections and see inconsistent counts like "14 / 27 sections" when it should show "14 / 24 sections" after 3 deletions. The bug manifests across the sidebar, document preview, home page project cards, and backend API responses.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN sections are deleted from the project THEN the system displays an incorrect total count that remains at 27 in the sidebar

1.2 WHEN the sidebar renders with fewer sections in `sectionContents` THEN the system shows "X / 27 sections complete" regardless of actual section count

1.3 WHEN 3 sections are deleted THEN the system displays "14 / 27 sections" in the sidebar instead of "14 / 24 sections"

1.4 WHEN sections are deleted from the project THEN the document preview displays an incorrect total count that remains at 27

1.5 WHEN the document preview renders with fewer sections in `sectionContents` THEN the system shows "Preview - X / 27 complete" regardless of actual section count

1.6 WHEN 3 sections are deleted THEN the document preview displays "Preview - 14 / 27 complete" instead of "Preview - 14 / 24 complete"

1.7 WHEN sections are deleted from the project THEN the Home page project card displays an incorrect total count that remains at 27

1.8 WHEN the Home page renders project cards THEN the system calculates section count as `Math.round((completion_percentage / 100) * 27)` using hardcoded 27

1.9 WHEN 3 sections are deleted THEN the Home page displays "14 / 27 sections" instead of "14 / 24 sections"

1.10 WHEN the backend calculates completion percentage THEN the system uses hardcoded 27 in the formula `(completed_count / 27) * 100`

1.11 WHEN 3 sections are deleted THEN the backend calculates completion percentage as `(14 / 27) * 100 = 51%` instead of `(14 / 24) * 100 = 58%`

1.12 WHEN the backend has access to `sections_dict` containing all sections THEN the system ignores the actual section count and uses hardcoded 27

### Expected Behavior (Correct)

2.1 WHEN sections are deleted from the project THEN the system SHALL dynamically calculate the total in sidebar, preview, and Home page based on actual section count

2.2 WHEN the sidebar or preview renders THEN the system SHALL exclude the 4 auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions) from the total count

2.3 WHEN 3 sections are deleted THEN the sidebar SHALL display "14 / 24 sections complete" reflecting the actual remaining sections

2.4 WHEN 3 sections are deleted THEN the document preview SHALL display "Preview - 14 / 24 complete" reflecting the actual remaining sections

2.5 WHEN the `sectionContents` prop changes THEN the system SHALL immediately update the total section count in the sidebar progress indicator and preview header

2.6 WHEN the `sectionContents` prop is undefined THEN the system SHALL fallback to 27 for backward compatibility

2.7 WHEN the backend calculates completion percentage THEN the system SHALL use the actual section count from `sections_dict`: `len(sections_dict) - 4`

2.8 WHEN 3 sections are deleted THEN the backend SHALL calculate completion percentage as `(14 / 24) * 100 = 58%` instead of `(14 / 27) * 100 = 51%`

2.9 WHEN the backend returns project summaries THEN the system SHALL include a `total_sections` field in the ProjectSummary schema

2.10 WHEN the Home page renders project cards THEN the system SHALL display the section count using `project.total_sections` from the API response

2.11 WHEN 3 sections are deleted THEN the Home page SHALL display "14 / 24 sections" using the `total_sections` field from the backend

### Unchanged Behavior (Regression Prevention)

3.1 WHEN calculating completed sections THEN the system SHALL CONTINUE TO exclude the 4 auto-complete sections from the completed count in sidebar, preview, and backend

3.2 WHEN no sections are deleted THEN the system SHALL CONTINUE TO display "X / 27 sections complete" in the sidebar, "Preview - X / 27 complete" in the preview, and "X / 27 sections" on the Home page for a full project

3.3 WHEN filtering visible sections for rendering THEN the system SHALL CONTINUE TO use the existing `visibleSections` logic in the sidebar

3.4 WHEN displaying the completion percentage THEN the system SHALL CONTINUE TO calculate it as `(completedCount / totalCompletable) * 100` in all components

3.5 WHEN sections are locked or have special properties THEN the system SHALL CONTINUE TO handle them correctly in the sidebar display

3.6 WHEN the document preview renders THEN the system SHALL CONTINUE TO correctly calculate `completedCount` excluding the 4 auto-complete sections (lines 165-176)

3.7 WHEN the backend returns project summaries THEN the system SHALL CONTINUE TO return all existing fields (id, solution_name, client_name, client_location, created_at, completion_percentage)

3.8 WHEN the frontend receives project summaries THEN the system SHALL CONTINUE TO display all existing project information correctly

3.9 WHEN the backend calculates `completed_count` THEN the system SHALL CONTINUE TO exclude the 4 auto-complete sections from the completed count
