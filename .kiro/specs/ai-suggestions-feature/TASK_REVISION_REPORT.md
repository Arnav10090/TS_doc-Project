# Task Revision Report: AI Suggestions Feature

**Date:** 2026-06-15  
**Revision Scope:** Alignment with FINAL Requirements.md and Design.md v2.0  
**Document Version:** 1.0

---

## Executive Summary

This report documents all corrections applied to `tasks.md` to align with the authoritative Requirements.md and Design.md v2.0 specifications. The revision focused on removing legacy PRD assumptions, correcting API contracts, updating field names, and ensuring repository-driven schema mapping.

**Total Changes Applied:** 10 corrections + 1 new task  
**Files Modified:** `tasks.md` only (patch-based update)  
**Validation Status:** All corrections verified against PRD Requirements 1-20 and Design v2.0

---

## Correction Summary

### 1. Removed Legacy Family D Implementation Details ✓

**Issue:** Task 11.5 contained hardcoded logic for `custom_items` append behavior that was not present in the final Requirements.

**Original:**
```
- If `custom_items` exists, append items
- Otherwise replace `items` array
```

**Corrected:**
```
- Merge imported items with existing draft according to repository-defined schema behavior
```

**Rationale:** Requirements 9.4 states generic merge behavior without specifying implementation details. The repository schema is the source of truth for list-based sections.

**Requirements Coverage:** 9.4

---

### 2. Updated Draw.io Response Schema ✓

**Issue:** Task 14.4 included `gantt_json` in DrawioResponse, which is not in the final API contract.

**Original:**
```
Return `DrawioResponse` with `gantt_json`, `drawio_xml`, `chart_instructions`
```

**Corrected:**
```
Return `DrawioResponse` with `drawio_xml` and `chart_instructions`
```

**Rationale:** Requirements 19.13-19.14 specify only `drawio_xml` and `chart_instructions` in the DrawioResponse schema. The `gantt_json` field was from a superseded PRD version.

**Requirements Coverage:** 11.2, 11.7, 19.12-19.14

---

### 3. Updated CategoryContext Field Names ✓

**Issue:** Task 3.1 used legacy field names (`context_txt`, `historical_documents`, `folder_path`) that don't match the final design.

**Original:**
```
Return `CategoryContext` with `context_txt`, `historical_documents`, `folder_path`
```

**Corrected:**
```
Return `CategoryContext` with `context_text`, `documents`, `historical_context_available`
```

**Rationale:** Design v2.0 Section 5.5 (Retrieval Module) specifies the canonical CategoryContext schema uses `context_text` and `documents` fields. The `folder_path` field was removed as it's internal-only.

**Requirements Coverage:** 6.1, 6.2, 6.3, 6.9, 14.2

---

### 4. Clarified Section Schema Mapping Source of Truth ✓

**Issue:** Task 4.1 language suggested `SECTION_SCHEMAS` was authoritative rather than derived from repository.

**Original:**
```
- Derive `SECTION_SCHEMAS` dict from `frontend/src/components/sections/predefinedSectionContent.ts`
- Map all 31 predefined sections to content families (A/B/C/D/E)
- Mark as generated artifact (not for hand-editing)
```

**Corrected:**
```
- Generate `SECTION_SCHEMAS` dict from `frontend/src/components/sections/predefinedSectionContent.ts`
- Map predefined sections to content families (A/B/C/D/E) based on repository schema
- Include field names and descriptions for each section from repository definitions
- Repository schema is source of truth; this file is a generated mapping
```

**Rationale:** Design v2.0 Section 2.1 emphasizes repository definitions are the sole source of truth. The backend mapping must be regenerated when repository schemas change.

**Requirements Coverage:** 7.1-7.10

---

### 5. Removed Hardcoded TS Type Count ✓

**Issue:** Tasks 1.2 and 19.1 referenced "10 TS type categories" which hardcodes business logic.

**Original (Task 1.2):**
```
Include all 10 TS type categories (Data Analysis, Level 2, OT Cybersecurity, OT Upgrades, Yard Management)
```

**Corrected:**
```
Include TS type categories as defined by business requirements
```

**Original (Task 19.1):**
```
Create all 10 TS type category folders
```

**Corrected:**
```
Create TS type category folders as defined by business requirements
```

**Rationale:** The number and names of TS types are business configuration, not implementation constants. The TSType enum should be the single source of truth.

**Requirements Coverage:** 2.7, 14.1, 6.1, 15.5

---

### 6. Removed "Ask the user if questions arise" from Checkpoints ✓

