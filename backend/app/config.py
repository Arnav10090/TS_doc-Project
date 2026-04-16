import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    UPLOAD_DIR: str = "/app/uploads"
    TEMPLATE_PATH: str = "/app/templates/TS_Template_jinja.docx"
    
    class Config:
        env_file = ".env"


settings = Settings()
