# Design Document: Section and Subsection Numbering

## Overview

This design implements automatic hierarchical numbering for sections and subsections in the DocumentPreview component. The feature adds sequential numbering (e.g., "1. EXECUTIVE SUMMARY", "2. GENERAL OVERVIEW", "2.1 INTRODUCTION") to improve document navigation and professional appearance.

The implementation uses React state management to track section and subsection counters during the render cycle. Numbers are prepended to heading text content while preserving all existing styling, colors, and formatting.

### Key Design Decisions

1. **Counter Management**: Use React `useRef` to maintain mutable counters that persist across renders without triggering re-renders
2. **Render-time Calculation**: Calculate numbering during render rather than pre-processing to ensure consistency with document order
3. **Helper Function Approach**: Create utility functions to format heading text with numbers, keeping the main render logic clean
4. **Cover Page Exclusion**: Skip numbering for the cover page section to match professional document standards
5. **Table of Contents Exclusion**: Exclude the TOC placeholder from numbering as it's not a content section

## Architecture

### Component Structure

```
DocumentPreview (React.FC)
├── State Management
│   ├── sectionCounter (useRef<number>)
│   └── subsectionCounter (useRef<number>)
├── Helper Functions
│   ├── resetCounters()
│   ├── getNextSectionNumber()
│   ├── getNextSubsectionNumber()
│   └── formatHeadingWithNumber(text, number)
└── Render Logic
    ├── Cover Page (no numbering)
    ├── Revision History (no numbering)
    ├── Table of Contents (no numbering)
    ├── Section 1: Executive Summary
    │   └── (no subsections)
    ├── Section 2: General Overview
    │   ├── 2.1 Introduction
    │   ├── 2.2 Abbreviations Used
    │   ├── 2.3 Process Flow
    │   └── 2.4 Overview of {SolutionName}
    ├── Section 3: Offerings
    │   ├── 3.1 Design Scope of Work
    │   ├── 3.2 Remote Support System
    │   ├── 3.3 Documentation Control
    │   ├── 3.4 Customer Training
    │   ├── 3.5 System Configuration
    │   └── 3.6 FAT Condition
    ├── Section 4: Technology Stack
    │   ├── 4.1 Hardware Specifications
    │   ├── 4.2 Software Specifications
    │   └── 4.3 Third Party Software
    ├── Section 5: Schedule
    │   ├── 5.1 Overall Gantt Chart
    │   └── 5.2 Shutdown Gantt Chart
    ├── Section 6: Scope of Supply
    │   ├── 6.1 Scope of Supply Definitions
    │   ├── 6.2 Division of Engineering...
    │   ├── 6.3 Value Addition
    │   ├── 6.4 Work Completion Certificate
    │   ├── 6.5 Buyer Obligations
    │   ├── 6.6 Exclusion List
    │   ├── 6.7 Buyer Prerequisites
    │   ├── 6.8 Binding Conditions
    │   └── 6.9 Cybersecurity Disclaimer
    ├── Section 7: Disclaimer
    │   └── (subsections rendered dynamically)
    └── Section 8: Complimentary Proof of Concepts
        └── (no subsections)
```

### Counter Management Strategy

The design uses `useRef` for counter management because:
- Counters need to persist across the entire render cycle
- Counter updates should not trigger component re-renders
- Counters must be reset at the start of each render to ensure consistency

```typescript
const sectionCounter = useRef<number>(0);
const subsectionCounter = useRef<number>(0);
```

### Numbering Rules

1. **Section Numbering**: Starts at 1, increments for each h1 element after cover/revision/TOC
2. **Subsection Numbering**: Resets to 0 when a new section begins, starts at 1 for first subsection
3. **Format**: Sections use "N. ", subsections use "N.M " (where N is section, M is subsection)
4. **Exclusions**: Cover page, revision history, and table of contents are not numbered

## Components and Interfaces

### Helper Functions

#### `resetCounters()`
```typescript
const resetCounters = () => {
  sectionCounter.current = 0;
  subsectionCounter.current = 0;
};
```
- **Purpose**: Reset all counters to initial state
- **Called**: At the start of the render function
- **Returns**: void

#### `getNextSectionNumber()`
```typescript
const getNextSectionNumber = (): number => {
  sectionCounter.current += 1;
  subsectionCounter.current = 0;
  return sectionCounter.current;
};
```
- **Purpose**: Increment section counter and reset subsection counter
- **Called**: Before rendering each h1 section heading
- **Returns**: Current section number
- **Side Effects**: Resets subsection counter to 0

#### `getNextSubsectionNumber()`
```typescript
const getNextSubsectionNumber = (): number => {
  subsectionCounter.current += 1;
  return subsectionCounter.current;
};
```
- **Purpose**: Increment subsection counter
- **Called**: Before rendering each h2 subsection heading
- **Returns**: Current subsection number

#### `formatHeadingWithNumber(text: string, number: string): string`
```typescript
const formatHeadingWithNumber = (text: string, number: string): string => {
  return `${number} ${text}`;
};
```
- **Purpose**: Prepend number to heading text with proper spacing
- **Parameters**:
  - `text`: Original heading text
  - `number`: Formatted number string (e.g., "1.", "2.1")
- **Returns**: Formatted heading text with number prefix

### Integration Points

#### Existing Heading Rendering
Current pattern:
```tsx
<h1 style={heading1RedStyle}>GENERAL OVERVIEW</h1>
```

Updated pattern:
```tsx
<h1 style={heading1RedStyle}>
  {formatHeadingWithNumber('GENERAL OVERVIEW', `${getNextSectionNumber()}.`)}
</h1>
```

