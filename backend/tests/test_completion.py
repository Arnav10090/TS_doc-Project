"""
Unit tests for completion calculation logic.
"""
import pytest
from app.generation.completion import calculate_section_completion, strip_html


def test_cover_section_complete_when_all_fields_present():
    """Test cover section is complete when all required fields are present."""
    sections = {
        "cover": {
            "solution_full_name": "Test Solution",
            "client_name": "Test Client",
            "client_location": "Test Location"
        }
    }
    result = calculate_section_completion(sections)
    assert result["cover"] is True


def test_cover_section_incomplete_when_missing_client_name():
    """Test cover section is incomplete when client_name is missing."""
    sections = {
        "cover": {
            "solution_full_name": "Test Solution",
            "client_location": "Test Location"
        }
    }
    result = calculate_section_completion(sections)
    assert result["cover"] is False


def test_features_section_complete_with_valid_item():
    """Test features section is complete with at least one valid item."""
    sections = {
        "features": {
            "items": [
                {"title": "Feature 1", "description": "Description 1"}
            ]
        }
    }
    result = calculate_section_completion(sections)
    assert result["features"] is True


def test_features_section_incomplete_with_empty_title():
    """Test features section is incomplete when item has empty title."""
    sections = {
        "features": {
            "items": [
                {"title": "", "description": "Description 1"}
            ]
        }
    }
    result = calculate_section_completion(sections)
    assert result["features"] is False


def test_html_stripping_in_rich_text_fields():
    """Test HTML tags are stripped from rich text fields."""
    html_text = "<p>This is <strong>bold</strong> text</p>"
    result = strip_html(html_text)
    assert result == "This is bold text"


def test_empty_html_tags_mark_section_incomplete():
    """Test empty HTML tags result in incomplete section."""
    sections = {
        "executive_summary": {
            "para1": "<p></p>"
        }
    }
    result = calculate_section_completion(sections)
    assert result["executive_summary"] is False


def test_locked_sections_auto_complete_when_visited():
    """Test locked sections auto-complete when Section_Data record exists."""
    sections = {
        "documentation_control": {}
    }
    result = calculate_section_completion(sections)
    assert result["documentation_control"] is True


def test_completion_summary_counts_27_sections():
    """Test completion calculation handles all 27 completable sections."""
    # Create sections dict with all 31 sections
    sections = {
        "cover": {"solution_full_name": "Test", "client_name": "Client", "client_location": "Location"},
        "revision_history": {"rows": [{"details": "v1"}]},
        "executive_summary": {"para1": "<p>Summary</p>"},
        "introduction": {"tender_reference": "REF", "tender_date": "2024-01-01"},
        "abbreviations": {"rows": [{}] * 13 + [{"abbreviation": "TS"}]},
        "process_flow": {"text": "<p>Flow</p>"},
        "overview": {"system_objective": "Obj", "existing_system": "Sys"},
        "features": {"items": [{"title": "F1", "description": "D1"}]},
        "remote_support": {"text": "Support"},
        "documentation_control": {},
        "customer_training": {"persons": "5", "days": "3"},
        "system_config": {},
        "fat_condition": {"text": "FAT"},
        "tech_stack": {"rows": [{"component": "C1", "technology": "T1"}]},
        "hardware_specs": {"rows": [{"specs_line1": "S1", "maker": "M1"}]},
        "software_specs": {"rows": [{"name": "SW1"}]},
        "third_party_sw": {"sw4_name": "3rd"},
        "overall_gantt": {},
        "shutdown_gantt": {},
        "supervisors": {"pm_days": "10", "dev_days": "20", "comm_days": "5", "total_man_days": "35"},
        "scope_definitions": {},
        "division_of_eng": {},
        "work_completion": {},
        "buyer_obligations": {},
        "exclusion_list": {},
        "binding_conditions": {},
        "cybersecurity": {},
        "disclaimer": {},
        "value_addition": {"text": "<p>Value</p>"},
        "buyer_prerequisites": {"items": ["Prereq1"]},
        "poc": {"name": "POC", "description": "Desc"}
    }
    
    result = calculate_section_completion(sections)
    
    # Count completed sections excluding the 4 auto-complete locked sections
    excluded_sections = {'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'}
    completed_count = sum(1 for k, v in result.items() if v and k not in excluded_sections)
    
    # All 27 completable sections should be complete
    assert completed_count == 27
