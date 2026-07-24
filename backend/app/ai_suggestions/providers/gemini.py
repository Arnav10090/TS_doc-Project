"""Gemini provider implementation for AI Suggestions."""

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


def extract_gemini_response_text(payload: Any) -> Optional[str]:
    if not isinstance(payload, dict):
        return None

    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return None

    content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
    parts = content.get("parts") if isinstance(content, dict) else None
    if not isinstance(parts, list):
        return None

    text = "\n".join(
        part.get("text", "")
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str)
    ).strip()
    return text or None


class GeminiProvider:
    """Google Gemini generateContent provider."""

    name = "gemini"

    def __init__(self, settings: Settings):
        self._settings = settings
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def model(self) -> str:
        return self._settings.GEMINI_MODEL

    def is_configured(self) -> bool:
        return bool(self._settings.GEMINI_API_KEY and self._settings.GEMINI_MODEL)

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

        contents = [{"role": "user", "parts": [{"text": request.prompt}]}]
        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": (
                    request.temperature
                    if request.temperature is not None
                    else self._settings.GEMINI_TEMPERATURE
                ),
                "maxOutputTokens": request.max_tokens or self._settings.GEMINI_MAX_TOKENS,
            },
        }
        if request.system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": request.system_prompt}]}

        timeout_seconds = float(request.timeout_seconds or self._settings.GEMINI_TIMEOUT_SECONDS)
        base = self._settings.GEMINI_BASE_URL.rstrip("/")
        url = f"{base}/models/{self.model}:generateContent?key={self._settings.GEMINI_API_KEY}"

        started_at = time.perf_counter()
        try:
            client = self._client_for_timeout(timeout_seconds)
            response = await client.post(url, json=payload)
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

        response_text = extract_gemini_response_text(response_payload)
        if not response_text:
            raise AIProviderError(error_type="empty_response")

        return AIProviderResponse(
            text=response_text,
            provider=self.name,
            model=self.model,
            latency_ms=(time.perf_counter() - started_at) * 1000,
        )
