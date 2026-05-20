# Design Document: Enforce Page Dimensions

## Overview

This design document specifies the technical approach for restructuring the DocumentPreview component to enforce consistent page dimensions matching the target Word document format. The current implementation renders all content in a single scrollable container with visual PageBreak dividers, which does not accurately represent actual page boundaries. This refactoring will introduce discrete page containers with fixed dimensions (816px × 1056px) to provide an accurate preview of the final document layout.

### Current Architecture

The DocumentPreview component currently uses:
- A single outer container (`document-preview-print`) with `transform: scale(zoom)` applied
- One continuous content div (816px wide, variable height) containing all sections
- PageBreak components rendered inline between sections as visual dividers
- Conditional rendering based on `sectionExists()` checks

### Target Architecture

The refactored component will use:
- The same outer container with zoom scaling preserved
- Multiple discrete Page_Container divs (816px × 1056px each) with fixed heights
- PageBreak components rendered between Page_Container elements (not inside them)
- Content grouped into 10 logical page groupings
- Overflow clipping at page boundaries to simulate actual page constraints

## Architecture

### Component Structure

```
Preview_Wrapper (with zoom scaling)
├── Toolbar (unchanged)
├── Completion Badge (unchanged)
└── Scrollable Content Area
    ├── Page_Container (Page 1: Cover)
    ├── PageBreak
    ├── Page_Container (Page 2: Revision History + TOC)
    ├── PageBreak
    ├── Page_Container (Page 3: Executive Summary)
    ├── PageBreak
    ├── Page_Container (Page 4: General Overview group)
    ├── PageBreak
    ├── Page_Container (Page 5: Offerings group)
    ├── PageBreak
    ├── Page_Container (Page 6: Technology Stack group)
    ├── PageBreak
    ├── Page_Container (Page 7: Schedule group)
    ├── PageBreak
    ├── Page_Container (Page 8: Scope of Supply group)
    ├── PageBreak
    ├── Page_Container (Page 9: Disclaimer)
    ├── PageBreak
    └── Page_Container (Page 10: PoC + End text)
```

### Page Dimension Constants

The design introduces three named constants at the top of the DocumentPreview.tsx file:

```typescript
const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = 1056;
const PAGE_MARGIN_PX = 97;
```

These values are derived from:
- US Letter page: 21.59 cm × 27.94 cm
- At 96 DPI: 816px × 1056px
- Margins: 2.54 cm = 97px (all sides)
- Content area: 622px × 862px

### Page Container Specification

Each Page_Container will have the following CSS properties:

```typescript
const pageContainerStyle: React.CSSProperties = {
  width: `${PAGE_WIDTH_PX}px`,
  height: `${PAGE_HEIGHT_PX}px`,
  padding: `${PAGE_MARGIN_PX}px`,
  backgroundColor: '#FFFFFF',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  overflow: 'hidden',
  position: 'relative',
  margin: '0 auto',
  boxSizing: 'border-box',
};
```

Key properties:
- **Fixed height**: Unlike the current `minHeight`, this uses `height` to enforce strict boundaries
- **overflow: hidden**: Clips content exceeding page boundaries
- **boxSizing: border-box**: Ensures padding is included in the 1056px height
- **position: relative**: Maintains positioning context for child elements

## Components and Interfaces

### Page Grouping Strategy

Content sections are mapped to 10 discrete pages based on logical groupings:

| Page | Sections | Conditional Rendering |
|------|----------|----------------------|
| 1 | Cover | Always rendered (no condition) |
| 2 | Revision History, Table of Contents | `sectionExists('revision_history')` |
| 3 | Executive Summary | `sectionExists('executive_summary')` |
| 4 | Introduction, Abbreviations, Process Flow, Overview | Any of these sections exist |
| 5 | Features, Remote Support, Documentation Control, Customer Training, System Config, FAT Condition | Any of these sections exist |
| 6 | Tech Stack, Hardware Specs, Software Specs, Third Party SW | `sectionExists('tech_stack')` |
| 7 | Overall Gantt, Shutdown Gantt, Supervisors | Any of these sections exist |
| 8 | Scope Definitions through Cybersecurity | Any of these sections exist |
| 9 | Disclaimer | `sectionExists('disclaimer')` |
| 10 | PoC, End text | `sectionExists('poc')` |

