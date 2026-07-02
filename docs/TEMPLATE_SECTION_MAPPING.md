# Template Section Mapping Documentation

## Overview

This document provides the complete mapping between the **ORIGINAL TS Template** section headings (from `TS_Template_original.docx`) and the **repository section keys** used throughout the codebase (backend API, frontend components, database). This mapping is critical for understanding how the AI Suggestions feature routes context files and generates content that aligns with the established template structure.

## Purpose

The AI Suggestions feature uses repository section keys internally for routing, storage, and API communication. However, these keys were derived from and must align with the canonical section headings in the ORIGINAL TS template document. This mapping ensures:

1. **Traceability**: Developers can trace template sections to code
2. **Validation**: Automated tests can verify all template sections are covered
3. **Context Routing**: The layered context system correctly maps sections to relevant knowledge
4. **Documentation**: Business users and developers share a common reference

## Machine-Readable Mapping

The authoritative mapping data structure is defined below in JSON format for programmatic validation:

```json
{
  "template_to_repository": {
    "Cover Page": "cover",
    "Revision History": "revision_history",
    "Executive Summary": "executive_summary",
    "General Overview": null,
    "Introduction": "introduction",
    "Abbreviations Used": "abbreviations",
    "Process Flow": "process_flow",
    "Overview of {{SolutionName}}": "overview",
    "Design Scope of Work (Offerings - Features)": "features",
    "Remote Support": "remote_support",
    "Documentation Control": "documentation_control",
    "Customer Training": "customer_training",
    "System Configuration (for Reference)": "system_config",
    "FAT Condition": "fat_condition",
    "Technology Stack": "tech_stack",
    "Hardware Specifications": "hardware_specs",
    "Software Specifications": "software_specs",
    "Third Party Software": "third_party_sw",
    "Schedule - Overall Gantt": "overall_gantt",
    "Schedule - Shutdown Gantt": "shutdown_gantt",
    "Supervisors": "supervisors",
    "Scope of Supply Definitions": "scope_definitions",
    "Division of Engineering, Software Development, & Erection/Commissioning Services": "division_of_eng",
    "Value Addition": "value_addition",
    "Work Completion Certificate": "work_completion",
    "Buyer Obligations": "buyer_obligations",
    "Exclusion List": "exclusion_list",
    "Buyer Prerequisites": "buyer_prerequisites",
    "Binding Conditions": "binding_conditions",
    "Cybersecurity Disclaimer": "cybersecurity",
    "Disclaimer (Software Licenses, Changes, Confidentiality, Limitation of Liability)": "disclaimer",
    "Complimentary Proof of Concepts (PoC)": "poc"
  }
}
```

## Complete Section-by-Section Mapping

### 1. Cover Page
- **Template Heading**: Cover Page
- **Repository Key**: `cover`
- **Display Title**: Cover Page
- **AI Button**: **SUPPRESSED** (No AI suggestions available)
- **Rationale**: Metadata fields only; no AI generation needed
- **Context Routing**: N/A (suppressed)

---

### 2. Revision History
- **Template Heading**: Revision History
- **Repository Key**: `revision_history`
- **Display Title**: Revision History
- **AI Button**: **SUPPRESSED** (No AI suggestions available)
- **Rationale**: Tabular revision log; manually maintained
- **Context Routing**: N/A (suppressed)

---

### 3. Executive Summary
- **Template Heading**: Executive Summary
- **Repository Key**: `executive_summary`
- **Display Title**: Executive Summary
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `architecture_context.txt`
- **Rationale**: Business context and high-level architecture for strategic framing
- **Section Guidance**: `section_guidance/executive_summary.txt`

---

### 4. General Overview
- **Template Heading**: General Overview
- **Repository Key**: `null` (No direct repository section)
- **Content Distribution**: Content distributed across `executive_summary`, `introduction`, and `overview`
- **AI Button**: N/A (no dedicated section)
- **Rationale**: The "General Overview" is a conceptual grouping in the template that encompasses multiple repository sections
- **Context Routing**: N/A

