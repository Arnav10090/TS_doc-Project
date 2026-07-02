import pytest
from types import SimpleNamespace
from app.ai_suggestions import service as ai_service
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_unsaved_custom_section_returns_404(monkeypatch):
    # Arrange: project exists, but no saved sections
    project = SimpleNamespace(id=1, ts_type='Level 2')
    async def _fake_get_project(db, pid):
        return project

    async def _fake_get_all_sections(db, pid):
        return []

    monkeypatch.setattr(ai_service.project_service, 'get_project_by_id', _fake_get_project)
    monkeypatch.setattr(ai_service.sections_service, 'get_all_sections', _fake_get_all_sections)

    # Act / Assert
    with pytest.raises(HTTPException) as exc:
        await ai_service.generate_suggestion(project.id, 'custom_section_1718123456_123e4567-e89b-12d3-a456-426614174000', None, None)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_custom_section_missing_title_returns_400(monkeypatch):
    # Arrange: project exists and section saved but without title
    project = SimpleNamespace(id=1, ts_type='Level 2')
    saved_section = SimpleNamespace(section_key='custom_section_1_123e4567-e89b-12d3-a456-426614174000', content={'title': ''})

    async def _fake_get_project(db, pid):
        return project

    async def _fake_get_all_sections(db, pid):
        return [saved_section]

    monkeypatch.setattr(ai_service.project_service, 'get_project_by_id', _fake_get_project)
    monkeypatch.setattr(ai_service.sections_service, 'get_all_sections', _fake_get_all_sections)

    # Monkeypatch load_category_context to avoid filesystem access
    monkeypatch.setattr(ai_service, 'load_category_context', lambda ts_type, dir: SimpleNamespace(context_txt=None, historical_documents=[], folder_path=dir, historical_context_available=False))

    # Act / Assert
    with pytest.raises(HTTPException) as exc:
        await ai_service.generate_suggestion(project.id, saved_section.section_key, None, None)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_custom_section_multi_subsection_success(monkeypatch):
    # Arrange: project and saved custom section with 3 subsections
    project = SimpleNamespace(id=1, ts_type='Level 2')
    section_key = 'custom_section_1718123456_123e4567-e89b-12d3-a456-426614174000'
    saved_content = {
        'title': 'Integration Requirements',
        'subsections': [
            {'name': 'Overview', 'contentType': 'paragraph', 'data': {'paragraphs': [{'html': ''}]}},
            {'name': 'Interfaces', 'contentType': 'table', 'data': {'tables': [{'columns': ['Interface', 'Protocol'], 'rows': []}]}},
            {'name': 'Diagram', 'contentType': 'image', 'data': {'images': []}},
        ]
    }
    saved_section = SimpleNamespace(section_key=section_key, content=saved_content)

    async def _fake_get_project(db, pid):
        return project

    async def _fake_get_all_sections(db, pid):
        return [saved_section]

    monkeypatch.setattr(ai_service.project_service, 'get_project_by_id', _fake_get_project)
    monkeypatch.setattr(ai_service.sections_service, 'get_all_sections', _fake_get_all_sections)

    # Monkeypatch load_category_context
    monkeypatch.setattr(ai_service, 'load_category_context', lambda ts_type, dir: SimpleNamespace(context_txt=None, historical_documents=[], folder_path=dir, historical_context_available=False))

    # Monkeypatch builder to produce predictable prompt text
    def fake_builder(custom_section_title, subsection_name, subsection_type, project, all_sections, draft_content, category_context, expected_row_fields=None):
        return f"Subsection Type: {subsection_type}"

    monkeypatch.setattr(ai_service.builders, 'build_custom_section_prompt', fake_builder)

    # Fake Groq responses based on prompt content
    async def fake_call_groq(prompt, timeout=None, **kwargs):
        if 'paragraph' in prompt:
            return '<p>Generated overview paragraph.</p>'
        if 'table' in prompt:
            return '{"rows":[{"Interface":"Modbus","Protocol":"TCP"}]}'
        if 'image' in prompt:
            return '{"caption":"System diagram","note":"Show components A,B"}'
        return ''

    monkeypatch.setattr(ai_service, 'call_groq', fake_call_groq)

    # Act
    resp = await ai_service.generate_suggestion(project.id, section_key, None, None)

    # Assert
    assert resp.section_key == section_key
    assert resp.suggestion_mode == 'custom'
    assert resp.subsection_suggestions is not None
    assert len(resp.subsection_suggestions) == 3

    types = [s.type for s in resp.subsection_suggestions]
    assert types == ['paragraph', 'table', 'image']

    # Paragraph content string
    assert isinstance(resp.subsection_suggestions[0].content, str)
    assert resp.subsection_suggestions[0].content.strip().startswith('<p>')

    # Table content has rows
    assert isinstance(resp.subsection_suggestions[1].content, dict)
    assert 'rows' in resp.subsection_suggestions[1].content
    assert isinstance(resp.subsection_suggestions[1].content['rows'], list)

    # Image content has caption
    assert isinstance(resp.subsection_suggestions[2].content, dict)
    assert 'caption' in resp.subsection_suggestions[2].content