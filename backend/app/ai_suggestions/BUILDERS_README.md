# AI Suggestions Prompt Builders

## Overview

This module implements the **7-layer knowledge hierarchy** for section-aware prompt generation as specified in the AI Suggestions Feature requirements (5.1-5.8, 7.7-7.10, 18.1-18.6).

## Key Features

### 1. **7-Layer Knowledge Hierarchy**

Prompts are built using a prioritized context structure:

1. **Project Metadata** (never truncated)
   - Solution name, client info, TS type, document date
   - Sanitized and HTML-stripped (max 500 chars per field)

2. **Section Identity** (never truncated)
   - Section key, title, and purpose
   - Derived from section_schemas.py

3. **Existing Saved Sections** (truncate if needed)
   - All saved section content as JSON
   - Truncated at 8000 chars if exceeded

4. **Current Draft Content** (truncate before saved sections)
   - Unsaved editor state
   - Truncated at 4000 chars if exceeded

5. **Category Context** (`context.txt`)
   - Category-specific domain knowledge
   - Truncated at 2000 chars (Requirement 5.5)

6. **Historical Documents**
   - Up to 5 historical TS documents (Requirement 5.7)
   - Each truncated at 1500 chars (Requirement 5.6)
   - Total not exceeding 6000 chars (Requirement 5.8)
   - Diversity-aware selection from retrieval module

7. **PROJECT_CONTEXT.md** (embedded at build time)
   - System knowledge embedded as a constant
   - NOT read from filesystem at runtime (Requirements 18.1-18.6)
   - Build fails if embedding fails (Requirement 18.3)

### 2. **Family-Specific Output Instructions**

Each content family receives tailored output format instructions:

- **Family A (Rich Text)**: Clean HTML with `<p>`, `<ul>`, `<li>`, `<strong>`, `<em>`
- **Family B (Tabular)**: JSON array of row objects with specified fields
- **Family C (Mixed-Field)**: JSON object with specified field keys
- **Family D (List-Based)**: JSON array of items with specified structure
- **Family E (Image-Backed)**: JSON object with text description fields only

### 3. **Security & Input Validation**

All user-supplied metadata is sanitized (Requirements 7.8, 7.9, 14.3, 14.4):
- HTML tags stripped
- Non-printable characters removed
- Whitespace normalized
- Truncated to 500 characters maximum

### 4. **Build-Time Embedding**

PROJECT_CONTEXT.md is embedded as a string constant at module initialization:
- No filesystem reads at runtime
- System fails if embedding fails
- Embedded content always included in Layer 7

## Functions

### `build_section_prompt()`

Main prompt builder for predefined sections.

**Parameters:**
- `section_key`: Section identifier
- `project`: Project ORM model instance
- `all_sections`: Dictionary of saved section content
- `draft_content`: Current unsaved editor state
- `category_context`: CategoryContext with historical docs and context.txt
- `project_context_md`: DEPRECATED (embedded instead, kept for API compatibility)

**Returns:** Complete prompt string

**Raises:** `ValueError` if section is suppressed (cover, revision_history, abbreviations)

### `build_custom_section_prompt()`

Prompt builder for custom section subsections.

**Parameters:**
- `custom_section_title`: User-defined custom section title
- `subsection_name`: Name of the subsection
- `subsection_type`: Type ('paragraph', 'table', 'image')
- `project`: Project ORM model instance
- `all_sections`: Dictionary of saved section content
- `draft_content`: Current unsaved editor state for this subsection
- `category_context`: CategoryContext with historical docs and context.txt

**Returns:** Complete prompt string

## Usage Example

```python
from app.ai_suggestions.builders import build_section_prompt
from app.ai_suggestions.retrieval import load_category_context

# Load project and sections
project = await get_project(project_id)
all_sections = await get_all_sections(project_id)
draft_content = request.draft_content

# Load category context
category_context = load_category_context(
    ts_type=project.ts_type,
    ts_documents_dir=settings.TS_DOCUMENTS_DIR
)

# Build prompt
prompt = build_section_prompt(
    section_key="hardware_specs",
    project=project,
    all_sections=all_sections,
    draft_content=draft_content,
    category_context=category_context,
    project_context_md=""  # Not used - embedded instead
)

# Call LLM with prompt
response = await call_groq(prompt)
```

## Testing

Comprehensive test coverage in `tests/unit/test_ai_suggestions_builders.py`:

