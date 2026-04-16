# Abbreviations Default Data Fix

## Problem

The `AbbreviationsSection.tsx` component had **incorrect default abbreviations** that didn't match Requirement 53, causing generated documents to contain wrong standard abbreviations.

### Incorrect Data

**Rows 3-12 were completely wrong**:

| Row | Current (Wrong) | Required (Correct) |
|-----|----------------|-------------------|
| 3 | PLC - Programmable Logic Controller | **SV - Supervisor** |
| 4 | SCADA - Supervisory Control and Data Acquisition | **HMI - Human Machine Interface** |
| 5 | HMI - Human Machine Interface | **PLC - Programmable Logic Controller** |
| 6 | MES - Manufacturing Execution System | **EOT - Electric Overhead Travelling Crane** |
| 7 | ERP - Enterprise Resource Planning | **HHT - Hand-held Terminal** |
| 8 | SQL - Structured Query Language | **LT - Long Travel of EOT Crane** |
| 9 | API - Application Programming Interface | **CT - Cross Travel of EOT Crane** |
| 10 | VPN - Virtual Private Network | **L1 - Level-1 system** |
| 11 | FAT - Factory Acceptance Test | **L2 - Level-2 system** |
| 12 | SAT - Site Acceptance Test | **L3 - Level-3 system** |

### Impact

**Before Fix**:
- Generated documents contained generic IT abbreviations (SCADA, MES, ERP, SQL, API, VPN, FAT, SAT)
- Missing industry-specific abbreviations (SV, EOT, HHT, LT, CT, L1, L2, L3)
- Documents didn't match Hitachi India's standard abbreviation list
- Violates Requirement 53

**After Fix**:
- Generated documents contain correct Hitachi India standard abbreviations
- Industry-specific crane and system level abbreviations included
- Complies with Requirement 53

---

## Solution

### Updated DEFAULT_ROWS

**Before (Incorrect)**:
```typescript
const DEFAULT_ROWS: AbbreviationRow[] = [
  { sr_no: 1, abbreviation: 'JSPL', description: 'Jindal Steel & Power Ltd.', locked: true },
  { sr_no: 2, abbreviation: 'HIL', description: 'Hitachi India Pvt. Ltd.', locked: true },
  { sr_no: 3, abbreviation: 'PLC', description: 'Programmable Logic Controller', locked: true },     // ❌
  { sr_no: 4, abbreviation: 'SCADA', description: 'Supervisory Control and Data Acquisition', locked: true }, // ❌
  { sr_no: 5, abbreviation: 'HMI', description: 'Human Machine Interface', locked: true },           // ❌
  { sr_no: 6, abbreviation: 'MES', description: 'Manufacturing Execution System', locked: true },    // ❌
  { sr_no: 7, abbreviation: 'ERP', description: 'Enterprise Resource Planning', locked: true },      // ❌
  { sr_no: 8, abbreviation: 'SQL', description: 'Structured Query Language', locked: true },         // ❌
  { sr_no: 9, abbreviation: 'API', description: 'Application Programming Interface', locked: true }, // ❌
  { sr_no: 10, abbreviation: 'VPN', description: 'Virtual Private Network', locked: true },          // ❌
  { sr_no: 11, abbreviation: 'FAT', description: 'Factory Acceptance Test', locked: true },          // ❌
  { sr_no: 12, abbreviation: 'SAT', description: 'Site Acceptance Test', locked: true },             // ❌
  { sr_no: 13, abbreviation: '', description: 'Plate Mill Yard Management System', locked: false },
  { sr_no: 14, abbreviation: 'HTC', description: 'Heat Treatment Complex', locked: true },
];
```

