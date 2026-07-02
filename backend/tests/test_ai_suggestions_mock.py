import pytest
from app.ai_suggestions import service as ai_service


@pytest.mark.asyncio
async def test_call_groq_mocked(monkeypatch):
    async def fake(prompt, timeout=None):
        return "MOCKED_GROQ_RESPONSE"

    monkeypatch.setattr("app.ai_suggestions.service.call_groq", fake)

    resp = await ai_service.call_groq("test prompt")
    assert resp == "MOCKED_GROQ_RESPONSE"
