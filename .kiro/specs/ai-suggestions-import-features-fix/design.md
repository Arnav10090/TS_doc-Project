# AI Suggestions Import Features Fix - Technical Design

## Overview

This document specifies the technical design for fixing a bug where imported AI-generated features do not populate the FeaturesSection rich text editor table. The bug occurs because the `FeaturesSection` component manages its own local state and only loads data from the API on mount via `getSection()`, never reading from `sectionDraftStore` where the AI import writes data.

**Fix Strategy**: Integrate the `FeaturesSection` component with `sectionDraftStore` by adding a mechanism to detect and load draft content when it exists. The component will prioritize draft store data over API data on initialization and react to draft changes triggered by AI import. This approach is minimal and surgical—only affecting the Features section behavior when draft data exists, preserving all existing functionality otherwise.

**Key Design Principles**:
- **Minimal Invasiveness**: Only modify FeaturesSection component behavior when draft data exists
- **Preservation First**: All existing workflows (manual editing, drag-and-drop, auto-save) remain unchanged
- **Single Responsibility**: Draft reading logic stays within FeaturesSection component
- **No Breaking Changes**: API data loading remains the default fallback

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when AI import writes Features data to `sectionDraftStore` but the `FeaturesSection` component does not read from it
- **Property (P)**: The desired behavior - after AI import completes, the editor SHALL immediately display the imported features allowing user review/editing before save
- **Preservation**: All existing Features section behaviors (manual editing, reordering, add/remove, auto-save) that must remain unchanged by the fix
- **sectionDraftStore**: In-memory Map-based store that holds transient section content before it is saved to the backend. Key format: `${projectId}::${sectionKey}`
- **FeaturesSection**: React component at `frontend/src/components/sections/FeaturesSection.tsx` that renders the tabular editor for Features section
- **importFamilyB()**: Function in `aiSuggestionImport.ts` that processes AI-generated tabular content and writes it to `sectionDraftStore` via `setSectionDraft()`
- **SectionInputPanel**: Parent component that handles AI suggestion import trigger and manages the suggestion panel UI
- **Content Family B (Tabular)**: Section content type with structured `items` or `rows` array (e.g., Features, Benefits, Resources)

## Bug Details

### Bug Condition

The bug manifests when a user imports AI suggestions for the Features section. The import flow correctly writes structured feature data to `sectionDraftStore`, but the `FeaturesSection` component never reads from this store. Instead, it only loads data from the API during component mount, causing a synchronization gap where imported content remains invisible in the editor until page refresh.

**Formal Specification:**
```
FUNCTION isBugCondition(context)
  INPUT: context of type ImportContext {
    sectionKey: string,
    componentReadsFromDraftStore: boolean,
    importWritesToDraftStore: boolean,
    userAction: string
  }
  OUTPUT: boolean
  
  // Bug triggers when:
  // 1. User imports AI suggestions for Features section
  // 2. Import writes to draft store successfully
  // 3. Component does not integrate with draft store
  RETURN (
    context.sectionKey = "features" AND
    context.userAction = "import_ai_suggestion" AND
    context.importWritesToDraftStore = true AND
    context.componentReadsFromDraftStore = false
  )
END FUNCTION
```

### Examples

**Example 1: AI Import with Multiple Features**
- **Trigger**: User clicks "Import Suggestion" after AI generates 3 feature items
- **Current Behavior (Buggy)**: Editor continues to show default empty feature item; imported data is invisible
- **Expected Behavior (Fixed)**: Editor immediately displays all 3 imported features with populated title, brief, and description fields

**Example 2: AI Import then Manual Edit**
- **Trigger**: User imports AI suggestions, then tries to edit the first feature title
- **Current Behavior (Buggy)**: User edits the default empty feature (not the imported data); imported data is lost on save
- **Expected Behavior (Fixed)**: User edits the imported feature data; changes are auto-saved correctly

**Example 3: AI Import with Single Feature**
- **Trigger**: User imports AI suggestion containing only 1 feature item
- **Current Behavior (Buggy)**: Editor shows default empty feature; imported feature is invisible
- **Expected Behavior (Fixed)**: Editor displays the imported feature with all fields populated

