"""
Projects API router.
Handles all project-related endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database import get_db
from app.projects import service
from app.projects.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectSummary,
    ProjectDetail,
    CompletionSummary,
)
from app.generation.completion import calculate_section_completion

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new project."""
    project = await service.create_project(db, project_data)
    
    # Calculate completion for new project (will be 0%)
    completion_map = calculate_section_completion({})
    
    # Calculate dynamic total (for new project, fallback to 27)
    total_sections = 27  # New projects start with full template
    
    # Exclude 4 sections from the completable count
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    return ProjectDetail(
        id=str(project.id),
        solution_name=project.solution_name,
        solution_full_name=project.solution_full_name,
        solution_abbreviation=project.solution_abbreviation,
        client_name=project.client_name,
        client_location=project.client_location,
        client_abbreviation=project.client_abbreviation,
        ref_number=project.ref_number,
        doc_date=project.doc_date,
        doc_version=project.doc_version,
        created_at=project.created_at,
        updated_at=project.updated_at,
        completion_summary=CompletionSummary(
            total=total_sections,
            completed=completed_count,
            percentage=int((completed_count / total_sections) * 100) if total_sections > 0 else 0,
        ),
        section_completion=completion_map,
    )


@router.get("", response_model=List[ProjectSummary])
async def get_all_projects(db: AsyncSession = Depends(get_db)):
    """Get all projects with summary information."""
    projects = await service.get_all_projects(db)
    
    result = []
    for project in projects:
        # Build sections dict for completion calculation
        sections_dict = {s.section_key: s.content for s in project.sections}
        completion_map = calculate_section_completion(sections_dict)
        
        # Calculate dynamic total from sections_dict
        total_sections = len(sections_dict) - 4
        
        # Exclude 4 sections from the completable count
        excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
        completed_count = sum(
            1 for k, v in completion_map.items() 
            if v and k not in excluded_sections
        )
        completion_percentage = int((completed_count / total_sections) * 100) if total_sections > 0 else 0
        
        result.append(
            ProjectSummary(
                id=str(project.id),
                solution_name=project.solution_name,
                client_name=project.client_name,
                client_location=project.client_location,
                created_at=project.created_at,
                completion_percentage=completion_percentage,
                total_sections=total_sections,
            )
        )
    
    return result


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a project by ID with completion data."""
    project = await service.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    
    # Build sections dict for completion calculation
    sections_dict = {s.section_key: s.content for s in project.sections}
    completion_map = calculate_section_completion(sections_dict)
    
    # Calculate dynamic total from sections_dict
    total_sections = len(sections_dict) - 4 if sections_dict else 27
    
    # Exclude 4 sections from the completable count
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    return ProjectDetail(
        id=str(project.id),
        solution_name=project.solution_name,
        solution_full_name=project.solution_full_name,
        solution_abbreviation=project.solution_abbreviation,
        client_name=project.client_name,
        client_location=project.client_location,
        client_abbreviation=project.client_abbreviation,
        ref_number=project.ref_number,
        doc_date=project.doc_date,
        doc_version=project.doc_version,
        created_at=project.created_at,
        updated_at=project.updated_at,
        completion_summary=CompletionSummary(
            total=total_sections,
            completed=completed_count,
            percentage=int((completed_count / total_sections) * 100) if total_sections > 0 else 0,
        ),
        section_completion=completion_map,
    )


@router.patch("/{project_id}", response_model=ProjectDetail)
async def update_project(
    project_id: UUID, project_data: ProjectUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a project's fields."""
    project = await service.update_project(db, project_id, project_data)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    
    # Build sections dict for completion calculation
    sections_dict = {s.section_key: s.content for s in project.sections}
    completion_map = calculate_section_completion(sections_dict)
    
    # Calculate dynamic total from sections_dict
    total_sections = len(sections_dict) - 4 if sections_dict else 27
    
    # Exclude 4 sections from the completable count
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    return ProjectDetail(
        id=str(project.id),
        solution_name=project.solution_name,
        solution_full_name=project.solution_full_name,
        solution_abbreviation=project.solution_abbreviation,
        client_name=project.client_name,
        client_location=project.client_location,
        client_abbreviation=project.client_abbreviation,
        ref_number=project.ref_number,
        doc_date=project.doc_date,
        doc_version=project.doc_version,
        created_at=project.created_at,
        updated_at=project.updated_at,
        completion_summary=CompletionSummary(
            total=total_sections,
            completed=completed_count,
            percentage=int((completed_count / total_sections) * 100) if total_sections > 0 else 0,
        ),
        section_completion=completion_map,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a project and all associated data."""
    deleted = await service.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return None
