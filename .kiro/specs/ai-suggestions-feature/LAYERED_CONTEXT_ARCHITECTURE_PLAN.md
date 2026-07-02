# Layered Context Architecture - Implementation Plan
**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Architecture Design & Implementation Plan

## Executive Summary

This document specifies a major refactoring of the AI Suggestions context retrieval architecture. The current system loads a single `context.txt` file per TS type, which causes:

1. **Scalability issues** - Context files become very large (2000+ chars)
2. **Relevance issues** - Most content is irrelevant for the active section
3. **Token waste** - Loading unnecessary context consumes prompt budget
4. **Maintenance burden** - Updating one section's guidance requires editing massive files

### Solution: Layered Context Architecture

Replace the monolithic `context.txt` with a **structured, routable context system**:

```
TS-Type-Folder/
├── domain_context.txt           # Domain/product knowledge (what is UGS?)
├── architecture_context.txt     # System architecture, hardware, software
├── implementation_context.txt   # Project phases, obligations, prerequisites
├── cybersecurity_context.txt    # Security policies, compliance
├── gantt_context.txt            # Timeline, scheduling guidance
└── section_guidance/
    ├── executive_summary.txt
    ├── overview.txt
    ├── features.txt
    ├── hardware_specs.txt
    ├── software_specs.txt
    ├── system_config.txt
    ├── overall_gantt.txt
    ├── shutdown_gantt.txt
    ├── cybersecurity.txt
    └── ... (one file per section that benefits from specific guidance)
```

### Context Routing Engine

A `SectionContextMap` determines which context files to load for each section:

```python
{
    "executive_summary": ["domain_context"],
    "overview": ["domain_context"],
    "features": ["domain_context", "implementation_context"],
    "hardware_specs": ["architecture_context"],
    "software_specs": ["architecture_context"],
    "system_config": ["architecture_context"],
    "overall_gantt": ["gantt_context"],
    "shutdown_gantt": ["gantt_context"],
    "cybersecurity": ["cybersecurity_context"],
    "buyer_obligations": ["implementation_context"],
    # ... etc
}
```

**Key Principle:** Only load context relevant to the active section.

---

## Problem Analysis

### Current Architecture Limitations

**File:** `backend/app/ai_suggestions/retrieval.py`

```python
def load_category_context(ts_type: str, ts_documents_dir: str, max_docs: int = 5):
    # Loads single context.txt from TS type folder root
    context_txt_path = os.path.join(resolved, "context.txt")
    
    # This loads ALL domain knowledge regardless of section
    # Example: hardware_specs section loads gantt scheduling guidance
```

**File:** `backend/app/ai_suggestions/builders.py`

```python
# Layer 5: Category context.txt (truncate at 2000)
parts.append(_format_context_txt(category_context.context_txt))
# ^^ Loads entire context.txt even if section only needs architecture guidance
```

### Example: Current UGS Context Problem

The UGS `context.txt` contains:
- Domain knowledge (what is UGS?)
- Architecture details (hardware, software, protocols)
- Implementation phases (pre-engineering, FAT, commissioning)
- Cybersecurity policies
- Gantt/scheduling guidance
- Buyer obligations
- Specific section guidance

**Total:** ~4000+ characters

When generating content for **`hardware_specs`** section:
- **Needed:** architecture_context.txt, section_guidance/hardware_specs.txt
- **Loaded:** ALL 4000 chars (then truncated to 2000)
- **Result:** Irrelevant gantt/cybersecurity/buyer content consumes half the context budget

---

## Architecture Design

### 1. File Structure

Each TS type folder follows this structure:

```
ts_documents/
└── {TS_Type}/
    ├── context.txt  [LEGACY FALLBACK - kept for backward compatibility]
    ├── domain_context.txt
    ├── architecture_context.txt
    ├── implementation_context.txt
    ├── cybersecurity_context.txt
    ├── gantt_context.txt
    └── section_guidance/
        ├── executive_summary.txt
        ├── introduction.txt
        ├── overview.txt
        ├── features.txt
        ├── hardware_specs.txt
        ├── software_specs.txt
        ├── third_party_sw.txt
        ├── system_config.txt
        ├── overall_gantt.txt
        ├── shutdown_gantt.txt
        ├── cybersecurity.txt
        ├── buyer_obligations.txt
        ├── buyer_prerequisites.txt
        ├── exclusion_list.txt
        └── ... (any other sections needing specific guidance)
```

