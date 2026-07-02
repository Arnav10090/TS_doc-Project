"""
Template Section Mapping - Machine-Readable Reference

This module provides the authoritative mapping between ORIGINAL TS template
section headings and repository section keys for validation and testing.

**Purpose:**
- Provide machine-readable mapping for automated tests
- Enable validation that all template sections have routing entries
- Support migration and refactoring tools
- Serve as single source of truth for template-to-repository alignment

**Usage:**
    from app.ai_suggestions.template_section_mapping import (
        TEMPLATE_TO_REPOSITORY,
        REPOSITORY_TO_TEMPLATE,
        validate_routing_coverage
    )
    
    # Get repository key for a template section
    repo_key = TEMPLATE_TO_REPOSITORY["Executive Summary"]  # "executive_summary"
    
    # Get template heading for a repository key
    template_heading = REPOSITORY_TO_TEMPLATE["executive_summary"]  # "Executive Summary"
    
    # Validate all sections have routing entries
    validate_routing_coverage()  # Raises AssertionError if missing entries

**Documentation:**
For complete documentation including rationale, context routing details, and
design decisions, see: docs/TEMPLATE_SECTION_MAPPING.md

**Maintenance:**
This file should be updated whenever:
1. New sections are added to the TS template
2. Repository section keys are renamed
3. Template section names change

**Requirements Satisfied:**
- Task 21.4: Machine-readable mapping for validation
- Task 21.4: Template-to-repository section mapping
"""

from typing import Dict, Optional, List, Set

# =============================================================================
# AUTHORITATIVE MAPPING: Template Heading → Repository Section Key
# =============================================================================

TEMPLATE_TO_REPOSITORY: Dict[str, Optional[str]] = {
    # Suppressed sections (no AI button)
    "Cover Page": "cover",
    "Revision History": "revision_history",
    "Abbreviations Used": "abbreviations",
    
    # Conceptual grouping (no direct repository section)
    "General Overview": None,
    
    # Narrative sections
    "Executive Summary": "executive_summary",
    "Introduction": "introduction",
    "Process Flow": "process_flow",
    "Overview of {{SolutionName}}": "overview",
    
    # Offerings sections
    "Design Scope of Work (Offerings - Features)": "features",
    "Remote Support": "remote_support",
    "Documentation Control": "documentation_control",
    "Customer Training": "customer_training",
    
    # Technical sections
    "System Configuration (for Reference)": "system_config",
    "FAT Condition": "fat_condition",
    "Technology Stack": "tech_stack",
    "Hardware Specifications": "hardware_specs",
    "Software Specifications": "software_specs",
    "Third Party Software": "third_party_sw",
    
    # Schedule sections
    "Schedule - Overall Gantt": "overall_gantt",
    "Schedule - Shutdown Gantt": "shutdown_gantt",
    
    # Scope sections
    "Supervisors": "supervisors",
    "Scope of Supply Definitions": "scope_definitions",
    "Division of Engineering, Software Development, & Erection/Commissioning Services": "division_of_eng",
    
    # Completion sections
    "Value Addition": "value_addition",
    "Work Completion Certificate": "work_completion",
    
    # Obligations sections
    "Buyer Obligations": "buyer_obligations",
    "Exclusion List": "exclusion_list",
    "Buyer Prerequisites": "buyer_prerequisites",
    
    # Legal sections
    "Binding Conditions": "binding_conditions",
    "Cybersecurity Disclaimer": "cybersecurity",
    "Disclaimer (Software Licenses, Changes, Confidentiality, Limitation of Liability)": "disclaimer",
    
    # PoC section
    "Complimentary Proof of Concepts (PoC)": "poc",
}


# =============================================================================
# REVERSE MAPPING: Repository Section Key → Template Heading
# =============================================================================

# Build reverse mapping (excluding None entries for conceptual sections)
REPOSITORY_TO_TEMPLATE: Dict[str, str] = {
    repo_key: template_heading
    for template_heading, repo_key in TEMPLATE_TO_REPOSITORY.items()
    if repo_key is not None
}


# =============================================================================
# SECTION CATEGORIES
# =============================================================================

SUPPRESSED_SECTIONS: Set[str] = {
    "cover",
    "revision_history",
    "abbreviations",
}

AI_ELIGIBLE_SECTIONS: Set[str] = {
    repo_key
    for repo_key in REPOSITORY_TO_TEMPLATE.keys()
    if repo_key not in SUPPRESSED_SECTIONS
}

