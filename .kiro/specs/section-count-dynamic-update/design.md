# Section Count Dynamic Update Bugfix Design

## Overview

The section count display shows an incorrect total because `totalCompletable` is hardcoded to 27 in four locations:

1. **SectionSidebar.tsx (line 127)**: `const totalCompletable = 27;`
2. **DocumentPreview.tsx (line 884)**: Displays `Preview - {completedCount} / 27 complete`
3. **Home.tsx (line 141)**: Calculates `Math.round((project.completion_percentage / 100) * 27)`
4. **router.py (line 80)**: Calculates `completion_percentage = int((completed_count / 27) * 100)`

When sections are deleted, the total remains at 27 in all locations, causing confusion with displays like "14 / 27 sections" when it should show "14 / 24 sections" after 3 deletions. Additionally, the backend calculates an incorrect completion percentage (51% instead of 58% for 14/24 sections).

The fix will:
1. Dynamically calculate the total in the frontend components based on `sectionContents`
2. Fix the backend completion percentage calculation to use actual section count from `sections_dict`
3. Add a `total_sections` field to the ProjectSummary schema and API response
4. Update Home.tsx to use `project.total_sections` from the API instead of calculating from percentage

This ensures the total count and completion percentage accurately reflect the current state of the project across all components.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when sections are deleted but the total count remains hardcoded at 27, or when completion percentage is calculated with hardcoded 27
- **Property (P)**: The desired behavior - total count should dynamically reflect actual sections, and completion percentage should use actual section count
- **Preservation**: Existing completion calculation, percentage display, section filtering logic, and API response fields that must remain unchanged
- **totalCompletable**: The variable that stores the total number of sections (currently hardcoded to 27 in multiple locations)
- **sectionContents**: The prop containing all section data, used to determine which sections exist in the project (frontend)
- **sections_dict**: The dictionary containing all section data in the backend, used to determine actual section count
- **excludedSections**: The 4 auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions) that are excluded from both completed and total counts
- **visibleSections**: The filtered list of sections that exist in `sectionContents`, used for rendering section groups (frontend)
- **ProjectSummary**: The schema/interface for project summary data returned by the API and displayed on the Home page
- **total_sections**: New field to be added to ProjectSummary containing the actual section count

## Bug Details

### Bug Condition

The bug manifests when sections are deleted from the project and any of the following occurs:
1. The sidebar or document preview re-renders - total count remains at 27
2. The Home page displays project cards - total count remains at 27
3. The backend calculates completion percentage - uses hardcoded 27 instead of actual count

**Locations:**
- **SectionSidebar.tsx**: The `totalCompletable` variable on line 127 remains at 27
- **DocumentPreview.tsx**: The hardcoded value on line 884 displays "/ 27 complete"
- **Home.tsx**: The calculation on line 141 uses hardcoded 27: `Math.round((project.completion_percentage / 100) * 27)`
- **router.py**: The calculation on line 80 uses hardcoded 27: `completion_percentage = int((completed_count / 27) * 100)`

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { 
    sectionContents: Record<string, any>, 
    totalCompletable: number,
    sections_dict: dict (backend)
  }
  OUTPUT: boolean
  
  actualSectionCount := COUNT(keys in input.sectionContents or sections_dict) - 4
  
  RETURN actualSectionCount < 27
         AND (input.totalCompletable == 27 OR hardcoded_value_used == 27)
         AND actualSectionCount != displayed_or_calculated_total
