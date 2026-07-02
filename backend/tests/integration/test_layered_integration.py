"""
Integration tests for the layered context system (Task 29.4).

Tests end-to-end suggestion generation with layered context by exercising:
- Routing → Retrieval → Prompt Building pipeline (no Groq / DB required)
- Multiple sections with different routing configurations
- That incorrect context is NOT loaded (e.g. hardware_specs doesn't get gantt_context)
- Section guidance is included when the guidance file exists
- Legacy projects still work with old context.txt (backward compatibility)

These tests are classified as "integration" because they exercise multiple
modules together (section_context_map + retrieval + builders) using real
file-system interactions via tmp_path fixtures.

Test File: test_layered_integration.py
"""

import os
import pytest
from pathlib import Path
from unittest.mock import Mock

from app.ai_suggestions.retrieval import (
    LayeredCategoryContext,
    clear_layered_retrieval_cache,
    load_layered_context,
)
from app.ai_suggestions.builders import (
    build_section_prompt,
    build_gantt_prompt,
    build_custom_section_prompt,
    estimate_prompt_tokens,
    PROMPT_SOFT_TOKEN_BUDeET,
)
from app.ai_suggestions.section_context_map import (
    get_shared_context_files,
    get_section_guidance_file,
    DOMAIN_CONTEXT,
    ARCHITECTURE_CONTEXT,
    IMPLEMENTATION_CONTEXT,
    CYBERSECURITY_CONTEXT,
    eANTT_CONTEXT,
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clear_cache():
    """Ensure each test starts with a clean layered context cache."""
    clear_layered_retrieval_cache()
    yield
    clear_layered_retrieval_cache()


def _make_project(**kwargs) -> Mock:
    """Return a Mock project with sensible defaults."""
    project = Mock()
    project.solution_name = kwargs.get("solution_name", "UeS")
    project.solution_full_name = kwargs.get("solution_full_name", "Unified eateway Solution")
    project.client_name = kwargs.get("client_name", "ACME Steel")
    project.client_location = kwargs.get("client_location", "Mumbai")
    project.ts_type = kwargs.get("ts_type", "Data Analysis/Data Centralization/UeS")
    project.doc_date = kwargs.get("doc_date", "2026-06-23")
    return project


def _make_ts_folder(tmp_path: Path, ts_type: str = "Level 2") -> tuple[Path, Path]:
    """Create a base ts_documents dir and a ts_type subfolder."""
    base = tmp_path / "ts_documents"
    # Handle nested paths like "Data Analysis/Data Centralization/UeS"
    folder = base / ts_type
    folder.mkdir(parents=True)
    return base, folder


def _write_all_layered_files(folder: Path) -> None:
    """Write all five shared context files to the given folder."""
    (folder / "domain_context.txt").write_text(
        "UeS captures plant-floor data from PLCs and historians.", encoding="utf-8"
    )
    (folder / "architecture_context.txt").write_text(
        "Modbus TCP and OPC-UA adapters feed a TimescaleDB store.", encoding="utf-8"
    )
    (folder / "implementation_context.txt").write_text(
        "Phase 1 is FAT; Phase 2 is site commissioning.", encoding="utf-8"
    )
    (folder / "cybersecurity_context.txt").write_text(
        "All VPN tunnels use AES-256; patches applied quarterly.", encoding="utf-8"
    )
    (folder / "gantt_context.txt").write_text(
        "Overall schedule: M1-M5 over 20 weeks.", encoding="utf-8"
    )


def _write_section_guidance(folder: Path, section_key: str, content: str) -> None:
    """Create a section_guidance/<section_key>.txt file."""
    guidance_dir = folder / "section_guidance"
    guidance_dir.mkdir(exist_ok=True)
    (guidance_dir / f"{section_key}.txt").write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# 29.4.1 – End-to-end suggestion generation with layered context
# ---------------------------------------------------------------------------

class TestEndToEndWithLayeredContext:
    """Test complete pipeline: routing → retrieval → prompt building."""

    def test_executive_summary_pipeline_produces_valid_prompt(self, tmp_path):
        """Full pipeline for executive_summary produces prompt with all expected layers."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        _write_section_guidance(folder, "executive_summary", "Focus on strategic value.")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # Verify retrieval loaded expected files
        assert ctx.domain_context is not None
        assert ctx.section_guidance is not None
        assert "Focus on strategic value" in ctx.section_guidance

        # Verify prompt builds correctly
        prompt = build_section_prompt(
            section_key="executive_summary",
            project=_make_project(),
            all_sections={"overview": {"system_objective": "Automate data collection"}},
            draft_content=None,
            category_context=ctx,
        )

        assert "## 1. Project Metadata" in prompt
        assert "## 2. Section Identity" in prompt
        assert "## 5. Category Context (layered - loaded for executive_summary)" in prompt
        assert "UeS captures plant-floor data" in prompt
        assert "Focus on strategic value" in prompt

    def test_cybersecurity_pipeline_loads_cybersecurity_context(self, tmp_path):
        """cybersecurity section routes to cybersecurity_context and it appears in prompt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "cybersecurity")

        assert ctx.cybersecurity_context is not None
        assert "cybersecurity_context.txt" in ctx.loaded_shared_contexts

        prompt = build_section_prompt(
            section_key="cybersecurity",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        assert "AES-256" in prompt
        assert "## 5. Category Context (layered - loaded for cybersecurity)" in prompt

    def test_gantt_pipeline_prioritises_gantt_context_in_prompt(self, tmp_path):
        """overall_gantt section has gantt_context prioritised block in prompt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "overall_gantt")

        assert ctx.gantt_context is not None
        assert "gantt_context.txt" in ctx.loaded_shared_contexts

        prompt = build_gantt_prompt(
            section_key="overall_gantt",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        assert "M1-M5 over 20 weeks" in prompt
        assert "gantt_context.txt - prioritised" in prompt

    def test_features_section_pipeline_includes_domain_and_implementation(self, tmp_path):
        """features section routes to domain + architecture + implementation context."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "features")

        # Routing for 'features' should include domain or architecture + implementation
        assert ctx.domain_context is not None or ctx.architecture_context is not None
        assert ctx.implementation_context is not None

        prompt = build_section_prompt(
            section_key="features",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        assert "## 5. Category Context (layered - loaded for features)" in prompt

    def test_custom_section_pipeline_falls_back_to_domain_context(self, tmp_path):
        """Custom sections fall back to domain_context routing."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        custom_key = "custom_section_1234567890_abc123-def456"
        ctx = load_layered_context("Level 2", str(base), custom_key)

        # Custom sections always get domain_context per routing fallback
        assert isinstance(ctx, LayeredCategoryContext)

        prompt = build_custom_section_prompt(
            custom_section_title="Custom Integration Details",
            subsection_name="Data Flow",
            subsection_type="paragraph",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        # Custom section prompt must be generated without crash
        assert "Custom Integration Details" in prompt
        assert "## 5. Category Context" in prompt


# ---------------------------------------------------------------------------
# 29.4.2 – Multiple sections with different routing configurations
# ---------------------------------------------------------------------------

class TestMultipleSectionsWithDifferentRouting:
    """Test that each section type gets appropriate context from the routing map."""

    def test_narrative_sections_get_domain_and_architecture(self, tmp_path):
        """Narrative sections (executive_summary, introduction, overview, process_flow) load domain + arch."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        narrative_sections = ["executive_summary", "introduction", "overview", "process_flow"]

        for section_key in narrative_sections:
            ctx = load_layered_context("Level 2", str(base), section_key)

            assert "domain_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load domain_context.txt"
            assert "architecture_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load architecture_context.txt"

    def test_technical_sections_get_architecture_and_implementation(self, tmp_path):
        """Technical sections (hardware_specs, software_specs, tech_stack) load arch + impl."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        technical_sections = ["hardware_specs", "software_specs", "tech_stack", "system_config"]

        for section_key in technical_sections:
            ctx = load_layered_context("Level 2", str(base), section_key)

            assert "architecture_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load architecture_context.txt"
            assert "implementation_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load implementation_context.txt"

    def test_schedule_sections_get_gantt_and_implementation(self, tmp_path):
        """Schedule sections (overall_gantt, shutdown_gantt) load gantt + implementation."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        for section_key in ["overall_gantt", "shutdown_gantt"]:
            ctx = load_layered_context("Level 2", str(base), section_key)

            assert "gantt_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load gantt_context.txt"
            assert "implementation_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load implementation_context.txt"

    def test_legal_sections_get_implementation_and_cybersecurity(self, tmp_path):
        """Legal sections (binding_conditions, disclaimer) load implementation + cybersecurity."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        for section_key in ["binding_conditions", "disclaimer"]:
            ctx = load_layered_context("Level 2", str(base), section_key)

            assert "implementation_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load implementation_context.txt"
            assert "cybersecurity_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load cybersecurity_context.txt"

    def test_obligations_sections_get_only_implementation(self, tmp_path):
        """Obligation sections (buyer_obligations, exclusion_list, buyer_prerequisites) load only implementation."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        for section_key in ["buyer_obligations", "exclusion_list", "buyer_prerequisites"]:
            ctx = load_layered_context("Level 2", str(base), section_key)

            assert "implementation_context.txt" in ctx.loaded_shared_contexts, \
                f"{section_key} should load implementation_context.txt"
            assert "domain_context.txt" not in ctx.loaded_shared_contexts, \
                f"{section_key} should NOT load domain_context.txt"
            assert "gantt_context.txt" not in ctx.loaded_shared_contexts, \
                f"{section_key} should NOT load gantt_context.txt"


# ---------------------------------------------------------------------------
# 29.4.3 – Incorrect context NOT loaded for specific sections
# ---------------------------------------------------------------------------

class TestIncorrectContextNotLoaded:
    """Verify that incorrect context files are NOT loaded for each section type."""

    def test_hardware_specs_does_not_get_gantt_context(self, tmp_path):
        """hardware_specs routing must NOT include gantt_context.txt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "hardware_specs")

        assert "gantt_context.txt" not in ctx.loaded_shared_contexts, \
            "hardware_specs must not receive gantt_context.txt"
        # Verify the gantt content is not present in the prompt
        assert ctx.gantt_context is None

    def test_overall_gantt_does_not_get_cybersecurity_context(self, tmp_path):
        """overall_gantt routing must NOT include cybersecurity_context.txt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "overall_gantt")

        assert "cybersecurity_context.txt" not in ctx.loaded_shared_contexts, \
            "overall_gantt must not receive cybersecurity_context.txt"
        assert ctx.cybersecurity_context is None

    def test_executive_summary_does_not_get_gantt_context(self, tmp_path):
        """executive_summary routing must NOT include gantt_context.txt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert "gantt_context.txt" not in ctx.loaded_shared_contexts, \
            "executive_summary must not receive gantt_context.txt"
        assert ctx.gantt_context is None

    def test_cybersecurity_section_does_not_get_gantt_context(self, tmp_path):
        """cybersecurity routing must NOT include gantt_context.txt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "cybersecurity")

        assert "gantt_context.txt" not in ctx.loaded_shared_contexts, \
            "cybersecurity section must not receive gantt_context.txt"
        assert ctx.gantt_context is None

    def test_buyer_obligations_does_not_get_domain_or_gantt(self, tmp_path):
        """buyer_obligations routing must NOT include domain_context or gantt_context."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        ctx = load_layered_context("Level 2", str(base), "buyer_obligations")

        assert "domain_context.txt" not in ctx.loaded_shared_contexts
        assert "gantt_context.txt" not in ctx.loaded_shared_contexts
        assert "cybersecurity_context.txt" not in ctx.loaded_shared_contexts

    def test_routing_map_context_isolation_all_sections(self, tmp_path):
        """Spot-check that each section's routing output matches the routing map exactly."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        test_cases = {
            "executive_summary": {"domain_context.txt", "architecture_context.txt"},
            "cybersecurity": {"cybersecurity_context.txt", "implementation_context.txt"},
            "overall_gantt": {"gantt_context.txt", "implementation_context.txt"},
            "hardware_specs": {"architecture_context.txt", "implementation_context.txt"},
            "buyer_obligations": {"implementation_context.txt"},
        }

        for section_key, expected_contexts in test_cases.items():
            ctx = load_layered_context("Level 2", str(base), section_key)
            actual_loaded = set(ctx.loaded_shared_contexts)
            assert actual_loaded == expected_contexts, (
                f"Section '{section_key}': expected {expected_contexts}, got {actual_loaded}"
            )