---

### 5. Introduction
- **Template Heading**: Introduction
- **Repository Key**: `introduction`
- **Display Title**: Introduction
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `architecture_context.txt`
- **Rationale**: Business context, client industry, problem space, solution approach
- **Section Guidance**: `section_guidance/introduction.txt`

---

### 6. Abbreviations Used
- **Template Heading**: Abbreviations Used
- **Repository Key**: `abbreviations`
- **Display Title**: Abbreviations
- **AI Button**: **SUPPRESSED** (No AI suggestions available)
- **Rationale**: Abbreviation table; project-specific entries manually added
- **Context Routing**: N/A (suppressed)
- **Note**: Template name includes "Used" but repository key is simply `abbreviations`

---

### 7. Process Flow
- **Template Heading**: Process Flow
- **Repository Key**: `process_flow`
- **Display Title**: Process Flow
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `architecture_context.txt`
- **Rationale**: Business process understanding, workflow context, data flow architecture
- **Section Guidance**: `section_guidance/process_flow.txt`

---

### 8. Overview of {{SolutionName}}
- **Template Heading**: Overview of {{SolutionName}}
- **Repository Key**: `overview`
- **Display Title**: Overview
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `architecture_context.txt`
- **Rationale**: System capabilities, business drivers, use cases, architecture patterns
- **Section Guidance**: `section_guidance/overview.txt`
- **Note**: Template includes placeholder variable; repository key is simplified

---

### 9. Design Scope of Work (Offerings - Features)
- **Template Heading**: Design Scope of Work (Offerings - Features)
- **Repository Key**: `features`
- **Display Title**: Features
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `implementation_context.txt`
- **Rationale**: Feature descriptions, business value, delivery approach
- **Section Guidance**: `section_guidance/features.txt`
- **Note**: Long template name simplified to `features` in repository

---

### 10. Remote Support
- **Template Heading**: Remote Support
- **Repository Key**: `remote_support`
- **Display Title**: Remote Support
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `implementation_context.txt`
- **Rationale**: Support capabilities, service model, support process
- **Section Guidance**: `section_guidance/remote_support.txt`

---

### 11. Documentation Control
- **Template Heading**: Documentation Control
- **Repository Key**: `documentation_control`
- **Display Title**: Documentation Control
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `implementation_context.txt`
- **Rationale**: Documentation capabilities, deliverables, delivery process
- **Section Guidance**: `section_guidance/documentation_control.txt`

---

### 12. Customer Training
- **Template Heading**: Customer Training
- **Repository Key**: `customer_training`
- **Display Title**: Customer Training
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `implementation_context.txt`
- **Rationale**: Training capabilities, curriculum, delivery, on-site requirements
- **Section Guidance**: `section_guidance/customer_training.txt`

---

### 13. System Configuration (for Reference)
- **Template Heading**: System Configuration (for Reference)
- **Repository Key**: `system_config`
- **Display Title**: System Configuration
- **AI Button**: ✓ Available
- **Context Routing**: `architecture_context.txt`, `implementation_context.txt`
- **Rationale**: Architecture options, configuration patterns, configuration process
- **Section Guidance**: `section_guidance/system_config.txt`
- **Note**: Template includes "(for Reference)" caveat; repository key is simplified

---

### 14. FAT Condition
- **Template Heading**: FAT Condition
- **Repository Key**: `fat_condition`
- **Display Title**: FAT Condition
- **AI Button**: ✓ Available
- **Context Routing**: `architecture_context.txt`, `implementation_context.txt`
- **Rationale**: Testing architecture, validation approach, FAT process
- **Section Guidance**: `section_guidance/fat_condition.txt`

---

### 15. Technology Stack
- **Template Heading**: Technology Stack
- **Repository Key**: `tech_stack`
- **Display Title**: Technology Stack
- **AI Button**: ✓ Available
- **Context Routing**: `architecture_context.txt`, `implementation_context.txt`
- **Rationale**: Technology choices, stack rationale, version policies
- **Section Guidance**: `section_guidance/tech_stack.txt`
- **Note**: Parent section for hardware_specs, software_specs, third_party_sw

