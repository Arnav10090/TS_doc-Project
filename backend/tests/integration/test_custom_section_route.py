import pytest
import uuid
from app.ai_suggestions import service as ai_service
from app.sections.models import SectionData


@pytest.mark.asyncio
async def test_custom_section_route_integration(client, db_session, create_test_project, monkeypatch):
    # Create a test project
    project = await create_test_project()

    # Prepare a custom section
    # Use a valid custom section key pattern: custom_section_<digits>_<uuid>
    section_key = f"custom_section_{int(uuid.uuid4().int % 1_000_000)}_{uuid.uuid4()}"
    saved_content = {
        'title': 'Integration Requirements',
        'subsections': [
            {'name': 'Overview', 'contentType': 'paragraph', 'data': {'paragraphs': [{'html': ''}]}},
            {'name': 'Interfaces', 'contentType': 'table', 'data': {'tables': [{'columns': ['Interface', 'Protocol'], 'rows': []}]}},
            {'name': 'Diagram', 'contentType': 'image', 'data': {'images': []}},
        ]
    }

    # Insert section into DB
    section = SectionData(project_id=project.id, section_key=section_key, content=saved_content)
    db_session.add(section)
    await db_session.commit()

    # Patch Groq calls to return predictable outputs
    async def fake_call_groq(prompt, timeout=None, **kwargs):
        if 'paragraph' in prompt:
            return '<p>Generated overview paragraph.</p>'
        if 'table' in prompt:
            return '{"rows":[{"Interface":"Modbus","Protocol":"TCP"}]}'
        if 'image' in prompt:
            return '{"caption":"System diagram","note":"Show components A,B"}'
        return ''

    monkeypatch.setattr(ai_service, 'call_groq', fake_call_groq)

    # Call the API route
    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/{section_key}", json={"draft_content": None})

    assert resp.status_code == 200
    data = resp.json()
    assert data['section_key'] == section_key
    assert data['suggestion_mode'] == 'custom'
    assert data['subsection_suggestions'] is not None
    assert len(data['subsection_suggestions']) == 3
    types = [s['type'] for s in data['subsection_suggestions']]
    assert types == ['paragraph', 'table', 'image']