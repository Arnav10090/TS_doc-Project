"""
Context builder for Jinja2 template rendering.
Maps section data to template variables.
"""
from typing import Dict, Any
from pathlib import Path
from docxtpl import InlineImage
from docx.shared import Cm

from app.generation.completion import strip_html


def s(sections_dict: Dict[str, Any], key: str) -> Dict[str, Any]:
    """Safely retrieve section content with fallback to empty dict."""
    return sections_dict.get(key, {})


def build_context(
    project: Any,
    all_sections: Dict[str, Any],
    upload_dir: str,
) -> Dict[str, Any]:
    """
    Build Jinja2 context dictionary from project and section data.
    
    Args:
        project: Project model instance
        all_sections: Dictionary mapping section_key to content dict
        upload_dir: Base upload directory path
    
    Returns:
        Context dictionary for template rendering
    """
    context = {}
    
    # Map Project fields to context variables
    context["SolutionName"] = project.solution_name or ""
    context["SolutionFullName"] = project.solution_full_name or ""
    context["SolutionAbbreviation"] = project.solution_abbreviation or ""
    context["ClientName"] = project.client_name or ""
    context["CLIENTNAME"] = project.client_name or ""  # Uppercase variant
    context["ClientLocation"] = project.client_location or ""
    context["CLIENTLOCATION"] = project.client_location or ""  # Uppercase variant
    context["ClientAbbreviation"] = project.client_abbreviation or ""
    context["RefNumber"] = project.ref_number or ""
    context["DocDate"] = project.doc_date or ""
    context["DocVersion"] = project.doc_version or ""
    
    # Executive summary
    executive_summary = s(all_sections, "executive_summary")
    para1 = executive_summary.get("para1", "")
    context["ExecutiveSummaryPara1"] = strip_html(para1)
    
    # Introduction
    introduction = s(all_sections, "introduction")
    context["TenderReference"] = introduction.get("tender_reference", "")
    context["TenderDate"] = introduction.get("tender_date", "")
    
    # Abbreviations
    abbreviations = s(all_sections, "abbreviations")
    context["abbreviation_rows"] = abbreviations.get("rows", [])
    
    # Process flow
    process_flow = s(all_sections, "process_flow")
    text = process_flow.get("text", "")
    context["ProcessFlowDescription"] = strip_html(text)
    
    # Overview
    overview = s(all_sections, "overview")
    context["SystemObjective"] = strip_html(overview.get("system_objective", ""))
    context["ExistingSystemDescription"] = strip_html(overview.get("existing_system", ""))
    context["IntegrationDescription"] = strip_html(overview.get("integration", ""))
    context["TangibleBenefits"] = strip_html(overview.get("tangible_benefits", ""))
    context["IntangibleBenefits"] = strip_html(overview.get("intangible_benefits", ""))
    
    # Features
    features = s(all_sections, "features")
    context["features"] = features.get("items", [])
    
    # Remote support
    remote_support = s(all_sections, "remote_support")
    text = remote_support.get("text", "")
    context["RemoteSupportText"] = strip_html(text)
    
    # Documentation control
    documentation_control = s(all_sections, "documentation_control")
    context["doc_control_custom"] = documentation_control.get("custom_items", [])
    
    # Customer training
    customer_training = s(all_sections, "customer_training")
    context["TrainingPersons"] = customer_training.get("persons", "")
    context["TrainingDays"] = customer_training.get("days", "")
    
    # FAT condition
    fat_condition = s(all_sections, "fat_condition")
    text = fat_condition.get("text", "")
    context["FATCondition"] = strip_html(text)
    
    # Tech stack - pad to 6 rows
    tech_stack = s(all_sections, "tech_stack")
    rows = tech_stack.get("rows", [])
    while len(rows) < 6:
        rows.append({"component": "", "technology": ""})
    context["ts_rows"] = rows[:6]
    
    # Hardware specs - pad to 6 rows
    hardware_specs = s(all_sections, "hardware_specs")
    rows = hardware_specs.get("rows", [])
    while len(rows) < 6:
        rows.append({
            "specs_line1": "",
            "specs_line2": "",
            "specs_line3": "",
            "specs_line4": "",
            "maker": "",
            "qty": ""
        })
    context["hw_rows"] = rows[:6]
    
    # Software specs - pad to 9 rows with maker default "-"
    software_specs = s(all_sections, "software_specs")
    rows = software_specs.get("rows", [])
    while len(rows) < 9:
        rows.append({"name": "", "maker": "-"})
    # Ensure maker defaults to "-" for existing rows
    for row in rows:
        if not row.get("maker"):
            row["maker"] = "-"
    context["sw_rows"] = rows[:9]
    
    # Third party software
    third_party_sw = s(all_sections, "third_party_sw")
    context["ThirdPartySW"] = third_party_sw.get("sw4_name", "")
    
    # Supervisors
    supervisors = s(all_sections, "supervisors")
    context["PMDays"] = supervisors.get("pm_days", "")
    context["DevDays"] = supervisors.get("dev_days", "")
    context["CommDays"] = supervisors.get("comm_days", "")
    context["TotalManDays"] = supervisors.get("total_man_days", "")
    
    # Value addition
    value_addition = s(all_sections, "value_addition")
    text = value_addition.get("text", "")
    context["ValueAddedOfferings"] = strip_html(text)
    
    # Work completion
    work_completion = s(all_sections, "work_completion")
    context["work_completion_custom"] = work_completion.get("custom_items", [])
    
    # Buyer obligations
    buyer_obligations = s(all_sections, "buyer_obligations")
    context["buyer_obligations_custom"] = buyer_obligations.get("custom_items", [])
    
    # Exclusion list
    exclusion_list = s(all_sections, "exclusion_list")
    context["exclusion_custom"] = exclusion_list.get("custom_items", [])
    
    # Buyer prerequisites
    buyer_prerequisites = s(all_sections, "buyer_prerequisites")
    context["buyer_prereqs"] = buyer_prerequisites.get("items", [])
    
    # Revision history
    revision_history = s(all_sections, "revision_history")
    context["revision_rows"] = revision_history.get("rows", [])
    
    # POC
    poc = s(all_sections, "poc")
    context["POCName"] = poc.get("name", "")
    poc_desc = poc.get("description", "")
    context["POCDescription"] = strip_html(poc_desc)
    
    # Handle images - check if files exist and create InlineImage or placeholder
    project_id = str(project.id)
    images_dir = Path(upload_dir) / "images" / project_id
    
    # Architecture diagram
    arch_path = images_dir / "architecture.png"
    if arch_path.exists():
        # Note: InlineImage requires a DocxTemplate instance, will be created during rendering
        context["architecture_diagram"] = str(arch_path)
    else:
        context["architecture_diagram"] = "[Architecture Diagram — To Be Inserted]"
    
    # Overall Gantt chart
    gantt_overall_path = images_dir / "gantt_overall.png"
    if gantt_overall_path.exists():
        context["overall_gantt"] = str(gantt_overall_path)
    else:
        context["overall_gantt"] = "[Overall Gantt Chart — To Be Inserted]"
    
    # Shutdown Gantt chart
    gantt_shutdown_path = images_dir / "gantt_shutdown.png"
    if gantt_shutdown_path.exists():
        context["shutdown_gantt"] = str(gantt_shutdown_path)
    else:
        context["shutdown_gantt"] = "[Shutdown Gantt Chart — To Be Inserted]"
    
    return context


