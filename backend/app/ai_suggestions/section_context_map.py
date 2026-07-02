"""
Section Context Routing Map

This module defines the mapping from repository section keys to shared context files
for the layered context architecture. Each section is mapped to a list of shared
context files that should be loaded when generating AI suggestions for that section.

**ARCHITECTURAL OVERVIEW:**

The layered context system replaces monolithic `context.txt` files with five specialized
shared context files:
- domain_context.txt: Business domain knowledge, capabilities, use cases
- architecture_context.txt: Technical architecture, technology stack, system design
- implementation_context.txt: Implementation phases, project execution, obligations
- cybersecurity_context.txt: Security policies, compliance, responsibility matrix
- gantt_context.txt: Scheduling, timelines, milestones, phases

Each section is strategically mapped to the subset of context files most relevant to
its content needs, improving token efficiency by loading only necessary context.

**SECTION-TO-CONTEXT MAPPING RATIONALE:**

Narrative Sections (executive_summary, introduction, overview, process_flow):
- Load: domain_context, architecture_context
- Rationale: These sections describe WHAT the system does and WHY. They need business
  domain knowledge and high-level architecture, but not implementation details.

Offerings Sections (features, remote_support, documentation_control, customer_training):
- Load: domain_context, implementation_context
- Rationale: These sections describe service offerings and project deliverables. They
  need business capabilities and implementation/delivery processes.

Technical Sections (system_config, fat_condition, tech_stack, hardware_specs, 
                    software_specs, third_party_sw):
- Load: architecture_context, implementation_context
- Rationale: These sections describe technical specifications and configurations. They
  need architecture patterns and implementation details, less business context.

Schedule Sections (overall_gantt, shutdown_gantt):
- Load: gantt_context, implementation_context
- Rationale: These sections describe project timelines. They need specialized scheduling
  guidance and implementation phase details.

Scope Sections (supervisors, scope_definitions, division_of_eng):
- Load: implementation_context, domain_context
- Rationale: These sections describe project scope and responsibilities. They need
  implementation processes and domain understanding.

Completion Sections (work_completion, value_addition):
- Load: implementation_context, domain_context
- Rationale: These sections describe project closure and value propositions. They need
  implementation processes and business value context.

Obligations Sections (buyer_obligations, exclusion_list, buyer_prerequisites):
- Load: implementation_context
- Rationale: These sections list buyer responsibilities. They need implementation phase
  details but minimal domain/architecture context.

Legal Sections (binding_conditions, disclaimer):
- Load: implementation_context, cybersecurity_context
- Rationale: These sections contain legal terms and disclaimers. They need implementation
  constraints and security policies.

Cybersecurity Section (cybersecurity):
- Load: cybersecurity_context, implementation_context
- Rationale: This section describes security policies. It needs specialized security
  context and implementation details.

PoC Section (poc):
- Load: domain_context, architecture_context
- Rationale: Proof of Concept descriptions need business value context and technical
  architecture understanding.

**TEMPLATE ALIGNMENT:**

This module maps repository section keys (used by backend and frontend code) to context
files. The repository section keys were derived from the ORIGINAL TS template structure
as documented in design.md Section 2.2. Some template section names differ from their
repository keys:
- Template "Abbreviations Used" → repository key "abbreviations" (suppressed, no AI)
- Template "Overview of {{SolutionName}}" → repository key "overview"
- Template "Design Scope of Work (Offerings - Features)" → repository key "features"

For complete template-to-repository mapping, see:
docs/TEMPLATE_SECTION_MAPPING.md (created in Task 21.4)

**CUSTOM SECTION FALLBACK:**

Custom sections (custom_section_{timestamp}_{uuid}) automatically fall back to
domain_context.txt as they represent project-specific content that benefits most
from general business domain knowledge.

**USAGE:**

    from app.ai_suggestions.section_context_map import (
        get_shared_context_files,
        get_section_guidance_file,
        has_section_guidance
    )
    
    # Get list of shared context files to load for a section
    context_files = get_shared_context_files("executive_summary")
    # Returns: ["domain_context.txt", "architecture_context.txt"]
    
    # Get section-specific guidance filename
    guidance_file = get_section_guidance_file("features")
    # Returns: "features.txt"
    
    # Check if section has specific guidance
    has_guidance = has_section_guidance("overall_gantt")
    # Returns: True

**EXTENSIBILITY:**

The routing map can be customized per TS type by providing a JSON override file at:
ts_documents/{ts_type}/context_routing_override.json

JSON format:
{
  "section_key": ["context_file1.txt", "context_file2.txt"],
  ...
}

Custom mappings override default mappings via shallow merge (Task 21.3).

**REQUIREMENTS SATISFIED:**
- Req 21.1: Complete template coverage (all 29 AI-eligible sections mapped)
- Req 21.1: Scalability (easy to add new sections or context files)
- Req 21.1: Relevance (strategic mapping based on content analysis)
- Req 21.1: Token efficiency (load only relevant context per section)
"""