- ✅ 35 unit tests covering all functions and edge cases
- ✅ Sanitization: HTML stripping, truncation, whitespace normalization
- ✅ Layer formatting: All 7 layers individually tested
- ✅ Truncation rules: Exact limits verified (2000, 1500, 6000 chars)
- ✅ Build-time embedding: PROJECT_CONTEXT.md constant validation
- ✅ Family-specific instructions: All 5 families tested
- ✅ Complete prompt generation: End-to-end verification
- ✅ Suppressed sections: Validation that cover/revision_history/abbreviations are rejected

Run tests:
```bash
cd backend
python -m pytest tests/unit/test_ai_suggestions_builders.py -v
```

## Demo

A demonstration script is available at `tests/demo_prompt_builder.py` that shows:
- Complete 7-layer prompt structure
- Sample output for hardware_specs section
- Layer verification
- Prompt statistics (length, estimated tokens)

Run demo:
```bash
cd backend
python tests/demo_prompt_builder.py
```

Example output:
```
PROMPT STATISTICS
Total length: 5312 characters
Estimated tokens: ~1328

Layer verification:
✓ Layer 1 (Project metadata): True
✓ Layer 2 (Section identity): True
✓ Layer 3 (Saved sections): True
✓ Layer 4 (Draft content): True
✓ Layer 5 (Context.txt): True
✓ Layer 6 (Historical docs): True
✓ Layer 7 (PROJECT_CONTEXT.md): True
✓ Output instructions: True
```

## Requirements Validation

### Requirement 5 (Knowledge Hierarchy) - ✅ COMPLETE

- 5.1: ✅ 7-layer priority order implemented
- 5.2: ✅ Project metadata never truncated
- 5.3: ✅ Section identity never truncated
- 5.4: ✅ Truncation order: historical docs → draft → saved → context.txt
- 5.5: ✅ Context.txt truncated at 2000 chars
- 5.6: ✅ Each historical doc truncated at 1500 chars
- 5.7: ✅ At most 5 historical documents included
- 5.8: ✅ Total historical content ≤ 6000 chars

### Requirement 7 (Section-Aware Prompts) - ✅ COMPLETE

- 7.1-7.5: ✅ Family-specific output instructions (A/B/C/D/E)
- 7.6: ✅ Section-specific instructions included
- 7.7: ✅ Section title and description included
- 7.8: ✅ User-supplied metadata sanitized (HTML-stripped)
- 7.9: ✅ User-supplied metadata truncated to 500 chars
- 7.10: ✅ PROJECT_CONTEXT.md embedded in templates

### Requirement 18 (Build-Time Embedding) - ✅ COMPLETE

- 18.1: ✅ PROJECT_CONTEXT.md embedded at build time
- 18.2: ✅ NOT read from filesystem at runtime
- 18.3: ✅ Build fails if embedding fails (constant validation)
- 18.4: ✅ Embedded content in layer 6 position
- 18.5: ✅ Included in every section prompt
- 18.6: ✅ Not truncated unless entire prompt exceeds budget

## Architecture Notes

### Truncation Strategy

When prompt exceeds token budget, content is truncated in this order:

1. Historical documents (shortest first)
2. Current draft content
3. Existing saved sections
4. Category context.txt (last resort)

Project metadata, section identity, and output instructions are **never truncated**.

### Integration with Other Modules

- **section_schemas.py**: Provides content family mappings and output format instructions
- **retrieval.py**: Supplies CategoryContext with historical docs and context.txt
- **service.py**: Calls builders to generate prompts before LLM invocation

### Future Enhancements

When the retrieval module is upgraded to use vector-based RAG:
- The builder interface remains unchanged
- Historical documents will come from semantic search instead of file scanning
- Diversity-aware selection still applies
- Truncation rules remain the same

## Constants

### `PROJECT_CONTEXT_MD_EMBEDDED`

Embedded PROJECT_CONTEXT.md content (1206 characters).

This constant is populated during module initialization and must not be modified at runtime. It contains essential system knowledge about the TS Document Generator codebase and Hitachi India's document structure.

**Critical:** This constant must never be None or empty. The module should fail to import if the embedding fails.

---

## Context Routing Override Configuration

### Overview

The layered context system (Phase 2) supports customizing section-to-context file mappings per TS type via JSON override files. This allows specific TS types to use specialized context files for certain sections without modifying the default routing map.

### JSON Override File Location

Place the override file at:
```
ts_documents/{ts_type}/context_routing_override.json
```

For example:
```
ts_documents/Data Analysis/Data Centralization/UGS/context_routing_override.json
ts_documents/Level 2/context_routing_override.json
```

### JSON File Format

The override file must be valid JSON with the following structure:

```json
{
  "section_key": ["context_file1.txt", "context_file2.txt"],
  "another_section": ["domain_context.txt"]
}
```

**Schema:**
- **Root**: Must be a JSON object (dictionary)
- **Keys**: Section keys (strings) matching repository section identifiers
- **Values**: Arrays of context filename strings

**Example:**

```json
{
  "hardware_specs": [
    "domain_context.txt",
    "architecture_context.txt",
    "hardware_sizing_context.txt"
  ],
  "features": [
    "domain_context.txt",
    "custom_features_context.txt"
  ],
  "cybersecurity": [
    "cybersecurity_context.txt",
    "compliance_context.txt",
    "implementation_context.txt"
  ]
}
```

### Override Behavior

1. **Shallow Merge**: Custom mappings replace default mappings on a per-section basis
2. **Selective Override**: Only specified sections are overridden; others use defaults
3. **Complete Replacement**: The entire context file list for a section is replaced (not merged)

**Example:**

Default mapping for `features`:
```python
["domain_context.txt", "implementation_context.txt"]
```

Override mapping for `features`:
```json
{
  "features": ["domain_context.txt", "custom_features_context.txt"]
}
```

Result: `features` section loads `domain_context.txt` and `custom_features_context.txt` (default `implementation_context.txt` is NOT loaded).

### Validation Rules

The system validates override files with the following rules:

1. **Root Type**: Must be a JSON object (dictionary)
   - Invalid: `["file1.txt", "file2.txt"]` (array)
   - Valid: `{"section_key": ["file1.txt"]}`

2. **Section Keys**: Must be strings
   - Invalid: `{123: ["file.txt"]}` (numeric key)
   - Valid: `{"features": ["file.txt"]}`

3. **Context File Lists**: Must be arrays
   - Invalid: `{"features": "file.txt"}` (string)
   - Valid: `{"features": ["file.txt"]}`

4. **Context Filenames**: Must be strings
   - Invalid: `{"features": [123]}` (numeric)
   - Valid: `{"features": ["custom_context.txt"]}`

5. **Filename Convention** (warning only):
   - Recommended: `*_context.txt` pattern
   - Warning logged if filename doesn't end with `.txt`

### Error Handling

- **File Not Found**: No error; system uses default routing map
- **Invalid JSON**: Warning logged; system uses default routing map
- **Invalid Structure**: Invalid entries are skipped with warnings logged
- **Empty After Validation**: No overrides applied; system uses default routing map

**Example Log Output:**

```
WARNING: Invalid context filename for section 'features' in 
/app/ts_documents/UGS/context_routing_override.json: 
must be string, skipping 123

INFO: Loaded context routing override from 
/app/ts_documents/UGS/context_routing_override.json: 
3 section(s) customized
```

### Usage in Code

The override is automatically loaded when calling `get_shared_context_files()` with a `ts_type_folder` argument:

```python
from app.ai_suggestions.section_context_map import get_shared_context_files

# Without override (uses default map)
context_files = get_shared_context_files("features")
# Returns: ["domain_context.txt", "implementation_context.txt"]

# With override (checks for JSON file in folder)
context_files = get_shared_context_files(
    section_key="features",
    ts_type_folder="/app/ts_documents/UGS"
)
# Returns: ["domain_context.txt", "custom_features_context.txt"]
# (if context_routing_override.json exists and defines override for "features")
```

### Caching

Override maps are cached per `ts_type_folder` to avoid repeated file reads:

- **Cache Key**: Absolute path to ts_type folder
- **Invalidation**: Manual via `clear_override_cache()` function
- **Thread Safety**: Cache uses thread-safe dictionary

**Clear Cache (for testing or runtime updates):**

```python
from app.ai_suggestions.section_context_map import clear_override_cache

clear_override_cache()
```

### Use Cases

1. **TS-Type Specific Context**: Load specialized context files for certain TS types
   ```json
   {
     "hardware_specs": ["domain_context.txt", "plc_hardware_context.txt"]
   }
   ```

2. **Industry-Specific Guidance**: Customize sections for specific industries
   ```json
   {
     "cybersecurity": ["cybersecurity_context.txt", "pharma_compliance_context.txt"]
   }
   ```

3. **Client-Specific Overrides**: Load client-specific terminology or patterns
   ```json
   {
     "features": ["domain_context.txt", "client_abc_features_context.txt"]
   }
   ```

4. **Testing and Experimentation**: Test new context files without modifying code
   ```json
   {
     "executive_summary": ["experimental_context.txt"]
   }
   ```

### Best Practices