**Example 4: Import then Save then Preview**
- **Trigger**: User imports features, clicks SAVE, views document preview
- **Current Behavior (Buggy)**: Preview shows no features (or default placeholder) because editor's local state was never updated with imported data
- **Expected Behavior (Fixed)**: Preview correctly displays the imported features because editor loaded and saved the draft store content

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Manual editing in Features section editor must continue to trigger auto-save via `useAutoSave` hook
- Drag-and-drop reordering of features using DnD Kit must continue to work correctly
- Add Feature / Remove Feature buttons must continue to function as expected
- Loading Features section from saved project data (when no draft exists) must continue to use `getSection()` API
- Rich text formatting in description fields must continue to render correctly in both editor and preview
- Features section SAVE button must continue to persist content to backend and clear draft store
- Other sections' AI import functionality must remain completely unaffected
- Features section navigation and deletion must continue to work correctly

**Scope:**
All inputs that do NOT involve AI import to the Features section should be completely unaffected by this fix. This includes:
- Direct user typing/editing in Features editor fields
- Mouse clicks and interactions with Features editor UI elements
- Features section loading from API when no draft exists
- AI import for other sections (Introduction, Benefits, System Configuration, etc.)
- Custom sections and their AI import flows

## Hypothesized Root Cause

Based on the bug analysis and code review, the root cause is identified:

1. **No Draft Store Integration**: The `FeaturesSection` component has no logic to read from `sectionDraftStore`. It only calls `getSection(projectId, 'features')` on mount and never checks for draft data.

2. **Local State Isolation**: The component uses `useState` to manage `content` locally. When AI import updates the draft store, there's no mechanism to propagate that change into the component's local state.

3. **One-Way Data Flow**: The data flow is one-way: component → auto-save → API. There's no reverse flow: draft store → component. The component writes to the store via `save()` from `useAutoSave`, but never reads back.

4. **Missing useEffect Dependency**: Even if draft store content changed externally (via AI import), the component's `useEffect` only runs on mount (`[projectId]` dependency), so it wouldn't detect draft changes during the component's lifetime.

## Correctness Properties

Property 1: Bug Condition - AI Import Populates Editor Immediately

_For any_ AI import operation where the user clicks "Import Suggestion" for the Features section and `importFamilyB()` writes feature items to `sectionDraftStore`, the `FeaturesSection` component SHALL immediately read from the draft store and update its local state, causing the editor to display all imported features with their title, brief, and description fields populated, allowing the user to review and edit before clicking SAVE.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Manual Editing and Non-Import Workflows

_For any_ user interaction that is NOT an AI import to the Features section (manual typing, drag-and-drop reordering, add/remove features, loading from API when no draft exists), the fixed `FeaturesSection` component SHALL produce exactly the same behavior as the original component, preserving all existing auto-save, navigation, and UI interaction functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Architecture Overview

The fix introduces a draft-aware initialization pattern for the `FeaturesSection` component:

```
┌─────────────────────────────────────────────────────────────┐
│                    SectionInputPanel                        │
│  - Manages AI Suggestions UI                                │
│  - Triggers importSuggestion() on "Import" button          │
│  - Calls handleContentChange() to update sectionContents   │
└────────────────────┬───────────────────────────────────────┘
                     │
                     │ onContentChange(sectionKey, updated)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Parent Component (EditorPage)                 │
│  - Receives content change notification                     │
│  - Updates sectionContents state for Features section       │
│  - Re-renders child components with updated props           │
└────────────────────┬───────────────────────────────────────┘
                     │
                     │ sectionContents prop changes
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    FeaturesSection                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ useEffect Hook (Enhanced)                           │   │
│  │  Dependencies: [projectId, sectionContents]         │   │
│  │                                                      │   │
│  │  1. Check if sectionContents[features] exists       │   │
│  │  2. If exists && has items: prioritize draft        │   │
│  │  3. Else: fallback to getSection() API              │   │
│  │  4. Update local state with loaded content          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Local State: content (FeaturesContent)                     │
│   - Initialized from draft store OR API                     │
│   - Updated by user interactions (typing, drag-drop)        │
│   - Auto-saved via useAutoSave hook                         │
└──────────────────────────────────────────────────────────────┘

Data Flow (AI Import):
1. User clicks "Import Suggestion" → SectionInputPanel.onImport()
2. importSuggestion() → importFamilyB() → setSectionDraft(projectId, "features", updated)
3. SectionInputPanel calls handleContentChange(updated)
4. Parent component updates sectionContents state
5. FeaturesSection receives new sectionContents prop
6. useEffect detects change, loads draft content into local state
7. Component re-renders with imported features visible
```

### Component Design Changes

