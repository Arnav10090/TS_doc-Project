"""
Completion calculation logic for sections.
Determines which sections are complete based on required field rules.
"""
import re
from typing import Dict, Any


def s(sections_dict: Dict[str, Any], key: str) -> Dict[str, Any]:
    """Safely retrieve section content with fallback to empty dict."""
    return sections_dict.get(key, {})


def strip_html(text: str) -> str:
    """Remove HTML tags from rich text content."""
    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Remove extra whitespace
    clean = clean.strip()
    return clean


def calculate_section_completion(sections_dict: Dict[str, Any]) -> Dict[str, bool]:
    """
    Calculate completion status for all 31 sections.
    
    Args:
        sections_dict: Dictionary mapping section_key to content dict
    
    Returns:
        Dictionary mapping section_key to completion boolean
    """
    completion = {}
    
    # Cover section (3 required fields)
    cover = s(sections_dict, "cover")
    completion["cover"] = bool(
        cover.get("solution_full_name")
        and cover.get("client_name")
        and cover.get("client_location")
    )
    
    # Revision history (at least 1 row with details)
    revision_history = s(sections_dict, "revision_history")
    rows = revision_history.get("rows", [])
    completion["revision_history"] = any(
        row.get("details") for row in rows
    )
    
    # Executive summary (para1 with content after HTML stripping)
    executive_summary = s(sections_dict, "executive_summary")
    para1 = executive_summary.get("para1", "")
    completion["executive_summary"] = bool(strip_html(para1))
    
    # Introduction (tender_reference and tender_date)
    introduction = s(sections_dict, "introduction")
    completion["introduction"] = bool(
        introduction.get("tender_reference")
        and introduction.get("tender_date")
    )
    
    # Abbreviations (row 13 abbreviation field)
    abbreviations = s(sections_dict, "abbreviations")
    rows = abbreviations.get("rows", [])
    completion["abbreviations"] = False
    if len(rows) >= 14:  # Row 13 is index 13 (0-indexed)
        completion["abbreviations"] = bool(rows[13].get("abbreviation"))
    
    # Process flow (text with content)
    process_flow = s(sections_dict, "process_flow")
    text = process_flow.get("text", "")
    completion["process_flow"] = bool(strip_html(text))
    
    # Overview (system_objective and existing_system)
    overview = s(sections_dict, "overview")
    completion["overview"] = bool(
        overview.get("system_objective")
        and overview.get("existing_system")
    )
    
    # Features (at least 1 item with title and description)
    features = s(sections_dict, "features")
    items = features.get("items", [])
    completion["features"] = any(
        item.get("title") and item.get("description")
        for item in items
    )
    
    # Remote support (text field)
    remote_support = s(sections_dict, "remote_support")
    completion["remote_support"] = bool(remote_support.get("text"))
    
    # Documentation control (auto-complete on visit)
    completion["documentation_control"] = "documentation_control" in sections_dict
    
    # Customer training (persons and days)
    customer_training = s(sections_dict, "customer_training")
    completion["customer_training"] = bool(
        customer_training.get("persons")
        and customer_training.get("days")
    )
    
    # System config (auto-complete on visit)
    completion["system_config"] = "system_config" in sections_dict
    
    # FAT condition (text field)
    fat_condition = s(sections_dict, "fat_condition")
    completion["fat_condition"] = bool(fat_condition.get("text"))
    
    # Tech stack (first row component and technology)
    tech_stack = s(sections_dict, "tech_stack")
    rows = tech_stack.get("rows", [])
    completion["tech_stack"] = False
    if rows:
        first_row = rows[0]
        completion["tech_stack"] = bool(
            first_row.get("component")
            and first_row.get("technology")
        )
    
    # Hardware specs (first row specs_line1 and maker)
    hardware_specs = s(sections_dict, "hardware_specs")
    rows = hardware_specs.get("rows", [])
    completion["hardware_specs"] = False
    if rows:
        first_row = rows[0]
        completion["hardware_specs"] = bool(
            first_row.get("specs_line1")
            and first_row.get("maker")
        )
    
    # Software specs (first row name)
    software_specs = s(sections_dict, "software_specs")
    rows = software_specs.get("rows", [])
    completion["software_specs"] = False
    if rows:
        first_row = rows[0]
        completion["software_specs"] = bool(first_row.get("name"))
    
    # Third party software (sw4_name)
    third_party_sw = s(sections_dict, "third_party_sw")
    completion["third_party_sw"] = bool(third_party_sw.get("sw4_name"))
    
    # Overall gantt (auto-complete on visit)
    completion["overall_gantt"] = "overall_gantt" in sections_dict
    
    # Shutdown gantt (auto-complete on visit)
    completion["shutdown_gantt"] = "shutdown_gantt" in sections_dict
    
    # Supervisors (4 required fields)
    supervisors = s(sections_dict, "supervisors")
    completion["supervisors"] = bool(
        supervisors.get("pm_days")
        and supervisors.get("dev_days")
        and supervisors.get("comm_days")
        and supervisors.get("total_man_days")
    )
    
    # Scope definitions (auto-complete on visit)
    completion["scope_definitions"] = "scope_definitions" in sections_dict
    
    # Division of engineering (auto-complete on visit)
    completion["division_of_eng"] = "division_of_eng" in sections_dict
    
    # Work completion (auto-complete on visit)
    completion["work_completion"] = "work_completion" in sections_dict
    
    # Buyer obligations (auto-complete on visit)
    completion["buyer_obligations"] = "buyer_obligations" in sections_dict
    
    # Exclusion list (auto-complete on visit)
    completion["exclusion_list"] = "exclusion_list" in sections_dict
    
    # Binding conditions (auto-complete on visit - locked section)
    completion["binding_conditions"] = "binding_conditions" in sections_dict
    
    # Cybersecurity (auto-complete on visit - locked section)
    completion["cybersecurity"] = "cybersecurity" in sections_dict
    
    # Disclaimer (auto-complete on visit - locked section)
    completion["disclaimer"] = "disclaimer" in sections_dict
    
    # Value addition (text field)
    value_addition = s(sections_dict, "value_addition")
    text = value_addition.get("text", "")
    completion["value_addition"] = bool(strip_html(text))
    
    # Buyer prerequisites (at least 1 non-empty item)
    buyer_prerequisites = s(sections_dict, "buyer_prerequisites")
    items = buyer_prerequisites.get("items", [])
    completion["buyer_prerequisites"] = any(
        bool(item.strip()) for item in items if isinstance(item, str)
    )
    
    # POC (name and description)
    poc = s(sections_dict, "poc")
    completion["poc"] = bool(
        poc.get("name")
        and poc.get("description")
    )
    
    return completion
