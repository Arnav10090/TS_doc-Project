"""
Unit tests for section context map JSON override functionality.

Tests Task 21.3: JSON override support for context routing.

Requirements tested:
- Loading custom routing maps from JSON config file
- Merging custom maps with default map (custom overrides default)
- Validating JSON structure on load
- Caching behavior

Test Coverage:
- JSON file loading (valid, invalid, missing)
- JSON structure validation (root type, key types, value types)
- Shallow merge behavior (custom overrides default)
- Cache behavior (hit, invalidation)
- Error handling (malformed JSON, invalid structure)
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch

from app.ai_suggestions.section_context_map import (
    get_shared_context_files,
    clear_override_cache,
    DEFAULT_SECTION_CONTEXT_MAP,
    DOMAIN_CONTEXT,
    ARCHITECTURE_CONTEXT,
    IMPLEMENTATION_CONTEXT,
    CYBERSECURITY_CONTEXT,
    GANTT_CONTEXT,
    _load_override_map,
    _validate_override_map,
)


class TestJSONOverrideLoading:
    """Test JSON override file loading functionality."""
    
    def test_no_override_file_returns_default_mapping(self, tmp_path):
        """Test that sections use default mapping when no override file exists."""
        # No override file in tmp_path
        result = get_shared_context_files("features", str(tmp_path))
        
        # Should return default mapping
        assert result == DEFAULT_SECTION_CONTEXT_MAP["features"]
        assert result == [DOMAIN_CONTEXT, IMPLEMENTATION_CONTEXT]
    
    def test_valid_override_file_loads_successfully(self, tmp_path):
        """Test that valid JSON override file loads and applies correctly."""
        # Create valid override file
        override_data = {
            "features": ["domain_context.txt", "custom_features_context.txt"],
            "cybersecurity": ["custom_security_context.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Get context files for overridden section
        result = get_shared_context_files("features", str(tmp_path))
        
        # Should return custom mapping
        assert result == ["domain_context.txt", "custom_features_context.txt"]
        assert result != DEFAULT_SECTION_CONTEXT_MAP["features"]
    
    def test_non_overridden_section_uses_default(self, tmp_path):
        """Test that non-overridden sections still use default mapping."""
        # Create override file with only "features" override
        override_data = {
            "features": ["custom_context.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Get context files for non-overridden section
        result = get_shared_context_files("hardware_specs", str(tmp_path))
        
        # Should still return default mapping
        assert result == DEFAULT_SECTION_CONTEXT_MAP["hardware_specs"]
        assert result == [ARCHITECTURE_CONTEXT, IMPLEMENTATION_CONTEXT]
    
    def test_invalid_json_falls_back_to_default(self, tmp_path, caplog):
        """Test that malformed JSON logs warning and uses default mapping."""
        # Create invalid JSON file
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text("{ invalid json }", encoding='utf-8')
        
        # Get context files
        result = get_shared_context_files("features", str(tmp_path))
        
        # Should return default mapping
        assert result == DEFAULT_SECTION_CONTEXT_MAP["features"]
        
        # Should log warning
        assert "Invalid JSON" in caplog.text
    
    def test_empty_json_file_uses_default(self, tmp_path):
        """Test that empty JSON object uses default mapping."""
        # Create empty JSON object
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text("{}", encoding='utf-8')
        
        # Get context files
        result = get_shared_context_files("features", str(tmp_path))
        
        # Should return default mapping (no overrides)
        assert result == DEFAULT_SECTION_CONTEXT_MAP["features"]


class TestJSONValidation:
    """Test JSON structure validation."""
    
    def test_root_must_be_dictionary(self, tmp_path, caplog):
        """Test that non-dictionary root is rejected."""
        # Create JSON array instead of object
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text('["file1.txt", "file2.txt"]', encoding='utf-8')
        
        # Load override map
        result = _load_override_map(str(tmp_path))
        
        # Should return None (invalid)
        assert result is None
        
        # Should log warning
        assert "root must be a dictionary" in caplog.text
    
    def test_non_string_keys_are_skipped(self, tmp_path, caplog):
        """Test that non-string section keys are skipped with warning."""
        # Create override with numeric key
        raw_data = {
            123: ["file.txt"],  # Invalid: numeric key
            "valid_section": ["valid_file.txt"]
        }
        
        # Validate
        result = _validate_override_map(raw_data, tmp_path / "test.json")
        
        # Should skip numeric key but keep valid entry
        assert result == {"valid_section": ["valid_file.txt"]}
        
        # Should log warning for invalid key
        assert "keys must be strings" in caplog.text
    
    def test_non_list_values_are_skipped(self, tmp_path, caplog):
        """Test that non-list values are skipped with warning."""
        # Create override with string value instead of list
        raw_data = {
            "invalid_section": "file.txt",  # Invalid: string instead of list
            "valid_section": ["valid_file.txt"]
        }
        
        # Validate
        result = _validate_override_map(raw_data, tmp_path / "test.json")
        
        # Should skip invalid section but keep valid entry
        assert result == {"valid_section": ["valid_file.txt"]}
        
        # Should log warning
        assert "value must be a list" in caplog.text
    
    def test_non_string_filenames_are_skipped(self, tmp_path, caplog):
        """Test that non-string filenames in lists are skipped."""
        # Create override with numeric filename
        raw_data = {
            "test_section": ["valid_file.txt", 123, "another_file.txt"]
        }
        
        # Validate
        result = _validate_override_map(raw_data, tmp_path / "test.json")
        
        # Should skip numeric filename but keep valid ones
        assert result == {"test_section": ["valid_file.txt", "another_file.txt"]}
        
        # Should log warning
        assert "must be string" in caplog.text
    
    def test_warning_for_non_txt_extension(self, tmp_path, caplog):
        """Test that filenames not ending in .txt generate warning."""
        # Create override with non-.txt filename
        raw_data = {
            "test_section": ["file_without_extension", "valid_file.txt"]
        }
        
        # Validate
        result = _validate_override_map(raw_data, tmp_path / "test.json")
        
        # Should still include the file (warning only, not error)
        assert result == {"test_section": ["file_without_extension", "valid_file.txt"]}
        
        # Should log warning
        assert "does not end with .txt" in caplog.text
    
    def test_section_with_no_valid_files_is_skipped(self, tmp_path, caplog):
        """Test that sections with all invalid filenames are skipped."""
        # Create override where all filenames are invalid
        raw_data = {
            "invalid_section": [123, 456],  # All invalid
            "valid_section": ["valid_file.txt"]
        }
        
        # Validate
        result = _validate_override_map(raw_data, tmp_path / "test.json")
        
        # Should skip section with no valid files
        assert result == {"valid_section": ["valid_file.txt"]}
        
        # Should log warning
        assert "has no valid context files" in caplog.text
    
    def test_completely_invalid_override_returns_none(self, tmp_path, caplog):
        """Test that override with all invalid entries returns None."""
        # Create override where everything is invalid
        raw_data = {
            123: ["file.txt"],  # Invalid key
            "section1": "not_a_list",  # Invalid value type
            "section2": [123, 456]  # Invalid filenames
        }
        
        # Validate
        result = _validate_override_map(raw_data, tmp_path / "test.json")
        
        # Should return None (no valid entries)
        assert result is None


class TestShallowMerge:
    """Test shallow merge behavior (custom overrides default)."""
    
    def test_custom_mapping_replaces_default_completely(self, tmp_path):
        """Test that custom mapping replaces entire default list for section."""
        # Default for "features": [DOMAIN_CONTEXT, IMPLEMENTATION_CONTEXT]
        # Override with different list
        override_data = {
            "features": ["custom_file_only.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Get context files
        result = get_shared_context_files("features", str(tmp_path))
        
        # Should completely replace default (not merge)
        assert result == ["custom_file_only.txt"]
        assert DOMAIN_CONTEXT not in result
        assert IMPLEMENTATION_CONTEXT not in result
    
    def test_multiple_overrides_all_apply(self, tmp_path):
        """Test that multiple section overrides all apply correctly."""
        override_data = {
            "features": ["custom_features.txt"],
            "hardware_specs": ["custom_hardware.txt"],
            "cybersecurity": ["custom_security.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Check each overridden section
        assert get_shared_context_files("features", str(tmp_path)) == ["custom_features.txt"]
        assert get_shared_context_files("hardware_specs", str(tmp_path)) == ["custom_hardware.txt"]
        assert get_shared_context_files("cybersecurity", str(tmp_path)) == ["custom_security.txt"]
        
        # Check non-overridden section still uses default
        assert get_shared_context_files("executive_summary", str(tmp_path)) == \
               DEFAULT_SECTION_CONTEXT_MAP["executive_summary"]


class TestCaching:
    """Test override map caching behavior."""
    
    def test_override_map_is_cached(self, tmp_path):
        """Test that override map is cached and not reloaded on subsequent calls."""
        # Create override file
        override_data = {"features": ["cached_file.txt"]}
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # First call loads from file
        result1 = get_shared_context_files("features", str(tmp_path))
        
        # Modify file after first load
        override_data["features"] = ["modified_file.txt"]
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Second call should return cached result (not modified file)
        result2 = get_shared_context_files("features", str(tmp_path))
        
        assert result1 == result2 == ["cached_file.txt"]
    
    def test_clear_cache_forces_reload(self, tmp_path):
        """Test that clear_override_cache() forces reload from file."""
        # Create override file
        override_data = {"features": ["original_file.txt"]}
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # First call loads original
        result1 = get_shared_context_files("features", str(tmp_path))
        assert result1 == ["original_file.txt"]
        
        # Modify file
        override_data["features"] = ["modified_file.txt"]
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Clear cache
        clear_override_cache()
        
        # Next call should load modified file
        result2 = get_shared_context_files("features", str(tmp_path))
        assert result2 == ["modified_file.txt"]
    
    def test_cache_per_folder(self, tmp_path):
        """Test that cache is per-folder (different folders don't share cache)."""
        # Create two separate folders with different overrides
        folder1 = tmp_path / "folder1"
        folder2 = tmp_path / "folder2"
        folder1.mkdir()
        folder2.mkdir()
        
        # Different overrides in each folder
        override1 = {"features": ["folder1_file.txt"]}
        override2 = {"features": ["folder2_file.txt"]}
        
        (folder1 / "context_routing_override.json").write_text(json.dumps(override1), encoding='utf-8')
        (folder2 / "context_routing_override.json").write_text(json.dumps(override2), encoding='utf-8')
        
        # Each folder should return its own override
        result1 = get_shared_context_files("features", str(folder1))
        result2 = get_shared_context_files("features", str(folder2))
        
        assert result1 == ["folder1_file.txt"]
        assert result2 == ["folder2_file.txt"]
    
    def test_missing_file_is_cached_as_none(self, tmp_path):
        """Test that absence of override file is cached (avoids repeated file checks)."""
        # No override file exists
        
        # First call checks file (not found) and caches None
        result1 = get_shared_context_files("features", str(tmp_path))
        
        # Now create override file
        override_data = {"features": ["new_file.txt"]}
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Second call should still return default (cached None)
        result2 = get_shared_context_files("features", str(tmp_path))
        
        assert result1 == result2 == DEFAULT_SECTION_CONTEXT_MAP["features"]
        
        # Clear cache and reload
        clear_override_cache()
        result3 = get_shared_context_files("features", str(tmp_path))
        
        # Now should load the new override
        assert result3 == ["new_file.txt"]


class TestIntegrationWithDefaultMap:
    """Test integration between override system and default routing map."""
    
    def test_override_without_folder_uses_default(self):
        """Test that calling without folder argument uses default map."""
        # No folder argument provided
        result = get_shared_context_files("features")
        
        # Should return default mapping
        assert result == DEFAULT_SECTION_CONTEXT_MAP["features"]
    
    def test_custom_sections_always_use_fallback(self, tmp_path):
        """Test that custom sections ignore overrides and use fallback."""
        # Create override that tries to override custom section
        override_data = {
            "custom_section_1234567890_abc123": ["custom_file.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Custom sections should ignore override and use fallback
        result = get_shared_context_files("custom_section_1234567890_abc123", str(tmp_path))
        
        # Should return fallback (not override)
        assert result == [DOMAIN_CONTEXT]
    
    def test_suppressed_sections_return_empty(self, tmp_path):
        """Test that suppressed sections return empty list even with override."""
        # Try to override suppressed section
        override_data = {
            "cover": ["file.txt"],
            "revision_history": ["file.txt"],
            "abbreviations": ["file.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Suppressed sections should return empty (ignore override)
        assert get_shared_context_files("cover", str(tmp_path)) == []
        assert get_shared_context_files("revision_history", str(tmp_path)) == []
        assert get_shared_context_files("abbreviations", str(tmp_path)) == []


class TestEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_unicode_in_override_file(self, tmp_path):
        """Test that Unicode characters in JSON are handled correctly."""
        override_data = {
            "features": ["文件_context.txt", "файл_context.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data, ensure_ascii=False), encoding='utf-8')
        
        # Should load Unicode filenames correctly
        result = get_shared_context_files("features", str(tmp_path))
        assert result == ["文件_context.txt", "файл_context.txt"]
    
    def test_very_long_filename_list(self, tmp_path):
        """Test that very long lists of files are handled."""
        # Create override with 50 files
        file_list = [f"file_{i}_context.txt" for i in range(50)]
        override_data = {"features": file_list}
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Should load all files
        result = get_shared_context_files("features", str(tmp_path))
        assert result == file_list
        assert len(result) == 50
    
    def test_empty_filename_list(self, tmp_path, caplog):
        """Test that empty filename list is handled (section skipped)."""
        override_data = {
            "features": [],  # Empty list
            "hardware_specs": ["valid_file.txt"]
        }
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text(json.dumps(override_data), encoding='utf-8')
        
        # Features should use default (empty list invalid)
        result_features = get_shared_context_files("features", str(tmp_path))
        assert result_features == DEFAULT_SECTION_CONTEXT_MAP["features"]
        
        # Hardware_specs should use override
        result_hardware = get_shared_context_files("hardware_specs", str(tmp_path))
        assert result_hardware == ["valid_file.txt"]
    
    def test_file_read_permission_error(self, tmp_path, caplog):
        """Test that permission errors are handled gracefully."""
        # Create override file
        override_file = tmp_path / "context_routing_override.json"
        override_file.write_text('{"features": ["file.txt"]}', encoding='utf-8')
        
        # Mock permission error
        with patch('builtins.open', side_effect=PermissionError("Permission denied")):
            result = get_shared_context_files("features", str(tmp_path))
        
        # Should fall back to default and log warning
        assert result == DEFAULT_SECTION_CONTEXT_MAP["features"]
        assert "Failed to load" in caplog.text


# Pytest fixtures can be added here if needed
@pytest.fixture(autouse=True)
def clear_cache_before_each_test():
    """Clear override cache before each test to avoid interference."""
    clear_override_cache()
    yield
    clear_override_cache()
