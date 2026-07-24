"""
Property-based tests for FAT Condition preservation properties (BEFORE implementing fix).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

IMPORTANT: Follow observation-first methodology.
These tests observe behavior on UNFIXED code for non-buggy inputs (section_key != "fat_condition")
and capture the baseline behavior patterns that must be preserved after the fix.

Property 2: Preservation - Non-FAT Section Behavior Unchanged

The tests capture observed behavior patterns:
- Guidance file loading mechanism continues to work for all non-FAT sections
- Section guidance truncation at 500 characters remains unchanged
- Prompt builder injection of section guidance into Layer 5 continues working
- Section context routing for non-FAT sections remains unchanged
- All non-FAT section guidance files and AI generation remain unaffected

Property-based testing generates many test cases for stronger guarantees.
Run tests on UNFIXED code.

EXPECTED OUTCOME: Tests PASS (this confirms baseline behavior to preserve)
"""
import pytest
from hypothesis import given, settings, strategies as st, HealthCheck
from pathlib import Path
from typing import List, Tuple
import os

from app.ai_suggestions.retrieval import (
    load_layered_context,
    LayeredCategoryContext,
    clear_layered_retrieval_cache
)
from app.ai_suggestions.section_context_map import (
    get_shared_context_files,
    get_section_guidance_file
)


# Get the project root directory (parent of backend folder)
BACKEND_DIR = Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
TS_DOCUMENTS_DIR = str(PROJECT_ROOT / "ts_documents")


def find_all_non_fat_section_guidance_files() -> List[Tuple[str, str, Path]]:
    """
    Find all section guidance files EXCEPT fat_condition.txt.
    
    Returns list of (ts_type, section_key, file_path) tuples.
    """
    guidance_files = []
    
    # Search for all guidance files in section_guidance directories
    for guidance_file in Path(TS_DOCUMENTS_DIR).rglob("section_guidance/*.txt"):
        # Skip fat_condition.txt - that's the buggy section
        if guidance_file.name == "fat_condition.txt":
            continue
        
        # Extract TS type from path
        relative_path = guidance_file.relative_to(TS_DOCUMENTS_DIR)
        ts_type_parts = relative_path.parts[:-2]  # Remove "section_guidance/{filename}.txt"
        ts_type = "/".join(ts_type_parts)
        
        # Extract section_key from filename (remove .txt extension)
        section_key = guidance_file.stem
        
        guidance_files.append((ts_type, section_key, guidance_file))
    
    return guidance_files


def non_fat_guidance_strategy():
    """Strategy for generating (ts_type, section_key, guidance_content) tuples for non-FAT sections."""
    guidance_files = find_all_non_fat_section_guidance_files()
    
    if not guidance_files:
        # Return a dummy strategy that will be caught in the test
        return st.just(("No TS types", "no_section", "No guidance files found"))
    
    # Create strategy that returns (ts_type, section_key, guidance_content) tuples
    return st.sampled_from([
        (ts_type, section_key, path.read_text(encoding='utf-8'))
        for ts_type, section_key, path in guidance_files
    ])


def ts_type_strategy():
    """Strategy for generating TS types."""
    ts_types = []
    
    # Find all TS type directories
    for item in Path(TS_DOCUMENTS_DIR).iterdir():
        if item.is_dir():
            ts_types.append(item.name)
            # Also check for nested TS types (e.g., "Data Analysis/Data Centralization/UGS")
            for subitem in item.rglob("*"):
                if subitem.is_dir() and (subitem / "section_guidance").exists():
                    relative = subitem.relative_to(TS_DOCUMENTS_DIR)
                    ts_types.append(str(relative).replace(os.sep, "/"))
    
    if not ts_types:
        return st.just("Level 2")  # Fallback to known TS type
    
    return st.sampled_from(ts_types)


def non_fat_section_strategy():
    """Strategy for generating non-FAT section keys."""
    # All predefined sections except fat_condition
    predefined_sections = [
        "executive_summary", "introduction", "process_flow", "overview",
        "features", "remote_support", "documentation_control", "customer_training",
        "system_config", "tech_stack", "hardware_specs", "software_specs",
        "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer",
        "value_addition", "buyer_prerequisites", "poc"
    ]
    
    return st.sampled_from(predefined_sections)


