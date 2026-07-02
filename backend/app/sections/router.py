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
from app.sections.constants import (
    VALID_SECTION_KEYS,
    CUSTOM_SECTION_PATTERN,
    CUSTOM_SUBSECTION_PATTERN,
)

router = APIRouter(prefix="/api/v1/projects", tags=["sections"])


def is_valid_section_key(section_key: str) -> bool:
    """
    Validate section key against predefined keys and custom patterns.
    
    Args:
        section_key: The section key to validate
        
    Returns:
        True if the key is valid (predefined or matches custom pattern), False otherwise
    """
    # Check if it's a predefined section key
    if section_key in VALID_SECTION_KEYS:
        return True
    
    # Check if it matches custom section pattern
    if CUSTOM_SECTION_PATTERN.match(section_key):
        return True
    
    # Check if it matches custom subsection pattern
    if CUSTOM_SUBSECTION_PATTERN.match(section_key):
        return True
    
    return False


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
    if not is_valid_section_key(section_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid section_key. Must be one of the predefined keys ({', '.join(VALID_SECTION_KEYS)}) or match custom section pattern (custom_section_{{timestamp}}_{{uuid}} or custom_subsection_{{timestamp}}_{{uuid}})",
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
    if not is_valid_section_key(section_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid section_key. Must be one of the predefined keys ({', '.join(VALID_SECTION_KEYS)}) or match custom section pattern (custom_section_{{timestamp}}_{{uuid}} or custom_subsection_{{timestamp}}_{{uuid}})",
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


@router.delete("/{project_id}/sections/{section_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    project_id: UUID,
    section_key: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a section by key."""
    if not is_valid_section_key(section_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid section_key. Must be one of the predefined keys ({', '.join(VALID_SECTION_KEYS)}) or match custom section pattern (custom_section_{{timestamp}}_{{uuid}} or custom_subsection_{{timestamp}}_{{uuid}})",
        )
    
    # Prevent deletion of cover section
    if section_key == "cover":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the cover section",
        )
    
    await service.delete_section(db, project_id, section_key)
    return None
