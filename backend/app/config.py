import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    UPLOAD_DIR: str = "/app/uploads"
    TEMPLATE_PATH: str = "/app/templates/TS_Template_jinja.docx"
    
    # AI Suggestions Feature Configuration
    AI_PROVIDER: str = "ollama"
    GROQ_API_KEY: str = ""  # Required for AI suggestions; empty string means not configured
    GROQ_MODEL: str = "llama-3.3-70b-versatile"  # Default Groq model
    GROQ_MAX_TOKENS: int = 2048  # Maximum tokens for Groq API responses
    GROQ_TIMEOUT_SECONDS: int = 30  # Timeout for Groq API calls
    GROQ_CHAT_COMPLETIONS_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_TIMEOUT: int = 120
    OLLAMA_KEEP_ALIVE: str = "30m"
    OLLAMA_NUM_CTX: int | None = 32768
    OLLAMA_TEMPERATURE: float | None = 0.2
    OLLAMA_NUM_PREDICT: int | None = 2048
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TIMEOUT_SECONDS: int = 60
    OPENAI_MAX_TOKENS: int = 2048
    OPENAI_TEMPERATURE: float = 0.2
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_BASE_URL: str = "https://api.anthropic.com"
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-latest"
    ANTHROPIC_VERSION: str = "2023-06-01"
    ANTHROPIC_TIMEOUT_SECONDS: int = 60
    ANTHROPIC_MAX_TOKENS: int = 2048
    ANTHROPIC_TEMPERATURE: float = 0.2
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_TIMEOUT_SECONDS: int = 60
    GEMINI_MAX_TOKENS: int = 2048
    GEMINI_TEMPERATURE: float = 0.2
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    AZURE_OPENAI_MODEL: str = ""
    AZURE_OPENAI_TIMEOUT_SECONDS: int = 60
    AZURE_OPENAI_MAX_TOKENS: int = 2048
    AZURE_OPENAI_TEMPERATURE: float = 0.2
    TS_DOCUMENTS_DIR: str = "/app/ts_documents"  # Base directory for historical TS documents
    
    class Config:
        env_file = ".env"


settings = Settings()
