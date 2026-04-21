# Task 5: Bug Condition Exploration Test - Counterexamples

## Test Execution Summary

**Test File**: `frontend/src/components/preview/DocumentPreview.sectioncount.test.tsx`

**Execution Date**: Task 5 completion

**Status**: ✅ Tests FAILED as expected (confirms bug exists)

## Counterexamples Found

### Test Case 1: 3 sections deleted (26 sections in sectionContents)
- **Expected**: Display "Preview - X / 22 complete" (26 sections - 4 auto-complete = 22)
- **Actual**: Displays "Preview - X / 27 complete"
- **Bug Confirmed**: ✅ The total remains hardcoded at 27 instead of dynamically calculating to 22

### Test Case 2: 5 sections deleted (24 sections in sectionContents)
- **Expected**: Display "Preview - X / 20 complete" (24 sections - 4 auto-complete = 20)
- **Actual**: Displays "Preview - X / 27 complete"
- **Bug Confirmed**: ✅ The total remains hardcoded at 27 instead of dynamically calculating to 20

### Test Case 3: Full project (31 sections in sectionContents)
- **Expected**: Display "Preview - X / 27 complete" (31 sections - 4 auto-complete = 27)
- **Actual**: Displays "Preview - X / 27 complete"
- **Status**: ✅ PASSED (baseline behavior preserved)

### Test Case 4: Property-Based Test
- **Counterexample**: [10] - with 10 sections in sectionContents
- **Expected**: Display "Preview - X / 6 complete" (10 sections - 4 auto-complete = 6)
- **Actual**: Displays "Preview - X / 27 complete"
- **Bug Confirmed**: ✅ The total remains hardcoded at 27 for any section count less than 27

## Root Cause Confirmed

The bug exists on line 884 of `frontend/src/components/preview/DocumentPreview.tsx`:

```typescript
Preview - {completedCount} / 27 complete
```

The value `27` is hardcoded and does not dynamically calculate based on `sectionContents`.

## Expected Fix

Replace the hardcoded value with a dynamic calculation:

```typescript
const totalCompletable = sectionContents 
  ? Object.keys(sectionContents).length - 4 
  : 27;
```

Then use `{totalCompletable}` in the display string:

```typescript
Preview - {completedCount} / {totalCompletable} complete
```

## Next Steps

1. ✅ Task 5 complete: Bug condition exploration test written and run on unfixed code
2. ⏭️ Task 6: Write preservation property tests (BEFORE implementing fix)
3. ⏭️ Task 7: Implement the fix for DocumentPreview
4. ⏭️ Task 7.2: Re-run this test to verify it passes after the fix