### Conditional Rendering Logic

Each page group will use conditional rendering following this pattern:

```typescript
{(sectionExists('section1') || sectionExists('section2') || ...) && (
  <>
    <div style={pageContainerStyle}>
      {/* Page content */}
    </div>
    {/* Conditional PageBreak for next page */}
    {nextPageCondition && <PageBreak />}
  </>
)}
```

This ensures:
- Empty pages are not rendered
- PageBreaks only appear between rendered pages
- The pattern matches existing conditional rendering logic

### SectionWrapper Integration

The existing SectionWrapper component will continue to function within Page_Container elements:

```typescript
<div style={pageContainerStyle}>
  <SectionWrapper
    sectionKey="cover"
    isActive={isActive("cover")}
    isHovered={hoveredSection === "cover"}
    onMouseEnter={() => setHoveredSection("cover")}
    onMouseLeave={() => setHoveredSection(null)}
    onClick={() => handleSectionClick("cover")}
    sectionRef={(el) => (sectionRefs.current.cover = el)}
    style={sectionStyle("cover")}
  >
    {/* Section content */}
  </SectionWrapper>
</div>
```

All SectionWrapper functionality is preserved:
- Active section highlighting (yellow background, red border)
- Hover effects ("Click to edit" tooltip)
- Click handlers for navigation
- Section refs for scrollIntoView behavior

## Data Models

No new data models are required. The refactoring uses existing data structures:

- **sectionContents**: `Record<string, Record<string, any>>` - Unchanged
- **sectionRefs**: `useRef<Record<string, HTMLDivElement | null>>({})` - Unchanged
- **hoveredSection**: `string | null` - Unchanged
- **activeSectionKey**: `string | null` - Unchanged
- **zoom**: `number` - Unchanged

The page grouping logic is implemented as JSX structure, not as a data model, to maintain simplicity and avoid over-engineering.

## Error Handling

### Content Overflow