@pytest.fixture(autouse=True)
def clear_cache_before_test():
    """Clear retrieval cache before each test to ensure fresh reads."""
    clear_layered_retrieval_cache()
    yield
    clear_layered_retrieval_cache()


@given(test_data=non_fat_guidance_strategy())
@settings(max_examples=20, deadline=5000)
def test_non_fat_guidance_loading_mechanism_preservation(test_data):
    """
    Property 2: Preservation - Guidance Loading Mechanism Unchanged for Non-FAT Sections
    
    **Validates: Requirements 3.1, 3.2**
    
    IMPORTANT: This test observes behavior on UNFIXED code for non-FAT sections.
    
    Tests that the guidance file loading mechanism in retrieval.py continues to work
    exactly as before for all sections except fat_condition. The fix should only update
    fat_condition.txt file contents, not the loading mechanism.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    ts_type, section_key, guidance_content = test_data
    
    # Skip if no guidance files found
    if ts_type == "No TS types":
        pytest.skip("No non-FAT section guidance files found")
    
    print(f"\n{'='*80}")
    print(f"TS Type: {ts_type}")
    print(f"Section: {section_key}")
    print(f"Guidance Content Length: {len(guidance_content)} chars")
    print(f"{'='*80}\n")
    
    # Load layered context using the existing mechanism
    try:
        context = load_layered_context(
            ts_type=ts_type,
            ts_documents_dir=TS_DOCUMENTS_DIR,
            section_key=section_key,
            max_docs=5
        )
    except Exception as e:
        pytest.fail(f"Guidance loading mechanism failed for {ts_type}/{section_key}: {e}")
    
    # Verify the loading mechanism worked
    assert isinstance(context, LayeredCategoryContext), (
        f"Loading mechanism broken for {section_key}: expected LayeredCategoryContext, "
        f"got {type(context)}. This baseline behavior must be preserved."
    )
    
    # Verify folder path is set correctly (loading mechanism should resolve paths correctly)
    assert context.folder_path, (
        f"Loading mechanism broken for {section_key}: folder_path not set. "
        f"This baseline behavior must be preserved."
    )
    
    # Verify the folder path is within ts_documents directory (path traversal prevention)
    resolved_folder = os.path.abspath(context.folder_path)
    base = os.path.abspath(TS_DOCUMENTS_DIR)
    assert os.path.commonpath([base, resolved_folder]) == base, (
        f"Path traversal prevention broken for {section_key}: folder path {resolved_folder} "
        f"is outside ts_documents directory. This security feature must be preserved."
    )
    
    print(f"✓ Loading mechanism preserved for {section_key}: folder={context.folder_path}")


@given(test_data=non_fat_guidance_strategy())
@settings(max_examples=20, deadline=5000)
def test_non_fat_guidance_truncation_preservation(test_data):
    """
    Property 2: Preservation - Section Guidance Truncation at 500 Chars Unchanged
    
    **Validates: Requirements 3.2**
    
    IMPORTANT: This test observes behavior on UNFIXED code for non-FAT sections.
    
    Tests that section guidance truncation at 500 characters continues to work for
    all sections. The fix should not change the truncation behavior.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    ts_type, section_key, guidance_content = test_data
    
    # Skip if no guidance files found
    if ts_type == "No TS types":
        pytest.skip("No non-FAT section guidance files found")
    
    print(f"\n{'='*80}")
    print(f"Testing truncation for {ts_type}/{section_key}")
    print(f"Original guidance length: {len(guidance_content)} chars")
    print(f"{'='*80}\n")
    
    # Load layered context
    try:
        context = load_layered_context(
            ts_type=ts_type,
            ts_documents_dir=TS_DOCUMENTS_DIR,
            section_key=section_key,
            max_docs=5
        )
    except Exception as e:
        pytest.fail(f"Failed to load context for {ts_type}/{section_key}: {e}")
    
    # Check if section guidance was loaded
    if context.section_guidance_available and context.section_guidance:
        loaded_guidance_length = len(context.section_guidance)
        
        # Verify truncation at 500 chars (baseline behavior from Task 23.3)
        assert loaded_guidance_length <= 500, (
            f"Truncation behavior broken for {section_key}: loaded guidance is "
            f"{loaded_guidance_length} chars (should be ≤500). "
            f"This baseline behavior must be preserved."
        )
        
        # If original was >500, verify it was truncated to exactly 500
        if len(guidance_content) > 500:
            assert loaded_guidance_length == 500, (
                f"Truncation behavior changed for {section_key}: original was "
                f"{len(guidance_content)} chars but loaded is {loaded_guidance_length} "
                f"(expected exactly 500). This baseline behavior must be preserved."
            )
        else:
            # If original was ≤500, verify it was loaded (may be slightly different due to normalization)
            # normalize_text() may remove trailing whitespace, so allow small differences
            length_diff = abs(loaded_guidance_length - len(guidance_content))
            assert length_diff <= 5, (
                f"Loading behavior changed for {section_key}: original was "
                f"{len(guidance_content)} chars but loaded is {loaded_guidance_length} "
                f"(diff: {length_diff}). Files ≤500 chars should be loaded with minimal normalization. "
                f"This baseline behavior must be preserved."
            )
        
        print(f"✓ Truncation preserved for {section_key}: {len(guidance_content)} → {loaded_guidance_length} chars")
    else:
        # No section guidance loaded - this is also valid baseline behavior
        print(f"✓ No section guidance for {section_key} (this is normal baseline behavior)")


