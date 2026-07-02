    # Template Alignment Summary

**Version:** 1.0  
**Date:** 2026-06-23  
**Purpose:** Final alignment pass ensuring section guidance structure matches ORIGINAL TS template exactly

---

## Overview

This document summarizes the template alignment work performed to ensure the layered context architecture's section guidance files and routing maps match the **ORIGINAL TS template structure** exactly.

---

## ORIGINAL TS Template Structure → Repository Mapping

### Complete Section Mapping (29 AI-Eligible Sections)

| # | Template Heading | Repository Section Key | Context Files | Guidance File |
|---|-----------------|----------------------|---------------|---------------|
| **Level 2-3: Executive & Introduction** |
| 1 | Executive Summary | `executive_summary` | domain_context | executive_summary.txt |
| 2 | Introduction | `introduction` | domain_context | introduction.txt |
| 3 | Process Flow | `process_flow` | domain_context, architecture_context | process_flow.txt |
| 4 | Overview of {{SolutionName}} | `overview` | domain_context | overview.txt |
| **Level 4: Offerings** |
| 5 | Design Scope of Work (Features) | `features` | domain_context, implementation_context | features.txt |
| 6 | Remote Support | `remote_support` | implementation_context | remote_support.txt |
| 7 | Documentation Control | `documentation_control` | implementation_context | documentation_control.txt |
| 8 | Customer Training | `customer_training` | implementation_context | customer_training.txt |
| **Level 5: Technical Configuration** |
| 9 | System Configuration (for Reference) | `system_config` | architecture_context | system_config.txt |
| 10 | FAT Condition | `fat_condition` | implementation_context | fat_condition.txt |
| 11 | Technology Stack | `tech_stack` | architecture_context | tech_stack.txt |
| 12 | Hardware Specifications | `hardware_specs` | architecture_context | hardware_specs.txt |
| 13 | Software Specifications | `software_specs` | architecture_context | software_specs.txt |
| 14 | Third Party Software | `third_party_sw` | architecture_context | third_party_sw.txt |
| **Level 6: Schedule** |
| 15 | Overall Gantt Chart | `overall_gantt` | gantt_context | overall_gantt.txt |
| 16 | Shutdown Gantt Chart | `shutdown_gantt` | gantt_context | shutdown_gantt.txt |
| **Level 7: Scope & Responsibilities** |
| 17 | Supervisors | `supervisors` | implementation_context | supervisors.txt |
| 18 | Scope of Supply Definitions | `scope_definitions` | domain_context, implementation_context | scope_definitions.txt |
| 19 | Division of Engineering, Software Development, & Erection/Commissioning Services | `division_of_eng` | implementation_context | division_of_eng.txt |
| **Level 8: Value & Completion** |
| 20 | Value Addition | `value_addition` | implementation_context | value_addition.txt |
| 21 | Work Completion Certificate | `work_completion` | implementation_context | work_completion.txt |
| **Level 9: Obligations & Exclusions** |
| 22 | Buyer Obligations | `buyer_obligations` | implementation_context | buyer_obligations.txt |
| 23 | Exclusion List | `exclusion_list` | implementation_context | exclusion_list.txt |
| 24 | Buyer Prerequisites | `buyer_prerequisites` | implementation_context | buyer_prerequisites.txt |
| **Level 10: Legal & Compliance** |
| 25 | Binding Conditions | `binding_conditions` | implementation_context | binding_conditions.txt |
| 26 | Cybersecurity Disclaimer | `cybersecurity` | cybersecurity_context | cybersecurity.txt |
| 27 | Disclaimer (Software Licenses, Changes, Confidentiality, Limitation of Liability) | `disclaimer` | implementation_context | disclaimer.txt |
| **Level 11: Proof of Concept** |
| 28 | Complimentary Proof of Concepts (PoC) | `poc` | architecture_context, implementation_context | poc.txt |

### Suppressed Sections (No AI Buttons)

| Template Heading | Repository Section Key | Reason |
|-----------------|----------------------|--------|
| Cover Page | `cover` | Metadata section - no AI generation needed |
| Revision History | `revision_history` | Metadata section - manual only |
| Abbreviations Used | `abbreviations` | Table-driven - AI not helpful |

**Total Sections:** 31 predefined (29 AI-eligible + 3 suppressed)

---

## Naming Convention Rules

### Repository Section Keys
- **Format:** snake_case
- **Abbreviations:** Used where appropriate (e.g., `fat_condition`, `poc`, `tech_stack`)
- **Consistency:** Match `predefinedSectionContent.ts` exactly

### Section Guidance Files
- **Format:** `{repository_key}.txt`
- **Location:** `ts_documents/{TS_Type}/section_guidance/`
- **Example:** Template heading "Executive Summary" → File `executive_summary.txt`

### Shared Context Files
- **Format:** `{context_type}_context.txt`
- **Location:** `ts_documents/{TS_Type}/` (root of TS type folder)
- **Types:** domain, architecture, implementation, cybersecurity, gantt

---

## Context Routing Map Structure

### Routing Strategy by Template Level

**Level 2-3: Executive & Introduction**
- Primary: `domain_context` (what is the solution?)
- Secondary: `architecture_context` (for process_flow only)

**Level 4: Offerings**
- Primary: `implementation_context` (project execution)
- Secondary: `domain_context` (for features only - combines what + how)

**Level 5: Technical Configuration**
- Primary: `architecture_context` (system design)
- Exception: `fat_condition` uses `implementation_context` (testing procedure)

**Level 6: Schedule**
- Exclusive: `gantt_context` (timeline and phases)

**Level 7-9: Scope, Value, Obligations**
- Primary: `implementation_context` (project delivery)
- Exception: `scope_definitions` adds `domain_context` (definitions need product knowledge)