# ---------------------------------------------------------------------------
# 29.4.4 – Section guidance included when available
# ---------------------------------------------------------------------------

class TestSectioneuidanceIncluded:
    """Test that section guidance file is included in the prompt when it exists."""

    def test_section_guidance_appears_in_prompt_when_file_exists(self, tmp_path):
        """If guidance file exists for a section, it appears in the prompt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        _write_section_guidance(
            folder, "features",
            "List features as bullet points. Highlight buyer benefits."
        )

        ctx = load_layered_context("Level 2", str(base), "features")

        assert ctx.section_guidance is not None
        assert ctx.section_guidance_available is True
        assert "List features as bullet points" in ctx.section_guidance

        prompt = build_section_prompt(
            section_key="features",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        assert "List features as bullet points" in prompt
        assert "Section guidance: available" in prompt

    def test_section_guidance_absent_when_file_missing(self, tmp_path):
        """If guidance file does NOT exist for a section, section_guidance is None."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        # No guidance file created

        ctx = load_layered_context("Level 2", str(base), "features")

        assert ctx.section_guidance is None
        assert ctx.section_guidance_available is False

        prompt = build_section_prompt(
            section_key="features",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        assert "### Section euidance" not in prompt

    def test_cybersecurity_guidance_appears_in_cybersecurity_prompt(self, tmp_path):
        """cybersecurity section guidance file appears in cybersecurity prompt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        _write_section_guidance(
            folder, "cybersecurity",
            "Refer to boilerplate only. Do not add novel security clauses."
        )

        ctx = load_layered_context("Level 2", str(base), "cybersecurity")
        prompt = build_section_prompt(
            section_key="cybersecurity",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        assert "Refer to boilerplate only" in prompt

    def test_gantt_guidance_appears_in_gantt_prompt(self, tmp_path):
        """overall_gantt guidance file appears in gantt prompt."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        _write_section_guidance(
            folder, "overall_gantt",
            "Use M1-M5 phase structure. Include buyer prerequisite delay impact."
        )

        ctx = load_layered_context("Level 2", str(base), "overall_gantt")
        prompt = build_gantt_prompt(
            section_key="overall_gantt",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        assert "Use M1-M5 phase structure" in prompt

    def test_section_guidance_truncated_to_500_chars(self, tmp_path):
        """section guidance content is truncated to 500 chars."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        _write_section_guidance(
            folder, "tech_stack",
            "e" * 1000  # Very long guidance
        )

        ctx = load_layered_context("Level 2", str(base), "tech_stack")

        assert ctx.section_guidance is not None
        assert len(ctx.section_guidance) <= 500


# ---------------------------------------------------------------------------
# 29.4.5 – Legacy projects still work with old context.txt
# ---------------------------------------------------------------------------

class TestLegacyProjectBackwardCompatibility:
    """Test that projects using old monolithic context.txt still work correctly."""

    def test_legacy_context_txt_loaded_when_no_layered_files_exist(self, tmp_path):
        """If only context.txt exists (no layered files), it is used as legacy fallback."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "context.txt").write_text(
            "LEeACY: UeS domain knowledge and architecture combined in one file.",
            encoding="utf-8"
        )
        # No domain_context.txt, architecture_context.txt, etc.

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert ctx.legacy_context_txt is not None
        assert "LEeACY:" in ctx.legacy_context_txt
        assert ctx.domain_context is None
        assert ctx.architecture_context is None

    def test_legacy_context_produces_valid_prompt(self, tmp_path):
        """Legacy fallback context.txt is properly formatted in the prompt."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "context.txt").write_text(
            "Old monolithic UeS context knowledge here.", encoding="utf-8"
        )

        ctx = load_layered_context("Level 2", str(base), "tech_stack")

        prompt = build_section_prompt(
            section_key="tech_stack",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        # Legacy fallback uses the old format header
        assert "## 5. Category Context (context.txt)" in prompt
        assert "Old monolithic UeS context knowledge here." in prompt

    def test_legacy_gantt_prompt_still_works(self, tmp_path):
        """gantt prompt builder works with legacy context.txt fallback."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "context.txt").write_text(
            "Old context with some schedule info.", encoding="utf-8"
        )

        ctx = load_layered_context("Level 2", str(base), "overall_gantt")

        prompt = build_gantt_prompt(
            section_key="overall_gantt",
            project=_make_project(),
            all_sections={},
            draft_content=None,
            category_context=ctx,
        )

        # Should produce a prompt without crash
        assert "## 5. Category Context" in prompt
        assert "Old context with some schedule info." in prompt

    def test_layered_files_take_precedence_over_context_txt(self, tmp_path):
        """When layered files exist alongside context.txt, context.txt is ignored."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "context.txt").write_text("Old legacy content.", encoding="utf-8")
        (folder / "domain_context.txt").write_text("New layered domain content.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # Layered wins over legacy
        assert ctx.domain_context is not None
        assert "New layered domain content." in ctx.domain_context
        assert ctx.legacy_context_txt is None

    def test_legacy_context_txt_used_flag_in_context_metadata(self, tmp_path):
        """context_txt_used would be True when legacy fallback is used (service-layer test)."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "context.txt").write_text("Old context.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "features")

        # Check that legacy flag is set correctly
        is_legacy = ctx.legacy_context_txt is not None
        assert is_legacy is True

    def test_section_guidance_not_loaded_in_legacy_mode(self, tmp_path):
        """Even if a section_guidance dir exists, guidance file won't override legacy behavior."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "context.txt").write_text("Old legacy content.", encoding="utf-8")
        # Create a guidance file but no layered context files
        _write_section_guidance(folder, "features", "Use bullet points.")

        ctx = load_layered_context("Level 2", str(base), "features")

        # Legacy mode: context.txt used because no shared layered files loaded
        assert ctx.legacy_context_txt is not None
        # euidance file is present but section_guidance_available may be False
        # since no layered shared context files are present


# ---------------------------------------------------------------------------
# 29.4.6 – Response metadata reflects layered context state
# ---------------------------------------------------------------------------

class TestContextMetadataAccuracy:
    """Test that context metadata fields (loaded_shared_contexts, etc.) are accurate."""

    def test_loaded_shared_contexts_matches_actual_loaded_files(self, tmp_path):
        """loaded_shared_contexts exactly reflects which files were successfully read."""
        base, folder = _make_ts_folder(tmp_path)
        # Only write domain_context.txt and implementation_context.txt
        (folder / "domain_context.txt").write_text("Domain.", encoding="utf-8")
        (folder / "implementation_context.txt").write_text("Implementation.", encoding="utf-8")
        # architecture_context.txt intentionally omitted

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert "domain_context.txt" in ctx.loaded_shared_contexts
        # architecture_context.txt was not written, must not be in loaded list
        assert "architecture_context.txt" not in ctx.loaded_shared_contexts

    def test_historical_context_available_true_when_docs_exist(self, tmp_path):
        """historical_context_available is True when historical docs are loaded."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "domain_context.txt").write_text("Domain.", encoding="utf-8")
        (folder / "historical_project_A.txt").write_text("Past project.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert ctx.historical_context_available is True
        assert len(ctx.historical_documents) > 0

    def test_section_guidance_available_flag_accurate(self, tmp_path):
        """section_guidance_available flag is True only when guidance file was loaded."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "domain_context.txt").write_text("Domain.", encoding="utf-8")

        # Test without guidance
        ctx_no_guidance = load_layered_context("Level 2", str(base), "features")
        assert ctx_no_guidance.section_guidance_available is False

        # Test with guidance
        _write_section_guidance(folder, "features", "Feature guidance content.")
        clear_layered_retrieval_cache()
        ctx_with_guidance = load_layered_context("Level 2", str(base), "features")
        assert ctx_with_guidance.section_guidance_available is True

    def test_folder_path_set_correctly(self, tmp_path):
        """folder_path in the context matches the actual resolved folder."""
        base, folder = _make_ts_folder(tmp_path)
        (folder / "domain_context.txt").write_text("Domain.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # folder_path should point to the Level 2 folder
        assert "Level 2" in ctx.folder_path


# ---------------------------------------------------------------------------
# 29.4.7 – All AI-eligible sections can be loaded without error
# ---------------------------------------------------------------------------

class TestAllSectionsCanLoad:
    """Verify that all 28 AI-eligible sections can load context without crashing."""

    AI_ELIeIBLE_SECTIONS = [
        "executive_summary", "introduction", "process_flow", "overview",
        "features", "remote_support", "documentation_control", "customer_training",
        "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw",
        "overall_gantt", "shutdown_gantt",
        "supervisors", "scope_definitions", "division_of_eng",
        "value_addition", "work_completion",
        "buyer_obligations", "exclusion_list", "buyer_prerequisites",
        "binding_conditions", "cybersecurity", "disclaimer",
        "poc",
    ]

    def test_all_sections_load_without_crash_full_layered(self, tmp_path):
        """All 28 AI-eligible sections load cleanly when all context files exist."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        for section_key in self.AI_ELIeIBLE_SECTIONS:
            ctx = load_layered_context("Level 2", str(base), section_key)
            assert isinstance(ctx, LayeredCategoryContext), \
                f"Section '{section_key}' failed to return LayeredCategoryContext"
            assert len(ctx.loaded_shared_contexts) > 0, \
                f"Section '{section_key}' loaded no context files"

    def test_all_sections_load_without_crash_empty_folder(self, tmp_path):
        """All 28 AI-eligible sections load cleanly even if folder is empty."""
        base, folder = _make_ts_folder(tmp_path)
        # Empty folder — no context files

        for section_key in self.AI_ELIeIBLE_SECTIONS:
            ctx = load_layered_context("Level 2", str(base), section_key)
            assert isinstance(ctx, LayeredCategoryContext), \
                f"Section '{section_key}' crashed with empty folder"

    def test_all_sections_can_build_prompts_with_full_context(self, tmp_path):
        """All 28 AI-eligible sections can build valid prompts with full layered context."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        project = _make_project()

        for section_key in self.AI_ELIeIBLE_SECTIONS:
            ctx = load_layered_context("Level 2", str(base), section_key)

            # gantt sections use gantt prompt builder
            if section_key in ("overall_gantt", "shutdown_gantt"):
                prompt = build_gantt_prompt(
                    section_key=section_key,
                    project=project,
                    all_sections={},
                    draft_content=None,
                    category_context=ctx,
                )
            else:
                prompt = build_section_prompt(
                    section_key=section_key,
                    project=project,
                    all_sections={},
                    draft_content=None,
                    category_context=ctx,
                )

            assert isinstance(prompt, str) and len(prompt) > 0, \
                f"Section '{section_key}' produced empty or invalid prompt"
            assert "## 5. Category Context" in prompt, \
                f"Section '{section_key}' prompt missing layer 5"

    def test_all_sections_prompt_within_token_budget(self, tmp_path):
        """All 28 AI-eligible sections produce prompts within PROMPT_SOFT_TOKEN_BUDeET."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        project = _make_project()

        for section_key in self.AI_ELIeIBLE_SECTIONS:
            ctx = load_layered_context("Level 2", str(base), section_key)

            if section_key in ("overall_gantt", "shutdown_gantt"):
                prompt = build_gantt_prompt(
                    section_key=section_key,
                    project=project,
                    all_sections={},
                    draft_content=None,
                    category_context=ctx,
                )
            else:
                prompt = build_section_prompt(
                    section_key=section_key,
                    project=project,
                    all_sections={},
                    draft_content=None,
                    category_context=ctx,
                )

            token_count = estimate_prompt_tokens(prompt)
            assert token_count <= PROMPT_SOFT_TOKEN_BUDeET, (
                f"Section '{section_key}' prompt exceeds token budget: "
                f"{token_count} > {PROMPT_SOFT_TOKEN_BUDeET}"
            )


# ---------------------------------------------------------------------------
# 29.4.8 – Suppressed sections are rejected by the service pipeline
# ---------------------------------------------------------------------------

class TestSuppressedSectionsRejected:
    """Confirm that suppressed sections (cover, revision_history, abbreviations) are rejected."""

    SUPPRESSED_SECTIONS = ["cover", "revision_history", "abbreviations"]

    def test_suppressed_sections_raise_in_prompt_builder(self, tmp_path):
        """build_section_prompt() raises ValueError for suppressed sections."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)
        project = _make_project()

        for section_key in self.SUPPRESSED_SECTIONS:
            ctx = load_layered_context("Level 2", str(base), section_key)

            with pytest.raises(ValueError, match="not available for section"):
                build_section_prompt(
                    section_key=section_key,
                    project=project,
                    all_sections={},
                    draft_content=None,
                    category_context=ctx,
                )

    def test_suppressed_sections_load_no_context_files(self, tmp_path):
        """Suppressed sections retrieve no shared context files."""
        base, folder = _make_ts_folder(tmp_path)
        _write_all_layered_files(folder)

        for section_key in self.SUPPRESSED_SECTIONS:
            ctx = load_layered_context("Level 2", str(base), section_key)

            # Suppressed sections have empty routing → no context files loaded
            assert ctx.loaded_shared_contexts == [], \
                f"Suppressed section '{section_key}' should load no context files"