END FUNCTION
```

### Examples

- **Example 1 (Sidebar)**: User deletes 3 sections → `sectionContents` has 24 sections → Sidebar shows "14 / 27 sections" (incorrect) instead of "14 / 24 sections" (correct)
- **Example 2 (Preview)**: User deletes 3 sections → `sectionContents` has 24 sections → Preview shows "Preview - 14 / 27 complete" (incorrect) instead of "Preview - 14 / 24 complete" (correct)
- **Example 3 (Home)**: User deletes 3 sections → Backend returns 58% completion → Home calculates `Math.round((58 / 100) * 27) = 16` and shows "16 / 27 sections" (incorrect) instead of using `total_sections: 24` to show "14 / 24 sections" (correct)
- **Example 4 (Backend)**: User deletes 3 sections → `sections_dict` has 24 sections → Backend calculates `(14 / 27) * 100 = 51%` (incorrect) instead of `(14 / 24) * 100 = 58%` (correct)
- **Example 5 (Sidebar)**: User deletes 5 sections → `sectionContents` has 22 sections → Sidebar shows "10 / 27 sections" (incorrect) instead of "10 / 22 sections" (correct)
- **Example 6 (Preview)**: User deletes 5 sections → `sectionContents` has 22 sections → Preview shows "Preview - 10 / 27 complete" (incorrect) instead of "Preview - 10 / 22 complete" (correct)
- **Edge case**: No sections deleted → All locations have 27 sections → All display "X / 27" (correct, should remain unchanged)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The calculation of `completedCount` must continue to exclude the 4 auto-complete sections from the completed count in sidebar, preview, and backend
- The completion percentage calculation `(completedCount / totalCompletable) * 100` must continue to work correctly in all components
- The `visibleSections` filtering logic that checks `sectionContents?.[section.key]` must remain unchanged in the sidebar
- Section status determination (complete, visited, not_started) must continue to work as before in the sidebar
- All UI rendering, styling, and interaction behaviors must remain unchanged in all frontend components
- The document preview's `completedCount` calculation (lines 165-176) must continue to correctly exclude the 4 auto-complete sections
- The backend API must continue to return all existing ProjectSummary fields (id, solution_name, client_name, client_location, created_at, completion_percentage)
- The frontend must continue to display all existing project information correctly on the Home page

**Scope:**
All inputs that do NOT involve changes to the number of sections should be completely unaffected by this fix. This includes:
- Mouse clicks on sections
- Section completion status updates
- Document generation functionality
- Sidebar resizing behavior
- Missing sections alert display
- Document preview rendering and scrolling
- Project card styling and layout on Home page
- API response structure (except for the new `total_sections` field)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is identical across all four locations:

**SectionSidebar.tsx:**
1. **Hardcoded Value**: Line 127 contains `const totalCompletable = 27;` which is a static value that never changes
2. **Missing Dynamic Calculation**: The code does not calculate the total based on `sectionContents`, even though this prop is available and already used for filtering visible sections
3. **Inconsistent Logic**: The `completedCount` calculation (lines 119-125) correctly uses dynamic filtering with `Object.entries(sectionCompletion)`, but `totalCompletable` does not follow the same pattern
4. **Prop Availability**: The `sectionContents` prop is already passed to the component and used in the rendering logic (line 308), but is not utilized for calculating the total count

**DocumentPreview.tsx:**
1. **Hardcoded Value**: Line 884 contains the hardcoded string `Preview - {completedCount} / 27 complete` with a static value that never changes
2. **Missing Dynamic Calculation**: The code does not calculate the total based on `sectionContents`, even though this prop is available (lines 23-26)
3. **Inconsistent Logic**: The `completedCount` calculation (lines 165-176) correctly uses dynamic filtering and excludes the 4 auto-complete sections, but the total count does not follow the same pattern
4. **Prop Availability**: The `sectionContents` prop is already passed to the component but is not utilized for calculating the total count in the display string

**Home.tsx:**
1. **Hardcoded Value**: Line 141 contains `Math.round((project.completion_percentage / 100) * 27)` which uses a static value of 27
2. **Missing Data**: The `ProjectSummary` type doesn't include a `total_sections` field, so the frontend has no way to know the actual section count
3. **Incorrect Calculation**: The code attempts to reverse-calculate the section count from the completion percentage, which is mathematically incorrect and compounds the backend bug
4. **Data Dependency**: This bug cannot be fully fixed without the backend providing the actual section count in the API response

**router.py (Backend):**
1. **Hardcoded Value**: Line 80 contains `completion_percentage = int((completed_count / 27) * 100)` which uses a static value of 27
2. **Missing Dynamic Calculation**: The code does not calculate the total based on `sections_dict`, even though this data is available on line 73
3. **Inconsistent Logic**: The `completed_count` calculation (lines 75-78) correctly uses dynamic filtering with `completion_map.items()` and excludes the 4 auto-complete sections, but the total count does not follow the same pattern
4. **Data Availability**: The `sections_dict` is already built and contains all sections, making it trivial to calculate `len(sections_dict) - 4`
5. **Missing Schema Field**: The `ProjectSummary` schema doesn't include a `total_sections` field to communicate the actual count to the frontend

## Correctness Properties

Property 1: Bug Condition - Dynamic Total Calculation

_For any_ state where sections have been deleted from the project (sectionContents or sections_dict has fewer than 27 sections), the fixed components SHALL calculate the total dynamically as the count of keys minus 4 auto-complete sections, and display or use the correct total in the sidebar, preview, Home page, and backend calculations.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11**

Property 2: Preservation - Completion Calculation Unchanged

_For any_ state of the components, the fixed code SHALL continue to calculate completedCount using the same logic as before (filtering completion entries and excluding the 4 auto-complete sections), preserving the existing completion counting behavior in sidebar, preview, and backend. All existing API response fields SHALL continue to be returned.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Changes Required

**File 1**: `frontend/src/components/layout/SectionSidebar.tsx`

**Function**: `SectionSidebar` component (lines 119-127)

**Specific Changes**:

1. **Replace Hardcoded Value**: Change line 127 from `const totalCompletable = 27;` to a dynamic calculation

2. **Calculate from sectionContents**: Count the number of keys in `sectionContents` object

3. **Exclude Auto-Complete Sections**: Subtract 4 from the count to exclude binding_conditions, cybersecurity, disclaimer, scope_definitions

4. **Handle Undefined Case**: Add fallback to 27 if `sectionContents` is undefined (for backward compatibility)

5. **Implementation Code**:
```typescript
const totalCompletable = sectionContents 
  ? Object.keys(sectionContents).length - 4 
  : 27;