---

### 16. Hardware Specifications
- **Template Heading**: Hardware Specifications (implicit under Technology Stack)
- **Repository Key**: `hardware_specs`
- **Display Title**: Hardware Specifications
- **AI Button**: ✓ Available
- **Context Routing**: `architecture_context.txt`, `implementation_context.txt`
- **Rationale**: Hardware architecture, sizing methodology, hardware delivery
- **Section Guidance**: `section_guidance/hardware_specs.txt`

---

### 17. Software Specifications
- **Template Heading**: Software Specifications (implicit under Technology Stack)
- **Repository Key**: `software_specs`
- **Display Title**: Software Specifications
- **AI Button**: ✓ Available
- **Context Routing**: `architecture_context.txt`, `implementation_context.txt`
- **Rationale**: Software architecture, component selection, license management
- **Section Guidance**: `section_guidance/software_specs.txt`

---

### 18. Third Party Software
- **Template Heading**: Third Party Software (implicit under Technology Stack)
- **Repository Key**: `third_party_sw`
- **Display Title**: Third Party Software
- **AI Button**: ✓ Available
- **Context Routing**: `architecture_context.txt`, `implementation_context.txt`
- **Rationale**: Third-party integration patterns, software management
- **Section Guidance**: `section_guidance/third_party_sw.txt`

---

### 19. Schedule - Overall Gantt
- **Template Heading**: Schedule - Overall Gantt
- **Repository Key**: `overall_gantt`
- **Display Title**: Overall Gantt Chart
- **AI Button**: ✓ Available (includes "Generate Draw.io Chart" button)
- **Context Routing**: `gantt_context.txt`, `implementation_context.txt`
- **Rationale**: Scheduling guidance, phase structure, milestones, implementation phases
- **Section Guidance**: `section_guidance/overall_gantt.txt`

---

### 20. Schedule - Shutdown Gantt
- **Template Heading**: Schedule - Shutdown Gantt
- **Repository Key**: `shutdown_gantt`
- **Display Title**: Shutdown Gantt Chart
- **AI Button**: ✓ Available (includes "Generate Draw.io Chart" button)
- **Context Routing**: `gantt_context.txt`, `implementation_context.txt`
- **Rationale**: Shutdown-specific scheduling guidance, implementation approach
- **Section Guidance**: `section_guidance/shutdown_gantt.txt`

---

### 21. Supervisors
- **Template Heading**: Supervisors (implicit under Division of Services)
- **Repository Key**: `supervisors`
- **Display Title**: Supervisors
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`, `domain_context.txt`
- **Rationale**: Supervision approach, man-day allocation, project roles
- **Section Guidance**: `section_guidance/supervisors.txt`

---

### 22. Scope of Supply Definitions
- **Template Heading**: Scope of Supply Definitions
- **Repository Key**: `scope_definitions`
- **Display Title**: Scope Definitions
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`, `domain_context.txt`
- **Rationale**: Scope terminology, responsibility definitions, business scope
- **Section Guidance**: `section_guidance/scope_definitions.txt`

---

### 23. Division of Engineering, Software Development, & Erection/Commissioning Services
- **Template Heading**: Division of Engineering, Software Development, & Erection/Commissioning Services
- **Repository Key**: `division_of_eng`
- **Display Title**: Division of Engineering
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`, `domain_context.txt`
- **Rationale**: Responsibility matrix, engineering division, service delivery model
- **Section Guidance**: `section_guidance/division_of_eng.txt`
- **Note**: Very long template name simplified to `division_of_eng`

---

### 24. Value Addition
- **Template Heading**: Value Addition
- **Repository Key**: `value_addition`
- **Display Title**: Value Addition
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`, `domain_context.txt`
- **Rationale**: Value-added offering structure, PoC approach, business value
- **Section Guidance**: `section_guidance/value_addition.txt`

---

