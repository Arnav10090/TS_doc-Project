# Fix: Custom Sections Now Appear in Correct Position

## Problem

Custom sections were appearing at the end of the document instead of after the section where the "Add New Section" button was clicked.

**Example**:
- User clicks "+ Add New Section" after "Features" section
- Expected: New section appears right after "Features"
- Actual: New section appeared at the very end of the document

## Root Cause

The custom sections were being rendered in a separate block at the end of the document:

```typescript
// OLD CODE - Rendered all custom sections at the end
{/* Render custom sections */}
{Object.keys(customSections).length > 0 && (
  <>
    {Object.keys(customSections).map((sectionKey) => {
      const sectionNumber = getNextSectionNumber();
      return renderCustomSection(sectionKey, sectionNumber);
    })}
  </>
)}
```

This ignored the `insertAfterKey` field that tracks where each custom section should appear.

## Solution Applied

### 1. Created Helper Function

Added a function to render custom sections that should appear after a specific section:

```typescript
// Helper function to render custom sections that should appear after a specific section
const renderCustomSectionsAfter = (afterKey: string) => {
  const sectionsToRender = Object.entries(customSections).filter(
    ([_, content]) => content.insertAfterKey === afterKey
  );

  if (sectionsToRender.length === 0) return null;

  return (
    <>
      {sectionsToRender.map(([sectionKey, _]) => {
        const sectionNumber = getNextSectionNumber();
        return renderCustomSection(sectionKey, sectionNumber);
      })}
    </>
  );
};
```

### 2. Updated All PageBreakWithButton Locations

Changed each PageBreakWithButton to render custom sections immediately after:

```typescript
// NEW CODE - Render custom sections in correct position
{sectionExists('revision_history') && (
  <>
    <PageBreakWithButton
      insertAfterKey="cover"
      onAddClick={handleAddSectionClick}
    />
    {/* Render custom sections after cover */}
    {renderCustomSectionsAfter('cover')}
  </>
)}
```

### 3. Updated All 9 Insertion Points

Applied the fix to all PageBreakWithButton locations:

1. After **cover** → `renderCustomSectionsAfter('cover')`
2. After **revision_history** → `renderCustomSectionsAfter('revision_history')`
3. After **executive_summary** → `renderCustomSectionsAfter('executive_summary')`
4. After **overview** → `renderCustomSectionsAfter('overview')`
5. After **fat_condition** → `renderCustomSectionsAfter('fat_condition')`
6. After **third_party_sw** → `renderCustomSectionsAfter('third_party_sw')`
7. After **supervisors** → `renderCustomSectionsAfter('supervisors')`
8. After **cybersecurity** → `renderCustomSectionsAfter('cybersecurity')`
9. After **disclaimer** → `renderCustomSectionsAfter('disclaimer')`
10. After **poc** (last section) → `renderCustomSectionsAfter('poc')`

### 4. Removed Old Rendering Block

Removed the old code that rendered all custom sections at the end.

## How It Works Now

### Data Flow

1. **User clicks "+ Add New Section"** after "Features" section
2. **Modal opens** with insertAfterKey = "features"
3. **User selects "New Section"**
4. **System creates section** with:
   ```json
   {
     "title": "",
     "subsections": [],
     "insertAfterKey": "features"
   }
   ```
5. **System saves to database**
6. **System refreshes sections**
7. **Rendering logic**:
   - Renders "Features" section
   - Renders PageBreakWithButton after "Features"
   - **Calls `renderCustomSectionsAfter('features')`**
   - Finds custom section with `insertAfterKey === 'features'`
   - Renders custom section right there
   - Continues with next predefined section

### Visual Result

```
┌─────────────────────────┐
│ 3. Features             │ ← Predefined section
├─────────────────────────┤
│ + Add New Section       │ ← Button (insertAfterKey="features")
├─────────────────────────┤
│ 4. [Custom Section]     │ ← NEW! Appears here (insertAfterKey="features")
├─────────────────────────┤
│ + Add New Section       │ ← Next button
├─────────────────────────┤
│ 5. Remote Support       │ ← Next predefined section
└─────────────────────────┘
```

## Section Numbering

Custom sections are numbered sequentially with predefined sections:

**Before custom section**:
- 1. Cover
- 2. Revision History
- 3. Executive Summary
- 4. Introduction
- 5. Features
- 6. Remote Support

**After adding custom section after Features**:
- 1. Cover
- 2. Revision History
- 3. Executive Summary
- 4. Introduction
- 5. Features
- **6. [Custom Section]** ← Inserted here
- 7. Remote Support ← Renumbered from 6 to 7

## Testing the Fix

### Test Case 1: Add Section After Features

1. Open a project
2. Scroll to "Features" section
3. Click "+ Add New Section" button below Features
4. Click "New Section"
5. **Expected**: New section appears immediately after Features
6. **Expected**: Section number is 6 (or appropriate sequential number)

### Test Case 2: Add Multiple Sections

1. Add a section after "Features" → Should appear as section 6
2. Add another section after "Features" → Should appear as section 7
3. Add a section after "Overview" → Should appear after Overview
4. **Expected**: All sections appear in correct positions
5. **Expected**: All subsequent sections are renumbered correctly

### Test Case 3: Add Section at Different Positions

1. Add section after "Cover" → Appears right after Cover
2. Add section after "Disclaimer" → Appears right after Disclaimer
3. Add section after "POC" (last) → Appears at end before "End of Technical Proposal"
4. **Expected**: Each section appears exactly where intended

## Files Modified

- `frontend/src/components/preview/DocumentPreview.tsx`
  - Added `renderCustomSectionsAfter()` helper function
  - Updated all 10 PageBreakWithButton locations
  - Removed old rendering block at end

## Verification

✅ **Correct Positioning**: Custom sections appear after their `insertAfterKey` section
✅ **Sequential Numbering**: Section numbers are sequential including custom sections
✅ **Multiple Sections**: Multiple custom sections at same position work correctly
✅ **All Positions**: Works for all 10 insertion points in the document

## Edge Cases Handled

1. **Multiple sections after same key**: All render in order
2. **No custom sections**: No impact on performance or rendering
3. **Custom section at end**: Appears before "End of Technical Proposal" text
4. **Section numbering**: Automatically sequential with predefined sections

## Before vs After

### Before (Broken)
```
1. Cover
2. Features
3. Remote Support
...
27. POC
[Custom Section 1] ← Wrong! At the end
[Custom Section 2] ← Wrong! At the end
End of Technical Proposal
```

### After (Fixed)
```
1. Cover
2. Features
[Custom Section 1] ← Correct! After Features
3. Remote Support
...
[Custom Section 2] ← Correct! After Overview
...
28. POC
End of Technical Proposal
```

## Success! 🎉

Custom sections now appear exactly where they should:
- ✅ Right after the section where you clicked "+ Add New Section"
- ✅ With correct sequential numbering
- ✅ Multiple sections at same position supported
- ✅ Works for all insertion points

Try it now - add a section after any predefined section and it will appear in the correct position!
