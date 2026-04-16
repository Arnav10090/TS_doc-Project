"""
Document generation service.
Handles Word document generation using docxtpl.
"""
from pathlib import Path
from typing import Dict, Any, Tuple
from docxtpl import DocxTemplate

from app.generation.context_builder import build_context, finalize_context_with_images


def generate_safe_filename(text: str) -> str:
    """
    Generate safe filename by replacing spaces with underscores and slashes with hyphens.
    
    Args:
        text: Input text
    
    Returns:
        Safe filename string
    """
    safe = text.replace(" ", "_").replace("/", "-")
    return safe


def generate_document(
    project: Any,
    all_sections: Dict[str, Any],
    template_path: str,
    upload_dir: str,
    version_number: int,
) -> Tuple[str, str]:
    """
    Generate a Word document from project and section data.
    
    Args:
        project: Project model instance
        all_sections: Dictionary mapping section_key to content dict
        template_path: Path to Jinja2 Word template
        upload_dir: Base upload directory path
        version_number: Auto-incremented version number (1, 2, 3...)
    
    Returns:
        Tuple of (file_path, filename)
    """
    # Load template
    template = DocxTemplate(template_path)
    
    # Build context
    context = build_context(project, all_sections, upload_dir)
    
    # Finalize context with InlineImage objects
    context = finalize_context_with_images(context, template)
    
    # Render template
    template.render(context)
    
    # Prepare output directory
    project_id = str(project.id)
    output_dir = Path(upload_dir) / "versions" / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename with truncation
    client_name = project.client_name[:30]  # Truncate to 30 chars
    solution_name = project.solution_name[:20]  # Truncate to 20 chars
    safe_client = generate_safe_filename(client_name)
    safe_solution = generate_safe_filename(solution_name)
    
    filename = f"TS_{safe_client}_{safe_solution}_v{version_number}.docx"
    file_path = output_dir / filename
    
    # Save document
    template.save(str(file_path))
    
    return str(file_path), filename