**Issue:** Tasks 7, 12, and 20 (checkpoint tasks) included user interaction prompts inappropriate for implementation tasks.

**Corrected in:**
- Task 7 (Backend Core Complete)
- Task 12 (Frontend Import Complete)
- Task 20 (Final Integration)

**Rationale:** Implementation tasks should be self-contained and executable without agent-user interaction. Checkpoints are validation gates, not support requests.

**Requirements Coverage:** N/A (process improvement)

---

### 7. Added Dedicated Legacy Project Handling Task ✓

**Issue:** Legacy project behavior (NULL ts_type) was scattered across multiple tasks without dedicated implementation focus.

**New Task Added:** 16.4 - Implement legacy project handling

**Task Content:**
```
- [ ] 16.4 Implement legacy project handling
  - Validate NULL ts_type projects return 400 from backend
  - Disable AI Suggestions button in frontend when ts_type is NULL
  - Display tooltip: "Select a TS type for this project to enable AI suggestions"
  - Write acceptance tests for legacy project behavior
  - _Requirements: 2.2, 3.4, 13.2, 16.6, 16.7, 20.6_
```

**Rationale:** Requirements 2.2, 3.4, 13.2, 16.6, and 16.7 explicitly specify NULL ts_type behavior. This deserves a dedicated task to ensure proper implementation and testing.

**Requirements Coverage:** 2.2, 3.4, 13.2, 16.6, 16.7, 20.6

**Dependency Graph Update:** Added task 16.4 to Wave 14 (parallel with other validation tasks)

---

### 8. Added PROJECT_CONTEXT.md Build-Time Embedding Validation ✓

**Issue:** Task 4.2 mentioned embedding PROJECT_CONTEXT.md but didn't specify failure behavior.

**Original:**
```
- Embed PROJECT_CONTEXT.md content at build time (not runtime filesystem read)
```

**Corrected:**
```
- Embed PROJECT_CONTEXT.md content at build time (not runtime filesystem read)
- Validate build fails if PROJECT_CONTEXT.md embedding fails
```

**Rationale:** Requirements 18.3 states: "IF embedding PROJECT_CONTEXT.md fails during build time, THE system SHALL fail completely without filesystem fallback." This is a critical safety requirement.

**Requirements Coverage:** 18.1-18.6

---

### 9. Enhanced Prompt Hierarchy Testing Requirements ✓

**Issue:** Task 5.4 (unit tests for prompt builders) didn't explicitly validate the 7-layer hierarchy order.

**Original:**
```
- Test knowledge hierarchy priority order
```

**Corrected:**
```
- Test knowledge hierarchy priority order (7 layers: metadata → saved → draft → context.txt → historical → PROJECT_CONTEXT → LLM)
- Test build failure when PROJECT_CONTEXT.md embedding fails
```

**Rationale:** Requirements 5.1 and 18.4-18.6 specify the exact 7-layer hierarchy order. Tests must verify this order is respected and that PROJECT_CONTEXT appears at layer 6.

**Requirements Coverage:** 5.1-5.8, 18.1-18.6, 20.2

---

### 10. Updated All PRD References to Match Final Requirements ✓

**Issue:** Task descriptions contained references to superseded PRD sections and outdated requirement numbering.

**Correction Applied:** Comprehensive audit of all requirement references in task descriptions.

**Examples:**
- Task 14.4: Updated requirement references to include 19.12-19.14 (DrawioResponse schema)
- Task 16.4: Added comprehensive requirement coverage (2.2, 3.4, 13.2, 16.6, 16.7, 20.6)
- Task 5.4: Added 18.1-18.6 (PROJECT_CONTEXT embedding requirements)

**Rationale:** All requirement references must point to the FINAL Requirements.md document to ensure traceability during implementation.

**Requirements Coverage:** All requirements (1-20) validated

---

## Validation Checklist

### ✓ Corrections Applied

- [x] 1. Removed legacy Family D (list-based) hardcoded logic
- [x] 2. Updated Draw.io response schema (removed gantt_json)
- [x] 3. Updated retrieval CategoryContext field names
- [x] 4. Clarified section schema mapping source of truth
- [x] 5. Removed hardcoded TS type count references
- [x] 6. Removed "Ask the user" from checkpoint tasks
- [x] 7. Added dedicated legacy project handling task (16.4)
- [x] 8. Added PROJECT_CONTEXT.md build failure validation
- [x] 9. Enhanced prompt hierarchy testing requirements
- [x] 10. Updated all PRD references to final requirements

