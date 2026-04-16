# Software Specs Default Data Fix

## Problem

The `SoftwareSpecsSection.tsx` component had **rows 3 and 4 swapped**, causing the maker field values to be incorrect according to Requirement 56.

### The Mismatch

| Row | Current (Wrong) | Required (Correct) |
|-----|----------------|-------------------|
| 3 | maker: "Microsoft/ Other" | maker: "Microsoft" |
| 4 | maker: "Microsoft/ Other" | maker: "Microsoft/ Other" |

### Impact

**Before Fix**:
- Row 3 had "Microsoft/ Other" instead of "Microsoft"
- Row 4 correctly had "Microsoft/ Other" but row 3 should have been pure "Microsoft"
- Documents generated with incorrect maker categorization
- Violates Requirement 56 acceptance criteria 3 and 4

**After Fix**:
- Row 3 correctly has "Microsoft"
- Row 4 correctly has "Microsoft/ Other"
- Documents comply with Requirement 56

---

## Solution

### Updated DEFAULT_ROWS

**Before (Incorrect)**:
```typescript
const DEFAULT_ROWS = [
  { sr_no: 1, name: '', maker: 'Microsoft', qty: '2' },
  { sr_no: 2, name: '', maker: 'Microsoft', qty: '4' },
  { sr_no: 3, name: '', maker: 'Microsoft/ Other', qty: '6' },  // ❌ Wrong
  { sr_no: 4, name: '', maker: 'Microsoft/ Other', qty: '2' },  // ❌ Should be only row with this
  { sr_no: 5, name: '', maker: '', qty: '6' },
  { sr_no: 6, name: '', maker: '-', qty: '2' },
  { sr_no: 7, name: '', maker: '-', qty: '2' },
  { sr_no: 8, name: '', maker: '-', qty: '2' },
  { sr_no: 9, name: '', maker: '', qty: '2' },
];
```

**After (Correct per Requirement 56)**:
```typescript
const DEFAULT_ROWS = [
  { sr_no: 1, name: '', maker: 'Microsoft', qty: '2' },
  { sr_no: 2, name: '', maker: 'Microsoft', qty: '4' },
  { sr_no: 3, name: '', maker: 'Microsoft', qty: '6' },         // ✅ Correct
  { sr_no: 4, name: '', maker: 'Microsoft/ Other', qty: '2' },  // ✅ Correct
  { sr_no: 5, name: '', maker: '', qty: '6' },
  { sr_no: 6, name: '', maker: '-', qty: '2' },
  { sr_no: 7, name: '', maker: '-', qty: '2' },
  { sr_no: 8, name: '', maker: '-', qty: '2' },
  { sr_no: 9, name: '', maker: '', qty: '2' },
];
```

---

## Complete Software Specs Structure

### Rows 1-3: Microsoft Software (6 licenses total)
1. **Microsoft** - Qty: 2
2. **Microsoft** - Qty: 4
3. **Microsoft** - Qty: 6

**Total Microsoft licenses**: 2 + 4 + 6 = 12

### Row 4: Microsoft or Other Software
4. **Microsoft/ Other** - Qty: 2

**Purpose**: Flexible row for either Microsoft or third-party software

### Row 5: Custom Software
5. **[Empty maker]** - Qty: 6

**Purpose**: User-specified software (no default maker)

### Rows 6-8: Third-Party Software
6. **-** (dash) - Qty: 2
7. **-** (dash) - Qty: 2
8. **-** (dash) - Qty: 2

**Purpose**: Third-party software (dash indicates non-Microsoft)

### Row 9: Additional Custom Software
9. **[Empty maker]** - Qty: 2

**Purpose**: Additional user-specified software

---

## Why This Structure?

### Microsoft Licensing Tiers

The three Microsoft rows (1-3) with different quantities likely represent:
- **Row 1 (Qty: 2)**: Server licenses
- **Row 2 (Qty: 4)**: Workstation licenses
- **Row 3 (Qty: 6)**: Client access licenses (CALs)

### Flexibility Row

**Row 4 (Microsoft/ Other)**: Allows for either:
- Additional Microsoft software
- Alternative vendor software
- Hybrid licensing scenarios

### Third-Party Software

**Rows 6-8 (dash)**: Pre-allocated slots for:
- Database software (Oracle, PostgreSQL)
- Middleware (Apache, Nginx)
- Monitoring tools (Nagios, Grafana)

---

## Requirements Compliance

### Requirement 56: Software Specifications Section Default Data

✅ **All 9 acceptance criteria now met**:

1. ✅ Row 1: name="", maker="Microsoft", qty="2"
2. ✅ Row 2: name="", maker="Microsoft", qty="4"
3. ✅ Row 3: name="", maker="Microsoft", qty="6"
4. ✅ Row 4: name="", maker="Microsoft/ Other", qty="2"
5. ✅ Row 5: name="", maker="", qty="6"
6. ✅ Row 6: name="", maker="-", qty="2"
7. ✅ Row 7: name="", maker="-", qty="2"
8. ✅ Row 8: name="", maker="-", qty="2"
9. ✅ Row 9: name="", maker="", qty="2"