#### Subsection Rendering
Current pattern:
```tsx
<h2 style={heading2RedStyle}>INTRODUCTION</h2>
```

Updated pattern:
```tsx
<h2 style={heading2BlackStyle}>
  {formatHeadingWithNumber('INTRODUCTION', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
</h2>
```

## Data Models

### Counter State
```typescript
interface CounterRefs {
  sectionCounter: React.MutableRefObject<number>;
  subsectionCounter: React.MutableRefObject<number>;
}
```

### Heading Metadata
```typescript
interface HeadingInfo {
  text: string;           // Original heading text
  level: 1 | 2 | 3;      // Heading level (h1, h2, h3)
  shouldNumber: boolean;  // Whether this heading should be numbered
  sectionKey: string;     // Section key for identification
}
```

## Error Handling

### Counter Overflow
- **Scenario**: Section or subsection counter exceeds reasonable limits (>999)
- **Handling**: No special handling needed; JavaScript numbers support values well beyond document needs
- **Prevention**: Document structure naturally limits sections to <20

### Missing Heading Text
- **Scenario**: Heading text is empty or undefined
- **Handling**: Format function handles empty strings gracefully
- **Result**: Number is still prepended (e.g., "1. " with no text)

### Re-render Consistency
- **Scenario**: Component re-renders due to state changes
- **Handling**: Counters are reset at start of render via `resetCounters()`
- **Result**: Numbering remains consistent across re-renders

### Dynamic Content
- **Scenario**: Section content changes (e.g., features array modified)
- **Handling**: Numbering recalculates on each render
- **Result**: Numbers automatically adjust to new document structure

## Testing Strategy

### Unit Testing Approach

This feature involves UI rendering and visual formatting, making it more suitable for example-based unit tests and integration tests rather than property-based testing. The behavior is deterministic and based on document structure rather than varying inputs.

#### Unit Tests

1. **Counter Management Tests**
   - Test `resetCounters()` sets counters to 0
   - Test `getNextSectionNumber()` increments section counter and resets subsection counter
   - Test `getNextSubsectionNumber()` increments subsection counter
   - Test counter sequence: multiple calls produce correct sequence (1, 2, 3...)

2. **Formatting Tests**
   - Test `formatHeadingWithNumber()` with various inputs
   - Test empty string handling
   - Test special characters in heading text
   - Test very long heading text

3. **Integration Tests**
   - Test complete document render produces correct numbering sequence
   - Test cover page is not numbered
   - Test revision history is not numbered
   - Test table of contents is not numbered
   - Test first section after TOC is numbered "1."
   - Test subsections are numbered correctly (e.g., "2.1", "2.2")
   - Test subsection counter resets when new section begins

4. **Visual Regression Tests**
   - Snapshot test of rendered document with numbering
   - Verify numbering appears with correct styling
   - Verify spacing between number and text is consistent

#### Test Examples

```typescript
describe('Section Numbering', () => {
  it('should number first section as 1', () => {
    // Render component
    // Find first h1 after TOC
    // Assert text starts with "1. "
  });

  it('should number subsections hierarchically', () => {
    // Render component
    // Find section 2 subsections
    // Assert first subsection is "2.1"
    // Assert second subsection is "2.2"
  });

  it('should reset subsection counter for new section', () => {
    // Render component
    // Find section 3 first subsection
    // Assert it is "3.1" not "3.N" where N > 1
  });

  it('should exclude cover page from numbering', () => {
    // Render component
    // Find cover page h1
    // Assert text does not start with number
  });
});
```

### Manual Testing Checklist

- [ ] Verify all sections after TOC are numbered sequentially
- [ ] Verify subsections use hierarchical numbering (X.Y format)
- [ ] Verify cover page has no numbering
- [ ] Verify revision history has no numbering
- [ ] Verify table of contents has no numbering
- [ ] Verify numbering matches existing heading styles (color, font, size)
- [ ] Verify spacing between number and text is consistent
- [ ] Verify numbering persists across zoom level changes
- [ ] Verify numbering updates correctly when sections are edited
- [ ] Verify print preview shows correct numbering

## Implementation Notes

### Render Order Dependency

The numbering implementation depends on the render order of sections in the JSX. The current DocumentPreview component renders sections in a fixed order, which ensures consistent numbering. If sections are ever rendered conditionally or in dynamic order, the numbering logic will need to be updated.

### Performance Considerations

- Counter operations are O(1) and have negligible performance impact
- String concatenation for formatting is minimal overhead
- No additional re-renders are triggered by counter updates
- Memory footprint is minimal (two integer refs)

### Styling Preservation

The implementation preserves all existing heading styles:
- Font family (Hitachi Sans with Arial fallback)
- Font size (16pt for h1, 12pt for h2)
- Font weight (bold)
- Colors (burgundy, red, blue, black as per template)
- Text transform (uppercase where applicable)
- Margins and spacing

### Future Extensibility

The design supports future enhancements:
- Third-level heading (h3) numbering can be added with similar pattern
- Custom numbering formats (Roman numerals, letters) can be implemented by modifying format function
- Conditional numbering rules can be added via configuration
- Numbering can be made optional via a toggle prop

## Accessibility Considerations

- Screen readers will announce numbers as part of heading text
- Heading hierarchy (h1, h2, h3) remains semantic and accessible
- No ARIA attributes needed as numbering is part of text content
- Keyboard navigation through headings works as before

## Browser Compatibility

- Uses standard React hooks (useRef) - supported in all modern browsers
- String concatenation is universally supported
- No browser-specific APIs or features used
- Works in all browsers that support the existing DocumentPreview component
