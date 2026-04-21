# Revision History Session-Based Tracking Fix

## Problem

The revision history table was creating a new row for **every single section change**, which meant:
- Opening a document and making 4 changes → 4 new revision rows
- This was incorrect behavior - should only create 1 row per editing session

## Solution

Implemented **session-based tracking** with a 5-minute window:

### How It Works

1. **First Change in Session**
   - User opens document and makes a change
   - System creates ONE revision entry
   - Timestamp is recorded

2. **Subsequent Changes (Within 5 Minutes)**
   - User makes more changes to any section
   - System checks: "Has it been less than 5 minutes since last revision?"
   - If YES → NO new revision entry created
   - All changes are part of the same editing session

3. **New Session (After 5 Minutes)**
   - User makes a change after 5+ minutes of inactivity
   - System creates a NEW revision entry
   - This represents a new editing session

### Example Timeline

```
Time    Action                          Revision Entry Created?
------  ------------------------------  -----------------------
10:00   Open document, edit Overview    ✓ YES (Entry #1)
10:02   Edit Features section           ✗ NO (same session)
10:03   Edit Executive Summary          ✗ NO (same session)
10:04   Edit Process Flow               ✗ NO (same session)
10:10   Edit Overview again             ✓ YES (Entry #2 - new session)
```

## Technical Implementation

### Changes Made

**File: `backend/app/sections/service.py`**

1. **Added Session Tracking Dictionary**
   ```python
   _last_revision_timestamps: Dict[UUID, datetime] = {}
   ```
   - Tracks the last revision creation time for each project
   - In-memory storage (resets on server restart)

2. **Added `_maybe_create_revision_entry()` Function**
   - Checks if enough time has passed since last revision
   - Only creates revision if:
     - No previous revision exists for this project, OR
     - More than 5 minutes have passed since last revision

3. **Modified `upsert_section()` Function**
   - Changed from calling `append_revision_entry()` directly
   - Now calls `_maybe_create_revision_entry()` instead
   - Still excludes `revision_history` section updates

### Session Window Configuration

**Current Setting: 5 minutes**

This means:
- Changes within 5 minutes = same editing session = 1 revision entry
- Changes after 5+ minutes = new editing session = new revision entry

To adjust the window, modify this line in `backend/app/sections/service.py`:
```python
session_window = timedelta(minutes=5)  # Change to desired duration
```

## Behavior Summary

### ✅ Correct Behavior (After Fix)

| Scenario | Revision Entries Created |
|----------|-------------------------|
| Open doc, make 1 change | 1 entry |
| Open doc, make 4 changes (within 5 min) | 1 entry |
| Open doc, make change, wait 6 min, make another change | 2 entries |
| Edit revision_history section directly | 0 entries (no loop) |

### ❌ Previous Behavior (Before Fix)

| Scenario | Revision Entries Created |
|----------|-------------------------|
| Open doc, make 1 change | 1 entry |
| Open doc, make 4 changes | 4 entries ❌ |
| Open doc, make change, wait 6 min, make another change | 2 entries |

## Testing

**Test File: `backend/tests/test_revision_session_tracking.py`**

Tests cover:
1. ✅ Multiple changes within 5 minutes → 1 revision entry
2. ✅ Changes after 5+ minutes → new revision entry
3. ✅ Updating revision_history section → no new revision
4. ✅ First change always creates revision entry

### Running Tests

```bash
cd backend
pytest backend/tests/test_revision_session_tracking.py -v
```

## Edge Cases Handled

1. **Server Restart**
   - Session timestamps are in-memory
   - After restart, first change creates new revision (expected behavior)

2. **Multiple Projects**
   - Each project has its own session timestamp
   - Changes to Project A don't affect Project B's session

3. **Revision History Updates**
   - Updating revision_history section never creates new revision
   - Prevents infinite loops

4. **No Changes Made**
   - If user opens document but makes no changes
   - No revision entry is created (correct)

## Migration Notes

### For Existing Projects

No migration needed! The fix:
- Works immediately for all projects
- Doesn't affect existing revision history data
- Only changes future revision entry creation behavior

### For Users

**What Users Will Notice:**
- ✅ Cleaner revision history (fewer duplicate entries)
- ✅ One entry per editing session (as expected)
- ✅ No more "spam" of revision entries

**What Users Won't Notice:**
- No UI changes
- No data loss
- No breaking changes

## Configuration Options

### Adjusting Session Window

To change the 5-minute window, edit `backend/app/sections/service.py`:

```python
# Current: 5 minutes
session_window = timedelta(minutes=5)

# Examples:
session_window = timedelta(minutes=10)  # 10 minutes
session_window = timedelta(minutes=1)   # 1 minute (more granular)
session_window = timedelta(hours=1)     # 1 hour (very lenient)
```

### Disabling Session Tracking

To revert to "one revision per change" behavior:

```python
async def _maybe_create_revision_entry(db: AsyncSession, project_id: UUID) -> None:
    # Always create revision (no session tracking)
    await revision_service.append_revision_entry(db, project_id)
```

## Future Enhancements

Possible improvements:
1. **Persistent Session Tracking**: Store timestamps in database instead of memory
2. **Configurable Window**: Allow users to set session window in settings
3. **Session Indicators**: Show "active editing session" in UI
4. **Manual Revision Creation**: Button to force new revision entry

## Conclusion

The fix successfully implements **one revision entry per editing session** behavior:
- ✅ Multiple changes within 5 minutes = 1 revision entry
- ✅ No changes = no revision entry
- ✅ Clean, predictable revision history
- ✅ No breaking changes or data loss

The revision history table now behaves as expected!