**File**: `frontend/src/components/sections/FeaturesSection.tsx`

**Changes Required**:

1. **Add Props Interface Enhancement**:
   - Currently: `FeaturesSection` only accepts `projectId` prop
   - After Fix: Add optional `content` prop to receive draft content from parent
   ```typescript
   interface FeaturesSectionProps {
     projectId: string;
     content?: FeaturesContent; // NEW: Optional draft content from parent
   }
   ```

2. **Update useEffect Hook for Draft-Aware Initialization**:
   - Currently: Loads only from `getSection()` API on mount, dependencies `[projectId]`
   - After Fix: Check `content` prop first (draft data), fallback to API if absent
   ```typescript
   useEffect(() => {
     const loadSection = async () => {
       try {
         // PRIORITY 1: Use content prop if provided (draft from parent)
         if (content && content.items && content.items.length > 0) {
           setContent(content);
           setLoading(false);
           return;
         }
         
         // PRIORITY 2: Fallback to API for saved data
         const data = await getSection(projectId, 'features');
         if (data.content && data.content.items && data.content.items.length > 0) {
           setContent(data.content as FeaturesContent);
         }
       } catch (error) {
         console.error('Error loading features:', error);
       } finally {
         setLoading(false);
       }
     };

     loadSection();
   }, [projectId, content]); // NEW: Add 'content' to dependencies
   ```

3. **Update Parent Component (PredefinedSectionEditor) to Pass Content Prop**:
   - File: `frontend/src/components/input/PredefinedSectionEditor.tsx`
   - Change: Pass `content` prop to `FeaturesSection` component
   ```typescript
   case 'features':
     return <FeaturesSection projectId={projectId} content={content as FeaturesContent} />;
   ```

### Data Flow Diagrams

**Current (Buggy) Import Workflow:**
```
User Action: Click "Import Suggestion"
    │
    ▼
SectionInputPanel.onImport()
    │
    ├─► importSuggestion(projectId, "features", suggestion, existingDraft)
    │       │
    │       ├─► importFamilyB(draft, content)
    │       │       └─► Returns { items: [...imported features] }
    │       │
    │       └─► setSectionDraft(projectId, "features", updated)
    │               └─► Writes to sectionDraftStore Map ✓
    │
    └─► handleContentChange(updated)
            └─► onContentChange("features", updated)
                    └─► Parent updates sectionContents state ✓

FeaturesSection Component:
    ├─► Local state: content = { items: [default empty feature] }
    ├─► useEffect runs only on mount, loads from API
    └─► ❌ NEVER reads from sectionDraftStore or content prop
    
Result: Editor shows empty/default features (bug manifestation)
```

**Fixed Import Workflow:**
```
User Action: Click "Import Suggestion"
    │
    ▼
SectionInputPanel.onImport()
    │
    ├─► importSuggestion(projectId, "features", suggestion, existingDraft)
    │       │
    │       ├─► importFamilyB(draft, content)
    │       │       └─► Returns { items: [...imported features] }
    │       │
    │       └─► setSectionDraft(projectId, "features", updated)
    │               └─► Writes to sectionDraftStore Map ✓
    │
    └─► handleContentChange(updated)
            └─► onContentChange("features", updated)
                    └─► Parent updates sectionContents["features"] ✓

FeaturesSection Component:
    ├─► Receives content prop = { items: [...imported features] } ✓
    ├─► useEffect detects content prop change (dependency: [projectId, content])
    ├─► Checks content prop first (PRIORITY 1)
    ├─► ✓ Finds valid content.items with imported features
    └─► ✓ Updates local state: setContent(content)
    
Result: Editor immediately displays imported features ✓
Component re-renders with populated table ✓
User can review/edit before SAVE ✓
```

### Implementation Approach

**Phase 1: Component Enhancement (FeaturesSection.tsx)**

**Step 1**: Add optional `content` prop to `FeaturesSectionProps` interface
```typescript
interface FeaturesSectionProps {
  projectId: string;
  content?: FeaturesContent; // Accept draft content from parent
}
```

**Step 2**: Update component function signature to destructure new prop
```typescript
const FeaturesSection: React.FC<FeaturesSectionProps> = ({ projectId, content }) => {
  // ... existing code
```

