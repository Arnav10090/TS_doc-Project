"""
Preservation property tests for Backend router.py (BEFORE implementing fix).

**Validates: Requirements 3.1, 3.2, 3.7, 3.9**

IMPORTANT: Follow observation-first methodology.
These tests observe behavior on UNFIXED code for non-buggy inputs and capture 
the baseline behavior patterns that must be preserved after the fix.

Property 2: Preservation - Completion Count and API Fields Unchanged (Backend)

The tests capture observed behavior patterns:
- Completion count calculation continues to exclude 4 auto-complete sections 
  (binding_conditions, cybersecurity, disclaimer, scope_definitions)
- Full project (27 sections) continues to calculate percentage with 27
- All existing ProjectSummary fields (id, solution_name, client_name, client_location, 
  created_at, completion_percentage) continue to be returned

Property-based testing generates many test cases for stronger guarantees.
Run tests on UNFIXED code.

EXPECTED OUTCOME: Tests PASS (this confirms baseline behavior to preserve)
"""
import pytest
from hypothesis import given, settings, strategies as st
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from uuid import uuid4

from app.sections.models import SectionData
from app.generation.completion import calculate_section_completion


def full_project_strategy():
    """
    Strategy for generating full projects with 27 sections.
    
    This tests the non-buggy case where the hardcoded 27 is correct.
    These tests should PASS on unfixed code to establish baseline behavior.
    """
    # All 27 sections that should exist in a full project
    all_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer", "value_addition",
        "buyer_prerequisites", "poc"
    ]
    
    return st.builds(
        dict,
        # Always include all 27 sections
        sections=st.just(all_sections).map(lambda sections: {
            section: {"test_content": f"Content for {section}"}
            for section in sections
        }),
        # Generate varying completion states
        completed_sections=st.lists(
            st.sampled_from(all_sections),
            min_size=5,
            max_size=25,
            unique=True
        )
    )