### 2. Context Types (Shared Context Files)

**domain_context.txt** - Domain/Product Knowledge
- What is this solution/system?
- Core capabilities
- Business drivers
- When to use vs alternatives
- Target users/environments
- Example: "UGS is industrial data integration middleware..."

**architecture_context.txt** - Architecture & Technical Design
- System architecture options
- Hardware specifications patterns
- Software stack patterns
- Technology choices
- Network topology
- Sizing/scaling guidance
- Example: "UGS Option A: direct polling. Option B: HX edge controllers..."

**implementation_context.txt** - Project Execution
- Implementation phases
- Milestones and gates
- Roles and responsibilities
- Buyer obligations
- Seller obligations
- Prerequisites
- Value addition scope
- Exclusions
- Example: "Phases: Initiation → Pre-Engineering (M1 gate)..."

**cybersecurity_context.txt** - Security & Compliance
- Security policies
- Compliance requirements
- Responsibility matrix (buyer vs seller)
- Secure defaults
- Security disclaimers
- Example: "Buyer owns all cybersecurity post-delivery..."

**gantt_context.txt** - Scheduling & Timeline
- Typical project duration
- Phase durations
- Critical path items
- Dependencies
- Resource allocation patterns
- Shutdown planning (if applicable)
- Example: "Critical path: M1 tag list delivery, M2 design approval..."

### 3. Section Guidance Files

**section_guidance/{section_key}.txt** - Section-Specific Instructions
- Content structure guidance for this specific section
- Common pitfalls to avoid
- Required elements
- Tone/style notes
- Examples or templates
- Example for `hardware_specs.txt`: "Structure: Server specs → Network specs → HX specs (if Option B)..."

### 4. Context Routing Map

**File:** `backend/app/ai_suggestions/section_context_map.py`

```python
"""
Section-to-Context routing configuration.

This map determines which shared context files are loaded for each section.
"""

from typing import Dict, List

DEFAULT_SECTION_CONTEXT_MAP: Dict[str, List[str]] = {
    # Narrative/overview sections - domain knowledge
    "executive_summary": ["domain_context"],
    "introduction": ["domain_context"],
    "process_flow": ["domain_context", "architecture_context"],
    "overview": ["domain_context"],
    
    # Feature sections - domain + implementation
    "features": ["domain_context", "implementation_context"],
    "remote_support": ["implementation_context"],
    "documentation_control": ["implementation_context"],
    "customer_training": ["implementation_context"],
    
    # Technical architecture sections
    "system_config": ["architecture_context"],
    "fat_condition": ["implementation_context"],
    "tech_stack": ["architecture_context"],
    "hardware_specs": ["architecture_context"],
    "software_specs": ["architecture_context"],
    "third_party_sw": ["architecture_context"],
    
    # Schedule/timeline sections
    "overall_gantt": ["gantt_context"],
    "shutdown_gantt": ["gantt_context"],
    
    # Organization/staffing sections
    "supervisors": ["implementation_context"],
    "division_of_eng": ["implementation_context"],
    
    # Scope sections
    "scope_definitions": ["domain_context", "implementation_context"],
    
    # Execution sections
    "work_completion": ["implementation_context"],
    "value_addition": ["implementation_context"],
    
    # Obligation sections
    "buyer_obligations": ["implementation_context"],
    "exclusion_list": ["implementation_context"],
    "buyer_prerequisites": ["implementation_context"],
    
    # Legal/compliance sections
    "binding_conditions": ["implementation_context"],
    "cybersecurity": ["cybersecurity_context"],
    "disclaimer": ["implementation_context"],
    
    # PoC section
    "poc": ["architecture_context", "implementation_context"],
}


def get_shared_context_files(section_key: str) -> List[str]:
    """
    Get the list of shared context files to load for a section.
    
    Args:
        section_key: Section identifier
        
    Returns:
        List of context file names (without .txt extension)
        Example: ["domain_context", "architecture_context"]
    """
    # Check default mapping
    if section_key in DEFAULT_SECTION_CONTEXT_MAP:
        return DEFAULT_SECTION_CONTEXT_MAP[section_key]
    
    # Custom sections get domain context by default
    if section_key.startswith("custom_section_"):
        return ["domain_context"]
    
    # Unknown sections get domain context as fallback
    return ["domain_context"]


def get_section_guidance_file(section_key: str) -> str:
    """
    Get the section guidance file name for a section.
    
    Args:
        section_key: Section identifier
        
    Returns:
        Section guidance filename (with .txt extension)
        Example: "hardware_specs.txt"
    """
    # Custom sections don't have specific guidance files
    if section_key.startswith("custom_section_"):
        return None
    
    return f"{section_key}.txt"


def has_section_guidance(section_key: str) -> bool:
    """Check if a section has dedicated guidance file."""
    if section_key.startswith("custom_section_"):
        return False
    return True
```

