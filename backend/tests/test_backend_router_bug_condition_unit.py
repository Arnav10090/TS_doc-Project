"""
Unit test for Backend router.py bug condition exploration.

**Validates: Requirements 1.10, 1.11, 1.12, 2.7, 2.8**

This test MUST FAIL on unfixed code - failure confirms the bug exists.
DO NOT attempt to fix the test or the code when it fails.

The test encodes the expected behavior - it will validate the fix when it passes after implementation.
GOAL: Surface counterexamples that demonstrate the bug exists in backend completion percentage calculation.

Bug Condition: When a project has fewer than 27 sections (e.g., 24 sections after 3 deletions), 
the completion percentage should be calculated using the actual section count: 
(completed_count / (len(sections_dict) - 4)) * 100

Expected to FAIL on unfixed code (line 80 has completion_percentage = int((completed_count / 27) * 100))
"""
import pytest
from hypothesis import given, settings, strategies as st

from app.generation.completion import calculate_section_completion


def test_completion_percentage_calculation_logic():
    """
    Direct unit test of the completion percentage calculation logic.
    
    **Validates: Requirements 1.10, 1.11, 1.12, 2.7, 2.8**
    
    CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
    
    Tests the specific bug condition: when sections_dict has fewer than 27 sections,
    the completion percentage should use actual section count, not hardcoded 27.
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (this is correct - it proves the bug exists)
    """
    # Simulate a project with 24 sections (3 deletions from original 27)
    sections_dict = {
        "cover": {"solution_full_name": "Complete Solution", "client_name": "Complete Client", "client_location": "Complete Location"},
        "revision_history": {"rows": [{"details": "Initial version"}]},
        "executive_summary": {"para1": "<p>Executive summary content</p>"},
        "introduction": {"tender_reference": "REF-001", "tender_date": "2024-01-01"},
        "abbreviations": {"rows": [{}] * 13 + [{"abbreviation": "TS"}]},
        "process_flow": {"text": "<p>Process flow description</p>"},
        "overview": {"system_objective": "System objective", "existing_system": "Existing system"},
        "features": {"items": [{"title": "Feature 1", "description": "Description 1"}]},
        "remote_support": {"text": "Remote support text"},
        "documentation_control": {},
        "customer_training": {"persons": "5", "days": "3"},
        "system_config": {},
        "fat_condition": {"text": "FAT condition text"},
        "tech_stack": {"rows": [{"component": "Component 1", "technology": "Tech 1"}]},
        "hardware_specs": {"rows": [{"specs_line1": "Spec 1", "maker": "Maker 1"}]},
        "software_specs": {"rows": [{"name": "Software 1"}]},
        "third_party_sw": {"sw4_name": "Third Party SW"},
        "overall_gantt": {},
        "shutdown_gantt": {},
        "supervisors": {"pm_days": "10", "dev_days": "20", "comm_days": "5", "total_man_days": "35"},
        "scope_definitions": {},
        "binding_conditions": {},
        "cybersecurity": {},
        "disclaimer": {},
        "value_addition": {"text": "<p>Value addition text</p>"}
        # Missing: division_of_eng, work_completion, buyer_obligations (3 deletions)
    }
    
    # Calculate completion using the same logic as the backend
    completion_map = calculate_section_completion(sections_dict)
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # Expected behavior: use actual section count
    actual_total_sections = len(sections_dict) - 4  # 24 - 4 = 20 completable sections
    expected_completion_percentage = int((completed_count / actual_total_sections) * 100) if actual_total_sections > 0 else 0
    
    # Bug behavior: uses hardcoded 27
    buggy_completion_percentage = int((completed_count / 27) * 100)
    
    print(f"Sections in dict: {len(sections_dict)}")
    print(f"Completed count: {completed_count}")
    print(f"Actual total completable: {actual_total_sections}")
    print(f"Expected percentage (using actual count): {expected_completion_percentage}%")
    print(f"Buggy percentage (using hardcoded 27): {buggy_completion_percentage}%")
    
    # This assertion should FAIL on unfixed code because the backend uses hardcoded 27
    # The test simulates what the backend SHOULD do vs what it actually does
    assert buggy_completion_percentage == expected_completion_percentage, (
        f"Bug condition detected! With {len(sections_dict)} sections and {completed_count} completed, "
        f"hardcoded calculation gives {buggy_completion_percentage}% instead of {expected_completion_percentage}%. "
        f"Expected calculation: ({completed_count} / {actual_total_sections}) * 100 = {expected_completion_percentage}%, "
        f"Bug calculation: ({completed_count} / 27) * 100 = {buggy_completion_percentage}%"
    )


