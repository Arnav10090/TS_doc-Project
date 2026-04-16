"""
Sections API router.
Handles all section data endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database import get_db
from app.sections import service
from app.sections.schemas import SectionDataCreate, SectionDataResponse

router = APIRouter(prefix="/api/v1/projects", tags=["sections"])

# All 31 valid section keys
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


@router.get("/{project_id}/sections", response_model=List[SectionDataResponse])
async def get_all_sections(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all section data for a project."""
    sections = await service.get_all_sections(db, project_id)
    return [
        SectionDataResponse(
            id=str(s.id),
            project_id=str(s.project_id),
            section_key=s.section_key,
            content=s.content,
            updated_at=s.updated_at,
        )
        for s in sections
    ]


@router.get("/{project_id}/sections/{section_key}", response_model=SectionDataResponse)
async def get_section(
    project_id: UUID, section_key: str, db: AsyncSession = Depends(get_db)
):
    """Get a single section by key. Auto-creates with empty content if it doesn't exist."""
    if section_key not in VALID_SECTION_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid section_key. Must be one of: {', '.join(VALID_SECTION_KEYS)}",
        )
    
    section = await service.get_section(db, project_id, section_key)
    return SectionDataResponse(
        id=str(section.id),
        project_id=str(section.project_id),
        section_key=section.section_key,
        content=section.content,
        updated_at=section.updated_at,
    )


@router.put("/{project_id}/sections/{section_key}", response_model=SectionDataResponse)
async def upsert_section(
    project_id: UUID,
    section_key: str,
    section_data: SectionDataCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create or update section data."""
    if section_key not in VALID_SECTION_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid section_key. Must be one of: {', '.join(VALID_SECTION_KEYS)}",
        )
    
    section = await service.upsert_section(
        db, project_id, section_key, section_data.content
    )
    return SectionDataResponse(
        id=str(section.id),
        project_id=str(section.project_id),
        section_key=section.section_key,
        content=section.content,
        updated_at=section.updated_at,
    )