### 5. Retrieval Module Refactoring

**File:** `backend/app/ai_suggestions/retrieval.py` (major changes)

```python
class LayeredCategoryContext(BaseModel):
    """Layered context with separate shared and section-specific files."""
    
    # Shared context files (loaded based on section routing)
    domain_context: Optional[str] = None
    architecture_context: Optional[str] = None
    implementation_context: Optional[str] = None
    cybersecurity_context: Optional[str] = None
    gantt_context: Optional[str] = None
    
    # Section-specific guidance
    section_guidance: Optional[str] = None
    
    # Historical documents (unchanged)
    historical_documents: List[HistoricalDoc]
    
    # Metadata
    folder_path: str
    historical_context_available: bool
    loaded_shared_contexts: List[str]  # Which shared files were actually loaded
    section_guidance_available: bool
    
    # Legacy fallback
    legacy_context_txt: Optional[str] = None  # Only used if new files don't exist


def load_layered_context(
    ts_type: str,
    ts_documents_dir: str,
    section_key: str,
    max_docs: int = 5
) -> LayeredCategoryContext:
    """
    Load layered context for a specific section.
    
    This function implements the new layered context architecture:
    1. Determines which shared context files to load based on section_key
    2. Loads only the relevant shared context files
    3. Loads section-specific guidance file if available
    4. Falls back to legacy context.txt if new files don't exist
    
    Args:
        ts_type: TS type (e.g., "Data Analysis/Data Centralization/UGS")
        ts_documents_dir: Base directory for TS documents
        section_key: Section identifier (e.g., "hardware_specs")
        max_docs: Maximum historical documents to load
        
    Returns:
        LayeredCategoryContext with only relevant context loaded
    """
    # ... implementation details below
```

### 6. Prompt Builder Integration

**File:** `backend/app/ai_suggestions/builders.py`

```python
def _format_layered_context(
    context: LayeredCategoryContext,
    section_key: str
) -> str:
    """
    Format layered context into prompt sections.
    
    Only includes context files that were actually loaded for this section.
    """
    parts = []
    
    if context.domain_context:
        parts.append(f"### Domain Context\n{context.domain_context}\n")
    
    if context.architecture_context:
        parts.append(f"### Architecture Context\n{context.architecture_context}\n")
    
    if context.implementation_context:
        parts.append(f"### Implementation Context\n{context.implementation_context}\n")
    
    if context.cybersecurity_context:
        parts.append(f"### Cybersecurity Context\n{context.cybersecurity_context}\n")
    
    if context.gantt_context:
        parts.append(f"### Gantt Context\n{context.gantt_context}\n")
    
    if context.section_guidance:
        parts.append(f"### Section-Specific Guidance\n{context.section_guidance}\n")
    
    if not parts:
        # Legacy fallback
        if context.legacy_context_txt:
            parts.append(f"### Legacy Context\n{context.legacy_context_txt}\n")
        else:
            parts.append("(No context available)\n")
    
    header = f"## 5. Category Context (layered - loaded for {section_key})\n"
    loaded_files = ", ".join(context.loaded_shared_contexts)
    if context.section_guidance_available:
        loaded_files += f", section_guidance/{section_key}.txt"
    
    metadata = f"Loaded context files: {loaded_files}\n\n"
    
    return header + metadata + "".join(parts)
```

---

## Implementation Tasks

### Phase 1: Core Infrastructure (No Behavior Changes)

**Task 1.1: Create Section Context Map Module**
- Create `backend/app/ai_suggestions/section_context_map.py`
- Define `DEFAULT_SECTION_CONTEXT_MAP`
- Implement `get_shared_context_files(section_key)`
- Implement `get_section_guidance_file(section_key)`
- Write unit tests for routing logic

**Task 1.2: Create LayeredCategoryContext Schema**
- Update `backend/app/ai_suggestions/retrieval.py`
- Define `LayeredCategoryContext` Pydantic model
- Keep old `CategoryContext` for backward compatibility
- Add type aliases for migration

