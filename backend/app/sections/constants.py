"""
Shared constants for section keys and validation patterns.

Extracted from router.py to avoid circular imports when project
service needs the canonical section-key list.
"""
import re

# All 31 valid predefined section keys
VALID_SECTION_KEYS = [
    "cover",
    "revision_history",
    "executive_summary",
    "introduction",
    "abbreviations",
    "process_flow",
    "overview",
    "features",
    "remote_support",
    "documentation_control",
    "customer_training",
    "system_config",
    "fat_condition",
    "tech_stack",
    "hardware_specs",
    "software_specs",
    "third_party_sw",
    "overall_gantt",
    "shutdown_gantt",
    "supervisors",
    "scope_definitions",
    "division_of_eng",
    "work_completion",
    "buyer_obligations",
    "exclusion_list",
    "binding_conditions",
    "cybersecurity",
    "disclaimer",
    "value_addition",
    "buyer_prerequisites",
    "poc",
]

# Regex patterns for custom section keys
CUSTOM_SECTION_PATTERN = re.compile(
    r'^custom_section_\d+_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
)
CUSTOM_SUBSECTION_PATTERN = re.compile(
    r'^custom_subsection_\d+_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
)
