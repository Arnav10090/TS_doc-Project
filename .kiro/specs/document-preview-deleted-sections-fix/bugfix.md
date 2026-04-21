# Bugfix Requirements Document

## Introduction

When a user deletes a section in the Editor, the backend correctly removes the section from the database, and the Editor's `refreshSections()` function correctly rebuilds the `sectionContents` state without the deleted section's key. However, the DocumentPreview component continues to display the deleted section in the Word layout preview panel because it renders all sections unconditionally without checking whether they exist in `sectionContents`.

The root cause is that the `getSectionContent()` helper function returns an empty object `{}` for both "section exists but is empty" and "section has been deleted", making it impossible for the preview to distinguish between these two states. As a result, deleted sections remain visible in the preview until the page is refreshed.

This bugfix ensures that deleted sections are immediately removed from the preview by conditionally rendering each deletable section only when its key exists in the `sectionContents` object.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Delete Section" on any deletable section in the editor THEN the section is removed from the database and from `sectionContents` state, but the section continues to appear in the DocumentPreview component

1.2 WHEN `getSectionContent(key)` is called for a deleted section key THEN it returns an empty object `{}`, which is indistinguishable from an empty but existing section

1.3 WHEN the DocumentPreview component renders THEN all SectionWrapper blocks render unconditionally regardless of whether their section key exists in `sectionContents`

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Delete Section" on any deletable section in the editor THEN the section SHALL be removed from the database, from `sectionContents` state, AND SHALL immediately disappear from the DocumentPreview component

2.2 WHEN `getSectionContent(key)` is called for a deleted section key THEN the preview SHALL check if the key exists in `sectionContents` before rendering the section

2.3 WHEN the DocumentPreview component renders THEN each deletable SectionWrapper block SHALL render conditionally only if its section key exists in `sectionContents`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a section exists in `sectionContents` but has empty content THEN the system SHALL CONTINUE TO render the section with placeholder text

3.2 WHEN the cover section is rendered THEN the system SHALL CONTINUE TO render it unconditionally since it cannot be deleted

3.3 WHEN section numbering is calculated THEN the system SHALL CONTINUE TO skip deleted sections automatically as they are not rendered

3.4 WHEN a user deletes a section THEN the backend delete endpoint, Editor's `refreshSections()`, and SectionHeader's delete flow SHALL CONTINUE TO work correctly without any changes

3.5 WHEN a section is not deleted but simply has no content THEN the system SHALL CONTINUE TO display the section with appropriate placeholder text
