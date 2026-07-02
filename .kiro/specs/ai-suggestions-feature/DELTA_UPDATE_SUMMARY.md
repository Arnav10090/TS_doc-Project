# TRAE AUDIT2 Delta Update Summary
## AI Suggestions Feature Design Document

**Date:** 2026-06-11  
**Type:** Delta Update (NOT full regeneration)  
**Scope:** Sections affected by final PRD revisions

---

## Critical Changes Required

### 1. **Draft Content Support (NEW — Priority 3 in Knowledge Hierarchy)**

**Impact:** All request/response flows, API contracts, sequence diagrams, prompt builders

#### Changes:

**A. Update Knowledge Hierarchy Section**
- OLD: 6 layers (metadata → saved → context.txt → historical → product → LLM)
- NEW: 7 layers (metadata → saved → **draft_content** → context.txt → historical → product → LLM)

**B. Update API Contract:**
```json
POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}
{
  "project_id": "uuid",
  "section_key": "string",
  "draft_content": {  // NEW PARAMETER
    // Current unsaved editor state
    // Exact structure matches section schema
  }
}
```

**C. Update Service Signature:**
```python
async def generate_suggestion(
    project_id: UUID,
    section_key: str,
    draft_content: Optional[dict],  // NEW PARAMETER
    db: AsyncSession
) -> SuggestionResponse
```

**D. Update Prompt Builder Logic:**

```python
def build_section_prompt(
    section_key: str,
    project: Project,
    all_sections: Dict[str, Any],
    draft_content: Optional[dict],  // NEW PARAMETER
    category_context: CategoryContext,
    project_context_md: str
) -> str:
    # Prompt order (NEW):
    # 1. Project metadata
    # 2. Section identity
    # 3. Existing saved content (if available)
    # 4. Current draft content (if available) ← NEW BLOCK
    # 5. Category context.txt
    # 6. Historical docs
    # 7. Output instruction
```

**E. Update All Sequence Diagrams:**
- Add "User edits section" step before button click
- Show `draft_content` in API request
- Show `draft_content` passed to `build_section_prompt()`

---

### 2. **Legacy Project ts_type NULL Handling**

**Impact:** Button behavior, API validation, error messages

#### Changes:

**A. Frontend Button State:**
```typescript
// In AISuggestionsButton component
const isLegacyProject = project.ts_type === null;

<Button
  disabled={isLegacyProject || isLoading}
  title={isLegacyProject ? "Select TS Type first..." : ""}
>
  ✨ AI Suggestions
</Button>
```


**B. Backend Validation:**
```python
async def generate_suggestion(...):
    project = await db.get(Project, project_id)
    
    if project.ts_type is None:  // NEW CHECK
        raise HTTPException(
            status_code=400,
            detail="This project has no TS type assigned. Update the project to select a TS type before using AI Suggestions."
        )
    # Continue with suggestion generation...
```

**C. Update Error Handling Section:**
Add new error scenario:
| Error | Status | Message |
|-------|--------|---------|
| ts_type is NULL | 400 | "This project has no TS type assigned..." |

---

### 3. **Custom Section Nested Subsection Architecture**

**Impact:** Custom section prompt logic, import behavior

#### Changes:

**A. Clarify Storage Architecture:**
```
Custom section storage (single JSONB record):
{
  "title": "Custom Section Title",
  "subsections": [
    {
      "key": "custom_subsection_1234567890_abc123",
      "name": "Subsection 1",
      "contentType": "paragraph",
      "data": {
        "paragraphs": [{"html": "<p>content</p>"}]
      }
    },
    {
      "key": "custom_subsection_1234567891_def456",
      "name": "Subsection 2",
      "contentType": "table",
      "data": {
        "tables": [{
          "columns": ["Col1", "Col2"],
          "rows": [{"Col1": "val1", "Col2": "val2"}]
        }]
      }
    }
  ],
  "insertAfterKey": "features"
}
```

**Key Point:** AI suggestions target subsection `data` values ONLY. Never create/delete subsections.


**B. Update FR-6.6.0 (Add New Requirement):**
```markdown
**FR-6.6.0** Custom sections are persisted as a single JSONB section payload in `section_data` 
under the `custom_section_*` section key. Subsections are nested within that payload as a 
`subsections` array (per the `CustomSectionContent` schema in `customSections.ts`). AI 
suggestions target the content values of existing subsections within this nested structure. 
AI suggestions never create new subsection entities, delete existing subsection entities, 
or persist subsection data as standalone records separate from the parent custom section payload.
```

