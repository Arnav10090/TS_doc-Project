"""AI Suggestions service module.

This module orchestrates the AI suggestion generation workflow:
1. Load project and section data
2. Retrieve historical documents and context
3. Build section-specific prompts
4. Call configured AI provider
5. Parse and validate responses
"""

import logging
import hashlib
import asyncio
import time
import math
import re
from collections import deque
from typing import Any, Dict, Optional
from fastapi import HTTPException, status

from app.config import settings
from app.ai_suggestions import schemas
from app.ai_suggestions import builders, parsers, section_schemas
from app.ai_suggestions.providers import AIProviderRequest, get_ai_provider
from app.ai_suggestions.providers.errors import AIProviderError
# Task 25.1/25.2: Import load_layered_context and LayeredCategoryContext.
# CategoryContext kept for any legacy type hints that may exist in tests.
from app.ai_suggestions.retrieval import load_layered_context, LayeredCategoryContext, CategoryContext
from app.sections import service as sections_service
from app.projects import service as project_service
from app.ai_suggestions import gantt_converter
import json

# Configure logging
logger = logging.getLogger(__name__)


_LATENCY_SAMPLES_MS = deque(maxlen=500)


def _record_ai_suggestion_latency(latency_ms: float) -> Dict[str, float]:
    """Track rolling AI suggestion latency metrics."""
    _LATENCY_SAMPLES_MS.append(latency_ms)
    samples = sorted(_LATENCY_SAMPLES_MS)
    count = len(samples)
    average = sum(samples) / count if count else 0.0
    p95_index = min(count - 1, max(0, math.ceil(count * 0.95) - 1)) if count else 0
    p95 = samples[p95_index] if count else 0.0
    return {
        "count": count,
        "average_ms": average,
        "p95_ms": p95,
    }


def get_ai_suggestion_latency_metrics() -> Dict[str, float]:
    """Return rolling AI suggestion latency metrics for tests and diagnostics."""
    samples = sorted(_LATENCY_SAMPLES_MS)
    count = len(samples)
    average = sum(samples) / count if count else 0.0
    p95_index = min(count - 1, max(0, math.ceil(count * 0.95) - 1)) if count else 0
    p95 = samples[p95_index] if count else 0.0
    return {
        "count": count,
        "average_ms": average,
        "p95_ms": p95,
    }


def clear_ai_suggestion_latency_metrics() -> None:
    """Clear rolling latency metrics. Intended for tests."""
    _LATENCY_SAMPLES_MS.clear()


# Provider availability is checked at request time so local and remote providers can be switched by environment.


def _metadata_parts(**metadata: Any) -> str:
    """Format safe log metadata without raw prompt/response content."""
    return ", ".join(
        f"{key}={value}"
        for key, value in metadata.items()
        if value is not None
    )


def _text_metadata(prefix: str, text: Optional[str]) -> Dict[str, Any]:
    if text is None:
        return {
            f"{prefix}_size": 0,
            f"{prefix}_sha256": None,
        }

    digest = hashlib.sha256(text.encode()).hexdigest()
    return {
        f"{prefix}_size": len(text),
        f"{prefix}_sha256": f"{digest[:16]}...",
    }

