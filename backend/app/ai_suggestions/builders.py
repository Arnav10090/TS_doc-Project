"""
Section-aware prompt builders for AI Suggestions feature.

This module implements the 7-layer knowledge hierarchy from the PRD:
1. Current project metadata (never truncated)
2. Existing saved section content (truncate as needed)
3. Current draft content (unsaved edits) (truncate as needed)
4. Category-specific context.txt (truncate at 2000 chars)
5. Historical TS documents (max 5 docs, 1500 chars each, max 6000 total)
6. PROJECT_CONTEXT.md (embedded at build time)
7. LLM general knowledge

Requirements validation: 5.1-5.8, 7.7-7.10, 18.1-18.6
"""

import json
import logging
from typing import Dict, Any, Optional, List, Union

from app.ai_suggestions.validation import sanitize_prompt_text

from app.ai_suggestions.section_schemas import (
    get_section_schema,
    get_section_family,
    get_output_format_instruction,
    is_suppressed,
    SECTION_SCHEMAS
)
from app.ai_suggestions.retrieval import CategoryContext, LayeredCategoryContext, HistoricalDoc

logger = logging.getLogger(__name__)

PROMPT_SOFT_TOKEN_BUDGET = 8000
APPROX_CHARS_PER_TOKEN = 4


# PROJECT_CONTEXT.md content embedded at build time (Requirement 18.1-18.6)
# This string is populated from PROJECT_CONTEXT.md during module initialization
# and MUST NOT be read from filesystem at runtime
PROJECT_CONTEXT_MD_EMBEDDED = """
# PROJECT_CONTEXT

Generated from the current repository state on `2026-06-08`.

This document is the definitive project knowledge base for the TS Document Generator codebase.

The TS Document Generator is a local-first MVP used by Hitachi India to create Technical Specification
documents from a structured editing interface. The product converts project metadata, standardized
section boilerplate, custom user input, uploaded diagrams, and custom subsections into a Word `.docx`
output based on a Jinja-enabled template.

Key architectural components:
- React 18 + TypeScript frontend with Vite
- FastAPI backend with async SQLAlchemy ORM
- PostgreSQL 15 with JSONB section storage
- docxtpl for Word template rendering
- Docker Compose orchestration

Document structure:
- 31 predefined sections with standardized content schemas
- Custom sections with nested subsections (paragraph/table/image)
- Explicit save workflow preserving draft isolation
- Automated revision history tracking
- Image upload for architecture and Gantt diagrams

Target users are Hitachi India proposal/documentation engineers creating client-facing
technical specification documents following company standards and templates.
"""



