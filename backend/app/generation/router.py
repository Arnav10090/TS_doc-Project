"""
Generation API router.
Handles document generation and version management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID
import os

from app.database import get_db
from app.projects.models import Project
from app.sections.models import SectionData
from app.generation.models import DocumentVersion
from app.generation.schemas import DocumentVersionResponse
from app.generation.completion import calculate_section_completion
from app.generation.docx_generator import generate_document
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["generation"])


@router.post("/projects/{project_id}/generate")
async def generate_project_document(
    project_id: UUID, db: AsyncSession = Depends(get_db)
):
    """Generate a Word document for a project."""
    # Load project
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    
    # Load all section data
    result = await db.execute(
        select(SectionData).where(SectionData.project_id == project_id)
    )
    sections = result.scalars().all()
    
    # Build sections dict
    sections_dict = {s.section_key: s.content for s in sections}
    
    # Calculate completion
    completion_map = calculate_section_completion(sections_dict)
    
    # Identify missing required sections (exclude auto-complete locked sections)
    # Auto-complete sections that don't require user input:
    # - binding_conditions, cybersecurity, disclaimer (locked)
    # - scope_definitions (auto-fills from project data)
    excluded_sections = ["binding_conditions", "cybersecurity", "disclaimer", "scope_definitions"]
    
    missing_sections = [
        key for key, complete in completion_map.items()
        if not complete and key not in excluded_sections
    ]
    
    if missing_sections:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Cannot generate document. Some required sections are incomplete.",
                "missing_sections": missing_sections,
            },
        )
    
    # Query maximum version number
    result = await db.execute(
        select(func.max(DocumentVersion.version_number))
        .where(DocumentVersion.project_id == project_id)
    )
    max_version = result.scalar()
    next_version_number = (max_version or 0) + 1
    
    # Generate document
    template_path = settings.TEMPLATE_PATH
    upload_dir = settings.UPLOAD_DIR
    
    file_path, filename = generate_document(
        project, sections_dict, template_path, upload_dir, next_version_number
    )
    
    # Create DocumentVersion record
    doc_version = DocumentVersion(
        project_id=project_id,
        version_number=next_version_number,
        filename=filename,
        file_path=file_path,
    )
    db.add(doc_version)
    await db.commit()
    
    # Return file
    return FileResponse(
        path=file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
        filename=filename,
    )


@router.get("/projects/{project_id}/versions", response_model=List[DocumentVersionResponse])
async def get_project_versions(
    project_id: UUID, db: AsyncSession = Depends(get_db)
):
    """Get all document versions for a project."""
    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.project_id == project_id)
        .order_by(DocumentVersion.version_number.desc())
    )
    versions = result.scalars().all()
    
    return [
        DocumentVersionResponse(
            id=str(v.id),
            project_id=str(v.project_id),
            version_number=v.version_number,
            filename=v.filename,
            file_path=v.file_path,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.get("/versions/{version_id}/download")
async def download_version(version_id: UUID, db: AsyncSession = Depends(get_db)):
    """Download a specific document version."""
    result = await db.execute(
        select(DocumentVersion).where(DocumentVersion.id == version_id)
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Version not found"
        )
    
    # Check if file exists
    if not os.path.exists(version.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk"
        )
    
    return FileResponse(
        path=version.file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={version.filename}"},
        filename=version.filename,
    )
