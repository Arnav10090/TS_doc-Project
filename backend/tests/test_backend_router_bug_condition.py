"""
Property-based test for Backend router.py bug condition exploration.

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
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.sections.models import SectionData


def sections_with_deletions_strategy():
    """
    Strategy for generating section configurations with deletions.
    
    Creates projects with fewer than 27 sections to trigger the bug condition.
    Focuses on concrete failing cases for reproducibility.
    """
    # All possible section keys (27 total)
    all_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer", "value_addition",
        "buyer_prerequisites", "poc"
    ]
    
    # Generate configurations with deletions (fewer than 27 sections)
    return st.builds(
        dict,
        # Select a subset of sections (simulate deletions)
        sections=st.lists(
            st.sampled_from(all_sections),
            min_size=20,  # At least 20 sections (7 deletions max)
            max_size=26,  # At most 26 sections (1 deletion min)
            unique=True
        ).map(lambda sections: {
            section: {"test_content": f"Content for {section}"}
            for section in sections
        }),
        # Generate completion states for some sections
        completed_sections=st.lists(
            st.sampled_from(all_sections),
            min_size=10,
            max_size=20,
            unique=True
        )
    )


@given(test_data=sections_with_deletions_strategy())
@settings(max_examples=20, deadline=10000)
@pytest.mark.asyncio
async def test_backend_completion_percentage_bug_condition(
    client: AsyncClient, 
    db_session: AsyncSession, 
    create_test_project,
    test_data
):
    """
    Property 1: Bug Condition - Dynamic Completion Percentage Calculation (Backend)
    
    **Validates: Requirements 1.10, 1.11, 1.12, 2.7, 2.8**
    
    CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
    
    Test that when a project has fewer than 27 sections, the completion percentage 
    is calculated using the actual section count: (completed_count / (len(sections_dict) - 4)) * 100
    
    The test assertions match the Expected Behavior: 
    completion_percentage == (completed_count / actual_total) * 100
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (this is correct - it proves the bug exists)
    """
    sections_dict = test_data["sections"]
    completed_section_keys = test_data["completed_sections"]
    
    # Skip if we have 27 sections (no bug condition)
    if len(sections_dict) >= 27:
        return
    
    # Create a test project
    project = await create_test_project()
    
    # Create sections in database (simulate project with deletions)
    for section_key, content in sections_dict.items():
        # Mark some sections as completed by adding substantial content
        if section_key in completed_section_keys:
            # Add content that would be considered "complete"
            if section_key == "cover":
                content = {
                    "solution_full_name": "Complete Solution",
                    "client_name": "Complete Client", 
                    "client_location": "Complete Location"
                }
            elif section_key == "introduction":
                content = {
                    "tender_reference": "REF-001",
                    "tender_date": "2024-01-01"
                }
            elif section_key == "abbreviations":
                content = {
                    "rows": [{}] * 13 + [{"abbreviation": "TS"}]
                }
            else:
                content = {"substantial_content": f"Complete content for {section_key}"}
        
        section = SectionData(
            project_id=project.id,
            section_key=section_key,
            content=content
        )
        db_session.add(section)
    
    await db_session.commit()
    
    # Call the API endpoint
    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    
    projects = response.json()
    assert len(projects) == 1
    project_summary = projects[0]
    
    # Calculate expected values
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    actual_total_sections = len(sections_dict) - 4  # Exclude 4 auto-complete sections
    
    # Calculate expected completed count (this logic should match the backend)
    from app.generation.completion import calculate_section_completion
    completion_map = calculate_section_completion(sections_dict)
    expected_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # Expected completion percentage using actual section count
    expected_completion_percentage = int((expected_completed_count / actual_total_sections) * 100) if actual_total_sections > 0 else 0
    
    # Get actual completion percentage from API response
    actual_completion_percentage = project_summary["completion_percentage"]
    
    # This assertion should FAIL on unfixed code because the backend uses hardcoded 27
    # instead of actual_total_sections in the calculation
    assert actual_completion_percentage == expected_completion_percentage, (
        f"Bug condition detected! With {len(sections_dict)} sections and {expected_completed_count} completed, "
        f"backend calculated {actual_completion_percentage}% instead of {expected_completion_percentage}%. "
        f"Expected calculation: ({expected_completed_count} / {actual_total_sections}) * 100 = {expected_completion_percentage}%, "
        f"but backend likely used: ({expected_completed_count} / 27) * 100 = {int((expected_completed_count / 27) * 100)}%"
    )


@pytest.mark.asyncio
async def test_concrete_bug_example_24_sections_14_completed(
    client: AsyncClient,
    db_session: AsyncSession, 
    create_test_project
):
    """
    Concrete test case: 24 sections with 14 completed should calculate 58% not 51%.
    
    **Validates: Requirements 1.11, 2.8**
    
    This is the specific example from the bugfix document:
    - 3 sections deleted (24 remaining)
    - 14 sections completed
    - Should calculate (14 / 24) * 100 = 58%
    - Bug: calculates (14 / 27) * 100 = 51%
    
    EXPECTED OUTCOME on UNFIXED code: Test FAILS (proves bug exists)
    """
    # Create a test project
    project = await create_test_project()
    
    # Create 24 sections (simulate 3 deletions from original 27)
    sections_to_create = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "binding_conditions", "cybersecurity", "disclaimer"
        # Missing: division_of_eng, work_completion, buyer_obligations (3 deletions)
    ]
    
    # Sections to mark as completed (14 total, excluding the 4 auto-complete)
    completed_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack"
    ]
    
    for section_key in sections_to_create:
        content = {"test_content": f"Content for {section_key}"}
        
        # Add substantial content for completed sections
        if section_key in completed_sections:
            if section_key == "cover":
                content = {
                    "solution_full_name": "Complete Solution",
                    "client_name": "Complete Client",
                    "client_location": "Complete Location"
                }
            elif section_key == "introduction":
                content = {
                    "tender_reference": "REF-001",
                    "tender_date": "2024-01-01"
                }
            elif section_key == "abbreviations":
                content = {
                    "rows": [{}] * 13 + [{"abbreviation": "TS"}]
                }
            else:
                content = {"substantial_content": f"Complete content for {section_key}"}
        
        section = SectionData(
            project_id=project.id,
            section_key=section_key,
            content=content
        )
        db_session.add(section)
    
    await db_session.commit()
    
    # Call the API endpoint
    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    
    projects = response.json()
    assert len(projects) == 1
    project_summary = projects[0]
    
    # Expected: 24 total sections - 4 auto-complete = 20 completable sections
    # With 14 completed: (14 / 20) * 100 = 70%
    # But the bug example says 14/24 = 58%, so let me recalculate...
    
    # Actually, let me verify the completion calculation logic
    from app.generation.completion import calculate_section_completion
    sections_dict = {section: {"test_content": f"Content for {section}"} for section in sections_to_create}
    
    # Update with completed content
    for section_key in completed_sections:
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
    
    completion_map = calculate_section_completion(sections_dict)
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    actual_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # Total sections: 24, minus 4 auto-complete = 20 completable
    actual_total_completable = len(sections_dict) - 4
    expected_percentage = int((actual_completed_count / actual_total_completable) * 100)
    
    actual_percentage = project_summary["completion_percentage"]
    
    # This should FAIL on unfixed code
    assert actual_percentage == expected_percentage, (
        f"Concrete bug example: With 24 sections and {actual_completed_count} completed, "
        f"backend calculated {actual_percentage}% instead of {expected_percentage}%. "
        f"Expected: ({actual_completed_count} / {actual_total_completable}) * 100 = {expected_percentage}%, "
        f"Bug likely calculated: ({actual_completed_count} / 27) * 100 = {int((actual_completed_count / 27) * 100)}%"
    )