"""Unit tests for AI Suggestions provider abstraction and Ollama provider."""

from types import SimpleNamespace
import httpx
import pytest

from app.ai_suggestions.providers.errors import (
    AIProviderConfigurationError,
    AIProviderError,
    AIProviderTimeoutError,
)
from app.ai_suggestions.providers.anthropic import AnthropicProvider
from app.ai_suggestions.providers.base import AIProviderRequest
from app.ai_suggestions.providers.factory import clear_provider_cache, get_ai_provider
from app.ai_suggestions.providers.gemini import GeminiProvider
from app.ai_suggestions.providers.groq import GroqProvider
from app.ai_suggestions.providers.ollama import OllamaProvider
from app.ai_suggestions.providers.openai_provider import AzureOpenAIProvider, OpenAIProvider


class FakeResponse:
    def __init__(self, payload=None, status_code=200, json_error=None):
        self.payload = payload or {}
        self.status_code = status_code
        self.json_error = json_error
        self.request = httpx.Request("GET", "http://test")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                "provider error",
                request=self.request,
                response=httpx.Response(self.status_code, request=self.request),
            )

    def json(self):
        if self.json_error:
            raise self.json_error
        return self.payload


class FakeAsyncClient:
    instances = []
    get_responses = []
    post_responses = []
    get_error = None
    post_error = None

    def __init__(self, timeout=None):
        self.timeout = httpx.Timeout(timeout) if not isinstance(timeout, httpx.Timeout) else timeout
        self.get_calls = []
        self.post_calls = []
        FakeAsyncClient.instances.append(self)

    async def get(self, url):
        self.get_calls.append(url)
        if FakeAsyncClient.get_error:
            raise FakeAsyncClient.get_error
        return FakeAsyncClient.get_responses.pop(0)

    async def post(self, url, json=None):
        self.post_calls.append({"url": url, "json": json})
        if FakeAsyncClient.post_error:
            raise FakeAsyncClient.post_error
        return FakeAsyncClient.post_responses.pop(0)


@pytest.fixture(autouse=True)
def reset_fake_client():
    clear_provider_cache()
    FakeAsyncClient.instances = []
    FakeAsyncClient.get_responses = []
    FakeAsyncClient.post_responses = []
    FakeAsyncClient.get_error = None
    FakeAsyncClient.post_error = None
    yield
    clear_provider_cache()


