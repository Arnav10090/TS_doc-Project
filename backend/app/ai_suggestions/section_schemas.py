"""
Section schema mappings for AI suggestions.

This module provides SECTION_SCHEMAS dict mapping section keys to content families and field structures.
Generated from frontend/src/components/sections/predefinedSectionContent.ts.
Repository schema is the source of truth.

Content Families:
- Family A (Rich Text): sections with text/paragraphs fields
- Family B (Tabular): sections with rows arrays
- Family C (Mixed-Field): sections with multiple named fields
- Family D (List-Based): sections with items arrays
- Family E (Image-Backed): sections representing diagrams with text context

Suppressed sections (no AI button): cover, revision_history, abbreviations
"""

from typing import Dict, List, Literal, TypedDict

# Content family types
ContentFamily = Literal["A", "B", "C", "D", "E"]


class SectionSchema(TypedDict):
    """Schema definition for a section."""
    family: ContentFamily
    description: str
    fields: List[str]  # Field names for the section


# SECTION_SCHEMAS: Mapping from section_key to {family, description, fields}
# Generated from predefinedSectionContent.ts - repository is source of truth
SECTION_SCHEMAS: Dict[str, SectionSchema] = {
    # ===== Family A: Rich Text Sections =====
    "executive_summary": {
        "family": "A",
        "description": "Executive summary of the technical specification document",
        "fields": ["paragraphs", "para1"],
    },
    "introduction": {
        "family": "A",
        "description": "Introduction section with tender reference information",
        "fields": ["paragraphs", "tender_reference", "tender_date"],
    },
    "process_flow": {
        "family": "A",
        "description": "Description of the process flow",
        "fields": ["text"],
    },
    "remote_support": {
        "family": "A",
        "description": "Remote support system description",
        "fields": ["paragraphs", "text"],
    },
    "fat_condition": {
        "family": "A",
        "description": "Factory Acceptance Test conditions",
        "fields": ["text"],
    },
    "scope_definitions": {
        "family": "A",
        "description": "Scope of supply definitions",
        "fields": ["lines"],
    },
    "value_addition": {
        "family": "A",
        "description": "Value addition description",
        "fields": ["intro_text", "text"],
    },
    "binding_conditions": {
        "family": "A",
        "description": "Binding conditions for the contract",
        "fields": ["paragraphs"],
    },
    "cybersecurity": {
        "family": "A",
        "description": "Cybersecurity disclaimer",
        "fields": ["paragraphs"],
    },

    # ===== Family B: Tabular Sections =====
    "tech_stack": {
        "family": "B",
        "description": "Technology stack table with components and technologies",
        "fields": ["rows"],
        "row_fields": ["sr_no", "component", "technology", "note"],
    },
    "hardware_specs": {
        "family": "B",
        "description": "Hardware specifications table",
        "fields": ["rows"],
        "row_fields": ["sr_no", "name", "specs_line1", "specs_line2", "specs_line3", "specs_line4", "maker", "qty"],
    },
    "software_specs": {
        "family": "B",
        "description": "Software specifications table",
        "fields": ["rows"],
        "row_fields": ["sr_no", "name", "maker", "qty"],
    },
    "division_of_eng": {
        "family": "B",
        "description": "Division of engineering, software development, and erection/commissioning services",
        "fields": ["matrix_rows", "note_paragraphs", "training_days", "training_persons"],
        "row_fields": ["No", "ITEM", "BD", "BE", "DD", "SU", "ER", "COM"],  # Table 7: Responsibility Matrix columns
    },

    # ===== Family C: Mixed-Field Sections =====
    "overview": {
        "family": "C",
        "description": "Overview section with multiple structured fields",
        "fields": [
            "process_summary",
            "intro_text",
            "system_objective",
            "existing_system",
            "integration",
            "tangible_benefits",
            "intangible_benefits",
        ],
    },
    "customer_training": {
        "family": "C",
        "description": "Customer training details",
        "fields": ["paragraph", "persons", "days"],
    },
    "third_party_sw": {
        "family": "C",
        "description": "Third party software details",
        "fields": ["sw4_name", "remote_link_text"],
    },
    "supervisors": {
        "family": "C",
        "description": "Supervisors and man-days breakdown",
        "fields": ["intro_text", "pm_days", "dev_days", "comm_days", "total_man_days"],
    },
    "poc": {
        "family": "C",
        "description": "Complimentary Proof of Concepts",
        "fields": ["paragraphs", "intro_text", "name", "description"],
    },
    "disclaimer": {
        "family": "C",
        "description": "Disclaimer sections",
        "fields": ["sections"],  # Array of {title, paragraphs}
    },

    # ===== Family D: List-Based Sections =====
    "features": {
        "family": "D",
        "description": "Design scope of work features",
        "fields": ["intro_text", "items"],
        "item_fields": ["id", "title", "brief", "description"],
    },
    "documentation_control": {
        "family": "D",
        "description": "Documentation control items",
        "fields": ["intro_text", "items", "custom_items"],
    },
    "work_completion": {
        "family": "D",
        "description": "Work completion criteria",
        "fields": ["criteria", "custom_items", "paragraphs"],
    },
    "buyer_obligations": {
        "family": "D",
        "description": "Buyer obligations list",
        "fields": ["intro_text", "items", "custom_items"],
    },
    "exclusion_list": {
        "family": "D",
        "description": "Exclusion list items",
        "fields": ["intro_paragraphs", "items", "custom_items"],
    },
    "buyer_prerequisites": {
        "family": "D",
        "description": "Buyer prerequisites list",
        "fields": ["items"],
    },

    # ===== Family E: Image-Backed Sections =====
    "system_config": {
        "family": "E",
        "description": "System configuration diagram with descriptive text",
        "fields": ["intro_text", "placeholder_text", "note"],
    },
    "overall_gantt": {
        "family": "E",
        "description": "Overall Gantt chart with descriptive note",
        "fields": ["placeholder_text", "note"],
    },
    "shutdown_gantt": {
        "family": "E",
        "description": "Shutdown Gantt chart with descriptive note",
        "fields": ["placeholder_text", "note_label", "note"],
    },
}

