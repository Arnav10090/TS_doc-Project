"""
Property-based test for FAT Condition structured output bug condition exploration.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4**

This test MUST FAIL on unfixed code - failure confirms the bug exists.
DO NOT attempt to fix the test or the code when it fails.

The test encodes the expected behavior - it will validate the fix when it passes after implementation.
GOAL: Surface counterexamples that demonstrate the bug exists (guidance files don't specify structured format).

Bug Condition: When the AI generates content for the FAT Condition section, it produces generic English 
descriptions without specific subsections because the guidance file does not specify the structured format.

Expected Behavior (what this test asserts - guidance files should specify):
- Explicit "### Section Title" subsection requirement
- Explicit "### Section Purpose" subsection requirement
- Explicit "### FAT Scope" subsection requirement
- Explicit "### Test Criteria" subsection requirement
- Explicit "### Deliverable" subsection requirement
- Explicit "### FAT Location" subsection requirement
- Explicit "### Buyer Obligations" subsection requirement
- Explicit "### System Configuration Notes" subsection requirement
- Availability formula format specification
- Availability threshold examples
- Formal contractual language requirements

Expected to FAIL on unfixed code (current guidance files only contain generic topical guidance).
"""
import pytest
from hypothesis import given, settings, strategies as st
import re
from pathlib import Path


# Get the project root directory (parent of backend folder)
BACKEND_DIR = Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
TS_DOCUMENTS_DIR = PROJECT_ROOT / "ts_documents"


def find_all_fat_condition_guidance_files():
    """
    Find all fat_condition.txt guidance files in the ts_documents directory.
    
    Returns list of (ts_type, file_path) tuples.
    """
    guidance_files = []
    
    # Search for all fat_condition.txt files
    for guidance_file in TS_DOCUMENTS_DIR.rglob("section_guidance/fat_condition.txt"):
        # Extract TS type from path
        relative_path = guidance_file.relative_to(TS_DOCUMENTS_DIR)
        ts_type_parts = relative_path.parts[:-2]  # Remove "section_guidance/fat_condition.txt"
        ts_type = "/".join(ts_type_parts)
        
        guidance_files.append((ts_type, guidance_file))
    
    return guidance_files



def ts_type_and_guidance_strategy():
    """Strategy for generating (ts_type, guidance_content) pairs."""
    guidance_files = find_all_fat_condition_guidance_files()
    
    if not guidance_files:
        # Return a dummy strategy that will be caught in the test
        return st.just(("No TS types", "No guidance files found"))
    
    # Create strategy that returns (ts_type, guidance_content) tuples
    return st.sampled_from([
        (ts_type, path.read_text(encoding='utf-8'))
        for ts_type, path in guidance_files
    ])


@given(test_data=ts_type_and_guidance_strategy())
@settings(max_examples=10, deadline=5000)
def test_fat_condition_guidance_specifies_structured_format(test_data):
    """
    Property 1: Bug Condition - FAT Condition Guidance Specifies Structured Format
    
    **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.3**
    
    CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
    
    Test that fat_condition.txt guidance files explicitly specify the structured 
    format with 8 mandatory subsections using ### markdown headers.
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (this is correct - it proves the bug exists)
    """
    ts_type, guidance_content = test_data
    
    # Skip if no guidance files found
    if ts_type == "No TS types":
        pytest.skip("No fat_condition.txt guidance files found")
    
    print(f"\n{'='*80}")
    print(f"TS Type: {ts_type}")
    print(f"Guidance Content ({len(guidance_content)} chars):")
    print(guidance_content)
    print(f"{'='*80}\n")
    
    # Check if guidance explicitly specifies all 8 subsections
    required_subsections = [
        "Section Title",
        "Section Purpose",
        "FAT Scope",
        "Test Criteria",
        "Deliverable",
        "FAT Location",
        "Buyer Obligations",
        "System Configuration Notes",
    ]
    
    missing = [name for name in required_subsections if name not in guidance_content]
    
    assert len(missing) == 0, (
        f"Bug detected! Guidance for TS type '{ts_type}' does not explicitly specify "
        f"{len(missing)} required subsections: {', '.join(missing)}. "
        f"Current guidance only provides generic topical guidance ('test criteria', 'deliverable'), "
        f"not explicit subsection structure with these exact names."
    )
    
    # Check for ### markdown header format specification
    assert "###" in guidance_content, (
        f"Bug detected! Guidance for TS type '{ts_type}' does not specify markdown ### headers. "
        f"The AI needs explicit format instruction to generate structured subsections."
    )



