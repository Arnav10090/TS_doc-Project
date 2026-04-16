"""
Integration tests for Projects API.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_create_project_returns_200_with_project_data(client: AsyncClient):
    """Test creating a project returns 200 with project data."""
    project_data = {
        "solution_name": "Test Solution",
        "solution_full_name": "Test Solution Full Name",
        "client_name": "Test Client",
        "client_location": "Test Location"
    }
    
    response = await client.post("/api/v1/projects", json=project_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["solution_name"] == "Test Solution"
    assert data["client_name"] == "Test Client"
    assert "id" in data
    assert "completion_summary" in data


@pytest.mark.asyncio
async def test_get_project_with_completion_returns_completion_summary_and_section_completion(
    client: AsyncClient, create_test_project
):
    """Test getting a project returns completion_summary and section_completion."""
    project = await create_test_project()
    
    response = await client.get(f"/api/v1/projects/{project.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert "completion_summary" in data
    assert "section_completion" in data
    assert data["completion_summary"]["total"] == 27
    assert isinstance(data["section_completion"], dict)


@pytest.mark.asyncio
async def test_update_project_modifies_fields_correctly(
    client: AsyncClient, create_test_project
):
    """Test updating a project modifies fields correctly."""
    project = await create_test_project()
    
    update_data = {
        "solution_name": "Updated Solution",
        "client_location": "Updated Location"
    }
    
    response = await client.patch(f"/api/v1/projects/{project.id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["solution_name"] == "Updated Solution"
    assert data["client_location"] == "Updated Location"


@pytest.mark.asyncio
async def test_delete_project_cascades_to_sections(
    client: AsyncClient, db_session: AsyncSession, create_test_project
):
    """Test deleting a project cascades to section_data."""
    from app.sections.models import SectionData
    from sqlalchemy import select
    
    project = await create_test_project()
    
    # Create a section
    section = SectionData(
        project_id=project.id,
        section_key="cover",
        content={"test": "data"}
    )
    db_session.add(section)
    await db_session.commit()
    
    # Delete project
    response = await client.delete(f"/api/v1/projects/{project.id}")
    assert response.status_code == 204
    
    # Verify section was deleted
    result = await db_session.execute(
        select(SectionData).where(SectionData.project_id == project.id)
    )
    sections = result.scalars().all()
    assert len(sections) == 0