---

## Testing

### Manual Test

1. **Create a new project**
2. **Navigate to Software Specifications section**
3. **Verify default rows**:
   - Row 1: maker = "Microsoft", qty = "2" ✓
   - Row 2: maker = "Microsoft", qty = "4" ✓
   - Row 3: maker = "Microsoft", qty = "6" ✓
   - Row 4: maker = "Microsoft/ Other", qty = "2" ✓
   - Row 5: maker = "", qty = "6" ✓
   - Row 6: maker = "-", qty = "2" ✓
   - Row 7: maker = "-", qty = "2" ✓
   - Row 8: maker = "-", qty = "2" ✓
   - Row 9: maker = "", qty = "2" ✓

4. **Generate document**
5. **Open generated .docx**
6. **Check software specifications table** has correct maker values

### Automated Test

```typescript
describe('SoftwareSpecsSection default data', () => {
  it('should have correct maker values per Requirement 56', () => {
    const expected = [
      { sr_no: 1, maker: 'Microsoft', qty: '2' },
      { sr_no: 2, maker: 'Microsoft', qty: '4' },
      { sr_no: 3, maker: 'Microsoft', qty: '6' },
      { sr_no: 4, maker: 'Microsoft/ Other', qty: '2' },
      { sr_no: 5, maker: '', qty: '6' },
      { sr_no: 6, maker: '-', qty: '2' },
      { sr_no: 7, maker: '-', qty: '2' },
      { sr_no: 8, maker: '-', qty: '2' },
      { sr_no: 9, maker: '', qty: '2' },
    ];

    DEFAULT_ROWS.forEach((row, index) => {
      expect(row.sr_no).toBe(expected[index].sr_no);
      expect(row.maker).toBe(expected[index].maker);
      expect(row.qty).toBe(expected[index].qty);
    });
  });

  it('should have exactly one "Microsoft/ Other" row', () => {
    const microsoftOtherRows = DEFAULT_ROWS.filter(
      row => row.maker === 'Microsoft/ Other'
    );
    expect(microsoftOtherRows).toHaveLength(1);
    expect(microsoftOtherRows[0].sr_no).toBe(4);
  });

  it('should have three pure "Microsoft" rows', () => {
    const microsoftRows = DEFAULT_ROWS.filter(
      row => row.maker === 'Microsoft'
    );
    expect(microsoftRows).toHaveLength(3);
    expect(microsoftRows.map(r => r.sr_no)).toEqual([1, 2, 3]);
  });
});
```

---

## Comparison: Before vs After

### Before Fix (Incorrect)

```
Row 1: Microsoft (Qty: 2)
Row 2: Microsoft (Qty: 4)
Row 3: Microsoft/ Other (Qty: 6)  ← WRONG
Row 4: Microsoft/ Other (Qty: 2)  ← Duplicate
```

**Issues**:
- Two rows with "Microsoft/ Other"
- Only two pure "Microsoft" rows instead of three
- Row 3 quantity (6) incorrectly associated with "Microsoft/ Other"

### After Fix (Correct)

```
Row 1: Microsoft (Qty: 2)
Row 2: Microsoft (Qty: 4)
Row 3: Microsoft (Qty: 6)         ← CORRECT
Row 4: Microsoft/ Other (Qty: 2)  ← CORRECT (only one)
```

**Correct**:
- Three pure "Microsoft" rows (1, 2, 3)
- One "Microsoft/ Other" row (4)
- Proper quantity distribution

---

## Impact on Existing Projects

### New Projects
✅ Will get correct software specs structure immediately

### Existing Projects
⚠️ **Already have old data saved in database**

**Options**:
1. **Manual update**: Users can edit row 3 maker from "Microsoft/ Other" to "Microsoft"
2. **Database migration**: Update existing section_data records (optional)
3. **Documentation**: Inform users of the correction

**Recommendation**: Since software specs are editable, existing projects can be manually corrected if needed. New projects will have correct data.

---

## Related Requirements

### Requirement 17: Software Specifications Section
Defines the UI and editing behavior for software specs

### Requirement 56: Software Specifications Section Default Data
✅ **Now fully compliant** with all 9 acceptance criteria

### Requirement 5.30-5.31: Context Builder
Maps `software_specs.rows` to `sw_rows` with padding to 9 elements for template rendering

---

## Files Modified

- ✅ `frontend/src/components/sections/SoftwareSpecsSection.tsx` - Fixed DEFAULT_ROWS
- ✅ `SOFTWARE_SPECS_DEFAULT_DATA_FIX.md` - This documentation

---

## Summary

**Problem**: Rows 3 and 4 had swapped maker values  
**Solution**: Row 3 changed from "Microsoft/ Other" to "Microsoft"  
**Impact**: Software specifications now correctly categorize Microsoft vs flexible licensing  
**Risk**: Low - only affects new projects, existing projects retain their data  
**Testing**: Manual verification + automated tests  

The software specifications section now correctly initializes with the proper maker values per Requirement 56! 🎉