**Task 1.3: Implement load_layered_context Function**
- Create `load_layered_context()` in `retrieval.py`
- Implement safe path resolution (prevent traversal)
- Load shared context files based on routing map
- Load section guidance file if exists
- Fall back to legacy context.txt if new files missing
- Implement caching with invalidation
- Write comprehensive unit tests

**Task 1.4: Update Prompt Builder for Layered Context**
- Update `builders.py` to accept `LayeredCategoryContext`
- Implement `_format_layered_context()`
- Maintain backward compatibility with old `CategoryContext`
- Update prompt assembly to use new format
- Test that prompt structure is correct

**Task 1.5: Update Service Layer**
- Update `service.py` to call `load_layered_context`
- Pass `section_key` to retrieval function
- Handle both old and new context types during migration
- Update error handling for new context loading

### Phase 2: UGS Context Migration (Pilot Implementation)

**Task 2.1: Split UGS context.txt**
- Read `ts_context_files/Data Analysis/Data Centralization/UGS/UGS_context.txt`
- Create `domain_context.txt` - extract domain knowledge sections
- Create `architecture_context.txt` - extract architecture/technical sections
- Create `implementation_context.txt` - extract phases/obligations/value-addition
- Create `cybersecurity_context.txt` - extract security policies
- Create `gantt_context.txt` - extract scheduling/timeline guidance
- Keep original `context.txt` as legacy fallback

**Task 2.2: Create UGS Section Guidance Files**
- Create `ts_documents/Data Analysis/Data Centralization/UGS/section_guidance/` directory
- Create guidance files for key sections:
  - `executive_summary.txt`
  - `overview.txt`
  - `features.txt`
  - `hardware_specs.txt`
  - `software_specs.txt`
  - `system_config.txt`
  - `overall_gantt.txt`
  - `shutdown_gantt.txt`
  - `cybersecurity.txt`
  - `buyer_obligations.txt`
  - `buyer_prerequisites.txt`
  - `exclusion_list.txt`

**Task 2.3: Validate UGS Migration**
- Run AI suggestions for multiple UGS sections
- Compare token usage before/after migration
- Verify context relevance improvements
- Ensure no regressions in output quality
- Document token savings per section

### Phase 3: Testing & Validation

**Task 3.1: Write Layered Context Unit Tests**
- Test `load_layered_context()` with valid section keys
- Test routing map correctness for all predefined sections
- Test legacy fallback when new files missing
- Test path traversal prevention
- Test file reading errors (missing, unreadable)
- Test cache invalidation on file changes

**Task 3.2: Write Integration Tests**
- Test end-to-end suggestion generation with layered context
- Test that `hardware_specs` doesn't load `gantt_context`
- Test that `overall_gantt` doesn't load `cybersecurity_context`
- Test that `executive_summary` loads `domain_context`
- Test that `system_config` loads `architecture_context`
- Test legacy projects still work with old context.txt

**Task 3.3: Write Performance Tests**
- Measure prompt token reduction per section type
- Measure retrieval performance (should be faster with smaller files)
- Measure cache hit rates
- Compare before/after prompt assembly times

**Task 3.4: Manual QA Testing**
- Test all 31 predefined sections with UGS
- Verify output quality maintained or improved
- Verify no irrelevant context in prompts
- Test custom sections still work
- Test regenerate functionality

### Phase 4: Migration Guide & Tools

**Task 4.1: Create Context Migration Script**
- Create `scripts/migrate_context_to_layered.py`
- Read monolithic context.txt
- AI-assisted splitting into layered files
- Validate split completeness (no content lost)
- Dry-run mode for testing
- Backup original files

**Task 4.2: Create Context File Templates**
- Create template for each shared context file
- Document structure and guidelines
- Provide examples for each context type
- Create section guidance template
- Document best practices

**Task 4.3: Write Migration Documentation**
- Document the layered context architecture
- Explain routing map configuration
- Provide migration guide for other TS types
- Document troubleshooting steps
- Create FAQ for common issues

### Phase 5: Rollout to Other TS Types

**Task 5.1: Migrate Level 2**
- Apply migration script to Level 2 context.txt
- Create section guidance files
- Validate output quality
- Document lessons learned

**Task 5.2: Migrate OT Cybersecurity**
- Apply migration script
- Create section guidance files
- Special attention to cybersecurity sections
- Validate output quality

