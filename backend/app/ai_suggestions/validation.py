"""Validation and text-cleaning helpers for AI suggestions."""

from __future__ import annotations

import html
import re
from typing import Optional

from app.projects.ts_types import TSType
from app.sections.router import VALID_SECTION_KEYS


PREDEFINED_SECTION_KEY_PATTERN = re.compile(r"^[a-z_]+$")
CUSTOM_SECTION_KEY_PATTERN = re.compile(
    r"^custom_section_\d+_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
)
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")


def validate_ts_type(value: Optional[str], *, required: bool = False) -> Optional[str]:
    """Validate a TS type against the authoritative enum."""
    if value is None:
        if required:
            raise ValueError("TS type is required")
        return None

    normalized = normalize_text(value)
    if not normalized:
        if required:
            raise ValueError("TS type is required")
        return None

    if not TSType.is_valid(normalized):
        raise ValueError("Invalid TS type")

    return normalized


def is_valid_ai_section_key(section_key: str) -> bool:
    """Validate AI suggestion section keys per PRD patterns."""
    if section_key in VALID_SECTION_KEYS:
        return bool(PREDEFINED_SECTION_KEY_PATTERN.fullmatch(section_key))

    return bool(CUSTOM_SECTION_KEY_PATTERN.fullmatch(section_key))


def normalize_text(text: object) -> str:
    """Strip non-printable characters and normalize whitespace."""
    if text is None:
        return ""

    cleaned = str(text)
    cleaned = "".join(char for char in cleaned if char.isprintable() or char.isspace())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def sanitize_prompt_text(text: object, max_length: int = 500) -> str:
    """HTML-strip, normalize, and truncate user text before prompt inclusion."""
    cleaned = html.unescape("" if text is None else str(text))
    cleaned = HTML_TAG_PATTERN.sub("", cleaned)
    cleaned = normalize_text(cleaned)
    return cleaned[:max_length]
