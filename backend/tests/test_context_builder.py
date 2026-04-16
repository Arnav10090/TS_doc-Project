"""
Unit tests for context builder.
"""
import pytest
from pathlib import Path
from unittest.mock import Mock
from app.generation.context_builder import build_context, finalize_context_with_images


def test_context_builder_maps_project_fields_correctly():
    """Test context builder maps all project fields to correct variables."""
    project = Mock()
    project.id = "test-id"
    project.solution_name = "TestSolution"
    project.solution_full_name = "Test Solution Full"
    project.client_name = "TestClient"
    project.client_location = "TestLocation"
    
    context = build_context(project, {}, "/tmp/uploads")
    
    assert context["SolutionName"] == "TestSolution"
    assert context["SolutionFullName"] == "Test Solution Full"
    assert context["ClientName"] == "TestClient"
    assert context["ClientLocation"] == "TestLocation"


def test_context_builder_pads_tech_stack_to_6_rows():
    """Test context builder pads tech_stack to exactly 6 rows."""
    project = Mock()
    project.id = "test-id"
    project.solution_name = "Test"
    project.solution_full_name = "Test"
    project.client_name = "Client"
    project.client_location = "Location"
    
    sections = {
        "tech_stack": {
            "rows": [
                {"component": "C1", "technology": "T1"},
                {"component": "C2", "technology": "T2"}
            ]
        }
    }
    
    context = build_context(project, sections, "/tmp/uploads")
    
    assert len(context["ts_rows"]) == 6
    assert context["ts_rows"][0]["component"] == "C1"
    assert context["ts_rows"][1]["component"] == "C2"
    assert context["ts_rows"][2]["component"] == ""
    assert context["ts_rows"][5]["technology"] == ""


def test_context_builder_handles_missing_sections_with_empty_defaults():
    """Test context builder uses empty defaults for missing sections."""
    project = Mock()
    project.id = "test-id"
    project.solution_name = "Test"
    project.solution_full_name = "Test"
    project.client_name = "Client"
    project.client_location = "Location"
    
    context = build_context(project, {}, "/tmp/uploads")
    
    assert context["ExecutiveSummaryPara1"] == ""
    assert context["TenderReference"] == ""
    assert context["ProcessFlowDescription"] == ""
    assert context["features"] == []


def test_context_builder_creates_inline_image_when_file_exists(tmp_path):
    """Test context builder creates InlineImage path when file exists."""
    project = Mock()
    project.id = "test-project-id"
    project.solution_name = "Test"
    project.solution_full_name = "Test"
    project.client_name = "Client"
    project.client_location = "Location"
    
    # Create test image file
    images_dir = tmp_path / "images" / "test-project-id"
    images_dir.mkdir(parents=True)
    arch_file = images_dir / "architecture.png"
    arch_file.write_bytes(b"fake image data")
    
    context = build_context(project, {}, str(tmp_path))
    
    # Should contain path string (will be converted to InlineImage later)
    assert "architecture.png" in context["architecture_diagram"]


def test_context_builder_uses_placeholder_when_image_missing():
    """Test context builder uses placeholder when image file is missing."""
    project = Mock()
    project.id = "test-project-id"
    project.solution_name = "Test"
    project.solution_full_name = "Test"
    project.client_name = "Client"
    project.client_location = "Location"
    
    context = build_context(project, {}, "/nonexistent/path")
    
    assert context["architecture_diagram"] == "[Architecture Diagram — To Be Inserted]"


def test_context_builder_creates_gantt_images_when_files_exist(tmp_path):
    """Test context builder creates gantt image paths when files exist."""
    project = Mock()
    project.id = "test-project-id"
    project.solution_name = "Test"
    project.solution_full_name = "Test"
    project.client_name = "Client"
    project.client_location = "Location"
    
    # Create test gantt files
    images_dir = tmp_path / "images" / "test-project-id"
    images_dir.mkdir(parents=True)
    (images_dir / "gantt_overall.png").write_bytes(b"fake gantt")
    (images_dir / "gantt_shutdown.png").write_bytes(b"fake gantt")
    
    context = build_context(project, {}, str(tmp_path))
    
    assert "gantt_overall.png" in context["overall_gantt"]
    assert "gantt_shutdown.png" in context["shutdown_gantt"]


def test_context_builder_uses_placeholders_for_missing_gantt_images():
    """Test context builder uses placeholders for missing gantt images."""
    project = Mock()
    project.id = "test-project-id"
    project.solution_name = "Test"
    project.solution_full_name = "Test"
    project.client_name = "Client"
    project.client_location = "Location"
    
    context = build_context(project, {}, "/nonexistent/path")
    
    assert context["overall_gantt"] == "[Overall Gantt Chart — To Be Inserted]"
    assert context["shutdown_gantt"] == "[Shutdown Gantt Chart — To Be Inserted]"
