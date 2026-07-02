"""
Unit tests for layered-context prompt builder integration (Task 24.5).

Tests the prompt builders after Task 24.1–24.4 updates:
- _format_layered_context() formatter (Task 24.1)
- build_section_prompt() with LayeredCategoryContext (Task 24.2)
- build_custom_section_prompt() with LayeredCategoryContext (Task 24.3)
- build_gantt_prompt() with LayeredCategoryContext + gantt prioritisation (Task 24.4)

Coverage targets: ≥85% for all formatting logic.

Test Categories:
    TestFormatLayeredContext        – unit tests for _format_layered_context()
    TestBuildSectionPromptLayered  – integration for build_section_prompt()
    TestBuildCustomSectionPromptLayered – integration for build_custom_section_prompt()
    TestBuildGanttPromptLayered    – integration for build_gantt_prompt()
    TestBackwardCompatibility      – ensure legacy CategoryContext still works
"""

import pytest
from unittest.mock import Mock
from typing import List

from app.ai_suggestions.builders import (
    build_section_prompt,
    build_custom_section_prompt,
    build_gantt_prompt,
    _format_layered_context,
    _format_context_txt,
    PROMPT_SOFT_TOKEN_BUDGET,
    estimate_prompt_tokens,
)
from app.ai_suggestions.retrieval import (
    CategoryContext,
    LayeredCategoryContext,
    HistoricalDoc,
)


# ---------------------------------------------------------------------------
# Shared fixtures / helpers
# ---------------------------------------------------------------------------

def _make_project(**kwargs) -> Mock:
    """Return a Mock project with sensible defaults."""
    project = Mock()
    project.solution_name = kwargs.get("solution_name", "UGS Solution")
    project.solution_full_name = kwargs.get("solution_full_name", "Unified Gateway Solution")
    project.client_name = kwargs.get("client_name", "ACME Steel")
    project.client_location = kwargs.get("client_location", "Mumbai")
    project.ts_type = kwargs.get("ts_type", "Data Analysis/Data Centralization/UGS")
    project.doc_date = kwargs.get("doc_date", "2026-06-23")
    return project


def _make_historical_doc(i: int = 0) -> HistoricalDoc:
    return HistoricalDoc(
        filename=f"hist_doc_{i}.txt",
        file_path=f"UGS/hist_doc_{i}.txt",
        content=f"Historical content excerpt {i} about UGS deployment.",
    )


def _full_layered_context(section_key: str = "executive_summary") -> LayeredCategoryContext:
    """All shared context fields populated + section guidance."""
    return LayeredCategoryContext(
        domain_context="UGS captures plant-floor data from PLCs and historians.",
        architecture_context="Modbus TCP and OPC-UA adapters feed a TimescaleDB store.",
        implementation_context="Phase 1 is FAT; Phase 2 is site commissioning.",
        cybersecurity_context="All VPN tunnels use AES-256; patches applied quarterly.",
        gantt_context="Overall schedule: M1-M5 over 20 weeks.",
        section_guidance="Focus on business value. Avoid jargon.",
        historical_documents=[_make_historical_doc(0), _make_historical_doc(1)],
        loaded_shared_contexts=[
            "domain_context.txt",
            "architecture_context.txt",
            "implementation_context.txt",
            "cybersecurity_context.txt",
            "gantt_context.txt",
        ],
        section_guidance_available=True,
        folder_path="/app/ts_documents/UGS",
        historical_context_available=True,
        legacy_context_txt=None,
    )


def _partial_layered_context() -> LayeredCategoryContext:
    """Only domain and implementation context present; no section guidance."""
    return LayeredCategoryContext(
        domain_context="UGS captures plant-floor data.",
        architecture_context=None,
        implementation_context="Phase 1 is FAT; Phase 2 is commissioning.",
        cybersecurity_context=None,
        gantt_context=None,
        section_guidance=None,
        historical_documents=[_make_historical_doc(0)],
        loaded_shared_contexts=["domain_context.txt", "implementation_context.txt"],
        section_guidance_available=False,
        folder_path="/app/ts_documents/UGS",
        historical_context_available=True,
        legacy_context_txt=None,
    )


def _legacy_fallback_context() -> LayeredCategoryContext:
    """No layered files loaded; legacy_context_txt populated."""
    return LayeredCategoryContext(
        domain_context=None,
        architecture_context=None,
        implementation_context=None,
        cybersecurity_context=None,
        gantt_context=None,
        section_guidance=None,
        historical_documents=[],
        loaded_shared_contexts=[],
        section_guidance_available=False,
        folder_path="/app/ts_documents/Legacy",
        historical_context_available=False,
        legacy_context_txt="This is the old monolithic context.txt content.",
    )