### ✓ Requirements Coverage

All 20 requirements from Requirements.md are covered by at least one task:

- **Requirement 1** (AI Button Availability): Tasks 9.1, 9.2, 9.3
- **Requirement 2** (TS Type Selection): Tasks 1.1, 1.2, 1.3, 2.2, 8.1, 8.2
- **Requirement 3** (Predefined Sections): Tasks 5.1, 5.2, 5.3
- **Requirement 4** (Custom Sections): Tasks 6.1, 6.2, 6.3
- **Requirement 5** (Knowledge Hierarchy): Tasks 4.2, 5.4
- **Requirement 6** (Historical Retrieval): Tasks 3.1, 3.2, 3.3
- **Requirement 7** (Section-Aware Prompts): Tasks 4.1, 4.2
- **Requirement 8** (Suggestion Display): Tasks 10.1, 10.2, 10.3, 10.4
- **Requirement 9** (Import Semantics): Tasks 11.1-11.7
- **Requirement 10** (Save & Persistence): Tasks 13.1, 13.2, 13.3
- **Requirement 11** (Draw.io Gantt): Tasks 14.1-14.5
- **Requirement 12** (Gantt Converter): Tasks 14.3, 14.6
- **Requirement 13** (Error Handling): Tasks 15.1, 15.2, 15.3
- **Requirement 14** (Security): Tasks 16.1, 16.2, 16.3
- **Requirement 15** (Configuration): Tasks 1.4, 1.5
- **Requirement 16** (Backward Compatibility): Tasks 16.4, 18.4
- **Requirement 17** (Performance): Tasks 17.1, 17.2, 17.3, 17.4
- **Requirement 18** (PROJECT_CONTEXT Embedding): Tasks 4.2, 5.4
- **Requirement 19** (Response Schema): Tasks 5.1, 14.4
- **Requirement 20** (Testing): All test tasks (5.4, 5.5, 6.4, 11.8, 14.6, 14.7, 15.4, 16.3, 17.4, 18.1-18.4)

### ✓ Design v2.0 Alignment

All task descriptions match Design v2.0 specifications:

- **Section 2.1** (Repository Reality): Task 4.1 uses repository-driven schema mapping
- **Section 3** (Gap Analysis): All PRD contradictions resolved in tasks
- **Section 5.5** (Retrieval Module): Task 3.1 uses correct CategoryContext fields
- **Section 6.2** (API Endpoints): All tasks use project-scoped `/api/v1/projects/{project_id}/ai-suggestions/...`
- **Section 6.3** (Response Schemas): Tasks 5.1 and 14.4 match canonical schemas
- **Section 10** (Critical Decisions): Task 4.2 implements build-time embedding decision

---

## Implementation Impact

### Files Requiring Updates

Based on the task corrections, the following implementation files will need updates:

**Backend:**
- `backend/app/ai_suggestions/retrieval.py` — Update CategoryContext schema (Task 3.1)
- `backend/app/ai_suggestions/builders.py` — Add build-time PROJECT_CONTEXT.md embedding (Task 4.2)
- `backend/app/ai_suggestions/section_schemas.py` — Generate from repository definitions (Task 4.1)
- `backend/app/ai_suggestions/router.py` — Remove gantt_json from DrawioResponse (Task 14.4)
- `backend/app/projects/ts_types.py` — Use business-driven enum (Task 1.2)

**Frontend:**
- `frontend/src/utils/aiSuggestionImport.ts` — Update Family D import to use repository schema (Task 11.5)
- `frontend/src/components/shared/AISuggestionsButton.tsx` — Add NULL ts_type handling (Task 16.4)

**Testing:**
- All test files — Add explicit 7-layer hierarchy validation (Task 5.4)
- Integration tests — Add legacy project test cases (Task 16.4)

### Breaking Changes

**None.** All corrections are pre-implementation alignment updates. No existing code is affected.

---

## Sign-Off

**Task Revision Status:** COMPLETE  
**Requirements Validation:** PASSED (20/20 requirements covered)  
**Design Alignment:** PASSED (v2.0 specifications matched)  
**Ready for Implementation:** YES

The corrected `tasks.md` is now fully aligned with the authoritative Requirements.md and Design.md v2.0 documents. All tasks are actionable, traceable to requirements, and ready for execution.

---

**Prepared by:** Kiro AI Agent  
**Review Date:** 2026-06-15  
**Next Action:** Begin implementation starting with Wave 0 tasks (1.1, 1.2, 1.4, 1.5, 2.1)
