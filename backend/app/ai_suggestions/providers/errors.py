"""Provider-neutral errors for AI Suggestions inference."""

from dataclasses import dataclass
from typing import Optional

from fastapi import status


@dataclass
class AIProviderError(Exception):
    """Error raised by provider implementations before FastAPI mapping."""

    error_type: str
    detail: str = "AI provider error. Please try again."
    status_code: int = status.HTTP_502_BAD_GATEWAY
    provider_status_code: Optional[int] = None

    def __str__(self) -> str:
        return self.detail


class AIProviderConfigurationError(AIProviderError):
    """Provider configuration is missing or unsupported."""

    def __init__(self, detail: str = "AI suggestions are not configured.", error_type: str = "not_configured"):
        super().__init__(
            error_type=error_type,
            detail=detail,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class AIProviderTimeoutError(AIProviderError):
    """Provider did not respond within the configured timeout."""

    def __init__(self, detail: str = "AI suggestion timed out. Please try again."):
        super().__init__(
            error_type="timeout",
            detail=detail,
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        )
