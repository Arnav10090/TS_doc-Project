# Design Document: Add Custom Sections Feature

## Overview

This design document specifies the technical implementation for adding custom sections and subsections to the document editor. The feature enables users to insert custom content (tables, images, rich text) at specific positions within the document preview while maintaining separation from the 31 predefined sections. Custom sections appear in both preview mode and the generated DOCX output with identical numbering and positioning.

### Key Design Principles

1. **Non-invasive Integration**: Custom sections are stored and rendered separately from predefined sections to avoid disrupting existing functionality
2. **Position-based Insertion**: Uses `insertAfterKey` field to track insertion points relative to existing sections
3. **Consistent Rendering**: Custom sections render identically in both preview and DOCX output with matching numbering and positioning
4. **Inline Styling**: All UI components use inline styles to maintain consistency with existing codebase
5. **Zero New Dependencies**: Leverages existing libraries (TipTap for rich text, native APIs for images)

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Document Editor                          │
├─────────────────┬───────────────────────┬───────────────────┤
│  Section        │   Document Preview    │  Section Input    │
│  Sidebar        │                       │  Panel            │
│                 │                       │                   │
│ ┌─────────────┐ │ ┌─────────────────┐  │ ┌───────────────┐ │
│ │ Predefined  │ │ │ Predefined      │  │ │ Section       │ │
│ │ Sections    │ │ │ Section Content │  │ │ Configuration │ │
│ └─────────────┘ │ └─────────────────┘  │ └───────────────┘ │
│                 │                       │                   │
│ ┌─────────────┐ │ ┌─────────────────┐  │ ┌───────────────┐ │
│ │ CUSTOM      │ │ │ Page Break      │  │ │ Custom        │ │
│ │ SECTIONS    │ │ │ + Add Button    │  │ │ Section       │ │
│ │ Group       │ │ └─────────────────┘  │ │ Editor        │ │
│ └─────────────┘ │                       │ └───────────────┘ │
│                 │ ┌─────────────────┐  │                   │
│                 │ │ Custom Section  │  │                   │
│                 │ │ Content         │  │                   │
│                 │ └─────────────────┘  │                   │
└─────────────────┴───────────────────────┴───────────────────┘
```

### Data Flow

```
User Action (Add Section Button)
        ↓
Section Type Modal (New Section / New Subsection)
        ↓
Section Input Panel (Configuration)
        ↓
Auto-save to Backend (upsertSection API)
        ↓
Document Preview Re-render (with custom sections)
        ↓
Section Sidebar Update (CUSTOM SECTIONS group)
```

## Components and Interfaces

### 1. Page Break Component with Add Button

**Location**: `frontend/src/components/preview/PageBreakWithButton.tsx` (new file)

**Purpose**: Displays page break separator with centered "Add New Section" button

**Interface**:
```typescript
interface PageBreakWithButtonProps {
  insertAfterKey: string;  // Section key before insertion point
  onAddClick: (insertAfterKey: string) => void;
}
```

**Styling Requirements**:
- Button centered in page break area
- Text: "+ Add New Section"
- Hover effect: color change to #E60012
- Hidden in print mode via CSS media query

### 2. Section Type Selection Modal

**Location**: `frontend/src/components/modals/SectionTypeModal.tsx` (new file)

**Purpose**: Prompts user to choose between New Section or New Subsection

**Interface**:
```typescript
interface SectionTypeModalProps {
  isOpen: boolean;
  insertAfterKey: string;
  onClose: () => void;
  onSelectType: (type: 'section' | 'subsection', insertAfterKey: string) => void;
}
```

**Behavior**:
- Modal overlay with centered dialog
- Two option buttons: "New Section" and "New Subsection"
- Close on outside click or Escape key
- Inline styles for all visual properties

### 3. Custom Section Configuration Panel

**Location**: `frontend/src/components/input/CustomSectionInput.tsx` (new file)

**Purpose**: Provides UI for configuring custom section title

**Interface**:
```typescript
interface CustomSectionInputProps {
  sectionKey: string;
  content: CustomSectionContent;
  onUpdate: (content: CustomSectionContent) => void;
}

