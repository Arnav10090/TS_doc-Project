"""OpenAI-compatible providers for AI Suggestions."""

import asyncio
import time
from typing import Any, Optional

import httpx

from app.config import Settings
from app.ai_suggestions.providers.base import (
    AIProviderHealth,
    AIProviderRequest,
    AIProviderResponse,
)
from app.ai_suggestions.providers.errors import (
    AIProviderConfigurationError,
    AIProviderError,
    AIProviderTimeoutError,
)
from app.ai_suggestions.providers.groq import extract_groq_response_text


class OpenAIProvider:
    """OpenAI Chat Completions provider."""

    name = "openai"

    def __init__(self, settings: Settings):
        self._settings = settings
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def model(self) -> str:
        return self._settings.OPENAI_MODEL

    def is_configured(self) -> bool:
        return bool(self._settings.OPENAI_API_KEY and self._settings.OPENAI_MODEL)

    async def health_check(self) -> AIProviderHealth:
        if not self.is_configured():
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="missing_api_key",
                message="AI suggestions are not configured.",
            )
        return AIProviderHealth(available=True, provider=self.name, model=self.model)

    def _client_for_timeout(self, timeout_seconds: float) -> httpx.AsyncClient:
        if self._client is None or self._client.timeout != httpx.Timeout(timeout_seconds):
            self._client = httpx.AsyncClient(timeout=timeout_seconds)
        return self._client

    async def generate(self, request: AIProviderRequest) -> AIProviderResponse:
        health = await self.health_check()
        if not health.available:
            raise AIProviderConfigurationError(
                detail=health.message or "AI suggestions are not configured.",
                error_type=health.error_type or "not_configured",
            )

        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": request.max_tokens or self._settings.OPENAI_MAX_TOKENS,
            "temperature": (
                request.temperature
                if request.temperature is not None
                else self._settings.OPENAI_TEMPERATURE
            ),
        }
        headers = {
            "Authorization": f"Bearer {self._settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        timeout_seconds = float(request.timeout_seconds or self._settings.OPENAI_TIMEOUT_SECONDS)
        url = f"{self._settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"

        started_at = time.perf_counter()
        try:
            client = self._client_for_timeout(timeout_seconds)
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
        except (httpx.TimeoutException, asyncio.TimeoutError, TimeoutError):
            raise AIProviderTimeoutError()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            raise AIProviderError(error_type="http_error", provider_status_code=status_code)
        except Exception as exc:
            raise AIProviderError(error_type=type(exc).__name__)

        try:
            response_payload = response.json()
        except ValueError:
            raise AIProviderError(error_type="invalid_json")

        response_text = extract_groq_response_text(response_payload)
        if not response_text:
            raise AIProviderError(error_type="empty_response")

        return AIProviderResponse(
            text=response_text,
            provider=self.name,
            model=self.model,
            latency_ms=(time.perf_counter() - started_at) * 1000,
        )


class AzureOpenAIProvider(OpenAIProvider):
    """Azure OpenAI Chat Completions provider."""

    name = "azure_openai"

    @property
    def model(self) -> str:
        return self._settings.AZURE_OPENAI_MODEL or self._settings.AZURE_OPENAI_DEPLOYMENT

    def is_configured(self) -> bool:
        return bool(
            self._settings.AZURE_OPENAI_API_KEY
            and self._settings.AZURE_OPENAI_ENDPOINT
            and self._settings.AZURE_OPENAI_DEPLOYMENT
        )

    async def health_check(self) -> AIProviderHealth:
        if not self.is_configured():
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="not_configured",
                message="Azure OpenAI provider is not configured.",
            )
        return AIProviderHealth(available=True, provider=self.name, model=self.model)

    async def generate(self, request: AIProviderRequest) -> AIProviderResponse:
        health = await self.health_check()
        if not health.available:
            raise AIProviderConfigurationError(
                detail=health.message or "AI suggestions are not configured.",
                error_type=health.error_type or "not_configured",
            )

        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})

        payload = {
            "messages": messages,
            "max_tokens": request.max_tokens or self._settings.AZURE_OPENAI_MAX_TOKENS,
            "temperature": (
                request.temperature
                if request.temperature is not None
                else self._settings.AZURE_OPENAI_TEMPERATURE
            ),
        }
        headers = {
            "api-key": self._settings.AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json",
        }
        timeout_seconds = float(request.timeout_seconds or self._settings.AZURE_OPENAI_TIMEOUT_SECONDS)
        base = self._settings.AZURE_OPENAI_ENDPOINT.rstrip("/")
        deployment = self._settings.AZURE_OPENAI_DEPLOYMENT
        version = self._settings.AZURE_OPENAI_API_VERSION
        url = f"{base}/openai/deployments/{deployment}/chat/completions?api-version={version}"

        started_at = time.perf_counter()
        try:
            client = self._client_for_timeout(timeout_seconds)
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
        except (httpx.TimeoutException, asyncio.TimeoutError, TimeoutError):
            raise AIProviderTimeoutError()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            raise AIProviderError(error_type="http_error", provider_status_code=status_code)
        except Exception as exc:
            raise AIProviderError(error_type=type(exc).__name__)

        try:
            response_payload = response.json()
        except ValueError:
            raise AIProviderError(error_type="invalid_json")

        response_text = extract_groq_response_text(response_payload)
        if not response_text:
            raise AIProviderError(error_type="empty_response")

        return AIProviderResponse(
            text=response_text,
            provider=self.name,
            model=self.model,
            latency_ms=(time.perf_counter() - started_at) * 1000,
        )
