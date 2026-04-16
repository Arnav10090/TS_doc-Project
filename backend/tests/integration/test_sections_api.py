"""
Integration tests for Sections API.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_upsert_section_creates_new_record(
    client: AsyncClient, create_test_project
):
    """Test upserting a section creates a new record."""
    project = await create_test_project()
    
    section_data = {
        "content": {
            "solution_full_name": "Test Solution",
            "client_name": "Test Client"
        }
    }
    
    response = await client.put(
        f"/api/v1/projects/{project.id}/sections/cover",
        json=section_data
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["section_key"] == "cover"
    assert data["content"]["solution_full_name"] == "Test Solution"


@pytest.mark.asyncio
async def test_upsert_section_updates_existing_record(
    client: AsyncClient, db_session: AsyncSession, create_test_project
):
    """Test upserting a section updates an existing record."""
    from app.sections.models import SectionData
    
    project = await create_test_project()
    
    # Create initial section
    section = SectionData(
        project_id=project.id,
        section_key="cover",
        content={"old": "data"}
    )
    db_session.add(section)
    await db_session.commit()
    
    # Update section
    section_data = {
        "content": {
            "new": "data"
        }
    }
    
    response = await client.put(
        f"/api/v1/projects/{project.id}/sections/cover",
        json=section_data
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"]["new"] == "data"
    assert "old" not in data["content"]


@pytest.mark.asyncio
async def test_invalid_section_key_returns_400(
    client: AsyncClient, create_test_project
):
    """Test invalid section_key returns 400."""
    project = await create_test_project()
    
    section_data = {
        "content": {"test": "data"}
    }
    
    response = await client.put(
        f"/api/v1/projects/{project.id}/sections/invalid_section",
        json=section_data
    )
    
    assert response.status_code == 400
    assert "Invalid section_key" in response.json()["detail"]
