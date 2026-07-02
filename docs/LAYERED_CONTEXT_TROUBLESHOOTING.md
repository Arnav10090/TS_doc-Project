# Layered Context Troubleshooting Guide

> **Version:** 1.0 | **Last Updated:** 2026-06-23

---

## Overview

This guide covers common issues, debugging procedures, and verification steps for the Layered Context Architecture in the AI Suggestions system.

---

## 1. Routing Problems

### Problem: Wrong context files are being loaded

**Symptoms:** AI suggestions contain irrelevant context (e.g., cybersecurity content in a Gantt section).

**Debugging steps:**

1. Check the routing map for the affected section:
   ```python
   from app.ai_suggestions.section_context_map import get_shared_context_files
   
   files = get_shared_context_files("overall_gantt")
   print(files)  # Should show ["domain_context.txt", "gantt_context.txt"]
   ```

2. Check if a routing override is being applied:
   ```python
   from app.ai_suggestions.section_context_map import get_shared_context_files
   
   files = get_shared_context_files(
       section_key="overall_gantt",
       ts_type_folder="/path/to/ts_documents/{ts_type}"
   )
   print(files)
   ```

3. Check for a `context_routing_override.json` in the TS type folder. If one exists, validate it:
   ```powershell
   python -m json.tool "ts_documents/{ts_type}/context_routing_override.json"
   ```

4. Clear the routing cache if you recently modified the override file:
   ```python
   from app.ai_suggestions.section_context_map import clear_override_cache
   clear_override_cache()
   ```

**Solution:** Update `section_context_map.py` default routing OR add a `context_routing_override.json` for TS-type specific routing.

---

### Problem: Custom section gets wrong context

**Symptoms:** Custom sections (`custom_section_*`) load unexpected context files.

**Expected behavior:** Custom sections fall back to `domain_context.txt` only.

**Debugging steps:**
```python
from app.ai_suggestions.section_context_map import get_shared_context_files

files = get_shared_context_files("custom_section_1234_abcd")
print(files)  # Should return ["domain_context.txt"]
```

---

## 2. File Loading Errors

### Problem: Context file not being loaded (shows as None in response)

**Symptoms:** `loaded_shared_contexts` in API response is empty or missing files.

**Debugging steps:**

1. Verify the file exists in the correct location:
   ```powershell
   Test-Path "ts_documents/{ts_type}/domain_context.txt"
   ```

2. Check file encoding (must be UTF-8):
   ```powershell
   python -c "open('ts_documents/{ts_type}/domain_context.txt', encoding='utf-8').read()"
   ```

3. Check file size (must be > 0 bytes and not exceed 1000 chars after truncation):
   ```powershell
   (Get-Item "ts_documents/{ts_type}/domain_context.txt").Length
   ```

4. Check application logs for file loading warnings:
   ```
   WARNING: Could not read domain_context.txt for {ts_type}: [Errno 2] No such file
   ```

**Solution:** Ensure file exists, is UTF-8 encoded, and is in the correct folder.

---

### Problem: Section guidance file not loading

**Symptoms:** `section_guidance_available` is `False` in API response even though the file exists.

**Debugging steps:**

1. Verify the file path:
   ```powershell
   Test-Path "ts_documents/{ts_type}/section_guidance/{section_key}.txt"
   ```
   
   Example: `ts_documents/Level 2/section_guidance/hardware_specs.txt`

2. Check the section key being passed matches the filename exactly:
   - Section key: `hardware_specs`
   - Expected file: `hardware_specs.txt` (NOT `HardwareSpecs.txt` or `hardware-specs.txt`)

3. Verify the file is not empty:
   ```powershell
   Get-Content "ts_documents/{ts_type}/section_guidance/{section_key}.txt"
   ```

**Solution:** Ensure filename matches section key exactly (lowercase, underscores).

---

### Problem: Legacy fallback being used unexpectedly

**Symptoms:** `context_txt_used: true` in API response when you expect layered context.

**Cause:** The system falls back to `context.txt` when NO layered context files exist in the folder.

**Debugging steps:**

1. Check if layered files exist:
   ```powershell
   Get-ChildItem "ts_documents/{ts_type}/*_context.txt"
   ```

2. If layered files exist but fallback is still triggered, check the retrieval logic:
   ```python
   from app.ai_suggestions.retrieval import load_layered_context
   
   ctx = load_layered_context(
       ts_type="{ts_type}",
       ts_documents_dir="ts_documents",
       section_key="hardware_specs",
       max_docs=5
   )
   print("Domain context:", ctx.domain_context[:50] if ctx.domain_context else "None")
   print("Legacy fallback:", ctx.legacy_context_txt is not None)
   ```

**Solution:** Create at least one `*_context.txt` file in the TS type folder to trigger layered mode.

---

## 3. Context Content Issues

### Problem: Context is irrelevant to the section being generated

**Symptoms:** AI output is generic or draws on wrong product knowledge.

