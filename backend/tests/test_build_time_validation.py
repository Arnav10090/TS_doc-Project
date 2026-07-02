"""
Test that PROJECT_CONTEXT.md embedding would fail at build time if missing.

Requirement 18.3: IF embedding PROJECT_CONTEXT.md fails during build time,
THE system SHALL fail completely without filesystem fallback.

This is a conceptual test - in production, the embedding would happen
during module initialization and raise ImportError if the embedded content
is None or empty.
"""

import pytest
from app.ai_suggestions.builders import PROJECT_CONTEXT_MD_EMBEDDED


def test_project_context_md_is_embedded():
    """
    Verify PROJECT_CONTEXT.md content is embedded at build time.
    
    Requirement 18.1: PROJECT_CONTEXT.md content SHALL be embedded at build time
    Requirement 18.3: Build SHALL fail if embedding fails
    """
    # The constant must not be None
    assert PROJECT_CONTEXT_MD_EMBEDDED is not None, \
        "PROJECT_CONTEXT.MD_EMBEDDED must be populated at build time"
    
    # The constant must not be empty
    assert len(PROJECT_CONTEXT_MD_EMBEDDED) > 0, \
        "PROJECT_CONTEXT.MD_EMBEDDED must contain content"
    
    # The constant should contain expected project context
    assert "TS Document Generator" in PROJECT_CONTEXT_MD_EMBEDDED, \
        "PROJECT_CONTEXT.MD_EMBEDDED must contain actual project context"
    
    print("✓ PROJECT_CONTEXT.md is properly embedded at build time")
    print(f"✓ Embedded content length: {len(PROJECT_CONTEXT_MD_EMBEDDED)} characters")


def test_project_context_not_read_at_runtime():
    """
    Verify that PROJECT_CONTEXT.md is NOT read from filesystem at runtime.
    
    Requirement 18.2: AI_Suggestions_System SHALL NOT read PROJECT_CONTEXT.md
                      from filesystem at runtime
    
    This test verifies the embedded constant is used, not filesystem reads.
    """
    from app.ai_suggestions.builders import _format_project_context_md
    
    # Call the formatter
    result = _format_project_context_md()
    
    # Verify it uses the embedded constant
    assert "embedded at build time" in result
    assert PROJECT_CONTEXT_MD_EMBEDDED in result
    
    # The result should be immediate (no file I/O)
    # This is a structural check - the function has no file operations
    import inspect
    source = inspect.getsource(_format_project_context_md)
    
    # Verify no file operations in the source
    assert "open(" not in source, "Should not read files at runtime"
    assert "read(" not in source, "Should not read files at runtime"
    assert "Path(" not in source, "Should not use Path for file reading"
    
    print("✓ PROJECT_CONTEXT.md is NOT read from filesystem at runtime")
    print("✓ Uses embedded constant only")


if __name__ == "__main__":
    test_project_context_md_is_embedded()
    test_project_context_not_read_at_runtime()
    print("\n✅ All build-time validation tests passed!")
