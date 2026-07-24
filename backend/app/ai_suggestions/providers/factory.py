"""Provider factory and dependency selection for AI Suggestions."""

from typing import Dict, Tuple

from app.config import Settings, settings
from app.ai_suggestions.providers.anthropic import AnthropicProvider
from app.ai_suggestions.providers.base import AIProvider
from app.ai_suggestions.providers.errors import AIProviderConfigurationError
from app.ai_suggestions.providers.gemini import GeminiProvider
from app.ai_suggestions.providers.groq import GroqProvider
from app.ai_suggestions.providers.ollama import OllamaProvider
from app.ai_suggestions.providers.openai_provider import AzureOpenAIProvider, OpenAIProvider


_PROVIDER_CACHE: Dict[Tuple[str, str, str, str, str, str, str, str], AIProvider] = {}


def clear_provider_cache() -> None:
    """Clear cached providers. Intended for tests when monkeypatching settings."""
    _PROVIDER_CACHE.clear()


def _provider_cache_key(config: Settings) -> Tuple[str, str, str, str, str, str, str, str]:
    provider = config.AI_PROVIDER.strip().lower()
    return (
        provider,
        config.GROQ_MODEL,
        config.OLLAMA_BASE_URL,
        config.OLLAMA_MODEL,
        config.OPENAI_MODEL,
        config.ANTHROPIC_MODEL,
        config.GEMINI_MODEL,
        config.AZURE_OPENAI_DEPLOYMENT,
    )


def get_ai_provider(config: Settings = settings) -> AIProvider:
    """Return the configured provider instance."""
    provider_name = config.AI_PROVIDER.strip().lower()
    key = _provider_cache_key(config)
    if key in _PROVIDER_CACHE:
        return _PROVIDER_CACHE[key]

    if provider_name == "groq":
        provider: AIProvider = GroqProvider(config)
    elif provider_name == "ollama":
        provider = OllamaProvider(config)
    elif provider_name == "gemini":
        provider = GeminiProvider(config)
    elif provider_name == "openai":
        provider = OpenAIProvider(config)
    elif provider_name == "anthropic":
        provider = AnthropicProvider(config)
    elif provider_name in {"azure_openai", "azure-openai", "azure"}:
        provider = AzureOpenAIProvider(config)
    else:
        raise AIProviderConfigurationError(
            detail=f"AI provider '{config.AI_PROVIDER}' is not supported.",
            error_type="unsupported_provider",
        )

    _PROVIDER_CACHE[key] = provider
    return provider
