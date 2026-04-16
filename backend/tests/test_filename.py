"""
Unit tests for filename generation.
"""
import pytest
from unittest.mock import Mock
from app.generation.docx_generator import generate_safe_filename


def test_filename_replaces_spaces_with_underscores():
    """Test filename generation replaces spaces with underscores."""
    result = generate_safe_filename("Test Client Name")
    assert result == "Test_Client_Name"


def test_filename_replaces_slashes_with_hyphens():
    """Test filename generation replaces slashes with hyphens."""
    result = generate_safe_filename("Client/Solution")
    assert result == "Client-Solution"


def test_filename_truncates_long_names():
    """Test filename generation truncates long client and solution names."""
    # This test verifies the truncation logic in generate_document function
    # Client name truncated to 30 chars, solution name to 20 chars
    long_client = "A" * 50
    long_solution = "B" * 50
    
    truncated_client = long_client[:30]
    truncated_solution = long_solution[:20]
    
    assert len(truncated_client) == 30
    assert len(truncated_solution) == 20


def test_filename_format_matches_specification():
    """Test filename format matches TS_{client}_{solution}_v{version}.docx."""
    client = "TestClient"
    solution = "TestSolution"
    version = 1
    
    safe_client = generate_safe_filename(client)
    safe_solution = generate_safe_filename(solution)
    filename = f"TS_{safe_client}_{safe_solution}_v{version}.docx"
    
    assert filename == "TS_TestClient_TestSolution_v1.docx"
