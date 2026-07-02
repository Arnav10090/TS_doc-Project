# TS Type Hierarchical Structure Update

## Overview
Updated the TS Type enumeration to support a **multi-level hierarchical structure** based on the updated `ts_documents/` folder organization.

## Key Changes

### Previous Structure (Flat 2-Level)
- All categories had exactly 2 levels: `Category/Subcategory`
- Example: `"Data Analysis/Historian"`, `"Level 2/Level 2"`

### New Structure (Hierarchical Multi-Level)
- Supports variable depth hierarchy: `Category`, `Category/Subcategory`, `Category/Subcategory/Item`
- Example: `"Level 2"` (1 level), `"OT Upgrades/HMI"` (2 levels), `"Data Analysis/Data Centralization/Historian"` (3 levels)

## Updated Folder Structure

```
ts_documents/
├── Data Analysis/
│   ├── Advanced Analysis/
│   │   └── AutoML Platform/              ← 3-level nested
│   ├── Data Centralization/
│   │   ├── Historian/                    ← 3-level nested
│   │   └── UGS/                          ← 3-level nested
│   └── Data Monitoring/
│       ├── EMS/                          ← 3-level nested
│       ├── HPMS/                         ← 3-level nested
│       └── RAS/                          ← 3-level nested
├── Level 2/                              ← 1-level (no subcategory)
├── OT Cybersecurity/                     ← 1-level (no subcategory)
├── OT Upgrades/
│   ├── HMI/                              ← 2-level
│   ├── L2/                               ← 2-level
│   └── POC Upgrade/                      ← 2-level
└── Yard Management/
    ├── HSM/                              ← 2-level
    └── Plate Mill/                       ← 2-level
```

## TS Type Categories (16 Total)

### Data Analysis (9 types - supports 2 and 3 levels)
1. `Data Analysis/Advanced Analysis`
2. `Data Analysis/Advanced Analysis/AutoML Platform` (3-level)
3. `Data Analysis/Data Centralization`
4. `Data Analysis/Data Centralization/Historian` (3-level)
5. `Data Analysis/Data Centralization/UGS` (3-level)
6. `Data Analysis/Data Monitoring`
7. `Data Analysis/Data Monitoring/EMS` (3-level)
8. `Data Analysis/Data Monitoring/HPMS` (3-level)
9. `Data Analysis/Data Monitoring/RAS` (3-level)

### Level 2 (1 type - single level)
10. `Level 2`

### OT Cybersecurity (1 type - single level)
11. `OT Cybersecurity`

### OT Upgrades (3 types - 2 levels)
12. `OT Upgrades/HMI`
13. `OT Upgrades/L2`
14. `OT Upgrades/POC Upgrade`

### Yard Management (2 types - 2 levels)
15. `Yard Management/HSM`
16. `Yard Management/Plate Mill`

## Display Label Examples

| Value (Path) | Display Label |
|--------------|---------------|
| `Level 2` | `Level 2` |
| `OT Upgrades/HMI` | `OT Upgrades — HMI` |
| `Data Analysis/Data Centralization/Historian` | `Data Analysis — Data Centralization — Historian` |

## Code Changes

### 1. `backend/app/projects/ts_types.py`
- ✅ Updated TSType enum to 16 hierarchical categories
- ✅ Updated `get_display_label()` docstring to mention multi-level support
- ✅ Updated `to_folder_path()` docstring to mention nested directories
- ✅ Updated `get_all_options()` example with 3-level paths

**Key Features:**
- The `get_display_label()` method automatically handles any depth: replaces all `/` with ` — `
- The `to_folder_path()` method returns the raw value for direct filesystem mapping
- Supports mixing of 1-level, 2-level, and 3-level categories in the same enum

### 2. `ts_documents/README.md`
- ✅ Updated folder structure diagram to show hierarchical nesting
- ✅ Added note explaining multi-level hierarchy
- ✅ Updated context.txt examples to show different levels

### 3. `backend/app/ai_suggestions/retrieval.py`
- ✅ Updated docstring to mention multi-level hierarchy support
- ✅ Updated example paths

### 4. `.kiro/specs/ai-suggestions-feature/design.md`
- ✅ Updated TSType enum example
- ✅ Updated TSTypeOption value/label examples
- ✅ Updated folder path resolution example
- ✅ Updated GET /api/v1/ts-types response example with all 16 types

### 5. `.kiro/specs/ai-suggestions-feature/requirements.md`
- ✅ Updated format description to mention multi-level hierarchy
- ✅ Updated examples with 3-level paths

## Technical Notes

### Path Resolution (Security)
The retrieval module already handles multi-level paths correctly:
```python
category_path = os.path.join(ts_documents_dir, *ts_type.split("/"))
resolved = os.path.abspath(category_path)
# Validates against base directory to prevent path traversal
if not resolved.startswith(base + os.sep):
    raise ValueError("Invalid ts_type: path traversal detected")
```

This works for any depth: `"Level 2"`, `"OT Upgrades/HMI"`, or `"Data Analysis/Data Centralization/Historian"`.

### Display Label Formatting
The `get_display_label()` method is depth-agnostic:
```python
return self.value.replace("/", " — ")
```
- 1-level: `"Level 2"` → `"Level 2"`
- 2-level: `"OT Upgrades/HMI"` → `"OT Upgrades — HMI"`
- 3-level: `"Data Analysis/Data Centralization/Historian"` → `"Data Analysis — Data Centralization — Historian"`

## Verification

✅ **All Python files**: No diagnostic errors
✅ **TSType enum**: 16 categories loaded successfully
✅ **Display labels**: Correctly formatted with em dashes at all levels
✅ **Folder paths**: Correctly mapped to filesystem structure
✅ **Hierarchy support**: Mixed 1, 2, and 3-level paths work correctly

## Benefits of Hierarchical Structure

1. **Logical Organization**: Related categories are grouped naturally (e.g., all Data Centralization types under one parent)
2. **Flexibility**: Users can select at the appropriate specificity level
3. **Scalability**: Easy to add new subcategories without restructuring
4. **Context Inheritance**: Historical documents can be placed at any level and retrieved recursively
5. **Clear Taxonomy**: Better reflects the actual project classification used by Hitachi India

## Backward Compatibility

- The database `ts_type` column remains a nullable string
- Existing projects with NULL `ts_type` are unaffected
- The API validation and UI selection will enforce non-null values for new projects
- No migration needed - new values are just strings with more `/` characters

## Next Steps

1. Populate `context.txt` files at appropriate hierarchy levels
2. Add historical TS documents to relevant folders
3. Test AI suggestions with the hierarchical structure
4. Consider UI grouping/nesting in the TS Type dropdown (optional enhancement)
