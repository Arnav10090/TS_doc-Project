"""Compatibility tests for the legacy call_groq() AI provider shim."""

import pytest
from fastapi import HTTPException, status

from app.ai_suggestions import service
from app.ai_suggestions.providers.base import AIProviderResponse
from app.ai_suggestions.providers.errors import AIProviderConfigurationError, AIProviderTimeoutError


class FakeProvider:
    name = "fake"
    model = "fake-model"

    def __init__(self, response_text="Provider response", error=None):
        self.response_text = response_text
        self.error = error
        self.requests = []

    def is_configured(self):
        return True

    async def health_check(self):
        raise AssertionError("call_groq delegates to generate only")

    async def generate(self, request):
        self.requests.append(request)
        if self.error:
            raise self.error
        return AIProviderResponse(
            text=self.response_text,
            provider=self.name,
            model=self.model,
            latency_ms=12.5,
        )


@pytest.mark.asyncio
async def test_call_groq_dispatches_to_selected_provider(monkeypatch):
    provider = FakeProvider(response_text="This is a test response.")
    monkeypatch.setattr(service, "get_ai_provider", lambda: provider)

    result = await service.call_groq("Test prompt", project_id="p1", section_key="executive_summary")

    assert result == "This is a test response."
    assert len(provider.requests) == 1
    assert provider.requests[0].prompt == "Test prompt"
    assert provider.requests[0].project_id == "p1"
    assert provider.requests[0].section_key == "executive_summary"


@pytest.mark.asyncio
async def test_call_groq_maps_provider_configuration_error(monkeypatch):
    def raise_config_error():
        raise AIProviderConfigurationError()

    monkeypatch.setattr(service, "get_ai_provider", raise_config_error)

    with pytest.raises(HTTPException) as exc_info:
        await service.call_groq("Test prompt")

    assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert exc_info.value.detail == "AI suggestions are not configured."


@pytest.mark.asyncio
async def test_call_groq_maps_provider_timeout(monkeypatch):
    provider = FakeProvider(error=AIProviderTimeoutError())
    monkeypatch.setattr(service, "get_ai_provider", lambda: provider)

    with pytest.raises(HTTPException) as exc_info:
        await service.call_groq("Test prompt")

    assert exc_info.value.status_code == status.HTTP_504_GATEWAY_TIMEOUT
    assert exc_info.value.detail == "AI suggestion timed out. Please try again."


@pytest.mark.asyncio
async def test_call_groq_logging_security(monkeypatch):
    provider = FakeProvider(response_text="Sensitive AI response content")
    monkeypatch.setattr(service, "get_ai_provider", lambda: provider)

    with monkeypatch.context() as ctx:
        ctx.setattr(service, "logger", type("Logger", (), {"info": lambda self, msg: None, "error": lambda self, msg: None})())
        await service.call_groq("Sensitive user prompt")