```

This single-line change replaces the hardcoded value with a dynamic calculation that:
- Counts actual sections in `sectionContents`
- Subtracts 4 for the auto-complete sections
- Falls back to 27 if `sectionContents` is undefined

---

**File 2**: `frontend/src/components/preview/DocumentPreview.tsx`

**Function**: `DocumentPreview` component (line 884)

**Specific Changes**:

1. **Calculate Dynamic Total**: Add a variable to calculate the total dynamically before the JSX where it's displayed

2. **Calculate from sectionContents**: Count the number of keys in `sectionContents` object (prop is available on lines 23-26)

3. **Exclude Auto-Complete Sections**: Subtract 4 from the count to exclude binding_conditions, cybersecurity, disclaimer, scope_definitions (same logic as `completedCount` on lines 165-176)

4. **Handle Undefined Case**: Add fallback to 27 if `sectionContents` is undefined (for backward compatibility)

5. **Implementation Code** (add near line 884, before the display string):
```typescript
const totalCompletable = sectionContents 
  ? Object.keys(sectionContents).length - 4 
  : 27;
```

6. **Update Display String**: Change line 884 from:
```typescript
Preview - {completedCount} / 27 complete
```
to:
```typescript
Preview - {completedCount} / {totalCompletable} complete
```

This change follows the exact same pattern as the sidebar fix:
- Calculates the total dynamically from `sectionContents`
- Subtracts 4 for the auto-complete sections
- Falls back to 27 if `sectionContents` is undefined
- Uses the calculated value in the display string

---

**File 3**: `backend/app/projects/router.py`

**Function**: `get_all_projects` endpoint (line 80)

**Specific Changes**:

1. **Calculate Dynamic Total**: Replace the hardcoded 27 with a dynamic calculation based on `sections_dict`

2. **Use Available Data**: The `sections_dict` is already built on line 73 and contains all sections

3. **Exclude Auto-Complete Sections**: Subtract 4 from the count to match the logic used for `completed_count` (lines 75-78)

4. **Implementation Code** (replace line 80):
```python
total_sections = len(sections_dict) - 4
completion_percentage = int((completed_count / total_sections) * 100) if total_sections > 0 else 0
```

5. **Add total_sections to Response**: Store the calculated value and include it in the ProjectSummary response

6. **Update ProjectSummary Construction** (around line 82):
```python
result.append(
    ProjectSummary(
        id=str(project.id),
        solution_name=project.solution_name,
        client_name=project.client_name,
        client_location=project.client_location,
        created_at=project.created_at,
        completion_percentage=completion_percentage,
        total_sections=total_sections,
    )
)
```

This change:
- Calculates the total dynamically from `sections_dict`
- Uses the dynamic total in the completion percentage calculation
- Includes the total in the API response for frontend consumption
- Adds a safety check for division by zero

---

**File 4**: `backend/app/projects/schemas.py`

**Schema**: `ProjectSummary` class (around line 35)

**Specific Changes**:

1. **Add total_sections Field**: Add a new field to the ProjectSummary schema

2. **Implementation Code**:
```python
class ProjectSummary(BaseModel):
    id: str
    solution_name: str
    client_name: str
    client_location: str
    created_at: datetime
    completion_percentage: int
    total_sections: int
    
    class Config:
        from_attributes = True
