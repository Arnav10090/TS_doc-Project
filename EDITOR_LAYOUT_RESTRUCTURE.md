# Editor Layout Restructure: 2-Column to 3-Column

## Overview
Restructured the Editor page from a 2-column layout (sidebar + content) to a 3-column layout (sidebar + preview + input panel) to provide a better editing experience with live document preview.

## Layout Changes

### Previous Layout (2-Column)
```
[260px SectionSidebar] | [flex-1 Main Content - Section Forms]
```

### New Layout (3-Column)
```
[200px SectionSidebar] | [flex-1 DocumentPreview] | [380px SectionInputPanel]
```

## Component Changes

### 1. SectionSidebar (Modified)
**File**: `frontend/src/components/layout/SectionSidebar.tsx`

**Changes**:
- Width reduced from `260px` to `200px`
- Category label padding reduced from `12px` to `8px`
- Section label font size reduced from `14px` to `13px`
- All other functionality unchanged

**Purpose**: Narrower sidebar to make room for the center preview panel while maintaining all navigation functionality.

### 2. SectionInputPanel (New)
**File**: `frontend/src/components/layout/SectionInputPanel.tsx`

**Features**:
- Fixed width: `380px`
- Fixed position on the right side
- Sticky header showing active section name
- Scrollable content area with `16px` padding
- Contains all 31 section form components
- White background with left border

**Structure**:
```tsx
<aside> (380px, fixed right)
  <div> Sticky Header (section name)
  <div> Scrollable Content (section component)
</aside>
```

**Props**:
- `projectId: string` - Current project ID
- `activeSectionKey: string` - Active section key to render

### 3. DocumentPreview (New)
**File**: `frontend/src/components/layout/DocumentPreview.tsx`

**Features**:
- Takes remaining space between sidebar and input panel
- Background: `#E8E8E8` (simulates Word's grey desktop)
- Contains white A4-sized page (816x1056px)
- Scrollable independently
- Padding: `24px` around the page
- Currently shows placeholder with document icon

**Purpose**: Will display live preview of the generated document as users edit sections (to be implemented in future).

### 4. Editor.tsx (Restructured)
**File**: `frontend/src/pages/Editor.tsx`

**Major Changes**:
1. Removed all section component imports (moved to SectionInputPanel)
2. Removed SECTION_COMPONENTS mapping (moved to SectionInputPanel)
3. Added imports for SectionInputPanel and DocumentPreview
4. Added responsive state management:
   - `showPreview` - Controls preview visibility
   - `isNarrowScreen` - Detects screens below 1200px

**Layout Structure**:
```tsx
<div> Container
  <Header />
  <div> 3-Column Layout
    <SectionSidebar /> (200px left)
    <DocumentPreview /> (center, flex-1)
    <SectionInputPanel /> (380px right)
  </div>
</div>
```

## Responsive Behavior

### Wide Screens (≥1200px)
- All 3 columns visible
- Layout: `[200px Sidebar] | [flex-1 Preview] | [380px Input]`
- Preview takes remaining space

### Narrow Screens (<1200px)
- Preview hidden by default
- Layout: `[200px Sidebar] | [flex-1 Input]`
- "Show Preview" button appears at bottom center
- Clicking "Show Preview" shows preview as overlay
- Preview overlay covers entire screen with "Close Preview" button

## Column Dimensions

| Column | Width | Position | Scrollable |
|--------|-------|----------|------------|
| Sidebar | 200px | Fixed left | Yes (sections list only) |
| Preview | flex-1 | Center | Yes |
| Input Panel | 380px | Fixed right | Yes |

**Total fixed width**: 200px + 380px = 580px
**Minimum screen width for 3-column**: 1200px (leaves 620px for preview)

## Independent Scrolling

Each column scrolls independently:
1. **Sidebar**: Only the section list scrolls; progress bar and generate button stay fixed
2. **Preview**: Entire preview area scrolls to view full document
3. **Input Panel**: Only the form content scrolls; section header stays sticky

## Benefits

### 1. Better Context
- Users can see document preview while editing
- Immediate visual feedback on changes
- Reduces need to generate document repeatedly

### 2. Improved Workflow
- Section forms in dedicated panel
- More focused editing experience
- Preview doesn't interfere with form inputs

### 3. Responsive Design
- Gracefully degrades on smaller screens
- Preview available on-demand via overlay
- Maintains usability across screen sizes

### 4. Cleaner Code
- Section components separated into dedicated panel
- Editor.tsx simplified (no section imports)
- Better separation of concerns

## Files Created

1. `frontend/src/components/layout/SectionInputPanel.tsx` - Right panel with section forms
2. `frontend/src/components/layout/DocumentPreview.tsx` - Center panel with document preview

## Files Modified

1. `frontend/src/components/layout/SectionSidebar.tsx` - Reduced width and font sizes
2. `frontend/src/pages/Editor.tsx` - Restructured to 3-column layout with responsive behavior

## Future Enhancements

### DocumentPreview Component
The DocumentPreview component is currently a placeholder. Future implementation will:
- Render actual document content based on section data
- Update in real-time as users edit sections
- Show formatted text, tables, and images
- Match the final Word document appearance
- Support zoom controls
- Highlight active section in preview

### Possible Features
- Drag to resize columns
- Toggle preview visibility with keyboard shortcut
- Print preview mode
- Export preview as PDF
- Collaborative editing indicators

## Testing Notes

### Manual Testing Checklist
- ✓ All 31 sections render correctly in right panel
- ✓ Sidebar navigation works (200px width)
- ✓ Preview area displays placeholder
- ✓ All three columns scroll independently
- ✓ Responsive behavior at 1200px breakpoint
- ✓ "Show Preview" button appears on narrow screens
- ✓ Preview overlay works correctly
- ✓ Section header stays sticky in input panel
- ✓ Auto-save still works in section forms

### Browser Compatibility
- Test in Chrome, Firefox, Safari, Edge
- Test responsive behavior at various screen widths
- Test scrolling performance with long sections

## Migration Notes

### No Breaking Changes
- All section components unchanged
- All props and APIs unchanged
- Existing functionality preserved
- Only layout structure changed

### User Impact
- Users will see new 3-column layout immediately
- No data migration required
- No changes to saved section data
- Improved editing experience