interface CustomSectionContent {
  title?: string;
  subsections: CustomSubsection[];
  insertAfterKey: string;
}
```

**Features**:
- "Add Section Title" button
- Text input field for title entry
- Auto-save on blur or Enter key

### 4. Custom Subsection Configuration Panel

**Location**: `frontend/src/components/input/CustomSubsectionInput.tsx` (new file)

**Purpose**: Provides UI for configuring subsection name and content type

**Interface**:
```typescript
interface CustomSubsectionInputProps {
  parentSectionKey: string;
  subsectionKey: string;
  content: CustomSubsectionContent;
  onUpdate: (content: CustomSubsectionContent) => void;
}

interface CustomSubsectionContent {
  name: string;
  contentType: 'table' | 'image' | 'paragraph';
  data: TableData | ImageData | ParagraphData;
}
```

**Content Type Editors**:
- **Table Editor**: Column/row configuration interface
- **Image Editor**: File upload with base64 conversion
- **Paragraph Editor**: TipTap rich text editor

### 5. Table Subsection Editor

**Location**: `frontend/src/components/input/TableSubsectionEditor.tsx` (new file)

**Purpose**: Configures table structure and data

**Interface**:
```typescript
interface TableSubsectionEditorProps {
  data: TableData;
  onChange: (data: TableData) => void;
}

interface TableData {
  columns: string[];  // Column names
  rows: Record<string, string>[];  // Array of row objects
}
```

**Features**:
- Add/remove columns
- Add/remove rows
- Edit cell values
- Inline styles for table UI

### 6. Image Subsection Editor

**Location**: `frontend/src/components/input/ImageSubsectionEditor.tsx` (new file)

**Purpose**: Handles image upload and preview

**Interface**:
```typescript
interface ImageSubsectionEditorProps {
  data: ImageData;
  onChange: (data: ImageData) => void;
}

interface ImageData {
  base64: string;
  filename: string;
  mimeType: string;
}
```

**Features**:
- File input for PNG/JPG
- 10MB size validation
- Base64 conversion using FileReader API
- Image preview

### 7. Paragraph Subsection Editor

**Location**: `frontend/src/components/input/ParagraphSubsectionEditor.tsx` (new file)

**Purpose**: Rich text editing for paragraph content

**Interface**:
```typescript
interface ParagraphSubsectionEditorProps {
  data: ParagraphData;
  onChange: (data: ParagraphData) => void;
}

interface ParagraphData {
  html: string;
}
```

**Features**:
- TipTap editor with StarterKit + Underline extension
- Formatting: bold, italic, underline, lists
- Auto-save on content change
- Inline styles for editor container

### 8. Custom Section Renderer

**Location**: Integrated into `frontend/src/components/preview/DocumentPreview.tsx`

**Purpose**: Renders custom sections in document preview

**Rendering Logic**:
```typescript
const renderCustomSection = (section: CustomSectionContent, sectionNumber: number) => {
  return (
    <div style={customSectionStyle}>
      <h1 style={heading1Style}>
        {sectionNumber} {section.title || 'NEW SECTION'}
      </h1>
      {section.subsections.map((subsection, index) => 
        renderCustomSubsection(subsection, sectionNumber, index + 1)
      )}
    </div>
  );
};

const renderCustomSubsection = (
  subsection: CustomSubsectionContent,
  sectionNumber: number,
  subsectionNumber: number
) => {
  return (
    <div style={customSubsectionStyle}>
      <h2 style={heading2Style}>
        {sectionNumber}.{subsectionNumber} {subsection.name}
      </h2>
      {renderSubsectionContent(subsection)}
    </div>
  );
};
```

### 9. Section Sidebar Custom Sections Group

**Location**: Modified `frontend/src/components/layout/SectionSidebar.tsx`

**Purpose**: Displays custom sections in sidebar

**Implementation**:
```typescript
const CUSTOM_SECTIONS_GROUP: SectionGroup = {
  category: 'CUSTOM SECTIONS',
  sections: [] // Populated dynamically from sectionContents
};
```

**Features**:
- Appears after all predefined section groups
- Lists custom sections by title or "NEW SECTION" placeholder
- No completion badges for custom sections
- Click to activate and edit

## Data Models

### Custom Section Key Pattern

```typescript
// Section key format
const customSectionKey = `custom_section_${timestamp}_${uuid}`;
const customSubsectionKey = `custom_subsection_${timestamp}_${uuid}`;