```

This change:
- Adds the `total_sections` field to communicate actual section count to frontend
- Maintains all existing fields for backward compatibility

---

**File 5**: `frontend/src/types/index.ts`

**Interface**: `ProjectSummary` interface (around line 28)

**Specific Changes**:

1. **Add total_sections Field**: Add a new field to match the backend schema

2. **Implementation Code**:
```typescript
export interface ProjectSummary {
  id: string
  solution_name: string
  client_name: string
  client_location: string
  created_at: string
  completion_percentage: number
  total_sections: number
}
```

This change:
- Adds the `total_sections` field to match the backend response
- Maintains all existing fields for backward compatibility

---

**File 6**: `frontend/src/pages/Home.tsx`

**Function**: Project card rendering (line 141)

**Specific Changes**:

1. **Remove Hardcoded Calculation**: Replace the calculation that uses hardcoded 27 with direct use of `project.total_sections`

2. **Current Code** (line 141):
```typescript
{Math.round((project.completion_percentage / 100) * 27)} / 27 sections
```

3. **Fixed Code**:
```typescript
{Math.round((project.completion_percentage / 100) * project.total_sections)} / {project.total_sections} sections
```

This change:
- Uses the `total_sections` field from the API response
- Removes the hardcoded 27 from both the calculation and display
- Correctly displays the actual section count for projects with deleted sections

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior. This applies to both the sidebar and document preview components.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the hardcoded value causes incorrect displays when sections are deleted in all four locations.

**Test Plan**: Write tests that render the frontend components and call the backend endpoint with different section configurations (27 sections, 24 sections, 22 sections) and assert that the displayed/calculated totals match the hardcoded value of 27. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Full Project Test (Sidebar)**: Render with 27 sections in `sectionContents` → Display shows "X / 27 sections" (will pass on unfixed code)
2. **Full Project Test (Preview)**: Render with 27 sections in `sectionContents` → Display shows "Preview - X / 27 complete" (will pass on unfixed code)
3. **Full Project Test (Home)**: API returns 27 sections → Display shows "X / 27 sections" (will pass on unfixed code)
4. **Full Project Test (Backend)**: Project has 27 sections → Calculates percentage with 27 (will pass on unfixed code)
5. **3 Deletions Test (Sidebar)**: Render with 24 sections in `sectionContents` → Display shows "X / 27 sections" instead of "X / 24 sections" (will fail on unfixed code - demonstrates bug)
6. **3 Deletions Test (Preview)**: Render with 24 sections in `sectionContents` → Display shows "Preview - X / 27 complete" instead of "Preview - X / 24 complete" (will fail on unfixed code - demonstrates bug)
7. **3 Deletions Test (Home)**: API returns 24 sections but Home calculates with 27 → Display shows incorrect count (will fail on unfixed code - demonstrates bug)
8. **3 Deletions Test (Backend)**: Project has 24 sections → Calculates `(14 / 27) * 100 = 51%` instead of `(14 / 24) * 100 = 58%` (will fail on unfixed code - demonstrates bug)
9. **5 Deletions Test (Sidebar)**: Render with 22 sections in `sectionContents` → Display shows "X / 27 sections" instead of "X / 22 sections" (will fail on unfixed code - demonstrates bug)
10. **5 Deletions Test (Preview)**: Render with 22 sections in `sectionContents` → Display shows "Preview - X / 27 complete" instead of "Preview - X / 22 complete" (will fail on unfixed code - demonstrates bug)
11. **5 Deletions Test (Backend)**: Project has 22 sections → Calculates with 27 instead of 22 (will fail on unfixed code - demonstrates bug)
12. **Edge Case Test**: Render with undefined `sectionContents` → Should handle gracefully (may fail on unfixed code if not handled)

**Expected Counterexamples**:
- Total count remains at 27 regardless of actual section count in all components
- Backend calculates incorrect completion percentage using hardcoded 27
- Home page displays incorrect section count calculated from percentage
- Possible causes: hardcoded values in all four locations, no dynamic calculation based on actual data

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (sections deleted), the fixed components and backend produce the expected behavior (correct total count and percentage).

**Pseudocode:**
```
FOR ALL sectionContents WHERE COUNT(keys) < 27 DO
  sidebarResult := renderSectionSidebar_fixed(sectionContents)
  previewResult := renderDocumentPreview_fixed(sectionContents)
  homeResult := renderHome_fixed(projectWithTotalSections)
  backendResult := calculateCompletionPercentage_fixed(sections_dict)
  expectedTotal := COUNT(keys in sectionContents or sections_dict) - 4
  ASSERT sidebarResult.displayedTotal == expectedTotal
  ASSERT previewResult.displayedTotal == expectedTotal
  ASSERT homeResult.displayedTotal == expectedTotal
  ASSERT backendResult.total_sections == expectedTotal
  ASSERT backendResult.completion_percentage == (completed_count / expectedTotal) * 100
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (no sections deleted, or other component behaviors), the fixed components and backend produce the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT SectionSidebar_original(input) = SectionSidebar_fixed(input)
  ASSERT DocumentPreview_original(input) = DocumentPreview_fixed(input)
  ASSERT Home_original(input) = Home_fixed(input) [except for using total_sections field]
  ASSERT Backend_original(input).existing_fields = Backend_fixed(input).existing_fields
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for completion calculation, percentage display, and section filtering, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Completion Count Preservation (Sidebar)**: Observe that `completedCount` calculation works correctly on unfixed code, then verify it continues to work identically after fix
2. **Completion Count Preservation (Preview)**: Observe that `completedCount` calculation (lines 165-176) works correctly on unfixed code, then verify it continues to work identically after fix
3. **Completion Count Preservation (Backend)**: Observe that `completed_count` calculation works correctly on unfixed code, then verify it continues to work identically after fix
4. **Percentage Calculation Preservation (Sidebar)**: Observe that completion percentage is calculated correctly on unfixed code, then verify the formula remains unchanged
5. **Visible Sections Preservation (Sidebar)**: Observe that section filtering based on `sectionContents` works correctly on unfixed code, then verify it continues to work identically
6. **Full Project Preservation (Sidebar)**: Observe that a full project (27 sections) displays "X / 27 sections" on unfixed code, then verify this continues after fix
7. **Full Project Preservation (Preview)**: Observe that a full project (27 sections) displays "Preview - X / 27 complete" on unfixed code, then verify this continues after fix
8. **Full Project Preservation (Home)**: Observe that a full project (27 sections) displays "X / 27 sections" on unfixed code, then verify this continues after fix
9. **Full Project Preservation (Backend)**: Observe that a full project (27 sections) calculates percentage with 27 on unfixed code, then verify this continues after fix
10. **API Response Fields Preservation**: Verify all existing fields (id, solution_name, client_name, client_location, created_at, completion_percentage) continue to be returned correctly

