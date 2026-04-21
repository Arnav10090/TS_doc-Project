"""
Revision History Auto-Tracking Service

This module provides automatic revision history management for technical specification
documents. It handles the creation and management of revision history entries when
projects are created or modified.

Key responsibilities:
- Create initial revision entry on project creation
- Append new revision entries on project modification
- Generate ordinal text for revision details (First issue, Second issue, etc.)
- Format dates consistently (DD-MM-YYYY)
- Calculate next revision number from existing entries
"""

from datetime import datetime
from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.sections import service as section_service


def generate_ordinal_text(number: int) -> str:
    """
    Generate ordinal text for revision details.
    
    Converts integers to ordinal text with "issue" suffix:
    - 1-20: Named ordinals ("First issue", "Second issue", etc.)
    - 21+: Numeric ordinals ("21st issue", "22nd issue", etc.)
    
    Args:
        number: The revision number (1-based)
        
    Returns:
        Formatted ordinal text with " issue" suffix
        
    Examples:
        >>> generate_ordinal_text(1)
        'First issue'
        >>> generate_ordinal_text(21)
        '21st issue'
        >>> generate_ordinal_text(22)
        '22nd issue'
        >>> generate_ordinal_text(11)
        '11th issue'
    """
    ordinals = [
        "First", "Second", "Third", "Fourth", "Fifth",
        "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
        "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth",
        "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth"
    ]
    
    if 1 <= number <= 20:
        return f"{ordinals[number - 1]} issue"
    
    # Numeric ordinals for 21+
    # Special case: numbers ending in 11, 12, 13 always use "th"
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    
    return f"{number}{suffix} issue"


def format_date_dd_mm_yyyy() -> str:
    """
    Format current date as DD-MM-YYYY.
    
    Uses the current system date and formats it with zero-padded
    day and month values.
    
    Returns:
        Date string in DD-MM-YYYY format
        
    Examples:
        >>> format_date_dd_mm_yyyy()  # If today is Jan 5, 2025
        '05-01-2025'
        >>> format_date_dd_mm_yyyy()  # If today is Dec 25, 2025
        '25-12-2025'
    """
    now = datetime.now()
    return now.strftime("%d-%m-%Y")


def calculate_next_revision_number(existing_rows: List[dict]) -> int:
    """
    Calculate the next revision number from existing entries.
    
    Extracts rev_no values from existing revision entries, converts them
    to integers, and returns the maximum value plus 1. Returns 1 if no
    entries exist or all rev_no values are invalid.
    
    Args:
        existing_rows: List of revision entry dictionaries with 'rev_no' field
        
    Returns:
        Next revision number (1-based)
        
    Examples:
        >>> calculate_next_revision_number([])
        1
        >>> calculate_next_revision_number([{'rev_no': '0'}, {'rev_no': '1'}])
        2
        >>> calculate_next_revision_number([{'rev_no': '0'}, {'rev_no': '5'}])
        6
        >>> calculate_next_revision_number([{'rev_no': 'invalid'}])
        1
    """
    if not existing_rows:
        return 1
    
    valid_rev_numbers = []
    for row in existing_rows:
        try:
            rev_no = int(row.get('rev_no', 0))
            valid_rev_numbers.append(rev_no)
        except (ValueError, TypeError):
            # Skip invalid rev_no values
            continue
    
    if not valid_rev_numbers:
        return 1
    
    return max(valid_rev_numbers) + 1



