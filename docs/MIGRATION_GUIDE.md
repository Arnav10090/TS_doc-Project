# Layered Context Migration Guide

> **Version:** 1.0 | **Last Updated:** 2026-06-23  
> **Applies to:** TS-Doc_Project — AI Suggestions Layered Context Architecture

---

## Overview

This guide explains how to migrate a TS type from the legacy monolithic `context.txt` architecture to the new **Layered Context** system. The UGS TS type has been used as the pilot migration and serves as the reference example.

---

## When to Migrate

| Scenario | Action |
|---|---|
| **New TS type** | Create layered files directly (no migration needed — use templates) |
| **Existing TS type with `context.txt`** | Run migration script to split into layered files |
| **Existing TS type with NO context file** | Create layered files from scratch using domain knowledge |
| **TS type already migrated** | Create/refine section guidance files only |

> **Key rule:** Do NOT run the migration script on TS types that have no source `context.txt`. For those, create layered files manually using the templates in `ts_documents/templates/`.

---

## Step-by-Step Migration Process

### Step 1 — Understand the TS Type

Before migrating, gather:
- What the product does (domain knowledge)
- Key technical architecture patterns
- Typical project phases and timelines
- Security/compliance requirements
- Standard exclusions and buyer obligations

Reference documents: any historical TS documents in the TS type folder.

---

### Step 2A — Migrate from Existing `context.txt` (if it exists)

#### 2A.1 Dry-run preview

```powershell
python backend/scripts/migrate_context_to_layered.py `
    --input "ts_context_files/{ts_type}/{name}_context.txt" `
    --output "ts_documents/{ts_type}" `
    --dry-run
```

Review the split preview. Check:
- Are domain sections going to `domain_context`?
- Are architecture/tech sections going to `architecture_context`?
- Is content loss minimal (< 10%)?

#### 2A.2 Optional: AI-assisted splitting for ambiguous content

```powershell
# Requires GEMINI_API_KEY environment variable
python backend/scripts/migrate_context_to_layered.py `
    --input "ts_context_files/{ts_type}/{name}_context.txt" `
    --output "ts_documents/{ts_type}" `
    --ai-assist `
    --dry-run
```

#### 2A.3 Run live migration

```powershell
python backend/scripts/migrate_context_to_layered.py `
    --input "ts_context_files/{ts_type}/{name}_context.txt" `
    --output "ts_documents/{ts_type}" `
    --force
```

The script automatically creates `.bak` backups of any files it overwrites.

---

### Step 2B — Create Layered Files from Scratch (if no `context.txt` exists)

Copy templates from `ts_documents/templates/` and fill in the placeholders:

```powershell
copy "ts_documents/templates/domain_context.txt.template" `
     "ts_documents/{ts_type}/domain_context.txt"

copy "ts_documents/templates/architecture_context.txt.template" `
     "ts_documents/{ts_type}/architecture_context.txt"

# Repeat for all 5 context files
```

**Edit each file** to replace `[PLACEHOLDER]` values with actual TS type content. Delete the comment header block. Target sizes:

| File | Target Size |
|---|---|
| `domain_context.txt` | ~800 chars |
| `architecture_context.txt` | ~600 chars |
| `implementation_context.txt` | ~1000 chars |
| `cybersecurity_context.txt` | ~500 chars |
| `gantt_context.txt` | ~400 chars |

---

### Step 3 — Validate Layered Files

```powershell
python backend/scripts/migrate_context_to_layered.py `
    --output "ts_documents/{ts_type}" `
    --validate-only
```

Expected output:
- ✅ Content coverage: > 90% of original words found in output
- ✅ No significant content duplication
- ✅ All 5 files have content (or justified warning for empty files)
- ✅ File sizes within recommended ranges

---

### Step 4 — Generate Section Guidance Files

#### 4.1 Template-based generation (quick start)

```powershell
python backend/scripts/generate_section_guidance.py `
    --ts-type "{ts_type}" `
    --ts-documents-dir ts_documents `
    --output-dir "ts_documents/{ts_type}/section_guidance" `
    --reference-ts-type "Data Analysis/Data Centralization/UGS"
```

This generates draft guidance files adapted from the UGS reference.

#### 4.2 AI-assisted generation (higher quality)