def finalize_context_with_images(context: Dict[str, Any], template: Any) -> Dict[str, Any]:
    """
    Convert image paths to InlineImage objects using the template instance.
    This must be called after loading the DocxTemplate.
    
    Args:
        context: Context dictionary with image paths
        template: DocxTemplate instance
    
    Returns:
        Updated context with InlineImage objects
    """
    # Convert architecture diagram path to InlineImage
    if isinstance(context.get("architecture_diagram"), str) and not context["architecture_diagram"].startswith("["):
        try:
            context["architecture_diagram"] = InlineImage(template, context["architecture_diagram"], width=Cm(15))
        except Exception:
            context["architecture_diagram"] = "[Architecture Diagram — To Be Inserted]"
    
    # Convert overall gantt path to InlineImage
    if isinstance(context.get("overall_gantt"), str) and not context["overall_gantt"].startswith("["):
        try:
            context["overall_gantt"] = InlineImage(template, context["overall_gantt"], width=Cm(15))
        except Exception:
            context["overall_gantt"] = "[Overall Gantt Chart — To Be Inserted]"
    
    # Convert shutdown gantt path to InlineImage
    if isinstance(context.get("shutdown_gantt"), str) and not context["shutdown_gantt"].startswith("["):
        try:
            context["shutdown_gantt"] = InlineImage(template, context["shutdown_gantt"], width=Cm(15))
        except Exception:
            context["shutdown_gantt"] = "[Shutdown Gantt Chart — To Be Inserted]"
    
    return context
