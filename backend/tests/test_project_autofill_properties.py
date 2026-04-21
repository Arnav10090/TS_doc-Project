"""
Property-based tests for Project Form Autofill feature.

This module contains Hypothesis-based property tests that verify correctness
properties across randomized inputs for the project form autofill functionality.
"""
import pytest
from hypothesis import given, settings, strategies as st

from app.projects.schemas import ProjectCreate


def project_create_strategy():
    """
    Hypothesis strategy for generating valid ProjectCreate instances.
    
    Generates random ProjectCreate objects with:
    - Required fields: solution_name, solution_full_name, client_name, client_location
    - Optional fields: solution_abbreviation, client_abbreviation, ref_number, doc_date, doc_version
    
    Returns:
        Strategy that builds ProjectCreate instances
    """
    return st.builds(
        ProjectCreate,
        solution_name=st.text(min_size=1, max_size=100),
        solution_full_name=st.text(min_size=1, max_size=200),
        solution_abbreviation=st.one_of(st.none(), st.text(min_size=0, max_size=20)),
        client_name=st.text(min_size=1, max_size=100),
        client_location=st.text(min_size=1, max_size=100),
        client_abbreviation=st.one_of(st.none(), st.text(min_size=0, max_size=20)),
        ref_number=st.one_of(st.none(), st.text(min_size=0, max_size=50)),
        doc_date=st.one_of(st.none(), st.text(min_size=0, max_size=50)),
        doc_version=st.one_of(st.none(), st.text(min_size=0, max_size=20))
    )


# Sanity test to verify the strategy works
@given(project_data=project_create_strategy())
@settings(max_examples=10)
def test_project_create_strategy_generates_valid_instances(project_data):
    """
    Sanity test: Verify that project_create_strategy generates valid ProjectCreate instances.
    
    This test ensures the Hypothesis strategy correctly generates ProjectCreate objects
    with all required fields populated and optional fields as either None or valid strings.
    """
    # Verify required fields are present and non-empty
    assert project_data.solution_name is not None
    assert len(project_data.solution_name) >= 1
    assert project_data.solution_full_name is not None
    assert len(project_data.solution_full_name) >= 1
    assert project_data.client_name is not None
    assert len(project_data.client_name) >= 1
    assert project_data.client_location is not None
    assert len(project_data.client_location) >= 1
    
    # Verify optional fields are either None or strings
    assert project_data.solution_abbreviation is None or isinstance(project_data.solution_abbreviation, str)
    assert project_data.client_abbreviation is None or isinstance(project_data.client_abbreviation, str)
    assert project_data.ref_number is None or isinstance(project_data.ref_number, str)
    assert project_data.doc_date is None or isinstance(project_data.doc_date, str)
    assert project_data.doc_version is None or isinstance(project_data.doc_version, str)
    
    # Verify the instance is a valid ProjectCreate
    assert isinstance(project_data, ProjectCreate)
