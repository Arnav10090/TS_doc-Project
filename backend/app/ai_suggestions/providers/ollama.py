"""Ollama provider implementation for AI Suggestions."""

import asyncio
import time
from typing import Any, Dict, List, Optional

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


def _model_names(payload: Any) -> List[str]:
    if not isinstance(payload, dict):
        return []

    models = payload.get("models")
    if not isinstance(models, list):
        return []

    names: List[str] = []
    for item in models:
        if not isinstance(item, dict):
            continue
        name = item.get("name") or item.get("model")
        if isinstance(name, str):
            names.append(name)
    return names


def extract_ollama_response_text(payload: Any) -> Optional[str]:
    """Extract assistant content from the Ollama chat response schema."""
    if not isinstance(payload, dict):
        return None

    message = payload.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str):
            return content.strip() or None

    response = payload.get("response")
    if isinstance(response, str):
        return response.strip() or None

    return None


class OllamaProvider:
    """Local Ollama Chat API provider."""

    name = "ollama"

    def __init__(self, settings: Settings):
        self._settings = settings
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def model(self) -> str:
        return self._settings.OLLAMA_MODEL

    def is_configured(self) -> bool:
        return bool(self._settings.OLLAMA_BASE_URL and self._settings.OLLAMA_MODEL)

    def _base_url(self) -> str:
        return self._settings.OLLAMA_BASE_URL.rstrip("/")

    def _client_for_timeout(self, timeout_seconds: float) -> httpx.AsyncClient:
        if self._client is None or self._client.timeout != httpx.Timeout(timeout_seconds):
            self._client = httpx.AsyncClient(timeout=timeout_seconds)
        return self._client

    async def health_check(self) -> AIProviderHealth:
        if not self.is_configured():
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="not_configured",
                message="Ollama provider is not configured.",
            )

        timeout_seconds = float(self._settings.OLLAMA_TIMEOUT)
        try:
            client = self._client_for_timeout(timeout_seconds)
            response = await client.get(f"{self._base_url()}/api/tags")
            response.raise_for_status()
            payload = response.json()
        except (httpx.ConnectError, httpx.NetworkError):
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="connection_failed",
                message="Ollama is not reachable. Start Ollama and try again.",
            )
        except (httpx.TimeoutException, asyncio.TimeoutError, TimeoutError):
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="timeout",
                message="Ollama health check timed out. Please try again.",
            )
        except httpx.HTTPStatusError as exc:
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="http_error",
                message=f"Ollama returned HTTP {exc.response.status_code}.",
            )
        except ValueError:
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="invalid_json",
                message="Ollama returned an invalid health response.",
            )
        except Exception:
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="health_check_failed",
                message="Ollama health check failed.",
            )

        names = _model_names(payload)
        if self.model not in names:
            return AIProviderHealth(
                available=False,
                provider=self.name,
                model=self.model,
                error_type="model_missing",
                message=f"Ollama model '{self.model}' is not installed.",
            )

        return AIProviderHealth(available=True, provider=self.name, model=self.model)

    def _options(self, request: AIProviderRequest) -> Dict[str, Any]:
        options: Dict[str, Any] = {}

        temperature = (
            request.temperature
            if request.temperature is not None
            else self._settings.OLLAMA_TEMPERATURE
        )
        if temperature is not None:
            options["temperature"] = temperature

        if self._settings.OLLAMA_NUM_CTX is not None:
            options["num_ctx"] = self._settings.OLLAMA_NUM_CTX

        num_predict = (
            request.max_tokens
            if request.max_tokens is not None
            else self._settings.OLLAMA_NUM_PREDICT
        )
        if num_predict is not None:
            options["num_predict"] = num_predict

        return options

    async def generate(self, request: AIProviderRequest) -> AIProviderResponse:
        health = await self.health_check()
        if not health.available:
            raise AIProviderConfigurationError(
                detail=health.message or "Ollama is not available.",
                error_type=health.error_type or "not_available",
            )

        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }

        options = self._options(request)
        if options:
            payload["options"] = options

        if self._settings.OLLAMA_KEEP_ALIVE:
            payload["keep_alive"] = self._settings.OLLAMA_KEEP_ALIVE

        timeout_seconds = float(request.timeout_seconds or self._settings.OLLAMA_TIMEOUT)
        started_at = time.perf_counter()
        try:
            client = self._client_for_timeout(timeout_seconds)
            response = await client.post(f"{self._base_url()}/api/chat", json=payload)
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

        response_text = extract_ollama_response_text(response_payload)
        if not response_text:
            raise AIProviderError(error_type="empty_response")

        latency_ms = (time.perf_counter() - started_at) * 1000
        return AIProviderResponse(
            text=response_text,
            provider=self.name,
            model=self.model,
            latency_ms=latency_ms,
        )
