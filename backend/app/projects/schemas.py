from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict


class ProjectCreate(BaseModel):
    solution_name: str
    solution_full_name: str
    solution_abbreviation: Optional[str] = None
    client_name: str
    client_location: str
    client_abbreviation: Optional[str] = None
    ref_number: Optional[str] = None
    doc_date: Optional[str] = None
    doc_version: Optional[str] = "0"


class ProjectUpdate(BaseModel):
    solution_name: Optional[str] = None
    solution_full_name: Optional[str] = None
    solution_abbreviation: Optional[str] = None
    client_name: Optional[str] = None
    client_location: Optional[str] = None
    client_abbreviation: Optional[str] = None
    ref_number: Optional[str] = None
    doc_date: Optional[str] = None
    doc_version: Optional[str] = None


class CompletionSummary(BaseModel):
    total: int
    completed: int
    percentage: int


class ProjectSummary(BaseModel):
    id: str
    solution_name: str
    client_name: str
    client_location: str
    created_at: datetime
    completion_percentage: int
    total_sections: int
    
    class Config:
        from_attributes = True


class ProjectDetail(BaseModel):
    id: str
    solution_name: str
    solution_full_name: str
    solution_abbreviation: Optional[str]
    client_name: str
    client_location: str
    client_abbreviation: Optional[str]
    ref_number: Optional[str]
    doc_date: Optional[str]
    doc_version: Optional[str]
    created_at: datetime
    updated_at: datetime
    completion_summary: CompletionSummary
    section_completion: Dict[str, bool]
    
    class Config:
        from_attributes = True
