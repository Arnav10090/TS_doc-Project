# Sidebar Deleted Sections Fix - Bugfix Design

## Overview

The SectionSidebar component renders sections from a hardcoded `SECTION_GROUPS` array without checking whether those sections actually exist in the `sectionContents` state. When a user deletes a section, it's correctly removed from the database and `sectionContents`, but the sidebar continues to display the deleted section because it doesn't filter based on actual section existence.

The fix involves passing `sectionContents` from Editor.tsx to SectionSidebar.tsx as a prop, then filtering the rendered sections to only show those that exist in `sectionContents`. Category headers should only render if at least one section in that category exists. All existing functionality (completion stats, status badges, active highlighting, locked icons, generate button) must remain unchanged.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a section does not exist in `sectionContents` but is still rendered in the sidebar navigation
- **Property (P)**: The desired behavior - only sections that exist in `sectionContents` should be rendered in the sidebar
- **Preservation**: Existing sidebar functionality (completion stats, status badges, active highlighting, locked icons, category headers, generate button) that must remain unchanged by the fix
- **sectionContents**: The state object in Editor.tsx that maps section keys to their content data (type: `Record<string, Record<string, any>>`)
- **SECTION_GROUPS**: The hardcoded array in SectionSidebar.tsx that defines all possible sections organized by category
- **SectionSidebar**: The component in `frontend/src/components/layout/SectionSidebar.tsx` that renders the left navigation panel
- **Editor**: The parent component in `frontend/src/pages/Editor.tsx` that manages the `sectionContents` state

## Bug Details

### Bug Condition

The bug manifests when a section does not exist in `sectionContents` but the SectionSidebar still renders a navigation item for that section. The SectionSidebar component is iterating over the hardcoded `SECTION_GROUPS` array without checking whether each section key exists in `sectionContents`, causing deleted sections to remain visible in the navigation.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { sectionKey: string, sectionContents: Record<string, Record<string, any>> }
  OUTPUT: boolean
  
  RETURN input.sectionKey NOT IN keys(input.sectionContents)
         AND sidebarRendersNavigationItem(input.sectionKey)
END FUNCTION
```

### Examples

- **Example 1**: User deletes the "features" section → Expected: "Features" disappears from sidebar navigation → Actual: "Features" still appears in sidebar under "OFFERINGS" category
- **Example 2**: User deletes "executive_summary" section → Expected: "Executive Summary" disappears from sidebar navigation → Actual: "Executive Summary" still appears in sidebar under "GENERAL OVERVIEW" category
- **Example 3**: User deletes all sections in "TECHNOLOGY STACK" category → Expected: "TECHNOLOGY STACK" category header disappears from sidebar → Actual: Category header and all section titles still appear
- **Edge Case**: User deletes a locked section (e.g., "binding_conditions") → Expected: Section disappears from sidebar (if deletion is allowed) → Actual: Section still appears with lock icon

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Completion statistics calculation must continue to exclude auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions) from the count
- Section status badges must continue to show 'complete', 'visited', or 'not_started' status correctly
- Active section highlighting must continue to work with red background (#FFF0F0) and red border (#E60012)
- Locked section icons (🔒) must continue to display next to locked section labels
- Category headers must continue to display in uppercase with proper styling
- "Generate Document" button must continue to validate required sections and show missing section alerts
- Mouse hover effects on section navigation items must continue to work
- Clicking on existing section titles must continue to navigate correctly
- Resize handle functionality must continue to work
- Progress indicator (X / 27 sections complete) must continue to update correctly

**Scope:**
All inputs that involve sections that DO exist in `sectionContents` should be completely unaffected by this fix. This includes:
- Rendering existing sections in the navigation list
- Calculating completion statistics for existing sections
- Displaying status badges for existing sections
- Highlighting the active section if it exists
- All button click handlers and navigation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing Data Prop**: The SectionSidebar component does not receive `sectionContents` as a prop from Editor.tsx, so it has no way to know which sections actually exist in the database

2. **Unconditional Rendering**: The component iterates over `SECTION_GROUPS.map((group) => ...)` and renders all sections without any filtering logic to check if the section exists

3. **No Category Filtering**: Category headers are rendered unconditionally, even if all sections in that category have been deleted

4. **Hardcoded Array Dependency**: The component relies entirely on the static `SECTION_GROUPS` array rather than dynamically determining which sections to display based on actual data

## Correctness Properties

Property 1: Bug Condition - Deleted Sections Removed from Sidebar

_For any_ section key that does not exist in `sectionContents`, the fixed SectionSidebar component SHALL NOT render a navigation item for that section, ensuring deleted sections immediately disappear from the sidebar navigation.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Existing Section Rendering

_For any_ section key that DOES exist in `sectionContents`, the fixed SectionSidebar component SHALL produce exactly the same rendering behavior as the original component, preserving all existing functionality including status badges, active highlighting, locked icons, completion statistics, category headers, and the generate button.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/pages/Editor.tsx`

**Function**: `EditorPage` component

