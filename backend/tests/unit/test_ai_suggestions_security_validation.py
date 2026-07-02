import pytest

from app.ai_suggestions import builders
from app.ai_suggestions.retrieval import load_category_context
from app.ai_suggestions.validation import (
    is_valid_ai_section_key,
    normalize_text,
    sanitize_prompt_text,
    validate_ts_type,
)


def test_validate_ts_type_accepts_enum_values():
    assert validate_ts_type("Level 2", required=True) == "Level 2"
    assert (
        validate_ts_type("  Data Analysis/Data Centralization/UGS  ", required=True)
        == "Data Analysis/Data Centralization/UGS"
    )


def test_validate_ts_type_rejects_invalid_and_traversal_values():
    for value in ("T1", "../..", "Level 2/../../secret", ""):
        with pytest.raises(ValueError):
            validate_ts_type(value, required=True)


def test_ai_section_key_validation_allows_predefined_and_custom_section_only():
    assert is_valid_ai_section_key("executive_summary")
    assert is_valid_ai_section_key(
        "custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    )

    invalid_keys = [
        "Executive_Summary",
        "executive-summary",
        "../executive_summary",
        "custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "custom_section_abc_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    ]
    for key in invalid_keys:
        assert not is_valid_ai_section_key(key)


def test_prompt_text_sanitization_strips_html_normalizes_and_truncates():
    text = "<b>Client</b>\x00\n\n<script>alert(1)</script>" + (" x" * 400)

    sanitized = sanitize_prompt_text(text, max_length=500)

    assert "<" not in sanitized
    assert "\x00" not in sanitized
    assert "  " not in sanitized
    assert len(sanitized) == 500
    assert builders._sanitize_text(text) == sanitized


def test_normalize_text_strips_non_printable_and_collapses_whitespace():
    assert normalize_text("A\x00\n\t  B") == "A B"


def test_load_category_context_rejects_invalid_ts_type_before_path_resolution(tmp_path):
    base = tmp_path / "ts_documents"
    base.mkdir()

    with pytest.raises(ValueError, match="Invalid TS type"):
        load_category_context("../..", str(base))


def test_load_category_context_normalizes_text_blocks(tmp_path):
    base = tmp_path / "ts_documents"
    cat = base / "Level 2"
    cat.mkdir(parents=True)
    (cat / "context.txt").write_text("Line 1\x00\n\nLine 2", encoding="utf-8")
    (cat / "sample.txt").write_text("Doc\x00\n\nText", encoding="utf-8")

    ctx = load_category_context("Level 2", str(base))

    assert ctx.context_txt == "Line 1 Line 2"
    contents = {doc.filename: doc.content for doc in ctx.historical_documents}
    assert contents["sample.txt"] == "Doc Text"
