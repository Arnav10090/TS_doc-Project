from pydantic import BaseModel
from datetime import datetime
from typing import List


class DocumentVersionResponse(BaseModel):
    id: str
    project_id: str
    version_number: int
    filename: str
    file_path: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class GenerationError(BaseModel):
    message: str
    missing_sections: List[str]