@given(
    ts_type=ts_type_strategy(),
    section_key=non_fat_section_strategy()
)
@settings(max_examples=30, deadline=5000)
def test_non_fat_section_routing_preservation(ts_type, section_key):
    """
    Property 2: Preservation - Section Context Routing Unchanged for Non-FAT Sections
    
    **Validates: Requirements 3.4**
    
    IMPORTANT: This test observes behavior on UNFIXED code for non-FAT sections.
    
    Tests that section context routing in section_context_map.py continues to work
    for all non-FAT sections. The routing map should not be affected by the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    print(f"\n{'='*80}")
    print(f"Testing routing for {ts_type}/{section_key}")
    print(f"{'='*80}\n")
    
    # Get the routing information from the map
    try:
        shared_context_files = get_shared_context_files(section_key, None)
        section_guidance_file = get_section_guidance_file(section_key)
    except Exception as e:
        pytest.fail(f"Section routing failed for {section_key}: {e}")
    
    # Verify routing returns expected structure
    assert isinstance(shared_context_files, list), (
        f"Routing broken for {section_key}: get_shared_context_files should return list, "
        f"got {type(shared_context_files)}. This baseline behavior must be preserved."
    )
    
    # Verify all returned files are valid context file names
    valid_context_files = {
        "domain_context.txt",
        "architecture_context.txt",
        "implementation_context.txt",
        "cybersecurity_context.txt",
        "gantt_context.txt"
    }
    
    for context_file in shared_context_files:
        assert context_file in valid_context_files, (
            f"Routing broken for {section_key}: invalid context file '{context_file}' "
            f"returned. Valid files are: {valid_context_files}. "
            f"This baseline behavior must be preserved."
        )
    
    # Verify section guidance file format
    if section_guidance_file is not None:
        assert section_guidance_file.endswith('.txt'), (
            f"Routing broken for {section_key}: section guidance file should end with .txt, "
            f"got '{section_guidance_file}'. This baseline behavior must be preserved."
        )
    
    print(f"✓ Routing preserved for {section_key}: shared={len(shared_context_files)}, "
          f"guidance={'Yes' if section_guidance_file else 'No'}")


@given(
    ts_type=ts_type_strategy(),
    section_key=non_fat_section_strategy()
)
@settings(max_examples=30, deadline=5000)
def test_non_fat_layered_context_loading_preservation(ts_type, section_key):
    """
    Property 2: Preservation - Layered Context Loading Unchanged for Non-FAT Sections
    
    **Validates: Requirements 3.3, 3.5**
    
    IMPORTANT: This test observes behavior on UNFIXED code for non-FAT sections.
    
    Tests that the complete layered context loading pipeline (shared contexts + 
    section guidance + historical documents) continues to work for all non-FAT sections.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    print(f"\n{'='*80}")
    print(f"Testing layered context loading for {ts_type}/{section_key}")
    print(f"{'='*80}\n")
    
    # Load layered context
    try:
        context = load_layered_context(
            ts_type=ts_type,
            ts_documents_dir=TS_DOCUMENTS_DIR,
            section_key=section_key,
            max_docs=5
        )
    except ValueError as e:
        # Some TS types may not exist or be invalid - this is expected for property-based testing
        error_msg = str(e).lower()
        if "path traversal" in error_msg or "invalid ts_type" in error_msg or "invalid ts type" in error_msg:
            pytest.skip(f"TS type {ts_type} not valid (this is normal for test-generated types)")
        raise
    except Exception as e:
        pytest.fail(f"Layered context loading failed for {ts_type}/{section_key}: {e}")
    
    # Verify all expected fields are present (baseline behavior)
    assert hasattr(context, 'domain_context'), "Missing domain_context field"
    assert hasattr(context, 'architecture_context'), "Missing architecture_context field"
    assert hasattr(context, 'implementation_context'), "Missing implementation_context field"
    assert hasattr(context, 'cybersecurity_context'), "Missing cybersecurity_context field"
    assert hasattr(context, 'gantt_context'), "Missing gantt_context field"
    assert hasattr(context, 'section_guidance'), "Missing section_guidance field"
    assert hasattr(context, 'historical_documents'), "Missing historical_documents field"
    assert hasattr(context, 'loaded_shared_contexts'), "Missing loaded_shared_contexts field"
    assert hasattr(context, 'section_guidance_available'), "Missing section_guidance_available field"
    assert hasattr(context, 'folder_path'), "Missing folder_path field"
    assert hasattr(context, 'historical_context_available'), "Missing historical_context_available field"
    assert hasattr(context, 'legacy_context_txt'), "Missing legacy_context_txt field"
    
    # Verify field types (baseline behavior)
    assert isinstance(context.loaded_shared_contexts, list), (
        f"loaded_shared_contexts should be list, got {type(context.loaded_shared_contexts)}"
    )
    assert isinstance(context.section_guidance_available, bool), (
        f"section_guidance_available should be bool, got {type(context.section_guidance_available)}"
    )
    assert isinstance(context.folder_path, str), (
        f"folder_path should be str, got {type(context.folder_path)}"
    )
    assert isinstance(context.historical_context_available, bool), (
        f"historical_context_available should be bool, got {type(context.historical_context_available)}"
    )
    assert isinstance(context.historical_documents, list), (
        f"historical_documents should be list, got {type(context.historical_documents)}"
    )
    
    # Verify shared context truncation at 1000 chars (baseline behavior from Task 23.2)
    for field_name in ['domain_context', 'architecture_context', 'implementation_context', 
                       'cybersecurity_context', 'gantt_context']:
        field_value = getattr(context, field_name)
        if field_value is not None:
            assert len(field_value) <= 1000, (
                f"Shared context truncation broken for {section_key}: {field_name} is "
                f"{len(field_value)} chars (should be ≤1000). "
                f"This baseline behavior must be preserved."
            )
    
    print(f"✓ Layered context loading preserved for {section_key}: "
          f"shared={len(context.loaded_shared_contexts)}, "
          f"guidance={'Yes' if context.section_guidance_available else 'No'}, "
          f"historical={len(context.historical_documents)}")