**After (Correct per Requirement 53)**:
```typescript
const DEFAULT_ROWS: AbbreviationRow[] = [
  { sr_no: 1, abbreviation: 'JSPL', description: 'Jindal Steel & Power Ltd.', locked: true },
  { sr_no: 2, abbreviation: 'HIL', description: 'Hitachi India Pvt. Ltd.', locked: true },
  { sr_no: 3, abbreviation: 'SV', description: 'Supervisor', locked: true },                         // ✅
  { sr_no: 4, abbreviation: 'HMI', description: 'Human Machine Interface', locked: true },           // ✅
  { sr_no: 5, abbreviation: 'PLC', description: 'Programmable Logic Controller', locked: true },     // ✅
  { sr_no: 6, abbreviation: 'EOT', description: 'Electric Overhead Travelling Crane', locked: true }, // ✅
  { sr_no: 7, abbreviation: 'HHT', description: 'Hand-held Terminal', locked: true },                // ✅
  { sr_no: 8, abbreviation: 'LT', description: 'Long Travel of EOT Crane', locked: true },           // ✅
  { sr_no: 9, abbreviation: 'CT', description: 'Cross Travel of EOT Crane', locked: true },          // ✅
  { sr_no: 10, abbreviation: 'L1', description: 'Level-1 system', locked: true },                    // ✅
  { sr_no: 11, abbreviation: 'L2', description: 'Level-2 system', locked: true },                    // ✅
  { sr_no: 12, abbreviation: 'L3', description: 'Level-3 system', locked: true },                    // ✅
  { sr_no: 13, abbreviation: '', description: 'Plate Mill Yard Management System', locked: false },
  { sr_no: 14, abbreviation: 'HTC', description: 'Heat Treatment Complex', locked: true },
];
```

---

## Complete Abbreviations List

### Rows 1-2: Company Names
1. **JSPL** - Jindal Steel & Power Ltd.
2. **HIL** - Hitachi India Pvt. Ltd.

### Rows 3-5: Core Systems
3. **SV** - Supervisor
4. **HMI** - Human Machine Interface
5. **PLC** - Programmable Logic Controller

### Rows 6-9: Crane & Equipment
6. **EOT** - Electric Overhead Travelling Crane
7. **HHT** - Hand-held Terminal
8. **LT** - Long Travel of EOT Crane
9. **CT** - Cross Travel of EOT Crane

### Rows 10-12: System Levels
10. **L1** - Level-1 system
11. **L2** - Level-2 system
12. **L3** - Level-3 system

### Row 13: Solution-Specific (Editable)
13. **[Auto-filled]** - Plate Mill Yard Management System

### Row 14: Facility
14. **HTC** - Heat Treatment Complex

---

## Why These Abbreviations?

### Industry Context

The abbreviations reflect **Hitachi India's industrial automation domain**:

**Crane Operations** (EOT, LT, CT):
- Electric Overhead Travelling cranes are common in steel mills
- Long Travel (LT) and Cross Travel (CT) are crane movement axes
- Critical for material handling automation

**System Architecture** (L1, L2, L3):
- L1: Process control (PLC, sensors, actuators)
- L2: Manufacturing execution (MES, SCADA)
- L3: Enterprise systems (ERP, planning)
- Standard ISA-95 automation pyramid terminology

**Field Equipment** (HHT, SV):
- Hand-held Terminals for mobile data collection
- Supervisors for process monitoring and control

### Removed Generic IT Terms

The incorrect abbreviations (SCADA, MES, ERP, SQL, API, VPN, FAT, SAT) were:
- Too generic (not specific to Hitachi India projects)
- Some were testing terms (FAT, SAT) not abbreviations used in documents
- Some were technical terms (SQL, API) not typically in abbreviation lists
- Not aligned with Hitachi India's standard documentation

---

## Requirements Compliance

### Requirement 53: Abbreviations Section Default Data

✅ **All 14 acceptance criteria now met**:

1. ✅ Row 1: JSPL - Jindal Steel & Power Ltd.
2. ✅ Row 2: HIL - Hitachi India Pvt. Ltd.
3. ✅ Row 3: SV - Supervisor
4. ✅ Row 4: HMI - Human Machine Interface
5. ✅ Row 5: PLC - Programmable Logic Controller
6. ✅ Row 6: EOT - Electric Overhead Travelling Crane
7. ✅ Row 7: HHT - Hand-held Terminal
8. ✅ Row 8: LT - Long Travel of EOT Crane
9. ✅ Row 9: CT - Cross Travel of EOT Crane
10. ✅ Row 10: L1 - Level-1 system
11. ✅ Row 11: L2 - Level-2 system
12. ✅ Row 12: L3 - Level-3 system
13. ✅ Row 13: [Empty] - Plate Mill Yard Management System (editable)
14. ✅ Row 14: HTC - Heat Treatment Complex

---

## Testing

### Manual Test