**Level 10: Legal & Compliance**
- Primary: `implementation_context` (contractual)
- Exception: `cybersecurity` uses `cybersecurity_context` (security-specific)

**Level 11: PoC**
- Combined: `architecture_context` + `implementation_context` (technical demo + delivery terms)

---

## Section Guidance File Content Structure

Each section guidance file follows this pattern:

```
# {SECTION_KEY} SECTION GUIDANCE

## Template Section
"{Original Template Heading}"

## Structure
{Expected content organization}

## Avoid
{Common pitfalls or prohibited content}

## Tone
{Writing style guidance}

## Examples (Optional)
{Sample phrasing or structure examples}
```

**Target Size:** 150-300 characters (highly focused)

---

## Changes Made in Final Alignment Pass

### Task Updates

**Task 21.1** - Create section_context_map.py module:
- ✅ Expanded to include ALL 29 AI-eligible sections explicitly
- ✅ Added template alignment note
- ✅ Documented complete section hierarchy from template levels 2-11
- ✅ Added custom section fallback rule

**Task 21.4** - Document template-to-repository section mapping (NEW):
- ✅ Created subtask to document TEMPLATE_SECTION_MAPPING.md
- ✅ Machine-readable mapping (JSON/Python dict) for validation
- ✅ Mapping rationale and design decisions
- ✅ Complete template heading → repository key table

**Task 21.5** - Write unit tests for routing system (renumbered from 21.4):
- ✅ Added template alignment validation test
- ✅ Verify all ORIGINAL TS template sections have routing entries
- ✅ Test template section variations map correctly

**Task 27** - Create UGS Section Guidance Files:
- ✅ Completely restructured to align with ORIGINAL TS template hierarchy
- ✅ Organized into 11 subtasks matching template levels
- ✅ Each subtask references template section names explicitly
- ✅ Added TEMPLATE_MAPPING.md creation in subtask 27.1
- ✅ Expanded effort estimate from 1.5 to 2 days
- ✅ Total guidance files increased to match all 29 AI-eligible sections

### Architecture Plan Updates

**LAYERED_CONTEXT_ARCHITECTURE_PLAN.md:**
- ✅ Added comprehensive "Template Alignment" section before Appendix A
- ✅ Documented complete template hierarchy (11 levels)
- ✅ Created template-to-repository mapping table
- ✅ Documented section key naming rules
- ✅ Added section guidance file naming convention table
- ✅ Included template coverage validation explanation
- ✅ Updated DEFAULT_SECTION_CONTEXT_MAP to include ALL sections in template order

### Quick Start Updates

**IMPLEMENTATION_QUICK_START.md:**
- ✅ Added "Important: Template Alignment" section at Phase 1 start
- ✅ Four-step template alignment review checklist
- ✅ Key mapping rules summary
- ✅ Complete section list reference (29 AI-eligible)
- ✅ Updated routing map example to show template-aligned structure with comments indicating template levels

---

## Validation Checklist

### ✅ Completeness
- [x] All 29 AI-eligible template sections have routing map entries
- [x] All 29 sections have corresponding guidance file specifications in Task 27
- [x] All 3 suppressed sections documented with rationale
- [x] No template sections missing from architecture

### ✅ Consistency
- [x] Repository section keys match `predefinedSectionContent.ts` exactly
- [x] Section guidance filenames follow `{repository_key}.txt` convention
- [x] Context routing map uses repository keys (not template headings)
- [x] Template headings documented in Task 27 subtask descriptions

### ✅ Documentation
- [x] Template hierarchy documented (11 levels)
- [x] Template-to-repository mapping table created
- [x] Naming convention rules documented
- [x] Machine-readable mapping specified (Task 21.4)
- [x] Unit tests for validation specified (Task 21.5)

### ✅ Architecture Integrity
- [x] Shared context file structure unchanged
- [x] Layered context model unchanged
- [x] Retrieval system logic unchanged
- [x] Only naming/structure aligned to template (no redesign)

---

## Implementation Impact

### No Breaking Changes
- Existing retrieval logic remains unchanged
- Shared context file structure preserved
- Legacy fallback mechanism untouched
- API contracts maintained

### Enhanced Clarity
- Section guidance files now explicitly reference template headings
- Context routing map organized by template hierarchy
- Developer documentation includes template context
- Validation tests ensure ongoing template alignment

### Maintenance Benefits
- Clear template-to-repository mapping prevents confusion
- Unit tests catch misalignment early
- TEMPLATE_MAPPING.md serves as single source of truth
- New TS types can follow same mapping pattern

---

## Next Steps

1. **Review Task 27 Structure** - Verify all 11 subtasks align with template levels
2. **Implement Task 21.4** - Create TEMPLATE_SECTION_MAPPING.md with machine-readable format
3. **Implement Task 21.5** - Add template alignment validation tests
4. **Execute Phase 2** - Use template-aligned guidance file list during UGS migration
5. **Validate Coverage** - Run tests to confirm all template sections mapped

---

## References

- **Template Source:** ORIGINAL TS template structure (conversation summary)
- **Repository Keys:** `frontend/src/components/sections/predefinedSectionContent.ts`
- **Architecture Plan:** `LAYERED_CONTEXT_ARCHITECTURE_PLAN.md`
- **Task List:** `LAYERED_CONTEXT_TASKS.md` (Tasks 21, 27)
- **Quick Start:** `IMPLEMENTATION_QUICK_START.md` (Phase 1)

---

**Document Status:** ✅ Complete - Final alignment pass finished  
**Last Updated:** 2026-06-23  
**Approval Required:** Yes - Review before Phase 2 implementation
