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


async def create_project(db: AsyncSession, project_data: ProjectCreate) -> Project:
    """Create a new project."""
    project = Project(**project_data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


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