// Example
"custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Custom Section Content Schema

```typescript
interface CustomSectionContent {
  title?: string;
  subsections: CustomSubsection[];
  insertAfterKey: string;  // Key of section before this one
}

interface CustomSubsection {
  key: string;  // custom_subsection_{timestamp}_{uuid}
  name: string;
  contentType: 'table' | 'image' | 'paragraph';
  data: TableData | ImageData | ParagraphData;
}

interface TableData {
  columns: string[];
  rows: Record<string, string>[];
}

interface ImageData {
  base64: string;
  filename: string;
  mimeType: string;
}

interface ParagraphData {
  html: string;
}
```

### Storage in Backend

Custom sections are stored using the existing `section_data` table with JSONB content field:

```sql
-- Example row
{
  "id": "uuid",
  "project_id": "uuid",
  "section_key": "custom_section_1704067200000_a1b2c3d4",
  "content": {
    "title": "Additional Requirements",
    "subsections": [
      {
        "key": "custom_subsection_1704067201000_b2c3d4e5",
        "name": "Compliance Matrix",
        "contentType": "table",
        "data": {
          "columns": ["Requirement", "Status", "Notes"],
          "rows": [
            {"Requirement": "ISO 27001", "Status": "Compliant", "Notes": "Certified"}
          ]
        }
      }
    ],
    "insertAfterKey": "features"
  },
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Position Tracking and Rendering Order

### Insert Position Algorithm

```typescript
// Determine insertion order for document preview
const getOrderedSections = (
  predefinedSections: string[],
  customSections: Record<string, CustomSectionContent>
): string[] => {
  const ordered: string[] = [];
  
  predefinedSections.forEach(predefinedKey => {
    ordered.push(predefinedKey);
    
    // Find custom sections that should appear after this predefined section
    Object.entries(customSections).forEach(([customKey, content]) => {
      if (content.insertAfterKey === predefinedKey) {
        ordered.push(customKey);
      }
    });
  });
  
  return ordered;
};
```

### Section Numbering

```typescript
// Section counter increments for both predefined and custom sections
let sectionNumber = 0;

orderedSections.forEach(sectionKey => {
  sectionNumber++;
  
  if (isCustomSection(sectionKey)) {
    renderCustomSection(sectionKey, sectionNumber);
  } else {
    renderPredefinedSection(sectionKey, sectionNumber);
  }
});
```

### Subsection Numbering

```typescript
// Subsection counter resets for each section
const renderSection = (sectionKey: string, sectionNumber: number) => {
  let subsectionNumber = 0;
  
  subsections.forEach(subsection => {
    subsectionNumber++;
    renderSubsection(subsection, sectionNumber, subsectionNumber);
  });
};
```

## Error Handling

### Validation Rules

1. **Section Key Validation**:
   - Must match pattern: `custom_section_{timestamp}_{uuid}` or `custom_subsection_{timestamp}_{uuid}`
   - Backend validates pattern before storage

2. **Image Upload Validation**:
   - File size: Maximum 10MB
   - File types: PNG, JPG only
   - Error message: "Image must be PNG or JPG and under 10MB"

3. **Table Validation**:
   - Minimum 1 column required
   - Column names must be non-empty
   - Error message: "Table must have at least one column with a name"

4. **Subsection Name Validation**:
   - Name must be non-empty
   - Error message: "Subsection name is required"

### Error States

```typescript
interface ErrorState {
  field: string;
  message: string;
}

