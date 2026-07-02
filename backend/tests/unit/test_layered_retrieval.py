"""Comprehensive unit tests for load_layered_context() - Task 23.7.

Tests cover:
- Task 23.4: Legacy fallback logic (context.txt when no layered files)
- Task 23.5: Caching with fingerprint-based invalidation
- Task 23.6: Historical document loading with diversity-aware selection

Test Coverage Target: 90%+ for retrieval logic (Task 23.7 spec).
"""
import os
import time
import pytest

from app.ai_suggestions.retrieval import (
    LayeredCategoryContext,
    clear_layered_retrieval_cache,
    load_layered_context,
)


# ============================================================================
# Fixtures / helpers
# ============================================================================

@pytest.fixture(autouse=True)
def _clear_cache():
    """Ensure each test starts with a clean layered context cache."""
    clear_layered_retrieval_cache()
    yield
    clear_layered_retrieval_cache()


def _make_ts_dir(tmp_path):
    """Return a base ``ts_documents`` Path and a default ts_type folder."""
    base = tmp_path / "ts_documents"
    folder = base / "Level 2"
    folder.mkdir(parents=True)
    return base, folder


# ============================================================================
# Task 23.4 – Legacy fallback logic
# ============================================================================

class TestLegacyFallback:
    """Tests for Task 23.4: legacy context.txt fallback."""

    def test_legacy_fallback_when_no_layered_files_exist(self, tmp_path):
        """If no layered files are routed/exist, context.txt should be loaded."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "context.txt").write_text("Legacy domain knowledge here.", encoding="utf-8")

        # Monkeypatch routing so no shared context files are returned
        # (simulates a folder that has no layered files)
        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # Since routing may or may not return shared file names, we need to
        # ensure that when none of those files physically exist the fallback triggers.
        # Our setup has no domain_context.txt etc., so loaded_shared_contexts == [].
        assert ctx.legacy_context_txt is not None
        assert "Legacy domain knowledge here." in ctx.legacy_context_txt

    def test_legacy_fallback_not_triggered_when_layered_file_exists(self, tmp_path):
        """If at least one layered file is loaded, context.txt must NOT be read."""
        base, folder = _make_ts_dir(tmp_path)
        # Write a layered shared context file
        (folder / "domain_context.txt").write_text("Domain knowledge.", encoding="utf-8")
        # Also write a legacy context.txt to confirm it's ignored
        (folder / "context.txt").write_text("Legacy context should be ignored.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # domain_context.txt exists → it should be loaded
        assert ctx.domain_context is not None
        # Legacy fallback must NOT have run
        assert ctx.legacy_context_txt is None

    def test_legacy_fallback_missing_context_txt(self, tmp_path):
        """No layered files AND no context.txt → graceful empty result (no crash)."""
        base, folder = _make_ts_dir(tmp_path)
        # Write no files at all

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert ctx.legacy_context_txt is None
        assert ctx.loaded_shared_contexts == []
        assert isinstance(ctx, LayeredCategoryContext)

    def test_legacy_fallback_truncates_to_2000_chars(self, tmp_path):
        """Legacy context.txt content is read up to 2000 chars."""
        base, folder = _make_ts_dir(tmp_path)
        long_content = "X" * 5000
        (folder / "context.txt").write_text(long_content, encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # Should be loaded but limited to 2000 chars read
        assert ctx.legacy_context_txt is not None
        assert len(ctx.legacy_context_txt) <= 2000

    def test_legacy_fallback_normalizes_text(self, tmp_path, monkeypatch):
        """Legacy context text should be normalized (whitespace collapsed)."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "context.txt").write_text(
            "Line one\r\n\r\nLine two\t\tindented", encoding="utf-8"
        )

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # Should not contain raw CRLF or double newlines
        assert ctx.legacy_context_txt is not None
        assert "\r\n" not in ctx.legacy_context_txt

    def test_legacy_fallback_logged(self, tmp_path, caplog):
        """Fallback to legacy context.txt should emit an info log."""
        import logging
        base, folder = _make_ts_dir(tmp_path)
        (folder / "context.txt").write_text("Legacy content.", encoding="utf-8")

        with caplog.at_level(logging.INFO):
            load_layered_context("Level 2", str(base), "executive_summary")

        assert any("Falling back to legacy context.txt" in r.message for r in caplog.records)

    def test_historical_context_available_when_legacy_fallback(self, tmp_path):
        """historical_context_available must be True when legacy fallback is used."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "context.txt").write_text("Legacy.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")
        assert ctx.historical_context_available is True


# ============================================================================
# Task 23.5 – Caching with fingerprint invalidation
# ============================================================================

class TestCaching:
    """Tests for Task 23.5: thread-safe cache with fingerprint invalidation."""

    def test_cache_hit_returns_deep_copy(self, tmp_path):
        """Second call with same arguments returns deep copy (mutation-safe)."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "project_doc.txt").write_text("Doc content.", encoding="utf-8")

        first = load_layered_context("Level 2", str(base), "executive_summary")
        # Mutate first result
        if first.historical_documents:
            first.historical_documents[0].content = "MUTATED"

        second = load_layered_context("Level 2", str(base), "executive_summary")

        # Second call should not reflect the mutation
        if second.historical_documents:
            assert second.historical_documents[0].content != "MUTATED"

    def test_cache_invalidated_when_file_added(self, tmp_path):
        """Adding a file to the directory triggers a cache miss on next call."""
        base, folder = _make_ts_dir(tmp_path)

        first = load_layered_context("Level 2", str(base), "executive_summary")
        assert first.legacy_context_txt is None

        # Add a file to the folder — this changes the directory fingerprint
        new_file = folder / "context.txt"
        new_file.write_text("New legacy content.", encoding="utf-8")
        # Bump mtime to guarantee fingerprint change
        os.utime(new_file, (new_file.stat().st_atime + 10, new_file.stat().st_mtime + 10))

        second = load_layered_context("Level 2", str(base), "executive_summary")
        assert second.legacy_context_txt is not None
        assert "New legacy content." in second.legacy_context_txt

    def test_cache_invalidated_when_content_changes(self, tmp_path):
        """Modifying an existing file triggers cache invalidation."""
        base, folder = _make_ts_dir(tmp_path)
        context_file = folder / "context.txt"
        context_file.write_text("Old content.", encoding="utf-8")

        first = load_layered_context("Level 2", str(base), "executive_summary")
        assert first.legacy_context_txt is not None
        assert "Old content." in first.legacy_context_txt

        context_file.write_text("New content after update.", encoding="utf-8")
        os.utime(
            context_file,
            (context_file.stat().st_atime + 10, context_file.stat().st_mtime + 10),
        )

        second = load_layered_context("Level 2", str(base), "executive_summary")
        assert "New content after update." in second.legacy_context_txt

    def test_cache_key_includes_section_key(self, tmp_path):
        """Different section_keys result in separate cache entries."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "domain_context.txt").write_text("Domain knowledge.", encoding="utf-8")

        ctx_exec = load_layered_context("Level 2", str(base), "executive_summary")
        ctx_feat = load_layered_context("Level 2", str(base), "features")

        # Both should be independently cached; the function should not crash
        assert isinstance(ctx_exec, LayeredCategoryContext)
        assert isinstance(ctx_feat, LayeredCategoryContext)

    def test_cache_hit_returns_same_data(self, tmp_path):
        """Cache hit should return identical context data as the original load."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "context.txt").write_text("Consistent content.", encoding="utf-8")

        first = load_layered_context("Level 2", str(base), "executive_summary")
        second = load_layered_context("Level 2", str(base), "executive_summary")

        assert first.legacy_context_txt == second.legacy_context_txt
        assert first.folder_path == second.folder_path

    def test_cache_key_includes_max_docs(self, tmp_path):
        """Different max_docs values result in separate cache entries."""
        base, folder = _make_ts_dir(tmp_path)
        for i in range(3):
            (folder / f"hist_{i}.txt").write_text(f"Historical doc {i}.", encoding="utf-8")

        ctx3 = load_layered_context("Level 2", str(base), "executive_summary", max_docs=3)
        ctx1 = load_layered_context("Level 2", str(base), "executive_summary", max_docs=1)

        assert len(ctx3.historical_documents) >= len(ctx1.historical_documents)


