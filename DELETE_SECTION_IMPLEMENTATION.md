# Delete Section Feature Implementation

## Overview

Added a "Delete Section" button to all sections (except Cover page) with a confirmation dialog to prevent accidental deletions.

---

## Features Implemented

### 1. ✅ Confirmation Dialog Component
**File:** `frontend/src/components/shared/ConfirmDialog.tsx`

- Reusable modal dialog for confirmations
- Backdrop overlay with click-to-close
- Customizable title, message, and button text
- Dangerous action styling (red button for destructive actions)
- Prevents accidental clicks with backdrop stop propagation

**Props:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;      // Default: "Confirm"
  cancelText?: string;        // Default: "Cancel"
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;      // Red button for destructive actions
}
```

---

### 2. ✅ Section Header Component
**File:** `frontend/src/components/shared/SectionHeader.tsx`

- Reusable header for all sections
- Includes section title
- Shows save status (Saving.../Saved ✓/Error)
- Delete Section button with confirmation
- Handles delete API call and error handling
- Toast notifications for success/error

**Props:**
```typescript
interface SectionHeaderProps {
  projectId: string;
  sectionKey: string;
  title: string;
  showDeleteButton?: boolean;  // Default: true
  onDelete?: () => void;        // Callback after successful deletion
  status?: 'saving' | 'saved' | 'error' | null;
}
```

---

### 3. ✅ Delete Section API
**File:** `frontend/src/api/sections.ts`

Added `deleteSection` function:
```typescript
export const deleteSection = async (
  projectId: string,
  sectionKey: string
): Promise<void> => {
  await apiClient.delete(
    `/api/v1/projects/${projectId}/sections/${sectionKey}`
  )
}
```

---

### 4. ✅ Backend Delete Endpoint
**File:** `backend/app/sections/router.py`

Added DELETE endpoint:
```python
@router.delete("/{project_id}/sections/{section_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    project_id: UUID,
    section_key: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a section by key."""
    # Validates section_key
    # Prevents deletion of cover section
    # Calls service layer to delete
```

**Protection:** Cover section cannot be deleted (returns 400 error)

---

### 5. ✅ Backend Delete Service
**File:** `backend/app/sections/service.py`

Added `delete_section` function:
```python
async def delete_section(
    db: AsyncSession, project_id: UUID, section_key: str
) -> None:
    """Delete a section by key."""
    # Finds section in database
    # Deletes if exists
    # Commits transaction
    # Rolls back on error
```

---

## User Flow

### Step 1: Click Delete Button
```
┌─────────────────────────────────────────┐
│ Overview of Solution    [Delete Section]│
├─────────────────────────────────────────┤
│                                         │
│ [Section content here]                  │
│                                         │
└─────────────────────────────────────────┘
```

### Step 2: Confirmation Dialog Appears
```
┌─────────────────────────────────────────┐
│ ████████████ BACKDROP ████████████████  │
│ ██                                  ██  │
│ ██  ┌───────────────────────────┐  ██  │
│ ██  │ Delete Section            │  ██  │
│ ██  ├───────────────────────────┤  ██  │
│ ██  │ Do you really want to     │  ██  │
│ ██  │ delete this section?      │  ██  │
│ ██  │ This action is            │  ██  │
│ ██  │ irreversible.             │  ██  │
│ ██  │                           │  ██  │
│ ██  │      [Cancel]  [Delete]   │  ██  │
│ ██  └───────────────────────────┘  ██  │
│ ██                                  ██  │
│ ████████████████████████████████████████│
└─────────────────────────────────────────┘
```

### Step 3: User Confirms
- Section is deleted from database
- Success toast notification appears
- User is redirected (via onDelete callback)

### Step 4: User Cancels
- Dialog closes
- No action taken
- Section remains intact

---

## Sections with Delete Button

### ✅ All Sections EXCEPT Cover
- ✏️ Revision History
- ✏️ Executive Summary
- ✏️ Introduction
- ✏️ Abbreviations
- ✏️ Process Flow
- ✏️ Overview
- ✏️ Features
- ✏️ Remote Support
- ✏️ Documentation Control
- ✏️ Customer Training
- ✏️ System Configuration
- ✏️ FAT Condition
- ✏️ Technology Stack
- ✏️ Hardware Specifications
- ✏️ Software Specifications
- ✏️ Third Party Software
- ✏️ Overall Gantt Chart
- ✏️ Shutdown Gantt Chart
- ✏️ Supervisors
- ✏️ Scope Definitions
- ✏️ Division of Engineering
- ✏️ Work Completion
- ✏️ Buyer Obligations
- ✏️ Exclusion List
- ✏️ Value Addition
- ✏️ Buyer Prerequisites
- ✏️ Binding Conditions (locked content, but can delete section)
- ✏️ Cybersecurity (locked content, but can delete section)
- ✏️ Disclaimer (locked content, but can delete section)
- ✏️ Proof of Concept

### ❌ Cover Section
- **Cannot be deleted** (protected by backend)
- Delete button is hidden (showDeleteButton={false})

---

## Implementation Example

### Before (Old Header)
```typescript
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
}}>
  <h2 style={{
    fontSize: '24px',
    fontWeight: 600,
    color: '#1A1A2E',
    margin: 0,
  }}>
    Overview of {solutionName || 'Solution'}
  </h2>
  {status === 'saving' && (
    <span style={{ color: '#6B7280', fontSize: '14px' }}>Saving...</span>
  )}
  {status === 'saved' && (
    <span style={{ color: '#10B981', fontSize: '14px' }}>Saved ✓</span>
  )}
  {status === 'error' && (
    <span style={{ color: '#E60012', fontSize: '14px' }}>Error saving</span>
  )}
</div>
```

### After (New SectionHeader)
```typescript
import SectionHeader from '../shared/SectionHeader';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

const handleDelete = () => {
  navigate(`/projects/${projectId}/editor`);
};

<SectionHeader
  projectId={projectId}
  sectionKey="overview"
  title={`Overview of ${solutionName || 'Solution'}`}
  showDeleteButton={true}
  onDelete={handleDelete}
  status={status}
/>
```

---

## Error Handling

### Frontend Errors
1. **Network Error**
   - Toast: "Failed to delete section"
   - Section remains intact
   - User can retry

2. **Cover Section Protection**
   - Toast: "Cannot delete this section"
   - Delete button hidden for cover section

3. **Server Error (500)**
   - Toast: "Failed to delete section"
   - Section remains intact

### Backend Errors
1. **Invalid Section Key**
   - HTTP 400: "Invalid section_key"
   - Returns list of valid section keys

2. **Cover Section Protection**
   - HTTP 400: "Cannot delete the cover section"
   - Prevents accidental deletion

3. **Database Error**
   - Transaction rollback
   - HTTP 500: Internal server error

---

## Database Behavior

### Delete Operation
```sql
DELETE FROM section_data
WHERE project_id = ? AND section_key = ?
```

### Cascade Behavior
- Section data is deleted
- No foreign key constraints affected
- Section can be recreated by visiting it again (auto-create)

### Revision History
- Deleting a section does NOT create a revision entry
- Only content updates trigger revisions
- Deletion is a structural change, not a content change

---

## Testing

### Manual Testing Steps

1. **Test Delete Flow**
   ```
   1. Open any section (except Cover)
   2. Click "Delete Section" button
   3. Verify confirmation dialog appears
   4. Click "Cancel" → dialog closes, section remains
   5. Click "Delete Section" again
   6. Click "Delete" → section deleted, success toast
   7. Verify section is removed from database
   ```

2. **Test Cover Protection**
   ```
   1. Open Cover section
   2. Verify "Delete Section" button is NOT visible
   3. Try API call directly → should return 400 error
   ```

3. **Test Error Handling**
   ```
   1. Disconnect network
   2. Try to delete section
   3. Verify error toast appears
   4. Verify section remains intact
   ```

### API Testing
```bash
# Test delete endpoint
curl -X DELETE http://localhost:8000/api/v1/projects/{project_id}/sections/overview

# Test cover protection
curl -X DELETE http://localhost:8000/api/v1/projects/{project_id}/sections/cover
# Should return: {"detail": "Cannot delete the cover section"}
```

---

## Migration Notes

### For Existing Sections
To add delete functionality to an existing section:

1. Import SectionHeader and useNavigate:
   ```typescript
   import SectionHeader from '../shared/SectionHeader';
   import { useNavigate } from 'react-router-dom';
   ```

2. Add navigate hook:
   ```typescript
   const navigate = useNavigate();
   ```

3. Add delete handler:
   ```typescript
   const handleDelete = () => {
     navigate(`/projects/${projectId}/editor`);
   };
   ```

4. Replace header div with SectionHeader:
   ```typescript
   <SectionHeader
     projectId={projectId}
     sectionKey="section_key_here"
     title="Section Title Here"
     showDeleteButton={true}  // false for Cover section
     onDelete={handleDelete}
     status={status}  // if using auto-save
   />
   ```

---

## UI/UX Considerations

### Button Styling
- **Normal State:** White background, red border, red text
- **Hover State:** Light pink background (#FFF0F0)
- **Disabled State:** Reduced opacity, not-allowed cursor
- **Loading State:** Shows "Deleting..." text

### Dialog Styling
- **Backdrop:** Semi-transparent black (50% opacity)
- **Dialog:** White background, rounded corners, shadow
- **Delete Button:** Red background (dangerous action)
- **Cancel Button:** White background, gray border

### Toast Notifications
- **Success:** Green toast with checkmark
- **Error:** Red toast with error message
- **Duration:** 3 seconds (default)

---

## Security Considerations

### Backend Protection
1. ✅ Validates section_key against whitelist
2. ✅ Prevents deletion of cover section
3. ✅ Requires valid project_id
4. ✅ Uses database transactions (rollback on error)

### Frontend Protection
1. ✅ Confirmation dialog prevents accidental deletion
2. ✅ Clear warning message
3. ✅ Disabled state during deletion
4. ✅ Error handling with user feedback

---

## Future Enhancements

Possible improvements:
1. **Undo Functionality** - Allow restoring deleted sections
2. **Soft Delete** - Mark as deleted instead of hard delete
3. **Bulk Delete** - Delete multiple sections at once
4. **Delete History** - Track when sections were deleted
5. **Permissions** - Role-based delete permissions
6. **Archive** - Archive instead of delete

---

## Summary

✅ **Delete Section button** added to all sections (except Cover)
✅ **Confirmation dialog** prevents accidental deletions
✅ **Backend protection** prevents cover section deletion
✅ **Error handling** with toast notifications
✅ **Clean UI** with consistent styling
✅ **Reusable components** (SectionHeader, ConfirmDialog)

The delete functionality is now fully implemented and ready to use! 🎉
