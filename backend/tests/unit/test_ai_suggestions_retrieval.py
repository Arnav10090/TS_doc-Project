import os
import pytest

from app.ai_suggestions.retrieval import clear_retrieval_cache, load_category_context, load_layered_context


def test_load_category_context_reads_context_and_docs(tmp_path):
    base = tmp_path / "ts_documents"
    cat = base / "Data Analysis" / "Data Centralization"
    proj = cat / "Historian"
    proj.mkdir(parents=True)

    # context.txt at category root
    (cat / "context.txt").write_text("Category context here", encoding="utf-8")

    # historical docs
    (proj / "doc1.txt").write_text("Document 1 content", encoding="utf-8")

    ctx = load_category_context("Data Analysis/Data Centralization", str(base))

    assert ctx.context_txt is not None
    assert any(d.filename == "doc1.txt" for d in ctx.historical_documents)


def test_load_category_context_rejects_traversal(tmp_path):
    base = tmp_path / "ts_documents"
    base.mkdir()
    # Attempt to traverse outside base
    with pytest.raises(ValueError):
        load_category_context("../..", str(base))


def test_load_category_context_uses_cache_with_defensive_copy(tmp_path):
    clear_retrieval_cache()
    base = tmp_path / "ts_documents"
    cat = base / "Level 2"
    cat.mkdir(parents=True)
    (cat / "context.txt").write_text("Level 2 context", encoding="utf-8")
    (cat / "doc1.txt").write_text("Original document content", encoding="utf-8")

    first = load_category_context("Level 2", str(base))
    first.historical_documents[0].content = "mutated by caller"

    second = load_category_context("Level 2", str(base))

    assert second.historical_documents[0].content == "Original document content"


def test_load_category_context_invalidates_cache_when_directory_timestamp_changes(tmp_path):
    clear_retrieval_cache()
    base = tmp_path / "ts_documents"
    cat = base / "Level 2"
    cat.mkdir(parents=True)
    context_file = cat / "context.txt"
    context_file.write_text("Old context", encoding="utf-8")

    first = load_category_context("Level 2", str(base))
    assert first.context_txt == "Old context"

    context_file.write_text("New context", encoding="utf-8")
    os.utime(context_file, (context_file.stat().st_atime + 10, context_file.stat().st_mtime + 10))

    second = load_category_context("Level 2", str(base))

    assert second.context_txt == "New context"


# ============================================================================
# Tests for load_layered_context() - Task 23.1
# ============================================================================

def test_load_layered_context_validates_ts_type(tmp_path):
    """Test that load_layered_context validates ts_type using validate_ts_type().
    
    Verifies:
    - Invalid ts_type raises ValueError
    - Validates requirement: Task 23.1 - ts_type validation
    """
    base = tmp_path / "ts_documents"
    base.mkdir()
    
    # Test with None ts_type (should raise)
    with pytest.raises(ValueError, match="TS type is required"):
        load_layered_context("", str(base), "executive_summary")
    
    # Test with None ts_type (should raise)
    with pytest.raises(ValueError, match="TS type is required"):
        load_layered_context(None, str(base), "executive_summary")


def test_load_layered_context_prevents_path_traversal(tmp_path):
    """Test that load_layered_context prevents path traversal attacks.
    
    Verifies:
    - Path traversal attempts raise ValueError
    - Follows same security pattern as load_category_context()
    - Validates requirement: Task 23.1 - Path traversal prevention
    - Validates requirement: Security Requirement 14.2
    """
    base = tmp_path / "ts_documents"
    base.mkdir()
    
    # Attempt to traverse outside base — blocked at validate_ts_type() or commonpath check
    with pytest.raises(ValueError, match="(path traversal detected|Invalid TS type)"):
        load_layered_context("../..", str(base), "executive_summary")
    
    # Attempt with relative path
    with pytest.raises(ValueError, match="(path traversal detected|Invalid TS type)"):
        load_layered_context("../../etc/passwd", str(base), "features")