async def create_initial_revision_entry(
    db: AsyncSession,
    project_id: UUID
) -> None:
    """
    Create the initial revision entry for a new project.
    
    Creates a revision entry with:
    - details: "First issue"
    - date: current date in DD-MM-YYYY format
    - rev_no: "0"
    - User-editable fields: empty strings (sr_no, revised_by, checked_by, approved_by)
    
    This function is called automatically when a new project is created to
    establish the initial revision history entry.
    
    Args:
        db: Database session
        project_id: UUID of the project
        
    Requirements:
        - 1.1: Create revision entry on project creation
        - 1.2: Set date to current date in DD-MM-YYYY format
        - 1.3: Set rev_no to "0"
        - 1.4: Leave user-editable fields empty
        - 1.5: Store in database within same transaction
    """
    # Create initial revision entry
    initial_entry = {
        "sr_no": "",
        "revised_by": "",
        "checked_by": "",
        "approved_by": "",
        "details": "First issue",
        "date": format_date_dd_mm_yyyy(),
        "rev_no": "0"
    }
    
    # Create revision history content with initial entry
    revision_history_content = {
        "rows": [initial_entry]
    }
    
    # Upsert revision_history section
    await section_service.upsert_section(
        db=db,
        project_id=project_id,
        section_key="revision_history",
        content=revision_history_content
    )


async def append_revision_entry(
    db: AsyncSession,
    project_id: UUID
) -> None:
    """
    Append a new revision entry to an existing project.
    
    This function:
    1. Fetches existing revision history
    2. Calculates the next revision number
    3. Generates ordinal text for details (Second issue, Third issue, etc.)
    4. Formats the current date
    5. Appends the new entry to the rows array
    6. Updates the section data
    
    This function is called automatically when a project is modified
    (e.g., when any section is updated).
    
    Args:
        db: Database session
        project_id: UUID of the project
        
    Requirements:
        - 2.1: Create new revision entry on modification
        - 2.2: Set details to auto-incremented ordinal text
        - 2.3: Set date to current date in DD-MM-YYYY format
        - 2.4: Set rev_no to auto-incremented number
        - 2.5: Preserve existing entries
        - 2.6: Leave user-editable fields empty in new entry
    """
    # Fetch existing revision_history section
    section = await section_service.get_section(
        db=db,
        project_id=project_id,
        section_key="revision_history"
    )
    
    # Extract existing rows array
    existing_content = section.content or {}
    existing_rows = existing_content.get("rows", [])
    
    # Calculate next revision number
    next_rev_no = calculate_next_revision_number(existing_rows)
    
    # Generate ordinal text (1-based for display: "First", "Second", etc.)
    ordinal_text = generate_ordinal_text(next_rev_no)
    
    # Format current date
    current_date = format_date_dd_mm_yyyy()
    
    # Create new revision entry
    new_entry = {
        "sr_no": "",
        "revised_by": "",
        "checked_by": "",
        "approved_by": "",
        "details": ordinal_text,
        "date": current_date,
        "rev_no": str(next_rev_no)
    }
    
    # Append to rows array
    updated_rows = existing_rows + [new_entry]
    
    # Update revision history content
    updated_content = {
        "rows": updated_rows
    }
    
    # Update section data
    await section_service.upsert_section(
        db=db,
        project_id=project_id,
        section_key="revision_history",
        content=updated_content
    )


async def ensure_revision_history_exists(
    db: AsyncSession,
    project_id: UUID
) -> None:
    """
    Ensure revision history exists for legacy projects.
    
    This function provides backward compatibility by checking if a project
    has revision history. If the revision_history section doesn't exist or
    has no rows, it creates an initial revision entry. If existing entries
    are found, they are preserved without modification.
    
    This function should be called when opening existing projects to ensure
    they have revision history tracking enabled.
    
    Args:
        db: Database session
        project_id: UUID of the project
        
    Requirements:
        - 9.1: Create initial entry for projects without revision history
        - 9.2: Preserve existing manual entries
        - 9.3: Calculate next rev_no from existing entries
        - 9.4: Do not duplicate "First issue" if already exists
    """
    # Fetch existing revision_history section
    section = await section_service.get_section(
        db=db,
        project_id=project_id,
        section_key="revision_history"
    )
    
    # Check if content exists and has rows
    existing_content = section.content or {}
    existing_rows = existing_content.get("rows", [])
    
    # If no rows exist, create initial entry
    if not existing_rows:
        await create_initial_revision_entry(db, project_id)
