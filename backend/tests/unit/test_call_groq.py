"""Unit tests for the call_groq() function in ai_suggestions/service.py."""

import httpx
import pytest
from fastapi import HTTPException, status
from unittest.mock import MagicMock, patch

from app.ai_suggestions.service import call_groq


class FakeAsyncClient:
    instances = []
    response = None
    error = None

    def __init__(self, timeout=None):
        self.timeout = timeout
        self.post_calls = []
        FakeAsyncClient.instances.append(self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers=None, json=None):
        self.post_calls.append({"url": url, "headers": headers, "json": json})
        if FakeAsyncClient.error:
            raise FakeAsyncClient.error
        return FakeAsyncClient.response


@pytest.fixture(autouse=True)
def reset_fake_async_client():
    FakeAsyncClient.instances = []
    FakeAsyncClient.response = None
    FakeAsyncClient.error = None
    yield
    FakeAsyncClient.instances = []
    FakeAsyncClient.response = None
    FakeAsyncClient.error = None


def _mock_settings(api_key="test-api-key"):
    settings = MagicMock()
    settings.GROQ_API_KEY = api_key
    settings.GROQ_MODEL = "llama-3.3-70b-versatile"
    settings.GROQ_MAX_TOKENS = 2048
    settings.GROQ_TIMEOUT_SECONDS = 30
    settings.GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
    return settings


def _mock_response(content="This is a test response from Groq."):
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": content,
                }
            }
        ]
    }
    return response


@pytest.mark.asyncio
async def test_call_groq_missing_api_key():
    """call_groq raises 503 when GROQ_API_KEY is not configured."""
    with patch("app.ai_suggestions.service.settings", _mock_settings(api_key="")):
        with pytest.raises(HTTPException) as exc_info:
            await call_groq("Test prompt")

        assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert exc_info.value.detail == "AI suggestions are not configured."


@pytest.mark.asyncio
async def test_call_groq_success():
    """call_groq sends an OpenAI-compatible chat completion request to Groq."""
    FakeAsyncClient.response = _mock_response()

    with patch("app.ai_suggestions.service.settings", _mock_settings()):
        with patch("app.ai_suggestions.service.httpx.AsyncClient", FakeAsyncClient):
            result = await call_groq("Test prompt")

    assert result == "This is a test response from Groq."
    assert len(FakeAsyncClient.instances) == 1
    call = FakeAsyncClient.instances[0].post_calls[0]
    assert call["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert call["headers"]["Authorization"] == "Bearer test-api-key"
    assert call["json"] == {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": "Test prompt"}],
        "max_tokens": 2048,
        "temperature": 0.7,
    }


@pytest.mark.asyncio
async def test_call_groq_empty_response():
    """call_groq raises 502 when Groq returns no assistant content."""
    FakeAsyncClient.response = _mock_response(content="")

    with patch("app.ai_suggestions.service.settings", _mock_settings()):
        with patch("app.ai_suggestions.service.httpx.AsyncClient", FakeAsyncClient):
            with pytest.raises(HTTPException) as exc_info:
                await call_groq("Test prompt")

    assert exc_info.value.status_code == status.HTTP_502_BAD_GATEWAY
    assert exc_info.value.detail == "AI provider error. Please try again."


@pytest.mark.asyncio
async def test_call_groq_timeout():
    """call_groq raises 504 when the Groq request times out."""
    FakeAsyncClient.error = httpx.TimeoutException("Request timed out")

    with patch("app.ai_suggestions.service.settings", _mock_settings()):
        with patch("app.ai_suggestions.service.httpx.AsyncClient", FakeAsyncClient):
            with pytest.raises(HTTPException) as exc_info:
                await call_groq("Test prompt")

    assert exc_info.value.status_code == status.HTTP_504_GATEWAY_TIMEOUT
    assert exc_info.value.detail == "AI suggestion timed out. Please try again."


@pytest.mark.asyncio
async def test_call_groq_provider_error():
    """call_groq raises 502 for non-timeout provider errors."""
    request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    response = httpx.Response(429, request=request)
    FakeAsyncClient.response = _mock_response()
    FakeAsyncClient.response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "rate limit exceeded",
        request=request,
        response=response,
    )

    with patch("app.ai_suggestions.service.settings", _mock_settings()):
        with patch("app.ai_suggestions.service.httpx.AsyncClient", FakeAsyncClient):
            with pytest.raises(HTTPException) as exc_info:
                await call_groq("Test prompt")

    assert exc_info.value.status_code == status.HTTP_502_BAD_GATEWAY
    assert exc_info.value.detail == "AI provider error. Please try again."


@pytest.mark.asyncio
async def test_call_groq_custom_timeout():
    """call_groq respects a custom timeout parameter."""
    FakeAsyncClient.response = _mock_response(content="Test response")

    with patch("app.ai_suggestions.service.settings", _mock_settings()):
        with patch("app.ai_suggestions.service.httpx.AsyncClient", FakeAsyncClient):
            result = await call_groq("Test prompt", timeout=60)

    assert result == "Test response"
    assert FakeAsyncClient.instances[0].timeout == 60


@pytest.mark.asyncio
async def test_call_groq_logging_security():
    """call_groq logs only metadata, never raw prompts/responses."""
    FakeAsyncClient.response = _mock_response(content="Sensitive AI response content")

    with patch("app.ai_suggestions.service.settings", _mock_settings()):
        with patch("app.ai_suggestions.service.httpx.AsyncClient", FakeAsyncClient):
            with patch("app.ai_suggestions.service.logger") as mock_logger:
                await call_groq("Sensitive user prompt")

    assert mock_logger.info.called
    for call_args in mock_logger.info.call_args_list:
        log_message = call_args[0][0]
        assert "Sensitive user prompt" not in log_message
        assert "Sensitive AI response content" not in log_message
        assert "prompt_size=" in log_message or "response_size=" in log_message
