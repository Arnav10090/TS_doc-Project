"""
AI Prompts API router.
Handles AI prompt generation endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.projects.models import Project
from app.sections.models import SectionData
from app.ai_prompts.builders import (
    build_architecture_prompt,
    build_gantt_overall_prompt,
    build_gantt_shutdown_prompt,
    get_recommended_tools,
)

router = APIRouter(prefix="/api/v1/projects", tags=["ai_prompts"])

VALID_PROMPT_TYPES = ["architecture", "gantt_overall", "gantt_shutdown"]


@router.post("/{project_id}/ai-prompt/{prompt_type}")
async def generate_ai_prompt(
    project_id: UUID, prompt_type: str, db: AsyncSession = Depends(get_db)
):
    """Generate AI prompt for diagram creation."""
    # Validate prompt type
    if prompt_type not in VALID_PROMPT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid prompt_type. Must be one of: {', '.join(VALID_PROMPT_TYPES)}",
        )
    
    # Load project
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    
    # Generate prompt based on type
    if prompt_type == "architecture":
        # Load tech_stack section
        result = await db.execute(
            select(SectionData)
            .where(SectionData.project_id == project_id)
            .where(SectionData.section_key == "tech_stack")
        )
        tech_stack_section = result.scalar_one_or_none()
        tech_stack_content = tech_stack_section.content if tech_stack_section else {}
        
        prompt = build_architecture_prompt(project, tech_stack_content)
    
    elif prompt_type == "gantt_overall":
        # Load supervisors section
        result = await db.execute(
            select(SectionData)
            .where(SectionData.project_id == project_id)
            .where(SectionData.section_key == "supervisors")
        )
        supervisors_section = result.scalar_one_or_none()
        supervisors_content = supervisors_section.content if supervisors_section else {}
        
        prompt = build_gantt_overall_prompt(project, supervisors_content)
    
    elif prompt_type == "gantt_shutdown":
        prompt = build_gantt_shutdown_prompt(project)
    
    # Get recommended tools
    recommended_tools = get_recommended_tools(prompt_type)
    
    return {
        "prompt": prompt,
        "recommended_tools": recommended_tools,
    }