SECTIONS_WITH_NAME_VARIATIONS: Dict[str, str] = {
    # Repository key → Note about variation
    "abbreviations": "Template: 'Abbreviations Used' (includes 'Used')",
    "overview": "Template: 'Overview of {{SolutionName}}' (includes placeholder)",
    "features": "Template: 'Design Scope of Work (Offerings - Features)' (long name)",
    "system_config": "Template: 'System Configuration (for Reference)' (includes caveat)",
    "division_of_eng": "Template: 'Division of Engineering, Software Development, & Erection/Commissioning Services' (very long)",
    "cybersecurity": "Template: 'Cybersecurity Disclaimer' (includes 'Disclaimer')",
}


# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

def validate_routing_coverage() -> None:
    """
    Validate that all AI-eligible sections have routing entries in section_context_map.
    
    This function verifies that every repository section key (except suppressed sections)
    has a corresponding entry in DEFAULT_SECTION_CONTEXT_MAP.
    
    Raises:
        AssertionError: If any AI-eligible section is missing routing entry
        ImportError: If section_context_map module cannot be imported
    
    Example:
        >>> validate_routing_coverage()  # Passes silently if all sections covered
        
        >>> # If a section is missing:
        >>> validate_routing_coverage()
        AssertionError: Missing routing entries for: ['new_section']
    
    **Requirements Satisfied:**
    - Task 21.4: Validation support
    - Task 21.5: Template alignment test
    """
    try:
        from app.ai_suggestions.section_context_map import DEFAULT_SECTION_CONTEXT_MAP
    except ImportError as e:
        raise ImportError(
            f"Cannot import section_context_map for validation: {e}. "
            f"Ensure section_context_map.py exists and is on the Python path."
        )
    
    # Check each AI-eligible section has routing entry
    missing_sections: List[str] = []
    for repo_key in AI_ELIGIBLE_SECTIONS:
        if repo_key not in DEFAULT_SECTION_CONTEXT_MAP:
            missing_sections.append(repo_key)
    
    if missing_sections:
        raise AssertionError(
            f"Missing routing entries for: {missing_sections}. "
            f"Add these sections to DEFAULT_SECTION_CONTEXT_MAP in section_context_map.py"
        )


def validate_predefined_sections() -> None:
    """
    Validate that repository keys match predefined section keys in frontend.
    
    This function verifies that all repository section keys exist in the
    frontend's PREDEFINED_SECTION_TITLES constant (minus custom sections).
    
    Note: This validation requires frontend type definitions. It's provided
    for documentation but may not be runnable in backend-only environments.
    
    Raises:
        AssertionError: If sections are missing or mismatched
    
    **Requirements Satisfied:**
    - Task 21.4: Validation support
    """
    # Expected predefined section keys from frontend
    # Source: frontend/src/components/sections/predefinedSectionContent.ts
    EXPECTED_FRONTEND_KEYS = {
        'cover', 'revision_history', 'executive_summary', 'introduction',
        'abbreviations', 'process_flow', 'overview', 'features',
        'remote_support', 'documentation_control', 'customer_training',
        'system_config', 'fat_condition', 'tech_stack', 'hardware_specs',
        'software_specs', 'third_party_sw', 'overall_gantt', 'shutdown_gantt',
        'supervisors', 'scope_definitions', 'division_of_eng', 'work_completion',
        'buyer_obligations', 'exclusion_list', 'buyer_prerequisites',
        'binding_conditions', 'cybersecurity', 'disclaimer', 'value_addition', 'poc'
    }
    
    # All repository keys (excluding None for conceptual sections)
    actual_keys = set(REPOSITORY_TO_TEMPLATE.keys())
    
    # Check for missing keys
    missing_in_frontend = actual_keys - EXPECTED_FRONTEND_KEYS
    missing_in_mapping = EXPECTED_FRONTEND_KEYS - actual_keys
    
    if missing_in_frontend:
        raise AssertionError(
            f"Repository keys not in frontend PREDEFINED_SECTION_TITLES: {missing_in_frontend}"
        )
    
    if missing_in_mapping:
        raise AssertionError(
            f"Frontend keys not in REPOSITORY_TO_TEMPLATE mapping: {missing_in_mapping}"
        )


def get_template_heading(repo_key: str) -> Optional[str]:
    """
    Get the template heading for a repository section key.
    
    Args:
        repo_key: Repository section key (e.g., "executive_summary")
    
    Returns:
        Template heading string, or None if not found
    
    Example:
        >>> get_template_heading("executive_summary")
        "Executive Summary"
        
        >>> get_template_heading("features")
        "Design Scope of Work (Offerings - Features)"
        
        >>> get_template_heading("unknown_section")
        None
    """
    return REPOSITORY_TO_TEMPLATE.get(repo_key)