from typing import List, Optional, Dict
import re
import json
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


# Shared context file names
DOMAIN_CONTEXT = "domain_context.txt"
ARCHITECTURE_CONTEXT = "architecture_context.txt"
IMPLEMENTATION_CONTEXT = "implementation_context.txt"
CYBERSECURITY_CONTEXT = "cybersecurity_context.txt"
GANTT_CONTEXT = "gantt_context.txt"


# Default section-to-context routing map
# Maps each repository section key to list of shared context files to load
DEFAULT_SECTION_CONTEXT_MAP: dict[str, List[str]] = {
    # =============================================================================
    # NARRATIVE SECTIONS (Business context, system overview, high-level architecture)
    # =============================================================================
    
    "executive_summary": [
        DOMAIN_CONTEXT,      # Business domain, capabilities, value proposition
        ARCHITECTURE_CONTEXT # High-level architecture for strategic framing
    ],
    
    "introduction": [
        DOMAIN_CONTEXT,      # Business context, client industry, problem space
        ARCHITECTURE_CONTEXT # Solution approach, architecture paradigm
    ],
    
    "overview": [
        DOMAIN_CONTEXT,      # System capabilities, business drivers, use cases
        ARCHITECTURE_CONTEXT # Architecture patterns, technical approach
    ],
    
    "process_flow": [
        DOMAIN_CONTEXT,      # Business process understanding, workflow context
        ARCHITECTURE_CONTEXT # Data flow architecture, integration patterns
    ],
    
    # =============================================================================
    # OFFERINGS SECTIONS (Service descriptions, deliverables, customer-facing)
    # =============================================================================
    
    "features": [
        DOMAIN_CONTEXT,         # Feature descriptions, business value, capabilities
        IMPLEMENTATION_CONTEXT  # Delivery approach, value-added features
    ],
    
    "remote_support": [
        DOMAIN_CONTEXT,         # Support capabilities, service model
        IMPLEMENTATION_CONTEXT  # Support process, buyer responsibilities
    ],
    
    "documentation_control": [
        DOMAIN_CONTEXT,         # Documentation capabilities, deliverables
        IMPLEMENTATION_CONTEXT  # Documentation delivery process
    ],
    
    "customer_training": [
        DOMAIN_CONTEXT,         # Training capabilities, curriculum
        IMPLEMENTATION_CONTEXT  # Training delivery, on-site requirements
    ],
    
    # =============================================================================
    # TECHNICAL SECTIONS (Architecture, specifications, technology stack)
    # =============================================================================
    
    "system_config": [
        ARCHITECTURE_CONTEXT,   # Architecture options, configuration patterns
        IMPLEMENTATION_CONTEXT  # Configuration process, finalization approach
    ],
    
    "fat_condition": [
        ARCHITECTURE_CONTEXT,   # Testing architecture, validation approach
        IMPLEMENTATION_CONTEXT  # FAT process, acceptance criteria
    ],
    
    "tech_stack": [
        ARCHITECTURE_CONTEXT,   # Technology choices, stack rationale
        IMPLEMENTATION_CONTEXT  # Version policies, technology delivery
    ],
    
    "hardware_specs": [
        ARCHITECTURE_CONTEXT,   # Hardware architecture, sizing methodology
        IMPLEMENTATION_CONTEXT  # Hardware delivery, BOM structure
    ],
    
    "software_specs": [
        ARCHITECTURE_CONTEXT,   # Software architecture, component selection
        IMPLEMENTATION_CONTEXT  # License management, software delivery
    ],
    
    "third_party_sw": [
        ARCHITECTURE_CONTEXT,   # Third-party integration patterns
        IMPLEMENTATION_CONTEXT  # Third-party software management, responsibilities
    ],
    
    # =============================================================================
    # SCHEDULE SECTIONS (Project timelines, Gantt charts)
    # =============================================================================
    
    "overall_gantt": [
        GANTT_CONTEXT,          # Scheduling guidance, phase structure, milestones
        IMPLEMENTATION_CONTEXT  # Implementation phases, dependencies
    ],
    
    "shutdown_gantt": [
        GANTT_CONTEXT,          # Shutdown-specific scheduling guidance
        IMPLEMENTATION_CONTEXT  # Shutdown implementation approach
    ],
    
    # =============================================================================
    # SCOPE SECTIONS (Responsibilities, scope definitions, project organization)
    # =============================================================================
    
    "supervisors": [
        IMPLEMENTATION_CONTEXT, # Supervision approach, man-day allocation
        DOMAIN_CONTEXT          # Project roles, service model
    ],
    
    "scope_definitions": [
        IMPLEMENTATION_CONTEXT, # Scope terminology, responsibility definitions
        DOMAIN_CONTEXT          # Business scope understanding
    ],
    
    "division_of_eng": [
        IMPLEMENTATION_CONTEXT, # Responsibility matrix, engineering division
        DOMAIN_CONTEXT          # Service delivery model
    ],
    
    # =============================================================================
    # COMPLETION SECTIONS (Project closure, value propositions)
    # =============================================================================
    
    "work_completion": [
        IMPLEMENTATION_CONTEXT, # Completion criteria, acceptance process
        DOMAIN_CONTEXT          # Deliverable definitions
    ],
    
    "value_addition": [
        IMPLEMENTATION_CONTEXT, # Value-added offering structure, PoC approach
        DOMAIN_CONTEXT          # Business value, capability extensions
    ],
    
    # =============================================================================
    # OBLIGATIONS SECTIONS (Buyer responsibilities, exclusions, prerequisites)
    # =============================================================================
    
    "buyer_obligations": [
        IMPLEMENTATION_CONTEXT  # Buyer responsibilities, project prerequisites
    ],
    
    "exclusion_list": [
        IMPLEMENTATION_CONTEXT  # Scope exclusions, boundary definitions
    ],
    
    "buyer_prerequisites": [
        IMPLEMENTATION_CONTEXT  # Buyer-supplied prerequisites, dependencies
    ],
    
    # =============================================================================
    # LEGAL SECTIONS (Binding terms, disclaimers, legal constraints)
    # =============================================================================
    
    "binding_conditions": [
        IMPLEMENTATION_CONTEXT,  # Contractual constraints, binding terms
        CYBERSECURITY_CONTEXT    # Security-related legal terms
    ],
    
    "disclaimer": [
        IMPLEMENTATION_CONTEXT,  # Legal disclaimers, liability limitations
        CYBERSECURITY_CONTEXT    # Security disclaimers
    ],
    
    # =============================================================================
    # CYBERSECURITY SECTION (Security policies, compliance, responsibility matrix)
    # =============================================================================
    
    "cybersecurity": [
        CYBERSECURITY_CONTEXT,   # Security policies, compliance requirements
        IMPLEMENTATION_CONTEXT   # Security implementation, responsibility matrix
    ],
    
    # =============================================================================
    # PoC SECTION (Proof of Concept offerings)
    # =============================================================================
    
    "poc": [
        DOMAIN_CONTEXT,      # PoC capabilities, value proposition
        ARCHITECTURE_CONTEXT # PoC technical approach, architecture
    ],
    
    # =============================================================================
    # SUPPRESSED SECTIONS (No AI button, included for completeness)
    # =============================================================================
    # These sections are listed for documentation but should never trigger AI
    # suggestions per design.md Section 2.2 and requirements.md Requirement 1.
    #
    # "cover": SUPPRESSED - metadata fields, no AI suggestions
    # "revision_history": SUPPRESSED - tabular revision log, no AI suggestions
    # "abbreviations": SUPPRESSED - abbreviation table, no AI suggestions
}


