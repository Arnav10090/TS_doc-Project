"""
Tests for revision history session-based tracking.

These tests verify that only ONE revision entry is created per editing session,
regardless of how many section updates occur during that session.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

from app.sections.service import upsert_section, _last_revision_timestamps
from app.sections.models import SectionData


@pytest.mark.asyncio
async def test_single_revision_per_session(db_session):
    """
    Test that multiple section updates within 5 minutes create only ONE revision entry.
    
    Scenario:
    1. Open document (no revision yet)
    2. Make change to section A -> creates revision entry #1
    3. Make change to section B (within 5 min) -> NO new revision
    4. Make change to section C (within 5 min) -> NO new revision
    5. Make change to section D (within 5 min) -> NO new revision
    
    Expected: Only 1 revision entry created (not 4)
    """
    project_id = uuid4()
    
    # Clear any existing timestamps
    _last_revision_timestamps.clear()
    
    # Simulate multiple section updates within 5 minutes
    await upsert_section(db_session, project_id, "overview", {"content": "test1"})
    await upsert_section(db_session, project_id, "features", {"content": "test2"})
    await upsert_section(db_session, project_id, "executive_summary", {"content": "test3"})
    await upsert_section(db_session, project_id, "process_flow", {"content": "test4"})
    
    # Fetch revision history
    from app.sections.service import get_section
    revision_section = await get_section(db_session, project_id, "revision_history")
    rows = revision_section.content.get("rows", [])
    
    # Should have initial entry (rev_no 0) + ONE new entry (rev_no 1)
    assert len(rows) == 2, f"Expected 2 revision entries, got {len(rows)}"
    assert rows[0]["rev_no"] == "0"
    assert rows[1]["rev_no"] == "1"


@pytest.mark.asyncio
async def test_new_revision_after_session_window(db_session):
    """
    Test that a new revision entry is created after the 5-minute session window.
    
    Scenario:
    1. Make change -> creates revision entry #1
    2. Wait 6 minutes (mock time)
    3. Make another change -> creates revision entry #2
    
    Expected: 2 revision entries created
    """
    project_id = uuid4()
    
    # Clear any existing timestamps
    _last_revision_timestamps.clear()
    
    # First change
    await upsert_section(db_session, project_id, "overview", {"content": "test1"})
    
    # Mock time passing (6 minutes later)
    with patch('app.sections.service.datetime') as mock_datetime:
        future_time = datetime.now() + timedelta(minutes=6)
        mock_datetime.now.return_value = future_time
        
        # Second change (should create new revision)
        await upsert_section(db_session, project_id, "features", {"content": "test2"})
    
    # Fetch revision history
    from app.sections.service import get_section
    revision_section = await get_section(db_session, project_id, "revision_history")
    rows = revision_section.content.get("rows", [])
    
    # Should have initial entry (rev_no 0) + TWO new entries (rev_no 1, 2)
    assert len(rows) == 3, f"Expected 3 revision entries, got {len(rows)}"
    assert rows[0]["rev_no"] == "0"
    assert rows[1]["rev_no"] == "1"
    assert rows[2]["rev_no"] == "2"


@pytest.mark.asyncio
async def test_no_revision_for_revision_history_updates(db_session):
    """
    Test that updating the revision_history section itself does NOT create a new revision.
    
    This prevents infinite loops where updating revision history triggers another revision.
    """
    project_id = uuid4()
    
    # Clear any existing timestamps
    _last_revision_timestamps.clear()
    
    # Update revision_history section directly
    await upsert_section(
        db_session, 
        project_id, 
        "revision_history", 
        {"rows": [{"rev_no": "0", "details": "Manual entry"}]}
    )
    
    # Fetch revision history
    from app.sections.service import get_section
    revision_section = await get_section(db_session, project_id, "revision_history")
    rows = revision_section.content.get("rows", [])
    
    # Should only have the manual entry we created
    assert len(rows) == 1
    assert rows[0]["details"] == "Manual entry"


@pytest.mark.asyncio
async def test_first_change_creates_revision(db_session):
    """
    Test that the first change to any section creates a revision entry.
    """
    project_id = uuid4()
    
    # Clear any existing timestamps
    _last_revision_timestamps.clear()
    
    # First change
    await upsert_section(db_session, project_id, "overview", {"content": "first change"})
    
    # Fetch revision history
    from app.sections.service import get_section
    revision_section = await get_section(db_session, project_id, "revision_history")
    rows = revision_section.content.get("rows", [])
    
    # Should have initial entry (rev_no 0) + ONE new entry (rev_no 1)
    assert len(rows) == 2
    assert rows[0]["rev_no"] == "0"
    assert rows[0]["details"] == "First issue"
    assert rows[1]["rev_no"] == "1"
    assert rows[1]["details"] == "Second issue"
