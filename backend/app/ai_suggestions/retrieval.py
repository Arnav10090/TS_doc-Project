"""Retrieval utilities for AI Suggestions feature.

Provides `load_category_context` which safely resolves a `ts_type` into the
`ts_documents` folder, reads an optional `context.txt`, and extracts plain-text
excerpts from `.txt`, `.md`, and `.docx` files. This module enforces a safe
abspath check to prevent path traversal.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Tuple
import os
import logging
from threading import RLock

from docx import Document

from app.ai_suggestions.validation import normalize_text, validate_ts_type

logger = logging.getLogger(__name__)


_CACHE_LOCK = RLock()
_CONTEXT_CACHE: Dict[Tuple[str, str, int], Tuple[Tuple[bool, int, int], "CategoryContext"]] = {}

# Cache for load_layered_context() - Task 23.5
# Key: (base, validated_ts_type, section_key, max_docs)
# Value: (fingerprint, LayeredCategoryContext)
_LAYERED_CONTEXT_CACHE: Dict[Tuple[str, str, str, int], Tuple[Tuple[bool, int, int], "LayeredCategoryContext"]] = {}

class HistoricalDoc(BaseModel):
    """Represents a historical document with extracted content."""
    filename: str
    content: str
    file_path: str


class CategoryContext(BaseModel):
    """Category-level context including context.txt and historical documents."""
    context_txt: Optional[str] = None
    historical_documents: List[HistoricalDoc]
    folder_path: str
    historical_context_available: bool


class LayeredCategoryContext(BaseModel):
    """Layered context structure for section-specific AI suggestions.
    
    This model supports the layered context architecture where different types of
    context files are loaded based on the section being edited. All context fields
    are optional to handle missing files gracefully.
    
    Shared context files (loaded based on section routing):
    - domain_context: Business domain knowledge and core concepts
    - architecture_context: Technical architecture patterns and stack info
    - implementation_context: Implementation phases and project execution details
    - cybersecurity_context: Security policies and compliance requirements
    - gantt_context: Scheduling guidance and timeline information
    
    Section-specific context:
    - section_guidance: Per-section writing guidance and templates
    
    Historical context:
    - historical_documents: Extracted excerpts from past TS documents
    
    Metadata fields:
    - loaded_shared_contexts: List of context file names successfully loaded
    - section_guidance_available: Whether section-specific guidance was found
    - folder_path: Absolute path to the ts_type folder
    - historical_context_available: Whether historical docs were found
    
    Backward compatibility:
    - legacy_context_txt: Fallback to monolithic context.txt when layered files don't exist
    """
    # Shared context files (optional, loaded based on routing)
    domain_context: Optional[str] = None
    architecture_context: Optional[str] = None
    implementation_context: Optional[str] = None
    cybersecurity_context: Optional[str] = None
    gantt_context: Optional[str] = None
    
    # Section-specific guidance
    section_guidance: Optional[str] = None
    
    # Historical documents (reused from existing system)
    historical_documents: List[HistoricalDoc] = []
    
    # Metadata fields
    loaded_shared_contexts: List[str] = []
    section_guidance_available: bool = False
    folder_path: str = ""
    historical_context_available: bool = False
    
    # Backward compatibility fallback
    legacy_context_txt: Optional[str] = None


def _read_docx_text(path: str) -> str:
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs)



def clear_retrieval_cache() -> None:
    """Clear cached retrieval results. Intended for tests and admin hooks."""
    with _CACHE_LOCK:
        _CONTEXT_CACHE.clear()


def clear_layered_retrieval_cache() -> None:
    """Clear cached layered retrieval results. Intended for tests and admin hooks."""
    with _CACHE_LOCK:
        _LAYERED_CONTEXT_CACHE.clear()


def _directory_fingerprint(path: str) -> Tuple[bool, int, int]:
    """Return a cheap invalidation fingerprint for a category directory tree."""
    if not os.path.exists(path):
        return (False, 0, 0)

    max_mtime_ns = 0
    entry_count = 0
    for root, dirs, files in os.walk(path):
        entries = [root]
        entries.extend(os.path.join(root, dirname) for dirname in dirs)
        entries.extend(os.path.join(root, filename) for filename in files)

        for entry in entries:
            try:
                stat = os.stat(entry)
            except OSError:
                continue

            max_mtime_ns = max(
                max_mtime_ns,
                getattr(stat, "st_mtime_ns", int(stat.st_mtime * 1_000_000_000)),
            )
            entry_count += 1

    return (True, max_mtime_ns, entry_count)


def _copy_context(context: "CategoryContext") -> "CategoryContext":
    """Return a defensive deep copy for cached Pydantic models."""
    return context.model_copy(deep=True)


def load_category_context(ts_type: str, ts_documents_dir: str, max_docs: int = 5) -> CategoryContext:
    """Load category-level context and historical document excerpts.

    Args:
        ts_type: category path supporting multi-level hierarchy (e.g., "Data Analysis/Data Centralization/Historian", "Level 2", "OT Upgrades/HMI")
        ts_documents_dir: absolute or relative path to the documents root
        max_docs: maximum number of historical documents to select

    Raises:
        ValueError: if resolved path is outside `ts_documents_dir` (path traversal)
    """
    validated_ts_type = validate_ts_type(ts_type, required=True)
    if validated_ts_type is None:
        raise ValueError("TS type is required")

    base = os.path.abspath(ts_documents_dir)
    category_path = os.path.join(base, *validated_ts_type.split("/"))
    resolved = os.path.abspath(category_path)
    # Prevent path traversal: resolved must be inside base.
    if os.path.commonpath([base, resolved]) != base:
        raise ValueError("Invalid ts_type: path traversal detected")

    cache_key = (base, validated_ts_type, max_docs)
    fingerprint = _directory_fingerprint(resolved)
    with _CACHE_LOCK:
        cached = _CONTEXT_CACHE.get(cache_key)
        if cached and cached[0] == fingerprint:
            logger.debug("AI retrieval cache hit for ts_type=%s", validated_ts_type)
            return _copy_context(cached[1])

    logger.debug("AI retrieval cache miss for ts_type=%s", validated_ts_type)
    # Read context.txt at category root (non-recursive)
    context_txt_path = os.path.join(resolved, "context.txt")
    context_txt = None
    if os.path.exists(context_txt_path):
        try:
            with open(context_txt_path, "r", encoding="utf-8") as f:
                context_txt = normalize_text(f.read(2000))
        except Exception:
            logger.warning("Unable to read context.txt for ts_type=%s", validated_ts_type)
            context_txt = None
    else:
        logger.warning("Missing context.txt for ts_type=%s", validated_ts_type)

    # Collect candidate documents recursively
    candidates: List[HistoricalDoc] = []
    for root, _, files in os.walk(resolved):
        for fname in files:
            if not fname.lower().endswith((".txt", ".md", ".docx")):
                continue

            full_path = os.path.join(root, fname)
            if os.path.abspath(full_path) == os.path.abspath(context_txt_path):
                continue

            try:
                if fname.lower().endswith(".docx"):
                    text = _read_docx_text(full_path)
                else:
                    with open(full_path, "r", encoding="utf-8") as f:
                        text = f.read()

                text = normalize_text(text)
                if len(text) > 1500:
                    text = text[:1500]

                rel = os.path.relpath(full_path, base)
                candidates.append(HistoricalDoc(filename=fname, file_path=rel, content=text))
            except Exception:
                # Ignore unreadable files
                continue

    # Diversity-aware selection: prefer one file per subfolder, then fill
    selected: List[HistoricalDoc] = []
    seen_dirs = set()
    for doc in candidates:
        subdir = os.path.dirname(doc.file_path)
        if subdir not in seen_dirs:
            selected.append(doc)
            seen_dirs.add(subdir)
            if len(selected) >= max_docs:
                break

    if len(selected) < max_docs:
        for doc in candidates:
            if doc not in selected:
                selected.append(doc)
                if len(selected) >= max_docs:
                    break

    if not candidates:
        logger.warning("No historical documents found for ts_type=%s", validated_ts_type)
    elif not selected:
        logger.warning("Historical documents folder produced no usable excerpts for ts_type=%s", validated_ts_type)

    # Determine if historical context is available
    historical_context_available = len(selected) > 0 or context_txt is not None

    context = CategoryContext(
        context_txt=context_txt,
        historical_documents=selected,
        folder_path=resolved,
        historical_context_available=historical_context_available
    )

    with _CACHE_LOCK:
        _CONTEXT_CACHE[cache_key] = (fingerprint, _copy_context(context))

    return context




# ============================================================================
# Type Aliases for Migration Path
# ============================================================================

# Legacy type alias for backward compatibility
LegacyCategoryContext = CategoryContext
"""Legacy category context using monolithic context.txt file.