### 25. Work Completion Certificate
- **Template Heading**: Work Completion Certificate
- **Repository Key**: `work_completion`
- **Display Title**: Work Completion
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`, `domain_context.txt`
- **Rationale**: Completion criteria, acceptance process, deliverable definitions
- **Section Guidance**: `section_guidance/work_completion.txt`

---

### 26. Buyer Obligations
- **Template Heading**: Buyer Obligations
- **Repository Key**: `buyer_obligations`
- **Display Title**: Buyer Obligations
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`
- **Rationale**: Buyer responsibilities, project prerequisites
- **Section Guidance**: `section_guidance/buyer_obligations.txt`

---

### 27. Exclusion List
- **Template Heading**: Exclusion List
- **Repository Key**: `exclusion_list`
- **Display Title**: Exclusion List
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`
- **Rationale**: Scope exclusions, boundary definitions
- **Section Guidance**: `section_guidance/exclusion_list.txt`

---

### 28. Buyer Prerequisites
- **Template Heading**: Buyer Prerequisites
- **Repository Key**: `buyer_prerequisites`
- **Display Title**: Buyer Prerequisites
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`
- **Rationale**: Buyer-supplied prerequisites, dependencies
- **Section Guidance**: `section_guidance/buyer_prerequisites.txt`

---

### 29. Binding Conditions
- **Template Heading**: Binding Conditions
- **Repository Key**: `binding_conditions`
- **Display Title**: Binding Conditions
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`, `cybersecurity_context.txt`
- **Rationale**: Contractual constraints, binding terms, security-related legal terms
- **Section Guidance**: `section_guidance/binding_conditions.txt`

---

### 30. Cybersecurity Disclaimer
- **Template Heading**: Cybersecurity Disclaimer
- **Repository Key**: `cybersecurity`
- **Display Title**: Cybersecurity
- **AI Button**: ✓ Available
- **Context Routing**: `cybersecurity_context.txt`, `implementation_context.txt`
- **Rationale**: Security policies, compliance requirements, security implementation
- **Section Guidance**: `section_guidance/cybersecurity.txt`
- **Note**: Template name includes "Disclaimer"; repository key is simplified

---

### 31. Disclaimer (Software Licenses, Changes, Confidentiality, Limitation of Liability)
- **Template Heading**: Disclaimer (Software Licenses, Changes, Confidentiality, Limitation of Liability)
- **Repository Key**: `disclaimer`
- **Display Title**: Disclaimer
- **AI Button**: ✓ Available
- **Context Routing**: `implementation_context.txt`, `cybersecurity_context.txt`
- **Rationale**: Legal disclaimers, liability limitations, security disclaimers
- **Section Guidance**: `section_guidance/disclaimer.txt`
- **Note**: Template lists subsections in parentheses; repository key is simplified

---

### 32. Complimentary Proof of Concepts (PoC)
- **Template Heading**: Complimentary Proof of Concepts (PoC)
- **Repository Key**: `poc`
- **Display Title**: Proof of Concept
- **AI Button**: ✓ Available
- **Context Routing**: `domain_context.txt`, `architecture_context.txt`
- **Rationale**: PoC capabilities, value proposition, technical approach
- **Section Guidance**: `section_guidance/poc.txt`

---

## Summary Statistics

- **Total Template Sections**: 33 (including "General Overview" conceptual grouping)
- **Total Repository Sections**: 32 (1 conceptual section has no direct key)
- **AI-Eligible Sections**: 29 (3 suppressed: cover, revision_history, abbreviations)
- **Suppressed Sections**: 3 (cover, revision_history, abbreviations)
- **Sections with Name Variations**: 6
  - "Abbreviations Used" → `abbreviations`
  - "Overview of {{SolutionName}}" → `overview`
  - "Design Scope of Work (Offerings - Features)" → `features`
  - "System Configuration (for Reference)" → `system_config`
  - "Division of Engineering, Software Development, & Erection/Commissioning Services" → `division_of_eng`
  - "Cybersecurity Disclaimer" → `cybersecurity`

## Design Decisions and Rationale

### 1. Why Shorten Template Names?

Repository section keys use snake_case identifiers that are concise and developer-friendly:
- **API Paths**: `/api/v1/projects/{project_id}/sections/{section_key}`
- **Database Keys**: JSONB keys in `section_data.content`
- **Frontend Component Names**: `ExecutiveSummary.tsx`, `FeaturesList.tsx`
- **Consistency**: All keys follow `lowercase_with_underscores` pattern

Long template names like "Division of Engineering, Software Development, & Erection/Commissioning Services" become unwieldy in code. The shortened `division_of_eng` maintains semantic clarity while improving code readability.

### 2. Why No Direct Key for "General Overview"?

The "General Overview" in the template is a conceptual grouping that spans multiple sections:
- **Executive Summary**: Strategic overview and business context
- **Introduction**: Formal introduction and project context
- **Overview**: Detailed system overview and capabilities

Creating a separate repository section would duplicate content. Instead, content is distributed logically across the three sections that correspond to actual document subsections.

### 3. Why Suppress cover, revision_history, abbreviations?

Per requirements (Requirement 1 in `requirements.md`):
- **cover**: Metadata fields only (project name, client, date); no narrative AI generation needed
- **revision_history**: Manual revision log table; inappropriate for AI generation
- **abbreviations**: Standard abbreviation table; AI cannot reliably generate project-specific abbreviations without domain expertise

### 4. Context Routing Design Rationale

Each section is mapped to 1-3 context files based on content analysis:
- **Narrative sections** need domain + architecture context (what/why/how)
- **Technical sections** need architecture + implementation context (how/when)
- **Legal sections** need implementation + cybersecurity context (constraints/compliance)
- **Schedule sections** need specialized gantt_context + implementation context

This strategic routing reduces token usage by 30-50% compared to loading all context for every section.

### 5. Section Guidance Files

Section-specific guidance files (e.g., `section_guidance/features.txt`) provide:
- **Tone and Style**: Formal vs. technical vs. legal language
- **Structure**: Paragraph patterns, list formats, table schemas
- **Content Focus**: What to emphasize, what to avoid
- **Template Compliance**: Specific template requirements for that section

Guidance files are optional and only loaded when available.

## Validation and Testing

### Automated Validation

The mapping can be validated programmatically using the JSON structure above:

```python
# Test that all repository keys exist in section_context_map.py
from app.ai_suggestions.section_context_map import DEFAULT_SECTION_CONTEXT_MAP

