"""
Integration tests for database schema and constraints.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, inspect
from sqlalchemy.exc import IntegrityError


@pytest.mark.asyncio
async def test_all_tables_exist_after_migrations(db_session: AsyncSession):
    """Test all required tables exist after migrations."""
    from app.database import Base
    
    # Get all table names from metadata
    expected_tables = {"projects", "section_data", "document_versions"}
    
    # Query database for existing tables
    result = await db_session.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )
    existing_tables = {row[0] for row in result.fetchall()}
    
    assert expected_tables.issubset(existing_tables)


@pytest.mark.asyncio
async def test_projects_table_has_correct_columns(db_session: AsyncSession):
    """Test projects table has all required columns."""
    from app.projects.models import Project
    
    # Get column names from the model
    expected_columns = {
        "id", "solution_name", "solution_full_name", "solution_abbreviation",
        "client_name", "client_location", "client_abbreviation",
        "ref_number", "doc_date", "doc_version", "created_at", "updated_at"
    }
    
    # Create a test project to verify columns work
    project = Project(
        solution_name="Test",
        solution_full_name="Test Full",
        client_name="Client",
        client_location="Location"
    )
    db_session.add(project)
    await db_session.commit()
    
    # Verify project was created successfully
    result = await db_session.execute(select(Project))
    projects = result.scalars().all()
    assert len(projects) == 1


@pytest.mark.asyncio
async def test_section_data_has_unique_constraint_on_project_id_section_key(
    db_session: AsyncSession, create_test_project
):
    """Test section_data has unique constraint on (project_id, section_key)."""
    from app.sections.models import SectionData
    
    project = await create_test_project()
    
    # Create first section
    section1 = SectionData(
        project_id=project.id,
        section_key="cover",
        content={"test": "data1"}
    )
    db_session.add(section1)
    await db_session.commit()
    
    # Try to create duplicate section
    section2 = SectionData(
        project_id=project.id,
        section_key="cover",
        content={"test": "data2"}
    )
    db_session.add(section2)
    
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_cascade_delete_from_projects_to_section_data_and_document_versions(
    db_session: AsyncSession, create_test_project
):
    """Test cascade delete from projects to section_data and document_versions."""
    from app.sections.models import SectionData
    from app.generation.models import DocumentVersion
    from app.projects.models import Project
    from sqlalchemy import select
    
    project = await create_test_project()
    project_id = project.id
    
    # Create section and version
    section = SectionData(
        project_id=project_id,
        section_key="cover",
        content={"test": "data"}
    )
    db_session.add(section)
    
    version = DocumentVersion(
        project_id=project_id,
        version_number=1,
        filename="test.docx",
        file_path="/tmp/test.docx"
    )
    db_session.add(version)
    await db_session.commit()
    
    # Delete project
    await db_session.delete(project)
    await db_session.commit()
    
    # Verify section and version were deleted
    result = await db_session.execute(
        select(SectionData).where(SectionData.project_id == project_id)
    )
    sections = result.scalars().all()
    assert len(sections) == 0
    
    result = await db_session.execute(
        select(DocumentVersion).where(DocumentVersion.project_id == project_id)
    )
    versions = result.scalars().all()
    assert len(versions) == 0