**Migration Path:**
This type alias points to `CategoryContext`, which represents the original
retrieval system using a single `context.txt` file at the category root.

**When to use:**
- Existing code that hasn't been migrated to layered context
- Backward compatibility layers
- Legacy retrieval workflows

**Migration to Modern System:**
Code using `LegacyCategoryContext` should be migrated to `ModernCategoryContext`
(LayeredCategoryContext) which provides:
- Multiple specialized context files (domain, architecture, implementation, etc.)
- Section-specific guidance files
- Better context routing based on section type
- Backward compatibility via legacy_context_txt fallback

**Example Legacy Usage:**
```python
context: LegacyCategoryContext = load_category_context(ts_type, docs_dir)
# Uses context.context_txt for all sections
```

**See also:** `ModernCategoryContext`, `LayeredCategoryContext`
"""

# Modern type alias for layered context system
ModernCategoryContext = LayeredCategoryContext
"""Modern category context using specialized layered context files.

**Migration Path:**
This type alias points to `LayeredCategoryContext`, which represents the new
retrieval system using multiple specialized context files organized by purpose.

**Architecture:**
The layered context system provides:
1. **Shared context files** (loaded based on section routing):
   - domain_context.txt: Business domain knowledge
   - architecture_context.txt: Technical architecture patterns
   - implementation_context.txt: Project execution details
   - cybersecurity_context.txt: Security requirements
   - gantt_context.txt: Scheduling guidance
   
