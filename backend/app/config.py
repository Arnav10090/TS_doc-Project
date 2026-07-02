import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    UPLOAD_DIR: str = "/app/uploads"
    TEMPLATE_PATH: str = "/app/templates/TS_Template_jinja.docx"
    
    # AI Suggestions Feature Configuration
    GROQ_API_KEY: str = ""  # Required for AI suggestions; empty string means not configured
    GROQ_MODEL: str = "llama-3.3-70b-versatile"  # Default Groq model
    GROQ_MAX_TOKENS: int = 2048  # Maximum tokens for Groq API responses
    GROQ_TIMEOUT_SECONDS: int = 30  # Timeout for Groq API calls
    GROQ_CHAT_COMPLETIONS_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    TS_DOCUMENTS_DIR: str = "/app/ts_documents"  # Base directory for historical TS documents
    
    class Config:
        env_file = ".env"


settings = Settings()