1. **Minimal Overrides**: Only override sections that truly need customization
2. **Consistent Naming**: Follow `*_context.txt` naming convention
3. **Documentation**: Add comments in a separate README in the ts_type folder
4. **Version Control**: Track override files in version control if shared across team
5. **Validation**: Test override files by triggering AI suggestions for overridden sections
6. **File Size**: Keep context files under 1000 characters (same as shared context files)

### Example Complete Override File

```json
{
  "hardware_specs": [
    "domain_context.txt",
    "architecture_context.txt",
    "ugs_hardware_sizing_context.txt"
  ],
  "software_specs": [
    "architecture_context.txt",
    "ugs_software_stack_context.txt"
  ],
  "features": [
    "domain_context.txt",
    "ugs_value_added_features_context.txt"
  ],
  "cybersecurity": [
    "cybersecurity_context.txt",
    "ugs_security_policies_context.txt",
    "implementation_context.txt"
  ]
}
```

### Testing Override Files

1. **Validate JSON Syntax**: Use a JSON validator or `python -m json.tool override.json`
2. **Check File Paths**: Ensure referenced context files exist in the ts_type folder
3. **Test AI Suggestions**: Generate suggestions for overridden sections
4. **Review Logs**: Check application logs for validation warnings
5. **Clear Cache**: Use `clear_override_cache()` when modifying override files during development

### Troubleshooting

**Problem**: Override not being applied

**Solutions**:
1. Check file location: Must be in ts_type folder root
2. Check filename: Must be exactly `context_routing_override.json`
3. Validate JSON syntax: Use JSON validator
4. Check logs: Look for validation warnings
5. Clear cache: Call `clear_override_cache()` if file was modified
6. Verify ts_type_folder path: Must be absolute path passed to function

**Problem**: Invalid JSON error

**Solutions**:
1. Check for trailing commas (not allowed in JSON)
2. Check for comments (not allowed in JSON)
3. Validate all strings use double quotes (not single quotes)
4. Use JSON linter or formatter tool

**Problem**: Context file not loading

**Solutions**:
1. Check that context file exists in ts_type folder
2. Check filename spelling matches override file exactly
3. Check file permissions (must be readable)
4. Verify file encoding is UTF-8

---

## Layered Context Architecture (Phase 2)

### Overview

The **Layered Context Architecture** replaces the monolithic `context.txt` file with a set of focused, purpose-specific context files per TS type. Each shared context file is loaded only when its content is relevant to the section being written, drastically improving token efficiency and context relevance.

### Why Layered Context?

| Problem (Monolithic `context.txt`) | Solution (Layered) |
|---|---|
| Full 2000-char file sent for every section | Only relevant files loaded per section |
| Section-irrelevant content dilutes prompt | Each file targets a specific concern |
| Cannot scale beyond 2000 chars | 5 files × 1000 chars = 5000 chars of targeted knowledge |
| Single file edited causes widespread change risk | Each file has single responsibility |

### Shared Context File Structure

Each TS type folder (`ts_documents/{ts_type}/`) can contain:

| File | Purpose | Target Size |
|---|---|---|
| `domain_context.txt` | What the product is, business drivers, plant environment | ~800 chars |
| `architecture_context.txt` | Tech stack, protocols, architecture options, data flow | ~600 chars |
| `implementation_context.txt` | Project phases, FAT, buyer obligations, exclusions, PoC | ~1000 chars |
| `cybersecurity_context.txt` | Security policies, liability, NDA, patch management | ~500 chars |
| `gantt_context.txt` | Schedule guidance, milestones, draw.io format, gates | ~400 chars |

### Section Guidance Files

Per-section writing guidance files live in `section_guidance/` within the TS type folder:

```
ts_documents/{ts_type}/
├── domain_context.txt
├── architecture_context.txt
├── implementation_context.txt
├── cybersecurity_context.txt
├── gantt_context.txt
└── section_guidance/
    ├── executive_summary.txt    (~200 chars)
    ├── features.txt             (~300 chars)
    ├── hardware_specs.txt       (~300 chars)
    └── ...                      (one per section key)
```

Each guidance file contains: **Structure** | **Required inputs** | **Safe inferences** | **Prohibited inventions** | **Tone guidance**.

### Routing Map

The `section_context_map.py` module defines which shared context files are loaded for each section:

```python
from app.ai_suggestions.section_context_map import get_shared_context_files, get_section_guidance_file

# Get shared context files for a section
files = get_shared_context_files("hardware_specs")
# Returns: ["domain_context.txt", "architecture_context.txt"]

# Get section guidance filename
guidance = get_section_guidance_file("hardware_specs")
# Returns: "hardware_specs.txt"
```