2. **Section-specific guidance**:
   - section_guidance/{section_key}.txt: Per-section templates

3. **Historical documents**:
   - Reuses existing document extraction (backward compatible)

4. **Backward compatibility**:
   - legacy_context_txt: Falls back to context.txt when layered files don't exist

**When to use:**
- New code implementing layered context features
- Section-aware prompt building
- Optimized context loading based on section type

**Example Modern Usage:**
```python
context: ModernCategoryContext = load_layered_category_context(
    ts_type, docs_dir, section_key
)
# Uses specialized context files relevant to the section
if context.domain_context:
    prompt += context.domain_context
if context.section_guidance_available:
    prompt += context.section_guidance
```

**Migration from Legacy:**
Replace `LegacyCategoryContext` with `ModernCategoryContext` and update:
- Change `load_category_context()` → `load_layered_category_context()`
- Add `section_key` parameter for section-specific routing
- Update prompt builders to use specialized context fields
- Add fallback handling for `legacy_context_txt` when layered files unavailable

**See also:** `LegacyCategoryContext`, `CategoryContext`
"""


def load_layered_context(
    ts_type: str,
    ts_documents_dir: str,
    section_key: str,
    max_docs: int = 5
) -> LayeredCategoryContext:
    """Load layered context with section-specific routing (Task 23.1 skeleton).
    
    This function implements the layered context architecture by:
    1. Validating and resolving the ts_type folder path with path traversal prevention
    2. Getting the list of shared context files from the routing map based on section_key
    3. Getting the section guidance filename from the routing map
    4. (Future tasks will implement actual file loading)
    
    **Security:**
    - Uses validate_ts_type() to prevent injection attacks
    - Validates resolved path is within ts_documents_dir to prevent path traversal
    - Follows same security pattern as load_category_context()
    
    **Routing Integration:**
    - Calls get_shared_context_files(section_key, resolved_folder) to determine which
      shared context files should be loaded for this section
    - Calls get_section_guidance_file(section_key) to determine if section-specific
      guidance is available
    - Resolved folder path is passed to routing functions to support JSON overrides
    
    **Current Implementation Status (Task 23.1):**
    This is a skeleton implementation that validates inputs and integrates with the
    routing system. File loading will be implemented in subsequent tasks:
    - Task 23.2: Load shared context files
    - Task 23.3: Load section guidance files
    - Task 23.4: Load historical documents
    
    Args:
        ts_type: Category path supporting multi-level hierarchy
                (e.g., "Data Analysis/Data Centralization/Historian", "Level 2")
        ts_documents_dir: Absolute or relative path to the documents root
        section_key: Repository section key for routing (e.g., "executive_summary",
                    "features", "custom_section_1234567890_abc123")
        max_docs: Maximum number of historical documents to select (default: 5)
    
    Returns:
        LayeredCategoryContext with folder_path set and metadata populated.
        Currently returns empty context fields (file loading in future tasks).
    
    Raises:
        ValueError: If ts_type is invalid, required, or resolves to a path outside
                   ts_documents_dir (path traversal detected)
    
    Examples:
        >>> # Load context for executive_summary section
        >>> context = load_layered_context(
        ...     "Data Analysis/Historian",
        ...     "/app/ts_documents",
        ...     "executive_summary"
        ... )
        >>> context.folder_path
        '/app/ts_documents/Data Analysis/Historian'
        >>> # Context files will be loaded in future tasks
        
        >>> # Load context for custom section
        >>> context = load_layered_context(
        ...     "Level 2",
        ...     "/app/ts_documents",
        ...     "custom_section_1234567890_abc123"
        ... )
        >>> # Custom sections default to domain_context per routing rules
    
    **Requirements Satisfied:**
    - Task 23.1: Function signature matches specification
    - Task 23.1: ts_type validation using validate_ts_type()
    - Task 23.1: Path traversal prevention (same pattern as load_category_context)
    - Task 23.1: Routing integration (get_shared_context_files, get_section_guidance_file)
    - Task 23.1: Error handling and logging
    - Security Requirement 14.2: Path traversal prevention
    """
    from app.ai_suggestions.section_context_map import (
        get_shared_context_files,
        get_section_guidance_file
    )
    
    # Validate ts_type using existing validation function
    validated_ts_type = validate_ts_type(ts_type, required=True)
    if validated_ts_type is None:
        raise ValueError("TS type is required")
    
    # Resolve folder path with path traversal prevention
    # Same security pattern as load_category_context()
    base = os.path.abspath(ts_documents_dir)
    category_path = os.path.join(base, *validated_ts_type.split("/"))
    resolved = os.path.abspath(category_path)
    
    # Prevent path traversal: resolved must be inside base
    if os.path.commonpath([base, resolved]) != base:
        raise ValueError("Invalid ts_type: path traversal detected")

    logger.debug(
        f"load_layered_context: ts_type={validated_ts_type}, "
        f"section_key={section_key}, resolved={resolved}"
    )

    # =========================================================================
    # Task 23.5: Check cache before doing any file I/O
    # =========================================================================
    layered_cache_key = (base, validated_ts_type, section_key, max_docs)
    current_fingerprint = _directory_fingerprint(resolved)
    with _CACHE_LOCK:
        cached = _LAYERED_CONTEXT_CACHE.get(layered_cache_key)
        if cached and cached[0] == current_fingerprint:
            logger.debug(
                "Layered context cache hit for ts_type=%s, section_key=%s",
                validated_ts_type, section_key
            )
            return cached[1].model_copy(deep=True)

    logger.debug(
        "Layered context cache miss for ts_type=%s, section_key=%s",
        validated_ts_type, section_key
    )
    # =========================================================================
    # End Task 23.5 cache lookup (write-back is at end of function)
    # =========================================================================

    # Get list of shared context files from routing map
    # Pass resolved folder path to support JSON overrides (Task 21.3)
    shared_context_files = get_shared_context_files(section_key, resolved)
    logger.debug(
        f"Routing map returned {len(shared_context_files)} shared context files "
        f"for section '{section_key}': {shared_context_files}"
    )
    
    # Get section guidance filename from routing map
    section_guidance_filename = get_section_guidance_file(section_key)
    if section_guidance_filename:
        logger.debug(
            f"Section guidance available for '{section_key}': {section_guidance_filename}"
        )
    else:
        logger.debug(f"No section guidance defined for '{section_key}'")
    
    # =========================================================================
    # Task 23.2: Load shared context files from disk
    # =========================================================================
    
    # Map context filenames to LayeredCategoryContext field names
    CONTEXT_FILE_TO_FIELD = {
        "domain_context.txt": "domain_context",
        "architecture_context.txt": "architecture_context",
        "implementation_context.txt": "implementation_context",
        "cybersecurity_context.txt": "cybersecurity_context",
        "gantt_context.txt": "gantt_context",
    }
    
    # Initialize context fields dict
    context_fields = {
        "domain_context": None,
        "architecture_context": None,
        "implementation_context": None,
        "cybersecurity_context": None,
        "gantt_context": None,
    }
    
    # Track which files were successfully loaded
    loaded_shared_contexts: List[str] = []
    
    # Load each shared context file in the routing list
    for context_filename in shared_context_files:
        # Build full path to context file
        context_file_path = os.path.join(resolved, context_filename)
        
        # Get the field name for this context file
        field_name = CONTEXT_FILE_TO_FIELD.get(context_filename)
        if not field_name:
            logger.warning(
                f"Unknown context filename '{context_filename}' in routing map "
                f"for section '{section_key}'. Skipping."
            )
            continue
        
        # Try to read the file
        if os.path.exists(context_file_path):
            try:
                with open(context_file_path, 'r', encoding='utf-8') as f:
                    # Read file content
                    raw_content = f.read()
                    
                    # Normalize whitespace and strip non-printable characters
                    normalized_content = normalize_text(raw_content)
                    
                    # Truncate to 1000 chars max per Task 23.2 spec
                    if len(normalized_content) > 1000:
                        truncated_content = normalized_content[:1000]
                        logger.debug(
                            f"Truncated {context_filename} from {len(normalized_content)} "
                            f"to 1000 chars for section '{section_key}'"
                        )
                    else:
                        truncated_content = normalized_content
                    
                    # Store in context fields dict
                    context_fields[field_name] = truncated_content
                    
                    # Track successful load
                    loaded_shared_contexts.append(context_filename)
                    
                    logger.debug(
                        f"Loaded {context_filename} ({len(truncated_content)} chars) "
                        f"for section '{section_key}'"
                    )
                    
            except Exception as e:
                logger.warning(
                    f"Failed to read {context_file_path} for section '{section_key}': {e}. "
                    f"Skipping this context file."
                )
                # Continue loading other files even if one fails
                continue
        else:
            logger.debug(
                f"Context file {context_filename} not found at {context_file_path}. "
                f"Skipping (this is normal if not all context files exist)."
            )
    
    logger.info(
        f"Loaded {len(loaded_shared_contexts)}/{len(shared_context_files)} "
        f"shared context files for section '{section_key}': {loaded_shared_contexts}"
    )
    
    # =========================================================================
    # End Task 23.2
    # =========================================================================
    
    # =========================================================================
    # Task 23.3: Load section guidance file from disk
    # =========================================================================
    
    section_guidance_content: Optional[str] = None
    section_guidance_available = False
    
    if section_guidance_filename:
        # Build path: {folder}/section_guidance/{section_key}.txt
        section_guidance_path = os.path.join(resolved, "section_guidance", section_guidance_filename)
        
        # Try to read the file if it exists
        if os.path.exists(section_guidance_path):
            try:
                with open(section_guidance_path, 'r', encoding='utf-8') as f:
                    # Read file as UTF-8
                    raw_guidance = f.read()
                    
                    # Normalize whitespace and strip non-printable characters
                    normalized_guidance = normalize_text(raw_guidance)
                    
                    # Truncate to 500 chars max per Task 23.3 spec
                    if len(normalized_guidance) > 500:
                        section_guidance_content = normalized_guidance[:500]
                        logger.debug(
                            f"Truncated section guidance for '{section_key}' from "
                            f"{len(normalized_guidance)} to 500 chars"
                        )
                    else:
                        section_guidance_content = normalized_guidance
                    
                    # Set section_guidance_available flag
                    section_guidance_available = True
                    
                    logger.info(
                        f"Loaded section guidance for '{section_key}' "
                        f"({len(section_guidance_content)} chars) from {section_guidance_filename}"
                    )
                    
            except Exception as e:
                logger.warning(
                    f"Failed to read section guidance file {section_guidance_path} "
                    f"for section '{section_key}': {e}. Proceeding without section guidance."
                )
                section_guidance_content = None
                section_guidance_available = False
        else:
            logger.debug(
                f"Section guidance file not found at {section_guidance_path} "
                f"for section '{section_key}'. This is normal if guidance hasn't been created yet."
            )
    else:
        logger.debug(
            f"No section guidance filename configured for section '{section_key}'. "
            f"Skipping section guidance loading."
        )
    
    # =========================================================================
    # End Task 23.3
    # =========================================================================
    
    # =========================================================================
    # Task 23.4: Legacy fallback logic
    # If NO layered (shared context) files were loaded, fall back to context.txt
    # =========================================================================

    legacy_context_txt: Optional[str] = None

    if not loaded_shared_contexts:
        # No layered files were loaded — try legacy monolithic context.txt
        legacy_context_path = os.path.join(resolved, "context.txt")
        if os.path.exists(legacy_context_path):
            try:
                with open(legacy_context_path, "r", encoding="utf-8") as f:
                    raw_legacy = f.read(2000)
                legacy_context_txt = normalize_text(raw_legacy)
                logger.info(
                    f"Falling back to legacy context.txt for ts_type={validated_ts_type}, "
                    f"section_key={section_key}: no layered context files found in {resolved}"
                )
            except Exception as e:
                logger.warning(
                    f"Failed to read legacy context.txt at {legacy_context_path} "
                    f"for ts_type={validated_ts_type}: {e}. Proceeding without legacy context."
                )
        else:
            logger.debug(
                f"No layered context files and no legacy context.txt found "
                f"for ts_type={validated_ts_type} at {resolved}."
            )
    else:
        # Layered files exist — ignore context.txt (Task 23.4 spec)
        logger.debug(
            f"Layered context files loaded for ts_type={validated_ts_type}; "
            f"skipping legacy context.txt."
        )

    # =========================================================================
    # End Task 23.4
    # =========================================================================

    # =========================================================================
    # Task 23.6: Load historical documents (reuse existing logic)
    # Recursively scan for .txt, .md, .docx files; skip context files and
    # section_guidance/ directory; apply diversity-aware selection.
    # =========================================================================

    # Known context filenames to exclude from historical documents
    CONTEXT_FILENAMES = {
        "context.txt",
        "domain_context.txt",
        "architecture_context.txt",
        "implementation_context.txt",
        "cybersecurity_context.txt",
        "gantt_context.txt",
    }

    candidates: List[HistoricalDoc] = []
    section_guidance_dir = os.path.join(resolved, "section_guidance")

    for root, dirs, files in os.walk(resolved):
        # Skip the section_guidance/ subdirectory entirely
        abs_root = os.path.abspath(root)
        if abs_root == os.path.abspath(section_guidance_dir) or abs_root.startswith(
            os.path.abspath(section_guidance_dir) + os.sep
        ):
            continue

        for fname in files:
            if not fname.lower().endswith((".txt", ".md", ".docx")):
                continue

            # Skip known context files
            if fname.lower() in CONTEXT_FILENAMES:
                continue

            full_path = os.path.join(root, fname)

            try:
                if fname.lower().endswith(".docx"):
                    text = _read_docx_text(full_path)
                else:
                    with open(full_path, "r", encoding="utf-8") as f:
                        text = f.read()

                text = normalize_text(text)
                if len(text) > 1500:
                    text = text[:1500]

                rel = os.path.relpath(full_path, os.path.abspath(ts_documents_dir))
                candidates.append(HistoricalDoc(filename=fname, file_path=rel, content=text))
            except Exception:
                # Ignore unreadable files
                continue

    # Diversity-aware selection: prefer one file per subfolder, then fill
    selected: List[HistoricalDoc] = []
    seen_dirs: set = set()
    for doc in candidates:
        subdir = os.path.dirname(doc.file_path)
        if subdir not in seen_dirs:
            selected.append(doc)
            seen_dirs.add(subdir)
            if len(selected) >= max_docs:
                break

    if len(selected) < max_docs:
        for doc in candidates:
            if doc not in selected:
                selected.append(doc)
                if len(selected) >= max_docs:
                    break

    if not candidates:
        logger.debug(
            f"No historical documents found for ts_type={validated_ts_type}"
        )
    elif not selected:
        logger.warning(
            f"Historical documents folder produced no usable excerpts "
            f"for ts_type={validated_ts_type}"
        )

    historical_context_available = (
        len(selected) > 0 or legacy_context_txt is not None
    )

    # =========================================================================
    # End Task 23.6
    # =========================================================================

    # Build final LayeredCategoryContext
    context = LayeredCategoryContext(
        folder_path=resolved,
        # Shared context fields
        domain_context=context_fields["domain_context"],
        architecture_context=context_fields["architecture_context"],
        implementation_context=context_fields["implementation_context"],
        cybersecurity_context=context_fields["cybersecurity_context"],
        gantt_context=context_fields["gantt_context"],
        # Track which shared context files were loaded
        loaded_shared_contexts=loaded_shared_contexts,
        # Section guidance (Task 23.3)
        section_guidance=section_guidance_content,
        section_guidance_available=section_guidance_available,
        # Historical documents (Task 23.6)
        historical_documents=selected,
        historical_context_available=historical_context_available,
        # Legacy fallback (Task 23.4)
        legacy_context_txt=legacy_context_txt,
    )

    logger.info(
        f"Layered context loaded for ts_type={validated_ts_type}, "
        f"section_key={section_key}: "
        f"{len(loaded_shared_contexts)} shared context file(s) loaded, "
        f"section_guidance={'available' if section_guidance_available else 'not available'}, "
        f"{len(selected)} historical doc(s), "
        f"legacy_fallback={'yes' if legacy_context_txt is not None else 'no'}"
    )

    # =========================================================================
    # Task 23.5: Cache the result with fingerprint for invalidation
    # Uses current_fingerprint and layered_cache_key computed at function start.
    # =========================================================================

    with _CACHE_LOCK:
        _LAYERED_CONTEXT_CACHE[layered_cache_key] = (current_fingerprint, context.model_copy(deep=True))

    return context
