from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
from typing import Optional, Dict, List

from app.ai_suggestions.validation import validate_ts_type


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
    ts_type: Optional[str] = None  # Optional for backward compatibility with legacy projects

    @field_validator("ts_type")
    @classmethod
    def validate_required_ts_type(cls, value: Optional[str]) -> str:
        return validate_ts_type(value, required=True)  # type: ignore[return-value]


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
    ts_type: Optional[str] = None

    @field_validator("ts_type")
    @classmethod
    def validate_optional_ts_type(cls, value: Optional[str]) -> Optional[str]:
        return validate_ts_type(value, required=False)


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
    ts_type: Optional[str] = None  # Optional for backward compatibility with legacy projects

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
    ts_type: Optional[str] = None  # Optional for backward compatibility with legacy projects

    class Config:
        from_attributes = True


class TSTypeOption(BaseModel):
    """TS Type option for dropdown selection."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "value": "Data Analysis/Data Centralization/Historian",
                    "label": "Data Analysis - Data Centralization - Historian",
                }
            ]
        }
    )

    value: str = Field(description="Canonical path format, for example `Data Analysis/Data Centralization/Historian`.")
    label: str = Field(description="Display label for the project creation dropdown.")


class TSTypesResponse(BaseModel):
    """Response containing all available TS type options."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "ts_types": [
                        {
                            "value": "Data Analysis/Data Centralization/UGS",
                            "label": "Data Analysis - Data Centralization - UGS",
                        },
                        {"value": "Level 2", "label": "Level 2"},
                    ]
                }
            ]
        }
    )

    ts_types: List[TSTypeOption] = Field(description="Available TS type options.")