#### Default Routing Summary

| Section Group | Sections | Shared Context Files Loaded |
|---|---|---|
| Narrative | executive_summary, introduction, process_flow, overview | domain_context |
| Offerings | features, remote_support, documentation_control, customer_training | domain_context + implementation_context |
| Technical | system_config, fat_condition, tech_stack, hardware_specs, software_specs, third_party_sw | domain_context + architecture_context |
| Schedule | overall_gantt, shutdown_gantt | domain_context + gantt_context |
| Scope | supervisors, scope_definitions, division_of_eng | domain_context + implementation_context |
| Completion | work_completion, value_addition | domain_context + implementation_context |
| Obligations | buyer_obligations, exclusion_list, buyer_prerequisites | domain_context + implementation_context |
| Legal | binding_conditions, cybersecurity, disclaimer | cybersecurity_context |
| PoC | poc | domain_context + implementation_context |

### Legacy Fallback

If no layered context files exist in a TS type folder, the system automatically falls back to loading the legacy `context.txt` file (if present). This ensures zero breaking changes for TS types that haven't been migrated.

```
Layered files found? → Load layered files
No layered files found? → Load context.txt (legacy fallback, logged as INFO)
No files at all? → Empty context (suggestions still work, less specialized)
```

### Context Routing Override

TS types can customize their routing via a `context_routing_override.json` file (see [Context Routing Override Configuration](#context-routing-override-configuration) section above for full details).

### Migration Process

To migrate a TS type from monolithic to layered:

1. Run migration script:
   ```powershell
   python backend/scripts/migrate_context_to_layered.py `
       --input "ts_context_files/{ts_type}/{name}_context.txt" `
       --output "ts_documents/{ts_type}" `
       --dry-run
   ```
2. Review split output and run live:
   ```powershell
   python backend/scripts/migrate_context_to_layered.py `
       --input "ts_context_files/{ts_type}/{name}_context.txt" `
       --output "ts_documents/{ts_type}" `
       --force
   ```
3. Generate section guidance files:
   ```powershell
   python backend/scripts/generate_section_guidance.py `
       --ts-type "{ts_type}" `
       --ts-documents-dir ts_documents `
       --output-dir "ts_documents/{ts_type}/section_guidance" `
       --reference-ts-type "Data Analysis/Data Centralization/UGS"
   ```
4. Review and refine generated guidance files (remove `[DRAFT]` markers)
5. Run validation tests

See `docs/MIGRATION_GUIDE.md` for the complete step-by-step migration guide.

### Templates

Context file templates are available at `ts_documents/templates/`:

- `domain_context.txt.template`
- `architecture_context.txt.template`
- `implementation_context.txt.template`
- `cybersecurity_context.txt.template`
- `gantt_context.txt.template`
- `section_guidance.txt.template`

### API Response Fields

The AI suggestions API response includes layered context metadata:

| Field | Type | Description |
|---|---|---|
| `loaded_shared_contexts` | `List[str]` | Names of shared context files that were loaded |
| `section_guidance_available` | `bool` | Whether a section guidance file was found and loaded |
| `context_txt_used` | `bool` | `True` if legacy `context.txt` fallback was used |

---

## Module Dependencies

```python
import json
import html
import re
from typing import Dict, Any, Optional, List

from app.ai_suggestions.section_schemas import (
    get_section_schema,
    get_section_family,
    get_output_format_instruction,
    is_suppressed,
    SECTION_SCHEMAS
)
from app.ai_suggestions.retrieval import CategoryContext, HistoricalDoc
```

## Error Handling

- **ValueError**: Raised when attempting to build prompt for suppressed sections
- **AttributeError**: Raised if project object missing required fields
- Sanitization functions handle None/empty inputs gracefully

## Performance Considerations

- All string operations are optimized for readability, not performance
- Typical prompt generation: < 10ms
- Truncation is fail-safe (guarantees stay within limits)
- No database or file I/O in prompt building (all context pre-loaded)

## Maintenance

When adding new sections:
1. Update `section_schemas.py` with new section definition
2. Assign content family (A/B/C/D/E)
3. Specify field names and descriptions
4. No changes needed in builders.py (automatic integration)

When modifying PROJECT_CONTEXT.md:
1. Update the embedded constant in builders.py
2. Run tests to verify embedding is valid
3. Check prompt output with demo script

---

**Last Updated:** 2026-06-23  
**Requirements Version:** AI Suggestions Feature PRD v2.0 + Layered Context Architecture  
**Test Coverage:** 35/35 tests passing (100%)

