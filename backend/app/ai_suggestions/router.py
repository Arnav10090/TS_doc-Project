from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import logging

from app.database import get_db
from app.ai_suggestions import schemas, service as ai_service
from app.projects import service as project_service
from app.ai_suggestions.validation import is_valid_ai_section_key
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["ai_suggestions"])
logger = logging.getLogger(__name__)


_SUPPRESSED_SECTIONS = {"cover", "revision_history", "abbreviations"}

_AI_ERROR_RESPONSES = {
    400: {
        "description": "Invalid section key, suppressed section, invalid TS type, or project has no TS type.",
        "content": {"application/json": {"examples": {
            "missing_ts_type": {"summary": "Missing TS type", "value": {"detail": "Project must have a TS type selected to use AI suggestions"}},
            "suppressed": {"summary": "Suppressed section", "value": {"detail": "AI suggestions are not available for section 'cover'"}},
        }}},
    },
    404: {
        "description": "Project or saved custom section was not found.",
        "content": {"application/json": {"examples": {
            "project": {"summary": "Project not found", "value": {"detail": "Project not found"}},
            "custom": {"summary": "Custom section not saved", "value": {"detail": "Custom section not found"}},
        }}},
    },
    502: {
        "description": "Groq provider error or invalid AI provider payload.",
        "content": {"application/json": {"example": {"detail": "AI provider error. Please try again."}}},
    },
    503: {
        "description": "AI Suggestions is not configured because GROQ_API_KEY is missing.",
        "content": {"application/json": {"example": {"detail": "AI suggestions are not configured."}}},
    },
    504: {
        "description": "Groq request timed out.",
        "content": {"application/json": {"example": {"detail": "AI suggestion timed out. Please try again."}}},
    },
}

_DRAWIO_ERROR_RESPONSES = {
    **_AI_ERROR_RESPONSES,
    400: {
        "description": "Invalid section key, missing TS type, or section is not supported for Draw.io generation.",
        "content": {"application/json": {"examples": {
            "not_supported": {"summary": "Unsupported section", "value": {"detail": "Draw.io generation is only supported for gantt and system configuration sections"}},
            "missing_ts_type": {"summary": "Missing TS type", "value": {"detail": "Project must have a TS type selected to use AI suggestions"}},
        }}},
    },
    500: {
        "description": "Validated Gantt JSON could not be converted to Draw.io XML.",
        "content": {"application/json": {"example": {"detail": "Failed to convert Gantt JSON to Draw.io XML"}}},
    },
}

_SUGGESTION_REQUEST_EXAMPLES = {
    "with_draft": {
        "summary": "Include current unsaved draft content",
        "value": {"draft_content": {"paragraph": "Customer requires centralized OT data integration for plant reporting."}},
    },
    "empty": {
        "summary": "No draft content",
        "value": {"draft_content": None},
    },
}

_SUGGESTION_RESPONSE_EXAMPLE = {
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
}

_DRAWIO_RESPONSE_EXAMPLE = {
    "drawio_xml": "<mxGraphModel><root>...</root></mxGraphModel>",
    "chart_instructions": "Copy the XML below, open https://app.diagrams.net, then File - Import From - Device. Paste the XML and import the diagram.",
}


@router.get(
    "/ai-suggestions/status",
    response_model=schemas.AISuggestionsStatusResponse,
    summary="Get AI Suggestions status",
    description="Returns non-secret availability metadata so the frontend can disable AI controls when Groq is not configured.",
    response_description="Groq configuration status.",
    responses={200: {"content": {"application/json": {"example": {"groq_configured": True}}}}},
)
async def get_ai_suggestions_status():
    """Expose non-secret AI suggestions availability for the frontend."""
    return schemas.AISuggestionsStatusResponse(
        groq_configured=bool(settings.GROQ_API_KEY)
    )


@router.post(
    "/projects/{project_id}/ai-suggestions/{section_key}",
    response_model=schemas.SuggestionResponse,
    summary="Generate an AI suggestion for a section",
    description=(
        "Generates a section-specific suggestion for an eligible predefined section or saved custom section. "
        "The endpoint does not save content; the frontend imports into draft state and the user must click SAVE."
    ),
    response_description="Structured suggestion content or raw fallback text.",
    responses={
        200: {"description": "Suggestion generated.", "content": {"application/json": {"example": _SUGGESTION_RESPONSE_EXAMPLE}}},
        **_AI_ERROR_RESPONSES,
    },
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "examples": _SUGGESTION_REQUEST_EXAMPLES
                }
            }
        }
    },
)
async def generate_ai_suggestion(
    project_id: UUID,
    section_key: str,
    request: schemas.SuggestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate AI suggestion for a given project section."""
    if not is_valid_ai_section_key(section_key):
        logger.warning(
            "AI suggestion rejected invalid section key - error_type=invalid_section_key, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid section_key",
        )

    if section_key in _SUPPRESSED_SECTIONS:
        logger.warning(
            "AI suggestion rejected suppressed section - error_type=suppressed_section, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"AI suggestions are not available for section '{section_key}'",
        )

    project = await project_service.get_project_by_id(db, project_id)
    if not project:
        logger.warning(
            "AI suggestion rejected missing project - error_type=project_not_found, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not project.ts_type:
        logger.warning(
            "AI suggestion rejected missing TS type - error_type=missing_ts_type, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project must have a TS type selected to use AI suggestions",
        )

    try:
        suggestion = await ai_service.generate_suggestion(project_id, section_key, request.draft_content, db)
    except NotImplementedError:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="AI Suggestions not implemented yet")

    return suggestion


@router.post(
    "/projects/{project_id}/ai-suggestions/{section_key}/drawio",
    response_model=schemas.DrawioResponse,
    summary="Generate Draw.io XML for a supported diagram section",
    description="Generates Draw.io-compatible mxGraph XML for `system_config`, `overall_gantt`, or `shutdown_gantt`.",
    response_description="Draw.io-compatible mxGraph XML and import instructions.",
    responses={
        200: {"description": "Draw.io XML generated.", "content": {"application/json": {"example": _DRAWIO_RESPONSE_EXAMPLE}}},
        **_DRAWIO_ERROR_RESPONSES,
    },
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "examples": _SUGGESTION_REQUEST_EXAMPLES
                }
            }
        }
    },
)
async def generate_drawio_xml(
    project_id: UUID,
    section_key: str,
    request: schemas.SuggestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate draw.io-compatible mxGraph XML for supported diagram sections."""
    if not is_valid_ai_section_key(section_key):
        logger.warning(
            "AI suggestion rejected invalid section key - error_type=invalid_section_key, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid section_key",
        )

    if section_key not in {"system_config", "overall_gantt", "shutdown_gantt"}:
        logger.warning(
            "Draw.io suggestion rejected unsupported section - error_type=invalid_drawio_section, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draw.io generation is only supported for gantt and system configuration sections",
        )

    project = await project_service.get_project_by_id(db, project_id)
    if not project:
        logger.warning(
            "AI suggestion rejected missing project - error_type=project_not_found, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not project.ts_type:
        logger.warning(
            "Draw.io suggestion rejected missing TS type - error_type=missing_ts_type, project_id=%s, section_key=%s",
            project_id,
            section_key,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project must have a TS type selected to use AI suggestions")

    try:
        response = await ai_service.generate_drawio(project_id, section_key, request.draft_content, db)
    except NotImplementedError:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Draw.io generation not implemented yet")

    return response
