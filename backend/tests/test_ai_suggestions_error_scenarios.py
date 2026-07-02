import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.projects import service as project_service
from app.sections import service as sections_service


async def _override_get_db():
    yield None


class DummyProject:
    def __init__(self, project_id, ts_type="Level 2"):
        self.id = uuid.UUID(str(project_id))
        self.ts_type = ts_type
        self.solution_name = "Test Solution"
        self.solution_full_name = "Test Solution Full Name"
        self.solution_abbreviation = None
        self.client_name = "Test Client"
        self.client_location = "Test Location"
        self.client_abbreviation = None
        self.ref_number = None
        self.doc_date = None
        self.doc_version = "0"


def _install_project_override(monkeypatch, project):
    async def fake_get_project(db, pid):
        return project

    async def fake_get_all_sections(db, pid):
        return []

    monkeypatch.setattr(project_service, "get_project_by_id", fake_get_project)
    monkeypatch.setattr(sections_service, "get_all_sections", fake_get_all_sections)
    app.dependency_overrides[get_db] = _override_get_db


def _clear_overrides():
    app.dependency_overrides.clear()


def test_null_ts_type_returns_400(monkeypatch):
    project_id = uuid.uuid4()
    _install_project_override(monkeypatch, DummyProject(project_id, ts_type=None))

    try:
        with TestClient(app) as client:
            resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/executive_summary", json={})

        assert resp.status_code == 400
        assert "TS type" in resp.json().get("detail", "")
    finally:
        _clear_overrides()


def test_suppressed_section_returns_400_without_provider_call():
    project_id = uuid.uuid4()

    with TestClient(app) as client:
        resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/cover", json={})

    assert resp.status_code == 400
    assert "not available" in resp.json().get("detail", "")


def test_unsaved_custom_section_returns_404(monkeypatch):
    project_id = uuid.uuid4()
    section_key = f"custom_section_{int(uuid.uuid4().int % 1_000_000)}_{uuid.uuid4()}"
    _install_project_override(monkeypatch, DummyProject(project_id))

    try:
        with TestClient(app) as client:
            resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/{section_key}", json={})

        assert resp.status_code == 404
        assert "Custom section not found" in resp.json().get("detail", "")
    finally:
        _clear_overrides()


def test_missing_groq_api_key_returns_503(monkeypatch):
    project_id = uuid.uuid4()
    _install_project_override(monkeypatch, DummyProject(project_id))
    monkeypatch.setattr("app.ai_suggestions.service.settings.GROQ_API_KEY", "")

    try:
        with TestClient(app) as client:
            resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/executive_summary", json={})

        assert resp.status_code == 503
        assert "not configured" in resp.json().get("detail", "")
    finally:
        _clear_overrides()