**Specific Changes**:
1. **Add sectionContents Prop to SectionSidebar**: Pass the `sectionContents` state to the SectionSidebar component
   - Modify the `<SectionSidebar>` JSX element to include `sectionContents={sectionContents}` prop
   - This enables the sidebar to access the current section data

**File**: `frontend/src/components/layout/SectionSidebar.tsx`

**Function**: `SectionSidebar` component

**Specific Changes**:
1. **Add sectionContents to Props Interface**: Update the `SectionSidebarProps` interface to include `sectionContents?: Record<string, Record<string, any>>`
   - Make it optional with default value to maintain backward compatibility

2. **Filter Sections Before Rendering**: Add filtering logic in the render method to only show sections that exist in `sectionContents`
   - Before mapping over `group.sections`, filter the array: `group.sections.filter(section => sectionContents?.[section.key])`
   - This ensures only existing sections are rendered

3. **Conditionally Render Category Headers**: Only render a category header if at least one section in that category exists
   - Calculate `const visibleSections = group.sections.filter(section => sectionContents?.[section.key])`
   - Wrap the category header and sections in a conditional: `{visibleSections.length > 0 && (...)}`
   - This prevents empty categories from appearing

4. **Handle Missing sectionContents Prop**: Add fallback behavior if `sectionContents` is undefined
   - Use optional chaining: `sectionContents?.[section.key]`
   - If `sectionContents` is undefined, render all sections (backward compatibility)

5. **Preserve All Existing Logic**: Ensure all existing functionality remains unchanged
   - Completion statistics calculation (excluding auto-complete sections)
   - Status badge rendering (`getSectionStatus` function)
   - Active section highlighting
   - Locked icon display
   - Generate button validation
   - Missing sections alert

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate deleting sections and verify that the sidebar still renders them. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Single Section Deletion Test**: Delete the "features" section and verify the sidebar still renders "Features" in the navigation (will fail on unfixed code - sidebar will still show the section)
2. **Multiple Section Deletion Test**: Delete "executive_summary" and "introduction" sections and verify the sidebar still renders both (will fail on unfixed code - sidebar will still show both sections)
3. **Full Category Deletion Test**: Delete all sections in "TECHNOLOGY STACK" category and verify the category header still appears (will fail on unfixed code - category header will still appear)
4. **Locked Section Deletion Test**: Delete a locked section (if allowed) and verify it still appears with lock icon (may fail on unfixed code - section may still appear)

**Expected Counterexamples**:
- Sidebar navigation items are rendered for sections that don't exist in `sectionContents`
- Possible causes: missing `sectionContents` prop, no filtering logic, unconditional category rendering

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL sectionKey WHERE sectionKey NOT IN keys(sectionContents) DO
  result := SectionSidebar_fixed({ sectionContents, ... })
  ASSERT NOT result.rendersNavigationItem(sectionKey)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL sectionKey WHERE sectionKey IN keys(sectionContents) DO
  originalResult := SectionSidebar_original({ sectionContents, ... })
  fixedResult := SectionSidebar_fixed({ sectionContents, ... })
  ASSERT originalResult.navigationItem(sectionKey) = fixedResult.navigationItem(sectionKey)
  ASSERT originalResult.statusBadge(sectionKey) = fixedResult.statusBadge(sectionKey)
  ASSERT originalResult.activeHighlight(sectionKey) = fixedResult.activeHighlight(sectionKey)
  ASSERT originalResult.completionStats = fixedResult.completionStats
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all existing sections

**Test Plan**: Observe behavior on UNFIXED code first for existing sections, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Existing Section Rendering Preservation**: Observe that existing sections render correctly with status badges on unfixed code, then write test to verify this continues after fix
2. **Completion Statistics Preservation**: Observe that completion stats calculate correctly (excluding auto-complete sections) on unfixed code, then write test to verify this continues after fix
3. **Active Highlighting Preservation**: Observe that active section highlighting works correctly on unfixed code, then write test to verify this continues after fix
4. **Generate Button Preservation**: Observe that generate button validation works correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that sections not in `sectionContents` are not rendered in the sidebar
- Test that sections in `sectionContents` are rendered correctly
- Test that category headers only appear when at least one section in that category exists
- Test that empty categories (all sections deleted) do not render
- Test that completion statistics calculation remains unchanged
- Test that status badges render correctly for existing sections
- Test that active section highlighting works for existing sections
- Test that locked icons display correctly for existing locked sections

### Property-Based Tests

- Generate random `sectionContents` objects with varying section keys and verify only those sections appear in the sidebar
- Generate random deletion scenarios (deleting 1-10 sections) and verify sidebar updates correctly
- Generate random section states (complete, visited, not_started) and verify status badges render correctly across many scenarios
- Test that completion statistics remain correct across many random section completion states

### Integration Tests

- Test full deletion flow: delete a section via API, verify sidebar updates immediately
- Test multiple deletions: delete several sections in sequence, verify sidebar updates after each deletion
- Test category collapse: delete all sections in a category, verify category header disappears
- Test navigation after deletion: delete a section, verify clicking on remaining sections still works correctly
- Test generate button after deletion: delete required sections, verify missing sections alert appears correctly