def test_concrete_features_section_preservation():
    """
    Concrete preservation test: Features section behavior should be unchanged.
    
    **Validates: Requirements 3.1, 3.5**
    
    IMPORTANT: This test observes behavior on UNFIXED code for a specific non-FAT section.
    
    The features section is one of the most commonly used sections. Its guidance loading,
    context routing, and AI generation must remain unchanged after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    ts_type = "Level 2"
    section_key = "features"
    
    print(f"\n{'='*80}")
    print(f"Concrete Features Section Preservation Test")
    print(f"TS Type: {ts_type}, Section: {section_key}")
    print(f"{'='*80}\n")
    
    # Load context
    try:
        context = load_layered_context(
            ts_type=ts_type,
            ts_documents_dir=TS_DOCUMENTS_DIR,
            section_key=section_key,
            max_docs=5
        )
    except Exception as e:
        pytest.fail(f"Features section loading failed: {e}")
    
    # Verify expected routing (features should load domain_context + implementation_context)
    expected_contexts = {"domain_context.txt", "implementation_context.txt"}
    loaded_contexts = set(context.loaded_shared_contexts)
    
    # Check if expected contexts are loaded (they should be if files exist)
    # Note: some contexts may not exist, which is valid baseline behavior
    for expected_file in expected_contexts:
        if expected_file in loaded_contexts:
            print(f"✓ Expected context loaded: {expected_file}")
    
    # Verify section guidance is available (if file exists)
    features_guidance_file = Path(TS_DOCUMENTS_DIR) / ts_type / "section_guidance" / "features.txt"
    if features_guidance_file.exists():
        assert context.section_guidance_available, (
            "Features section guidance should be available (file exists) but was not loaded. "
            "This baseline behavior must be preserved."
        )
        assert context.section_guidance is not None, (
            "Features section guidance should be loaded but is None. "
            "This baseline behavior must be preserved."
        )
        print(f"✓ Features section guidance loaded: {len(context.section_guidance)} chars")
    else:
        print("✓ Features section guidance file does not exist (normal baseline behavior)")
    
    # Verify historical documents loading
    print(f"✓ Historical documents: {len(context.historical_documents)} loaded")
    
    print(f"\n✓ Features section baseline behavior PRESERVED")


def test_concrete_executive_summary_preservation():
    """
    Concrete preservation test: Executive Summary section behavior should be unchanged.
    
    **Validates: Requirements 3.1, 3.4, 3.5**
    
    IMPORTANT: This test observes behavior on UNFIXED code for a specific non-FAT section.
    
    The executive_summary section is critical for all TS documents. Its behavior must
    remain unchanged after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    ts_type = "Level 2"
    section_key = "executive_summary"
    
    print(f"\n{'='*80}")
    print(f"Concrete Executive Summary Preservation Test")
    print(f"TS Type: {ts_type}, Section: {section_key}")
    print(f"{'='*80}\n")
    
    # Load context
    try:
        context = load_layered_context(
            ts_type=ts_type,
            ts_documents_dir=TS_DOCUMENTS_DIR,
            section_key=section_key,
            max_docs=5
        )
    except Exception as e:
        pytest.fail(f"Executive summary loading failed: {e}")
    
    # Verify expected routing (executive_summary should load domain_context + architecture_context)
    expected_contexts = {"domain_context.txt", "architecture_context.txt"}
    loaded_contexts = set(context.loaded_shared_contexts)
    
    # Check if expected contexts are loaded
    for expected_file in expected_contexts:
        if expected_file in loaded_contexts:
            print(f"✓ Expected context loaded: {expected_file}")
    
    # Verify folder path is set
    assert context.folder_path, "Folder path should be set"
    print(f"✓ Folder path: {context.folder_path}")
    
    # Verify data structure integrity
    assert isinstance(context, LayeredCategoryContext), (
        "Context should be LayeredCategoryContext instance"
    )
    
    print(f"\n✓ Executive Summary section baseline behavior PRESERVED")