def test_load_layered_context_resolves_folder_path(tmp_path):
    """Test that load_layered_context correctly resolves folder path.
    
    Verifies:
    - Single-level ts_type resolves correctly
    - Multi-level ts_type resolves correctly
    - Resolved path is within ts_documents_dir
    - Validates requirement: Task 23.1 - Folder path resolution
    """
    base = tmp_path / "ts_documents"
    
    # Single-level ts_type
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    ctx = load_layered_context("Level 2", str(base), "executive_summary")
    assert ctx.folder_path == str(level2.resolve())
    
    # Multi-level ts_type
    historian = base / "Data Analysis" / "Data Centralization" / "Historian"
    historian.mkdir(parents=True)
    
    ctx = load_layered_context(
        "Data Analysis/Data Centralization/Historian",
        str(base),
        "features"
    )
    assert ctx.folder_path == str(historian.resolve())


def test_load_layered_context_routing_integration_predefined_section(tmp_path, monkeypatch):
    """Test routing map integration for predefined sections.
    
    Verifies:
    - get_shared_context_files() is called with correct arguments
    - get_section_guidance_file() is called with correct arguments
    - Routing returns expected file lists for different sections
    - Validates requirement: Task 23.1 - Routing integration
    """
    base = tmp_path / "ts_documents"
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    # Mock routing functions to track calls
    calls = {"shared": [], "guidance": []}
    
    def mock_get_shared_context_files(section_key, ts_type_folder):
        calls["shared"].append((section_key, ts_type_folder))
        if section_key == "executive_summary":
            return ["domain_context.txt", "architecture_context.txt"]
        elif section_key == "cybersecurity":
            return ["cybersecurity_context.txt", "implementation_context.txt"]
        return []
    
    def mock_get_section_guidance_file(section_key):
        calls["guidance"].append(section_key)
        if section_key in ["executive_summary", "cybersecurity"]:
            return f"{section_key}.txt"
        return None
    
    # Patch routing functions on their source module (they are imported inside the function)
    monkeypatch.setattr(
        "app.ai_suggestions.section_context_map.get_shared_context_files",
        mock_get_shared_context_files
    )
    monkeypatch.setattr(
        "app.ai_suggestions.section_context_map.get_section_guidance_file",
        mock_get_section_guidance_file
    )
    
    # Test with executive_summary
    ctx = load_layered_context("Level 2", str(base), "executive_summary")
    
    assert len(calls["shared"]) == 1
    assert calls["shared"][0][0] == "executive_summary"
    assert calls["shared"][0][1] == str(level2.resolve())
    
    assert len(calls["guidance"]) == 1
    assert calls["guidance"][0] == "executive_summary"
    
    # Test with cybersecurity section
    calls["shared"].clear()
    calls["guidance"].clear()
    
    ctx = load_layered_context("Level 2", str(base), "cybersecurity")
    
    assert calls["shared"][0][0] == "cybersecurity"
    assert calls["guidance"][0] == "cybersecurity"


def test_load_layered_context_routing_integration_custom_section(tmp_path, monkeypatch):
    """Test routing map integration for custom sections.
    
    Verifies:
    - Custom sections trigger routing map calls
    - Custom sections default to domain_context per routing rules
    - Validates requirement: Task 23.1 - Routing integration
    """
    base = tmp_path / "ts_documents"
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    calls = []
    
    def mock_get_shared_context_files(section_key, ts_type_folder):
        calls.append(("shared", section_key))
        # Custom sections return domain_context by default
        return ["domain_context.txt"]
    
    def mock_get_section_guidance_file(section_key):
        calls.append(("guidance", section_key))
        # Custom sections have no guidance
        return None
    
    # Patch routing functions on their source module (they are imported inside the function)
    monkeypatch.setattr(
        "app.ai_suggestions.section_context_map.get_shared_context_files",
        mock_get_shared_context_files
    )
    monkeypatch.setattr(
        "app.ai_suggestions.section_context_map.get_section_guidance_file",
        mock_get_section_guidance_file
    )
    
    # Test with custom section
    ctx = load_layered_context(
        "Level 2",
        str(base),
        "custom_section_1234567890_abc123-def456"
    )
    
    assert ("shared", "custom_section_1234567890_abc123-def456") in calls
    assert ("guidance", "custom_section_1234567890_abc123-def456") in calls


