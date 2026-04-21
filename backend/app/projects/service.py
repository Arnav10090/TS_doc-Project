"""
Service layer for project operations.
Handles database interactions for projects.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from app.projects.models import Project
from app.projects.schemas import ProjectCreate, ProjectUpdate
from app.generation.completion import calculate_section_completion
from app.sections.models import SectionData
from app.projects import revision_service


# Default abbreviation rows for new projects
DEFAULT_ROWS = [
    {"sr_no": 1, "abbreviation": "JSPL", "description": "Jindal Steel & Power Ltd.", "locked": True},
    {"sr_no": 2, "abbreviation": "HIL", "description": "Hitachi India Pvt. Ltd.", "locked": True},
    {"sr_no": 3, "abbreviation": "SV", "description": "Supervisor", "locked": True},
    {"sr_no": 4, "abbreviation": "HMI", "description": "Human Machine Interface", "locked": True},
    {"sr_no": 5, "abbreviation": "PLC", "description": "Programmable Logic Controller", "locked": True},
    {"sr_no": 6, "abbreviation": "EOT", "description": "Electric Overhead Travelling Crane", "locked": True},
    {"sr_no": 7, "abbreviation": "HHT", "description": "Hand-held Terminal", "locked": True},
    {"sr_no": 8, "abbreviation": "LT", "description": "Long Travel of EOT Crane", "locked": True},
    {"sr_no": 9, "abbreviation": "CT", "description": "Cross Travel of EOT Crane", "locked": True},
    {"sr_no": 10, "abbreviation": "L1", "description": "Level-1 system", "locked": True},
    {"sr_no": 11, "abbreviation": "L2", "description": "Level-2 system", "locked": True},
    {"sr_no": 12, "abbreviation": "L3", "description": "Level-3 system", "locked": True},
    {"sr_no": 13, "abbreviation": "", "description": "Plate Mill Yard Management System", "locked": False},
    {"sr_no": 14, "abbreviation": "HTC", "description": "Heat Treatment Complex", "locked": True}
]


def build_cover_content(project_data: ProjectCreate) -> dict:
    """
    Build Cover section content from project form data.
    
    Args:
        project_data: Project creation data from the form
        
    Returns:
        Dictionary with Cover section content structure
    """
    return {
        "solution_full_name": project_data.solution_full_name,
        "client_name": project_data.client_name,
        "client_location": project_data.client_location,
        "ref_number": project_data.ref_number or "",
        "doc_date": project_data.doc_date or "",
        "doc_version": project_data.doc_version or ""
    }


def build_abbreviations_content(project_data: ProjectCreate) -> dict:
    """
    Build Abbreviations section content from project form data.
    
    Args:
        project_data: Project creation data from the form
        
    Returns:
        Dictionary with Abbreviations section content structure (rows array)
    """
    # Start with a copy of default rows
    rows = [row.copy() for row in DEFAULT_ROWS]
    
    # Populate row 13 with solution abbreviation if provided
    if project_data.solution_abbreviation:
        rows[12]["abbreviation"] = project_data.solution_abbreviation
    
    # Conditionally append row 15 if client abbreviation provided
    if project_data.client_abbreviation:
        rows.append({
            "sr_no": 15,
            "abbreviation": project_data.client_abbreviation,
            "description": project_data.client_name,
            "locked": False
        })
    
    return {"rows": rows}


async def create_project(db: AsyncSession, project_data: ProjectCreate) -> Project:
    """
    Create a new project with pre-populated Cover and Abbreviations sections.
    
    All operations occur within a single transaction to ensure atomicity.
    If section creation fails, the entire project creation is rolled back.
    """
    try:
        # Create project record
        project = Project(**project_data.model_dump())
        db.add(project)
        
        # Flush to get project.id without committing the transaction
        await db.flush()
        
        # Create Cover section with form field mappings
        cover_content = build_cover_content(project_data)
        cover_section = SectionData(
            project_id=project.id,
            section_key='cover',
            content=cover_content
        )
        db.add(cover_section)
        
        # Create Abbreviations section with default rows + form data
        abbreviations_content = build_abbreviations_content(project_data)
        abbreviations_section = SectionData(
            project_id=project.id,
            section_key='abbreviations',
            content=abbreviations_content
        )
        db.add(abbreviations_section)
        
        # Create initial revision history entry
        await revision_service.create_initial_revision_entry(db, project.id)
        
        # Commit transaction only after all operations succeed
        await db.commit()
        await db.refresh(project)
        return project
        
    except Exception as e:
        # Rollback transaction on any error
        await db.rollback()
        raise


async def get_all_projects(db: AsyncSession) -> List[Project]:
    """Get all projects with their sections for completion calculation."""
    result = await db.execute(
        select(Project).options(selectinload(Project.sections))
    )
    return result.scalars().all()


async def get_project_by_id(db: AsyncSession, project_id: UUID) -> Optional[Project]:
    """Get a project by ID with all sections loaded."""
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.sections))
        .where(Project.id == project_id)
    )
    return result.scalar_one_or_none()


async def update_project(
    db: AsyncSession, project_id: UUID, project_data: ProjectUpdate
) -> Optional[Project]:
    """Update a project's fields."""
    project = await get_project_by_id(db, project_id)
    if not project:
        return None
    
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project_id: UUID) -> bool:
    """Delete a project and all associated data (cascade)."""
    result = await db.execute(
        delete(Project).where(Project.id == project_id)
    )
    await db.commit()
    return result.rowcount > 0