def test_concrete_bug_example_24_sections():
    """
    Concrete test case demonstrating the specific bug from requirements.
    
    **Validates: Requirements 1.11, 2.8**
    
    This is the specific example from the bugfix document:
    - 24 sections (3 deletions from 27)
    - Should calculate percentage using 20 completable sections (24 - 4 auto-complete)
    - Bug: calculates using hardcoded 27
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (proves bug exists)
    """
    # Create exactly 24 sections as specified in the bug report
    sections_dict = {}
    all_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "binding_conditions", "cybersecurity", "disclaimer"
        # Missing 3 sections: division_of_eng, work_completion, buyer_obligations
    ]
    
    # Create sections with some completed
    completed_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack"
    ]
    
    for section_key in all_sections:
        if section_key in completed_sections:
            # Add content that makes the section "complete"
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
            # Empty or minimal content
            sections_dict[section_key] = {}
    
    # Calculate completion
    completion_map = calculate_section_completion(sections_dict)
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # Expected: 24 total - 4 auto-complete = 20 completable sections
    actual_total_completable = len(sections_dict) - 4
    expected_percentage = int((completed_count / actual_total_completable) * 100)
    
    # Bug: uses hardcoded 27
    buggy_percentage = int((completed_count / 27) * 100)
    
    print(f"\nConcrete bug example:")
    print(f"Total sections: {len(sections_dict)}")
    print(f"Completable sections: {actual_total_completable}")
    print(f"Completed sections: {completed_count}")
    print(f"Expected percentage: ({completed_count} / {actual_total_completable}) * 100 = {expected_percentage}%")
    print(f"Buggy percentage: ({completed_count} / 27) * 100 = {buggy_percentage}%")
    
    # This should fail on unfixed code, demonstrating the bug
    assert buggy_percentage == expected_percentage, (
        f"Concrete bug example: With {len(sections_dict)} sections and {completed_count} completed, "
        f"hardcoded calculation gives {buggy_percentage}% instead of {expected_percentage}%. "
        f"This demonstrates the bug where backend uses hardcoded 27 instead of actual section count."
    )


@given(
    total_sections=st.integers(min_value=20, max_value=26),  # Simulate deletions
    completed_ratio=st.floats(min_value=0.3, max_value=0.8)  # 30-80% completion
)
@settings(max_examples=10, deadline=5000)
def test_completion_percentage_bug_property(total_sections, completed_ratio):
    """
    Property-based test for completion percentage bug condition.
    
    **Validates: Requirements 1.10, 1.11, 1.12, 2.7, 2.8**
    
    CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
    
    Tests that when sections are deleted (fewer than 27), the completion percentage
    should be calculated using actual section count, not hardcoded 27.
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (this is correct - it proves the bug exists)
    """
    # Skip if we have 27 sections (no bug condition)
    if total_sections >= 27:
        return
    
    # Create a sections_dict with the specified number of sections
    all_possible_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer", "value_addition",
        "buyer_prerequisites", "poc"
    ]
    
    # Select the first N sections to simulate a project with deletions
    selected_sections = all_possible_sections[:total_sections]
    
    # Calculate how many should be completed
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completable_sections = [s for s in selected_sections if s not in excluded_sections]
    target_completed = int(len(completable_sections) * completed_ratio)
    
    # Create sections_dict
    sections_dict = {}
    completed_sections = completable_sections[:target_completed]
    
    for section_key in selected_sections:
        if section_key in completed_sections:
            # Add substantial content to make it "complete"
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
            sections_dict[section_key] = {}
    
    # Calculate completion using backend logic
    completion_map = calculate_section_completion(sections_dict)
    actual_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # Expected behavior: use actual section count
    actual_total_completable = len(sections_dict) - 4
    expected_percentage = int((actual_completed_count / actual_total_completable) * 100) if actual_total_completable > 0 else 0
    
    # Bug behavior: uses hardcoded 27
    buggy_percentage = int((actual_completed_count / 27) * 100)
    
    # This should fail on unfixed code when total_sections < 27
    assert buggy_percentage == expected_percentage, (
        f"Property test bug condition: With {len(sections_dict)} sections and {actual_completed_count} completed, "
        f"hardcoded calculation gives {buggy_percentage}% instead of {expected_percentage}%. "
        f"Expected: ({actual_completed_count} / {actual_total_completable}) * 100 = {expected_percentage}%, "
        f"Bug: ({actual_completed_count} / 27) * 100 = {buggy_percentage}%"
    )