# Custom section fallback context
# All custom sections default to domain_context as they represent project-specific
# content that benefits most from general business domain knowledge
CUSTOM_SECTION_FALLBACK: List[str] = [DOMAIN_CONTEXT]


# Section guidance file pattern
# Section-specific guidance files are named {section_key}.txt
# Located in: ts_documents/{ts_type}/section_guidance/{section_key}.txt
SECTION_GUIDANCE_DIR = "section_guidance"


# JSON override configuration
# TS types can provide custom routing overrides at:
# ts_documents/{ts_type}/context_routing_override.json
CONTEXT_ROUTING_OVERRIDE_FILENAME = "context_routing_override.json"


# Cache for loaded override maps per ts_type folder
# Key: absolute folder path, Value: override map dict
_override_cache: Dict[str, Dict[str, List[str]]] = {}


def get_shared_context_files(section_key: str, ts_type_folder: Optional[str] = None) -> List[str]:
    """
    Get the list of shared context files to load for a given section.
    
    This function returns the strategically selected context files that are most
    relevant to the section's content needs, improving token efficiency by loading
    only necessary context.
    
    Supports JSON override files at: ts_documents/{ts_type}/context_routing_override.json
    Custom mappings override default mappings via shallow merge.
    
    Args:
        section_key: Repository section key (e.g., "executive_summary", "features")
                    or custom section key pattern (custom_section_{timestamp}_{uuid})
        ts_type_folder: Optional absolute path to ts_type folder for override loading.
                       If provided, checks for context_routing_override.json in this folder.
    
    Returns:
        List of shared context filenames to load (e.g., ["domain_context.txt"])
        Returns CUSTOM_SECTION_FALLBACK for custom sections
        Returns empty list for suppressed sections (cover, revision_history, abbreviations)
    
    Examples:
        >>> get_shared_context_files("executive_summary")
        ["domain_context.txt", "architecture_context.txt"]
        
        >>> get_shared_context_files("cybersecurity")
        ["cybersecurity_context.txt", "implementation_context.txt"]
        
        >>> get_shared_context_files("custom_section_1234567890_abc123")
        ["domain_context.txt"]
        
        >>> get_shared_context_files("cover")  # Suppressed section
        []
        
        >>> # With JSON override that customizes "features" mapping
        >>> get_shared_context_files("features", "/app/ts_documents/UGS")
        ["domain_context.txt", "custom_features_context.txt"]  # Custom override applied
    
    **Requirements Satisfied:**
    - Task 21.2: Routing function implementation
    - Task 21.2: Custom section handling (fallback to domain_context)
    - Task 21.3: JSON override support with shallow merge
    """
    # Check if this is a custom section
    if _is_custom_section(section_key):
        return CUSTOM_SECTION_FALLBACK
    
    # Check if this is a suppressed section (no AI suggestions allowed)
    if _is_suppressed_section(section_key):
        return []
    
    # Get the effective routing map (default + overrides)
    routing_map = _get_routing_map(ts_type_folder)
    
    # Return mapped context files, or empty list if section not found
    return routing_map.get(section_key, [])


