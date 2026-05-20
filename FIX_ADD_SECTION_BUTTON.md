# Fix: "Add New Section" Button Not Working

## Problem

The "Add New Section" button was not working when clicked. It only logged to the console and didn't open the Section Type Modal.

## Root Cause

The `handleAddSectionClick` function in `DocumentPreview.tsx` was incomplete:

```typescript
// BEFORE (incomplete implementation)
const handleAddSectionClick = (insertAfterKey: string) => {
  // TODO: Open Section Type Modal
  console.log('Add section after:', insertAfterKey);
};
```

The `SectionTypeModal` component existed but was never:
1. Imported into `DocumentPreview.tsx`
2. Added to the JSX
3. Connected with state management

## Solution Applied

### 1. Added Missing Imports

```typescript
import SectionTypeModal from "../modals/SectionTypeModal";
import {
  generateCustomSectionKey,
  generateCustomSubsectionKey,
} from "../../utils/customSectionUtils";
```

### 2. Added State Management

```typescript
// State for Section Type Modal
const [isSectionTypeModalOpen, setIsSectionTypeModalOpen] = useState(false);
const [pendingInsertAfterKey, setPendingInsertAfterKey] = useState<string>('');
```

### 3. Implemented Complete Handler Functions

```typescript
const handleAddSectionClick = (insertAfterKey: string) => {
  setPendingInsertAfterKey(insertAfterKey);
  setIsSectionTypeModalOpen(true);
};

const handleSectionTypeSelect = (type: 'section' | 'subsection', insertAfterKey: string) => {
  if (type === 'section') {
    // Create a new custom section
    const newSectionKey = generateCustomSectionKey();
    const newSection: CustomSectionContent = {
      title: '',
      subsections: [],
      insertAfterKey: insertAfterKey,
    };
    
    // TODO: Save to backend via upsertSection API
    console.log('Creating new section:', newSectionKey, newSection);
    
    // Activate the new section for editing
    if (onSectionClick) {
      onSectionClick(newSectionKey);
    }
  } else {
    // Create a new custom subsection
    const newSubsectionKey = generateCustomSubsectionKey();
    
    // TODO: Implement subsection creation flow
    console.log('Creating new subsection:', newSubsectionKey);
  }
};

const handleCloseModal = () => {
  setIsSectionTypeModalOpen(false);
  setPendingInsertAfterKey('');
};
```

### 4. Added Modal to JSX

```typescript
{/* Section Type Modal */}
<SectionTypeModal
  isOpen={isSectionTypeModalOpen}
  insertAfterKey={pendingInsertAfterKey}
  onClose={handleCloseModal}
  onSelectType={handleSectionTypeSelect}
/>
```

## Current Status

✅ **Fixed**: The button now opens the Section Type Modal when clicked
✅ **Modal Works**: Users can choose between "New Section" and "New Subsection"
✅ **Key Generation**: Unique keys are generated for new sections/subsections

⚠️ **Still TODO**: 
- Backend integration (save to database via `upsertSection` API)
- Complete subsection creation flow
- Display the new section in the preview
- Add section input panel for editing

## Testing the Fix

1. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open the application** in your browser

3. **Click any "Add New Section" button** in the page breaks

4. **Expected behavior**:
   - Modal should open with title "What would you like to add?"
   - Two buttons: "New Section" and "New Subsection"
   - Clicking either button should close the modal
   - Console should log the new section/subsection key

5. **Check browser console** for logs:
   ```
   Creating new section: custom_section_1234567890_abc-def-ghi newSection
   ```

## Next Steps

To complete the feature, you need to:

1. **Integrate with backend API**:
   ```typescript
   // In handleSectionTypeSelect
   await upsertSection(projectId, newSectionKey, newSection);
   ```

2. **Update section store** to include the new section

3. **Trigger re-render** of DocumentPreview to show the new section

4. **Implement CustomSectionInput component** for editing the section title

5. **Implement CustomSubsectionInput component** for adding subsections

## Files Modified

- `frontend/src/components/preview/DocumentPreview.tsx`
  - Added imports for SectionTypeModal and key generation utilities
  - Added state management for modal
  - Implemented complete handler functions
  - Added modal to JSX

## Related Components

- ✅ `PageBreakWithButton.tsx` - Already working correctly
- ✅ `SectionTypeModal.tsx` - Already implemented correctly
- ✅ `customSectionUtils.ts` - Key generation functions exist
- ⚠️ `CustomSectionInput.tsx` - Needs integration
- ⚠️ `CustomSubsectionInput.tsx` - Needs integration

## Verification

Run the frontend and test:

```bash
cd frontend
npm run dev
```

Then click any "Add New Section" button and verify the modal opens.