def get_repository_key(template_heading: str) -> Optional[str]:
    """
    Get the repository section key for a template heading.
    
    Args:
        template_heading: Template section heading (exact match)
    
    Returns:
        Repository section key, or None if not found or conceptual section
    
    Example:
        >>> get_repository_key("Executive Summary")
        "executive_summary"
        
        >>> get_repository_key("General Overview")
        None  # Conceptual section, no direct repository key
    """
    return TEMPLATE_TO_REPOSITORY.get(template_heading)


def is_suppressed_section(repo_key: str) -> bool:
    """
    Check if a repository section key is suppressed (no AI button).
    
    Args:
        repo_key: Repository section key
    
    Returns:
        True if section is suppressed, False otherwise
    
    Example:
        >>> is_suppressed_section("cover")
        True
        
        >>> is_suppressed_section("executive_summary")
        False
    """
    return repo_key in SUPPRESSED_SECTIONS


def is_ai_eligible(repo_key: str) -> bool:
    """
    Check if a repository section key is AI-eligible (can show AI button).
    
    Args:
        repo_key: Repository section key
    
    Returns:
        True if section is AI-eligible, False if suppressed
    
    Example:
        >>> is_ai_eligible("executive_summary")
        True
        
        >>> is_ai_eligible("cover")
        False
    """
    return repo_key in AI_ELIGIBLE_SECTIONS


def has_name_variation(repo_key: str) -> bool:
    """
    Check if a repository section key has a different name in the template.
    
    Args:
        repo_key: Repository section key
    
    Returns:
        True if repository name differs from template name, False otherwise
    
    Example:
        >>> has_name_variation("features")
        True  # Template: "Design Scope of Work (Offerings - Features)"
        
        >>> has_name_variation("introduction")
        False  # Template: "Introduction" (exact match)
    """
    return repo_key in SECTIONS_WITH_NAME_VARIATIONS


def get_name_variation_note(repo_key: str) -> Optional[str]:
    """
    Get the note explaining the name variation for a repository section key.
    
    Args:
        repo_key: Repository section key
    
    Returns:
        Explanation string if variation exists, None otherwise
    
    Example:
        >>> get_name_variation_note("features")
        "Template: 'Design Scope of Work (Offerings - Features)' (long name)"
        
        >>> get_name_variation_note("introduction")
        None
    """
    return SECTIONS_WITH_NAME_VARIATIONS.get(repo_key)


# =============================================================================
# STATISTICS
# =============================================================================

def get_mapping_statistics() -> Dict[str, int]:
    """
    Get statistics about the template-to-repository mapping.
    
    Returns:
        Dictionary with counts of various section categories
    
    Example:
        >>> stats = get_mapping_statistics()
        >>> print(stats)
        {
            'total_template_sections': 33,
            'total_repository_sections': 32,
            'ai_eligible_sections': 29,
            'suppressed_sections': 3,
            'sections_with_name_variations': 6,
            'conceptual_sections': 1
        }
    """
    return {
        'total_template_sections': len(TEMPLATE_TO_REPOSITORY),
        'total_repository_sections': len(REPOSITORY_TO_TEMPLATE),
        'ai_eligible_sections': len(AI_ELIGIBLE_SECTIONS),
        'suppressed_sections': len(SUPPRESSED_SECTIONS),
        'sections_with_name_variations': len(SECTIONS_WITH_NAME_VARIATIONS),
        'conceptual_sections': sum(1 for v in TEMPLATE_TO_REPOSITORY.values() if v is None),
    }


# =============================================================================
# MODULE EXPORTS
# =============================================================================

__all__ = [
    # Mapping dictionaries
    "TEMPLATE_TO_REPOSITORY",
    "REPOSITORY_TO_TEMPLATE",
    
    # Section sets
    "SUPPRESSED_SECTIONS",
    "AI_ELIGIBLE_SECTIONS",
    "SECTIONS_WITH_NAME_VARIATIONS",
    
    # Validation functions
    "validate_routing_coverage",
    "validate_predefined_sections",
    
    # Query functions
    "get_template_heading",
    "get_repository_key",
    "is_suppressed_section",
    "is_ai_eligible",
    "has_name_variation",
    "get_name_variation_note",
    
    # Statistics
    "get_mapping_statistics",
]