def get_section_guidance_file(section_key: str) -> Optional[str]:
    """
    Get the section-specific guidance filename for a given section.
    
    Section guidance files provide specialized instructions for generating content
    for specific sections. They are optional and located in:
    ts_documents/{ts_type}/section_guidance/{section_key}.txt
    
    Args:
        section_key: Repository section key or custom section key
    
    Returns:
        Filename for section guidance (e.g., "features.txt")
        Returns None for custom sections (no predefined guidance)
        Returns None for suppressed sections
    
    Examples:
        >>> get_section_guidance_file("features")
        "features.txt"
        
        >>> get_section_guidance_file("overall_gantt")
        "overall_gantt.txt"
        
        >>> get_section_guidance_file("custom_section_1234567890_abc123")
        None
    
    **Requirements Satisfied:**
    - Task 21.2: Section guidance filename resolution
    - Task 21.2: Configurability and extensibility
    """
    # Custom sections don't have predefined guidance
    if _is_custom_section(section_key):
        return None
    
    # Suppressed sections don't have guidance
    if _is_suppressed_section(section_key):
        return None
    
    # Section guidance files are named {section_key}.txt
    # Only return filename if section is in the routing map
    if section_key in DEFAULT_SECTION_CONTEXT_MAP:
        return f"{section_key}.txt"
    
    return None


