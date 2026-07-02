# Template Section Mapping - Quick Reference

A condensed lookup table for developers. For full documentation, see [TEMPLATE_SECTION_MAPPING.md](./TEMPLATE_SECTION_MAPPING.md).

## Quick Lookup Table

| Repository Key | Template Heading | AI Button | Context Files |
|---------------|------------------|-----------|---------------|
| `cover` | Cover Page | ❌ Suppressed | N/A |
| `revision_history` | Revision History | ❌ Suppressed | N/A |
| `executive_summary` | Executive Summary | ✅ | domain, architecture |
| `introduction` | Introduction | ✅ | domain, architecture |
| `abbreviations` | Abbreviations Used | ❌ Suppressed | N/A |
| `process_flow` | Process Flow | ✅ | domain, architecture |
| `overview` | Overview of {{SolutionName}} | ✅ | domain, architecture |
| `features` | Design Scope of Work (Offerings - Features) | ✅ | domain, implementation |
| `remote_support` | Remote Support | ✅ | domain, implementation |
| `documentation_control` | Documentation Control | ✅ | domain, implementation |
| `customer_training` | Customer Training | ✅ | domain, implementation |
| `system_config` | System Configuration (for Reference) | ✅ | architecture, implementation |
| `fat_condition` | FAT Condition | ✅ | architecture, implementation |
| `tech_stack` | Technology Stack | ✅ | architecture, implementation |
| `hardware_specs` | Hardware Specifications | ✅ | architecture, implementation |
| `software_specs` | Software Specifications | ✅ | architecture, implementation |
| `third_party_sw` | Third Party Software | ✅ | architecture, implementation |
| `overall_gantt` | Schedule - Overall Gantt | ✅ + 📊 Draw.io | gantt, implementation |
| `shutdown_gantt` | Schedule - Shutdown Gantt | ✅ + 📊 Draw.io | gantt, implementation |
| `supervisors` | Supervisors | ✅ | implementation, domain |
| `scope_definitions` | Scope of Supply Definitions | ✅ | implementation, domain |
| `division_of_eng` | Division of Engineering, Software Development, & Erection/Commissioning Services | ✅ | implementation, domain |
| `value_addition` | Value Addition | ✅ | implementation, domain |
| `work_completion` | Work Completion Certificate | ✅ | implementation, domain |
| `buyer_obligations` | Buyer Obligations | ✅ | implementation |
| `exclusion_list` | Exclusion List | ✅ | implementation |
| `buyer_prerequisites` | Buyer Prerequisites | ✅ | implementation |
| `binding_conditions` | Binding Conditions | ✅ | implementation, cybersecurity |
| `cybersecurity` | Cybersecurity Disclaimer | ✅ | cybersecurity, implementation |
| `disclaimer` | Disclaimer (Software Licenses, Changes, Confidentiality, Limitation of Liability) | ✅ | implementation, cybersecurity |
| `poc` | Complimentary Proof of Concepts (PoC) | ✅ | domain, architecture |

## Common Name Variations

| When You See... | Repository Key | Notes |
|----------------|----------------|-------|
| "Abbreviations Used" | `abbreviations` | Template adds "Used" |
| "Overview of {{SolutionName}}" | `overview` | Template has variable placeholder |
| "Design Scope of Work..." | `features` | Template name is much longer |
| "System Configuration (for Reference)" | `system_config` | Template adds caveat |
| "Division of Engineering..." | `division_of_eng` | Template is very long (65+ chars) |
| "Cybersecurity Disclaimer" | `cybersecurity` | Template adds "Disclaimer" |

## Context File Abbreviations

| Short Name | Full Filename | Purpose |
|------------|---------------|---------|
| domain | `domain_context.txt` | Business domain knowledge, capabilities, use cases |
| architecture | `architecture_context.txt` | Technical architecture, technology stack, system design |
| implementation | `implementation_context.txt` | Implementation phases, project execution, obligations |
| cybersecurity | `cybersecurity_context.txt` | Security policies, compliance, responsibility matrix |
| gantt | `gantt_context.txt` | Scheduling, timelines, milestones, phases |

## Usage Examples

### Getting Template Heading from Repository Key

```python
from app.ai_suggestions.template_section_mapping import get_template_heading

heading = get_template_heading("features")
# Returns: "Design Scope of Work (Offerings - Features)"
```

### Getting Repository Key from Template Heading

```python
from app.ai_suggestions.template_section_mapping import get_repository_key

key = get_repository_key("Executive Summary")
# Returns: "executive_summary"
```

### Checking If Section Is Suppressed

```python
from app.ai_suggestions.template_section_mapping import is_suppressed_section

if is_suppressed_section("cover"):
    print("No AI button for this section")
# Prints: "No AI button for this section"
```

### Getting Context Files for a Section

```python
from app.ai_suggestions.section_context_map import get_shared_context_files

files = get_shared_context_files("executive_summary")
# Returns: ["domain_context.txt", "architecture_context.txt"]
```

### Validating All Sections Have Routing

```python
from app.ai_suggestions.template_section_mapping import validate_routing_coverage

validate_routing_coverage()  # Raises AssertionError if any section missing
```

## Quick Stats

- **Total Repository Sections**: 31 (plus 1 conceptual section)
- **AI-Eligible Sections**: 28
- **Suppressed Sections**: 3 (cover, revision_history, abbreviations)
- **Sections with Name Variations**: 6

## Related Files

- **Full Documentation**: [docs/TEMPLATE_SECTION_MAPPING.md](./TEMPLATE_SECTION_MAPPING.md)
- **JSON Mapping**: [docs/template_section_mapping.json](./template_section_mapping.json)
- **Python Module**: `backend/app/ai_suggestions/template_section_mapping.py`
- **Context Routing**: `backend/app/ai_suggestions/section_context_map.py`
- **Frontend Definitions**: `frontend/src/components/sections/predefinedSectionContent.ts`

## When to Update

Update this mapping when:
- ✏️ New sections added to TS template
- 🔄 Repository section keys renamed
- 🎯 Context routing rules change
- 🚫 Section suppression rules change

---

**Last Updated**: 2026-06-12 (Task 21.4)