**Task 5.3: Migrate OT Upgrades (HMI, L2, POC)**
- Apply migration script to each subfolder
- Create section guidance files
- Validate output quality

**Task 5.4: Migrate Yard Management (HSM, Plate Mill)**
- Apply migration script
- Create section guidance files
- Validate output quality

**Task 5.5: Migrate Data Analysis (Advanced Analysis, Data Monitoring)**
- Apply migration script
- Create section guidance files
- Validate output quality

### Phase 6: Cleanup & Optimization

**Task 6.1: Remove Legacy Code Paths**
- Remove old `CategoryContext` type
- Remove `load_category_context()` function
- Update all callers to use `load_layered_context()`
- Remove compatibility shims

**Task 6.2: Optimize Routing Map**
- Review routing map based on usage data
- Adjust context assignments for optimal relevance
- Add JSON override support for custom mappings
- Document override mechanism

**Task 6.3: Performance Optimization**
- Implement multi-file caching strategy
- Optimize file reading (parallel loads?)
- Monitor cache hit rates in production
- Fine-tune cache invalidation logic

**Task 6.4: Documentation Updates**
- Update design.md with layered architecture
- Update requirements.md if needed
- Update API documentation
- Update deployment guide
- Create TS type maintainer guide

---

## Success Metrics

### Token Efficiency

**Before (Monolithic context.txt):**
- `hardware_specs` prompt: loads 2000 chars of context (truncated from 4000+)
- Relevant content: ~40% (architecture guidance)
- Wasted tokens: ~60% (gantt, cybersecurity, obligations, etc.)

**After (Layered Context):**
- `hardware_specs` prompt: loads ~800 chars
  - `architecture_context.txt`: ~600 chars
  - `section_guidance/hardware_specs.txt`: ~200 chars
- Relevant content: ~95%
- Wasted tokens: ~5%

**Target Metrics:**
- 50%+ reduction in context token usage for technical sections
- 30%+ reduction overall across all sections
- 90%+ context relevance score (manual review)
- Zero regressions in output quality

### Scalability

- New TS types can add layered context without creating massive monolithic files
- Section-specific guidance can be updated independently
- Shared context files can be versioned and maintained separately
- Easy to add new context types (e.g., `compliance_context.txt`) without refactoring

### Maintainability

- Each context file is focused and manageable size (<1000 chars typically)
- Section guidance files are small and specific (<300 chars)
- Clear separation of concerns (domain vs architecture vs implementation)
- Easy to identify which file to update for specific improvements

---

## Backward Compatibility Strategy

### Legacy Fallback Path

```python
def load_layered_context(...) -> LayeredCategoryContext:
    # Try to load new layered structure
    new_files_exist = check_for_layered_files(folder)
    
    if not new_files_exist:
        # Fall back to legacy context.txt
        logger.info(f"Using legacy context.txt fallback for {ts_type}")
        legacy_content = load_legacy_context_txt(folder)
        return LayeredCategoryContext(
            legacy_context_txt=legacy_content,
            # ... other fields empty
        )
    
    # Load new layered structure
    # ...
```

### Migration Window

- All TS types continue working with old context.txt during migration
- No breaking changes to API
- No changes to existing prompts (except improved relevance)
- Gradual rollout: UGS → Level 2 → others
- Can roll back by removing new files (falls back to legacy automatically)

### Version Detection

```python
def get_context_architecture_version(folder: str) -> str:
    """Detect which context architecture is in use."""
    if has_section_guidance_folder(folder):
        return "v2_layered"
    if has_context_txt(folder):
        return "v1_monolithic"
    return "v0_none"
```

---

## Risk Analysis

### Risk 1: Context Split Errors
**Description:** Splitting monolithic context.txt might lose information or misclassify content  
**Mitigation:**
- AI-assisted splitting with human review
- Diff validation (all content accounted for)
- Quality comparison testing
- Rollback capability (keep original)

### Risk 2: Prompt Quality Regression
**Description:** Removing "irrelevant" context might accidentally remove useful signals  
**Mitigation:**
- Pilot with UGS first
- Extensive A/B testing
- Manual quality reviews
- Gradual rollout with metrics

### Risk 3: Routing Map Errors
**Description:** Wrong context files loaded for a section (e.g., loading gantt for hardware_specs)  
**Mitigation:**
- Comprehensive integration tests
- Test matrix covering all sections
- Clear documentation of routing logic
- Easy to update routing map