def estimate_prompt_tokens(prompt: str) -> int:
    """Estimate prompt tokens without adding a tokenizer dependency."""
    if not prompt:
        return 0
    return max(1, (len(prompt) + APPROX_CHARS_PER_TOKEN - 1) // APPROX_CHARS_PER_TOKEN)


def _truncate_prompt_block(prompt: str, heading: str, max_body_chars: int) -> str:
    start = prompt.find(heading)
    if start == -1:
        return prompt

    body_start = prompt.find("\n", start)
    if body_start == -1:
        return prompt
    body_start += 1

    next_candidates = [
        idx for idx in (
            prompt.find("\n\n## ", body_start),
            prompt.find("\n\n# TASK", body_start),
            prompt.find("\n\n# CONSTRAINTS", body_start),
        )
        if idx != -1
    ]
    end = min(next_candidates) if next_candidates else len(prompt)
    body = prompt[body_start:end]

    if len(body) <= max_body_chars:
        return prompt

    if max_body_chars <= 0:
        replacement = "(omitted to stay within prompt token budget)"
    else:
        replacement = body[:max_body_chars].rstrip() + "\n... [truncated to stay within prompt token budget]"

    return prompt[:body_start] + replacement + prompt[end:]


def _enforce_prompt_budget(prompt: str, section_key: str, prompt_type: str = "section") -> str:
    """Trim lower-priority context blocks until the prompt fits the 8000-token soft budget."""
    initial_tokens = estimate_prompt_tokens(prompt)
    if initial_tokens <= PROMPT_SOFT_TOKEN_BUDGET:
        logger.info(
            "AI prompt token estimate - section_key=%s, prompt_type=%s, prompt_tokens=%s, budget=%s",
            section_key,
            prompt_type,
            initial_tokens,
            PROMPT_SOFT_TOKEN_BUDGET,
        )
        return prompt

    reductions = [
        ("historical_documents", "## 6. Historical TS Document Excerpts", [4000, 2500, 1500, 750, 0]),
        ("draft_content", "## 4. Current Draft Content", [2500, 1500, 750, 0]),
        ("saved_sections", "## 3. Existing Saved Section Content", [5000, 3000, 1500, 750, 0]),
        ("context_txt", "## 5. Category Context", [1500, 1000, 500, 0]),
    ]

    reduced_prompt = prompt
    for block_name, heading, limits in reductions:
        for limit in limits:
            reduced_prompt = _truncate_prompt_block(reduced_prompt, heading, limit)
            token_count = estimate_prompt_tokens(reduced_prompt)
            if token_count <= PROMPT_SOFT_TOKEN_BUDGET:
                logger.info(
                    "AI prompt token estimate - section_key=%s, prompt_type=%s, prompt_tokens=%s, budget=%s, truncated_block=%s",
                    section_key,
                    prompt_type,
                    token_count,
                    PROMPT_SOFT_TOKEN_BUDGET,
                    block_name,
                )
                return reduced_prompt

    final_tokens = estimate_prompt_tokens(reduced_prompt)
    logger.warning(
        "AI prompt remains above soft token budget - section_key=%s, prompt_type=%s, prompt_tokens=%s, budget=%s",
        section_key,
        prompt_type,
        final_tokens,
        PROMPT_SOFT_TOKEN_BUDGET,
    )
    return reduced_prompt


def _sanitize_text(text: str, max_length: int = 500) -> str:
    """
    Sanitize user-supplied text by HTML-stripping and truncating.
    
    Requirements 7.8, 7.9, 14.3, 14.4
    
    Args:
        text: User-supplied text to sanitize
        max_length: Maximum length after truncation (default 500)
        
    Returns:
        Sanitized and truncated text
    """
    return sanitize_prompt_text(text, max_length=max_length)


def _format_project_metadata(project: Any) -> str:
    """
    Format project metadata block for prompt (Layer 1 - never truncated).
    
    Requirement 5.2: Project metadata SHALL NEVER be truncated
    
    Args:
        project: Project ORM model instance
        
    Returns:
        Formatted project metadata string
    """
    # Sanitize all user-supplied metadata (Requirement 7.8, 7.9)
    solution_name = _sanitize_text(getattr(project, 'solution_name', ''))
    solution_full_name = _sanitize_text(getattr(project, 'solution_full_name', ''))
    client_name = _sanitize_text(getattr(project, 'client_name', ''))
    client_location = _sanitize_text(getattr(project, 'client_location', ''))
    ts_type = _sanitize_text(getattr(project, 'ts_type', ''))
    doc_date = _sanitize_text(getattr(project, 'doc_date', ''))
    
    return f"""## 1. Project Metadata (never truncated)
- Solution Name: {solution_name}
- Solution Full Name: {solution_full_name}
- Client: {client_name} ({client_location})
- TS Type: {ts_type}
- Document Date: {doc_date}
"""


def _format_section_identity(section_key: str) -> str:
    """
    Format section identity block for prompt (never truncated).
    
    Requirement 5.3: Section identity block SHALL NEVER be truncated
    
    Args:
        section_key: The section identifier
        
    Returns:
        Formatted section identity string
    """
    schema = get_section_schema(section_key)
    section_title = section_key.replace('_', ' ').title()
    section_description = schema['description'] if schema else "Section content"
    
    return f"""## 2. Section Identity (never truncated)
- Target Section Key: {section_key}
- Section Title: {section_title}
- Section Purpose: {section_description}
"""


def _format_saved_sections(all_sections: Dict[str, Any], max_chars: int = 8000) -> str:
    """
    Format existing saved section content (Layer 2 - truncate if needed).
    
    Requirement 5.4: Truncate saved sections before context.txt
    
    Args:
        all_sections: Dictionary of section_key -> content
        max_chars: Maximum characters for this block
        
    Returns:
        Formatted saved sections string
    """
    if not all_sections:
        return "## 3. Existing Saved Section Content\n(No saved sections yet)\n"
    
    sections_json = json.dumps(all_sections, indent=2, ensure_ascii=False)
    
    if len(sections_json) > max_chars:
        sections_json = sections_json[:max_chars] + "\n... [truncated]"
    
    return f"""## 3. Existing Saved Section Content
{sections_json}
"""


def _format_draft_content(draft_content: Optional[Dict[str, Any]], max_chars: int = 4000) -> str:
    """
    Format current draft content (Layer 3 - truncate before saved sections).
    
    Requirement 5.4: Truncate draft content before saved sections
    
    Args:
        draft_content: Current unsaved editor state
        max_chars: Maximum characters for this block
        
    Returns:
        Formatted draft content string
    """
    if not draft_content:
        return "## 4. Current Draft Content (unsaved edits)\n(No draft changes)\n"
    
    draft_json = json.dumps(draft_content, indent=2, ensure_ascii=False)
    
    if len(draft_json) > max_chars:
        draft_json = draft_json[:max_chars] + "\n... [truncated]"
    
    return f"""## 4. Current Draft Content (unsaved edits)
{draft_json}
"""


def _format_context_txt(context_txt: Optional[str]) -> str:
    """
    Format category context.txt content (Layer 4).
    
    Requirement 5.5: Context_TXT SHALL be truncated at 2000 characters
    
    Args:
        context_txt: Content of context.txt file
        
    Returns:
        Formatted context.txt string
    """
    if not context_txt:
        return "## 5. Category Context (context.txt)\n(No context.txt available)\n"
    
    # Truncate at 2000 characters as per requirement
    if len(context_txt) > 2000:
        context_txt = context_txt[:2000] + "\n... [truncated at 2000 chars]"
    
    return f"""## 5. Category Context (context.txt)
{context_txt}
"""


# ---------------------------------------------------------------------------
# Task 24.1: Layered context formatter
# ---------------------------------------------------------------------------

# Map field names on LayeredCategoryContext to human-readable sub-headers
_LAYERED_CONTEXT_SUBHEADERS: Dict[str, str] = {
    "domain_context":         "### Domain Context (domain_context.txt)",
    "architecture_context":   "### Architecture Context (architecture_context.txt)",
    "implementation_context": "### Implementation Context (implementation_context.txt)",
    "cybersecurity_context":  "### Cybersecurity Context (cybersecurity_context.txt)",
    "gantt_context":          "### Gantt / Schedule Context (gantt_context.txt)",
}


def _format_layered_context(
    category_context: LayeredCategoryContext,
    section_key: str,
) -> str:
    """
    Format layered category context for prompt assembly (Task 24.1).

    Produces a '## 5. Category Context (layered …)' block that lists:
    - Which shared context files were loaded (metadata for observability)
    - Each present context type under its own sub-header
    - Section-specific guidance when available
    - Falls back to monolithic context.txt formatting when no layered files
      were loaded (legacy mode).

    Requirements:
    - Clear prompt structure so the LLM knows which context type it is reading
    - Observability: list loaded files in the header
    - Backward compatibility: legacy_context_txt path mirrors _format_context_txt()

    Args:
        category_context: Populated LayeredCategoryContext from load_layered_context()
        section_key: Repository section key (used only in the header label)

    Returns:
        Formatted string ready to be injected at layer 5 in the prompt.
    """
    # --- Legacy fallback path: no layered files were loaded ---
    if not category_context.loaded_shared_contexts and not category_context.section_guidance_available:
        if category_context.legacy_context_txt:
            return _format_context_txt(category_context.legacy_context_txt)
        return (
            "## 5. Category Context (layered - loaded for "
            f"{section_key})\n(No context files available)\n"
        )

    # --- Header with loaded-files metadata ---
    parts: List[str] = []
    header_lines: List[str] = [
        f"## 5. Category Context (layered - loaded for {section_key})",
    ]
    if category_context.loaded_shared_contexts:
        files_str = ", ".join(category_context.loaded_shared_contexts)
        header_lines.append(f"Loaded context files: {files_str}")
    else:
        header_lines.append("Loaded context files: (none)")
    if category_context.section_guidance_available:
        header_lines.append("Section guidance: available")
    parts.append("\n".join(header_lines))

    # --- Each shared context type in deterministic order ---
    # Preserve order as defined in _LAYERED_CONTEXT_SUBHEADERS so the LLM
    # sees context types in a consistent, predictable sequence.
    ORDERED_FIELDS = [
        "domain_context",
        "architecture_context",
        "implementation_context",
        "cybersecurity_context",
        "gantt_context",
    ]
    for field in ORDERED_FIELDS:
        value: Optional[str] = getattr(category_context, field, None)
        if value:
            sub_header = _LAYERED_CONTEXT_SUBHEADERS[field]
            parts.append(f"{sub_header}\n{value}")

    # --- Section-specific guidance ---
    if category_context.section_guidance_available and category_context.section_guidance:
        parts.append(
            f"### Section Guidance ({section_key}.txt)\n{category_context.section_guidance}"
        )

    return "\n\n".join(parts) + "\n"


def _format_historical_documents(historical_docs: List[HistoricalDoc], max_docs: int = 5, max_total_chars: int = 6000) -> str:
    """
    Format historical document excerpts (Layer 5).
    
    Requirements:
    - 5.6: EACH Historical_Document excerpt SHALL be truncated at 1500 characters
    - 5.7: Include at most 5 Historical_Documents in the prompt
    - 5.8: Total Historical_Documents content SHALL NOT exceed 6000 characters
    
    Args:
        historical_docs: List of historical document excerpts
        max_docs: Maximum number of documents to include
        max_total_chars: Maximum total characters for all historical docs
        
    Returns:
        Formatted historical documents string
    """
    if not historical_docs:
        return "## 6. Historical TS Document Excerpts\n(No historical documents available)\n"
    
    # Select up to max_docs documents (diversity-aware selection done in retrieval module)
    selected_docs = historical_docs[:max_docs]
    
    formatted_docs = []
    total_chars = 0
    
    for doc in selected_docs:
        # Truncate each document at 1500 chars (Requirement 5.6)
        content = doc.content
        if len(content) > 1500:
            content = content[:1500] + "\n... [truncated at 1500 chars]"
        
        # Check if adding this doc would exceed total limit
        doc_text = f"\n### {doc.filename}\nPath: {doc.file_path}\n{content}\n"
        if total_chars + len(doc_text) > max_total_chars:
            break
        
        formatted_docs.append(doc_text)
        total_chars += len(doc_text)
    
    docs_section = "## 6. Historical TS Document Excerpts\n" + "".join(formatted_docs)
    
    # Final safety check for total length (Requirement 5.8)
    if len(docs_section) > max_total_chars + 100:  # +100 for header
        docs_section = docs_section[:max_total_chars + 100] + "\n... [truncated to stay within 6000 char limit]"
    
    return docs_section


def _format_project_context_md() -> str:
    """
    Format embedded PROJECT_CONTEXT.md content (Layer 6).
    
    Requirements 18.1-18.6:
    - PROJECT_CONTEXT.md content SHALL be embedded at build time
    - SHALL NOT read from filesystem at runtime
    - Build SHALL fail if embedding fails
    - Appears in layer 6 position
    - SHALL NOT be truncated unless entire prompt exceeds budget
    
    Returns:
        Formatted PROJECT_CONTEXT.md string
    """
    return f"""## 7. System Knowledge (PROJECT_CONTEXT.md - embedded at build time)
{PROJECT_CONTEXT_MD_EMBEDDED}
"""


def _format_output_instructions(section_key: str) -> str:
    """
    Format section-specific output instructions (never truncated).
    
    Requirement 7.6: Prompt_Builder SHALL include section-specific output instructions
    
    Args:
        section_key: The section identifier
        
    Returns:
        Formatted output instruction string
    """
    # Special case: division_of_eng renders "Table 7: Responsibility Matrix", a
    # fixed 8-column matrix (No, ITEM, BD, BE, DD, SU, ER, COM), not a free-form
    # row table. The generic Family B branch below cannot describe this fixed
    # shape (its row_fields-driven guidance is too weak), so it is handled
    # explicitly here instead.
    if section_key == "division_of_eng":
        return _format_division_of_eng_output_instructions()
    
    family = get_section_family(section_key)
    
    if not family:
        # Custom section or unknown - provide generic JSON instruction
        return """## 8. Output Format (never truncated)
Output a JSON object with the appropriate structure for this section.
Do NOT include markdown code fences.
"""
    
    instruction = get_output_format_instruction(family)
    schema = get_section_schema(section_key)
    
    # Add field-specific guidance based on family
    field_guidance = ""
    if family == "A" and schema:
        field_guidance = f"\nExpected fields: {', '.join(schema['fields'])}"
    elif family == "B" and schema:
        row_fields = schema.get('row_fields', [])
        if row_fields:
            field_guidance = f"\nRow fields: {', '.join(row_fields)}"
    elif family == "C" and schema:
        field_guidance = f"\nExpected fields: {', '.join(schema['fields'])}"
    elif family == "D" and schema:
        # Without explicit item field names the LLM invents its own keys —
        # e.g. for `features` it has been observed emitting a "feature" key
        # instead of "title". That shape cannot be imported into the `items`
        # table the frontend renders (see FAMILY_D_ITEMS_SECTION_KEYS in
        # frontend/src/utils/aiSuggestionImport.ts). This mirrors the existing
        # fix for the `division_of_eng` Family B override further down in
        # this file.
        item_fields = schema.get('item_fields', [])
        if item_fields:
            field_guidance = f"\nItem fields: {', '.join(item_fields)}"
    
    return f"""## 8. Output Format (never truncated)
{instruction}
{field_guidance}

Output ONLY the requested format. Do NOT include explanatory text or markdown code fences.
"""


def _format_division_of_eng_output_instructions() -> str:
    """
    Family B override for `division_of_eng` (Table 7: Responsibility Matrix).
    
    The generic Family B instruction gives the LLM no field names to use when
    `row_fields` is empty, so it invents its own schema (observed in production:
    "Service"/"Responsibility"/"Description" keys). That shape cannot be imported
    by `extractMatrixRow()` in frontend/src/utils/aiSuggestionImport.ts, which only
    recognizes the keys "No", "ITEM", "BD", "BE", "DD", "SU", "ER", "COM" (see
    MATRIX_ROLE_KEY_CANDIDATES in that file). This function gives the LLM the
    exact column keys, the responsibility-code vocabulary, and the canonical item
    list from Table 7 so it has no room to invent an alternate shape.
    """
    return """## 8. Output Format (never truncated)
Output a JSON array of row objects. No markdown code fences.

This section renders "Table 7: Responsibility Matrix", a FIXED 8-column table. Each row object you return MUST use exactly these 8 keys, spelled exactly as shown (case-sensitive), and no other keys:
"No", "ITEM", "BD", "BE", "DD", "SU", "ER", "COM"

Do NOT invent alternate key names such as "Service", "Responsibility", or "Description" - those do not match this table and will be silently discarded by the document editor.

RESPONSIBILITY CODES: the value for BD/BE/DD/SU/ER/COM on each row MUST be one of the following literal strings:
- "S"   = SELLER (Hitachi) is responsible
- "B"   = BUYER (client) is responsible
- "S/B" = SELLER primary, BUYER joint/supporting
- "B/S" = BUYER primary, SELLER joint/supporting
- "-"   = not applicable for this item
- ""    = leave blank only if genuinely unknown

Only return ITEM-level rows (rows whose "No" starts with "-", e.g. "-1", "-2"). Do NOT return section header rows (e.g. "(1)", "(2)", "(3)"), and do NOT return blank spacer rows.

The "ITEM" value for each row MUST match one of the canonical item names below verbatim, including any "{{Placeholder}}" tokens - copy the text exactly, do not resolve placeholders, rename items, or reword them, because the document editor matches your rows back to the template by exact ITEM text:

(1) Services
  -1 Project Execution
  -2 Overall system design
  -3 Work Test and Simulation
(2) SYSTEM Engineering
  -1 Documentation
(3) HARDWARE
  -1 {{SolutionName}} Server
  -2 {{SolutionName}} Client PC
  -3 Application Servers Console and Accessories
  -4 GSM Modem
  -5 HX Controller (For Unified Gateway)
  -6 Network Cables
  -7 Android Mobile/HHT Devices
(4) SOFTWARE
  -1 Windows Server 2022 (64 bit) (5 CAL)
  -2 {{SW3_Name}}
  -3 Microsoft Windows 11 Pro
  -4 Backup software
  -5 Python
  -6 Django
  -7 Angular Framework
  -8 {{TS4_Component}}
  -9 {{TS2_Technology}}
  -10 Trend Micro Antivirus
(5) TRAINING
  -1 {{SolutionName}} Training (Max {{TrainingDays}} days) {{TrainingPersons}} persons
(6) Pre-Engineering Activities
  -1 Study of Existing system
(7) Documents to be submitted for Reference & Records
  -1 Screen Design Documents
  -2 Hardware Specifications
  -3 Software Specifications
  -4 {{SolutionName}} Operation Manual
(9) Interface with Other System
  (no fixed item rows exist yet under this heading - only add one here if the
  category context gives an explicit, specific reason to)

Only include a row for an item if the project metadata or category context gives you a genuine, specific basis for its responsibility codes. If you have no basis for a given item, omit that row entirely rather than guessing.

Example of the required shape (values below are illustrative only):
[
  {"No": "-1", "ITEM": "{{SolutionName}} Server", "BD": "S", "BE": "S", "DD": "S", "SU": "S", "ER": "B", "COM": "S"},
  {"No": "-6", "ITEM": "Network Cables", "BD": "B", "BE": "B", "DD": "B", "SU": "B", "ER": "B", "COM": "B"}
]

Output ONLY the JSON array. Do NOT include explanatory text or markdown code fences.
"""


def build_section_prompt(
    section_key: str,
    project: Any,
    all_sections: Dict[str, Any],
    draft_content: Optional[Dict[str, Any]],
    category_context: Union[CategoryContext, LayeredCategoryContext],
    project_context_md: str = ""  # Kept for API compatibility but not used (embedded instead)
) -> str:
    """
    Build a section-specific prompt following the 7-layer knowledge hierarchy.

    Accepts either a legacy ``CategoryContext`` or a modern
    ``LayeredCategoryContext``.  When a ``LayeredCategoryContext`` is supplied the
    layer-5 block is produced by ``_format_layered_context()``, which formats each
    specialized shared-context file under its own sub-header and includes any
    section-specific guidance.  When a legacy ``CategoryContext`` is supplied the
    original ``_format_context_txt()`` behaviour is preserved unchanged.

    Knowledge hierarchy:
    1. Project metadata (never truncated)
    2. Existing saved section content (truncate as needed)
    3. Current draft content (truncate before saved sections)
    4. Category context – layered OR legacy context.txt (truncate at 2000 chars)
    5. Historical documents (max 5 docs, 1500 chars each, 6000 total)
    6. PROJECT_CONTEXT.md (embedded at build time, not runtime read)
    7. LLM general knowledge (implicit)

    Requirements: 5.1-5.8, 7.1-7.10, 18.1-18.6, Task 24.2

    Args:
        section_key: Section identifier
        project: Project ORM model instance
        all_sections: Dictionary of saved section content
        draft_content: Current unsaved editor state
        category_context: CategoryContext (legacy) or LayeredCategoryContext (modern)
        project_context_md: DEPRECATED – PROJECT_CONTEXT.md is now embedded at build time

    Returns:
        Complete prompt string for LLM

    Raises:
        ValueError: If section_key is suppressed or invalid
    """
    # Validate section is not suppressed (Requirement 1.1)
    if is_suppressed(section_key):
        raise ValueError(f"AI suggestions are not available for section: {section_key}")

    # Build prompt with 7-layer hierarchy
    parts = []

    # System role
    parts.append("""# SYSTEM ROLE
You are an expert technical writer for Hitachi India, specializing in Technical Specification documents.
Your task is to generate contextually relevant, professionally written content that follows company standards
and integrates seamlessly with existing project documentation.

# KNOWLEDGE HIERARCHY (Priority Order)
Content is prioritized from most specific (project metadata) to most general (your base knowledge).
Use higher-priority information to inform and constrain lower-priority context.
""")

    # Layer 1: Project metadata (never truncated)
    parts.append(_format_project_metadata(project))

    # Layer 2: Section identity (never truncated)
    parts.append(_format_section_identity(section_key))

    # Layer 3: Existing saved sections (truncate if needed)
    parts.append(_format_saved_sections(all_sections, max_chars=8000))

    # Layer 4: Current draft content (truncate before saved sections)
    parts.append(_format_draft_content(draft_content, max_chars=4000))

    # Layer 5: Category context – layered (Task 24.2) or legacy
    if isinstance(category_context, LayeredCategoryContext):
        parts.append(_format_layered_context(category_context, section_key))
    else:
        parts.append(_format_context_txt(category_context.context_txt))

    # Layer 6: Historical documents (max 5, 1500 each, 6000 total)
    parts.append(_format_historical_documents(
        category_context.historical_documents,
        max_docs=5,
        max_total_chars=6000
    ))

    # Layer 7: PROJECT_CONTEXT.md (embedded at build time)
    parts.append(_format_project_context_md())

    # Output instructions (never truncated)
    parts.append(_format_output_instructions(section_key))

    # Task instruction
    schema = get_section_schema(section_key)
    section_title = section_key.replace('_', ' ').title()
    section_purpose = schema['description'] if schema else "section content"

    parts.append(f"""# TASK
Generate content for section: {section_title}

Section purpose: {section_purpose}

# CONSTRAINTS
- Use Hitachi technical writing style (professional, precise, client-facing)
- Reference project metadata where appropriate
- Maintain consistency with existing saved sections
- Follow the output format exactly as specified
- Do NOT include markdown code fences or explanatory text
- Output ONLY the requested data structure

# QUALITY STANDARDS
- Be specific and avoid generic statements
- Use technical terminology appropriate for the TS Type category
- Include quantifiable details where relevant
- Maintain formal business writing tone
- Ensure all generated content is factually grounded in the provided context
""")

    return _enforce_prompt_budget("\n\n".join(parts), section_key, "predefined")


def build_custom_section_prompt(
    custom_section_title: str,
    subsection_name: str,
    subsection_type: str,
    project: Any,
    all_sections: Dict[str, Any],
    draft_content: Optional[Dict[str, Any]],
    category_context: Union[CategoryContext, LayeredCategoryContext],
    expected_row_fields: Optional[List[str]] = None,
) -> str:
    """
    Build a prompt for custom section subsection content (Task 24.3).

    Accepts either a legacy ``CategoryContext`` or a modern
    ``LayeredCategoryContext``.  The layer-5 context block uses
    ``_format_layered_context()`` for modern contexts, falling back to
    ``_format_context_txt()`` for legacy ones.

    Custom sections have user-defined titles and subsections with types:
    - paragraph: narrative prose
    - table: structured rows
    - image: descriptive caption only

    Args:
        custom_section_title: User-defined title for the custom section
        subsection_name: Name of the subsection within the custom section
        subsection_type: Type of subsection ('paragraph', 'table', 'image')
        project: Project ORM model instance
        all_sections: Dictionary of saved section content
        draft_content: Current unsaved editor state for this subsection
        category_context: CategoryContext (legacy) or LayeredCategoryContext (modern)
        expected_row_fields: Optional canonical column names hint for table subsections

    Returns:
        Complete prompt string for LLM
    """
    # Custom sections use a synthetic section key derived from the title for routing label
    _custom_key = f"custom:{_sanitize_text(custom_section_title)[:40]}"

    parts = []

    # System role
    parts.append("""# SYSTEM ROLE
You are an expert technical writer for Hitachi India, specializing in Technical Specification documents.
Generate content for a custom section subsection following company standards.
""")

    # Project metadata (Layer 1)
    parts.append(_format_project_metadata(project))

    # Custom section identity
    parts.append(f"""## 2. Custom Section Identity
- Custom Section Title: {_sanitize_text(custom_section_title)}
- Subsection Name: {_sanitize_text(subsection_name)}
- Subsection Type: {subsection_type}
""")

    # Existing saved sections (Layer 2)
    parts.append(_format_saved_sections(all_sections, max_chars=6000))

    # Draft content if available
    parts.append(_format_draft_content(draft_content, max_chars=3000))

    # Category context – layered (Task 24.3) or legacy
    if isinstance(category_context, LayeredCategoryContext):
        parts.append(_format_layered_context(category_context, _custom_key))
    else:
        parts.append(_format_context_txt(category_context.context_txt))

    # Historical documents
    parts.append(_format_historical_documents(
        category_context.historical_documents,
        max_docs=3,
        max_total_chars=4000
    ))

    # Output instructions based on subsection type
    if subsection_type == "paragraph":
        output_instruction = """## Output Format
Generate HTML content with <p>, <ul>, <li>, <strong>, and <em> tags.
Do NOT include markdown code fences.
"""
    elif subsection_type == "table":
        cols_hint = ''
        if expected_row_fields:
            # Provide a gentle hint to the model about the canonical column names
            cols_json = json.dumps(expected_row_fields, ensure_ascii=False)
            cols_hint = f"\nPreferred columns (use these names in the JSON): {cols_json}\n"

        output_instruction = f"""## Output Format
Generate a JSON object with structure:
{{
  "columns": ["Column1", "Column2", ...],
  "rows": [
    {{"Column1": "value", "Column2": "value", ...}},
    ...
  ]
}}
{cols_hint}Do NOT include markdown code fences.
"""
    elif subsection_type == "image":
        output_instruction = """## Output Format
Generate a JSON object with descriptive text fields:
{
  "caption": "Brief description of what the image should show",
  "note": "Technical note about the diagram or image"
}
Do NOT include markdown code fences.
"""
    else:
        output_instruction = "## Output Format\nGenerate appropriate content for this subsection type.\n"

    parts.append(output_instruction)

    # Task
    parts.append(f"""# TASK
Generate content for the "{subsection_name}" subsection of the "{custom_section_title}" custom section.

# CONSTRAINTS
- Use Hitachi technical writing style
- Reference project metadata where appropriate
- Maintain consistency with other sections
- Output ONLY the requested format
""")

    return _enforce_prompt_budget("\n\n".join(parts), custom_section_title, "custom")


def build_gantt_prompt(
    section_key: str,
    project: Any,
    all_sections: Dict[str, Any],
    draft_content: Optional[Dict[str, Any]],
    category_context: Union[CategoryContext, LayeredCategoryContext],
) -> str:
    """
    Build a prompt instructing the LLM to output a week-based JSON array of GanttTask objects
    (Task 24.4).

    When a ``LayeredCategoryContext`` is supplied, ``gantt_context`` is prioritised by
    formatting it explicitly before all other shared context so the LLM sees schedule-specific
    guidance first.  All other layered context is then formatted by
    ``_format_layered_context()``.  For legacy ``CategoryContext`` the original
    ``_format_context_txt()`` path is used unchanged.

    The LLM MUST output ONLY a JSON array where each object contains the fields:
    ``task`` (string), ``phase`` (string|null), ``start_week`` (int), ``duration_weeks`` (int),
    ``milestone`` (boolean), ``dependencies`` (optional array of integer indexes).

    The backend validates the JSON against the ``GanttTask`` schema and converts to mxGraph XML.

    Args:
        section_key: Section identifier (expected ``overall_gantt`` or ``shutdown_gantt``)
        project: Project ORM model instance
        all_sections: Saved sections dictionary
        draft_content: Optional draft content (may include timeline hints)
        category_context: CategoryContext (legacy) or LayeredCategoryContext (modern)

    Returns:
        Prompt string for the LLM
    """
    # Basic system role and constraints
    parts = [
        """# SYSTEM ROLE
You are an expert project scheduler and technical writer. Produce a machine-parseable week-based Gantt task list
tailored to the provided project metadata and category context.

OUTPUT RULES: Output ONLY a JSON array (no surrounding text, no markdown fences). Each array element MUST be an object with the following keys:
- task: string
- phase: string or null
- start_week: integer (week number, week 1, 2, ...)
- duration_weeks: integer (>=0)
- milestone: boolean
- dependencies: optional array of integer indexes referencing items in the returned array
"""
    ]

    # Include project metadata and section identity
    parts.append(_format_project_metadata(project))
    parts.append(_format_section_identity(section_key))

    # Include optional draft hints
    parts.append(_format_draft_content(draft_content, max_chars=2000))

    # Layer 5: Category context
    # For layered context, gantt_context is prioritised (Task 24.4) — format it first
    # explicitly, then let _format_layered_context handle the rest of the shared files.
    if isinstance(category_context, LayeredCategoryContext):
        if category_context.gantt_context:
            parts.append(
                f"## 5. Gantt / Schedule Context (gantt_context.txt - prioritised)\n"
                f"{category_context.gantt_context}\n"
            )
        parts.append(_format_layered_context(category_context, section_key))
    else:
        parts.append(_format_context_txt(category_context.context_txt))

    # Provide historical examples to ground schedule decisions
    parts.append(_format_historical_documents(category_context.historical_documents, max_docs=3, max_total_chars=3000))

    # Add explicit JSON schema and example
    example = [
        {
            "task": "Mobilization",
            "phase": "Preparation",
            "start_week": 1,
            "duration_weeks": 2,
            "milestone": False,
            "dependencies": []
        },
        {
            "task": "Commissioning",
            "phase": "Execution",
            "start_week": 3,
            "duration_weeks": 1,
            "milestone": True,
            "dependencies": [0]
        }
    ]

    parts.append("""# TASK
Generate a JSON array of GanttTask objects describing the timeline for this project.

SCHEMA: Each object must follow the keys in the example below. Do NOT include explanatory text.

Example output:""")
    parts.append(json.dumps(example, ensure_ascii=False, indent=2))

    parts.append("""# CONSTRAINTS
- Use project metadata and category context to ground start weeks and durations
- Keep the schedule realistic and concise (prefer whole-week durations)
- If a task is a milestone, set `duration_weeks` to 0 and `milestone` to true
- Use dependencies to express sequencing (indexes reference the returned array)
""")

    return _enforce_prompt_budget("\n\n".join(parts), section_key, "gantt")


def build_drawio_architecture_prompt(
    project: Any,
    all_sections: Dict[str, Any],
    draft_content: Optional[Dict[str, Any]],
    category_context: Union[CategoryContext, LayeredCategoryContext],
) -> str:
    """
    Build a prompt that asks the model to return draw.io-compatible mxGraph XML
    for the System Configuration architecture diagram.

    The response must be directly importable into diagrams.net, so the prompt is
    stricter than the generic section suggestion prompts and requests XML only.
    """
    parts = [
        """# SYSTEM ROLE
You are an expert OT/industrial system architect and draw.io XML author.
Generate a valid diagrams.net / draw.io `mxGraphModel` XML document for a system
architecture diagram.

OUTPUT RULES:
- Output ONLY XML beginning with `<mxGraphModel` and ending with `</mxGraphModel>`
- Do NOT include markdown code fences
- Do NOT include explanations before or after the XML
- Ensure the XML is importable into https://app.diagrams.net/
"""
    ]

    parts.append(_format_project_metadata(project))
    parts.append(_format_section_identity("system_config"))
    parts.append(_format_saved_sections(all_sections, max_chars=6000))
    parts.append(_format_draft_content(draft_content, max_chars=2500))

    if isinstance(category_context, LayeredCategoryContext):
        if category_context.architecture_context:
            parts.append(
                "## 5. Architecture Context (architecture_context.txt - prioritised)\n"
                f"{category_context.architecture_context}\n"
            )
        parts.append(_format_layered_context(category_context, "system_config"))
    else:
        parts.append(_format_context_txt(category_context.context_txt))

    parts.append(
        _format_historical_documents(
            category_context.historical_documents,
            max_docs=3,
            max_total_chars=3000,
        )
    )
    parts.append(_format_project_context_md())

    tech_stack = all_sections.get("tech_stack") or {}
    hardware_specs = all_sections.get("hardware_specs") or {}
    software_specs = all_sections.get("software_specs") or {}

    parts.append(
        f"""# TASK
Generate a draw.io architecture diagram for the System Configuration section.

The diagram should include, where supported by the available project data:
- plant devices, PLCs, HMIs, weighers, cranes, field equipment, or subsystems
- L1 / L2 boundaries when relevant
- application, MES, ERP, historian, or database layers when relevant
- server or VM components when relevant
- labeled arrows for major integrations and data flow
- security or network zone grouping when relevant

Prefer a clean left-to-right layout with grouped containers and readable labels.
Use neutral colors and standard architecture-diagram conventions.

# PROJECT SECTION HINTS
Tech stack:
{json.dumps(tech_stack, ensure_ascii=False, indent=2)}

Hardware specs:
{json.dumps(hardware_specs, ensure_ascii=False, indent=2)}

Software specs:
{json.dumps(software_specs, ensure_ascii=False, indent=2)}

# XML REQUIREMENTS
- Return a complete `mxGraphModel` document
- Include the standard root cells with ids `0` and `1`
- Use rectangle vertices for systems/servers/clients and edges for integrations
- Keep labels concise and business-readable
- Avoid overlapping shapes by using explicit `x`, `y`, `width`, and `height`
"""
    )

    return _enforce_prompt_budget("\n\n".join(parts), "system_config", "drawio_architecture")