# Suppressed sections (no AI button) - per requirements 1.1
SUPPRESSED_SECTIONS = {"cover", "revision_history", "abbreviations"}


def get_section_schema(section_key: str) -> SectionSchema | None:
    """
    Get the schema definition for a section key.
    
    Args:
        section_key: The section identifier
        
    Returns:
        SectionSchema dict or None if not found
    """
    return SECTION_SCHEMAS.get(section_key)


def get_section_family(section_key: str) -> ContentFamily | None:
    """
    Get the content family mode for a section key.
    
    Args:
        section_key: The section identifier
        
    Returns:
        Content family letter (A/B/C/D/E) or None if not found
    """
    schema = SECTION_SCHEMAS.get(section_key)
    return schema["family"] if schema else None


def is_suppressed(section_key: str) -> bool:
    """
    Check if a section should not have AI suggestions button.
    
    Args:
        section_key: The section identifier
        
    Returns:
        True if the section is suppressed, False otherwise
    """
    return section_key in SUPPRESSED_SECTIONS


def get_output_format_instruction(family: ContentFamily) -> str:
    """
    Get LLM output format instruction for a content family.
    
    Args:
        family: Content family letter (A/B/C/D/E)
        
    Returns:
        Instruction text for the LLM prompt
    """
    instructions = {
        "A": "Output clean HTML with <p>, <ul>, <li>, <strong>, and <em> tags only. No markdown code fences.",
        "B": "Output a JSON array of row objects with the specified field names. No markdown code fences.",
        "C": "Output a JSON object with the specified field keys. No markdown code fences.",
        "D": "Output a JSON array of items with the specified structure. No markdown code fences.",
        "E": "Output a JSON object with text description fields only (no image data). No markdown code fences.",
    }
    return instructions.get(family, "")