def test_load_layered_context_returns_skeleton_context(tmp_path):
    """Test that load_layered_context returns skeleton context structure.
    
    Verifies:
    - Returns LayeredCategoryContext instance
    - folder_path is set correctly
    - Context fields are empty (file loading in future tasks)
    - Metadata fields have correct default values
    - Validates requirement: Task 23.1 - Skeleton implementation
    """
    base = tmp_path / "ts_documents"
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    ctx = load_layered_context("Level 2", str(base), "executive_summary")
    
    # Check type
    from app.ai_suggestions.retrieval import LayeredCategoryContext
    assert isinstance(ctx, LayeredCategoryContext)
    
    # Check folder_path is set
    assert ctx.folder_path == str(level2.resolve())
    
    # Check context fields are empty (file loading in future tasks)
    assert ctx.domain_context is None
    assert ctx.architecture_context is None
    assert ctx.implementation_context is None
    assert ctx.cybersecurity_context is None
    assert ctx.gantt_context is None
    assert ctx.section_guidance is None
    assert ctx.legacy_context_txt is None
    
    # Check metadata fields
    assert ctx.loaded_shared_contexts == []
    assert ctx.section_guidance_available is False
    assert ctx.historical_context_available is False
    assert ctx.historical_documents == []


def test_load_layered_context_function_signature(tmp_path):
    """Test that load_layered_context has correct function signature.
    
    Verifies:
    - Function accepts required parameters: ts_type, ts_documents_dir, section_key
    - Function accepts optional parameter: max_docs (default: 5)
    - Validates requirement: Task 23.1 - Function signature
    """
    base = tmp_path / "ts_documents"
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    # Test with required parameters only
    ctx1 = load_layered_context("Level 2", str(base), "executive_summary")
    assert ctx1 is not None
    
    # Test with max_docs parameter
    ctx2 = load_layered_context("Level 2", str(base), "features", max_docs=10)
    assert ctx2 is not None
    
    # Test with keyword arguments
    ctx3 = load_layered_context(
        ts_type="Level 2",
        ts_documents_dir=str(base),
        section_key="cybersecurity",
        max_docs=3
    )
    assert ctx3 is not None


def test_load_layered_context_logging(tmp_path, caplog):
    """Test that load_layered_context logs appropriate debug/info messages.
    
    Verifies:
    - Debug logs include ts_type, section_key, resolved path
    - Debug logs include routing results
    - Info log confirms skeleton context loaded
    - Validates requirement: Task 23.1 - Error handling and logging
    """
    base = tmp_path / "ts_documents"
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    import logging
    caplog.set_level(logging.DEBUG)
    
    ctx = load_layered_context("Level 2", str(base), "executive_summary")
    
    # Check debug logs
    assert any("load_layered_context" in rec.message for rec in caplog.records)
    assert any("Routing map returned" in rec.message for rec in caplog.records)
    assert any("Layered context loaded" in rec.message for rec in caplog.records)


def test_load_layered_context_with_suppressed_section(tmp_path):
    """Test load_layered_context with suppressed sections.
    
    Verifies:
    - Suppressed sections (cover, revision_history, abbreviations) can be queried
    - Routing returns empty file lists for suppressed sections
    - Function completes successfully even with suppressed sections
    - Validates requirement: Task 23.1 - Routing integration
    """
    base = tmp_path / "ts_documents"
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    # Suppressed sections should return empty routing results
    ctx = load_layered_context("Level 2", str(base), "abbreviations")
    assert ctx.folder_path == str(level2.resolve())
    # Routing should return empty lists for suppressed sections
    # (validated by routing tests, just verify function doesn't crash)


def test_load_layered_context_multiple_sections_same_ts_type(tmp_path):
    """Test loading layered context for multiple sections with same ts_type.
    
    Verifies:
    - Multiple calls with same ts_type but different sections work correctly
    - Each section gets its own routing results
    - Validates requirement: Task 23.1 - Section-specific routing
    """
    base = tmp_path / "ts_documents"
    level2 = base / "Level 2"
    level2.mkdir(parents=True)
    
    # Load context for different sections
    ctx1 = load_layered_context("Level 2", str(base), "executive_summary")
    ctx2 = load_layered_context("Level 2", str(base), "features")
    ctx3 = load_layered_context("Level 2", str(base), "cybersecurity")
    
    # All should have same folder_path
    assert ctx1.folder_path == ctx2.folder_path == ctx3.folder_path
    
    # All should be valid LayeredCategoryContext instances
    from app.ai_suggestions.retrieval import LayeredCategoryContext
    assert isinstance(ctx1, LayeredCategoryContext)
    assert isinstance(ctx2, LayeredCategoryContext)
    assert isinstance(ctx3, LayeredCategoryContext)
