# Live Preview Integration

## Overview
This document explains how the DocumentPreview component receives live updates from section forms without making API calls on every keystroke.

## Architecture

### Data Flow
```
User types in section form
  ↓
handleChange() updates local state
  ↓
save() called with new content
  ↓
useAutoSave immediately calls onContentChange(content)
  ↓
SectionInputPanel.handleContentChange(content)
  ↓
EditorPage.handleSectionContentChange(sectionKey, content)
  ↓
setSectionContents updates state
  ↓
DocumentPreview receives new sectionContents prop
  ↓
React re-renders only the changed section
  ↓
Preview updates instantly (0ms latency)
  ↓
(800ms later) API call saves to database
```

## Implementation Details

### 1. useAutoSave Hook Enhancement
**File**: `frontend/src/hooks/useAutoSave.ts`

**Changes**:
- Added optional `onContentChange` parameter
- Calls `onContentChange(content)` immediately before debounce timer
- This ensures preview updates instantly while API call is debounced

```typescript
export const useAutoSave = (
  projectId: string,
  sectionKey: string,
  delay: number = 800,
  onContentChange?: (content: Record<string, any>) => void  // NEW
): UseAutoSaveReturn => {
  const save = useCallback(
    (content: Record<string, any>) => {
      // Immediately notify parent of content change (for live preview)
      if (onContentChange) {
        onContentChange(content);
      }
      
      // ... rest of debounced save logic
    },
    [projectId, sectionKey, delay, onContentChange]
  )
}
```

### 2. SectionInputPanel Enhancement
**File**: `frontend/src/components/layout/SectionInputPanel.tsx`

**Changes**:
- Added `onContentChange` prop
- Created `handleContentChange` wrapper that includes section key
- Passes callback to section component

```typescript
interface SectionInputPanelProps {
  projectId: string;
  activeSectionKey: string;
  onContentChange?: (sectionKey: string, content: Record<string, any>) => void;
}

const SectionInputPanel: React.FC<SectionInputPanelProps> = ({ 
  projectId, 
  activeSectionKey, 
  onContentChange 
}) => {
  const handleContentChange = (content: Record<string, any>) => {
    if (onContentChange) {
      onContentChange(activeSectionKey, content);
    }
  };

  return (
    <SectionComponent 
      projectId={projectId} 
      onContentChange={handleContentChange} 
    />
  );
};
```

### 3. EditorPage State Management
**File**: `frontend/src/pages/Editor.tsx`

**Changes**:
- Added `sectionContents` state to store all section data
- Populates `sectionContents` from `getAllSections` API on load
- Created `handleSectionContentChange` callback
- Passes callback to SectionInputPanel
- Passes `sectionContents` to DocumentPreview

```typescript
const [sectionContents, setSectionContents] = useState<Record<string, Record<string, any>>>({})

// Load initial content
useEffect(() => {
  const sections = await getAllSections(projectId)
  const contentsMap: Record<string, Record<string, any>> = {}
  sections.forEach(s => { contentsMap[s.section_key] = s.content })
  setSectionContents(contentsMap)
}, [projectId])

// Handle live updates
const handleSectionContentChange = useCallback((sectionKey: string, content: Record<string, any>) => {
  setSectionContents((prev) => ({
    ...prev,
    [sectionKey]: content,
  }))
}, [])

// Pass to components
<SectionInputPanel onContentChange={handleSectionContentChange} />
<DocumentPreview sectionContents={sectionContents} />
```

### 4. Section Component Pattern
**Example**: `frontend/src/components/sections/CoverSection.tsx`

**Changes**:
- Added `onContentChange` prop to interface
- Created wrapper callback for useAutoSave
- Passed callback to useAutoSave hook

```typescript
interface CoverSectionProps {
  projectId: string;
  onContentChange?: (content: Record<string, any>) => void;
}

const CoverSection: React.FC<CoverSectionProps> = ({ projectId, onContentChange }) => {
  const handleAutoSaveChange = (updatedContent: Record<string, any>) => {
    if (onContentChange) {
      onContentChange(updatedContent);
    }
  };
  
  const { save, status } = useAutoSave(projectId, 'cover', 800, handleAutoSaveChange);
  
  // ... rest of component
}
```

## Updating All Section Components

All 31 section components need to be updated with the same pattern. Here's the checklist:

### Required Changes for Each Section:
1. Add `onContentChange?: (content: Record<string, any>) => void` to props interface
2. Add `onContentChange` parameter to component function
3. Create `handleAutoSaveChange` wrapper callback
4. Pass wrapper to `useAutoSave` as 4th parameter

