# Blob Error Handling Fix

## Problem

When using Axios with `responseType: 'blob'`, **all responses** (including error responses) are treated as binary blobs. This breaks JSON error parsing.

### The Issue

In `frontend/src/api/generation.ts`, the document generation call uses:

```typescript
const response = await apiClient.post(
  `/api/v1/projects/${projectId}/generate`,
  {},
  { responseType: 'blob' }  // ← Entire response treated as binary
)
```

When the backend returns HTTP 422 with validation errors:

```json
{
  "detail": {
    "message": "Cannot generate document. Some required sections are incomplete.",
    "missing_sections": ["cover", "executive_summary", "features"]
  }
}
```

Axios delivers this as a **Blob object**, not parsed JSON.

### The Broken Code Path

In `SectionSidebar.tsx`, the error handler tried to access the error data as JSON:

```typescript
catch (error: any) {
  if (error.response?.status === 422) {
    const detail = error.response.data?.detail;  // ← data is a Blob!
    if (detail && detail.missing_sections) {     // ← NEVER executes
      setMissingSections(detail.missing_sections);
    }
  }
}
```

**Result**: `error.response.data` is a Blob. `Blob?.detail` is always `undefined`. The clickable missing sections feature never worked.

---

## Solution

### Updated `generation.ts`

Wrap the API call in a try-catch block and parse blob errors as JSON:

```typescript
export const generateDocument = async (projectId: string): Promise<Blob> => {
  try {
    const response = await apiClient.post(
      `/api/v1/projects/${projectId}/generate`,
      {},
      {
        responseType: 'blob',
      }
    )
    return response.data
  } catch (error: any) {
    // When responseType is 'blob', error responses are also returned as Blob
    // We need to parse the blob as JSON to get the actual error details
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text()
        const parsed = JSON.parse(text)
        
        // Replace the blob data with parsed JSON so error handlers can access it
        error.response.data = parsed
      } catch (parseError) {
        // If parsing fails, leave the original blob
        console.error('Failed to parse error response blob:', parseError)
      }
    }
    
    // Re-throw the error with the parsed data
    throw error
  }
}
```

### How It Works

1. **Success Path**: Returns the blob directly (document file)
2. **Error Path**: 
   - Checks if `error.response.data` is a Blob
   - Converts blob to text: `await blob.text()`
   - Parses text as JSON: `JSON.parse(text)`
   - Replaces `error.response.data` with parsed object
   - Re-throws the error

3. **Error Handler in SectionSidebar.tsx**: Now works correctly!

```typescript
catch (error: any) {
  if (error.response?.status === 422) {
    const detail = error.response.data?.detail;  // ← Now a proper object!
    if (detail && detail.missing_sections) {     // ← WORKS!
      setMissingSections(detail.missing_sections);
      toast.error('Please complete all required sections before generating.');
    }
  }
}
```

---

## Testing

### Manual Test

1. Start the application:
   ```bash
   docker-compose up
   ```

2. Create a new project with only the cover section filled

3. Click "Generate Document"

4. **Expected Result**:
   - Toast error: "Please complete all required sections before generating."
   - Red alert box appears at bottom of sidebar
   - Lists all missing sections as clickable links
   - Clicking a link navigates to that section

### Automated Test

Run the test suite:

```bash
cd frontend
npm test src/api/__tests__/generation.test.ts
```

Tests verify:
- ✅ Successful blob responses work
- ✅ 422 errors with JSON are parsed correctly
- ✅ `missing_sections` array is accessible
- ✅ Non-JSON blob errors are handled gracefully
- ✅ Non-blob errors pass through unchanged

---

## Why This Matters

### Before Fix
- User clicks "Generate Document"
- Gets generic error toast
- **No indication of which sections are missing**
- Must manually check all 31 sections

### After Fix
- User clicks "Generate Document"
- Gets specific error message
- **Sees list of missing sections**
- **Clicks section name to jump directly to it**
- Completes missing sections efficiently

---

## Related Files

- `frontend/src/api/generation.ts` - Fixed blob error parsing
- `frontend/src/components/layout/SectionSidebar.tsx` - Error handler (unchanged, now works)
- `frontend/src/api/__tests__/generation.test.ts` - Test coverage
- `backend/app/generation/router.py` - Backend validation (unchanged)

---

## Backend Response Format

For reference, the backend returns this structure on validation failure:

```python
# backend/app/generation/router.py
if missing_sections:
    raise HTTPException(
        status_code=422,
        detail={
            "message": "Cannot generate document. Some required sections are incomplete.",
            "missing_sections": missing_sections
        }
    )
```

The fix ensures this JSON structure is accessible in the frontend error handler.

---

## Alternative Solutions Considered

### Option 1: Axios Response Interceptor
Add a global interceptor to parse all blob errors:

```typescript
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.data instanceof Blob) {
      // Parse blob...
    }
    return Promise.reject(error)
  }
)
```

**Rejected**: Would affect all blob responses globally, including successful downloads.

### Option 2: Conditional responseType
Only use `responseType: 'blob'` after checking if generation will succeed:

```typescript
// Check completion first
const project = await getProjectById(projectId)
if (project.completion_percentage < 100) {
  // Use JSON response
} else {
  // Use blob response
}
```

**Rejected**: Requires extra API call and doesn't handle race conditions.

### Option 3: Separate Endpoints
Create two endpoints: `/validate` and `/generate`:

```typescript
await validateGeneration(projectId)  // Returns JSON
await generateDocument(projectId)    // Returns blob
```

**Rejected**: Requires backend changes and doesn't prevent validation errors during generation.

### ✅ Chosen Solution: Parse Blob Errors
- No backend changes required
- Handles all error cases
- Minimal code changes
- Works with existing error handlers

---

## Deployment Notes

### No Breaking Changes
- Backend API unchanged
- Frontend error handlers work as expected
- Existing functionality preserved

### Rollout
1. Deploy frontend changes
2. Test document generation with incomplete projects
3. Verify missing sections list appears
4. Verify section navigation works

### Monitoring
Watch for:
- Console errors: "Failed to parse error response blob"
- User reports: "Can't see which sections are missing"
- Analytics: Click-through rate on missing section links

---

## Future Improvements

1. **Better Error Types**: Create TypeScript interfaces for error responses
2. **Retry Logic**: Auto-retry on network errors
3. **Progress Indicator**: Show generation progress for large documents
4. **Validation Preview**: Show missing sections before clicking generate

---

## Summary

**Problem**: Blob response type broke JSON error parsing  
**Solution**: Parse blob errors as JSON before re-throwing  
**Impact**: Missing sections feature now works correctly  
**Risk**: Low - graceful fallback for non-JSON errors  
**Testing**: Automated tests + manual verification  

The fix is minimal, focused, and solves the core issue without side effects.
