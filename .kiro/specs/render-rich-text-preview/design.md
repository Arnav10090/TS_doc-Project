# Design Document: Render Rich Text Preview

## Overview

This design specifies the implementation of rich text rendering in the DocumentPreview component. Currently, the preview strips all HTML tags from TipTap editor output using the `stripHtml` utility, resulting in plain unformatted text. This feature introduces a `RichTextRenderer` utility that safely parses TipTap HTML output and converts it to styled React JSX elements, enabling users to see their rich text formatting (bullet lists, numbered lists, bold, italic, underline) in the Word-like document preview.

The implementation focuses on:
- **Security**: Safe HTML parsing without `dangerouslySetInnerHTML`
- **Accuracy**: Matching Word document styling exactly
- **Maintainability**: Minimal changes confined to the preview component
- **Backward Compatibility**: Preserving existing template interpolation and placeholder logic

## Architecture

### Component Structure

```
frontend/src/components/preview/
├── DocumentPreview.tsx          (modified)
│   ├── RichTextRenderer()       (new utility function)
│   ├── stripHtml()              (unchanged - still used for template interpolation)
│   └── DocumentPreview component (modified to use RichTextRenderer)
└── DocumentPreview.*.test.tsx   (new test files)
```

### Design Decisions

**1. Utility Function vs Separate Component**

We implement `RichTextRenderer` as a utility function within `DocumentPreview.tsx` rather than a separate component file because:
- It's tightly coupled to DocumentPreview's styling constants
- It's not reusable outside this specific context
- It keeps all preview-related code in one file
- It simplifies the implementation (no prop drilling for styles)

**2. DOMParser for HTML Parsing**