**Step 3**: Enhance `useEffect` hook for draft-aware loading
```typescript
useEffect(() => {
  const loadSection = async () => {
    try {
      // Check if content prop is provided (from draft store via parent)
      if (content && content.items && content.items.length > 0) {
        setContent(content);
        setLoading(false);
        return; // Exit early - draft takes priority
      }
      
      // Fallback: load from API (existing behavior)
      const data = await getSection(projectId, 'features');
      if (data.content && data.content.items && data.content.items.length > 0) {
        setContent(data.content as FeaturesContent);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };

  loadSection();
}, [projectId, content]); // Add 'content' as dependency
```

**Step 4**: No changes to other component methods
- `handleUpdateFeature`: Remains unchanged (already calls `save()`)
- `handleAddFeature`: Remains unchanged
- `handleRemoveFeature`: Remains unchanged
- `handleDragEnd`: Remains unchanged
- All existing auto-save behavior preserved

**Phase 2: Parent Component Integration (PredefinedSectionEditor.tsx)**

**Step 5**: Locate the switch statement that renders section components

**Step 6**: Update the `case 'features':` to pass content prop
```typescript
case 'features':
  return <FeaturesSection projectId={projectId} content={content as FeaturesContent} />;
```

**Phase 3: Verification (No Code Changes)**

**Step 7**: Verify AI import flow writes to draft store (already working)
- Confirm `importFamilyB()` is called for Features section
- Confirm `setSectionDraft()` is called with correct projectId and sectionKey
- Confirm `handleContentChange()` propagates to parent

**Step 8**: Verify parent component state management (already working)
- Confirm `SectionInputPanel.onContentChange` updates parent's `sectionContents`
- Confirm parent passes updated `sectionContents` to `PredefinedSectionEditor`

### Specific Code Changes

**Change 1: FeaturesSection.tsx (Lines 18-20)**
```typescript
// BEFORE:
interface FeaturesSectionProps {
  projectId: string;
}

// AFTER:
interface FeaturesSectionProps {
  projectId: string;
  content?: FeaturesContent; // NEW: Accept draft content from parent
}
```

**Change 2: FeaturesSection.tsx (Line 140)**
```typescript
// BEFORE:
const FeaturesSection: React.FC<FeaturesSectionProps> = ({ projectId }) => {

// AFTER:
const FeaturesSection: React.FC<FeaturesSectionProps> = ({ projectId, content }) => {
```

**Change 3: FeaturesSection.tsx (Lines 166-180)**
```typescript
// BEFORE:
useEffect(() => {
  const loadSection = async () => {
    try {
      const data = await getSection(projectId, 'features');
      if (data.content && data.content.items && data.content.items.length > 0) {
        setContent(data.content as FeaturesContent);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };

  loadSection();
}, [projectId]);

// AFTER:
useEffect(() => {
  const loadSection = async () => {
    try {
      // Priority 1: Use content prop if provided (draft from parent)
      if (content && content.items && content.items.length > 0) {
        setContent(content);
        setLoading(false);
        return;
      }
      
      // Priority 2: Fallback to API for saved data
      const data = await getSection(projectId, 'features');
      if (data.content && data.content.items && data.content.items.length > 0) {
        setContent(data.content as FeaturesContent);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };

  loadSection();
}, [projectId, content]); // NEW: Add 'content' dependency
```

**Change 4: PredefinedSectionEditor.tsx (case 'features')**
```typescript
// BEFORE:
case 'features':
  return <FeaturesSection projectId={projectId} />;

// AFTER:
case 'features':
  return <FeaturesSection projectId={projectId} content={content as FeaturesContent} />;
```

## Testing Strategy

### Validation Approach

The testing strategy follows a three-phase approach:
1. **Exploratory Bug Condition Checking**: Demonstrate the bug exists on unfixed code
2. **Fix Checking**: Verify the fix correctly handles all AI import scenarios
3. **Preservation Checking**: Verify all existing workflows remain unchanged

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis is correct.

**Test Plan**: Run AI import for Features section on UNFIXED code and observe that imported data does not appear in the editor.

**Test Cases**:
1. **Single Feature Import Test**: Import AI suggestion with 1 feature item
   - Expected Counterexample: Editor shows default empty feature; imported feature is invisible
   - Confirms: Component does not read from draft store

2. **Multiple Features Import Test**: Import AI suggestion with 3 feature items
   - Expected Counterexample: Editor shows only default empty feature; all imported features are invisible
   - Confirms: Component ignores draft store content entirely

3. **Import Then Edit Test**: Import AI suggestion, then try to edit feature title
   - Expected Counterexample: User edits the default empty feature, not the imported data
   - Confirms: Component's local state is never updated with imported content

