"""AI suggestion response parsers.

Provides parsing helpers for each content family so the service can decide
whether a structured import is available and return the parsed content or
the raw text when parsing fails.

Functions return a tuple: (structured_available: bool, content: Any, raw_text: Optional[str])
If `structured_available` is True then `content` holds the structured data and
`raw_text` is None. If False, `content` is None and `raw_text` contains the
original cleaned text for display/import fallback.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple


def _strip_code_fences(text: Optional[str]) -> str:
    """Strip common markdown code fences and leading labels from LLM output."""
    if not text:
        return ""
    txt = text.strip()

    # Remove leading labels like "Response:", "Answer:" etc.
    txt = re.sub(r'^\s*(Response|Answer|Output)\s*[:\-]\s*', '', txt, flags=re.I)

    # Remove surrounding triple backtick or tilde fences (with optional language)
    txt = re.sub(r'^\s*(```|~~~)[^\n]*\n', '', txt)
    txt = re.sub(r'\n\s*(```|~~~)\s*$', '', txt)

    # Remove single-line backtick wrapping (e.g. `[...]`)
    if txt.startswith('`') and txt.endswith('`'):
        txt = txt[1:-1]

    return txt.strip()


def _extract_json_from_text(text: str) -> Tuple[Optional[Any], Optional[str]]:
    """Attempt to locate and decode the first JSON value inside `text`.

    Returns tuple (obj, json_str) on success, or (None, None) on failure.
    Uses json.JSONDecoder.raw_decode to be tolerant of surrounding prose.
    """
    if not text:
        return None, None

    decoder = json.JSONDecoder()
    # Try every position that could start a JSON value
    for i, ch in enumerate(text):
        if ch not in '{[':
            continue
        try:
            obj, idx = decoder.raw_decode(text[i:])
            json_str = text[i : i + idx]
            return obj, json_str
        except Exception:
            continue

    return None, None


def parse_rich_text_response(response: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """Parse Family A (rich HTML) responses.

    Returns (True, html_string, None) when the output looks like HTML.
    Otherwise returns (False, None, raw_text) as a fallback.
    """
    cleaned = _strip_code_fences(response)

    # Heuristic: presence of common HTML tags used in prompts
    if re.search(r'</?(p|ul|ol|li|strong|em|br|h[1-6])\b', cleaned, flags=re.I):
        return True, cleaned, None

    # Accept anything that begins with an HTML tag
    if cleaned.startswith('<'):
        return True, cleaned, None

    # Not valid HTML per heuristics — treat as raw text
    return False, None, cleaned


def parse_table_response(response: str, expected_row_fields: Optional[List[str]] = None) -> Tuple[bool, Optional[List[Dict[str, Any]]], Optional[str]]:
    """Parse Family B (tabular) responses that should be a JSON array of row objects.

    - Strips code fences
    - Extracts JSON array from the text
    - Validates and fills missing expected fields (fills `sr_no` if missing)
    - On parse failure returns structured_available=False and raw_text for fallback
    """
    cleaned = _strip_code_fences(response)
    obj, _json_str = _extract_json_from_text(cleaned)
    if obj is None:
        return False, None, cleaned

    # Allow either a raw array or an envelope with `rows` key
    rows = None
    if isinstance(obj, list):
        rows = obj
    elif isinstance(obj, dict) and isinstance(obj.get('rows'), list):
        rows = obj.get('rows')
    else:
        return False, None, cleaned

    # Ensure each row is a dict
    if not all(isinstance(r, dict) for r in rows):
        return False, None, cleaned

    # Fill missing expected fields where applicable
    if expected_row_fields:
        for idx, row in enumerate(rows):
            for field in expected_row_fields:
                if field not in row:
                    # Autogenerate sequential sr_no if requested
                    if field == 'sr_no':
                        row['sr_no'] = idx + 1
                    else:
                        row[field] = ''

    return True, rows, None


def parse_mixed_field_response(response: str, expected_fields: Optional[List[str]] = None) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Parse Family C (mixed-field) responses expecting a JSON object.

    On success returns (True, dict, None). On failure returns (False, None, raw_text).
    Missing expected fields are added with empty-string defaults.
    """
    cleaned = _strip_code_fences(response)
    obj, _json_str = _extract_json_from_text(cleaned)
    if obj is None or not isinstance(obj, dict):
        return False, None, cleaned

    if expected_fields:
        for field in expected_fields:
            if field not in obj:
                obj[field] = ''

    return True, obj, None


def parse_list_response(response: str, expected_item_fields: Optional[List[str]] = None) -> Tuple[bool, Optional[List[Dict[str, Any]]], Optional[str]]:
    """Parse Family D (list-based) responses expecting a JSON array of item objects.

    Behaves similarly to `parse_table_response` but targets generic list items.
    """
    cleaned = _strip_code_fences(response)
    obj, _json_str = _extract_json_from_text(cleaned)
    if obj is None:
        return False, None, cleaned

    items = None
    if isinstance(obj, list):
        items = obj
    elif isinstance(obj, dict) and isinstance(obj.get('items'), list):
        items = obj.get('items')
    else:
        return False, None, cleaned

    if not all(isinstance(it, dict) for it in items):
        return False, None, cleaned

    if expected_item_fields:
        for it in items:
            for f in expected_item_fields:
                if f not in it:
                    it[f] = ''

    return True, items, None


def parse_image_description_response(response: str, expected_fields: Optional[List[str]] = None) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Parse Family E (image-backed) responses expecting a JSON object with text fields.

    If the LLM did not output JSON, this returns structured_available=False with the raw text.
    """
    cleaned = _strip_code_fences(response)
    obj, _json_str = _extract_json_from_text(cleaned)
    if obj is None or not isinstance(obj, dict):
        return False, None, cleaned

    # Normalize non-string values to strings (safe for descriptions)
    for k, v in list(obj.items()):
        if v is None:
            obj[k] = ''
        elif not isinstance(v, (str, int, float, bool)):
            obj[k] = str(v)

    if expected_fields:
        for f in expected_fields:
            if f not in obj:
                obj[f] = ''

    return True, obj, None


__all__ = [
    'parse_rich_text_response',
    'parse_table_response',
    'parse_mixed_field_response',
    'parse_list_response',
    'parse_image_description_response',
]
