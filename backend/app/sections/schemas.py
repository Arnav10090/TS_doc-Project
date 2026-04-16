from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any


class SectionDataCreate(BaseModel):
    content: Dict[str, Any]


class SectionDataResponse(BaseModel):
    id: str
    project_id: str
    section_key: str
    content: Dict[str, Any]
    updated_at: datetime
    
    class Config:
        from_attributes = True