async def call_groq(
    prompt: str,
    timeout: Optional[int] = None,
    *,
    project_id: Optional[Any] = None,
    section_key: Optional[str] = None,
) -> str:
    """
    Legacy compatibility shim for AI Suggestions inference.

    Runtime provider selection is driven by AI_PROVIDER and handled through
    AIProvider. The function name remains for existing tests and callers that
    monkeypatch the historical Groq boundary.
    """
    request_timeout = timeout
    try:
        provider = get_ai_provider()
    except AIProviderError as exc:
        logger.error(
            "AI provider selection failed - "
            + _metadata_parts(
                provider=settings.AI_PROVIDER,
                error_type=exc.error_type,
                project_id=project_id,
                section_key=section_key,
            )
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)

    logger.info(
        "AI provider call initiated - "
        + _metadata_parts(
            **_text_metadata("prompt", prompt),
            provider=provider.name,
            model=provider.model,
            project_id=project_id,
            section_key=section_key,
            timeout_seconds=request_timeout,
        )
    )

    try:
        response = await provider.generate(
            AIProviderRequest(
                prompt=prompt,
                timeout_seconds=request_timeout,
                project_id=str(project_id) if project_id is not None else None,
                section_key=section_key,
            )
        )
    except AIProviderError as exc:
        logger.error(
            "AI provider call failed - "
            + _metadata_parts(
                provider=provider.name,
                model=provider.model,
                error_type=exc.error_type,
                project_id=project_id,
                section_key=section_key,
                provider_status_code=exc.provider_status_code,
            )
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    except Exception as exc:
        logger.error(
            "AI provider call failed - "
            + _metadata_parts(
                provider=provider.name,
                model=provider.model,
                error_type=type(exc).__name__,
                project_id=project_id,
                section_key=section_key,
            )
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider error. Please try again.",
        )

    logger.info(
        "AI provider call succeeded - "
        + _metadata_parts(
            **_text_metadata("response", response.text),
            provider=response.provider,
            model=response.model,
            latency_ms=round(response.latency_ms, 2),
            project_id=project_id,
            section_key=section_key,
        )
    )
    return response.text

def _build_layered_context_fallback(section_key: str) -> LayeredCategoryContext:
    """
    Return an empty LayeredCategoryContext for graceful degradation (Task 25.3).

    Used when load_layered_context() raises an unexpected exception.  The
    returned object has all context fields set to None so prompt building can
    still proceed (it will simply omit context sections).
    """
    return LayeredCategoryContext(
        folder_path=settings.TS_DOCUMENTS_DIR,
        historical_context_available=False,
    )


async def _generate_suggestion_impl(
    project_id: Any, 
    section_key: str, 
    draft_content: Dict | None, 
    db
) -> schemas.SuggestionResponse:
    """
    Generate AI suggestion for a section (orchestration function).
    
    This function orchestrates:
    1. Project and section data loading
    2. Historical document retrieval (via load_layered_context)
    3. Prompt building with 7-layer knowledge hierarchy
    4. Configured AI provider call
    5. Response parsing by content family
    
    Args:
        project_id: UUID of the project
        section_key: Section identifier
        draft_content: Current unsaved editor state (optional)
        db: Database session
        
    Returns:
        SuggestionResponse with structured content
        
    Raises:
        HTTPException: Various status codes based on error conditions
    """
    # Load project
    project = await project_service.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not getattr(project, 'ts_type', None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project must have a TS type selected to use AI suggestions")

    # Load all saved sections
    sections = await sections_service.get_all_sections(db, project_id)
    all_sections: Dict[str, Any] = {s.section_key: s.content for s in sections}

    # Task 25.1: Replace load_category_context() with load_layered_context().
    # Pass section_key so the routing map selects the correct shared context files.
    try:
        category_context = load_layered_context(
            project.ts_type,
            settings.TS_DOCUMENTS_DIR,
            section_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        # Task 25.3: Never fail the request due to missing context – fall back to
        # an empty LayeredCategoryContext so prompt building still works.
        logger.warning(
            "Failed to load layered context for section_key=%s, continuing without context",
            section_key,
        )
        category_context = _build_layered_context_fallback(section_key)

    # Determine content family
    schema = section_schemas.get_section_schema(section_key)
    family = section_schemas.get_section_family(section_key)

    if family is None:
        # Custom section handling
        # Ensure the custom section has been saved previously (do NOT auto-create)
        if section_key not in all_sections:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom section not found")

        saved_content = all_sections.get(section_key) or {}
        section_title = saved_content.get('title')

        # Enforce title presence per PRD: fall back not allowed for custom sections
        if not section_title or not str(section_title).strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom section must have a title")
        subsections = saved_content.get('subsections') or []

        # Validate subsections
        if not isinstance(subsections, list) or len(subsections) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom section has no subsections")

        # Helper to process a single subsection: build prompt, call provider, parse
        async def _process_subsection(idx: int, subsection: Dict[str, Any]):
            try:
                subsection_name = subsection.get('name', '')
                subsection_type = subsection.get('contentType', 'paragraph')
                subsection_data = subsection.get('data', {}) or {}

                # Extract draft content for this subsection if provided
                draft_subsection = None
                if draft_content and isinstance(draft_content, dict):
                    draft_subs = draft_content.get('subsections', [])
                    if isinstance(draft_subs, list) and len(draft_subs) > idx:
                        draft_subsection = draft_subs[idx]

                # Derive expected row fields for table subsections to help the LLM produce matching columns
                expected_row_fields = None
                try:
                    if isinstance(subsection_data, dict):
                        tables = subsection_data.get('tables')
                        if isinstance(tables, list) and len(tables) > 0 and isinstance(tables[0], dict):
                            cols = tables[0].get('columns') or []
                            if isinstance(cols, list) and cols:
                                expected_row_fields = [c for c in cols]
                        elif isinstance(subsection_data.get('columns'), list):
                            expected_row_fields = [c for c in subsection_data.get('columns')]
                except Exception:
                    expected_row_fields = None

                prompt = builders.build_custom_section_prompt(
                    custom_section_title=section_title,
                    subsection_name=subsection_name,
                    subsection_type=subsection_type,
                    project=project,
                    all_sections=all_sections,
                    draft_content=draft_subsection,
                    category_context=category_context,
                    expected_row_fields=expected_row_fields,
                )

                llm_resp = await call_groq(
                    prompt,
                    project_id=project_id,
                    section_key=section_key,
                )

                # Parse based on subsection type
                if subsection_type == 'paragraph':
                    structured, parsed, raw = parsers.parse_rich_text_response(llm_resp)
                    content_out = parsed if structured else None
                elif subsection_type == 'table':
                    structured, parsed_rows, raw = parsers.parse_table_response(llm_resp, expected_row_fields=expected_row_fields)
                    content_out = {'rows': parsed_rows} if structured else None
                elif subsection_type == 'image':
                    structured, parsed, raw = parsers.parse_image_description_response(llm_resp)
                    content_out = parsed if structured else None
                else:
                    structured, parsed, raw = parsers.parse_mixed_field_response(llm_resp)
                    content_out = parsed if structured else None

                return {
                    'subsection_index': idx,
                    'subsection_name': subsection_name,
                    'type': subsection_type,
                    'content': content_out,
                    'raw_text': raw if not structured else None,
                    'structured_import_available': bool(structured),
                }

            except HTTPException:
                # Propagate HTTPExceptions (timeouts/provider errors)
                raise
            except Exception as e:
                # Fallback for unexpected errors: mark subsection as unstructured
                return {
                    'subsection_index': idx,
                    'subsection_name': subsection.get('name', ''),
                    'type': subsection.get('contentType', 'paragraph'),
                    'content': None,
                    'raw_text': str(e),
                    'structured_import_available': False,
                }

        # Launch parallel tasks for all subsections
        tasks = [asyncio.create_task(_process_subsection(i, s)) for i, s in enumerate(subsections)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # If any task raised an HTTPException, propagate it
        for r in results:
            if isinstance(r, HTTPException):
                raise r

        # Normalize results (any non-exception results are expected dicts)
        subsection_suggestions = []
        for r in results:
            if isinstance(r, Exception):
                # Non-HTTP exceptions should have been converted into dicts by _process_subsection,
                # but defensively handle any stray exceptions here.
                subsection_suggestions.append({
                    'subsection_index': -1,
                    'type': 'unknown',
                    'content': None,
                    'raw_text': str(r),
                    'structured_import_available': False,
                })
            else:
                subsection_suggestions.append(r)

        # Determine overall structured import availability (true only if all subsections are structured)
        overall_structured = all(item.get('structured_import_available', False) for item in subsection_suggestions)

        # Task 25.4: Build response metadata from LayeredCategoryContext fields.
        context_sources = [
            d.file_path for d in category_context.historical_documents
        ] if category_context and category_context.historical_documents else []
        # Loaded shared context filenames are prepended for observability.
        if category_context and category_context.loaded_shared_contexts:
            context_sources = category_context.loaded_shared_contexts + context_sources

        return schemas.SuggestionResponse(
            section_key=section_key,
            section_title=section_title,
            suggestion_mode='custom',
            structured_import_available=bool(overall_structured),
            content=None,
            subsection_suggestions=subsection_suggestions,
            raw_text=None,
            historical_context_available=bool(
                category_context.historical_context_available if category_context else False
            ),
            context_sources=context_sources,
            # context_txt_used reflects legacy monolithic context.txt fallback
            context_txt_used=bool(
                getattr(category_context, 'legacy_context_txt', None)
            ) if category_context else False,
            # Task 25.4: section_guidance_used flag for observability
            section_guidance_used=bool(
                getattr(category_context, 'section_guidance_available', False)
            ) if category_context else False,
        )

    # Build prompt
    try:
        prompt = builders.build_section_prompt(
            section_key=section_key,
            project=project,
            all_sections=all_sections,
            draft_content=draft_content,
            category_context=category_context,
            project_context_md="",
        )
    except ValueError as e:
        # Builder rejects suppressed or invalid sections
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Call configured AI provider
    llm_response = await call_groq(prompt, project_id=project_id, section_key=section_key)

    # Parse response based on content family
    structured_available = False
    parsed_content = None
    raw_text = None

    try:
        if family == 'A':
            structured_available, parsed_content, raw_text = parsers.parse_rich_text_response(llm_response)
        elif family == 'B':
            expected_fields = schema.get('row_fields') if schema else None
            structured_available, parsed_content, raw_text = parsers.parse_table_response(llm_response, expected_row_fields=expected_fields)
        elif family == 'C':
            expected_fields = schema.get('fields') if schema else None
            structured_available, parsed_content, raw_text = parsers.parse_mixed_field_response(llm_response, expected_fields=expected_fields)
        elif family == 'D':
            expected_item_fields = schema.get('item_fields') or schema.get('row_fields') if schema else None
            structured_available, parsed_content, raw_text = parsers.parse_list_response(llm_response, expected_item_fields=expected_item_fields)
        elif family == 'E':
            expected_fields = schema.get('fields') if schema else None
            structured_available, parsed_content, raw_text = parsers.parse_image_description_response(llm_response, expected_fields=expected_fields)
        else:
            # Fallback to mixed-field parsing
            structured_available, parsed_content, raw_text = parsers.parse_mixed_field_response(llm_response)
    except Exception:
        # Parsing error – return raw_text fallback
        structured_available = False
        parsed_content = None
        raw_text = llm_response

    if not structured_available:
        logger.warning(
            "AI suggestion returned unstructured content - "
            + _metadata_parts(
                error_type="structured_parse_failed",
                project_id=project_id,
                section_key=section_key,
                **_text_metadata("response", llm_response),
            )
        )

    # Task 25.4: Build context sources list from layered context metadata.
    context_sources = [
        d.file_path for d in category_context.historical_documents
    ] if category_context and category_context.historical_documents else []
    # Loaded shared context filenames are prepended for observability.
    if category_context and category_context.loaded_shared_contexts:
        context_sources = category_context.loaded_shared_contexts + context_sources

    response = schemas.SuggestionResponse(
        section_key=section_key,
        section_title=section_key.replace('_', ' ').title(),
        suggestion_mode='predefined',
        structured_import_available=bool(structured_available),
        content=parsed_content,
        subsection_suggestions=None,
        raw_text=raw_text,
        historical_context_available=bool(
            category_context.historical_context_available if category_context else False
        ),
        context_sources=context_sources,
        # context_txt_used reflects legacy monolithic context.txt fallback
        context_txt_used=bool(
            getattr(category_context, 'legacy_context_txt', None)
        ) if category_context else False,
        # Task 25.4: section_guidance_used flag for observability
        section_guidance_used=bool(
            getattr(category_context, 'section_guidance_available', False)
        ) if category_context else False,
    )

    return response


async def generate_suggestion(
    project_id: Any,
    section_key: str,
    draft_content: Dict | None,
    db
) -> schemas.SuggestionResponse:
    """Generate a suggestion and record end-to-end latency metrics."""
    started_at = time.perf_counter()
    try:
        return await _generate_suggestion_impl(project_id, section_key, draft_content, db)
    finally:
        latency_ms = (time.perf_counter() - started_at) * 1000
        metrics = _record_ai_suggestion_latency(latency_ms)
        logger.info(
            "AI suggestion response time - "
            + _metadata_parts(
                project_id=project_id,
                section_key=section_key,
                latency_ms=round(latency_ms, 2),
                average_latency_ms=round(metrics["average_ms"], 2),
                p95_latency_ms=round(metrics["p95_ms"], 2),
                latency_sample_count=int(metrics["count"]),
            )
        )


async def generate_drawio(
    project_id: Any,
    section_key: str,
    draft_content: Dict | None,
    db
) -> schemas.DrawioResponse:
    """Generate draw.io mxGraph XML for supported diagram sections.

    This function:
    - Validates project and section
    - Builds a section-specific Draw.io prompt
    - Calls the configured AI provider to obtain either a JSON array of GanttTask objects or raw mxGraph XML
    - Converts/validates the provider response into Draw.io-compatible XML
    """
    supported_sections = {"system_config", "overall_gantt", "shutdown_gantt"}
    if section_key not in supported_sections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draw.io generation is only supported for gantt and system configuration sections",
        )

    # Load project
    project = await project_service.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not getattr(project, 'ts_type', None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project must have a TS type selected to use AI suggestions")

    # Load saved sections
    sections = await sections_service.get_all_sections(db, project_id)
    all_sections: Dict[str, Any] = {s.section_key: s.content for s in sections}

    # Task 25.2: Replace load_category_context() with load_layered_context() for Gantt sections.
    # Pass section_key ('overall_gantt' or 'shutdown_gantt') so the routing map
    # prioritises gantt_context.txt for these sections.
    try:
        category_context = load_layered_context(
            project.ts_type,
            settings.TS_DOCUMENTS_DIR,
            section_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        # Task 25.3: Never fail the request due to missing context – graceful fallback.
        logger.warning(
            "Failed to load layered context for Gantt section_key=%s, continuing without context",
            section_key,
        )
        category_context = _build_layered_context_fallback(section_key)

    if section_key == "system_config":
        prompt = builders.build_drawio_architecture_prompt(
            project=project,
            all_sections=all_sections,
            draft_content=draft_content,
            category_context=category_context,
        )
    else:
        prompt = builders.build_gantt_prompt(
            section_key=section_key,
            project=project,
            all_sections=all_sections,
            draft_content=draft_content,
            category_context=category_context,
        )

    # Call configured AI provider
    llm_response = await call_groq(prompt, project_id=project_id, section_key=section_key)

    if section_key == "system_config":
        cleaned = llm_response.strip()
        fenced_match = re.search(r"```(?:xml)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
        if fenced_match:
            cleaned = fenced_match.group(1).strip()

        xml_match = re.search(r"(<mxGraphModel[\s\S]*?</mxGraphModel>)", cleaned, re.IGNORECASE)
        if xml_match:
            cleaned = xml_match.group(1).strip()

        if not cleaned.startswith("<mxGraphModel") or "</mxGraphModel>" not in cleaned:
            logger.error(
                "Failed to parse Draw.io XML from LLM - "
                + _metadata_parts(
                    error_type="invalid_drawio_xml",
                    project_id=project_id,
                    section_key=section_key,
                    **_text_metadata("response", llm_response),
                )
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid Draw.io XML from AI provider",
            )

        chart_instructions = (
            "Copy the XML below, open https://app.diagrams.net, then File → Import From → Device. "
            "Paste the XML, adjust the layout if needed, export the result as PNG, and upload it back into this section."
        )
        return schemas.DrawioResponse(drawio_xml=cleaned, chart_instructions=chart_instructions)

    # Strip markdown fences if present
    cleaned = llm_response.strip()
    if cleaned.startswith("```") and cleaned.endswith("```"):
        # remove code fence lines
        cleaned = "\n".join([line for line in cleaned.splitlines() if not line.strip().startswith("```")])

    # Attempt to parse JSON
    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            raise ValueError("Expected a JSON array of tasks")
    except Exception as e:
        logger.error(
            "Failed to parse Gantt JSON from LLM - "
            + _metadata_parts(
                error_type=type(e).__name__,
                project_id=project_id,
                section_key=section_key,
                **_text_metadata("response", llm_response),
            )
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid Gantt JSON from AI provider")

    # Validate each task against GanttTask schema
    validated_tasks = []
    try:
        for item in parsed:
            gt = schemas.GanttTask.parse_obj(item)
            validated_tasks.append(gt.dict())
    except Exception as e:
        logger.error(
            "Gantt task validation failed - "
            + _metadata_parts(error_type=type(e).__name__, project_id=project_id, section_key=section_key)
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Gantt JSON did not match expected schema")

    # Convert to mxGraph XML
    try:
        drawio_xml = gantt_converter.convert_gantt_json_to_drawio(validated_tasks)
    except Exception as e:
        logger.error(
            "Gantt conversion error - "
            + _metadata_parts(error_type=type(e).__name__, project_id=project_id, section_key=section_key)
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to convert Gantt JSON to Draw.io XML")

    chart_instructions = (
        "Copy the XML below, open https://app.diagrams.net, then File → Import From → Device. "
        "Paste the XML, edit layout as needed, export as PNG, and upload it back into this section."
    )

    return schemas.DrawioResponse(drawio_xml=drawio_xml, chart_instructions=chart_instructions)