### Risk 4: File System Complexity
**Description:** More files = more potential for errors (missing, corrupt, wrong encoding)  
**Mitigation:**
- Robust error handling
- Legacy fallback always available
- Validation scripts
- Clear file naming convention

### Risk 5: Migration Effort
**Description:** Migrating 10+ TS types is significant work  
**Mitigation:**
- Semi-automated migration script
- Template-driven approach
- Document lessons learned from UGS pilot
- Phased rollout (not all at once)

---

## Open Questions

1. **JSON Override Format:** Should we support JSON overrides for routing map? What format?
2. **Context File Size Limits:** Should we enforce max size per file type? What limits?
3. **Versioning:** Should context files have version numbers? How to handle breaking changes?
4. **Sharing:** Can context files be shared across related TS types (e.g., all OT Upgrades)?
5. **AI-Assisted Splitting:** Should we build an AI tool to help split monolithic files?
6. **Monitoring:** What metrics should we track in production to validate success?
7. **Custom Sections:** Should custom sections support custom routing maps?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize tasks** based on risk/value
3. **Start with Phase 1** (infrastructure, no behavior changes)
4. **Pilot with UGS** (Phase 2) and validate improvements
5. **Iterate on routing map** based on pilot results
6. **Roll out to other TS types** gradually
7. **Monitor and optimize** based on production metrics

---

## Appendix A: Example Context File Contents

### Template Alignment

### ORIGINAL TS Template Structure

The layered context architecture is designed to serve the **ORIGINAL TS template structure** used by the TS-Doc application. All section guidance files and context routing maps are aligned to this canonical template.

### Template Section Hierarchy

**Level 1 - Document Metadata:**
- Cover Page (suppressed from AI)
- Revision History (suppressed from AI)

**Level 2 - Executive & Introduction:**
- Executive Summary → `executive_summary`
- General Overview (distributed across multiple sections)
- Introduction → `introduction`
- Abbreviations Used → `abbreviations` (suppressed from AI)

**Level 3 - Process & Overview:**
- Process Flow → `process_flow`
- Overview of {{SolutionName}} → `overview`

**Level 4 - Offerings:**
- Design Scope of Work (Features) → `features`
- Remote Support → `remote_support`
- Documentation Control → `documentation_control`
- Customer Training → `customer_training`

**Level 5 - Technical Configuration:**
- System Configuration (for Reference) → `system_config`
- FAT Condition → `fat_condition`
- Technology Stack → `tech_stack`
  - Hardware Specifications → `hardware_specs`
  - Software Specifications → `software_specs`
  - Third Party Software → `third_party_sw`

**Level 6 - Schedule:**
- Schedule
  - Overall Gantt Chart → `overall_gantt`
  - Shutdown Gantt Chart → `shutdown_gantt`

**Level 7 - Scope & Responsibilities:**
- Supervisors → `supervisors`
- Scope of Supply Definitions → `scope_definitions`
- Division of Engineering, Software Development, & Erection/Commissioning Services → `division_of_eng`

**Level 8 - Value & Completion:**
- Value Addition → `value_addition`
- Work Completion Certificate → `work_completion`

**Level 9 - Obligations & Exclusions:**
- Buyer Obligations → `buyer_obligations`
- Exclusion List → `exclusion_list`
- Buyer Prerequisites → `buyer_prerequisites`

**Level 10 - Legal & Compliance:**
- Binding Conditions → `binding_conditions`
- Cybersecurity Disclaimer → `cybersecurity`
- Disclaimer (4 subsections) → `disclaimer`

**Level 11 - Proof of Concept:**
- Complimentary Proof of Concepts (PoC) → `poc`

### Template-to-Repository Mapping Rules

1. **Section Key Naming:** Repository section keys use snake_case and abbreviated forms (e.g., "Abbreviations Used" → `abbreviations`, "FAT Condition" → `fat_condition`)
2. **Suppressed Sections:** `cover`, `revision_history`, `abbreviations` do not have AI suggestion buttons and are excluded from context routing
3. **Completion Exclusions:** `binding_conditions`, `cybersecurity`, `disclaimer`, `scope_definitions` are AI-eligible but excluded from completion metrics
4. **Hierarchical Grouping:** Technology Stack is a parent section containing three child sections (hardware_specs, software_specs, third_party_sw)
5. **Template Placeholders:** `{{SolutionName}}`, `{{ClientName}}` are replaced at rendering time