**C. Update Custom Section Pseudocode (Section 6.2):**
Add comment before subsection loop:
```python
# CRITICAL: AI only modifies subsection.data values
# Never add/remove subsections from the array
# Never change subsection.contentType
for idx, subsection in enumerate(subsections):
    # Generate suggestion for existing subsection data only
```

---

### 4. **ai_prompts Coexistence Boundaries**

**Impact:** Architecture overview, scope documentation

#### Changes:

**A. Add Coexistence Section to Architecture:**
```markdown
### Coexistence with Existing ai_prompts Module

The repository contains a separate `ai_prompts` subsystem at `backend/app/ai_prompts/` that 
generates prompts for external diagram tools (Eraser, Claude, Mermaid Live). This new 
`ai_suggestions` feature is a distinct, additive module.

**Separation Boundaries:**
- NO shared routes
- NO shared data models
- NO shared service logic  
- NO modifications to ai_prompts/ directory
- Both modules registered independently under /api/v1

**Use Case Distinction:**
- `ai_prompts`: Generates text prompts for external tools (user copies prompt)
- `ai_suggestions`: Generates actual content via Gemini API (user imports result)
```


**B. Update Non-Goals Section:**
```markdown
**NG10 (EXPANDED)** This feature does not replace or duplicate the existing AI prompt-generation 
endpoints (`ai_prompts`) already present in the repository. It is a separate, additive feature 
scoped to per-section content authoring. Both can coexist. 

**Phase 1 coexistence boundaries (enforced in all phases):** 
- The `ai_prompts` routes are untouched
- The `ai_prompts` data model is untouched
- The `ai_prompts` UX is untouched
- No changes to `ai_prompts/router.py`, `ai_prompts/builders.py`, or any related files
- The new AI Suggestions module must be fully additive and must not reference, depend on, 
  or modify any component of the `ai_prompts` module
```

---

### 5. **Draw.io Architecture Clarification**

**Impact:** Scope documentation, endpoint specs

#### Changes:

**A. Update Mode D Description:**
```markdown
**Mode D — Gantt/Schedule Description (text) + draw.io trigger**

Used for: `overall_gantt`, `shutdown_gantt` ONLY.

**IMPORTANT:** `system_config` is NOT in scope for chart generation. It receives text 
suggestions only (Mode E — Image-Backed Section Description).

**Architecture:** Gemini → structured JSON (GanttTask[]) → backend gantt_converter.py → 
draw.io mxGraph XML → user imports to draw.io → PNG export → existing image upload.
```

**B. Update FR-6.5.1:**
```markdown
**FR-6.5.1** The draw.io chart generation endpoint is available for Gantt and schedule 
sections only: `overall_gantt` and `shutdown_gantt`. Requests for any other section key 
must return `400`. **`system_config` is not in scope for chart generation**; it receives 
a text description suggestion only (Mode E).
```


---

### 6. **Section Mode Mapping Alignment**

**Impact:** Mode assignment documentation

#### Changes:

**A. Add Repository Alignment Note to Mode Definitions:**
```markdown
> **CRITICAL:** The repository-defined schema mapping in `predefinedSectionContent.ts` and 
> `builders.py` is the source of truth for section-to-mode assignments. This document defines 
> mode BEHAVIOR (how Mode A/B/C/D/E/F work), not section ASSIGNMENTS (which sections belong 
> to which mode).
>
> Mode assignments must be derived from the actual repository schema by inspecting:
> 1. `frontend/src/components/sections/predefinedSectionContent.ts` (field structure)
> 2. `backend/app/ai_suggestions/builders.py` (authoritative mapping layer)
>
> Do NOT assign sections to modes based on names or assumptions in this document.
```

**B. Update Mode B Description:**
```markdown
**Mode B — Table Rows (JSON)**

Used for: sections whose content is a list of structured rows stored as a JSON array.

**CRITICAL:** The mode assignment for each section must be derived from the actual repository 
schema mapping implemented in `builders.py`. The repository schema mapping is the source of 
truth; the PRD defines how Mode B works, not which sections belong to it.

The exact sections and their row field schemas must be read from the repository's frontend 
section content definitions (`predefinedSectionContent.ts`) and encoded as constants in 
`builders.py`. If a section's schema cannot be confirmed from the repository, do not assign 
it to Mode B — use Mode A fallback instead.
```