// Example error handling
const validateImageUpload = (file: File): ErrorState | null => {
  if (file.size > 10 * 1024 * 1024) {
    return { field: 'image', message: 'Image must be under 10MB' };
  }
  
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    return { field: 'image', message: 'Image must be PNG or JPG' };
  }
  
  return null;
};
```

### Error Display

- Inline error messages below input fields
- Red text color (#E60012)
- Error icon (⚠️) prefix
- Auto-clear on valid input

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Section Key Format Validation

*For any* generated custom section key, the key SHALL match the pattern `custom_section_{timestamp}_{uuid}` where timestamp is a valid Unix timestamp in milliseconds and uuid is a valid UUID v4.

**Validates: Requirements 3.2, 8.1**

### Property 2: Subsection Key Format Validation

*For any* generated custom subsection key, the key SHALL match the pattern `custom_subsection_{timestamp}_{uuid}` where timestamp is a valid Unix timestamp in milliseconds and uuid is a valid UUID v4.

**Validates: Requirements 4.7, 8.2**

### Property 3: Insert Position Tracking

*For any* custom section created at a specific insertion point, the `insertAfterKey` field SHALL reference the section key immediately preceding the insertion point in the document order.

**Validates: Requirements 3.3, 8.3**

### Property 4: Sequential Section Numbering

*For any* document containing a mix of predefined and custom sections, the section numbers SHALL be sequential starting from 1, incrementing by 1 for each section regardless of type, and when a custom section is inserted between two predefined sections, all subsequent sections SHALL be renumbered accordingly.

**Validates: Requirements 3.4, 9.2, 9.3**

### Property 5: Subsection Numbering Within Parent

*For any* custom section containing subsections, the subsection numbers SHALL be sequential starting from 1 within that section, incrementing by 1 for each subsection, and resetting to 1 for each new parent section.

**Validates: Requirements 4.9, 9.4**

### Property 6: Backend Section Key Validation

*For any* section key submitted to the backend, the backend SHALL accept keys matching `custom_section_{timestamp}_{uuid}` pattern, `custom_subsection_{timestamp}_{uuid}` pattern, or any of the 31 predefined section keys, and SHALL reject with 400 Bad Request any key not matching these patterns.

**Validates: Requirements 8.4, 15.1, 15.2, 15.3, 15.4**

### Property 7: Image File Type Validation

*For any* file uploaded to an image subsection, the system SHALL accept files with MIME type `image/png` or `image/jpeg` and SHALL reject all other MIME types with an appropriate error message.

**Validates: Requirement 6.2**

### Property 8: Image Size Validation

*For any* file uploaded to an image subsection, the system SHALL reject files larger than 10MB (10,485,760 bytes) with an error message and SHALL accept files at or below this size limit.

**Validates: Requirement 6.3**

### Property 9: Base64 Image Conversion Round-Trip

*For any* valid image file (PNG or JPG under 10MB), converting the file to base64 and then decoding the base64 string SHALL produce data that is byte-for-byte identical to the original file data.

**Validates: Requirement 6.4**

### Property 10: Table HTML Generation

*For any* table configuration with N columns and M rows, the generated HTML SHALL contain exactly one `<table>` element with one `<thead>` containing N `<th>` elements and one `<tbody>` containing M `<tr>` elements each with N `<td>` elements.

**Validates: Requirement 5.5**

### Property 11: Rich Text Formatting Preservation

*For any* formatted text content created in the rich text editor (containing bold, italic, underline, or list formatting), the HTML stored in the backend and rendered in the preview SHALL preserve all applied formatting such that the visual appearance matches the editor state.

**Validates: Requirements 7.3, 7.5**

### Property 12: Completion Percentage Exclusion

*For any* number of custom sections (including zero), the completion percentage calculation SHALL only consider the 27 completable predefined sections and SHALL NOT include custom sections in either the numerator or denominator.

**Validates: Requirement 11.1**

### Property 13: DOCX Generation Inclusion

*For any* document containing custom sections, the generated DOCX file SHALL contain all custom section content, titles, and subsections at the same positions and with the same numbering as in the document preview.

**Validates: Requirement 12.1, 12.3, 12.4**

### Property 14: DOCX Generation Stability

*For any* document with N custom sections (where N ≥ 0), the DOCX generation process SHALL complete successfully and produce a valid DOCX file.

**Validates: Requirement 12.3**

### Property 15: DOCX Section Numbering Consistency

*For any* document containing custom sections interspersed with predefined sections, the section numbering in the generated DOCX SHALL exactly match the preview numbering, including custom sections in the sequence.

**Validates: Requirement 12.4**

### Property 16: Predefined Section Rendering Preservation

*For any* predefined section content, the rendered output in the document preview SHALL be identical before and after the custom sections feature is implemented, ensuring no regression in existing functionality.

**Validates: Requirement 14.1**

## Testing Strategy

### Dual Testing Approach

This feature requires both **unit tests** for specific examples and edge cases, and **property-based tests** for universal properties across all inputs. Together, these provide comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, UI interactions, and integration points
- **Property tests**: Verify universal properties hold across randomly generated inputs (minimum 100 iterations per test)

### Property-Based Tests

**Property Testing Library**: Use `fast-check` (already in project dependencies)

**Configuration**: Each property test MUST run minimum 100 iterations to ensure comprehensive input coverage.

**Test Tagging**: Each property test MUST include a comment tag referencing the design document property:
```typescript
// Feature: add-custom-sections, Property 1: Section Key Format Validation
```

**Property Test Coverage**:

1. **Property 1: Section Key Format Validation**
   - Generate random section keys
   - Verify all match pattern `^custom_section_\d+_[a-f0-9-]{36}$`
   - Tag: `Feature: add-custom-sections, Property 1: Section Key Format Validation`

2. **Property 2: Subsection Key Format Validation**
   - Generate random subsection keys
   - Verify all match pattern `^custom_subsection_\d+_[a-f0-9-]{36}$`
   - Tag: `Feature: add-custom-sections, Property 2: Subsection Key Format Validation`

3. **Property 3: Insert Position Tracking**
   - Generate random insertion points in document
   - Verify `insertAfterKey` always references correct preceding section
   - Tag: `Feature: add-custom-sections, Property 3: Insert Position Tracking`

4. **Property 4: Sequential Section Numbering**
   - Generate random mixes of predefined and custom sections
   - Verify numbering is always sequential (1, 2, 3, ...)
   - Verify insertion causes correct renumbering
   - Tag: `Feature: add-custom-sections, Property 4: Sequential Section Numbering`

5. **Property 5: Subsection Numbering Within Parent**
   - Generate random numbers of subsections per section
   - Verify numbering resets to 1 for each parent
   - Verify sequential numbering within parent
   - Tag: `Feature: add-custom-sections, Property 5: Subsection Numbering Within Parent`

6. **Property 6: Backend Section Key Validation**
   - Generate random valid and invalid section keys
   - Verify backend accepts all valid patterns
   - Verify backend rejects all invalid patterns with 400
   - Tag: `Feature: add-custom-sections, Property 6: Backend Section Key Validation`

7. **Property 7: Image File Type Validation**
   - Generate random file MIME types
   - Verify PNG/JPG accepted, all others rejected
   - Tag: `Feature: add-custom-sections, Property 7: Image File Type Validation`

8. **Property 8: Image Size Validation**
   - Generate random file sizes (including >10MB)
   - Verify files ≤10MB accepted, >10MB rejected
   - Tag: `Feature: add-custom-sections, Property 8: Image Size Validation`

9. **Property 9: Base64 Image Conversion Round-Trip**
   - Generate random image data
   - Verify encode→decode produces identical data
   - Tag: `Feature: add-custom-sections, Property 9: Base64 Image Conversion Round-Trip`

10. **Property 10: Table HTML Generation**
    - Generate random table configurations (N columns, M rows)
    - Verify HTML structure matches configuration
    - Tag: `Feature: add-custom-sections, Property 10: Table HTML Generation`

11. **Property 11: Rich Text Formatting Preservation**
    - Generate random formatted text (bold, italic, underline, lists)
    - Verify HTML storage and rendering preserves formatting
    - Tag: `Feature: add-custom-sections, Property 11: Rich Text Formatting Preservation`

12. **Property 12: Completion Percentage Exclusion**
    - Generate random numbers of custom sections (0 to 100)
    - Verify completion percentage always uses 27 as denominator
    - Verify custom sections never affect numerator
    - Tag: `Feature: add-custom-sections, Property 12: Completion Percentage Exclusion`

13. **Property 13: DOCX Generation Inclusion**
    - Generate random custom sections with various content types
    - Verify DOCX contains all custom section content at correct positions
    - Verify DOCX numbering matches preview numbering
    - Tag: `Feature: add-custom-sections, Property 13: DOCX Generation Inclusion`

14. **Property 14: DOCX Generation Stability**
    - Generate random numbers of custom sections
    - Verify DOCX generation always succeeds
    - Tag: `Feature: add-custom-sections, Property 14: DOCX Generation Stability`

15. **Property 15: DOCX Section Numbering Consistency**
    - Generate random custom section placements
    - Verify DOCX numbering exactly matches preview numbering
    - Tag: `Feature: add-custom-sections, Property 15: DOCX Section Numbering Consistency`

16. **Property 16: Predefined Section Rendering Preservation**
    - Generate random predefined section content
    - Verify rendering matches baseline (regression test)
    - Tag: `Feature: add-custom-sections, Property 16: Predefined Section Rendering Preservation`

**Example Property Test**:
```typescript
import fc from 'fast-check';