### Section Guidance File Naming Convention

Section guidance files are named using **repository section keys**, not template headings:

| Template Heading | Repository Key | Guidance File |
|-----------------|----------------|---------------|
| Executive Summary | executive_summary | executive_summary.txt |
| Abbreviations Used | abbreviations | (suppressed, no guidance file needed) |
| Overview of {{SolutionName}} | overview | overview.txt |
| Design Scope of Work | features | features.txt |
| FAT Condition | fat_condition | fat_condition.txt |
| Overall Gantt Chart | overall_gantt | overall_gantt.txt |
| Complimentary Proof of Concepts (PoC) | poc | poc.txt |

This ensures consistency with the section context routing map and file system organization.

### Template Coverage Validation

The architecture includes validation to ensure:
- All AI-eligible template sections have corresponding routing map entries
- All routing map entries have corresponding section guidance files
- Template section names are correctly mapped to repository keys
- No template sections are missing from the layered context system

This validation is implemented in Task 21.5 (unit tests for routing system).

---

## Appendix A: Example Context File Contents

### domain_context.txt (UGS)

```
# UGS DOMAIN KNOWLEDGE

## What UGS Is
Industrial data integration middleware: collects process data from multiple heterogeneous 
plant automation systems, normalizes it, stores it centrally, and redistributes it to 
higher-level consumers. Sits at the OT/IT boundary. NOT a SCADA, visualization tool, 
or process controller.

## Core Capabilities
- Centralized data acquisition from multiple production units
- Multi-protocol support (OPC UA, Modbus, OPC DA, TCP/IP, MQTT, DBlink/SQL)
- Browser-based configuration UI
- On-premises SQL database with configurable retention
- OPC UA server role for downstream consumers
- Role-based access control with audit trail

## Business Drivers
Customers implement UGS to: eliminate siloed data, replace point-to-point integrations, 
enable plant-wide KPI visibility, create digitalization foundation (MES, analytics, AI/ML), 
reduce manual reporting, apply consistent data governance.
```

### architecture_context.txt (UGS)

```
# UGS ARCHITECTURE CONTEXT

## Architecture Options
- Option A (Direct): UGS server polls each unit's data acquisition server centrally
- Option B (HX Edge): HX controller at each unit → central UGS server
  Use Option B when network reliability cannot be guaranteed

## System Layers
Field → L1 (PLCs, PDA servers) → L2 (supervisory) → OT Boundary (firewalls) → 
IT (UGS server) → Remote Access

## Technology Stack Patterns
- Software: Browser-based frontend, C#/.NET backend, SQL Server, Windows Server
- Hardware: Enterprise server (sizing per tag count/retention), FHD monitor, 
  managed switch, network cabling
- HX Controller: Local buffering, preprocessing (Option B only)

## Protocols
- Primary: OPC UA
- Also: OPC DA, Modbus RTU/TCP, TCP/IP, UDP, MQTT, DBlink/SQL
- Outbound: OPC UA server, SQL read-only access
```

### section_guidance/hardware_specs.txt

```
# HARDWARE_SPECS SECTION GUIDANCE

## Structure
1. UGS Server specifications (CPU, RAM, storage, OS)
   - Size based on [NUM_TAGS] and [RETENTION_PERIOD]
   - Never specify exact GB/TB values
2. Network equipment (managed switch, cabling)
3. HX Controllers (if Option B architecture)
   - One per production unit
   - Include junction box and mounting
4. Peripherals (monitor, keyboard, mouse)

## Avoid
- Do not assume specific hardware vendors
- Do not state exact RAM/storage numbers
- Do not include buyer-scope items (firewalls, server room)

## Tone
Technical, specification-style. Use phrases like "Enterprise-grade", "Industrial-rated"
```

---

## Appendix B: File Size Estimates

**Shared Context Files:**
- domain_context.txt: ~800 chars
- architecture_context.txt: ~600 chars
- implementation_context.txt: ~1000 chars
- cybersecurity_context.txt: ~500 chars
- gantt_context.txt: ~400 chars

**Section Guidance Files:** ~200-300 chars each

**Before Migration (Monolithic):**
- context.txt: 4000+ chars (truncated to 2000)

**After Migration (Typical Section):**
- 1-2 shared files + 1 guidance file = 800-1200 chars total
- **60-70% reduction in context size**
- **Much higher relevance** (90%+ vs 40%)