Similar updates for Modes C, D, E, F.

---

### 7. **Custom Section Key Format**

**Impact:** Examples, validation patterns

#### Changes:

**A. Update All Custom Section Key Examples:**
```
OLD: custom_section_{uuid}
NEW: custom_section_{timestamp}_{uuid}

Example: custom_section_1704067200000_a1b2c3d4e5f6
```


**B. Update Validation Pattern:**
```python
CUSTOM_SECTION_PATTERN = r"^custom_section_\d{13}_[a-f0-9]{12}$"
```

---

## Sections Requiring Updates

### **Section 2.2:** Complete Section Family Mapping Table
- ADD note: "Repository taxonomy is source of truth for all section keys"
- VERIFY all 31 section keys match `predefinedSectionContent.ts`

### **Section 3.1:** Gap Analysis Table
- ADD row: Draft content support requirement

### **Section 4:** High-Level Architecture
- ADD subsection: "Coexistence with ai_prompts Module"

### **Section 5.3:** Backend Router Endpoints
- UPDATE `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}` request body to include `draft_content` parameter

### **Section 6.1:** Section-Aware Prompt Output Specifications
- UPDATE all mode descriptions with repository alignment note
- CLARIFY Mode D scope (overall_gantt, shutdown_gantt ONLY)
- CLARIFY Mode E includes system_config

### **Section 6.2:** Custom Section Prompt Logic
- UPDATE pseudocode to show nested subsection architecture
- ADD FR-6.6.0 at beginning

### **Section 6.3:** Gemini API Call Implementation
- UPDATE call_gemini signature to accept draft_content parameter (passed through from service)

### **Section 7.1:** Text Suggestion Flow (Sequence Diagram)
- UPDATE to show:
  1. User edits section (unsaved)
  2. draft_content in request
  3. draft_content passed to prompt builder


### **Section 8:** Database Schema Changes
- ADD migration note: ts_type is nullable for backward compatibility
- ADD validation: new projects require ts_type, legacy projects with NULL ts_type rejected by AI endpoint

### **Section 9:** Implementation Phases
- UPDATE Phase 1 deliverables to include draft_content parameter support
- UPDATE Phase 1 acceptance criteria to include draft content in prompts

### **Section 10.1:** Architectural Decisions Table
- ADD row: "Draft content parameter" decision

### **Section 10.4:** Error Handling Strategy Table
- ADD row: "Project ts_type is NULL" → 400

### **Appendix B:** API Contract Reference
- UPDATE all request examples to include optional draft_content parameter

---

## Files Requiring Direct Edits

### Primary: `design.md`
1. Version header (add v1.1 with change log)
2. Key Design Principle #3 (add draft content)
3. Section 2.2 table (add repository note)
4. Section 4 architecture (add coexistence subsection)
5. Section 5.3 API contracts (add draft_content param)
6. Section 6.1 mode descriptions (add repository alignment notes)
7. Section 6.2 custom section logic (update architecture)
8. Section 7.1 sequence diagram (add draft content flow)
9. Section 8 schema changes (add ts_type NULL behavior)
10. Section 10 critical decisions (add draft content + ts_type NULL)
11. Appendix B API reference (add draft_content to examples)

### Secondary: None
- This is a delta update to design.md only
- Requirements.md is the final PRD (already correct)

---

## Verification Checklist

After applying delta updates, verify:

- [ ] All sequence diagrams show draft_content parameter
- [ ] All API request examples include draft_content (optional)
- [ ] Knowledge hierarchy lists 7 layers (not 6)
- [ ] Custom section architecture mentions nested subsections
- [ ] ts_type NULL validation documented in error handling
- [ ] ai_prompts coexistence boundaries explicitly stated
- [ ] Draw.io scope limited to overall_gantt and shutdown_gantt
- [ ] All mode descriptions reference repository as source of truth
- [ ] Custom section key format uses timestamp_uuid pattern
- [ ] No section keys used that don't exist in predefinedSectionContent.ts

---

## Implementation Priority

1. **CRITICAL (Blocks development):**
   - draft_content parameter in API contract
   - ts_type NULL validation

2. **HIGH (Affects correctness):**
   - Knowledge hierarchy layer count
   - Custom section nested architecture
   - Repository alignment notes

3. **MEDIUM (Documentation clarity):**
   - ai_prompts coexistence
   - Draw.io scope clarification
   - Custom section key format

---

**END OF DELTA UPDATE SUMMARY**