// Feature: add-custom-sections, Property 1: Section Key Format Validation
describe('Property 1: Section Key Format Validation', () => {
  it('should generate keys matching the required pattern', () => {
    fc.assert(
      fc.property(fc.nat(), fc.uuid(), (timestamp, uuid) => {
        const key = `custom_section_${timestamp}_${uuid}`;
        const pattern = /^custom_section_\d+_[a-f0-9-]{36}$/;
        expect(key).toMatch(pattern);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: add-custom-sections, Property 4: Sequential Section Numbering
describe('Property 4: Sequential Section Numbering', () => {
  it('should maintain sequential numbering with custom sections', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('predefined', 'custom'), { minLength: 1, maxLength: 20 }),
        (sectionTypes) => {
          const sections = sectionTypes.map((type, i) => ({
            key: type === 'predefined' ? `section_${i}` : `custom_section_${Date.now()}_${i}`,
            type
          }));
          
          const numbers = assignSectionNumbers(sections);
          
          // Verify sequential: [1, 2, 3, 4, ...]
          expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Tests

**Test Coverage**:
1. UI component rendering (buttons, modals, forms)
2. User interaction flows (click, hover, keyboard)
3. Specific edge cases (empty inputs, boundary values)
4. CSS styling consistency
5. Print mode behavior
6. Error message display
7. Auto-save integration

**Example Unit Tests**:
```typescript
describe('Custom Section UI', () => {
  it('should display Add Section button in page breaks', () => {
    render(<DocumentPreview sections={mockSections} />);
    const buttons = screen.getAllByText('+ Add New Section');
    expect(buttons.length).toBeGreaterThan(0);
  });
  
  it('should open modal on button click', async () => {
    render(<DocumentPreview sections={mockSections} />);
    const button = screen.getByText('+ Add New Section');
    await userEvent.click(button);
    expect(screen.getByText('What would you like to add?')).toBeInTheDocument();
  });
  
  it('should hide buttons in print mode', () => {
    render(<DocumentPreview sections={mockSections} />);
    const button = screen.getByText('+ Add New Section');
    
    // Simulate print mode
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === 'print',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    
    expect(button).toHaveStyle({ display: 'none' });
  });
});

describe('Image Upload Validation', () => {
  it('should reject files over 10MB', () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const error = validateImageUpload(largeFile);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('10MB');
  });
  
  it('should reject non-PNG/JPG files', () => {
    const gifFile = new File(['data'], 'image.gif', { type: 'image/gif' });
    const error = validateImageUpload(gifFile);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('PNG or JPG');
  });
  
  it('should accept valid PNG files under 10MB', () => {
    const validFile = new File(['data'], 'image.png', { type: 'image/png' });
    const error = validateImageUpload(validFile);
    expect(error).toBeNull();
  });
});
```

### Integration Tests

**Test Scenarios**:
1. Create custom section → verify in sidebar
2. Add table subsection → verify rendering in preview
3. Upload image → verify base64 storage and display
4. Add paragraph → verify HTML storage and formatting
5. Delete custom section → verify removal from preview and sidebar
6. Generate DOCX → verify custom sections excluded
7. Print preview → verify Add Section buttons hidden

**Example Integration Test**:
```typescript
describe('Custom Section Workflow', () => {
  it('should create and render custom section', async () => {
    // Click Add Section button
    await page.click('[data-testid="add-section-button-features"]');
    
    // Select "New Section"
    await page.click('[data-testid="section-type-new-section"]');
    
    // Enter title
    await page.fill('[data-testid="section-title-input"]', 'Custom Requirements');
    
    // Verify in sidebar
    const sidebarItem = await page.textContent('[data-testid="sidebar-custom-sections"]');
    expect(sidebarItem).toContain('Custom Requirements');
    
    // Verify in preview
    const previewHeading = await page.textContent('[data-testid="preview-section-heading"]');
    expect(previewHeading).toContain('Custom Requirements');
  });
});
```

### Manual Testing Checklist

- [ ] Add Section button appears in all page breaks
- [ ] Section Type Modal opens on button click
- [ ] Custom section renders with "NEW SECTION" placeholder
- [ ] Section title updates in preview and sidebar
- [ ] Table subsection renders with correct structure
- [ ] Image subsection displays uploaded image
- [ ] Paragraph subsection preserves formatting
- [ ] Section numbering updates correctly
- [ ] Subsection numbering resets per section
- [ ] Custom sections appear in sidebar under "CUSTOM SECTIONS"
- [ ] Completion percentage excludes custom sections
- [ ] DOCX generation includes custom sections with correct numbering
- [ ] Print mode hides Add Section buttons
- [ ] Auto-save persists custom section data
- [ ] Page refresh preserves custom sections

## Implementation Plan

### Phase 1: Backend Validation Extension

**Tasks**:
1. Update `VALID_SECTION_KEYS` in `backend/app/sections/router.py` to accept custom section key pattern
2. Add regex validation for `custom_section_{timestamp}_{uuid}` pattern
3. Add regex validation for `custom_subsection_{timestamp}_{uuid}` pattern
4. Update error messages to include custom section pattern

**Validation Logic**:
```python
import re

CUSTOM_SECTION_PATTERN = r'^custom_section_\d+_[a-f0-9-]{36}$'
CUSTOM_SUBSECTION_PATTERN = r'^custom_subsection_\d+_[a-f0-9-]{36}$'

def is_valid_section_key(section_key: str) -> bool:
    if section_key in VALID_SECTION_KEYS:
        return True
    if re.match(CUSTOM_SECTION_PATTERN, section_key):
        return True
    if re.match(CUSTOM_SUBSECTION_PATTERN, section_key):
        return True
    return False
```

### Phase 2: Data Models and Utilities

**Tasks**:
1. Create TypeScript interfaces in `frontend/src/types/customSections.ts`
2. Implement key generation utility
3. Implement position calculation utility
4. Implement section/subsection numbering utilities
5. Implement image validation utility
6. Implement base64 conversion utility

### Phase 3: UI Components

**Tasks**:
1. Create `PageBreakWithButton` component
2. Create `SectionTypeModal` component
3. Create `CustomSectionInput` component
4. Create `CustomSubsectionInput` component
5. Create `TableSubsectionEditor` component
6. Create `ImageSubsectionEditor` component
7. Create `ParagraphSubsectionEditor` component

### Phase 4: Preview Integration

**Tasks**:
1. Modify `DocumentPreview.tsx` to render custom sections
2. Implement custom section rendering logic
3. Implement custom subsection rendering logic
4. Update section numbering to include custom sections
5. Add page break buttons between sections
6. Update print mode CSS to hide buttons

### Phase 5: Sidebar Integration

**Tasks**:
1. Modify `SectionSidebar.tsx` to include "CUSTOM SECTIONS" group
2. Filter custom sections from sectionContents
3. Display custom section titles or placeholders
4. Handle custom section activation
5. Exclude custom sections from completion calculation

### Phase 6: DOCX Generation Filter

**Tasks**:
1. Modify DOCX generation logic to filter custom sections
2. Ensure section numbering in DOCX excludes custom sections
3. Test DOCX output with custom sections present

### Phase 7: Testing and Polish

**Tasks**:
1. Write unit tests for all utilities
2. Write integration tests for workflows
3. Perform manual testing
4. Fix bugs and edge cases
5. Update documentation

## Inline Styling Guidelines

All components must use inline styles following these patterns:

### Button Styles
```typescript
const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#E60012',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

const buttonHoverStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#C50010',
};
```

### Modal Styles
```typescript
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '24px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
};
```

### Input Styles
```typescript
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: '4px',
  fontSize: '14px',
  fontFamily: 'inherit',
};

const inputFocusStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#E60012',
  outline: 'none',
};
```

### Table Styles
```typescript
const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '10pt',
  marginBottom: '12px',
};

const tableHeaderStyle: React.CSSProperties = {
  fontWeight: 'bold',
  padding: '4px 8px',
  border: '1px solid #000',
  textAlign: 'left',
  verticalAlign: 'top',
  backgroundColor: '#F3F4F6',
};

const tableCellStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #000',
  verticalAlign: 'top',
};
```

## Print Mode Implementation

### CSS Media Query

```typescript
const printModeStyles = `
  @media print {
    .add-section-button,
    .preview-toolbar,
    .completion-badge,
    .section-hover-indicator {
      display: none !important;
    }
    
    .page-break {
      page-break-after: always;
      break-after: page;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: none !important;
    }
  }
`;
```

### Component Implementation

```typescript
// Add to DocumentPreview component
<style>{printModeStyles}</style>

// Add className to Add Section button
<button className="add-section-button" style={addButtonStyle}>
  + Add New Section
</button>
```

## Security Considerations

### Input Sanitization

1. **HTML Content**: Sanitize paragraph HTML to prevent XSS
   - Use DOMPurify or similar library (if not already in dependencies)
   - Whitelist allowed tags: `<p>, <strong>, <em>, <u>, <ul>, <ol>, <li>`
   - Strip script tags and event handlers

2. **Image Upload**: Validate file type and size
   - Check MIME type matches file extension
   - Limit file size to 10MB
   - Validate base64 encoding

3. **Section Keys**: Validate pattern on backend
   - Reject keys that don't match expected patterns
   - Prevent SQL injection through parameterized queries (already handled by SQLAlchemy)

### Access Control

- Custom sections inherit project-level access control
- No additional permissions required
- Deletion follows same rules as predefined sections (except cover)

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load custom section images on demand
2. **Memoization**: Use React.memo for custom section components
3. **Debouncing**: Debounce auto-save for paragraph editor (500ms)
4. **Virtual Scrolling**: Consider for large numbers of custom sections (future enhancement)

### Performance Metrics

- Custom section render time: < 100ms
- Image upload and conversion: < 2s for 10MB file
- Auto-save latency: < 500ms
- Preview re-render: < 200ms

## Accessibility

### ARIA Labels

```typescript
<button
  aria-label="Add new section after this page"
  className="add-section-button"
  style={addButtonStyle}
>
  + Add New Section
</button>

<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="section-type-modal-title"
>
  <h2 id="section-type-modal-title">What would you like to add?</h2>
  {/* Modal content */}
</div>
```

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Modal closes on Escape key
- Tab order follows logical flow
- Focus management for modal open/close

### Screen Reader Support

- Announce section creation
- Announce subsection addition
- Provide context for image uploads
- Label all form inputs

## Future Enhancements

### Potential Features (Out of Scope)

1. **Drag-and-Drop Reordering**: Allow users to reorder custom sections
2. **Section Templates**: Pre-defined custom section templates
3. **Export Custom Sections**: Option to include custom sections in DOCX
4. **Section Duplication**: Clone existing custom sections
5. **Rich Media**: Support for videos, PDFs, embedded content
6. **Collaborative Editing**: Real-time collaboration on custom sections
7. **Version History**: Track changes to custom sections
8. **Section Comments**: Add comments to custom sections

### Technical Debt Considerations

1. **Migration Path**: If custom sections need to be included in DOCX in future, design supports this by adding a flag
2. **Scalability**: Current design supports unlimited custom sections, but may need pagination for very large documents
3. **Search**: Custom section content not currently indexed for search (future enhancement)

## Conclusion

This design provides a comprehensive, non-invasive approach to adding custom sections to the document editor. By leveraging existing patterns, maintaining inline styling consistency, and using zero new dependencies, the implementation minimizes risk while delivering full functionality. The position-based insertion system ensures custom sections integrate seamlessly with predefined sections in the preview while remaining cleanly separated for DOCX generation.

