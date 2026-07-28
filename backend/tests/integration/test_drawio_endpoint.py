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

    architecture_xml = """<mxfile host="app.diagrams.net"><diagram name="System Config"><mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" /><mxCell id="2" value="Application Server" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="180" height="60" as="geometry" /></mxCell></root></mxGraphModel></diagram></mxfile>"""

    async def fake_call_groq(prompt, timeout=None, **kwargs):
        return architecture_xml

    monkeypatch.setattr("app.ai_suggestions.service.call_groq", fake_call_groq)

    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/system_config/drawio", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["drawio_xml"] == architecture_xml
    assert "upload it back into this section" in data["chart_instructions"]


@pytest.mark.asyncio
async def test_drawio_endpoint_wraps_raw_mxgraphmodel_for_system_config(client, create_test_project, monkeypatch):
    project = await create_test_project()

    architecture_xml = """<mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" /><mxCell id="2" value="Application Server" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="180" height="60" as="geometry" /></mxCell></root></mxGraphModel>"""

    async def fake_call_groq(prompt, timeout=None, **kwargs):
        return architecture_xml

    monkeypatch.setattr("app.ai_suggestions.service.call_groq", fake_call_groq)

    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/system_config/drawio", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["drawio_xml"].startswith('<mxfile host="app.diagrams.net">')
    assert "<mxGraphModel>" in data["drawio_xml"]


@pytest.mark.asyncio
async def test_drawio_endpoint_rejects_invalid_system_config_xml(client, create_test_project, monkeypatch):
    project = await create_test_project()

    invalid_xml = """<mxfile host="app.diagrams.net"><diagram name="System Config"><mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" /><mxCell id="2" id="3" parent="1" edge="1" style="endArrow=block;html=1;"><mxGeometry relative="1" as="geometry" /></mxCell></root></mxGraphModel></diagram></mxfile>"""

    async def fake_call_groq(prompt, timeout=None, **kwargs):
        return invalid_xml

    monkeypatch.setattr("app.ai_suggestions.service.call_groq", fake_call_groq)

    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/system_config/drawio", json={})
    assert resp.status_code == 502
    assert resp.json()["detail"] == "Invalid Draw.io XML from AI provider"


@pytest.mark.asyncio
async def test_drawio_endpoint_invalid_section(client, create_test_project):
    project = await create_test_project()
    resp = await client.post(f"/api/v1/projects/{project.id}/ai-suggestions/executive_summary/drawio", json={})
    assert resp.status_code == 400