We use the browser's native `DOMParser` API to parse HTML strings:
- No external dependencies required
- Built-in XSS protection (scripts don't execute in parsed DOM)
- Standard browser API with excellent support
- Efficient for small HTML fragments

**3. Recursive JSX Conversion**

The renderer recursively walks the parsed DOM tree and converts each node to React JSX:
- Text nodes → string content
- Element nodes → React elements with appropriate styles
- Unsupported elements → ignored (security)

## Components and Interfaces

### RichTextRenderer Utility Function

```typescript
/**
 * Safely renders TipTap HTML output as styled React JSX elements.
 * Supports: p, ul, ol, li, strong, em, u tags.
 * 
 * @param html - HTML string from TipTap editor (can be null/empty)
 * @param baseStyle - Base CSS properties to apply to all elements
 * @returns React JSX elements or null if input is empty
 */
function RichTextRenderer(
  html: string | null | undefined,
  baseStyle?: React.CSSProperties
): React.ReactNode
```

**Supported HTML Elements:**
- `<p>` → paragraph with `bodyParagraphStyle`
- `<ul>` → unordered list
- `<ol>` → ordered list
- `<li>` → list item with `listParagraphStyle`
- `<strong>` → bold text (`fontWeight: 'bold'`)
- `<em>` → italic text (`fontStyle: 'italic'`)
- `<u>` → underlined text (`textDecoration: 'underline'`)

**Unsupported/Ignored Elements:**
- `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` (security)
- Any other HTML tags not in the supported list

### Integration Points in DocumentPreview

The following 12 user-authored fields will be updated to use `RichTextRenderer`:

1. `executiveSummary.para1` (line ~1323)
2. `processFlow.text` (lines ~1323, ~1353)
3. `overview.system_objective` (line ~1369)
4. `overview.existing_system` (line ~1379)
5. `overview.integration` (line ~1389)
6. `overview.tangible_benefits` (line ~1400)
7. `overview.intangible_benefits` (line ~1410)
8. `remoteSupport.text` (line ~1516)
9. `fatCondition.text` (line ~1649)
10. `valueAddition.text` (line ~2273)
11. `poc.description` (line ~2523)
12. `features[].description` (line ~1479)

**Pattern for Replacement:**

```typescript
// OLD (current implementation)
<p style={bodyParagraphStyle}>
  {documentContent.processFlow.text ? (
    stripHtml(documentContent.processFlow.text)
  ) : (
    <span style={placeholderStyle}>[Enter text]</span>
  )}
</p>

// NEW (with RichTextRenderer)
{documentContent.processFlow.text ? (
  RichTextRenderer(documentContent.processFlow.text, bodyParagraphStyle)
) : (
  <p style={bodyParagraphStyle}>
    <span style={placeholderStyle}>[Enter text]</span>
  </p>
)}
```

**Preserved Usage of stripHtml:**

The `stripHtml` function remains unchanged and continues to be used in the `templateReplacements` useMemo (lines 348-402) for template string interpolation. This ensures placeholder replacement like `{{SolutionName}}` continues to work correctly without HTML tags interfering.

## Data Models

### Input Data

```typescript
// TipTap HTML output examples
type TipTapHTML = string;

// Examples:
const paragraph: TipTapHTML = "<p>Some text</p>";
const bulletList: TipTapHTML = "<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>";
const numberedList: TipTapHTML = "<ol><li><p>Item 1</p></li><li><p>Item 2</p></li></ol>";
const formatted: TipTapHTML = "<p><strong>Bold</strong> and <em>italic</em> text</p>";
const nested: TipTapHTML = "<p><strong><em><u>All three</u></em></strong></p>";
```

### Output Data

```typescript
// React JSX elements with inline styles
type RenderedOutput = React.ReactNode;

// The renderer produces React elements like:
<p style={{ marginBottom: '8px', textAlign: 'justify' }}>
  <strong style={{ fontWeight: 'bold' }}>Bold</strong> and{' '}
  <em style={{ fontStyle: 'italic' }}>italic</em> text
</p>
```

### Style Constants

The renderer uses existing style constants from DocumentPreview:

```typescript
const bodyParagraphStyle: React.CSSProperties = {
  marginBottom: "8px",
  textAlign: "justify",
};

const listParagraphStyle: React.CSSProperties = {
  ...bodyParagraphStyle,
  marginLeft: "16px",
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Script Sanitization

*For any* HTML string containing script tags (in any format or nesting), the RichTextRenderer SHALL NOT render executable scripts or include script content in the output.

**Validates: Requirements 1.4**

### Property 2: Valid React Element Output

*For any* valid TipTap HTML input (containing supported tags), the RichTextRenderer SHALL produce valid React elements that can be rendered without errors.

**Validates: Requirements 1.5**

### Property 3: Paragraph Rendering with Correct Style

*For any* HTML containing one or more `<p>` tags, the RichTextRenderer SHALL render each paragraph as a separate element with bodyParagraphStyle (justified alignment, 8px bottom margin) applied.

**Validates: Requirements 2.1, 2.3**

### Property 4: Inline Formatting Styles

*For any* HTML containing inline formatting tags (`<strong>`, `<em>`, `<u>`), the RichTextRenderer SHALL apply the corresponding CSS styles (fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline') to the rendered output, including when tags are nested.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 5: Text Content Preservation

*For any* HTML input with inline formatting, the RichTextRenderer SHALL preserve the exact text content from the input in the rendered output, regardless of formatting tags.

**Validates: Requirements 3.5**

### Property 6: Bullet List Rendering

*For any* HTML containing `<ul>` tags with `<li>` children, the RichTextRenderer SHALL render a bulleted list where each list item has disc bullet style and listParagraphStyle (16px left margin, justified alignment) applied.

**Validates: Requirements 4.1, 4.2, 4.5**

### Property 7: Numbered List Rendering

*For any* HTML containing `<ol>` tags with `<li>` children, the RichTextRenderer SHALL render a numbered list where each list item has decimal numbering and listParagraphStyle (16px left margin, justified alignment) applied.

**Validates: Requirements 5.1, 5.2, 5.5**

### Property 8: Nested List Item Structure

*For any* HTML containing `<li>` tags with nested `<p>` tags, the RichTextRenderer SHALL correctly render the paragraph content within the list item structure.

**Validates: Requirements 4.5, 5.5**

## Error Handling

### Input Validation

```typescript
// Handle null, undefined, or empty input
if (!html || html.trim() === '') {
  return null;
}
```

### Parsing Errors

```typescript
// DOMParser doesn't throw errors, but may produce error documents
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');

// Check for parsing errors
const parserError = doc.querySelector('parsererror');
if (parserError) {
  console.warn('HTML parsing error:', parserError.textContent);
  return null;
}
```

### Unsupported Elements

```typescript
// Silently ignore unsupported elements
// Only process: p, ul, ol, li, strong, em, u, text nodes
// This provides security by default - unknown tags are not rendered
```

### Malformed HTML

```typescript
// DOMParser is forgiving and will auto-correct malformed HTML
// Example: <p>Unclosed paragraph → <p>Unclosed paragraph</p>
// This matches browser behavior and is safe
```

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

Unit tests verify specific examples, edge cases, and integration points:

**Example-Based Tests:**
- Empty/null input returns null
- Each specific TipTap format (paragraph, bullet list, numbered list, bold, italic, underline)
- Placeholder display logic for empty fields
- Integration with DocumentPreview for all 12 user-authored fields
- Backward compatibility: stripHtml still used in templateReplacements

**Edge Cases:**
- Empty `<p>` tags
- Malformed HTML (unclosed tags)
- Mixed content (text + elements)
- Deeply nested structures

**Integration Tests:**
- RichTextRenderer called for all 12 user-authored fields
- stripHtml preserved for template interpolation
- Placeholder logic works identically to current implementation
- No changes to non-rich-text fields

### Property-Based Tests (Vitest + fast-check)

Property-based tests verify universal properties across randomly generated inputs using the fast-check library (minimum 100 iterations per test):

**Test Configuration:**
```typescript
import { test } from 'vitest';
import * as fc from 'fast-check';

// Each property test runs 100+ iterations
const NUM_RUNS = 100;
```

**Property Test 1: Script Sanitization**
```typescript
// Feature: render-rich-text-preview, Property 1: Script sanitization
// Generate HTML with various script tag formats
fc.assert(
  fc.property(
    fc.oneof(
      fc.constant('<script>alert("xss")</script>'),
      fc.constant('<p><script>alert("xss")</script></p>'),
      fc.constant('<SCRIPT>alert("xss")</SCRIPT>'),
      // ... more script variations
    ),
    (html) => {
      const result = RichTextRenderer(html);
      // Verify no script content in output
      expect(result).not.toContain('alert');
      expect(result).not.toContain('script');
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Property Test 2: Valid React Element Output**
```typescript
// Feature: render-rich-text-preview, Property 2: Valid React element output
// Generate random valid TipTap HTML
fc.assert(
  fc.property(
    generateTipTapHTML(), // Custom generator
    (html) => {
      const result = RichTextRenderer(html);
      // Verify result is valid React element
      expect(() => render(result)).not.toThrow();
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Property Test 3: Paragraph Rendering**
```typescript
// Feature: render-rich-text-preview, Property 3: Paragraph rendering with correct style
// Generate HTML with N paragraphs
fc.assert(
  fc.property(
    fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
    (paragraphs) => {
      const html = paragraphs.map(p => `<p>${p}</p>`).join('');
      const result = RichTextRenderer(html, bodyParagraphStyle);
      const { container } = render(result);
      
      // Verify each paragraph has correct style
      const pElements = container.querySelectorAll('p');
      expect(pElements.length).toBe(paragraphs.length);
      pElements.forEach(p => {
        expect(p.style.textAlign).toBe('justify');
        expect(p.style.marginBottom).toBe('8px');
      });
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Property Test 4: Inline Formatting Styles**
```typescript
// Feature: render-rich-text-preview, Property 4: Inline formatting styles
// Generate HTML with nested inline formatting
fc.assert(
  fc.property(
    fc.string(),
    fc.array(fc.constantFrom('strong', 'em', 'u'), { minLength: 1, maxLength: 3 }),
    (text, tags) => {
      // Build nested HTML: <strong><em><u>text</u></em></strong>
      let html = text;
      tags.forEach(tag => { html = `<${tag}>${html}</${tag}>`; });
      html = `<p>${html}</p>`;
      
      const result = RichTextRenderer(html);
      const { container } = render(result);
      
      // Verify all styles are applied
      if (tags.includes('strong')) {
        expect(container.querySelector('strong')).toHaveStyle({ fontWeight: 'bold' });
      }
      if (tags.includes('em')) {
        expect(container.querySelector('em')).toHaveStyle({ fontStyle: 'italic' });
      }
      if (tags.includes('u')) {
        expect(container.querySelector('u')).toHaveStyle({ textDecoration: 'underline' });
      }
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Property Test 5: Text Content Preservation**
```typescript
// Feature: render-rich-text-preview, Property 5: Text content preservation
// Generate random text with inline formatting
fc.assert(
  fc.property(
    fc.string({ minLength: 1 }),
    (text) => {
      const html = `<p><strong><em>${text}</em></strong></p>`;
      const result = RichTextRenderer(html);
      const { container } = render(result);
      
      // Verify text content is preserved exactly
      expect(container.textContent).toBe(text);
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Property Test 6: Bullet List Rendering**
```typescript
// Feature: render-rich-text-preview, Property 6: Bullet list rendering
// Generate HTML with N bullet list items
fc.assert(
  fc.property(
    fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
    (items) => {
      const html = `<ul>${items.map(item => `<li><p>${item}</p></li>`).join('')}</ul>`;
      const result = RichTextRenderer(html, bodyParagraphStyle);
      const { container } = render(result);
      
      // Verify list structure and styles
      const ul = container.querySelector('ul');
      expect(ul).toBeTruthy();
      expect(ul.style.listStyleType).toBe('disc');
      
      const liElements = container.querySelectorAll('li');
      expect(liElements.length).toBe(items.length);
      liElements.forEach(li => {
        expect(li.style.marginLeft).toBe('16px');
      });
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Property Test 7: Numbered List Rendering**
```typescript
// Feature: render-rich-text-preview, Property 7: Numbered list rendering
// Generate HTML with N numbered list items
fc.assert(
  fc.property(
    fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
    (items) => {
      const html = `<ol>${items.map(item => `<li><p>${item}</p></li>`).join('')}</ol>`;
      const result = RichTextRenderer(html, bodyParagraphStyle);
      const { container } = render(result);
      
      // Verify list structure and styles
      const ol = container.querySelector('ol');
      expect(ol).toBeTruthy();
      expect(ol.style.listStyleType).toBe('decimal');
      
      const liElements = container.querySelectorAll('li');
      expect(liElements.length).toBe(items.length);
      liElements.forEach(li => {
        expect(li.style.marginLeft).toBe('16px');
      });
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Property Test 8: Nested List Item Structure**
```typescript
// Feature: render-rich-text-preview, Property 8: Nested list item structure
// Generate HTML with li containing nested p tags
fc.assert(
  fc.property(
    fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
    (items) => {
      const html = `<ul>${items.map(item => `<li><p>${item}</p></li>`).join('')}</ul>`;
      const result = RichTextRenderer(html);
      const { container } = render(result);
      
      // Verify nested structure is preserved
      const liElements = container.querySelectorAll('li');
      liElements.forEach((li, index) => {
        const p = li.querySelector('p');
        expect(p).toBeTruthy();
        expect(p.textContent).toBe(items[index]);
      });
    }
  ),
  { numRuns: NUM_RUNS }
);
```

**Custom Generators:**

```typescript
// Generator for valid TipTap HTML
function generateTipTapHTML(): fc.Arbitrary<string> {
  return fc.oneof(
    // Paragraphs
    fc.string().map(s => `<p>${s}</p>`),
    // Bullet lists
    fc.array(fc.string(), { minLength: 1, maxLength: 5 })
      .map(items => `<ul>${items.map(i => `<li><p>${i}</p></li>`).join('')}</ul>`),
    // Numbered lists
    fc.array(fc.string(), { minLength: 1, maxLength: 5 })
      .map(items => `<ol>${items.map(i => `<li><p>${i}</p></li>`).join('')}</ol>`),
    // Formatted text
    fc.string().map(s => `<p><strong>${s}</strong></p>`),
    fc.string().map(s => `<p><em>${s}</em></p>`),
    fc.string().map(s => `<p><u>${s}</u></p>`),
  );
}
```

### Test Organization

```
frontend/src/components/preview/
├── DocumentPreview.tsx
├── DocumentPreview.test.tsx                    (unit tests - examples & edge cases)
├── DocumentPreview.integration.test.tsx        (integration tests - 12 fields)
└── DocumentPreview.properties.test.tsx         (property-based tests - 8 properties)
```

### Test Execution

```bash
# Run all tests
npm test

# Run only property-based tests
npm test -- DocumentPreview.properties.test.tsx

# Run with coverage
npm test -- --coverage
```

## Implementation Notes

### Performance Considerations

- DOMParser is synchronous and fast for small HTML fragments
- Recursive JSX conversion is O(n) where n is the number of DOM nodes
- No memoization needed - rendering is fast enough for real-time preview
- TipTap HTML is typically small (< 1KB per field)

### Browser Compatibility

- DOMParser is supported in all modern browsers (IE 9+)
- React 18.2.0 is already a dependency
- No additional polyfills required

### Security Considerations

- DOMParser automatically prevents script execution
- Unsupported elements are ignored by default
- No use of `dangerouslySetInnerHTML`
- XSS protection is built-in

### Maintenance Considerations

- All changes confined to `frontend/src/components/preview/`
- No modifications to TipTap editor configuration
- No backend changes required
- Backward compatible with existing functionality