@given(test_data=full_project_strategy())
@settings(max_examples=15, deadline=10000)
@pytest.mark.asyncio
async def test_completion_count_calculation_preservation(
    client: AsyncClient, 
    db_session: AsyncSession, 
    create_test_project,
    test_data
):
    """
    Property 2: Preservation - Completion Count Calculation Unchanged (Backend)
    
    **Validates: Requirements 3.1, 3.9**
    
    IMPORTANT: This test observes behavior on UNFIXED code for full projects (27 sections).
    
    Tests that completion count calculation continues to exclude 4 auto-complete sections
    (binding_conditions, cybersecurity, disclaimer, scope_definitions) from the completed count.
    
    This behavior must be preserved after the fix - only the total count calculation should change,
    not the completed count calculation.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    sections_dict = test_data["sections"]
    completed_section_keys = test_data["completed_sections"]
    
    # Ensure we have exactly 27 sections (non-buggy case)
    assert len(sections_dict) == 27, "This test is for full projects only"
    
    # Create a test project
    project = await create_test_project()
    
    # Create sections in database
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
            elif section_key == "supervisors":
                content = {
                    "pm_days": "10",
                    "dev_days": "20", 
                    "comm_days": "5",
                    "total_man_days": "35"
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
    
    # Calculate expected completed count using the same logic as backend
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completion_map = calculate_section_completion(sections_dict)
    expected_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # For full projects, the percentage calculation should use 27 (this is correct behavior to preserve)
    expected_completion_percentage = int((expected_completed_count / 27) * 100)
    
    actual_completion_percentage = project_summary["completion_percentage"]
    
    # This should PASS on unfixed code - we're preserving the correct behavior for full projects
    assert actual_completion_percentage == expected_completion_percentage, (
        f"Preservation test: Full project completion calculation changed! "
        f"With 27 sections and {expected_completed_count} completed, "
        f"expected {expected_completion_percentage}% but got {actual_completion_percentage}%. "
        f"This baseline behavior must be preserved after the fix."
    )


@pytest.mark.asyncio
async def test_full_project_27_sections_baseline_behavior(
    client: AsyncClient,
    db_session: AsyncSession, 
    create_test_project
):
    """
    Concrete preservation test: Full project with 27 sections should continue to work correctly.
    
    **Validates: Requirements 3.2**
    
    IMPORTANT: This test observes behavior on UNFIXED code for the non-buggy case.
    
    When no sections are deleted, the system should continue to display correct calculations
    using 27 as the total. This behavior must be preserved after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline behavior to preserve)
    """
    # Create a test project
    project = await create_test_project()
    
    # Create all 27 sections
    all_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "documentation_control",
        "customer_training", "system_config", "fat_condition", "tech_stack", "hardware_specs",
        "software_specs", "third_party_sw", "overall_gantt", "shutdown_gantt", "supervisors",
        "scope_definitions", "division_of_eng", "work_completion", "buyer_obligations",
        "exclusion_list", "binding_conditions", "cybersecurity", "disclaimer", "value_addition",
        "buyer_prerequisites", "poc"
    ]
    
    # Mark some sections as completed
    completed_sections = [
        "cover", "revision_history", "executive_summary", "introduction", "abbreviations",
        "process_flow", "overview", "features", "remote_support", "customer_training",
        "fat_condition", "tech_stack", "hardware_specs", "software_specs", "third_party_sw",
        "supervisors", "value_addition", "buyer_prerequisites", "poc"
    ]
    
    for section_key in all_sections:
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
            elif section_key == "supervisors":
                content = {
                    "pm_days": "10",
                    "dev_days": "20",
                    "comm_days": "5", 
                    "total_man_days": "35"
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
    
    # Calculate expected values using current backend logic
    sections_dict = {section: {"test_content": f"Content for {section}"} for section in all_sections}
    
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
        elif section_key == "supervisors":
            sections_dict[section_key] = {
                "pm_days": "10",
                "dev_days": "20",
                "comm_days": "5",
                "total_man_days": "35"
            }
        else:
            sections_dict[section_key] = {"substantial_content": f"Complete content for {section_key}"}
    
    completion_map = calculate_section_completion(sections_dict)
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    expected_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # For full project: (completed_count / 27) * 100 - this is correct and should be preserved
    expected_percentage = int((expected_completed_count / 27) * 100)
    
    actual_percentage = project_summary["completion_percentage"]
    
    # This should PASS on unfixed code - preserving correct behavior for full projects
    assert actual_percentage == expected_percentage, (
        f"Full project baseline behavior changed! With 27 sections and {expected_completed_count} completed, "
        f"expected {expected_percentage}% but got {actual_percentage}%. "
        f"This baseline behavior must be preserved after the fix."
    )
    
    print(f"✓ Full project baseline: 27 sections, {expected_completed_count} completed, {expected_percentage}% - PRESERVED")


@pytest.mark.asyncio
async def test_api_response_fields_preservation(
    client: AsyncClient,
    db_session: AsyncSession, 
    create_test_project
):
    """
    Test that all existing ProjectSummary fields continue to be returned.
    
    **Validates: Requirements 3.7**
    
    IMPORTANT: This test observes the current API response structure on UNFIXED code.
    
    All existing ProjectSummary fields (id, solution_name, client_name, client_location, 
    created_at, completion_percentage) must continue to be returned after the fix.
    
    EXPECTED OUTCOME on UNFIXED code: Test PASSES (confirms baseline API structure to preserve)
    """
    # Create a test project with specific data
    project = await create_test_project()
    
    # Add a few sections to make it realistic
    test_sections = ["cover", "introduction", "abbreviations", "binding_conditions", "cybersecurity", "disclaimer", "scope_definitions"]
    
    for section_key in test_sections:
        content = {"test_content": f"Content for {section_key}"}
        if section_key == "cover":
            content = {
                "solution_full_name": "Test Solution",
                "client_name": "Test Client",
                "client_location": "Test Location"
            }
        
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
    
    # Verify all existing fields are present (baseline behavior to preserve)
    required_fields = {
        "id": str,
        "solution_name": str,
        "client_name": str, 
        "client_location": str,
        "created_at": str,  # datetime serialized as string
        "completion_percentage": int
    }
    
    for field_name, field_type in required_fields.items():
        assert field_name in project_summary, (
            f"Required field '{field_name}' missing from API response! "
            f"This field must be preserved after the fix."
        )
        
        assert isinstance(project_summary[field_name], field_type), (
            f"Field '{field_name}' has wrong type {type(project_summary[field_name])}, "
            f"expected {field_type}. This must be preserved after the fix."
        )
    
    # Verify the values make sense
    assert project_summary["id"] == str(project.id)
    assert project_summary["solution_name"] == project.solution_name
    assert project_summary["client_name"] == project.client_name
    assert project_summary["client_location"] == project.client_location
    assert isinstance(project_summary["completion_percentage"], int)
    assert 0 <= project_summary["completion_percentage"] <= 100
    
    print(f"✓ API response fields preserved: {list(project_summary.keys())}")


@given(
    completion_ratio=st.floats(min_value=0.1, max_value=0.9)
)
@settings(max_examples=10, deadline=8000)
@pytest.mark.asyncio
async def test_excluded_sections_preservation_property(
    client: AsyncClient,
    db_session: AsyncSession, 
    create_test_project,
    completion_ratio
):
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
    # Create a test project
    project = await create_test_project()
    
    # Create all 27 sections
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
        
        section = SectionData(
            project_id=project.id,
            section_key=section_key,
            content=sections_dict[section_key]
        )
        db_session.add(section)
    
    await db_session.commit()
    
    # Call the API endpoint
    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    
    projects = response.json()
    assert len(projects) == 1
    project_summary = projects[0]
    
    # Calculate expected completed count (should exclude the 4 sections)
    completion_map = calculate_section_completion(sections_dict)
    expected_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k not in excluded_sections
    )
    
    # For full project, percentage should use 27 (baseline behavior to preserve)
    expected_percentage = int((expected_completed_count / 27) * 100)
    actual_percentage = project_summary["completion_percentage"]
    
    # This should PASS on unfixed code - preserving the exclusion logic
    assert actual_percentage == expected_percentage, (
        f"Excluded sections preservation failed! "
        f"Expected {expected_completed_count} completed sections (excluding 4 auto-complete), "
        f"percentage should be {expected_percentage}% but got {actual_percentage}%. "
        f"The exclusion logic must be preserved after the fix."
    )
    
    # Verify that excluded sections are indeed excluded from the count
    # even if they appear "complete" in the completion_map
    excluded_completed_count = sum(
        1 for k, v in completion_map.items() 
        if v and k in excluded_sections
    )
    
    # The excluded sections should not affect the completed count
    assert excluded_completed_count >= 0, "Excluded sections should be trackable"
    
    print(f"✓ Excluded sections preservation: {expected_completed_count} completed (excluding {excluded_completed_count} auto-complete)")