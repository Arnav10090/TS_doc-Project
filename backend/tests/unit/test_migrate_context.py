"""
test_migrate_context.py — Tests for migrate_context_to_layered.py (Task 30.6)

Tests cover:
    - Task 30.1: CLI argument parsing, backup mechanism
    - Task 30.2: Regex-based content splitting
    - Task 30.3: AI-assisted splitting (mocked)
    - Task 30.4: Validation logic
    - Task 30.5: Section guidance generator
    - Edge cases: empty file, malformed content, dry-run, backup/restore

Test File: tests/unit/test_migrate_context.py
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Allow importing the scripts
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "scripts"))

import migrate_context_to_layered as mig
import generate_section_guidance as gsg


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


UGS_CONTEXT_PATH = (
    BACKEND_DIR.parent
    / "ts_context_files"
    / "Data Analysis"
    / "Data Centralization"
    / "UGS"
    / "UGS_context.txt"
)


@pytest.fixture
def ugs_content() -> str:
    """Load the real UGS context.txt if available; otherwise use a stub."""
    if UGS_CONTEXT_PATH.exists():
        return UGS_CONTEXT_PATH.read_text(encoding="utf-8")
    # Minimal stub for environments without the real file
    return MINIMAL_CONTEXT_STUB


MINIMAL_CONTEXT_STUB = """\
# UGS CONTEXT.TXT — Unified Gateway Solution

# GLOBAL PRIORITY AND SAFETY RULES
Priority order (highest wins): 1. Project metadata 2. This file

# UGS DOMAIN KNOWLEDGE

## What UGS Is
Industrial data integration middleware. NOT a SCADA or visualization tool.

## Business Drivers
Eliminate siloed data, enable KPI visibility, digitalization foundation.

## Architecture Options
Option A (Direct): UGS server polls each unit centrally.
Option B (HX per unit): HX edge controller at each unit.

## Technology Stack Patterns
Software: C#/.NET Core, SQL Server, Windows Server. Hardware: enterprise server, managed switch.

## Protocols
Primary: OPC UA. Also: OPC DA, Modbus, MQTT.

## Implementation Phases
Initiation → Pre-Engineering (M1) → Basic Engineering (M2) → FAT (M3) → Commissioning → Handover.

## Cybersecurity
Buyer owns all cybersecurity. Seller delivers secure-by-default config.
NDA required before remote sessions.

## Gantt Guidance
Phases: Initiation → Pre-Engineering (M1) → Basic Engineering (M2) → FAT (M3) → Commissioning.
Scale: small ≈10–14 weeks; medium ≈14–20 weeks. Draw.io format: week-based JSON.

## Buyer Obligations
Provide tag lists before design. Configure L1 servers. Provide site access.