### Unit Tests

**Sidebar Tests:**
- Test dynamic calculation with 27 sections (should show 27)
- Test dynamic calculation with 24 sections (should show 24)
- Test dynamic calculation with 22 sections (should show 22)
- Test edge case with undefined `sectionContents` (should fallback to 27)
- Test that `completedCount` calculation remains unchanged
- Test that completion percentage calculation remains unchanged

**Preview Tests:**
- Test dynamic calculation with 27 sections (should show "Preview - X / 27 complete")
- Test dynamic calculation with 24 sections (should show "Preview - X / 24 complete")
- Test dynamic calculation with 22 sections (should show "Preview - X / 22 complete")
- Test edge case with undefined `sectionContents` (should fallback to 27)
- Test that `completedCount` calculation (lines 165-176) remains unchanged

**Home Tests:**
- Test display with 27 sections from API (should show "X / 27 sections")
- Test display with 24 sections from API (should show "X / 24 sections")
- Test display with 22 sections from API (should show "X / 22 sections")
- Test that completion percentage display remains unchanged
- Test that project card layout and styling remain unchanged

**Backend Tests:**
- Test completion percentage calculation with 27 sections (should use 27)
- Test completion percentage calculation with 24 sections (should use 24 and return correct percentage)
- Test completion percentage calculation with 22 sections (should use 22 and return correct percentage)
- Test that `total_sections` field is included in response
- Test that all existing fields continue to be returned
- Test edge case with zero sections (should handle division by zero)
- Test that `completed_count` calculation remains unchanged

