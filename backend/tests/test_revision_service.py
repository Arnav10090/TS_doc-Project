"""
Unit tests for revision service module.

Tests the ensure_revision_history_exists() function and related functionality.
"""
import pytest

from app.projects.revision_service import (
    ensure_revision_history_exists,
    create_initial_revision_entry,
)
from app.sections import service as section_service


@pytest.mark.asyncio
async def test_ensure_revision_history_exists_creates_initial_entry(db_session, create_test_project):
    """
    Test that ensure_revision_history_exists creates initial entry for projects without revision history.
    
    Requirements: 9.1 - Create initial entry for projects without revision history
    """
    # Create a test project
    test_project = await create_test_project()
    
    # Ensure the project has no revision history initially
    section = await section_service.get_section(
        db=db_session,
        project_id=test_project.id,
        section_key="revision_history"
    )
    
    # Clear any existing rows
    section.content = {"rows": []}
    await db_session.commit()
    
    # Call ensure_revision_history_exists
    await ensure_revision_history_exists(db_session, test_project.id)
    
    # Verify initial entry was created
    section = await section_service.get_section(
        db=db_session,
        project_id=test_project.id,
        section_key="revision_history"
    )
    
    rows = section.content.get("rows", [])
    assert len(rows) == 1
    assert rows[0]["details"] == "First issue"
    assert rows[0]["rev_no"] == "0"
    assert rows[0]["sr_no"] == ""
    assert rows[0]["revised_by"] == ""
    assert rows[0]["checked_by"] == ""
    assert rows[0]["approved_by"] == ""


@pytest.mark.asyncio
async def test_ensure_revision_history_exists_preserves_existing_entries(db_session, create_test_project):
    """
    Test that ensure_revision_history_exists preserves existing manual entries.
    
    Requirements: 9.2 - Preserve existing manual entries
    """
    # Create a test project
    test_project = await create_test_project()
    
    # Create existing manual entries
    existing_entries = [
        {
            "sr_no": "1",
            "revised_by": "John Doe",
            "checked_by": "Jane Smith",
            "approved_by": "Bob Johnson",
            "details": "First issue",
            "date": "01-01-2025",
            "rev_no": "0"
        },
        {
            "sr_no": "2",
            "revised_by": "Alice Brown",
            "checked_by": "Charlie Wilson",
            "approved_by": "David Lee",
            "details": "Second issue",
            "date": "02-01-2025",
            "rev_no": "1"
        }
    ]
    
    await section_service.upsert_section(
        db=db_session,
        project_id=test_project.id,
        section_key="revision_history",
        content={"rows": existing_entries}
    )
    
    # Call ensure_revision_history_exists
    await ensure_revision_history_exists(db_session, test_project.id)
    
    # Verify existing entries are preserved
    section = await section_service.get_section(
        db=db_session,
        project_id=test_project.id,
        section_key="revision_history"
    )
    
    rows = section.content.get("rows", [])
    assert len(rows) == 2
    assert rows[0]["details"] == "First issue"
    assert rows[0]["revised_by"] == "John Doe"
    assert rows[1]["details"] == "Second issue"
    assert rows[1]["revised_by"] == "Alice Brown"


@pytest.mark.asyncio
async def test_ensure_revision_history_exists_does_not_duplicate_first_issue(db_session, create_test_project):
    """
    Test that ensure_revision_history_exists does not duplicate "First issue" if already exists.
    
    Requirements: 9.4 - Do not duplicate "First issue" if already exists
    """
    # Create a test project
    test_project = await create_test_project()
    
    # Create initial entry manually
    await create_initial_revision_entry(db_session, test_project.id)
    
    # Call ensure_revision_history_exists
    await ensure_revision_history_exists(db_session, test_project.id)
    
    # Verify no duplicate entry was created
    section = await section_service.get_section(
        db=db_session,
        project_id=test_project.id,
        section_key="revision_history"
    )
    
    rows = section.content.get("rows", [])
    assert len(rows) == 1
    assert rows[0]["details"] == "First issue"
