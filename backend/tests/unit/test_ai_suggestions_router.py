import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.projects import service as project_service
from app.ai_suggestions import service as ai_service


def test_invalid_section_key_returns_400():
    project_id = str(uuid.uuid4())
    with TestClient(app) as client:
        resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/invalid_section_key", json={})
        assert resp.status_code == 400


def test_suppressed_section_returns_400():
    project_id = str(uuid.uuid4())
    with TestClient(app) as client:
        resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/cover", json={})
        assert resp.status_code == 400


def test_project_not_found_returns_404(monkeypatch):
    project_id = str(uuid.uuid4())

    async def _override_get_db():
        yield None

    async def fake_get_project(db, pid):
        return None

    monkeypatch.setattr(project_service, 'get_project_by_id', fake_get_project)
    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as client:
        resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/tech_stack", json={})
        assert resp.status_code == 404

    app.dependency_overrides.clear()


def test_null_ts_type_returns_400(monkeypatch):
    project_id = str(uuid.uuid4())

    async def _override_get_db():
        yield None

    class DummyProject:
        id = uuid.UUID(project_id)
        ts_type = None

    async def fake_get_project(db, pid):
        return DummyProject()

    monkeypatch.setattr(project_service, 'get_project_by_id', fake_get_project)
    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as client:
        resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/tech_stack", json={})
        assert resp.status_code == 400

    app.dependency_overrides.clear()


def test_successful_forwarding_returns_200(monkeypatch):
    project_id = str(uuid.uuid4())

    async def _override_get_db():
        yield None

    class DummyProject:
        id = uuid.UUID(project_id)
        ts_type = 'Level 2'

    async def fake_get_project(db, pid):
        return DummyProject()

    async def fake_generate_suggestion(pid, section_key, draft_content, db):
        return {
            'section_key': section_key,
            'section_title': section_key.replace('_', ' ').title(),
            'suggestion_mode': 'predefined',
            'structured_import_available': False,
            'content': {'rows': []},
            'subsection_suggestions': None,
            'raw_text': None,
            'historical_context_available': False,
            'context_sources': [],
            'context_txt_used': False,
        }

    monkeypatch.setattr(project_service, 'get_project_by_id', fake_get_project)
    monkeypatch.setattr(ai_service, 'generate_suggestion', fake_generate_suggestion)
    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as client:
        resp = client.post(f"/api/v1/projects/{project_id}/ai-suggestions/tech_stack", json={})
        assert resp.status_code == 200
        data = resp.json()
        assert data['section_key'] == 'tech_stack'
        assert data['suggestion_mode'] == 'predefined'

    app.dependency_overrides.clear()
