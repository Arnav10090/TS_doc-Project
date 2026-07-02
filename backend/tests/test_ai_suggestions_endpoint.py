import pytest
import uuid

from app.ai_suggestions import schemas as ai_schemas


@pytest.mark.asyncio
async def test_generate_ai_suggestion_success(client, create_test_project, monkeypatch):
    # Create a test project (fixture provides a default ts_type)
    project = await create_test_project()

    async def fake_generate(project_id, section_key, draft_content, db):
        return ai_schemas.SuggestionResponse(
            section_key=section_key,
            section_title="Test Section",
            suggestion_mode="predefined",
            structured_import_available=True,
            content={"para": "Test suggestion"},
            subsection_suggestions=None,
            raw_text=None,
            historical_context_available=False,
            context_sources=[],
            context_txt_used=False,
        )

    monkeypatch.setattr("app.ai_suggestions.service.generate_suggestion", fake_generate)

    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/executive_summary", json={"draft_content": None})
    assert resp.status_code == 200
    data = resp.json()
    assert data["section_key"] == "executive_summary"
    assert data["content"]["para"] == "Test suggestion"


@pytest.mark.asyncio
async def test_invalid_section_key_returns_400(client, create_test_project):
    project = await create_test_project()
    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/invalid_key", json={"draft_content": None})
    assert resp.status_code == 400
    assert "Invalid section_key" in resp.json().get("detail", "")



@pytest.mark.asyncio
async def test_custom_subsection_key_returns_400(client, create_test_project):
    project = await create_test_project()
    section_key = f"custom_subsection_{int(uuid.uuid4().int % 1_000_000)}_{uuid.uuid4()}"

    resp = await client.post(
        f"/api/v1/projects/{project.id}/ai-suggestions/{section_key}",
        json={"draft_content": None},
    )

    assert resp.status_code == 400
    assert "Invalid section_key" in resp.json().get("detail", "")

@pytest.mark.asyncio
async def test_suppressed_section_returns_400(client, create_test_project):
    project = await create_test_project()
    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/cover", json={"draft_content": None})
    assert resp.status_code == 400
    assert "AI suggestions are not available for section 'cover'" in resp.json().get("detail", "")


@pytest.mark.asyncio
async def test_project_not_found_returns_404(client):
    random_id = uuid.uuid4()
    resp = await client.post(f"/api/v1/projects/{random_id}/ai-suggestions/executive_summary", json={"draft_content": None})
    assert resp.status_code == 404
    assert "Project not found" in resp.json().get("detail", "")


@pytest.mark.asyncio
async def test_null_ts_type_returns_400(client, create_test_project):
    project = await create_test_project(ts_type=None)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/ai-suggestions/executive_summary",
        json={"draft_content": None},
    )

    assert resp.status_code == 400
    assert "TS type" in resp.json().get("detail", "")


@pytest.mark.asyncio
async def test_unsaved_custom_section_returns_404(client, create_test_project):
    project = await create_test_project()
    section_key = f"custom_section_{int(uuid.uuid4().int % 1_000_000)}_{uuid.uuid4()}"

    resp = await client.post(
        f"/api/v1/projects/{project.id}/ai-suggestions/{section_key}",
        json={"draft_content": None},
    )

    assert resp.status_code == 404
    assert "Custom section not found" in resp.json().get("detail", "")


@pytest.mark.asyncio
async def test_missing_groq_api_key_returns_503(client, create_test_project, monkeypatch):
    project = await create_test_project()
    monkeypatch.setattr("app.ai_suggestions.service.settings.GROQ_API_KEY", "")

    resp = await client.post(
        f"/api/v1/projects/{project.id}/ai-suggestions/executive_summary",
        json={"draft_content": None},
    )

    assert resp.status_code == 503
    assert "not configured" in resp.json().get("detail", "")
