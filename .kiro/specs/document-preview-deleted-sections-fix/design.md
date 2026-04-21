# Document Preview Deleted Sections Fix - Bugfix Design

## Overview

This bugfix addresses the issue where deleted sections continue to appear in the DocumentPreview component even after being removed from the database and `sectionContents` state. The root cause is that all sections render unconditionally, and the `getSectionContent()` helper returns an empty object `{}` for both "section exists but is empty" and "section has been deleted", making it impossible to distinguish between these states.

The fix introduces a `sectionExists()` helper function that explicitly checks if a section key exists in `sectionContents`, and wraps all deletable sections in conditional rendering. This ensures deleted sections immediately disappear from the preview without requiring a page refresh.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user deletes a section, it is removed from `sectionContents` but continues to render in DocumentPreview
- **Property (P)**: The desired behavior - deleted sections should immediately disappear from the preview
- **Preservation**: Existing rendering behavior for non-deleted sections, empty sections with placeholder text, and the non-deletable cover section must remain unchanged
- **sectionContents**: The state object in the Editor component that maps section keys to their content data
- **getSectionContent(key)**: Helper function that returns `sectionContents[key] || {}`, which cannot distinguish between deleted and empty sections
- **SectionWrapper**: React component that wraps each editable section with click handlers and visual feedback
- **deletable section**: Any section except the cover section, which can be deleted by the user via the SectionHeader delete button

## Bug Details

### Bug Condition

The bug manifests when a user clicks "Delete Section" on any deletable section in the Editor. The backend correctly removes the section from the database, and the Editor's `refreshSections()` function correctly rebuilds `sectionContents` without the deleted section's key. However, the DocumentPreview component continues to display the deleted section because all SectionWrapper blocks render unconditionally.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { sectionKey: string, sectionContents: Record<string, any> }
  OUTPUT: boolean
  
  RETURN input.sectionKey NOT IN keys(input.sectionContents)
         AND input.sectionKey != "cover"
         AND DocumentPreview renders SectionWrapper for input.sectionKey