def _settings(**overrides):
    base = {
        "AI_PROVIDER": "ollama",
        "GROQ_API_KEY": "groq-key",
        "GROQ_MODEL": "llama-3.3-70b-versatile",
        "GROQ_MAX_TOKENS": 2048,
        "GROQ_TIMEOUT_SECONDS": 30,
        "GROQ_CHAT_COMPLETIONS_URL": "https://api.groq.com/openai/v1/chat/completions",
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "gemma3:4b",
        "OLLAMA_TIMEOUT": 120,
        "OLLAMA_KEEP_ALIVE": "30m",
        "OLLAMA_NUM_CTX": 32768,
        "OLLAMA_TEMPERATURE": 0.2,
        "OLLAMA_NUM_PREDICT": 2048,
        "OPENAI_API_KEY": "openai-key",
        "OPENAI_BASE_URL": "https://api.openai.com/v1",
        "OPENAI_MODEL": "gpt-4o-mini",
        "OPENAI_TIMEOUT_SECONDS": 60,
        "OPENAI_MAX_TOKENS": 2048,
        "OPENAI_TEMPERATURE": 0.2,
        "ANTHROPIC_API_KEY": "anthropic-key",
        "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
        "ANTHROPIC_MODEL": "claude-3-5-sonnet-latest",
        "ANTHROPIC_VERSION": "2023-06-01",
        "ANTHROPIC_TIMEOUT_SECONDS": 60,
        "ANTHROPIC_MAX_TOKENS": 2048,
        "ANTHROPIC_TEMPERATURE": 0.2,
        "GEMINI_API_KEY": "gemini-key",
        "GEMINI_BASE_URL": "https://generativelanguage.googleapis.com/v1beta",
        "GEMINI_MODEL": "gemini-1.5-flash",
        "GEMINI_TIMEOUT_SECONDS": 60,
        "GEMINI_MAX_TOKENS": 2048,
        "GEMINI_TEMPERATURE": 0.2,
        "AZURE_OPENAI_API_KEY": "azure-key",
        "AZURE_OPENAI_ENDPOINT": "https://example.openai.azure.com",
        "AZURE_OPENAI_DEPLOYMENT": "deployment",
        "AZURE_OPENAI_API_VERSION": "2024-02-15-preview",
        "AZURE_OPENAI_MODEL": "deployment",
        "AZURE_OPENAI_TIMEOUT_SECONDS": 60,
        "AZURE_OPENAI_MAX_TOKENS": 2048,
        "AZURE_OPENAI_TEMPERATURE": 0.2,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_provider_selection_ollama():
    provider = get_ai_provider(_settings(AI_PROVIDER="ollama"))
    assert isinstance(provider, OllamaProvider)
    assert provider.name == "ollama"


def test_provider_selection_groq():
    provider = get_ai_provider(_settings(AI_PROVIDER="groq"))
    assert isinstance(provider, GroqProvider)
    assert provider.name == "groq"


def test_provider_selection_future_http_providers():
    provider = get_ai_provider(_settings(AI_PROVIDER="gemini"))
    assert isinstance(provider, GeminiProvider)

    clear_provider_cache()
    provider = get_ai_provider(_settings(AI_PROVIDER="openai"))
    assert isinstance(provider, OpenAIProvider)

    clear_provider_cache()
    provider = get_ai_provider(_settings(AI_PROVIDER="anthropic"))
    assert isinstance(provider, AnthropicProvider)

    clear_provider_cache()
    provider = get_ai_provider(_settings(AI_PROVIDER="azure_openai"))
    assert isinstance(provider, AzureOpenAIProvider)


def test_provider_selection_unsupported():
    with pytest.raises(AIProviderConfigurationError) as exc_info:
        get_ai_provider(_settings(AI_PROVIDER="cohere"))
    assert exc_info.value.error_type == "unsupported_provider"


@pytest.mark.asyncio
async def test_ollama_health_success(monkeypatch):
    monkeypatch.setattr("app.ai_suggestions.providers.ollama.httpx.AsyncClient", FakeAsyncClient)
    FakeAsyncClient.get_responses = [FakeResponse({"models": [{"name": "gemma3:4b"}]})]

    provider = OllamaProvider(_settings())
    health = await provider.health_check()

    assert health.available is True
    assert FakeAsyncClient.instances[0].get_calls == ["http://localhost:11434/api/tags"]


@pytest.mark.asyncio
async def test_ollama_health_model_missing(monkeypatch):
    monkeypatch.setattr("app.ai_suggestions.providers.ollama.httpx.AsyncClient", FakeAsyncClient)
    FakeAsyncClient.get_responses = [FakeResponse({"models": [{"name": "llama3:8b"}]})]

    provider = OllamaProvider(_settings())
    health = await provider.health_check()

    assert health.available is False
    assert health.error_type == "model_missing"


@pytest.mark.asyncio
async def test_ollama_health_connection_refused(monkeypatch):
    monkeypatch.setattr("app.ai_suggestions.providers.ollama.httpx.AsyncClient", FakeAsyncClient)
    FakeAsyncClient.get_error = httpx.ConnectError("connection refused")

    provider = OllamaProvider(_settings())
    health = await provider.health_check()

    assert health.available is False
    assert health.error_type == "connection_failed"


@pytest.mark.asyncio
async def test_ollama_generate_success(monkeypatch):
    monkeypatch.setattr("app.ai_suggestions.providers.ollama.httpx.AsyncClient", FakeAsyncClient)
    FakeAsyncClient.get_responses = [FakeResponse({"models": [{"name": "gemma3:4b"}]})]
    FakeAsyncClient.post_responses = [FakeResponse({"message": {"content": "Generated suggestion"}})]

    provider = OllamaProvider(_settings())
    response = await provider.generate(AIProviderRequest(prompt="Build a suggestion"))

    assert response.text == "Generated suggestion"
    call = FakeAsyncClient.instances[0].post_calls[0]
    assert call["url"] == "http://localhost:11434/api/chat"
    assert call["json"]["model"] == "gemma3:4b"
    assert call["json"]["messages"] == [{"role": "user", "content": "Build a suggestion"}]
    assert call["json"]["stream"] is False
    assert call["json"]["options"] == {
        "temperature": 0.2,
        "num_ctx": 32768,
        "num_predict": 2048,
    }
    assert call["json"]["keep_alive"] == "30m"


@pytest.mark.asyncio
async def test_ollama_generate_timeout(monkeypatch):
    monkeypatch.setattr("app.ai_suggestions.providers.ollama.httpx.AsyncClient", FakeAsyncClient)
    FakeAsyncClient.get_responses = [FakeResponse({"models": [{"name": "gemma3:4b"}]})]
    FakeAsyncClient.post_error = httpx.TimeoutException("timeout")

    provider = OllamaProvider(_settings())

    with pytest.raises(AIProviderTimeoutError):
        await provider.generate(AIProviderRequest(prompt="Build a suggestion"))


@pytest.mark.asyncio
async def test_ollama_generate_invalid_json(monkeypatch):
    monkeypatch.setattr("app.ai_suggestions.providers.ollama.httpx.AsyncClient", FakeAsyncClient)
    FakeAsyncClient.get_responses = [FakeResponse({"models": [{"name": "gemma3:4b"}]})]
    FakeAsyncClient.post_responses = [FakeResponse(json_error=ValueError("bad json"))]

    provider = OllamaProvider(_settings())

    with pytest.raises(AIProviderError) as exc_info:
        await provider.generate(AIProviderRequest(prompt="Build a suggestion"))
    assert exc_info.value.error_type == "invalid_json"


@pytest.mark.asyncio
async def test_ollama_generate_empty_response(monkeypatch):
    monkeypatch.setattr("app.ai_suggestions.providers.ollama.httpx.AsyncClient", FakeAsyncClient)
    FakeAsyncClient.get_responses = [FakeResponse({"models": [{"name": "gemma3:4b"}]})]
    FakeAsyncClient.post_responses = [FakeResponse({"message": {"content": ""}})]

    provider = OllamaProvider(_settings())

    with pytest.raises(AIProviderError) as exc_info:
        await provider.generate(AIProviderRequest(prompt="Build a suggestion"))
    assert exc_info.value.error_type == "empty_response"