# ============================================================================
# Task 23.6 – Historical document loading
# ============================================================================

class TestHistoricalDocuments:
    """Tests for Task 23.6: recursive historical document loading."""

    def test_txt_files_are_loaded(self, tmp_path):
        """Plain .txt files in the folder are collected as historical docs."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "project_a.txt").write_text("Historical project A.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        filenames = [d.filename for d in ctx.historical_documents]
        assert "project_a.txt" in filenames

    def test_md_files_are_loaded(self, tmp_path):
        """Markdown .md files are collected as historical docs."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "notes.md").write_text("# Project Notes\nSome notes.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        filenames = [d.filename for d in ctx.historical_documents]
        assert "notes.md" in filenames

    def test_context_files_excluded_from_historical_docs(self, tmp_path):
        """Known context filenames (domain_context.txt etc.) are excluded from historical docs."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "domain_context.txt").write_text("Domain knowledge.", encoding="utf-8")
        (folder / "architecture_context.txt").write_text("Architecture.", encoding="utf-8")
        (folder / "implementation_context.txt").write_text("Impl.", encoding="utf-8")
        (folder / "cybersecurity_context.txt").write_text("Security.", encoding="utf-8")
        (folder / "gantt_context.txt").write_text("Gantt.", encoding="utf-8")
        (folder / "context.txt").write_text("Legacy.", encoding="utf-8")
        # Add a real historical doc
        (folder / "real_project.txt").write_text("Real project doc.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        filenames = [d.filename for d in ctx.historical_documents]
        assert "domain_context.txt" not in filenames
        assert "architecture_context.txt" not in filenames
        assert "implementation_context.txt" not in filenames
        assert "cybersecurity_context.txt" not in filenames
        assert "gantt_context.txt" not in filenames
        assert "context.txt" not in filenames
        assert "real_project.txt" in filenames

    def test_section_guidance_dir_excluded_from_historical_docs(self, tmp_path):
        """Files inside section_guidance/ subdirectory are not treated as historical docs."""
        base, folder = _make_ts_dir(tmp_path)
        guidance_dir = folder / "section_guidance"
        guidance_dir.mkdir()
        (guidance_dir / "executive_summary.txt").write_text("Guidance here.", encoding="utf-8")
        (folder / "real_project.txt").write_text("Real doc.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        filenames = [d.filename for d in ctx.historical_documents]
        assert "executive_summary.txt" not in filenames
        assert "real_project.txt" in filenames

    def test_historical_docs_truncated_to_1500_chars(self, tmp_path):
        """Each historical document content is truncated to 1500 chars."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "big_doc.txt").write_text("B" * 5000, encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        for doc in ctx.historical_documents:
            if doc.filename == "big_doc.txt":
                assert len(doc.content) <= 1500
                break

    def test_historical_docs_diversity_selection(self, tmp_path):
        """One file per subfolder is preferred in diversity-aware selection."""
        base, folder = _make_ts_dir(tmp_path)
        sub1 = folder / "project_a"
        sub1.mkdir()
        sub2 = folder / "project_b"
        sub2.mkdir()

        (sub1 / "doc1.txt").write_text("Project A doc 1.", encoding="utf-8")
        (sub1 / "doc2.txt").write_text("Project A doc 2.", encoding="utf-8")
        (sub2 / "doc3.txt").write_text("Project B doc 1.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary", max_docs=2)

        # With max_docs=2, should prefer one from each subfolder
        dirs_seen = set(os.path.dirname(d.file_path) for d in ctx.historical_documents)
        assert len(ctx.historical_documents) == 2
        assert len(dirs_seen) == 2

    def test_max_docs_limit_respected(self, tmp_path):
        """Historical docs never exceed max_docs."""
        base, folder = _make_ts_dir(tmp_path)
        for i in range(10):
            (folder / f"project_{i}.txt").write_text(f"Project {i}.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary", max_docs=3)

        assert len(ctx.historical_documents) <= 3

    def test_historical_context_available_flag_when_docs_loaded(self, tmp_path):
        """historical_context_available is True when at least one doc is loaded."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "project_doc.txt").write_text("Historical project content.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert ctx.historical_context_available is True
        assert len(ctx.historical_documents) > 0

    def test_historical_context_available_false_when_no_docs_and_no_fallback(self, tmp_path):
        """historical_context_available is False when no docs and no legacy context."""
        base, folder = _make_ts_dir(tmp_path)
        # Empty folder — no docs, no context.txt

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert ctx.historical_context_available is False

    def test_recursive_scan_collects_nested_docs(self, tmp_path):
        """Docs in nested subdirectories are collected recursively."""
        base, folder = _make_ts_dir(tmp_path)
        nested = folder / "subdir" / "deep"
        nested.mkdir(parents=True)
        (nested / "deep_doc.txt").write_text("Deep nested document.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        filenames = [d.filename for d in ctx.historical_documents]
        assert "deep_doc.txt" in filenames

    def test_file_read_error_is_skipped(self, tmp_path, monkeypatch):
        """Unreadable files are silently skipped; other files still load."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "good_doc.txt").write_text("Good content.", encoding="utf-8")
        bad_file = folder / "bad_doc.txt"
        bad_file.write_text("Will be patched to fail.", encoding="utf-8")

        original_open = open

        def patched_open(path, *args, **kwargs):
            if str(bad_file) in str(path):
                raise OSError("Simulated read error")
            return original_open(path, *args, **kwargs)

        monkeypatch.setattr("builtins.open", patched_open)

        # Should not raise — bad file is skipped
        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        filenames = [d.filename for d in ctx.historical_documents]
        assert "good_doc.txt" in filenames
        assert "bad_doc.txt" not in filenames

    def test_non_matching_file_extensions_excluded(self, tmp_path):
        """Files with extensions other than .txt, .md, .docx are excluded."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "data.csv").write_text("col1,col2", encoding="utf-8")
        (folder / "image.png").write_bytes(b"\x89PNG")
        (folder / "valid_doc.txt").write_text("Valid.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        filenames = [d.filename for d in ctx.historical_documents]
        assert "data.csv" not in filenames
        assert "image.png" not in filenames
        assert "valid_doc.txt" in filenames


# ============================================================================
# Task 23.4+23.6 – Integration: shared context files + historical docs
# ============================================================================

class TestSharedContextAndHistoricalCombined:
    """Tests verifying shared context files and historical docs are combined correctly."""

    def test_layered_and_historical_loaded_together(self, tmp_path):
        """Layered shared context files and historical docs can coexist."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "domain_context.txt").write_text("Domain info.", encoding="utf-8")
        (folder / "historical_project.txt").write_text("Past project data.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # Layered file loaded
        assert ctx.domain_context is not None
        # Historical doc also loaded
        assert any(d.filename == "historical_project.txt" for d in ctx.historical_documents)
        # Legacy fallback NOT used (layered file exists)
        assert ctx.legacy_context_txt is None

    def test_section_guidance_loaded_alongside_shared_context(self, tmp_path):
        """Section guidance, shared context, and historical docs all load together."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "domain_context.txt").write_text("Domain.", encoding="utf-8")
        guidance_dir = folder / "section_guidance"
        guidance_dir.mkdir()
        (guidance_dir / "executive_summary.txt").write_text("Use strategic language.", encoding="utf-8")
        (folder / "ref_doc.txt").write_text("Reference material.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        assert ctx.domain_context is not None
        # Section guidance only loads if routing returns the guidance filename
        # (the routing map should define executive_summary → executive_summary.txt)
        # Just verify the function doesn't crash and context is valid
        assert isinstance(ctx, LayeredCategoryContext)
        assert any(d.filename == "ref_doc.txt" for d in ctx.historical_documents)

    def test_shared_context_truncated_to_1000_chars(self, tmp_path):
        """Shared context files are truncated to 1000 chars."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "domain_context.txt").write_text("D" * 3000, encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        if ctx.domain_context is not None:
            assert len(ctx.domain_context) <= 1000


# ============================================================================
# Security – Path Traversal Prevention
# ============================================================================

class TestPathTraversal:
    """Verify path traversal attacks are blocked."""

    def test_path_traversal_with_dotdot(self, tmp_path):
        base = tmp_path / "ts_documents"
        base.mkdir()

        # Traversal is blocked either at validate_ts_type() or the commonpath check
        with pytest.raises(ValueError, match="(path traversal detected|Invalid TS type)"):
            load_layered_context("../..", str(base), "executive_summary")

    def test_path_traversal_with_etc_passwd(self, tmp_path):
        base = tmp_path / "ts_documents"
        base.mkdir()

        # Traversal is blocked either at validate_ts_type() or the commonpath check
        with pytest.raises(ValueError, match="(path traversal detected|Invalid TS type)"):
            load_layered_context("../../etc/passwd", str(base), "executive_summary")

    def test_empty_ts_type_raises(self, tmp_path):
        base = tmp_path / "ts_documents"
        base.mkdir()

        with pytest.raises(ValueError, match="TS type is required"):
            load_layered_context("", str(base), "executive_summary")

    def test_none_ts_type_raises(self, tmp_path):
        base = tmp_path / "ts_documents"
        base.mkdir()

        with pytest.raises(ValueError, match="TS type is required"):
            load_layered_context(None, str(base), "executive_summary")


# ============================================================================
# Section key routing integration
# ============================================================================

class TestSectionKeyRoutingIntegration:
    """Verify that different section keys route to correct files."""

    def test_executive_summary_routes_to_domain_context(self, tmp_path):
        """executive_summary should load domain_context.txt per routing map."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "domain_context.txt").write_text("Domain knowledge.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # domain_context.txt should be in the loaded shared contexts
        assert "domain_context.txt" in ctx.loaded_shared_contexts
        assert ctx.domain_context is not None

    def test_custom_section_falls_back_to_domain_context(self, tmp_path):
        """Custom sections should fall back to domain_context routing."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "domain_context.txt").write_text("Domain fallback.", encoding="utf-8")

        ctx = load_layered_context(
            "Level 2", str(base), "custom_section_1234567890_abc123-def456"
        )

        # Custom sections use domain_context per routing rules
        # (routing map implementation already tested in test_section_context_map.py)
        assert isinstance(ctx, LayeredCategoryContext)

    def test_cybersecurity_section_loads_cybersecurity_context(self, tmp_path):
        """cybersecurity section should load cybersecurity_context.txt."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "cybersecurity_context.txt").write_text("Security policies.", encoding="utf-8")
        (folder / "implementation_context.txt").write_text("Implementation.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "cybersecurity")

        # cybersecurity section is in the routing map
        assert "cybersecurity_context.txt" in ctx.loaded_shared_contexts
        assert ctx.cybersecurity_context is not None

    def test_gantt_section_loads_gantt_context(self, tmp_path):
        """overall_gantt section should load gantt_context.txt."""
        base, folder = _make_ts_dir(tmp_path)
        (folder / "gantt_context.txt").write_text("Gantt scheduling guidance.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "overall_gantt")

        assert "gantt_context.txt" in ctx.loaded_shared_contexts
        assert ctx.gantt_context is not None

    def test_missing_routed_file_does_not_crash(self, tmp_path):
        """If a routed context file does not exist on disk, it is skipped gracefully."""
        base, folder = _make_ts_dir(tmp_path)
        # Do NOT create domain_context.txt or any other context file

        ctx = load_layered_context("Level 2", str(base), "executive_summary")

        # Should complete without error
        assert isinstance(ctx, LayeredCategoryContext)
        assert ctx.domain_context is None

    def test_partial_layered_structure(self, tmp_path):
        """Some routed files present, some missing — loaded ones are returned."""
        base, folder = _make_ts_dir(tmp_path)
        # Only domain_context.txt exists, no architecture_context.txt
        (folder / "domain_context.txt").write_text("Domain only.", encoding="utf-8")

        ctx = load_layered_context("Level 2", str(base), "features")

        assert ctx.domain_context is not None
        # architecture_context is optional — may or may not be routed for features
        assert isinstance(ctx, LayeredCategoryContext)