def has_section_guidance(section_key: str) -> bool:
    """
    Check if a section has section-specific guidance available.
    
    This is a convenience function that returns True if the section has a defined
    guidance filename. It does NOT check if the file actually exists on disk
    (that check happens during file loading in retrieval.py).
    
    Args:
        section_key: Repository section key or custom section key
    
    Returns:
        True if section has guidance filename defined, False otherwise
    
    Examples:
        >>> has_section_guidance("executive_summary")
        True
        
        >>> has_section_guidance("custom_section_1234567890_abc123")
        False
        
        >>> has_section_guidance("cover")
        False
    
    **Requirements Satisfied:**
    - Task 21.2: Convenience function for guidance availability check
    """
    return get_section_guidance_file(section_key) is not None


def _is_custom_section(section_key: str) -> bool:
    """
    Check if a section key matches the custom section pattern.
    
    Custom sections follow the pattern: custom_section_{timestamp}_{uuid}
    
    Args:
        section_key: Section key to check
    
    Returns:
        True if section_key matches custom section pattern, False otherwise
    
    Examples:
        >>> _is_custom_section("custom_section_1234567890_abc123-def456")
        True
        
        >>> _is_custom_section("executive_summary")
        False
    """
    # Pattern: custom_section_{timestamp}_{uuid}
    # timestamp: digits
    # uuid: hex characters with hyphens
    pattern = r"^custom_section_\d+_[a-f0-9-]+$"
    return bool(re.match(pattern, section_key))


def _is_suppressed_section(section_key: str) -> bool:
    """
    Check if a section is suppressed (no AI suggestions allowed).
    
    Per design.md Section 2.2 and requirements.md Requirement 1, three sections
    are suppressed: cover, revision_history, abbreviations
    
    Args:
        section_key: Section key to check
    
    Returns:
        True if section is suppressed, False otherwise
    
    Examples:
        >>> _is_suppressed_section("cover")
        True
        
        >>> _is_suppressed_section("revision_history")
        True
        
        >>> _is_suppressed_section("abbreviations")
        True
        
        >>> _is_suppressed_section("executive_summary")
        False
    """
    SUPPRESSED_SECTIONS = {"cover", "revision_history", "abbreviations"}
    return section_key in SUPPRESSED_SECTIONS


def _get_routing_map(ts_type_folder: Optional[str] = None) -> Dict[str, List[str]]:
    """
    Get the effective routing map with JSON overrides applied.
    
    This function returns the merged routing map by:
    1. Starting with DEFAULT_SECTION_CONTEXT_MAP
    2. Loading overrides from context_routing_override.json if ts_type_folder provided
    3. Performing shallow merge (custom overrides replace default entries per section)
    
    Args:
        ts_type_folder: Optional absolute path to ts_type folder containing
                       context_routing_override.json
    
    Returns:
        Merged routing map dictionary
    
    **Requirements Satisfied:**
    - Task 21.3: JSON override loading and merging
    - Task 21.3: Shallow merge (custom overrides default)
    """
    # If no folder provided, return default map
    if not ts_type_folder:
        return DEFAULT_SECTION_CONTEXT_MAP
    
    # Try to load override from cache or file
    override_map = _load_override_map(ts_type_folder)
    
    # If no overrides found, return default map
    if not override_map:
        return DEFAULT_SECTION_CONTEXT_MAP
    
    # Shallow merge: override replaces default per section key
    merged_map = DEFAULT_SECTION_CONTEXT_MAP.copy()
    merged_map.update(override_map)
    
    return merged_map


