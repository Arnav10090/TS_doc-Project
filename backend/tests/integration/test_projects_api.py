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
        "client_location": "Test Location",
        "ts_type": "Level 2"
    }
    
    response = await client.post("/api/v1/projects", json=project_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["solution_name"] == "Test Solution"
    assert data["client_name"] == "Test Client"
    assert "id" in data
    assert "completion_summary" in data



@pytest.mark.asyncio
async def test_create_project_requires_ts_type(client: AsyncClient):
    project_data = {
        "solution_name": "Test Solution",
        "solution_full_name": "Test Solution Full Name",
        "client_name": "Test Client",
        "client_location": "Test Location",
    }

    response = await client.post("/api/v1/projects", json=project_data)

    assert response.status_code in {400, 422}


@pytest.mark.asyncio
async def test_create_project_rejects_invalid_ts_type(client: AsyncClient):
    project_data = {
        "solution_name": "Test Solution",
        "solution_full_name": "Test Solution Full Name",
        "client_name": "Test Client",
        "client_location": "Test Location",
        "ts_type": "../../secret",
    }

    response = await client.post("/api/v1/projects", json=project_data)

    assert response.status_code == 422
    assert "Invalid TS type" in response.text


@pytest.mark.asyncio
async def test_project_responses_include_ts_type(client: AsyncClient):
    project_data = {
        "solution_name": "Test Solution",
        "solution_full_name": "Test Solution Full Name",
        "client_name": "Test Client",
        "client_location": "Test Location",
        "ts_type": "Level 2",
    }

    create_response = await client.post("/api/v1/projects", json=project_data)

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["ts_type"] == "Level 2"

    detail_response = await client.get(f"/api/v1/projects/{created['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["ts_type"] == "Level 2"

    list_response = await client.get("/api/v1/projects")
    assert list_response.status_code == 200
    assert any(project["id"] == created["id"] and project["ts_type"] == "Level 2" for project in list_response.json())

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


@pytest.mark.asyncio
async def test_get_ts_types_returns_all_options_with_value_and_label(client: AsyncClient):
    """Test GET /api/v1/ts-types returns all TS type options with value/label pairs.
    
    Validates:
    - Requirements 2.4, 2.8: Endpoint returns TS type options
    - Requirement 19.12-19.14: Response schema has value/label pairs
    - Values use "/" separator (e.g., "Data Analysis/Data Centralization")
    - Labels use em dash separator (e.g., "Data Analysis — Data Centralization")
    """
    # TS types endpoint lives under the projects router
    response = await client.get("/api/v1/projects/ts-types")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert "ts_types" in data
    assert isinstance(data["ts_types"], list)
    assert len(data["ts_types"]) > 0
    
    # Verify each option has value and label
    for option in data["ts_types"]:
        assert "value" in option
        assert "label" in option
        assert isinstance(option["value"], str)
        assert isinstance(option["label"], str)
        
        # Value uses "/" separator
        if "/" in option["value"]:
            assert " — " in option["label"], f"Label should use em dash separator: {option['label']}"
        
        # Verify em dash conversion is correct
        expected_label = option["value"].replace("/", " — ")
        assert option["label"] == expected_label, \
            f"Label mismatch: expected '{expected_label}', got '{option['label']}'"
    
    # Verify some expected TS types exist
    values = [opt["value"] for opt in data["ts_types"]]
    labels = [opt["label"] for opt in data["ts_types"]]
    
    # Check for known TS types from TSType enum
    assert "Data Analysis/Data Centralization" in values
    assert "Data Analysis — Data Centralization" in labels
    assert "Level 2" in values
    assert "Level 2" in labels
    
    # Verify nested hierarchy examples
    if "Data Analysis/Data Centralization/Historian" in values:
        idx = values.index("Data Analysis/Data Centralization/Historian")
        assert labels[idx] == "Data Analysis — Data Centralization — Historian"