4. **Import Then Save Test**: Import AI suggestion, click SAVE, view preview
   - Expected Counterexample: Preview shows no features or default placeholder
   - Confirms: Editor saved stale local state instead of imported draft data

**Expected Root Cause Confirmation**:
- FeaturesSection component never reads from `sectionDraftStore`
- Component's `useEffect` only runs on mount with `[projectId]` dependency
- No mechanism exists to propagate draft store changes into component's local state

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (AI import to Features section), the fixed component produces the expected behavior (immediate editor population).

**Pseudocode:**
```
FOR ALL importContext WHERE isBugCondition(importContext) DO
  // Perform AI import
  imported := importAISuggestion(projectId, "features", aiSuggestion)
  
  // Check component behavior
  editorState := getFeaturesSectionState()
  
  // Assert fix checking properties
  ASSERT editorState.items.length = imported.items.length
  ASSERT editorState.items[i].title = imported.items[i].title FOR ALL i
  ASSERT editorState.items[i].brief = imported.items[i].brief FOR ALL i
  ASSERT editorState.items[i].description = imported.items[i].description FOR ALL i
  ASSERT editorState.isVisible = true
  ASSERT editorState.allowsEditing = true
END FOR
```

**Test Cases**:

1. **Single Feature Import - Fixed Behavior**
   - Setup: Clean project, no existing Features data
   - Action: Import AI suggestion with 1 feature item
   - Expected: Editor immediately shows imported feature with all fields populated
   - Validates: Property 1 (Bug Condition fix)

2. **Multiple Features Import - Fixed Behavior**
   - Setup: Clean project, no existing Features data
   - Action: Import AI suggestion with 5 feature items
   - Expected: Editor immediately shows all 5 imported features in correct order
   - Validates: Property 1 (Bug Condition fix)

3. **Import Over Existing Features - Fixed Behavior**
   - Setup: Project with 2 manually-entered features
   - Action: Import AI suggestion with 3 new features
   - Expected: Editor shows combined features (existing + imported) correctly merged
   - Validates: Property 1 (Bug Condition fix with merge scenario)

4. **Import Then Immediate Edit - Fixed Behavior**
   - Setup: Clean project
   - Action: Import AI suggestion, immediately edit first feature title
   - Expected: Editor allows editing of imported feature; auto-save triggers correctly
   - Validates: Property 1 (editor interactivity after import)

5. **Import Then Save Then Preview - Fixed Behavior**
   - Setup: Clean project
   - Action: Import AI suggestion, click SAVE, view document preview
   - Expected: Preview correctly displays imported features without requiring page refresh
   - Validates: Property 1 (end-to-end import to preview workflow)

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (manual editing, non-Features sections, loading from API), the fixed component produces the same result as the original component.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  // Test both original and fixed component behavior
  resultOriginal := FeaturesSection_Original(input)
  resultFixed := FeaturesSection_Fixed(input)
  
  // Assert preservation
  ASSERT resultOriginal.content = resultFixed.content
  ASSERT resultOriginal.autoSaveBehavior = resultFixed.autoSaveBehavior
  ASSERT resultOriginal.uiInteractions = resultFixed.uiInteractions
  ASSERT resultOriginal.renderOutput = resultFixed.renderOutput
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for manual workflows, then verify fixed code produces identical behavior.

**Test Cases**:

1. **Manual Typing Preservation Test**
   - Setup: Load Features section with no draft
   - Action: Manually type feature title, brief, description
   - Expected: Auto-save triggers on each field change (identical to unfixed behavior)
   - Validates: Property 2 (manual editing preserved)

2. **Drag-and-Drop Reordering Preservation Test**
   - Setup: Features section with 3 manually-entered features
   - Action: Drag feature 3 to position 1
   - Expected: Reordering works correctly; auto-save triggers; order persists after save
   - Validates: Property 2 (drag-drop preserved)

3. **Add/Remove Feature Buttons Preservation Test**
   - Setup: Features section with 2 features
   - Action: Click "+ Add Feature" twice, then "Remove" on second feature
   - Expected: Features added/removed correctly; auto-save triggers; UI state correct
   - Validates: Property 2 (add/remove preserved)

4. **Load from API When No Draft Preservation Test**
   - Setup: Project with saved Features data, no draft in draft store
   - Action: Navigate to Features section
   - Expected: Component loads from `getSection()` API (fallback behavior identical to unfixed)
   - Validates: Property 2 (API fallback preserved)