template_mapping = {
    "Executive Summary": "executive_summary",
    "Introduction": "introduction",
    # ... (all mappings)
}

for template_name, repo_key in template_mapping.items():
    if repo_key is None:
        continue  # Skip conceptual sections
    if repo_key in ["cover", "revision_history", "abbreviations"]:
        continue  # Skip suppressed sections
    assert repo_key in DEFAULT_SECTION_CONTEXT_MAP, f"Missing routing for {repo_key}"
```

### Manual Validation Checklist

- [ ] All ORIGINAL TS template sections documented
- [ ] All repository section keys documented
- [ ] Name variations explicitly noted
- [ ] Suppressed sections clearly marked
- [ ] Context routing rationale provided
- [ ] Section guidance file paths documented
- [ ] JSON structure matches Python implementation

## References

- **Source of Truth**: `frontend/src/components/sections/predefinedSectionContent.ts`
- **Context Routing**: `backend/app/ai_suggestions/section_context_map.py`
- **Requirements**: `AI_Suggestions_Feature_Requirements.md` (Requirement 1, 3, 4)
- **Design**: `.kiro/specs/ai-suggestions-feature/design.md` (Section 2.2)
- **Template**: `TS_Template_original.docx` (canonical structure)

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-12 | Initial comprehensive mapping documentation (Task 21.4) |

---

**Document Maintenance**: This document should be updated whenever:
1. New sections are added to the TS template
2. Repository section keys are renamed
3. Context routing mappings change
4. Section suppression rules change

**Owned by**: AI Suggestions Feature Team  
**Review Cycle**: Quarterly or on template changes
