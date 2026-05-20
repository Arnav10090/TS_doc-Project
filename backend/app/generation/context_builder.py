"""
Context builder for Jinja2 template rendering.
Maps section data to template variables.
"""
from typing import Dict, Any, List, Tuple
from pathlib import Path
from docxtpl import InlineImage
from docx.shared import Cm
import re
import base64

from app.generation.completion import strip_html


def s(sections_dict: Dict[str, Any], key: str) -> Dict[str, Any]:
    """Safely retrieve section content with fallback to empty dict."""
    return sections_dict.get(key, {})


def is_custom_section_key(key: str) -> bool:
    """Check if a section key is a custom section."""
    pattern = r'^custom_section_\d+_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    return bool(re.match(pattern, key))


def get_ordered_sections(
    predefined_sections: List[str],
    all_sections: Dict[str, Any]
) -> List[str]:
    """
    Get ordered list of sections (predefined + custom).
    Custom sections are rendered at the end of the document, after all predefined sections.
    
    Args:
        predefined_sections: List of predefined section keys in order
        all_sections: Dictionary mapping section_key to content dict
        
    Returns:
        Ordered list of all section keys
    """
    ordered: List[str] = []
    
    # Add all predefined sections first
    ordered.extend(predefined_sections)
    
    # Add custom sections at the end
    custom_sections = [
        key for key in all_sections.keys()
        if is_custom_section_key(key)
    ]
    
    # Sort custom sections by timestamp (extracted from key) to maintain insertion order
    custom_sections.sort(key=lambda k: int(k.split('_')[2]))
    
    ordered.extend(custom_sections)
    
    return ordered


def process_custom_section(
    section_key: str,
    content: Dict[str, Any],
    section_number: int,
    template: Any,
    upload_dir: str,
    project_id: str
) -> Dict[str, Any]:
    """
    Process a custom section into DOCX-renderable format.
    
    Args:
        section_key: The custom section key
        content: The section content dictionary
        section_number: The section number in the document
        template: DocxTemplate instance for InlineImage creation
        upload_dir: Base upload directory path
        project_id: Project ID for image paths
        
    Returns:
        Dictionary with processed custom section data
    """
    title = content.get('title', 'NEW SECTION')
    subsections = content.get('subsections', [])
    
    processed_subsections = []
    for idx, subsection in enumerate(subsections):
        subsection_number = idx + 1
        processed = process_custom_subsection(
            subsection,
            section_number,
            subsection_number,
            template,
            upload_dir,
            project_id
        )
        processed_subsections.append(processed)
    
    return {
        'section_number': section_number,
        'title': title,
        'subsections': processed_subsections
    }


def process_custom_subsection(
    subsection: Dict[str, Any],
    section_number: int,
    subsection_number: int,
    template: Any,
    upload_dir: str,
    project_id: str
) -> Dict[str, Any]:
    """
    Process a custom subsection into DOCX-renderable format.
    
    Args:
        subsection: The subsection dictionary
        section_number: Parent section number
        subsection_number: Subsection number within parent
        template: DocxTemplate instance for InlineImage creation
        upload_dir: Base upload directory path
        project_id: Project ID for image paths
        
    Returns:
        Dictionary with processed subsection data
    """
    name = subsection.get('name', '')
    content_type = subsection.get('contentType', '')
    data = subsection.get('data', {})
    
    processed = {
        'section_number': section_number,
        'subsection_number': subsection_number,
        'name': name,
        'content_type': content_type
    }
    
    if content_type == 'table':
        processed['table_data'] = process_table_data(data)
    elif content_type == 'image':
        processed['image'] = process_image_data(data, template, upload_dir, project_id)
    elif content_type == 'paragraph':
        processed['paragraph_html'] = strip_html(data.get('html', ''))
    
    return processed


def process_table_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process table data for DOCX rendering.
    
    Args:
        data: Table data with columns and rows
        
    Returns:
        Dictionary with columns and rows
    """
    columns = data.get('columns', [])
    rows = data.get('rows', [])
    
    return {
        'columns': columns,
        'rows': rows
    }


def process_image_data(
    data: Dict[str, Any],
    template: Any,
    upload_dir: str,
    project_id: str
) -> Any:
    """
    Process image data for DOCX rendering.
    
    Args:
        data: Image data with base64, filename, mimeType
        template: DocxTemplate instance for InlineImage creation
        upload_dir: Base upload directory path
        project_id: Project ID for image paths
        
    Returns:
        InlineImage object or placeholder string
    """
    base64_data = data.get('base64', '')
    
    if not base64_data:
        return "[Image — To Be Inserted]"
    
    try:
        # Save base64 image to temporary file
        images_dir = Path(upload_dir) / "images" / project_id / "custom"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        # Extract base64 data (remove data:image/png;base64, prefix if present)
        if ',' in base64_data:
            base64_data = base64_data.split(',', 1)[1]
        
        # Decode base64
        image_bytes = base64.b64decode(base64_data)
        
        # Generate unique filename
        filename = data.get('filename', 'image.png')
        image_path = images_dir / filename
        
        # Write image file
        with open(image_path, 'wb') as f:
            f.write(image_bytes)
        
        # Create InlineImage
        return InlineImage(template, str(image_path), width=Cm(15))
    except Exception:
        return "[Image — To Be Inserted]"


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
    
    # Note: Custom sections will be processed in finalize_context_with_images
    # after template is loaded, since they may contain images requiring InlineImage
    context["_custom_sections_raw"] = all_sections
    context["_project_id"] = project_id
    context["_upload_dir"] = upload_dir
    
    return context


def finalize_context_with_images(context: Dict[str, Any], template: Any) -> Dict[str, Any]:
    """
    Convert image paths to InlineImage objects using the template instance.
    Also processes custom sections with their images.
    This must be called after loading the DocxTemplate.
    
    Args:
        context: Context dictionary with image paths
        template: DocxTemplate instance
    
    Returns:
        Updated context with InlineImage objects and processed custom sections
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
    
    # Process custom sections
    all_sections = context.get("_custom_sections_raw", {})
    project_id = context.get("_project_id", "")
    upload_dir = context.get("_upload_dir", "")
    
    # Import VALID_SECTION_KEYS from sections router
    from app.sections.router import VALID_SECTION_KEYS
    
    # Get ordered sections (predefined + custom)
    ordered_sections = get_ordered_sections(VALID_SECTION_KEYS, all_sections)
    
    # Calculate section numbers
    section_numbers = {}
    section_counter = 0
    for section_key in ordered_sections:
        section_counter += 1
        section_numbers[section_key] = section_counter
    
    # Process custom sections
    custom_sections_processed = []
    for section_key in ordered_sections:
        if is_custom_section_key(section_key):
            content = all_sections.get(section_key, {})
            section_number = section_numbers[section_key]
            processed = process_custom_section(
                section_key,
                content,
                section_number,
                template,
                upload_dir,
                project_id
            )
            custom_sections_processed.append(processed)
    
    context["custom_sections"] = custom_sections_processed
    context["section_numbers"] = section_numbers
    
    # Clean up temporary keys
    context.pop("_custom_sections_raw", None)
    context.pop("_project_id", None)
    context.pop("_upload_dir", None)
    
    return context
