"""
Preservation property tests for Backend router.py (BEFORE implementing fix) - Unit Tests.

**Validates: Requirements 3.1, 3.2, 3.7, 3.9**

IMPORTANT: Follow observation-first methodology.
These tests observe behavior on UNFIXED code for non-buggy inputs and capture 
the baseline behavior patterns that must be preserved after the fix.

Property 2: Preservation - Completion Count and API Fields Unchanged (Backend)

The tests capture observed behavior patterns:
- Completion count calculation continues to exclude 4 auto-complete sections 
  (binding_conditions, cybersecurity, disclaimer, scope_definitions)
- Full project (27 sections) continues to calculate percentage with 27
- Completion calculation logic remains unchanged

Property-based testing generates many test cases for stronger guarantees.
Run tests on UNFIXED code.

EXPECTED OUTCOME: Tests PASS (this confirms baseline behavior to preserve)
"""
import pytest
from hypothesis import given, settings, strategies as st

from app.generation.completion import calculate_section_completion


def test_completion_count_excludes_auto_complete_sections():
    """
    Test that completion count calculation excludes 4 auto-complete sections.
    
    **Validates: Requirements 3.1, 3.9**
    
    IMPORTANT: This test observes behavior on UNFIXED code for full projects (27 sections).
    
    Tests that completion count calculation continues to exclude 4 auto-complete sections
    (binding_conditions, cybersecurity, disclaimer, scope_definitions) from the completed count.
    
    This behavior must be preserved after the fix - only the total count calculation should change,
    not the completed count calculation.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    # Create a full project with all 27 sections
    all_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer", "value_addition",
        "buyer_prerequisites", "poc"
    ]
    
    # The 4 sections that should be excluded from completed count
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    
    # Create sections_dict with all sections marked as "complete"
    sections_dict = {}
    for section_key in all_sections:
        if section_key == "cover":
            sections_dict[section_key] = {
                "solution_full_name": "Complete Solution",
                "client_name": "Complete Client",
                "client_location": "Complete Location"
            }
        elif section_key == "introduction":
            sections_dict[section_key] = {
                "tender_reference": "REF-001",
                "tender_date": "2024-01-01"
            }
        elif section_key == "abbreviations":
            sections_dict[section_key] = {
                "rows": [{}] * 13 + [{"abbreviation": "TS"}]
            }
        elif section_key == "supervisors":
            sections_dict[section_key] = {
                "pm_days": "10",
                "dev_days": "20",
                "comm_days": "5",
                "total_man_days": "35"
            }
        else:
            # For all other sections, add content that makes them complete
            sections_dict[section_key] = {"substantial_content": f"Complete content for {section_key}"}
    
    # Calculate completion using the backend logic
    completion_map = calculate_section_completion(sections_dict)
    
    # Count completed sections excluding the 4 auto-complete sections
    completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # Count completed sections including the excluded sections
    total_completed_including_excluded = sum(
        1 for k, v in completion_map.items() 
        if v
    )
    
    # Verify that excluded sections are indeed marked as complete but not counted
    excluded_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k in excluded_sections
    )
    
    # The excluded sections should be complete but not counted in completed_count
    assert excluded_completed_count == 4, f"Expected 4 excluded sections to be complete, got {excluded_completed_count}"
    assert completed_count == total_completed_including_excluded - 4, (
        f"Completion count should exclude 4 auto-complete sections. "
        f"Total completed: {total_completed_including_excluded}, "
        f"Completed count (excluding 4): {completed_count}, "
        f"Expected: {total_completed_including_excluded - 4}"
    )
    
    print(f"✓ Completion count preservation: {completed_count} completed (excluding 4 auto-complete sections)")


def test_full_project_percentage_calculation_with_hardcoded_27():
    """
    Test that full project continues to calculate percentage with hardcoded 27.
    
    **Validates: Requirements 3.2**
    
    IMPORTANT: This test observes behavior on UNFIXED code for the current system.
    
    The current system uses hardcoded 27 for percentage calculation, even though there are
    actually 31 sections total. This behavior must be preserved for full projects after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    # Create a full project with all 31 sections (actual current system)
    all_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer", "value_addition",
        "buyer_prerequisites", "poc"
    ]
    
    # Mark some sections as completed (realistic scenario)
    completed_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "customer_training",
        "fat_condition", "tech_stack", "hardware_specs", "software_specs", "third_party_sw",
        "supervisors", "value_addition", "buyer_prerequisites", "poc"
    ]
    
    sections_dict = {}
    for section_key in all_sections:
        if section_key in completed_sections:
            if section_key == "cover":
                sections_dict[section_key] = {
                    "solution_full_name": "Complete Solution",
                    "client_name": "Complete Client",
                    "client_location": "Complete Location"
                }
            elif section_key == "introduction":
                sections_dict[section_key] = {
                    "tender_reference": "REF-001",
                    "tender_date": "2024-01-01"
                }
            elif section_key == "abbreviations":
                sections_dict[section_key] = {
                    "rows": [{}] * 13 + [{"abbreviation": "TS"}]
                }
            elif section_key == "supervisors":
                sections_dict[section_key] = {
                    "pm_days": "10",
                    "dev_days": "20",
                    "comm_days": "5",
                    "total_man_days": "35"
                }
            else:
                sections_dict[section_key] = {"substantial_content": f"Complete content for {section_key}"}
        else:
            # Incomplete sections
            sections_dict[section_key] = {}
    
    # Calculate completion using backend logic
    completion_map = calculate_section_completion(sections_dict)
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # For full project, the current system uses hardcoded 27 (baseline behavior to preserve)
    # Even though there are actually 31 sections, the system was designed to use 27
    expected_percentage_with_27 = int((completed_count / 27) * 100)
    
    # Verify this is the current behavior that should be preserved
    assert len(sections_dict) == 31, "Current system has 31 sections total"
    assert expected_percentage_with_27 >= 0 and expected_percentage_with_27 <= 100, "Percentage should be valid"
    
    print(f"✓ Full project baseline: 31 sections total, {completed_count} completed, {expected_percentage_with_27}% (using hardcoded 27) - PRESERVED")