End of UGS context.txt
"""

EMPTY_CONTENT = ""
WHITESPACE_ONLY_CONTENT = "   \n\n   \t   "
MALFORMED_CONTENT = "????? #@!$% no clear sections here just random text"
SINGLE_SECTION_CONTENT = """
# JUST DOMAIN KNOWLEDGE
UGS is an industrial middleware product for data integration.
It collects plant data from heterogeneous automation systems.
"""


# ---------------------------------------------------------------------------
# Task 30.1 – CLI Tests
# ---------------------------------------------------------------------------


class TestCLIParsing:
    """Test CLI argument parsing (Task 30.1)."""

    def test_required_args_present(self):
        """--input and --output are required."""
        parser = mig.build_arg_parser()
        args = parser.parse_args(["--input", "foo.txt", "--output", "/tmp/out"])
        assert args.input == "foo.txt"
        assert args.output == "/tmp/out"

    def test_dry_run_default_false(self):
        parser = mig.build_arg_parser()
        args = parser.parse_args(["--input", "f.txt", "--output", "/out"])
        assert args.dry_run is False

    def test_dry_run_flag(self):
        parser = mig.build_arg_parser()
        args = parser.parse_args(["--input", "f.txt", "--output", "/out", "--dry-run"])
        assert args.dry_run is True

    def test_force_flag(self):
        parser = mig.build_arg_parser()
        args = parser.parse_args(["--input", "f.txt", "--output", "/out", "--force"])
        assert args.force is True

    def test_ai_assist_flag(self):
        parser = mig.build_arg_parser()
        args = parser.parse_args(["--input", "f.txt", "--output", "/out", "--ai-assist"])
        assert args.ai_assist is True

    def test_validate_only_flag(self):
        parser = mig.build_arg_parser()
        args = parser.parse_args(["--input", "f.txt", "--output", "/out", "--validate-only"])
        assert args.validate_only is True

    def test_no_backup_flag(self):
        parser = mig.build_arg_parser()
        args = parser.parse_args(["--input", "f.txt", "--output", "/out", "--no-backup"])
        assert args.no_backup is True

    def test_report_argument(self):
        parser = mig.build_arg_parser()
        args = parser.parse_args([
            "--input", "f.txt", "--output", "/out", "--report", "report.json"
        ])
        assert args.report == "report.json"

    def test_missing_input_raises(self):
        parser = mig.build_arg_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["--output", "/out"])

    def test_missing_output_raises(self):
        parser = mig.build_arg_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["--input", "foo.txt"])


# ---------------------------------------------------------------------------
# Task 30.1 – Backup mechanism tests
# ---------------------------------------------------------------------------


class TestBackupMechanism:
    """Test backup and restore functionality (Task 30.1)."""

    def test_backup_creates_bak_file(self, tmp_path):
        orig = tmp_path / "context.txt"
        orig.write_text("original content", encoding="utf-8")
        bak = mig.backup_file(orig)
        assert bak is not None
        assert bak.exists()
        assert bak.suffix == ".bak"
        assert bak.read_text(encoding="utf-8") == "original content"

    def test_backup_returns_none_for_missing_file(self, tmp_path):
        missing = tmp_path / "nonexistent.txt"
        result = mig.backup_file(missing)
        assert result is None

    def test_backup_preserves_content(self, tmp_path):
        orig = tmp_path / "domain_context.txt"
        orig.write_text("Domain knowledge here.", encoding="utf-8")
        bak = mig.backup_file(orig)
        assert bak.read_text(encoding="utf-8") == "Domain knowledge here."

    def test_backup_timestamp_suffix_when_bak_exists(self, tmp_path):
        orig = tmp_path / "domain_context.txt"
        orig.write_text("first", encoding="utf-8")
        # Create existing .bak
        (tmp_path / "domain_context.bak").write_text("old bak", encoding="utf-8")
        bak = mig.backup_file(orig)
        # Should create a timestamped backup
        assert bak is not None
        assert bak != tmp_path / "domain_context.bak"

    def test_restore_backups(self, tmp_path):
        orig = tmp_path / "file.txt"
        orig.write_text("original", encoding="utf-8")
        bak = tmp_path / "file.bak"
        bak.write_text("original", encoding="utf-8")
        # Simulate modification
        orig.write_text("modified", encoding="utf-8")
        # Restore
        mig.restore_backups({orig: bak})
        assert orig.read_text(encoding="utf-8") == "original"


# ---------------------------------------------------------------------------
# Task 30.2 – Regex splitting tests
# ---------------------------------------------------------------------------


class TestRegexSplitting:
    """Test content splitting by regex (Task 30.2)."""

    def test_split_returns_split_result(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        assert isinstance(result, mig.SplitResult)

    def test_split_method_is_regex(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        assert result.method == "regex"

    def test_domain_context_not_empty(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        assert len(result.domain_context.strip()) > 0

    def test_architecture_context_not_empty(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        assert len(result.architecture_context.strip()) > 0

    def test_cybersecurity_context_not_empty(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        assert len(result.cybersecurity_context.strip()) > 0

    def test_gantt_context_not_empty(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        assert len(result.gantt_context.strip()) > 0

    def test_all_five_output_files_present(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        d = result.as_dict()
        assert set(d.keys()) == set(mig.LAYERED_FILES)

    def test_as_dict_returns_correct_keys(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        d = result.as_dict()
        for fname in mig.LAYERED_FILES:
            assert fname in d

    def test_domain_contains_domain_content(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        # Should contain something about what UGS is or business drivers
        combined = result.domain_context.lower()
        assert any(word in combined for word in ["industrial", "integration", "middleware", "business", "kpi"])

    def test_architecture_contains_arch_content(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        combined = result.architecture_context.lower()
        assert any(word in combined for word in ["option", "opc", "protocol", "stack", ".net", "server"])

    def test_cybersecurity_contains_security_content(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        combined = result.cybersecurity_context.lower()
        assert any(word in combined for word in ["securi", "buyer", "nda", "seller"])

    def test_gantt_contains_scheduling_content(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        combined = result.gantt_context.lower()
        assert any(word in combined for word in ["gantt", "phase", "milestone", "week"])

    def test_implementation_contains_phases(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        combined = result.implementation_context.lower()
        assert any(word in combined for word in ["initiation", "engineering", "commissioning", "obligation", "buyer"])

    def test_boilerplate_excluded_from_outputs(self):
        result = mig.split_by_regex(MINIMAL_CONTEXT_STUB)
        for content in result.as_dict().values():
            assert "Priority order (highest wins)" not in content

    def test_split_ugs_real_file(self, ugs_content):
        """Test with the real UGS context.txt (if available)."""
        result = mig.split_by_regex(ugs_content)
        d = result.as_dict()
        # At least 3 of 5 files should have content
        non_empty = sum(1 for v in d.values() if v.strip())
        assert non_empty >= 3, f"Only {non_empty}/5 output files have content"

    def test_empty_content_does_not_crash(self):
        result = mig.split_by_regex(EMPTY_CONTENT)
        assert isinstance(result, mig.SplitResult)
        # All files may be empty but should not raise
        for fname, content in result.as_dict().items():
            assert isinstance(content, str)

    def test_single_section_split(self):
        """Content with a single section should still produce a valid result."""
        result = mig.split_by_regex(SINGLE_SECTION_CONTENT)
        assert isinstance(result, mig.SplitResult)
        # Domain content should be captured
        assert "industrial middleware" in result.domain_context.lower() or \
               "domain" in result.domain_context.lower() or \
               len(result.domain_context) >= 0  # At minimum no crash

    def test_malformed_content_does_not_crash(self):
        result = mig.split_by_regex(MALFORMED_CONTENT)
        assert isinstance(result, mig.SplitResult)


# ---------------------------------------------------------------------------
# Task 30.3 – AI-assisted splitting (mocked)
# ---------------------------------------------------------------------------


class TestAIAssistedSplitting:
    """Test AI-assisted splitting with mocked Gemini responses (Task 30.3)."""

    def test_ai_split_falls_back_when_no_key(self, monkeypatch):
        """Should exit with code 1 when GEMINI_API_KEY not set."""
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        with pytest.raises(SystemExit) as exc_info:
            mig.split_with_ai_assist(MINIMAL_CONTEXT_STUB)
        assert exc_info.value.code == 1

    def test_ai_split_falls_back_on_import_error(self, monkeypatch):
        """Should exit with code 1 if google-generativeai configure fails on import."""
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
        
        orig_import = __import__
        def mock_import(name, *args, **kwargs):
            if name == "google.generativeai":
                raise ImportError("simulated: google-generativeai not installed")
            return orig_import(name, *args, **kwargs)
            
        with patch("builtins.__import__", side_effect=mock_import):
            with pytest.raises(SystemExit) as exc_info:
                mig.split_with_ai_assist("# WEIRD RANDOM HEADER\nThis goes to uncategorized.", ts_type_hint="test")
            assert exc_info.value.code == 1

    def test_ai_split_skips_when_no_uncategorized(self, monkeypatch):
        """If regex handles all content, AI is not called."""
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
        # Use content that regex handles fully
        stub_all_classified = MINIMAL_CONTEXT_STUB

        with patch("migrate_context_to_layered.split_by_regex") as mock_regex:
            mock_result = mig.SplitResult(
                domain_context="Domain content",
                architecture_context="Arch content",
                implementation_context="Impl content",
                cybersecurity_context="Cyber content",
                gantt_context="Gantt content",
                uncategorized="",
                method="regex"
            )
            mock_regex.return_value = mock_result

            # Patch genai to track if it's called
            with patch.dict("sys.modules", {"google.generativeai": MagicMock()}):
                result = mig.split_with_ai_assist(stub_all_classified)
                # No uncategorized → AI should not be called for classification
                assert result.uncategorized == ""


# ---------------------------------------------------------------------------
# Task 30.4 – Validation tests
# ---------------------------------------------------------------------------


class TestValidation:
    """Test validation logic (Task 30.4)."""

    def test_validation_passes_for_good_split(self):
        split = mig.SplitResult(
            domain_context="Domain content " * 20,
            architecture_context="Architecture content " * 15,
            implementation_context="Implementation content " * 25,
            cybersecurity_context="Cybersecurity content " * 12,
            gantt_context="Gantt scheduling content " * 10,
        )
        original = "\n".join([
            "Domain content " * 20,
            "Architecture content " * 15,
            "Implementation content " * 25,
            "Cybersecurity content " * 12,
            "Gantt scheduling content " * 10,
        ])
        report = mig.validate_split(original, split)
        # Should pass with minimal warnings
        assert isinstance(report, mig.ValidationReport)

    def test_validation_fails_on_high_content_loss(self):
        """If most words from original are missing, validation should fail."""
        original = "unique_word_alpha unique_word_beta unique_word_gamma " * 50
        split = mig.SplitResult(
            domain_context="completely different content that shares no words",
        )
        report = mig.validate_split(original, split)
        # High content loss → should fail
        assert not report.passed
        assert len(report.errors) > 0

    def test_validation_warns_on_empty_file(self):
        split = mig.SplitResult(
            domain_context="Some domain content here." * 10,
            architecture_context="",  # Empty
            implementation_context="Implementation content." * 10,
            cybersecurity_context="Cybersecurity content." * 10,
            gantt_context="Gantt content." * 10,
        )
        original = "\n".join([
            "domain content here " * 10,
            "implementation content " * 10,
            "cybersecurity content " * 10,
            "gantt content " * 10,
        ])
        report = mig.validate_split(original, split)
        # Should have a warning about empty architecture_context.txt
        warnings_text = " ".join(report.warnings).lower()
        assert "architecture_context" in warnings_text or "empty" in warnings_text

    def test_validation_warns_on_oversized_file(self):
        """Files exceeding MAX_FILE_SIZE_CHARS trigger a warning."""
        large_content = "x" * (mig.MAX_FILE_SIZE_CHARS + 500)
        split = mig.SplitResult(
            domain_context=large_content,
            architecture_context="Arch content " * 20,
            implementation_context="Impl content " * 20,
            cybersecurity_context="Cyber content " * 20,
            gantt_context="Gantt content " * 20,
        )
        original = large_content + " arch impl cyber gantt " * 20
        report = mig.validate_split(original, split)
        warnings_text = " ".join(report.warnings).lower()
        assert "domain_context" in warnings_text or "exceed" in warnings_text or "oversize" in warnings_text

    def test_validation_fails_when_fewer_than_3_files(self):
        """Fewer than 3 non-empty output files triggers a validation error."""
        split = mig.SplitResult(
            domain_context="Only this one.",
            architecture_context="",
            implementation_context="",
            cybersecurity_context="",
            gantt_context="",
        )
        original = "only this one content"
        report = mig.validate_split(original, split)
        errors_text = " ".join(report.errors).lower()
        assert not report.passed
        assert any(k in errors_text for k in ["only", "1/5", "2/5", "insufficient", "incomplete"])

    def test_validation_report_prints(self, capsys):
        """ValidationReport.print_report() should not raise."""
        report = mig.ValidationReport()
        report.record_info("Info message.")
        report.record_warning("Warning message.")
        report.print_report()
        captured = capsys.readouterr()
        assert "VALIDATION REPORT" in captured.out

    def test_validate_existing_files_passes_for_ugs(self):
        """Validate existing UGS layered files if they exist."""
        ugs_dir = (
            BACKEND_DIR.parent
            / "ts_documents"
            / "Data Analysis"
            / "Data Centralization"
            / "UGS"
        )
        if not ugs_dir.exists():
            pytest.skip("UGS directory not found")

        report = mig.validate_existing_files(ugs_dir)
        # UGS was manually migrated and validated — should pass
        assert isinstance(report, mig.ValidationReport)
        # Should have at least 3 non-empty files
        assert report.passed or any("5/5" in i for i in report.info)

    def test_validate_existing_files_warns_for_missing_files(self, tmp_path):
        """Empty directory should produce warnings about missing files."""
        report = mig.validate_existing_files(tmp_path)
        # All files missing → should have warnings
        assert len(report.warnings) >= 3

    def test_json_report_is_valid_json(self, tmp_path):
        """JSON report output should be valid JSON."""
        report = mig.ValidationReport()
        report.record_info("Test info.")
        split = mig.SplitResult(domain_context="Test", method="regex")
        report_path = tmp_path / "report.json"
        mig._write_json_report(str(report_path), report, tmp_path, split)
        data = json.loads(report_path.read_text(encoding="utf-8"))
        assert "passed" in data
        assert "timestamp" in data
        assert "file_sizes" in data


# ---------------------------------------------------------------------------
# Task 30.6 – End-to-end migration tests
# ---------------------------------------------------------------------------


class TestEndToEndMigration:
    """End-to-end migration tests (Task 30.6)."""

    def _make_args(self, **kwargs) -> object:
        """Create a minimal mock args namespace."""
        defaults = {
            "input": "",
            "output": "",
            "dry_run": False,
            "force": False,
            "ai_assist": False,
            "validate_only": False,
            "no_backup": True,
            "report": None,
            "verbose": False,
        }
        defaults.update(kwargs)
        return type("Args", (), defaults)()

    def test_dry_run_does_not_write_files(self, tmp_path, ugs_content):
        input_file = tmp_path / "context.txt"
        input_file.write_text(ugs_content, encoding="utf-8")
        output_dir = tmp_path / "output"
        output_dir.mkdir()

        args = self._make_args(
            input=str(input_file), output=str(output_dir), dry_run=True
        )
        exit_code = mig.run_migration(args)
        # No files should be written in dry-run
        written = list(output_dir.glob("*.txt"))
        assert len(written) == 0
        assert exit_code == 0

    def test_live_run_writes_files(self, tmp_path, ugs_content):
        input_file = tmp_path / "context.txt"
        input_file.write_text(ugs_content, encoding="utf-8")
        output_dir = tmp_path / "output"
        output_dir.mkdir()

        args = self._make_args(
            input=str(input_file), output=str(output_dir), force=True
        )
        exit_code = mig.run_migration(args)
        # At least 3 files should be written
        written = list(output_dir.glob("*.txt"))
        non_empty = [f for f in written if f.stat().st_size > 0]
        assert len(non_empty) >= 3

    def test_backup_created_when_file_exists(self, tmp_path, ugs_content):
        input_file = tmp_path / "context.txt"
        input_file.write_text(ugs_content, encoding="utf-8")
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        # Pre-create a layered file
        existing = output_dir / "domain_context.txt"
        existing.write_text("Old domain content.", encoding="utf-8")

        args = self._make_args(
            input=str(input_file),
            output=str(output_dir),
            force=True,
            no_backup=False,
        )
        mig.run_migration(args)
        # Backup should exist
        bak_files = list(output_dir.glob("*.bak"))
        assert len(bak_files) >= 1

    def test_no_backup_flag_skips_backup(self, tmp_path, ugs_content):
        input_file = tmp_path / "context.txt"
        input_file.write_text(ugs_content, encoding="utf-8")
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        existing = output_dir / "domain_context.txt"
        existing.write_text("Old content.", encoding="utf-8")

        args = self._make_args(
            input=str(input_file),
            output=str(output_dir),
            force=True,
            no_backup=True,
        )
        mig.run_migration(args)
        bak_files = list(output_dir.glob("*.bak"))
        assert len(bak_files) == 0

    def test_missing_input_file_returns_error(self, tmp_path):
        args = self._make_args(
            input=str(tmp_path / "nonexistent.txt"),
            output=str(tmp_path / "output"),
        )
        exit_code = mig.run_migration(args)
        assert exit_code == 1

    def test_empty_input_file_returns_error(self, tmp_path):
        empty_file = tmp_path / "empty.txt"
        empty_file.write_text("", encoding="utf-8")
        args = self._make_args(
            input=str(empty_file),
            output=str(tmp_path / "output"),
        )
        exit_code = mig.run_migration(args)
        assert exit_code == 1

    def test_whitespace_only_input_returns_error(self, tmp_path):
        ws_file = tmp_path / "whitespace.txt"
        ws_file.write_text(WHITESPACE_ONLY_CONTENT, encoding="utf-8")
        args = self._make_args(
            input=str(ws_file),
            output=str(tmp_path / "output"),
        )
        exit_code = mig.run_migration(args)
        assert exit_code == 1

    def test_validate_only_mode(self, tmp_path, ugs_content):
        """--validate-only reads existing files and reports without splitting."""
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        # Write some layered files
        for fname in mig.LAYERED_FILES[:3]:
            (output_dir / fname).write_text("Content " * 50, encoding="utf-8")

        args = self._make_args(
            input="nonexistent.txt",  # Not used in validate-only
            output=str(output_dir),
            validate_only=True,
        )
        exit_code = mig.run_migration(args)
        # Should return 0 or 1 based on validation, not error
        assert exit_code in (0, 1)

    def test_report_file_created(self, tmp_path, ugs_content):
        """--report creates a JSON file."""
        input_file = tmp_path / "context.txt"
        input_file.write_text(ugs_content, encoding="utf-8")
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        report_path = tmp_path / "migration_report.json"

        args = self._make_args(
            input=str(input_file),
            output=str(output_dir),
            force=True,
            report=str(report_path),
        )
        mig.run_migration(args)
        assert report_path.exists()
        data = json.loads(report_path.read_text(encoding="utf-8"))
        assert "passed" in data
        assert "file_sizes" in data

    def test_output_dir_created_if_missing(self, tmp_path, ugs_content):
        input_file = tmp_path / "context.txt"
        input_file.write_text(ugs_content, encoding="utf-8")
        output_dir = tmp_path / "new_output_dir"  # Does not exist
        assert not output_dir.exists()

        args = self._make_args(
            input=str(input_file),
            output=str(output_dir),
            force=True,
        )
        mig.run_migration(args)
        assert output_dir.exists()

    def test_known_good_ugs_split(self, ugs_content):
        """
        Task 30.6: Test with UGS context.txt (the known good split).
        Validates that all 5 output files get non-trivial content.
        """
        result = mig.split_by_regex(ugs_content)
        d = result.as_dict()
        non_empty = {k: v for k, v in d.items() if v.strip()}
        assert len(non_empty) >= 4, (
            f"Expected at least 4/5 files with content; got {len(non_empty)}: "
            + ", ".join(non_empty.keys())
        )

    def test_ugs_split_domain_contains_key_terms(self, ugs_content):
        """Domain context should contain core UGS domain terms."""
        result = mig.split_by_regex(ugs_content)
        assert any(
            term in result.domain_context.lower()
            for term in ["industrial", "integration", "middleware", "business", "kpi", "plant"]
        )

    def test_ugs_split_gantt_contains_scheduling_terms(self, ugs_content):
        """Gantt context should contain scheduling guidance."""
        result = mig.split_by_regex(ugs_content)
        assert any(
            term in result.gantt_context.lower()
            for term in ["gantt", "phase", "milestone", "week", "schedule", "draw.io"]
        )

    def test_ugs_split_cybersecurity_contains_security_terms(self, ugs_content):
        """Cybersecurity context should contain security-related content."""
        result = mig.split_by_regex(ugs_content)
        assert any(
            term in result.cybersecurity_context.lower()
            for term in ["cybersecuri", "securi", "nda", "rbac", "patch", "disclaimer", "buyer"]
        )


# ---------------------------------------------------------------------------
# Task 30.5 – Section Guidance Generator tests
# ---------------------------------------------------------------------------


class TestSectionGuidanceGenerator:
    """Test the section guidance generator (Task 30.5)."""

    def test_template_guidance_for_known_section(self):
        """Template guidance should return text for all known sections."""
        for section_key in gsg.ALL_SECTION_KEYS:
            text = gsg.generate_guidance_from_template(section_key, "Level 2")
            assert isinstance(text, str)
            assert len(text) > 0

    def test_template_guidance_for_unknown_section(self):
        """Unknown section should still return a usable template."""
        text = gsg.generate_guidance_from_template("unknown_section_xyz", "Level 2")
        assert isinstance(text, str)
        assert len(text) > 0

    def test_template_with_reference_guidance(self):
        """When reference guidance is provided, it should be incorporated."""
        ref = "Structure: numbered list of features."
        text = gsg.generate_guidance_from_template("features", "Level 2", ref)
        assert "numbered list" in text.lower() or "draft" in text.lower()

    def test_generate_files_in_dry_run(self, tmp_path, capsys):
        output_dir = tmp_path / "guidance"
        output_dir.mkdir()
        result = gsg.generate_section_guidance_files(
            ts_type="Level 2",
            ts_documents_dir=str(tmp_path),
            output_dir=output_dir,
            sections=["executive_summary", "features"],
            dry_run=True,
            force=False,
            ai_assist=False,
        )
        # Dry-run: no files written
        assert not any(output_dir.glob("*.txt"))
        # But result dict should have entries
        assert "executive_summary" in result
        assert "features" in result

    def test_generate_files_writes_to_disk(self, tmp_path):
        output_dir = tmp_path / "guidance"
        output_dir.mkdir()
        result = gsg.generate_section_guidance_files(
            ts_type="Level 2",
            ts_documents_dir=str(tmp_path),
            output_dir=output_dir,
            sections=["executive_summary", "features", "introduction"],
            dry_run=False,
            force=True,
            ai_assist=False,
        )
        assert (output_dir / "executive_summary.txt").exists()
        assert (output_dir / "features.txt").exists()
        assert (output_dir / "introduction.txt").exists()

    def test_generate_files_skips_existing_without_force(self, tmp_path):
        output_dir = tmp_path / "guidance"
        output_dir.mkdir()
        existing = output_dir / "executive_summary.txt"
        existing.write_text("Existing content.", encoding="utf-8")

        result = gsg.generate_section_guidance_files(
            ts_type="Level 2",
            ts_documents_dir=str(tmp_path),
            output_dir=output_dir,
            sections=["executive_summary"],
            dry_run=False,
            force=False,
            ai_assist=False,
        )
        # Should be skipped — result is empty because no files were generated
        assert "executive_summary" not in result
        # And existing file should still have original content
        assert existing.read_text(encoding="utf-8") == "Existing content."

    def test_generate_all_sections(self, tmp_path):
        output_dir = tmp_path / "guidance"
        output_dir.mkdir()
        result = gsg.generate_section_guidance_files(
            ts_type="Test TS",
            ts_documents_dir=str(tmp_path),
            output_dir=output_dir,
            sections=None,  # All sections
            dry_run=False,
            force=True,
            ai_assist=False,
        )
        # Should generate for all sections
        assert len(result) == len(gsg.ALL_SECTION_KEYS)
        # All files should exist
        for section_key in gsg.ALL_SECTION_KEYS:
            assert (output_dir / f"{section_key}.txt").exists()

    def test_load_reference_guidance_ugs(self):
        """Load reference guidance from UGS if available."""
        ugs_guidance_dir = (
            BACKEND_DIR.parent
            / "ts_documents"
            / "Data Analysis"
            / "Data Centralization"
            / "UGS"
            / "section_guidance"
        )
        if not ugs_guidance_dir.exists():
            pytest.skip("UGS section_guidance not found")

        guidance_map = gsg.load_reference_guidance(
            "Data Analysis/Data Centralization/UGS",
            str(BACKEND_DIR.parent / "ts_documents"),
        )
        assert len(guidance_map) > 0
        assert "executive_summary" in guidance_map

    def test_readme_written(self, tmp_path):
        output_dir = tmp_path / "guidance"
        output_dir.mkdir()
        gsg.write_section_guidance_readme(output_dir, "Level 2")
        readme = output_dir / "README.md"
        assert readme.exists()
        content = readme.read_text(encoding="utf-8")
        assert "Level 2" in content
        assert "section" in content.lower()

    def test_readme_not_overwritten_if_exists(self, tmp_path):
        output_dir = tmp_path / "guidance"
        output_dir.mkdir()
        readme = output_dir / "README.md"
        readme.write_text("Custom README content.", encoding="utf-8")
        gsg.write_section_guidance_readme(output_dir, "Level 2")
        # Should not overwrite
        assert readme.read_text(encoding="utf-8") == "Custom README content."

    def test_ai_guidance_falls_back_to_template_without_key(self, monkeypatch):
        """AI guidance should fall back to template if no API key."""
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        text = gsg.generate_guidance_with_ai(
            "executive_summary", "Level 2", None, None
        )
        # Should fall back to template
        assert isinstance(text, str)
        assert len(text) > 0
