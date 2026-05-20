# Design Document: Highlight Previous Edits

## Overview

This feature adds visual highlighting to the Word preview panel to help users identify sections they edited during their previous work session. The implementation uses browser localStorage for persistence and applies orange visual styling (#ED7D31 - Microsoft Word's Orange Accent 2) to previously edited sections that haven't been touched in the current session.

The design follows a dual-tracking approach:
- **lastEditedSections**: Read-only array loaded from localStorage representing the previous session's edits
- **currentSessionEdits**: In-memory set tracking sections edited during the current session

Orange highlights are displayed only for sections in `lastEditedSections` that are NOT in `currentSessionEdits`, ensuring highlights disappear once a section is re-edited.

## Architecture

### Component Hierarchy

```
Editor (State Management)
├── SectionSidebar (Optional: Orange indicators)
├── DocumentPreview (Visual highlighting)
└── SectionInputPanel (Triggers save events)
```

### Data Flow

1. **On Mount**: Editor loads `edited_sections_<projectId>` from localStorage into `lastEditedSections` state
2. **On Save**: Editor adds section_key to `currentSessionEdits` Set and writes to localStorage
3. **On Render**: DocumentPreview receives both arrays and applies conditional styling
4. **On Unmount/Navigate**: Current session edits become the new localStorage value

### LocalStorage Schema

**Key Pattern**: `edited_sections_<projectId>`

**Value Format**: JSON array of section keys
```json
["cover", "introduction", "features", "tech_stack"]
```

**Scope**: Project-specific (prevents cross-project contamination)

## Components and Interfaces

### Editor.tsx Modifications

#### New State Variables

```typescript
// Read from localStorage on mount - represents previous session
const [lastEditedSections, setLastEditedSections] = useState<string[]>([])

// In-memory tracking for current session
const [currentSessionEdits, setCurrentSessionEdits] = useState<Set<string>>(new Set())
```

#### LocalStorage Operations

**Load on Mount**:
```typescript
useEffect(() => {
  const storageKey = `edited_sections_${projectId}`
  const stored = localStorage.getItem(storageKey)
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      setLastEditedSections(Array.isArray(parsed) ? parsed : [])
    } catch {
      setLastEditedSections([])
    }
  } else {
    setLastEditedSections([])
  }
}, [projectId])
```

**Save on Section Update**:
```typescript
const handleSectionContentChange = useCallback((sectionKey: string, content: Record<string, any>) => {
  setSectionContents((prev) => ({
    ...prev,
    [sectionKey]: content,
  }))
  
  // Track in current session
  setCurrentSessionEdits((prev) => new Set(prev).add(sectionKey))
  
  // Write current session edits to localStorage
  const storageKey = `edited_sections_${projectId}`
  const updatedEdits = Array.from(new Set([...currentSessionEdits, sectionKey]))
  localStorage.setItem(storageKey, JSON.stringify(updatedEdits))
}, [projectId, currentSessionEdits])
```

**Cleanup on Unmount** (optional - already handled by save):
```typescript
useEffect(() => {
  return () => {
    if (currentSessionEdits.size > 0) {
      const storageKey = `edited_sections_${projectId}`
      localStorage.setItem(storageKey, JSON.stringify(Array.from(currentSessionEdits)))
    }
  }
}, [projectId, currentSessionEdits])
```

#### Props to DocumentPreview

```typescript
<DocumentPreview 
  projectId={projectId} 
  activeSectionKey={activeSectionKey}
  sectionContents={sectionContents}
  onSectionClick={handleSectionClick}
  lastEditedSections={lastEditedSections}
  currentSessionEdits={Array.from(currentSessionEdits)}
/>
```

### DocumentPreview.tsx Modifications

#### Updated Props Interface

```typescript
interface DocumentPreviewProps {
  projectId: string;
  activeSectionKey: string | null;
  sectionContents: Record<string, Record<string, any>>;
  onSectionClick?: (sectionKey: string) => void;
  lastEditedSections?: string[];
  currentSessionEdits?: string[];
}
```

#### Updated sectionStyle Function

The `sectionStyle` function applies conditional styling based on highlight priority:

**Priority Order** (highest to lowest):
1. Active section (yellow #FFF9C4 with red border)
2. Hovered section (blue border #BFDBFE)
3. Previous-edit section (orange border #ED7D31 with light orange background #FFF3EC)

```typescript
const sectionStyle = (sectionKey: string): React.CSSProperties => {
  const isActiveSection = activeSectionKey === sectionKey
  const isHoveredSection = hoveredSection === sectionKey
  
  // Check if section was edited in previous session but not current session
  const isPreviouslyEdited = 
    lastEditedSections?.includes(sectionKey) && 
    !currentSessionEdits?.includes(sectionKey)
  
  return {
    position: 'relative',
    cursor: onSectionClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    marginBottom: '24px',
    
    // Active section styling (highest priority)
    ...(isActiveSection && sectionKey !== 'cover' && {
      background: '#FFF9C4',
      borderLeft: '3px solid #E60012',
      borderRadius: '2px',
      paddingLeft: '8px',
      marginLeft: '-8px',
    }),
    ...(isActiveSection && sectionKey === 'cover' && {
      background: '#FFF9C4',
    }),
    
    // Hover styling (second priority)
    ...(isHoveredSection && !isActiveSection && sectionKey !== 'cover' && {
      border: '1px solid #BFDBFE',
      borderRadius: '2px',
      padding: '4px',
      margin: '-4px -4px 20px',
    }),
    ...(isHoveredSection && !isActiveSection && sectionKey === 'cover' && {
      opacity: 0.9,
    }),
    
    // Previous-edit styling (lowest priority)
    ...(isPreviouslyEdited && !isActiveSection && !isHoveredSection && sectionKey !== 'cover' && {
      borderLeft: '3px solid #ED7D31',
      background: '#FFF3EC',
      borderRadius: '2px',
      paddingLeft: '8px',
      marginLeft: '-8px',
    }),
    ...(isPreviouslyEdited && !isActiveSection && !isHoveredSection && sectionKey === 'cover' && {
      background: '#FFF3EC',
    }),
  }
}
```

### SectionSidebar.tsx Modifications (Optional)

#### Updated Props Interface

```typescript
interface SectionSidebarProps {
  projectId: string;
  activeSectionKey: string | null;
  onSectionClick: (sectionKey: string) => void;
  visitedSections?: Set<string>;
  sectionContents?: Record<string, Record<string, any>>;
  width: number;
  showResizeHandle?: boolean;
  isResizing?: boolean;
  onResizeStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeStep?: (delta: number) => void;
  lastEditedSections?: string[];
  currentSessionEdits?: string[];
}
```

#### Orange Dot Indicator

Add visual indicator next to section labels for previously edited sections:

```typescript
<button
  key={section.key}
  onClick={() => onSectionClick(section.key)}
  style={{
    width: '100%',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    border: 'none',
    backgroundColor: isActive ? '#FFF0F0' : 'transparent',
    borderLeft: isActive ? '3px solid #E60012' : '3px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  }}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
    {/* Orange dot for previously edited sections */}
    {lastEditedSections?.includes(section.key) && 
     !currentSessionEdits?.includes(section.key) && (
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#ED7D31',
          flexShrink: 0,
        }}
      />
    )}
    
    <span
      style={{
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#E60012' : '#1A1A2E',
      }}
    >
      {section.label}
    </span>
    
    {section.locked && (
      <span style={{ fontSize: '12px' }}>🔒</span>
    )}
  </div>
  <CompletionBadge status={status} />
</button>
```

## Data Models

### LocalStorage Entry

```typescript
interface EditedSectionsStorage {
  key: `edited_sections_${string}`  // Project-scoped key
  value: string[]                    // Array of section_key strings
}
```

### Component State

```typescript
// Editor.tsx
interface EditorState {
  lastEditedSections: string[]           // Previous session (read-only)
  currentSessionEdits: Set<string>       // Current session (in-memory)
  // ... existing state
}

// DocumentPreview.tsx
interface DocumentPreviewProps {
  lastEditedSections?: string[]          // Optional for backward compatibility
  currentSessionEdits?: string[]         // Optional for backward compatibility
  // ... existing props
}
```

## Error Handling

### LocalStorage Failures

**Scenario**: localStorage.getItem() throws (privacy mode, quota exceeded)

**Handling**:
```typescript
try {
  const stored = localStorage.getItem(storageKey)
  // ... parse and use
} catch (error) {
  console.warn('Failed to read from localStorage:', error)
  setLastEditedSections([])  // Graceful degradation
}
```

### JSON Parse Errors

**Scenario**: Corrupted localStorage data

**Handling**:
```typescript
try {
  const parsed = JSON.parse(stored)
  setLastEditedSections(Array.isArray(parsed) ? parsed : [])
} catch (error) {
  console.warn('Failed to parse edited sections:', error)
  setLastEditedSections([])
  localStorage.removeItem(storageKey)  // Clean up corrupted data
}
```

### Missing Props

**Scenario**: DocumentPreview receives undefined props (backward compatibility)

**Handling**:
```typescript
const isPreviouslyEdited = 
  (lastEditedSections?.includes(sectionKey) ?? false) && 
  !(currentSessionEdits?.includes(sectionKey) ?? false)
```

## Testing Strategy

### Unit Tests

**Editor.tsx**:
- Test localStorage read on mount with valid data
- Test localStorage read on mount with no data
- Test localStorage read on mount with corrupted data
- Test currentSessionEdits Set updates on section save
- Test localStorage write on section save
- Test prop passing to DocumentPreview

**DocumentPreview.tsx**:
- Test sectionStyle returns orange styling for previously edited sections
- Test sectionStyle returns active styling (overrides orange) for active sections
- Test sectionStyle returns hover styling (overrides orange) for hovered sections
- Test sectionStyle returns no orange styling for sections in currentSessionEdits
- Test sectionStyle handles undefined lastEditedSections prop
- Test sectionStyle handles undefined currentSessionEdits prop

**SectionSidebar.tsx** (if implemented):
- Test orange dot renders for previously edited sections
- Test orange dot does not render for sections in currentSessionEdits
- Test orange dot does not render when props are undefined

### Integration Tests

- Test full workflow: edit section → save → refresh page → verify orange highlight
- Test highlight removal: edit previously highlighted section → verify orange disappears
- Test multiple projects: verify localStorage keys are project-scoped
- Test session persistence: edit sections → close tab → reopen → verify highlights
- Test priority order: verify active > hover > previous-edit styling

### Manual Testing Checklist

- [ ] Fresh project shows no orange highlights
- [ ] Editing and saving a section adds it to localStorage
- [ ] Refreshing page shows orange highlights for previous session edits
- [ ] Clicking a highlighted section removes the orange highlight after save
- [ ] Active section shows yellow highlight (not orange)
- [ ] Hovering a highlighted section shows blue border (not orange)
- [ ] Multiple projects maintain separate localStorage entries
- [ ] Browser privacy mode degrades gracefully (no highlights, no errors)
- [ ] Sidebar orange dots appear for previously edited sections (if implemented)
- [ ] Cover section receives orange background (no border) when previously edited

## Implementation Notes

### Backward Compatibility

The feature is designed to be backward compatible:
- New props are optional (`lastEditedSections?`, `currentSessionEdits?`)
- Existing functionality remains unchanged if props are undefined
- No backend changes required

### Performance Considerations

- **localStorage reads**: Once per project load (minimal impact)
- **localStorage writes**: Once per section save (already async operation)
- **Set operations**: O(1) for add/has operations
- **Array operations**: Small arrays (<31 sections), negligible performance impact

### Browser Compatibility

- localStorage is supported in all modern browsers
- Graceful degradation for privacy mode or disabled localStorage
- No polyfills required

### Future Enhancements

1. **Timestamp tracking**: Store edit timestamps for "edited X hours ago" tooltips
2. **Multi-session history**: Track last N sessions instead of just previous session
3. **Sync across devices**: Use backend storage instead of localStorage
4. **Highlight intensity**: Fade orange color based on time since last edit
5. **Keyboard shortcuts**: Add hotkey to jump to next previously edited section

## Deployment Considerations

### Rollout Strategy

1. Deploy frontend changes (no backend required)
2. Monitor browser console for localStorage errors
3. Collect user feedback on highlight visibility and usefulness

### Rollback Plan

If issues arise:
1. Remove `lastEditedSections` and `currentSessionEdits` props from DocumentPreview
2. Remove localStorage read/write logic from Editor
3. Revert sectionStyle function to original implementation

### Migration

No data migration required - feature starts fresh for all users.