When content exceeds the 1056px page height:
- **Behavior**: Content is clipped at the page boundary (overflow: hidden)
- **User feedback**: No explicit warning (matches Word document behavior where content simply doesn't fit)
- **Rationale**: This accurately simulates the actual document generation behavior

### Empty Pages

When all sections in a page group return false from `sectionExists()`:
- **Behavior**: The entire Page_Container and its following PageBreak are not rendered
- **User feedback**: None required (page simply doesn't appear)
- **Rationale**: Prevents empty pages in the preview

### Section Navigation Edge Cases

When a user clicks a section in the sidebar:
- **Scenario 1**: Section is within a rendered page → scrollIntoView works normally
- **Scenario 2**: Section's page is not rendered (all sections in group are empty) → No action (section doesn't exist in DOM)
- **Handling**: Existing behavior is sufficient; no additional error handling needed

## Testing Strategy

### Unit Testing Approach

Since this is a UI restructuring with no new business logic, testing will focus on:

1. **Structural Tests**: Verify the correct number of Page_Container elements are rendered based on section existence
2. **Dimension Tests**: Verify Page_Container elements have correct width, height, and padding
3. **Conditional Rendering Tests**: Verify pages are hidden when all their sections are empty
4. **Integration Tests**: Verify existing functionality (zoom, navigation, section highlighting) continues to work

### Example Test Cases

```typescript
describe('DocumentPreview Page Structure', () => {
  it('should render page containers with correct dimensions', () => {
    // Verify PAGE_WIDTH_PX, PAGE_HEIGHT_PX, PAGE_MARGIN_PX constants
    // Verify each page container has these dimensions
  });

  it('should hide pages when all sections in group are empty', () => {
    // Mock sectionContents with specific sections missing
    // Verify corresponding page containers are not rendered
  });

  it('should render PageBreak between pages but not inside pages', () => {
    // Verify PageBreak components are siblings of Page_Container, not children
  });

  it('should preserve zoom functionality across all pages', () => {
    // Verify transform: scale() is applied to wrapper, not individual pages
  });

  it('should preserve section navigation within pages', () => {
    // Click a section in sidebar
    // Verify scrollIntoView is called on the correct section ref
  });

  it('should clip content exceeding page height', () => {
    // Render a page with excessive content
    // Verify overflow: hidden is applied
  });
});
```

### Testing Constraints

Per Requirement 14:
- Existing test files SHALL NOT be modified
- Tests must pass without requiring modifications
- The component interface must remain compatible with existing test expectations

This means:
- Props interface remains unchanged
- Public methods/refs remain unchanged
- DOM structure changes are internal implementation details

### Manual Testing Checklist

1. **Visual Verification**:
   - Each page appears as a discrete 816px × 1056px container
   - PageBreaks appear between pages with correct styling
   - Content is clipped at page boundaries

2. **Zoom Functionality**:
   - Zoom in/out buttons work correctly
   - All pages scale uniformly
   - Fit Width button resets to 100%

3. **Section Navigation**:
   - Clicking sections in sidebar scrolls to correct location
   - Active section highlighting works across page boundaries
   - Hover effects work on sections within pages

4. **Conditional Rendering**:
   - Empty pages are not rendered
   - PageBreaks are not rendered after the last page
   - Completion badge shows correct count

5. **Print Functionality**:
   - Print preview shows correct page breaks
   - PageBreak visual indicators are hidden in print mode
   - All pages print correctly

## Implementation Plan

### Phase 1: Define Constants and Page Container Style

1. Add constants at top of file:
   ```typescript
   const PAGE_WIDTH_PX = 816;
   const PAGE_HEIGHT_PX = 1056;
   const PAGE_MARGIN_PX = 97;
   ```

2. Define pageContainerStyle object within the component (after other style constants)

### Phase 2: Restructure JSX - Cover Page (Page 1)

1. Locate the existing Cover section (starts with `<SectionWrapper sectionKey="cover"`)
2. Wrap it in a Page_Container div:
   ```typescript
   <div style={pageContainerStyle}>
     <SectionWrapper sectionKey="cover" ...>
       {/* Existing cover content */}
     </SectionWrapper>
   </div>
   ```
3. Move the existing PageBreak after cover to be a sibling of the Page_Container (not inside it)

### Phase 3: Restructure JSX - Remaining Pages (Pages 2-10)

For each page group:
1. Identify the sections belonging to that page
2. Wrap them in a conditional block with Page_Container:
   ```typescript
   {(condition) && (
     <>
       <div style={pageContainerStyle}>
         {/* Section content */}
       </div>
       {nextPageCondition && <PageBreak />}
     </>
   )}
   ```
3. Remove old PageBreak placements that were inline with sections

### Phase 4: Verification

1. Run existing tests to ensure no regressions
2. Perform manual testing checklist
3. Verify print functionality
4. Check zoom behavior at all levels

### Implementation Notes

- **Preserve all existing code**: Only modify JSX structure, not logic
- **No changes to**: SectionWrapper, sectionStyle(), handlers, image loading, template replacements, style constants, PageBreak component, counter management
- **Single file modification**: Only DocumentPreview.tsx is changed

## Rationale for Design Decisions

### Why Fixed Height Instead of Min-Height?

The current implementation uses `minHeight: "1056px"` on the single document container. This allows content to expand beyond the page boundary, which doesn't accurately represent the final Word document.

Using `height: "1056px"` with `overflow: "hidden"` enforces strict page boundaries, providing users with an accurate preview of what will fit on each page.

### Why 10 Page Groupings?

The 10-page structure is based on:
1. **Logical content groupings**: Sections are grouped by topic (Overview, Offerings, Technology, Schedule, etc.)
2. **Typical document length**: Most technical specifications fit within 10-15 pages
3. **Simplicity**: Avoids complex pagination algorithms while providing accurate preview

This is a pragmatic approach that balances accuracy with implementation simplicity.

### Why Not Dynamic Pagination?

Dynamic pagination (automatically flowing content across pages based on height) was considered but rejected because:
1. **Complexity**: Would require measuring rendered content height and splitting sections
2. **Section integrity**: Sections should not be split across pages (matches Word template behavior)
3. **Performance**: Real-time height measurement and re-pagination would impact performance
4. **Scope**: Requirement 15 mandates minimal, controlled changes

The fixed 10-page grouping provides sufficient accuracy for the preview use case.

### Why Clip Content Instead of Warning?

When content exceeds page height, the design clips it (overflow: hidden) rather than showing a warning because:
1. **Matches Word behavior**: The actual Word document generation will also clip or paginate content
2. **Simplifies UI**: No additional warning components or state management needed
3. **User expectation**: Users understand that content must fit within page boundaries
4. **Scope constraint**: Requirement 15 mandates changes only to DocumentPreview.tsx

If content clipping becomes a user issue, a future enhancement could add visual indicators (e.g., "Content exceeds page height" badge).

### Why Preserve Existing PageBreak Component?

The PageBreak component is preserved unchanged because:
1. **Requirement 13.8**: "THE PageBreak component definition SHALL remain unchanged"
2. **Print functionality**: PageBreak contains `pageBreakAfter: "always"` for print mode
3. **Visual separation**: The component provides clear visual separation between pages in screen mode
4. **Minimal changes**: Reusing existing components reduces refactoring scope

The only change is placement: PageBreaks move from being inline with sections to being siblings of Page_Container elements.

## Migration and Rollback

### Migration Strategy

This is a pure refactoring with no data migration required:
- No database changes
- No API changes
- No configuration changes
- No user data affected

Deployment is a standard frontend code update.

### Rollback Plan

If issues are discovered post-deployment:
1. **Immediate rollback**: Revert the single commit changing DocumentPreview.tsx
2. **No data cleanup**: No data was modified, so no cleanup needed
3. **User impact**: Users see the old preview format (single scrollable container)

The single-file change makes rollback trivial and low-risk.

## Performance Considerations

### Rendering Performance

**Current**: Single large container with all content
**New**: 10 discrete containers with same content

**Impact**: Negligible
- Same number of DOM elements (sections, tables, images)
- Same React component tree depth
- Additional 10 wrapper divs have minimal overhead

### Scroll Performance

**Current**: Scrolling through one large container
**New**: Scrolling through multiple fixed-height containers

**Impact**: Negligible
- Browser handles scrolling of multiple containers efficiently
- No JavaScript scroll handlers added
- Transform: scale() performance unchanged

### Memory Usage

**Impact**: Negligible
- Same content rendered
- Same images loaded
- Same state management
- Additional 10 style objects have minimal memory footprint

## Accessibility Considerations

### Screen Reader Compatibility

The refactoring maintains screen reader compatibility:
- Semantic HTML structure preserved (headings, tables, lists)
- ARIA labels and roles unchanged
- Tab order unchanged (determined by DOM order, which is preserved)

### Keyboard Navigation

Keyboard navigation is preserved:
- Tab order follows DOM order (unchanged)
- Section click handlers work with keyboard (Enter/Space)
- Zoom controls remain keyboard accessible

### Visual Accessibility

The refactoring maintains visual accessibility:
- Color contrast unchanged (same styles)
- Font sizes unchanged
- Zoom functionality preserved (critical for low-vision users)

## Security Considerations

This refactoring has no security implications:
- No new user input handling
- No new API calls
- No new data storage
- No new external dependencies

The change is purely presentational (CSS/JSX structure).

## Future Enhancements

While out of scope for this feature, potential future enhancements include:

1. **Dynamic Pagination**: Automatically flow content across pages based on measured height
2. **Page Number Display**: Show "Page X of Y" in preview
3. **Content Overflow Warnings**: Visual indicators when content exceeds page height
4. **Adjustable Page Size**: Support for A4 vs Letter page formats
5. **Page Thumbnails**: Sidebar with thumbnail previews of each page
6. **Print Preview Mode**: Dedicated print preview with accurate page breaks

These enhancements would require additional requirements gathering and design work.