def _no_context_layered() -> LayeredCategoryContext:
    """No layered files AND no legacy fallback – completely empty."""
    return LayeredCategoryContext(
        historical_documents=[],
        loaded_shared_contexts=[],
        section_guidance_available=False,
        folder_path="/app/ts_documents/Empty",
        historical_context_available=False,
    )


def _legacy_category_context() -> CategoryContext:
    """Traditional CategoryContext for backward-compat tests."""
    return CategoryContext(
        context_txt="Legacy context.txt content for the test TS type.",
        historical_documents=[_make_historical_doc(0)],
        folder_path="/app/ts_documents/Level2",
        historical_context_available=True,
    )


# ===========================================================================
# Task 24.1 – _format_layered_context()
# ===========================================================================

class TestFormatLayeredContext:
    """Unit tests for _format_layered_context() (Task 24.1)."""

    # -------------------------------------------------------------------
    # Header / metadata
    # -------------------------------------------------------------------

    def test_header_contains_section_key(self):
        ctx = _full_layered_context("features")
        result = _format_layered_context(ctx, "features")
        assert "## 5. Category Context (layered - loaded for features)" in result

    def test_header_lists_loaded_files(self):
        ctx = _full_layered_context()
        result = _format_layered_context(ctx, "executive_summary")
        assert "domain_context.txt" in result
        assert "architecture_context.txt" in result

    def test_header_shows_section_guidance_available(self):
        ctx = _full_layered_context()
        result = _format_layered_context(ctx, "executive_summary")
        assert "Section guidance: available" in result

    def test_header_no_section_guidance_flag(self):
        ctx = _partial_layered_context()
        result = _format_layered_context(ctx, "tech_stack")
        assert "Section guidance: available" not in result

    def test_header_no_files_shows_none(self):
        # no shared contexts but guidance is available
        ctx = LayeredCategoryContext(
            domain_context=None,
            section_guidance="Some guidance.",
            section_guidance_available=True,
            loaded_shared_contexts=[],
            folder_path="/tmp",
        )
        result = _format_layered_context(ctx, "binding_conditions")
        assert "Loaded context files: (none)" in result

    # -------------------------------------------------------------------
    # Context type sub-headers
    # -------------------------------------------------------------------

    def test_all_context_subheaders_present_when_all_loaded(self):
        ctx = _full_layered_context()
        result = _format_layered_context(ctx, "executive_summary")
        assert "### Domain Context (domain_context.txt)" in result
        assert "### Architecture Context (architecture_context.txt)" in result
        assert "### Implementation Context (implementation_context.txt)" in result
        assert "### Cybersecurity Context (cybersecurity_context.txt)" in result
        assert "### Gantt / Schedule Context (gantt_context.txt)" in result

    def test_only_present_subheaders_appear(self):
        ctx = _partial_layered_context()
        result = _format_layered_context(ctx, "features")
        assert "### Domain Context (domain_context.txt)" in result
        assert "### Implementation Context (implementation_context.txt)" in result
        # absent fields must NOT produce a sub-header
        assert "### Architecture Context" not in result
        assert "### Cybersecurity Context" not in result
        assert "### Gantt / Schedule Context" not in result

    def test_context_content_appears_under_subheader(self):
        ctx = _full_layered_context()
        result = _format_layered_context(ctx, "overview")
        assert "UGS captures plant-floor data" in result
        assert "Modbus TCP and OPC-UA adapters" in result
        assert "Phase 1 is FAT" in result

    # -------------------------------------------------------------------
    # Deterministic ordering
    # -------------------------------------------------------------------

    def test_domain_before_architecture_before_implementation(self):
        ctx = _full_layered_context()
        result = _format_layered_context(ctx, "overview")
        domain_pos = result.find("### Domain Context")
        arch_pos = result.find("### Architecture Context")
        impl_pos = result.find("### Implementation Context")
        cyber_pos = result.find("### Cybersecurity Context")
        gantt_pos = result.find("### Gantt / Schedule Context")
        assert domain_pos < arch_pos < impl_pos < cyber_pos < gantt_pos

    # -------------------------------------------------------------------
    # Section guidance
    # -------------------------------------------------------------------

    def test_section_guidance_block_present(self):
        ctx = _full_layered_context("features")
        result = _format_layered_context(ctx, "features")
        assert "### Section Guidance (features.txt)" in result
        assert "Focus on business value" in result

    def test_section_guidance_absent_when_not_available(self):
        ctx = _partial_layered_context()
        result = _format_layered_context(ctx, "tech_stack")
        assert "### Section Guidance" not in result

    # -------------------------------------------------------------------
    # Legacy fallback path
    # -------------------------------------------------------------------

    def test_legacy_fallback_formats_as_context_txt(self):
        ctx = _legacy_fallback_context()
        result = _format_layered_context(ctx, "executive_summary")
        # Should fall through to _format_context_txt() which uses '## 5. Category Context (context.txt)'
        assert "## 5. Category Context (context.txt)" in result
        assert "old monolithic context.txt" in result

    def test_completely_empty_context_returns_no_context_message(self):
        ctx = _no_context_layered()
        result = _format_layered_context(ctx, "poc")
        assert "(No context files available)" in result

    # -------------------------------------------------------------------
    # Truncation pass-through
    # -------------------------------------------------------------------

    def test_legacy_fallback_truncation_at_2000_chars(self):
        long_legacy = "X" * 5000
        ctx = LayeredCategoryContext(
            legacy_context_txt=long_legacy,
            loaded_shared_contexts=[],
            section_guidance_available=False,
            folder_path="/tmp",
        )
        result = _format_layered_context(ctx, "disclaimer")
        assert "[truncated at 2000 chars]" in result