### Section Components to Update:
- [x] CoverSection
- [ ] RevisionHistory
- [ ] ExecutiveSummary
- [ ] IntroductionSection
- [ ] AbbreviationsSection
- [ ] ProcessFlowSection
- [ ] OverviewSection
- [ ] FeaturesSection
- [ ] RemoteSupportSection
- [ ] DocumentationControlSection
- [ ] CustomerTrainingSection
- [ ] SystemConfigSection
- [ ] FATConditionSection
- [ ] TechStackSection
- [ ] HardwareSpecsSection
- [ ] SoftwareSpecsSection
- [ ] ThirdPartySwSection
- [ ] OverallGanttSection
- [ ] ShutdownGanttSection
- [ ] SupervisorsSection
- [ ] ScopeDefinitionsSection
- [ ] DivisionOfEngSection
- [ ] ValueAdditionSection
- [ ] WorkCompletionSection
- [ ] BuyerObligationsSection
- [ ] ExclusionListSection
- [ ] BuyerPrerequisitesSection
- [ ] BindingConditionsSection
- [ ] CybersecuritySection
- [ ] DisclaimerSection
- [ ] PoCSection

## Performance Characteristics

### Zero Latency Updates
- **Keystroke to preview**: 0ms (synchronous state update)
- **Preview re-render**: ~16ms (single React render cycle)
- **API save**: 800ms debounced (doesn't block preview)

### Memory Efficiency
- Only one copy of section data in memory (in EditorPage state)
- DocumentPreview receives data as props (no duplication)
- React's reconciliation only updates changed sections

### Network Efficiency
- API calls debounced to 800ms
- No API calls for preview updates
- Only saves when user stops typing

## Benefits

### 1. Instant Feedback
- Users see changes immediately in preview
- No waiting for API responses
- Smooth, responsive editing experience

### 2. Reduced API Load
- Debounced saves reduce server requests
- Preview updates don't trigger API calls
- Network failures don't affect preview

### 3. Better UX
- Live preview shows exactly what will be generated
- Users can verify formatting in real-time
- Reduces need to generate full document repeatedly

### 4. Maintainable Code
- Clear data flow from form → state → preview
- Single source of truth (EditorPage state)
- Easy to debug and extend

## Testing

### Manual Testing Checklist
- [ ] Type in any section form
- [ ] Verify preview updates instantly (no delay)
- [ ] Verify "Saving..." indicator appears after 800ms
- [ ] Verify API call happens after 800ms
- [ ] Switch to different section
- [ ] Verify previous section content persists in preview
- [ ] Type rapidly in multiple sections
- [ ] Verify all changes appear in preview
- [ ] Refresh page
- [ ] Verify all content loads from database

### Edge Cases
- **Rapid typing**: Preview updates on every keystroke, API saves once after 800ms
- **Section switching**: Previous section content remains in state
- **Network failure**: Preview still works, save indicator shows error
- **Empty content**: Preview shows placeholders
- **Large content**: React efficiently updates only changed parts

## Future Enhancements

### 1. Optimistic Updates
- Show "saving" state in preview
- Revert on save failure
- Show conflict resolution UI

### 2. Collaborative Editing
- WebSocket for real-time updates from other users
- Show who's editing which section
- Merge conflicts automatically

### 3. Undo/Redo
- Track content history in state
- Implement undo/redo stack
- Sync with preview updates

### 4. Offline Support
- Cache content in IndexedDB
- Queue saves when offline
- Sync when connection restored

## Troubleshooting

### Preview Not Updating
**Symptom**: Type in form but preview doesn't change

**Possible Causes**:
1. Section component not passing `onContentChange` to `useAutoSave`
2. `handleSectionContentChange` not called in EditorPage
3. `sectionContents` not passed to DocumentPreview

**Solution**: Check console for errors, verify callback chain

### Preview Updates But Save Fails
**Symptom**: Preview updates instantly but "Error saving" appears

**Possible Causes**:
1. Network error
2. Invalid content format
3. Database connection issue

**Solution**: Preview still works, user can continue editing. Fix will be saved on next successful save.

### Slow Preview Updates
**Symptom**: Preview lags behind typing

**Possible Causes**:
1. DocumentPreview not using React.memo
2. Expensive computations in render
3. Too many re-renders

**Solution**: Check React DevTools profiler, optimize expensive operations with useMemo

## Migration Notes

### Backward Compatibility
- All changes are backward compatible
- `onContentChange` is optional prop
- Sections without callback still work (just no live preview)
- Existing auto-save functionality unchanged

### Gradual Rollout
- Can update sections one at a time
- Updated sections get live preview
- Non-updated sections still work normally
- No breaking changes to API or database