def _load_override_map(ts_type_folder: str) -> Optional[Dict[str, List[str]]]:
    """
    Load routing override map from JSON file in ts_type folder.
    
    Checks cache first, then attempts to load from:
    {ts_type_folder}/context_routing_override.json
    
    Validates JSON structure and logs warnings for invalid entries.
    
    Args:
        ts_type_folder: Absolute path to ts_type folder
    
    Returns:
        Override map dict if file exists and is valid, None otherwise
    
    **Requirements Satisfied:**
    - Task 21.3: JSON override file loading
    - Task 21.3: JSON structure validation
    """
    # Check cache first
    if ts_type_folder in _override_cache:
        return _override_cache[ts_type_folder]
    
    # Build path to override file
    override_path = Path(ts_type_folder) / CONTEXT_ROUTING_OVERRIDE_FILENAME
    
    # If file doesn't exist, cache None and return
    if not override_path.exists():
        _override_cache[ts_type_folder] = None
        return None
    
    # Try to load and validate JSON file
    try:
        with open(override_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        
        # Validate and sanitize the override data
        override_map = _validate_override_map(raw_data, override_path)
        
        # Cache the result (even if empty after validation)
        _override_cache[ts_type_folder] = override_map
        
        if override_map:
            logger.info(
                f"Loaded context routing override from {override_path}: "
                f"{len(override_map)} section(s) customized"
            )
        
        return override_map
        
    except json.JSONDecodeError as e:
        logger.warning(
            f"Invalid JSON in context routing override file {override_path}: {e}. "
            f"Using default routing map."
        )
        _override_cache[ts_type_folder] = None
        return None
        
    except Exception as e:
        logger.warning(
            f"Failed to load context routing override from {override_path}: {e}. "
            f"Using default routing map."
        )
        _override_cache[ts_type_folder] = None
        return None


def _validate_override_map(
    raw_data: any,
    override_path: Path
) -> Optional[Dict[str, List[str]]]:
    """
    Validate and sanitize the raw JSON override data.
    
    Expected format:
    {
      "section_key": ["context_file1.txt", "context_file2.txt"],
      ...
    }
    
    Validation rules:
    - Root must be a dictionary
    - Keys must be strings (section keys)
    - Values must be lists of strings (context filenames)
    - Context filenames should end with .txt
    - Invalid entries are logged and skipped
    
    Args:
        raw_data: Raw data loaded from JSON file
        override_path: Path to override file (for logging)
    
    Returns:
        Validated override map dict, or None if root structure is invalid
    
    **Requirements Satisfied:**
    - Task 21.3: JSON structure validation
    """
    # Root must be a dictionary
    if not isinstance(raw_data, dict):
        logger.warning(
            f"Invalid context routing override in {override_path}: "
            f"root must be a dictionary, got {type(raw_data).__name__}"
        )
        return None
    
    validated_map: Dict[str, List[str]] = {}
    
    for section_key, context_files in raw_data.items():
        # Keys must be strings
        if not isinstance(section_key, str):
            logger.warning(
                f"Invalid section key in {override_path}: "
                f"keys must be strings, skipping {section_key}"
            )
            continue
        
        # Values must be lists
        if not isinstance(context_files, list):
            logger.warning(
                f"Invalid context files for section '{section_key}' in {override_path}: "
                f"value must be a list, got {type(context_files).__name__}"
            )
            continue
        
        # Validate each context filename in the list
        validated_files: List[str] = []
        for filename in context_files:
            if not isinstance(filename, str):
                logger.warning(
                    f"Invalid context filename for section '{section_key}' in {override_path}: "
                    f"must be string, skipping {filename}"
                )
                continue
            
            # Warn if filename doesn't end with .txt (not enforced, just a warning)
            if not filename.endswith('.txt'):
                logger.warning(
                    f"Context filename '{filename}' for section '{section_key}' in {override_path} "
                    f"does not end with .txt (expected pattern: *_context.txt)"
                )
            
            validated_files.append(filename)
        
        # Only add to map if at least one valid filename
        if validated_files:
            validated_map[section_key] = validated_files
        else:
            logger.warning(
                f"Section '{section_key}' in {override_path} has no valid context files, skipping"
            )
    
    return validated_map if validated_map else None


def clear_override_cache():
    """
    Clear the JSON override cache.
    
    This function is useful for testing and for invalidating the cache when
    override files are modified at runtime.
    
    **Requirements Satisfied:**
    - Task 21.3: Cache management for testing
    """
    global _override_cache
    _override_cache.clear()
    logger.debug("Cleared context routing override cache")


# Export public API
__all__ = [
    "get_shared_context_files",
    "get_section_guidance_file",
    "has_section_guidance",
    "clear_override_cache",
    "DEFAULT_SECTION_CONTEXT_MAP",
    "CUSTOM_SECTION_FALLBACK",
    "SECTION_GUIDANCE_DIR",
    "CONTEXT_ROUTING_OVERRIDE_FILENAME",
    # Context file constants for use in other modules
    "DOMAIN_CONTEXT",
    "ARCHITECTURE_CONTEXT",
    "IMPLEMENTATION_CONTEXT",
    "CYBERSECURITY_CONTEXT",
    "GANTT_CONTEXT",
]
