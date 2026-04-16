"""
Service layer for section data operations.
Handles database interactions for section data.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.sections.models import SectionData


async def get_all_sections(db: AsyncSession, project_id: UUID) -> List[SectionData]:
    """Get all section data for a project."""
    result = await db.execute(
        select(SectionData).where(SectionData.project_id == project_id)
    )
    return result.scalars().all()


async def get_section(
    db: AsyncSession, project_id: UUID, section_key: str
) -> Optional[SectionData]:
    """Get a single section by key, creating it if it doesn't exist."""
    result = await db.execute(
        select(SectionData)
        .where(SectionData.project_id == project_id)
        .where(SectionData.section_key == section_key)
    )
    section = result.scalar_one_or_none()
    
    # Auto-create section with empty content if it doesn't exist (Req 2.4, 50.6)
    if not section:
        section = SectionData(
            project_id=project_id,
            section_key=section_key,
            content={}
        )
        db.add(section)
        await db.commit()
        await db.refresh(section)
    
    return section


async def upsert_section(
    db: AsyncSession, project_id: UUID, section_key: str, content: Dict[str, Any]
) -> SectionData:
    """Create or update section data."""
    result = await db.execute(
        select(SectionData)
        .where(SectionData.project_id == project_id)
        .where(SectionData.section_key == section_key)
    )
    section = result.scalar_one_or_none()
    
    if section:
        # Update existing section
        section.content = content
    else:
        # Create new section
        section = SectionData(
            project_id=project_id,
            section_key=section_key,
            content=content
        )
        db.add(section)
    
    await db.commit()
    await db.refresh(section)
    return section