END FUNCTION
```

### Examples

- **Example 1**: User deletes "abbreviations" section → Expected: section disappears from preview immediately; Actual: section remains visible with empty table until page refresh
- **Example 2**: User deletes "features" section → Expected: section disappears from preview immediately; Actual: section remains visible with placeholder text until page refresh
- **Example 3**: User deletes "hardware_specs" section → Expected: section disappears from preview immediately; Actual: section remains visible with empty table until page refresh
- **Edge case**: User deletes all sections in a group (e.g., all sections under "GENERAL OVERVIEW" heading) → Expected: group heading should also disappear if no sections remain

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Sections that exist in `sectionContents` but have empty content must continue to render with placeholder text
- The cover section must continue to render unconditionally since it cannot be deleted
- Section numbering must continue to skip deleted sections automatically as they are not rendered
- The backend delete endpoint, Editor's `refreshSections()`, and SectionHeader's delete flow must continue to work correctly without any changes
- All existing visual styling, hover effects, and click-to-edit functionality must remain unchanged

**Scope:**
All inputs that do NOT involve deleted sections (sections whose keys are missing from `sectionContents`) should be completely unaffected by this fix. This includes:
- Rendering of existing sections with content
- Rendering of existing sections with empty content (placeholder text)
- Rendering of the cover section
- Section numbering and counter management
- Click handlers and visual feedback
- Zoom controls and toolbar functionality

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Unconditional Rendering**: All SectionWrapper blocks in DocumentPreview.tsx render unconditionally without checking if their section key exists in `sectionContents`. The component assumes all sections always exist.

2. **Ambiguous Empty Object Return**: The `getSectionContent(key)` helper function returns `sectionContents[key] || {}`, which returns an empty object `{}` for both:
   - A section that exists but has no content (should render with placeholder)
   - A section that has been deleted (should not render at all)
   
   This makes it impossible for the rendering logic to distinguish between these two states.

3. **No Existence Check**: There is no helper function to check if a section key exists in `sectionContents`. The code only checks for content values, not key existence.

4. **Group Heading Rendering**: Group headings (like "GENERAL OVERVIEW", "OFFERINGS", etc.) render unconditionally even if all sections in the group have been deleted, leaving orphaned headings in the preview.

## Correctness Properties

Property 1: Bug Condition - Deleted Sections Disappear from Preview

_For any_ section key that does not exist in `sectionContents` (excluding the cover section), the fixed DocumentPreview component SHALL NOT render a SectionWrapper for that section, causing the deleted section to immediately disappear from the preview.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Deleted Section Behavior

_For any_ section key that exists in `sectionContents` (or is the cover section), the fixed DocumentPreview component SHALL produce exactly the same rendering behavior as the original component, preserving all existing functionality including placeholder text for empty sections, section numbering, visual styling, and click handlers.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `frontend/src/components/preview/DocumentPreview.tsx`

**Function**: `DocumentPreview` component (main render function)

**Specific Changes**:

1. **Add `sectionExists` Helper Function**: Create a new helper function that explicitly checks if a section key exists in `sectionContents`:
   ```typescript
   const sectionExists = (key: string): boolean => key in sectionContents;
   ```
   This function returns `true` if the key exists (even if the value is empty), and `false` if the key has been deleted.

2. **Wrap Deletable Sections in Conditional Rendering**: For every deletable section (all sections except cover), wrap the SectionWrapper in a conditional check:
   ```typescript
   {sectionExists('section_key') && (
     <SectionWrapper ... >
       {/* section content */}
     </SectionWrapper>
   )}
   ```

3. **Handle Group Headings Conditionally**: For group headings (H1 elements like "GENERAL OVERVIEW", "OFFERINGS", etc.), only render if at least one section in the group exists:
   ```typescript
   {(sectionExists('introduction') || sectionExists('abbreviations') || 
     sectionExists('process_flow') || sectionExists('overview')) && (
     <h1 style={heading1RedStyle}>
       {formatHeadingWithNumber("GENERAL OVERVIEW", `${getNextSectionNumber()}.`)}
     </h1>
   )}
   ```

4. **Wrap PageBreaks Conditionally**: Wrap PageBreak components in conditional checks to avoid extra page breaks when sections are deleted:
   ```typescript
   {(sectionExists('section_before') || sectionExists('section_after')) && <PageBreak />}
   ```

5. **Section Numbering Adjustment**: No changes needed - section numbering will naturally adjust because `getNextSectionNumber()` and `getNextSubsectionNumber()` are only called when sections actually render.

### Detailed Section-by-Section Changes

**Group 1: GENERAL OVERVIEW (Heading 1)**
- Conditionally render heading if any of: introduction, abbreviations, process_flow, overview exist
- Wrap each section: introduction, abbreviations, process_flow, overview

**Group 2: OFFERINGS (Heading 1)**
- Conditionally render heading if any of: features, remote_support, documentation_control, customer_training, system_config, fat_condition exist
- Wrap each section: features, remote_support, documentation_control, customer_training, system_config, fat_condition

**Group 3: TECHNOLOGY STACK (Heading 1)**
- Conditionally render heading if tech_stack exists
- Wrap section: tech_stack
- Wrap subsections: hardware_specs, software_specs, third_party_sw

**Group 4: SCHEDULE (Heading 1)**
- Conditionally render heading if any of: overall_gantt, shutdown_gantt, supervisors exist
- Wrap each section: overall_gantt, shutdown_gantt, supervisors

**Group 5: SCOPE OF SUPPLY (Heading 1)**
- Conditionally render heading if any of: scope_definitions, division_of_eng, value_addition, work_completion, buyer_obligations, exclusion_list, buyer_prerequisites, binding_conditions, cybersecurity exist
- Wrap each section: scope_definitions, division_of_eng, value_addition, work_completion, buyer_obligations, exclusion_list, buyer_prerequisites, binding_conditions, cybersecurity

**Group 6: DISCLAIMER (Heading 1)**
- Conditionally render heading if disclaimer exists
- Wrap section: disclaimer

**Group 7: PROOF OF CONCEPT (Heading 1)**
- Conditionally render heading if poc exists
- Wrap section: poc

**Non-deletable sections:**
- cover: No changes (always renders)
- revision_history: Wrap in conditional check
- Table of Contents placeholder: Wrap in conditional check

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate deleting sections and assert that the deleted sections do not render in the preview. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Single Section Delete Test**: Delete "abbreviations" section, verify it still renders in preview (will fail on unfixed code)
2. **Multiple Section Delete Test**: Delete "features" and "hardware_specs", verify they still render (will fail on unfixed code)
3. **Group Heading Test**: Delete all sections in "OFFERINGS" group, verify heading still renders (will fail on unfixed code)
4. **Empty vs Deleted Test**: Compare rendering of empty section vs deleted section, verify they render identically (will fail on unfixed code - should be different)

**Expected Counterexamples**:
- Deleted sections continue to render with placeholder text or empty tables
- Possible causes: unconditional rendering, no existence check, ambiguous empty object return

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (section key not in sectionContents), the fixed component does not render that section.

**Pseudocode:**
```
FOR ALL sectionKey WHERE sectionKey NOT IN sectionContents AND sectionKey != "cover" DO
  result := DocumentPreview_fixed({ sectionContents, ... })
  ASSERT result does NOT contain SectionWrapper for sectionKey
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (section key exists in sectionContents or is cover), the fixed component produces the same result as the original component.

**Pseudocode:**
```
FOR ALL sectionKey WHERE sectionKey IN sectionContents OR sectionKey == "cover" DO
  ASSERT DocumentPreview_original({ sectionContents, ... }) = DocumentPreview_fixed({ sectionContents, ... })
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for existing sections, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Existing Section Rendering Preservation**: Observe that sections with content render correctly on unfixed code, then write test to verify this continues after fix
2. **Empty Section Placeholder Preservation**: Observe that sections with empty content show placeholder text on unfixed code, then write test to verify this continues after fix
3. **Cover Section Preservation**: Observe that cover section always renders on unfixed code, then write test to verify this continues after fix
4. **Section Numbering Preservation**: Observe that section numbering works correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test `sectionExists()` helper function with various inputs (existing key, deleted key, cover key)
- Test conditional rendering for each section group
- Test group heading conditional rendering
- Test PageBreak conditional rendering
- Test that section numbering adjusts correctly when sections are deleted

### Property-Based Tests

- Generate random `sectionContents` objects with various combinations of existing/deleted sections
- Verify that only sections with keys in `sectionContents` (or cover) render
- Verify that deleted sections never render
- Generate random section content (empty vs filled) and verify placeholder text appears correctly
- Test that all existing sections continue to render with correct styling and functionality

### Integration Tests

- Test full delete flow: click delete button → verify backend removes section → verify Editor refreshes → verify preview updates immediately
- Test deleting multiple sections in sequence and verify preview updates after each deletion
- Test deleting all sections in a group and verify group heading disappears
- Test that undo/restore functionality (if implemented) correctly restores deleted sections to preview
