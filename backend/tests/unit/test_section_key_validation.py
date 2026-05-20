"""
Unit tests for section key validation logic.
"""
import pytest
from app.sections.router import is_valid_section_key, VALID_SECTION_KEYS


class TestSectionKeyValidation:
    """Test suite for section key validation."""

    def test_predefined_section_keys_are_valid(self):
        """All 31 predefined section keys should be valid."""
        for key in VALID_SECTION_KEYS:
            assert is_valid_section_key(key), f"Predefined key '{key}' should be valid"

    def test_custom_section_key_with_valid_format(self):
        """Custom section keys matching the pattern should be valid."""
        valid_custom_keys = [
            "custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "custom_section_1234567890123_12345678-1234-1234-1234-123456789012",
            "custom_section_0_00000000-0000-0000-0000-000000000000",
        ]
        for key in valid_custom_keys:
            assert is_valid_section_key(key), f"Custom section key '{key}' should be valid"

    def test_custom_subsection_key_with_valid_format(self):
        """Custom subsection keys matching the pattern should be valid."""
        valid_custom_subsection_keys = [
            "custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "custom_subsection_1234567890123_12345678-1234-1234-1234-123456789012",
            "custom_subsection_0_00000000-0000-0000-0000-000000000000",
        ]
        for key in valid_custom_subsection_keys:
            assert is_valid_section_key(key), f"Custom subsection key '{key}' should be valid"

    def test_invalid_section_keys(self):
        """Invalid section keys should be rejected."""
        invalid_keys = [
            "invalid_key",
            "custom_section_",
            "custom_section_abc_def",
            "custom_section_1234_not-a-uuid",
            "custom_subsection_",
            "custom_subsection_abc_def",
            "custom_subsection_1234_not-a-uuid",
            "custom_section_1234567890_12345678-1234-1234-1234-12345678901",  # UUID too short
            "custom_section_1234567890_12345678-1234-1234-1234-1234567890123",  # UUID too long
            "custom_section_1234567890_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",  # Invalid UUID chars
            "",
            "random_text",
        ]
        for key in invalid_keys:
            assert not is_valid_section_key(key), f"Invalid key '{key}' should be rejected"

    def test_custom_section_key_requires_timestamp(self):
        """Custom section keys must have a numeric timestamp."""
        invalid_keys = [
            "custom_section_abc_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "custom_section__a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        ]
        for key in invalid_keys:
            assert not is_valid_section_key(key), f"Key without valid timestamp '{key}' should be rejected"

    def test_custom_section_key_requires_valid_uuid(self):
        """Custom section keys must have a valid UUID v4 format."""
        invalid_keys = [
            "custom_section_1234567890_not-a-uuid",
            "custom_section_1234567890_12345678-1234-1234-1234",  # Incomplete UUID
            "custom_section_1234567890_",  # Missing UUID
        ]
        for key in invalid_keys:
            assert not is_valid_section_key(key), f"Key without valid UUID '{key}' should be rejected"

    def test_case_sensitivity(self):
        """Section keys should be case-sensitive."""
        # Predefined keys in wrong case should be invalid
        assert not is_valid_section_key("COVER")
        assert not is_valid_section_key("Cover")
        
        # Custom keys with wrong case should be invalid
        assert not is_valid_section_key("CUSTOM_SECTION_1234567890_a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        assert not is_valid_section_key("Custom_Section_1234567890_a1b2c3d4-e5f6-7890-abcd-ef1234567890")
