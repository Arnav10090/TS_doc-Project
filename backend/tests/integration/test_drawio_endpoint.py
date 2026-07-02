import pytest
import json


@pytest.mark.asyncio
async def test_drawio_endpoint_generates_xml(client, create_test_project, monkeypatch):
    project = await create_test_project()

    gantt = [
        {"task": "Mobilization", "phase": "Prep", "start_week": 1, "duration_weeks": 2, "milestone": False, "dependencies": []},
        {"task": "Commissioning", "phase": "Exec", "start_week": 3, "duration_weeks": 1, "milestone": True, "dependencies": [0]},
    ]

    gantt_json = json.dumps(gantt)

    async def fake_call_groq(prompt, timeout=None, **kwargs):
        return gantt_json

    monkeypatch.setattr("app.ai_suggestions.service.call_groq", fake_call_groq)

    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/overall_gantt/drawio", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert "drawio_xml" in data
    assert "<mxGraphModel" in data["drawio_xml"]
    assert "chart_instructions" in data


@pytest.mark.asyncio
async def test_drawio_endpoint_generates_architecture_xml_for_system_config(client, create_test_project, monkeypatch):
    project = await create_test_project()

    architecture_xml = """<mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" /></root></mxGraphModel>"""

    async def fake_call_groq(prompt, timeout=None, **kwargs):
        return architecture_xml

    monkeypatch.setattr("app.ai_suggestions.service.call_groq", fake_call_groq)

    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/system_config/drawio", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["drawio_xml"] == architecture_xml
    assert "upload it back into this section" in data["chart_instructions"]


@pytest.mark.asyncio
async def test_drawio_endpoint_invalid_section(client, create_test_project):
    project = await create_test_project()
    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/executive_summary/drawio", json={})
    assert resp.status_code == 400