```powershell
# Requires GEMINI_API_KEY
python backend/scripts/generate_section_guidance.py `
    --ts-type "{ts_type}" `
    --ts-documents-dir ts_documents `
    --output-dir "ts_documents/{ts_type}/section_guidance" `
    --reference-ts-type "Data Analysis/Data Centralization/UGS" `
    --ai-assist `
    --force
```

#### 4.3 Review and refine generated files

Open each generated `.txt` file in `section_guidance/` and:
- Remove `[DRAFT — ADAPT FOR ...]` prefixes
- Replace any remaining `[PLACEHOLDER]` values
- Trim to 200–300 chars if too long
- Verify guidance is specific to this TS type

---

### Step 5 — Test Routing Correctness

Verify that the right context files load for key sections:

```powershell
# Check routing via the validate script
python backend/scripts/validate_ugs_migration.py
```

Or manually verify routing:

| Section | Expected files |
|---|---|
| `hardware_specs` | `domain_context.txt` + `architecture_context.txt` |
| `overall_gantt` | `domain_context.txt` + `gantt_context.txt` |
| `cybersecurity` | `cybersecurity_context.txt` |
| `executive_summary` | `domain_context.txt` |

---

### Step 6 — Test Legacy Fallback (Optional)

To confirm the legacy fallback works:

1. Temporarily rename layered files:
   ```powershell
   rename "ts_documents/{ts_type}/domain_context.txt" "domain_context.txt.DISABLED"
   # Rename all 5 context files
   ```
2. Generate an AI suggestion — it should fall back to `context.txt` with no errors
3. Restore the files:
   ```powershell
   rename "ts_documents/{ts_type}/domain_context.txt.DISABLED" "domain_context.txt"
   ```

---

### Step 7 — Mark Migration Complete

Update `LAYERED_CONTEXT_TASKS.md` to mark the migration tasks as complete (`[x]`).

---

## Rollback Procedure

If the migration causes issues:

1. The migration script creates `.bak` backups automatically.
2. To restore:
   ```powershell
   copy "ts_documents/{ts_type}/domain_context.txt.bak" `
        "ts_documents/{ts_type}/domain_context.txt"
   # Repeat for other backed-up files
   ```
3. Delete the incomplete layered files.
4. The system will fall back to `context.txt` automatically.

---

## File Size Guidelines

| File | Target | Warning Threshold |
|---|---|---|
| `domain_context.txt` | ~800 chars | > 1200 chars |
| `architecture_context.txt` | ~600 chars | > 1200 chars |
| `implementation_context.txt` | ~1000 chars | > 1200 chars |
| `cybersecurity_context.txt` | ~500 chars | > 1200 chars |
| `gantt_context.txt` | ~400 chars | > 1200 chars |
| `section_guidance/{key}.txt` | 150–300 chars | > 500 chars (truncated at load) |

---

## Common Issues

### Issue: AI suggestions still use old context.txt

**Cause:** Layered context files exist but the section routing is loading the wrong file.  
**Solution:** Check `section_context_map.py` routing for the affected section. Use `--validate-only` mode to audit.

### Issue: Empty output files after migration

**Cause:** Source `context.txt` doesn't contain recognized section patterns.  
**Solution:** Use `--ai-assist` flag or manually fill in the files from domain knowledge.

### Issue: Content loss warning > 30%

**Cause:** Some sections weren't matched by regex patterns.  
**Solution:** Check the `uncategorized` field in the split result. Manually distribute to appropriate files.

### Issue: Section guidance files are too long (> 500 chars)

**Cause:** AI generation produced verbose output.  
**Solution:** The loader truncates at 500 chars automatically. Edit files manually for best results.

### Issue: Routing override not applying

**Cause:** `context_routing_override.json` not found or malformed.  
**Solution:** Validate JSON syntax, check file location, and call `clear_override_cache()` if testing.

---

## Reference: UGS Pilot Migration

The UGS TS type (`ts_documents/Data Analysis/Data Centralization/UGS/`) serves as the reference implementation. Study its:
- 5 context files (sizes, content structure)
- 31 section guidance files (tone, detail level)
- `section_guidance/TEMPLATE_MAPPING.md` (section key → template heading mapping)

For validation details, see `docs/UGS_MIGRATION_VALIDATION_REPORT.md`.
