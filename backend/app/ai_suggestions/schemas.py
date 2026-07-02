from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Any, List, Dict


class SuggestionRequest(BaseModel):
    """Request payload for section AI Suggestions."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "draft_content": {
                        "paragraph": "Current unsaved editor text or structured draft data"
                    }
                }
            ]
        }
    )

    draft_content: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Current unsaved editor content for the section. Included in the prompt but never persisted by this endpoint.",
    )


class AISuggestionsStatusResponse(BaseModel):
    """Non-secret AI Suggestions availability status."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"groq_configured": True}]}
    )

    groq_configured: bool = Field(
        description="True when GROQ_API_KEY is configured on the backend."
    )


class SubsectionSuggestion(BaseModel):
    """Suggestion result for one saved custom subsection."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "subsection_index": 0,
                    "subsection_name": "Integration Scope",
                    "type": "paragraph",
                    "content": "<p>Suggested subsection content...</p>",
                    "raw_text": None,
                    "structured_import_available": True,
                }
            ]
        }
    )

    subsection_index: int = Field(description="Zero-based subsection index from the saved custom section payload.")
    subsection_name: Optional[str] = Field(default=None, description="Saved subsection name, if present.")
    type: str = Field(description="Saved subsection content type, such as paragraph, table, or image.")
    content: Optional[Any] = Field(default=None, description="Structured parsed content when import is available.")
    raw_text: Optional[str] = Field(default=None, description="Raw AI text when structured parsing is unavailable.")
    structured_import_available: bool = Field(default=False, description="Whether content can be imported directly into the editor schema.")


class SuggestionResponse(BaseModel):
    """AI suggestion response for predefined and custom sections."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "section_key": "executive_summary",
                    "section_title": "Executive Summary",
                    "suggestion_mode": "predefined",
                    "structured_import_available": True,
                    "content": "<p>Suggested executive summary...</p>",
                    "subsection_suggestions": None,
                    "raw_text": None,
                    "historical_context_available": True,
                    "context_sources": ["UGS/Technical Proposal_Jindal_Steel_UGS_R1.Pdf"],
                    "context_txt_used": True,
                    "section_guidance_used": False,
                }
            ]
        }
    )

    section_key: str = Field(description="Target section key.")
    section_title: Optional[str] = Field(default=None, description="Human-readable section title.")
    suggestion_mode: Optional[str] = Field(default=None, description="predefined or custom.")
    structured_import_available: bool = Field(description="Whether the generated output matched the editor schema.")
    content: Optional[Any] = Field(default=None, description="Structured suggestion content for predefined sections.")
    subsection_suggestions: Optional[List[SubsectionSuggestion]] = Field(default=None, description="Per-subsection suggestions for custom sections.")
    raw_text: Optional[str] = Field(default=None, description="Raw fallback text when structured parsing fails.")
    historical_context_available: bool = Field(default=False, description="Whether context.txt or historical documents were available.")
    context_sources: Optional[List[str]] = Field(default=None, description="Historical document excerpts included in the prompt.")
    context_txt_used: Optional[bool] = Field(default=False, description="Whether category-level context.txt was included.")
    # Task 25.4: section_guidance_used flag for observability and debugging
    section_guidance_used: Optional[bool] = Field(
        default=False,
        description="Whether a section-specific guidance file was found and included in the prompt (layered context only).",
    )


class DrawioResponse(BaseModel):
    """Draw.io mxGraph XML response for Gantt sections."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "drawio_xml": "<mxGraphModel><root>...</root></mxGraphModel>",
                    "chart_instructions": "Copy the XML below, open https://app.diagrams.net, then File - Import From - Device. Paste the XML and import the diagram.",
                }
            ]
        }
    )

    drawio_xml: str = Field(description="Valid mxGraph XML that can be imported into draw.io or diagrams.net.")
    chart_instructions: Optional[str] = Field(default=None, description="User-facing import instructions.")


class GanttTask(BaseModel):
    """Week-based Gantt task emitted by Groq before XML conversion."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "task": "Mobilization",
                    "phase": "Preparation",
                    "start_week": 1,
                    "duration_weeks": 2,
                    "milestone": False,
                    "dependencies": [],
                }
            ]
        }
    )

    task: str = Field(description="Task label displayed in the Gantt chart.")
    phase: Optional[str] = Field(default=None, description="Optional phase/group label.")
    start_week: int = Field(description="One-based start week.")
    duration_weeks: int = Field(description="Task duration in weeks.")
    milestone: bool = Field(default=False, description="Whether the task is rendered as a milestone marker.")
    dependencies: Optional[List[int]] = Field(default=None, description="Indexes of predecessor tasks in the generated task array.")