### Property-Based Tests

**Sidebar Tests:**
- Generate random section configurations (varying counts from 1-27) and verify total count is always `actualCount - 4`
- Generate random completion states and verify `completedCount` calculation remains consistent with original logic
- Generate random `sectionContents` objects and verify visible sections filtering continues to work correctly

**Preview Tests:**
- Generate random section configurations (varying counts from 1-27) and verify total count is always `actualCount - 4`
- Generate random completion states and verify `completedCount` calculation (lines 165-176) remains consistent with original logic

**Home Tests:**
- Generate random project summaries with varying section counts and verify display uses `total_sections` field correctly
- Generate random completion percentages and verify display calculation remains consistent

**Backend Tests:**
- Generate random section configurations (varying counts from 1-27) and verify completion percentage uses dynamic total
- Generate random completion states and verify `completed_count` calculation remains consistent with original logic
- Generate random projects and verify all existing fields continue to be returned correctly

### Integration Tests

**Sidebar Tests:**
- Test full sidebar rendering with section deletions and verify progress indicator updates correctly
- Test switching between projects with different section counts and verify total updates dynamically
- Test that document generation and other sidebar features continue to work after the fix

**Preview Tests:**
- Test full preview rendering with section deletions and verify header updates correctly
- Test switching between projects with different section counts and verify preview total updates dynamically
- Test that preview scrolling and other preview features continue to work after the fix

**Home Tests:**
- Test full Home page rendering with multiple projects having different section counts
- Test that project cards display correct section counts from API
- Test switching between projects and verify counts update correctly
- Test that project card interactions (click, hover) continue to work after the fix

**Backend Tests:**
- Test full API endpoint with projects having different section counts
- Test that response includes `total_sections` field for all projects
- Test that completion percentage is calculated correctly for all projects
- Test that all existing API functionality continues to work after the fix