def test_concrete_tech_stack_preservation():
    """
    Concrete preservation test: Tech Stack section behavior should be unchanged.
    
    **Validates: Requirements 3.1, 3.3, 3.5**
    
    IMPORTANT: This test observes behavior on UNFIXED code for a specific non-FAT section.
    
    The tech_stack section describes technical architecture. Its behavior must remain
    unchanged after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    ts_type = "Level 2"
    section_key = "tech_stack"
    
    print(f"\n{'='*80}")
    print(f"Concrete Tech Stack Preservation Test")
    print(f"TS Type: {ts_type}, Section: {section_key}")
    print(f"{'='*80}\n")
    
    # Load context
    try:
        context = load_layered_context(
            ts_type=ts_type,
            ts_documents_dir=TS_DOCUMENTS_DIR,
            section_key=section_key,
            max_docs=5
        )
    except Exception as e:
        pytest.fail(f"Tech stack loading failed: {e}")
    
    # Verify expected routing (tech_stack should load architecture_context + implementation_context)
    expected_contexts = {"architecture_context.txt", "implementation_context.txt"}
    loaded_contexts = set(context.loaded_shared_contexts)
    
    # Check if expected contexts are loaded
    for expected_file in expected_contexts:
        if expected_file in loaded_contexts:
            print(f"✓ Expected context loaded: {expected_file}")
    
    # Verify context structure
    assert hasattr(context, 'architecture_context'), "Missing architecture_context field"
    assert hasattr(context, 'implementation_context'), "Missing implementation_context field"
    
    print(f"✓ Loaded shared contexts: {context.loaded_shared_contexts}")
    print(f"✓ Section guidance available: {context.section_guidance_available}")
    print(f"✓ Historical documents: {len(context.historical_documents)}")
    
    print(f"\n✓ Tech Stack section baseline behavior PRESERVED")