@given(test_data=ts_type_and_guidance_strategy())
@settings(max_examples=10, deadline=5000)
def test_fat_condition_guidance_specifies_availability_formula(test_data):
    """
    Property 1: Bug Condition - Guidance Specifies Availability Formula
    
    **Validates: Requirements 1.4, 2.2, 2.4**
    
    CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
    
    Test that fat_condition.txt guidance files explicitly specify the availability 
    formula format and threshold examples.
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (this is correct - it proves the bug exists)
    """
    ts_type, guidance_content = test_data
    
    # Skip if no guidance files found
    if ts_type == "No TS types":
        pytest.skip("No fat_condition.txt guidance files found")
    
    print(f"\n{'='*80}")
    print(f"TS Type: {ts_type}")
    print(f"Testing availability formula guidance...")
    print(f"{'='*80}\n")
    
    # Check for availability formula specification
    has_availability_instruction = (
        "Availability" in guidance_content and
        ("formula" in guidance_content.lower() or "=" in guidance_content)
    )
    assert has_availability_instruction, (
        f"Bug detected! Guidance for TS type '{ts_type}' does not specify availability formula format. "
        f"Expected instruction like 'Include availability formula: Availability = (Total Time - Stop Time) / Total Time × 100%'. "
        f"Without this, the AI generates generic text without mathematical formulas."
    )
    
    # Check for threshold examples
    threshold_pattern = r"\d{2,3}(?:\.\d+)?%"
    has_threshold_example = re.search(threshold_pattern, guidance_content)
    assert has_threshold_example, (
        f"Bug detected! Guidance for TS type '{ts_type}' does not provide availability threshold examples. "
        f"Expected examples like '98.5%' or '99%'. Without examples, AI generates generic placeholder text."
    )



def test_concrete_level2_guidance_bug_example():
    """
    Concrete test case: Level 2 fat_condition.txt should specify structured format.
    
    **Validates: Requirements 1.1, 1.3, 2.1, 2.3**
    
    Current content: "Structure: FAT/shop test scope... test criteria, deliverable..."
    Expected: Explicit specification of 8 subsections with ### headers
    Bug: Only mentions topics, not subsection structure
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (proves bug exists)
    """
    guidance_file = TS_DOCUMENTS_DIR / "Level 2" / "section_guidance" / "fat_condition.txt"
    
    if not guidance_file.exists():
        pytest.skip(f"Level 2 guidance file not found at {guidance_file}")
    
    guidance_content = guidance_file.read_text(encoding='utf-8')
    
    print(f"\n{'='*80}")
    print(f"Concrete Bug Example: Level 2 fat_condition.txt")
    print(f"Current guidance content:")
    print(guidance_content)
    print(f"{'='*80}\n")
    
    # Check for all 8 required subsections being explicitly specified
    required_subsections = [
        "Section Title", "Section Purpose", "FAT Scope", "Test Criteria",
        "Deliverable", "FAT Location", "Buyer Obligations", "System Configuration Notes",
    ]
    
    missing = [name for name in required_subsections if name not in guidance_content]
    
    assert len(missing) == 0, (
        f"Concrete bug confirmed! Level 2 guidance is missing explicit specification for "
        f"{len(missing)} required subsections: {', '.join(missing)}. "
        f"Current guidance mentions topics like 'test criteria' and 'deliverable' but does not "
        f"explicitly specify that these should be subsections with ### markdown headers."
    )


def test_concrete_ugs_guidance_bug_example():
    """
    Concrete test case: UGS fat_condition.txt should specify availability formula.
    
    **Validates: Requirements 1.2, 1.4, 2.2, 2.4**
    
    Current: mentions "test criteria (acceptance pass/fail)" but no formula
    Expected: Explicit availability formula specification with threshold example
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (proves bug exists)
    """
    guidance_file = TS_DOCUMENTS_DIR / "Data Analysis" / "Data Centralization" / "UGS" / "section_guidance" / "fat_condition.txt"
    
    if not guidance_file.exists():
        pytest.skip(f"UGS guidance file not found at {guidance_file}")
    
    guidance_content = guidance_file.read_text(encoding='utf-8')
    
    print(f"\n{'='*80}")
    print(f"Concrete Bug Example: UGS fat_condition.txt")
    print(f"Current guidance:")
    print(guidance_content)
    print(f"{'='*80}\n")
    
    # Check for availability formula specification
    assert "Availability" in guidance_content and "formula" in guidance_content.lower(), (
        "Concrete UGS bug confirmed! Guidance does not specify availability formula. "
        "Expected: 'Include availability formula: Availability = (Total Time - Stop Time) / Total Time × 100%'."
    )
    
    # Check for threshold example
    threshold_pattern = r"\d{2,3}(?:\.\d+)?%"
    assert re.search(threshold_pattern, guidance_content), (
        "Concrete UGS bug confirmed! Guidance does not provide availability threshold example like '98.5%'."
    )