**Debugging steps:**

1. Review the actual content in the context file:
   ```powershell
   cat "ts_documents/{ts_type}/domain_context.txt"
   ```

2. Check that context is loaded and not truncated at wrong length:
   - Shared context files: truncated at 1000 chars
   - Section guidance files: truncated at 500 chars

3. Check routing to verify the right files are being loaded for this section (see Section 1 above).

**Solution:** 
- Update context file content to be more specific to the TS type
- Check routing map to ensure the right files are assigned to the section

---

### Problem: Context is too short / sparse

**Symptoms:** `domain_context.txt` has < 50 chars — migration script warns "Very sparse content."

**Solution:** 
- Add more domain knowledge manually to the file
- Refer to UGS `domain_context.txt` as a style/length reference
- Use the template: `ts_documents/templates/domain_context.txt.template`

---

### Problem: Context file is too large (> 1200 chars)

**Symptoms:** Migration validation warns: "Exceeds recommended size."  
**Effect:** Content beyond 1000 chars is truncated by the loader — excess content is silently lost.

**Solution:** 
- Trim the context file to the recommended size
- Move lower-priority content to another file
- Focus on the most frequently needed knowledge for the sections that load this file

---

## 4. Cache Issues

### Problem: Changes to context files not reflected in AI suggestions

**Cause:** The context loader uses folder modification-time fingerprinting for cache invalidation. If the file's modification time is not updated, the cache may return stale content.

**Solution:**

1. Touch the context file to update its modification time:
   ```powershell
   (Get-Item "ts_documents/{ts_type}/domain_context.txt").LastWriteTime = Get-Date
   ```

2. Or restart the backend service (clears all in-memory cache).

3. In tests, use `clear_override_cache()` and reload modules.

---

### Problem: Override changes not applying in production

**Cause:** Override maps are cached per folder path.

**Solution:**
```python
from app.ai_suggestions.section_context_map import clear_override_cache
clear_override_cache()
```

Or restart the backend service.

---

## 5. Verifying Context is Loaded Correctly

### Via API Response

Make an AI suggestion request and inspect the response:

```json
{
  "suggestion": "...",
  "context_sources": ["domain_context.txt", "architecture_context.txt"],
  "context_txt_used": false,
  "section_guidance_used": true,
  "loaded_shared_contexts": ["domain_context.txt", "architecture_context.txt"]
}
```

Expected for `hardware_specs` section:
- `context_sources`: `["domain_context.txt", "architecture_context.txt"]`
- `context_txt_used`: `false` (if layered files exist)
- `section_guidance_used`: `true` (if `section_guidance/hardware_specs.txt` exists)

### Via Application Logs

Backend logs show context loading at INFO level:
```
INFO: Loaded context for {ts_type}/{section_key}: 2 shared files, guidance available
INFO: Loaded domain_context.txt (800 chars) for Data Analysis/Data Centralization/UGS
```

Warnings indicate missing or problematic files:
```
WARNING: Could not read architecture_context.txt: file not found
WARNING: Falling back to legacy context.txt for Level 2 (no layered files found)
```

---

## 6. Validation Script

Run the comprehensive validation script to check all routing for a TS type:

```powershell
python backend/scripts/validate_ugs_migration.py
```

This script checks:
- ✅ All 5 context files present and non-empty
- ✅ All 29 section keys have routing map entries
- ✅ Section guidance files present for all sections
- ✅ No cross-contamination (e.g., gantt_context not loaded for hardware_specs)
- ✅ Legacy fallback correctly triggered when files absent

---

## 7. Quick Reference

### File Locations

| What | Where |
|---|---|
| Shared context files | `ts_documents/{ts_type}/*_context.txt` |
| Section guidance | `ts_documents/{ts_type}/section_guidance/{section_key}.txt` |
| Routing override | `ts_documents/{ts_type}/context_routing_override.json` |
| Context templates | `ts_documents/templates/*.template` |
| Routing map code | `backend/app/ai_suggestions/section_context_map.py` |
| Retrieval logic | `backend/app/ai_suggestions/retrieval.py` |
| Migration script | `backend/scripts/migrate_context_to_layered.py` |
| Guidance generator | `backend/scripts/generate_section_guidance.py` |
| Validation script | `backend/scripts/validate_ugs_migration.py` |

### Size Limits

| File | Truncated at |
|---|---|
| Shared context files | 1000 chars each |
| Section guidance files | 500 chars |
| Legacy `context.txt` | 2000 chars |
| Historical documents | 1500 chars each, max 5 docs |

### Key Log Messages

| Message | Meaning |
|---|---|
| `Loaded domain_context.txt (N chars)` | File loaded successfully |
| `Falling back to legacy context.txt` | No layered files found |
| `Could not read {file}: ...` | File read error (non-fatal) |
| `Section guidance not found: {key}.txt` | Guidance file missing (non-fatal) |
| `Context routing override loaded: N sections` | Override JSON applied |