# ===========================================================================
# Task 24.2 – build_section_prompt() with LayeredCategoryContext
# ===========================================================================

class TestBuildSectionPromptLayered:
    """Integration tests for build_section_prompt() with LayeredCategoryContext."""

    def _call(self, section_key="executive_summary", ctx=None):
        if ctx is None:
            ctx = _full_layered_context(section_key)
        return build_section_prompt(
            section_key=section_key,
            project=_make_project(),
            all_sections={"overview": {"process_summary": "Some overview"}},
            draft_content=None,
            category_context=ctx,
        )

    def test_layer_5_uses_layered_header(self):
        result = self._call("executive_summary")
        assert "## 5. Category Context (layered - loaded for executive_summary)" in result

    def test_all_7_layers_present(self):
        result = self._call("tech_stack")
        assert "## 1. Project Metadata" in result
        assert "## 2. Section Identity" in result
        assert "## 3. Existing Saved Section Content" in result
        assert "## 4. Current Draft Content" in result
        assert "## 5. Category Context" in result
        assert "## 6. Historical TS Document Excerpts" in result
        assert "## 7. System Knowledge" in result
        assert "## 8. Output Format" in result

    def test_domain_context_content_in_prompt(self):
        result = self._call()
        assert "UGS captures plant-floor data" in result

    def test_section_guidance_in_prompt(self):
        result = self._call("features")
        assert "Focus on business value" in result

    def test_suppressed_section_raises(self):
        with pytest.raises(ValueError, match="not available for section"):
            self._call("cover")

    def test_partial_context_no_missing_subheaders(self):
        """With partial context, absent subheaders must not appear."""
        ctx = _partial_layered_context()
        result = self._call("features", ctx=ctx)
        assert "### Architecture Context" not in result
        assert "### Cybersecurity Context" not in result

    def test_token_budget_enforced_with_layered_context(self):
        big_sections = {f"s{i}": {"data": "word " * 2000} for i in range(10)}
        ctx = _full_layered_context("tech_stack")
        result = build_section_prompt(
            section_key="tech_stack",
            project=_make_project(),
            all_sections=big_sections,
            draft_content={"extra": "draft " * 3000},
            category_context=ctx,
        )
        assert estimate_prompt_tokens(result) <= PROMPT_SOFT_TOKEN_BUDGET
        # Critical layers must survive budget enforcement
        assert "## 1. Project Metadata" in result
        assert "## 2. Section Identity" in result
        assert "## 8. Output Format" in result

    def test_historical_docs_included(self):
        result = self._call()
        assert "hist_doc_0.txt" in result

    def test_layer_ordering_preserved(self):
        result = self._call("features")
        pos = {
            "meta": result.find("## 1. Project Metadata"),
            "identity": result.find("## 2. Section Identity"),
            "saved": result.find("## 3. Existing Saved Section Content"),
            "draft": result.find("## 4. Current Draft Content"),
            "ctx": result.find("## 5. Category Context"),
            "hist": result.find("## 6. Historical TS Document Excerpts"),
            "sys": result.find("## 7. System Knowledge"),
        }
        ordered = list(pos.values())
        assert ordered == sorted(ordered), "Layer positions must be in ascending order"