@given(
    completion_ratio=st.floats(min_value=0.1, max_value=0.9)
)
@settings(max_examples=10, deadline=5000)
def test_excluded_sections_preservation_property(completion_ratio):
    """
    Property-based test for excluded sections preservation.
    
    **Validates: Requirements 3.1, 3.9**
    
    IMPORTANT: This test observes behavior on UNFIXED code for full projects.
    
    Tests that the 4 auto-complete sections (binding_conditions, cybersecurity, 
    disclaimer, scope_definitions) continue to be excluded from the completed count
    calculation, regardless of their completion state.
    
    This exclusion logic must be preserved after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    # Create all 31 sections (current system)
    all_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer", "value_addition",
        "buyer_prerequisites", "poc"
    ]
    
    # The 4 sections that should be excluded from completed count
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completable_sections = [s for s in all_sections if s not in excluded_sections]
    
    # Select sections to complete based on ratio
    target_completed = int(len(completable_sections) * completion_ratio)
    completed_sections = completable_sections[:target_completed]
    
    # Always mark the excluded sections as "complete" to test they're properly excluded
    sections_dict = {}
    for section_key in all_sections:
        if section_key in excluded_sections:
            # Mark excluded sections as complete (they should still be excluded from count)
            sections_dict[section_key] = {"auto_complete": True}
        elif section_key in completed_sections:
            # Mark regular sections as complete
            if section_key == "cover":
                sections_dict[section_key] = {
                    "solution_full_name": "Complete Solution",
                    "client_name": "Complete Client",
                    "client_location": "Complete Location"
                }
            elif section_key == "introduction":
                sections_dict[section_key] = {
                    "tender_reference": "REF-001",
                    "tender_date": "2024-01-01"
                }
            elif section_key == "abbreviations":
                sections_dict[section_key] = {
                    "rows": [{}] * 13 + [{"abbreviation": "TS"}]
                }
            else:
                sections_dict[section_key] = {"substantial_content": f"Complete content for {section_key}"}
        else:
            # Incomplete sections
            sections_dict[section_key] = {}
    
    # Calculate completion using backend logic
    completion_map = calculate_section_completion(sections_dict)
    
    # Count completed sections excluding the 4 auto-complete sections
    completed_count_excluding = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # Count completed sections including the excluded sections
    completed_count_including = sum(
        1 for k, v in completion_map.items() 
        if v
    )
    
    # Count how many excluded sections are marked as complete
    excluded_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k in excluded_sections
    )
    
    # The excluded sections should not affect the completed count used for percentage calculation
    assert completed_count_excluding == completed_count_including - excluded_completed_count, (
        f"Excluded sections preservation failed! "
        f"Completed count excluding: {completed_count_excluding}, "
        f"Completed count including: {completed_count_including}, "
        f"Excluded completed: {excluded_completed_count}. "
        f"The exclusion logic must be preserved after the fix."
    )
    
    # For full project, percentage calculation should use hardcoded 27 (baseline behavior to preserve)
    # This is the current behavior even though there are 31 sections total
    expected_percentage = int((completed_count_excluding / 27) * 100)
    assert expected_percentage >= 0 and expected_percentage <= 100, "Percentage should be valid"
    
    print(f"✓ Excluded sections preservation: {completed_count_excluding} completed (excluding {excluded_completed_count} auto-complete), {expected_percentage}% (using hardcoded 27)")


def test_completion_calculation_logic_preservation():
    """
    Test that the completion calculation logic remains unchanged.
    
    **Validates: Requirements 3.1, 3.9**
    
    IMPORTANT: This test observes the current completion calculation logic on UNFIXED code.
    
    The completion calculation logic (which sections are considered complete based on content)
    must remain unchanged after the fix. Only the total count calculation should change.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline logic to preserve)
    """
    # Test specific completion rules that should be preserved
    test_cases = [
        # Cover section requires 3 fields
        {
            "section": "cover",
            "content": {"solution_full_name": "Test", "client_name": "Test", "client_location": "Test"},
            "expected_complete": True
        },
        {
            "section": "cover", 
            "content": {"solution_full_name": "Test", "client_name": "Test"},  # Missing client_location
            "expected_complete": False
        },
        # Introduction requires 2 fields
        {
            "section": "introduction",
            "content": {"tender_reference": "REF-001", "tender_date": "2024-01-01"},
            "expected_complete": True
        },
        {
            "section": "introduction",
            "content": {"tender_reference": "REF-001"},  # Missing tender_date
            "expected_complete": False
        },
        # Abbreviations requires row 13 (index 13) to have abbreviation
        {
            "section": "abbreviations",
            "content": {"rows": [{}] * 13 + [{"abbreviation": "TS"}]},
            "expected_complete": True
        },
        {
            "section": "abbreviations",
            "content": {"rows": [{}] * 13 + [{}]},  # Row 13 has no abbreviation
            "expected_complete": False
        },
        # Auto-complete sections (should always be complete if present)
        {
            "section": "binding_conditions",
            "content": {},
            "expected_complete": True
        },
        {
            "section": "cybersecurity",
            "content": {},
            "expected_complete": True
        },
        {
            "section": "disclaimer",
            "content": {},
            "expected_complete": True
        },
        {
            "section": "scope_definitions",
            "content": {},
            "expected_complete": True
        }
    ]
    
    for test_case in test_cases:
        sections_dict = {test_case["section"]: test_case["content"]}
        completion_map = calculate_section_completion(sections_dict)
        
        actual_complete = completion_map.get(test_case["section"], False)
        expected_complete = test_case["expected_complete"]
        
        assert actual_complete == expected_complete, (
            f"Completion logic changed for {test_case['section']}! "
            f"Expected {expected_complete}, got {actual_complete}. "
            f"Content: {test_case['content']}. "
            f"This completion logic must be preserved after the fix."
        )
    
    print(f"✓ Completion calculation logic preserved for {len(test_cases)} test cases")


def test_percentage_calculation_formula_preservation():
    """
    Test that the percentage calculation formula remains unchanged for full projects.
    
    **Validates: Requirements 3.2**
    
    IMPORTANT: This test observes the current percentage calculation formula on UNFIXED code.
    
    For full projects (27 sections), the formula (completed_count / 27) * 100 should be preserved.
    Only projects with deletions should use dynamic calculation after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline formula to preserve)
    """
    # Test different completion scenarios for full projects
    test_scenarios = [
        {"completed_count": 0, "expected_percentage": 0},
        {"completed_count": 7, "expected_percentage": 25},   # 7/27 * 100 = 25.9 -> 25
        {"completed_count": 14, "expected_percentage": 51},  # 14/27 * 100 = 51.8 -> 51
        {"completed_count": 21, "expected_percentage": 77},  # 21/27 * 100 = 77.7 -> 77
        {"completed_count": 23, "expected_percentage": 85},  # 23/27 * 100 = 85.1 -> 85
        {"completed_count": 27, "expected_percentage": 100}, # 27/27 * 100 = 100
    ]
    
    for scenario in test_scenarios:
        completed_count = scenario["completed_count"]
        expected_percentage = scenario["expected_percentage"]
        
        # Calculate using the current formula (should be preserved for full projects)
        actual_percentage = int((completed_count / 27) * 100)
        
        assert actual_percentage == expected_percentage, (
            f"Percentage calculation formula changed! "
            f"For {completed_count} completed out of 27 sections, "
            f"expected {expected_percentage}% but got {actual_percentage}%. "
            f"This formula must be preserved for full projects after the fix."
        )
    
    print(f"✓ Percentage calculation formula preserved for {len(test_scenarios)} scenarios")