"""Base types for AI Suggestions providers."""

from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass(frozen=True)
class AIProviderRequest:
    """Normalized request passed from AI Suggestions to an inference provider."""

    prompt: str
    system_prompt: Optional[str] = None
    timeout_seconds: Optional[float] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    request_id: Optional[str] = None
    project_id: Optional[str] = None
    section_key: Optional[str] = None


@dataclass(frozen=True)
class AIProviderResponse:
    """Normalized provider response."""

    text: str
    provider: str
    model: str
    latency_ms: float


@dataclass(frozen=True)
class AIProviderHealth:
    """Non-secret provider health information."""

    available: bool
    provider: str
    model: str
    error_type: Optional[str] = None
    message: Optional[str] = None


class AIProvider(Protocol):
    """Interface all AI Suggestions inference providers must implement."""

    @property
    def name(self) -> str:
        """Provider identifier used in configuration and logs."""

    @property
    def model(self) -> str:
        """Configured model name."""

    def is_configured(self) -> bool:
        """Return true when required non-secret configuration is present."""

    async def health_check(self) -> AIProviderHealth:
        """Verify provider availability without generating content."""

    async def generate(self, request: AIProviderRequest) -> AIProviderResponse:
        """Generate text from a normalized request."""