# ===========================================================================
# Task 24.3 – build_custom_section_prompt() with LayeredCategoryContext
# ===========================================================================

class TestBuildCustomSectionPromptLayered:
    """Integration tests for build_custom_section_prompt() with LayeredCategoryContext."""

    def _call(self, subsection_type="paragraph", ctx=None):
        if ctx is None:
            ctx = _full_layered_context()
        return build_custom_section_prompt(
            custom_section_title="Custom Architecture Details",
            subsection_name="Data Flow Description",
            subsection_type=subsection_type,
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

    def test_layer_5_uses_layered_header_for_custom_section(self):
        result = self._call()
        assert "## 5. Category Context (layered - loaded for custom:" in result

    def test_domain_context_in_custom_prompt(self):
        result = self._call()
        assert "UGS captures plant-floor data" in result

    def test_paragraph_output_format(self):
        result = self._call("paragraph")
        assert "HTML" in result
        assert "<p>" in result

    def test_table_output_format(self):
        result = self._call("table")
        assert "columns" in result
        assert "rows" in result

    def test_image_output_format(self):
        result = self._call("image")
        assert "caption" in result
        assert "note" in result

    def test_custom_section_title_in_prompt(self):
        result = self._call()
        assert "Custom Architecture Details" in result

    def test_partial_context_used(self):
        ctx = _partial_layered_context()
        result = self._call(ctx=ctx)
        assert "UGS captures plant-floor data" in result
        assert "### Architecture Context" not in result

    def test_legacy_fallback_in_custom_prompt(self):
        ctx = _legacy_fallback_context()
        result = self._call(ctx=ctx)
        assert "## 5. Category Context (context.txt)" in result
        assert "old monolithic context.txt" in result

    def test_token_budget_enforced_custom(self):
        big_sections = {f"s{i}": {"data": "word " * 2000} for i in range(10)}
        ctx = _full_layered_context()
        result = build_custom_section_prompt(
            custom_section_title="Big Custom Section",
            subsection_name="Details",
            subsection_type="paragraph",
            project=_make_project(),
            all_sections=big_sections,
            draft_content={"notes": "draft " * 3000},
            category_context=ctx,
        )
        assert estimate_prompt_tokens(result) <= PROMPT_SOFT_TOKEN_BUDGET


# ===========================================================================
# Task 24.4 – build_gantt_prompt() with LayeredCategoryContext
# ===========================================================================

class TestBuildGanttPromptLayered:
    """Integration tests for build_gantt_prompt() with gantt_context prioritisation."""

    def _call(self, section_key="overall_gantt", ctx=None):
        if ctx is None:
            ctx = _full_layered_context(section_key)
        return build_gantt_prompt(
            section_key=section_key,
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

    # -------------------------------------------------------------------
    # Gantt prioritisation (Task 24.4)
    # -------------------------------------------------------------------

    def test_gantt_context_prioritised_block_present(self):
        result = self._call("overall_gantt")
        assert "Gantt / Schedule Context (gantt_context.txt - prioritised)" in result

    def test_gantt_context_content_in_prioritised_block(self):
        result = self._call("overall_gantt")
        assert "M1-M5 over 20 weeks" in result

    def test_gantt_prioritised_before_layered_section(self):
        result = self._call("overall_gantt")
        prio_pos = result.find("Gantt / Schedule Context (gantt_context.txt - prioritised)")
        layered_pos = result.find("## 5. Category Context (layered - loaded for overall_gantt)")
        assert prio_pos < layered_pos, "Prioritised gantt block must appear before layered section"

    def test_gantt_layered_section_also_present(self):
        """_format_layered_context() is also called so LLM sees all context types."""
        result = self._call("overall_gantt")
        assert "## 5. Category Context (layered - loaded for overall_gantt)" in result

    def test_no_gantt_context_no_prioritised_block(self):
        ctx = LayeredCategoryContext(
            domain_context="Some domain info.",
            architecture_context=None,
            implementation_context="Phase information.",
            cybersecurity_context=None,
            gantt_context=None,   # <-- explicitly absent
            section_guidance=None,
            historical_documents=[],
            loaded_shared_contexts=["domain_context.txt", "implementation_context.txt"],
            section_guidance_available=False,
            folder_path="/tmp",
        )
        result = self._call("overall_gantt", ctx=ctx)
        assert "gantt_context.txt - prioritised" not in result
        # But layered section should still be present
        assert "## 5. Category Context (layered" in result

    def test_shutdown_gantt_section_key(self):
        ctx = _full_layered_context("shutdown_gantt")
        result = self._call("shutdown_gantt", ctx=ctx)
        assert "loaded for shutdown_gantt" in result

    def test_gantt_prompt_output_rules_present(self):
        result = self._call()
        assert "OUTPUT RULES" in result
        assert "start_week" in result
        assert "duration_weeks" in result

    def test_gantt_historical_docs_included(self):
        result = self._call()
        assert "hist_doc_0.txt" in result

    def test_gantt_token_budget_enforced(self):
        big_sections = {f"s{i}": {"data": "word " * 2000} for i in range(10)}
        ctx = _full_layered_context("overall_gantt")
        result = build_gantt_prompt(
            section_key="overall_gantt",
            project=_make_project(),
            all_sections=big_sections,
            draft_content={"notes": "draft " * 3000},
            category_context=ctx,
        )
        assert estimate_prompt_tokens(result) <= PROMPT_SOFT_TOKEN_BUDGET


# ===========================================================================
# Backward compatibility – all builders still work with legacy CategoryContext
# ===========================================================================

class TestBackwardCompatibility:
    """Ensure all builders are fully backward-compatible with CategoryContext."""

    def _legacy_ctx(self) -> CategoryContext:
        return _legacy_category_context()

    def test_build_section_prompt_with_legacy_context(self):
        result = build_section_prompt(
            section_key="tech_stack",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=self._legacy_ctx(),
            project_context_md="",  # legacy positional arg still supported
        )
        assert "## 5. Category Context (context.txt)" in result
        assert "Legacy context.txt content" in result

    def test_build_section_prompt_project_context_md_kwarg(self):
        """project_context_md default parameter should not break callers."""
        result = build_section_prompt(
            section_key="tech_stack",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=self._legacy_ctx(),
        )
        assert "## 1. Project Metadata" in result

    def test_build_custom_section_prompt_with_legacy_context(self):
        result = build_custom_section_prompt(
            custom_section_title="Legacy Custom",
            subsection_name="Info",
            subsection_type="paragraph",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=self._legacy_ctx(),
        )
        assert "## 5. Category Context (context.txt)" in result
        assert "Legacy context.txt content" in result

    def test_build_gantt_prompt_with_legacy_context(self):
        result = build_gantt_prompt(
            section_key="overall_gantt",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=self._legacy_ctx(),
        )
        assert "## 5. Category Context (context.txt)" in result
        assert "Legacy context.txt content" in result

    def test_no_regression_in_suppression_check(self):
        with pytest.raises(ValueError, match="not available for section"):
            build_section_prompt(
                section_key="cover",
                project=_make_project(),
                all_sections={},
                draft_content=None,
                category_context=self._legacy_ctx(),
            )
"""
Additional truncation & layer-ordering guards
"""


class TestTruncationStillWorks:
    """Verify truncation logic is not broken by layered context changes."""

    def test_layered_context_prompt_respects_budget(self):
        big_context = LayeredCategoryContext(
            domain_context="D " * 600,
            architecture_context="A " * 600,
            implementation_context="I " * 600,
            cybersecurity_context="C " * 600,
            gantt_context="G " * 600,
            section_guidance="SG " * 300,
            historical_documents=[
                HistoricalDoc(filename=f"d{i}.txt", file_path=f"p/d{i}.txt", content="H " * 1000)
                for i in range(5)
            ],
            loaded_shared_contexts=[
                "domain_context.txt",
                "architecture_context.txt",
                "implementation_context.txt",
                "cybersecurity_context.txt",
                "gantt_context.txt",
            ],
            section_guidance_available=True,
            folder_path="/tmp",
        )
        big_saved = {f"s{i}": {"data": "word " * 1000} for i in range(15)}
        result = build_section_prompt(
            section_key="executive_summary",
            project=_make_project(),
            all_sections=big_saved,
            draft_content={"notes": "draft " * 2000},
            category_context=big_context,
        )
        assert estimate_prompt_tokens(result) <= PROMPT_SOFT_TOKEN_BUDGET
        # Non-truncatable layers must survive
        assert "## 1. Project Metadata" in result
        assert "## 2. Section Identity" in result
        assert "## 8. Output Format" in result