1. **Create a new project**
2. **Navigate to Abbreviations section**
3. **Verify default rows**:
   - Row 3: SV - Supervisor ✓
   - Row 4: HMI - Human Machine Interface ✓
   - Row 5: PLC - Programmable Logic Controller ✓
   - Row 6: EOT - Electric Overhead Travelling Crane ✓
   - Row 7: HHT - Hand-held Terminal ✓
   - Row 8: LT - Long Travel of EOT Crane ✓
   - Row 9: CT - Cross Travel of EOT Crane ✓
   - Row 10: L1 - Level-1 system ✓
   - Row 11: L2 - Level-2 system ✓
   - Row 12: L3 - Level-3 system ✓

4. **Generate document**
5. **Open generated .docx**
6. **Check abbreviations table** contains correct entries

### Automated Test

```typescript
describe('AbbreviationsSection default data', () => {
  it('should have correct abbreviations per Requirement 53', () => {
    const expected = [
      { sr_no: 1, abbreviation: 'JSPL', description: 'Jindal Steel & Power Ltd.' },
      { sr_no: 2, abbreviation: 'HIL', description: 'Hitachi India Pvt. Ltd.' },
      { sr_no: 3, abbreviation: 'SV', description: 'Supervisor' },
      { sr_no: 4, abbreviation: 'HMI', description: 'Human Machine Interface' },
      { sr_no: 5, abbreviation: 'PLC', description: 'Programmable Logic Controller' },
      { sr_no: 6, abbreviation: 'EOT', description: 'Electric Overhead Travelling Crane' },
      { sr_no: 7, abbreviation: 'HHT', description: 'Hand-held Terminal' },
      { sr_no: 8, abbreviation: 'LT', description: 'Long Travel of EOT Crane' },
      { sr_no: 9, abbreviation: 'CT', description: 'Cross Travel of EOT Crane' },
      { sr_no: 10, abbreviation: 'L1', description: 'Level-1 system' },
      { sr_no: 11, abbreviation: 'L2', description: 'Level-2 system' },
      { sr_no: 12, abbreviation: 'L3', description: 'Level-3 system' },
      { sr_no: 13, abbreviation: '', description: 'Plate Mill Yard Management System' },
      { sr_no: 14, abbreviation: 'HTC', description: 'Heat Treatment Complex' },
    ];

    DEFAULT_ROWS.forEach((row, index) => {
      expect(row.sr_no).toBe(expected[index].sr_no);
      expect(row.abbreviation).toBe(expected[index].abbreviation);
      expect(row.description).toBe(expected[index].description);
    });
  });

  it('should have 13 locked rows and 1 editable row', () => {
    const lockedCount = DEFAULT_ROWS.filter(row => row.locked).length;
    const editableCount = DEFAULT_ROWS.filter(row => !row.locked).length;
    
    expect(lockedCount).toBe(13);
    expect(editableCount).toBe(1);
    expect(DEFAULT_ROWS[12].locked).toBe(false); // Row 13 is editable
  });
});
```

---

## Impact on Existing Projects

### New Projects
✅ Will get correct abbreviations immediately

### Existing Projects
⚠️ **Already have old abbreviations saved in database**

**Options**:
1. **Manual update**: Users can add custom rows with correct abbreviations
2. **Database migration**: Update existing section_data records (optional)
3. **Documentation**: Inform users of the correction

**Recommendation**: Since abbreviations are locked, existing projects will keep old data. New projects will have correct data. Consider a migration script if needed.

---

## Files Modified

- ✅ `frontend/src/components/sections/AbbreviationsSection.tsx` - Fixed DEFAULT_ROWS
- ✅ `ABBREVIATIONS_DEFAULT_DATA_FIX.md` - This documentation

---

## Related Requirements

### Requirement 14: Revision History Section
Uses editable table pattern (similar to abbreviations)

### Requirement 53: Abbreviations Section Default Data
✅ **Now fully compliant** with all 14 acceptance criteria

### Requirement 5.13: Context Builder
Maps `abbreviations.rows` to `abbreviation_rows` for template rendering

---

## Summary

**Problem**: 10 out of 14 default abbreviations were incorrect  
**Solution**: Updated DEFAULT_ROWS to match Requirement 53 exactly  
**Impact**: Generated documents now contain correct Hitachi India standard abbreviations  
**Risk**: Low - only affects new projects, existing projects retain their data  
**Testing**: Manual verification + automated tests  

The abbreviations section now correctly initializes with industry-specific abbreviations for Hitachi India's automation projects! 🎉
