"""
Service layer for section data operations.
Handles database interactions for section data.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta

from app.sections.models import SectionData
from app.projects import revision_service

# Track last revision creation time per project to prevent multiple entries per session
# Format: {project_id: last_revision_timestamp}
_last_revision_timestamps: Dict[UUID, datetime] = {}


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
    try:
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
        
        # Trigger revision entry creation for non-revision-history updates
        # Only create ONE revision entry per editing session (5 minute window)
        if section_key != 'revision_history':
            await _maybe_create_revision_entry(db, project_id)
        
        return section
    except Exception as e:
        await db.rollback()
        raise


async def _maybe_create_revision_entry(db: AsyncSession, project_id: UUID) -> None:
    """
    Create a revision entry only if enough time has passed since the last one.
    
    This prevents multiple revision entries from being created during a single
    editing session. A new revision entry is only created if:
    - No revision entry has been created for this project yet, OR
    - More than 5 minutes have passed since the last revision entry
    
    This implements the "one revision per editing session" behavior.
    
    Args:
        db: Database session
        project_id: UUID of the project
    """
    now = datetime.now()
    last_revision_time = _last_revision_timestamps.get(project_id)
    
    # Define session window: 5 minutes
    # If changes are made within 5 minutes, they're part of the same editing session
    session_window = timedelta(minutes=5)
    
    # Check if we should create a new revision entry
    should_create = (
        last_revision_time is None or  # First revision for this project
        (now - last_revision_time) > session_window  # Outside session window
    )
    
    if should_create:
        await revision_service.append_revision_entry(db, project_id)
        _last_revision_timestamps[project_id] = now


async def delete_section(
    db: AsyncSession, project_id: UUID, section_key: str
) -> None:
    """Delete a section by key."""
    try:
        result = await db.execute(
            select(SectionData)
            .where(SectionData.project_id == project_id)
            .where(SectionData.section_key == section_key)
        )
        section = result.scalar_one_or_none()
        
        if section:
            await db.delete(section)
            await db.commit()
    except Exception as e:
        await db.rollback()
        raise
