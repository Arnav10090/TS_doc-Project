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
from app.projects.ts_types import TSType
from app.projects.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectSummary,
    ProjectDetail,
    CompletionSummary,
    TSTypeOption,
    TSTypesResponse,
)
from app.generation.completion import calculate_section_completion

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])
ts_types_router = APIRouter(prefix="/api/v1", tags=["projects"])

_TS_TYPES_RESPONSES = {
    200: {
        "description": "Available TS type values and display labels.",
        "content": {
            "application/json": {
                "example": {
                    "ts_types": [
                        {
                            "value": "Data Analysis/Data Centralization/UGS",
                            "label": "Data Analysis - Data Centralization - UGS",
                        },
                        {"value": "Level 2", "label": "Level 2"},
                    ]
                }
            }
        },
    }
}


def _compute_total_sections(sections_dict: dict) -> int:
    """Compute total completable sections.

    Rules:
    - If no sections present, assume full template (27)
    - If sections count >= 27, preserve baseline total of 27
    - Otherwise, total = len(sections_dict) - 4 (exclude 4 locked sections)
    """
    if not sections_dict:
        return 27
    num = len(sections_dict)
    if num >= 27:
        return 27
    total = num - 4
    return total if total > 0 else 0


@ts_types_router.get(
    "/ts-types",
    response_model=TSTypesResponse,
    summary="List TS types",
    description="Returns the canonical TS type values accepted by project creation and AI Suggestions retrieval.",
    response_description="TS type options for dropdown selection.",
    responses=_TS_TYPES_RESPONSES,
)
@router.get(
    "/ts-types",
    response_model=TSTypesResponse,
    summary="List TS types (compatibility route)",
    description="Compatibility route used by the current frontend. Same response as `/api/v1/ts-types`.",
    response_description="TS type options for dropdown selection.",
    responses=_TS_TYPES_RESPONSES,
)
async def get_ts_types():
    """
    Get all available TS type options for dropdown selection.

    Returns TSType enum values with display labels using em dash separator.
    Example: "Data Analysis/Data Centralization" -> "Data Analysis - Data Centralization"
    """
    options = [
        TSTypeOption(value=ts_type.value, label=ts_type.get_display_label())
        for ts_type in TSType
    ]
    return TSTypesResponse(ts_types=options)


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new project."""
    if not project_data.ts_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TS type is required for new projects",
        )

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
        ts_type=project.ts_type,
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
        total_sections = _compute_total_sections(sections_dict)

        # Exclude 4 sections from the completable count
        excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
        completed_count = sum(
            1 for k, v in completion_map.items()
            if v and k not in excluded_sections
        )
        # Completion calculation
        completion_percentage = int((completed_count / total_sections) * 100) if total_sections > 0 else 0

        # (no debug logging in normal operation)

        result.append(
            ProjectSummary(
                id=str(project.id),
                solution_name=project.solution_name,
                client_name=project.client_name,
                client_location=project.client_location,
                created_at=project.created_at,
                completion_percentage=completion_percentage,
                total_sections=total_sections,
                ts_type=project.ts_type,
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
    total_sections = _compute_total_sections(sections_dict)

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
        ts_type=project.ts_type,
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
    total_sections = _compute_total_sections(sections_dict)

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
        ts_type=project.ts_type,
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