5. **Rich Text Formatting Preservation Test**
   - Setup: Feature with description containing bold, italic, lists
   - Action: Edit description, add more formatting
   - Expected: RichTextEditor works correctly; formatting renders in preview
   - Validates: Property 2 (rich text preserved)

6. **Other Sections AI Import Preservation Test**
   - Setup: Introduction section
   - Action: Import AI suggestion for Introduction
   - Expected: Import works correctly (unchanged from unfixed behavior)
   - Validates: Property 2 (other sections unaffected)

7. **Features Section Collapse/Expand Preservation Test**
   - Setup: Features section with 3 features
   - Action: Collapse first feature, expand third feature
   - Expected: Collapse/expand UI works correctly; feature title shown when collapsed
   - Validates: Property 2 (UI interactions preserved)

8. **Features Section Character Limit Preservation Test**
   - Setup: Feature with empty brief field
   - Action: Type 160 characters into brief field
   - Expected: Input stops at 150 characters; counter shows "150 / 150"
   - Validates: Property 2 (validation logic preserved)

### Unit Tests

**Recommended Unit Test Coverage**:

1. **Draft Content Loading**:
   - Test: Component receives content prop with 2 features → local state updated correctly
   - Test: Component receives empty content prop → falls back to API
   - Test: Component receives content prop with invalid structure → falls back to API

2. **API Fallback**:
   - Test: No content prop provided → component loads from `getSection()` API
   - Test: API returns valid features → local state updated correctly
   - Test: API returns empty content → component initializes with default empty feature

3. **useEffect Dependencies**:
   - Test: projectId changes → triggers reload
   - Test: content prop changes → triggers local state update
   - Test: Both projectId and content change simultaneously → correct behavior

4. **Edge Cases**:
   - Test: content prop provided with 0 items → falls back to API
   - Test: content prop provided with items but missing required fields → graceful handling
   - Test: Rapid content prop changes (simulating multiple imports) → no race conditions

### Property-Based Tests

**Recommended Property-Based Test Scenarios**:

1. **Import Preservation Property**:
   - Generate: Random feature items with valid title/brief/description
   - Import: Via importFamilyB() to draft store
   - Assert: Editor state matches imported data exactly (no data loss)
   - Property: `imported = displayed` for all valid feature arrays

2. **Manual Edit Preservation Property**:
   - Generate: Random sequences of manual edit actions (typing, adding, removing)
   - Execute: On component with no draft content
   - Assert: Behavior identical to unfixed component (auto-save, UI updates)
   - Property: `editBehavior(fixed) = editBehavior(original)` when no draft exists

3. **Draft Priority Property**:
   - Generate: Pairs of (API data, draft data) with different content
   - Test: Component initialization with both sources available
   - Assert: Draft data always takes priority over API data
   - Property: `displayed = draft` when both draft and API data exist

### Integration Tests

**Recommended End-to-End Test Scenarios**:

1. **Full AI Import Workflow**:
   - Navigate to Features section in clean project
   - Click "✨ AI Suggestions" button
   - Wait for AI suggestion generation
   - Click "Import Suggestion"
   - Verify: Editor displays imported features immediately
   - Edit: Modify first feature title
   - Click: SAVE button
   - Verify: Document preview shows edited imported features

2. **Mixed Workflow (Manual + AI Import)**:
   - Manually create 2 features
   - Click SAVE
   - Import AI suggestion with 3 more features
   - Verify: Editor shows all 5 features (2 manual + 3 imported)
   - Drag-drop: Reorder features
   - Click SAVE
   - Verify: Preview shows all 5 features in new order

3. **Context Switching Workflow**:
   - Import AI suggestions for Features section
   - Navigate away to Introduction section
   - Navigate back to Features section
   - Verify: Imported features still visible (draft persists)
   - Click SAVE
   - Navigate away and back
   - Verify: Features load from API correctly

4. **Multi-Section AI Import Workflow**:
   - Import AI suggestions for Introduction section → verify works
   - Import AI suggestions for Features section → verify works
   - Import AI suggestions for Benefits section → verify works
   - Verify: Each section displays its imported content correctly
   - Click SAVE on all sections
   - Verify: Document preview shows all imported content

5. **Error Handling Workflow**:
   - Simulate AI suggestion generation failure
   - Verify: User sees appropriate error message
   - Simulate import with malformed content structure
   - Verify: Component falls back to API gracefully (no crash)
