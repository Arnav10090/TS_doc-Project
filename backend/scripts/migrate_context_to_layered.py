"""
migrate_context_to_layered.py — Context Migration Tool (Tasks 30.1 – 30.4)

Migrates a monolithic context.txt file to the layered context architecture by
splitting content into five specialized files:
  - domain_context.txt       (~800 chars)  — business domain knowledge
  - architecture_context.txt (~600 chars)  — technical architecture patterns
  - implementation_context.txt (~1000 chars) — phases, obligations, exclusions
  - cybersecurity_context.txt  (~500 chars) — security policies
  - gantt_context.txt          (~400 chars) — scheduling guidance

Usage:
    # Dry-run (preview only, no files written)
    python backend/scripts/migrate_context_to_layered.py \\
        --input "ts_context_files/Data Analysis/Data Centralization/UGS/UGS_context.txt" \\
        --output "ts_documents/Data Analysis/Data Centralization/UGS" \\
        --dry-run

    # Live run (creates files, backs up originals)
    python backend/scripts/migrate_context_to_layered.py \\
        --input "ts_context_files/Level 2/Level2_context.txt" \\
        --output "ts_documents/Level 2" \\
        --force

    # AI-assisted splitting (uses Gemini API)
    python backend/scripts/migrate_context_to_layered.py \\
        --input "ts_context_files/Level 2/Level2_context.txt" \\
        --output "ts_documents/Level 2" \\
        --ai-assist

    # Validate only (no writing)
    python backend/scripts/migrate_context_to_layered.py \\
        --input "ts_context_files/UGS/UGS_context.txt" \\
        --output "ts_documents/UGS" \\
        --validate-only

Requirements:
    - Run from the project root directory
    - For --ai-assist: GEMINI_API_KEY environment variable must be set

Exit codes:
    0 — success
    1 — validation failure or error
    2 — user cancelled
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import shutil
import sys
import textwrap
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s",
)
logger = logging.getLogger("migrate_context")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Output file targets and their size guidance (in chars)
LAYERED_FILES = [
    "domain_context.txt",
    "architecture_context.txt",
    "implementation_context.txt",
    "cybersecurity_context.txt",
    "gantt_context.txt",
]

# Max size (chars) per output file — files beyond this trigger a validation warning
MAX_FILE_SIZE_CHARS = 1200

# Min size (chars) — files below this trigger a warning about sparse content
MIN_FILE_SIZE_CHARS = 50

# Size guidance per file (soft targets)
SIZE_GUIDANCE: Dict[str, int] = {
    "domain_context.txt": 800,
    "architecture_context.txt": 600,
    "implementation_context.txt": 1000,
    "cybersecurity_context.txt": 500,
    "gantt_context.txt": 400,
}

BACKUP_SUFFIX = ".bak"

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class SplitResult:
    """Holds the output of content splitting for one monolithic context file."""

    domain_context: str = ""
    architecture_context: str = ""
    implementation_context: str = ""
    cybersecurity_context: str = ""
    gantt_context: str = ""

    # Sections that could not be categorized (captured for review)
    uncategorized: str = ""

    # Which splitting method was used
    method: str = "regex"  # "regex" | "ai"

    def as_dict(self) -> Dict[str, str]:
        return {
            "domain_context.txt": self.domain_context.strip(),
            "architecture_context.txt": self.architecture_context.strip(),
            "implementation_context.txt": self.implementation_context.strip(),
            "cybersecurity_context.txt": self.cybersecurity_context.strip(),
            "gantt_context.txt": self.gantt_context.strip(),
        }


@dataclass
class ValidationReport:
    """Results of a post-split validation check."""

    passed: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    info: List[str] = field(default_factory=list)
    content_loss_chars: int = 0
    content_loss_pct: float = 0.0
    duplication_detected: bool = False

    def record_error(self, msg: str) -> None:
        self.errors.append(msg)
        self.passed = False

    def record_warning(self, msg: str) -> None:
        self.warnings.append(msg)

    def record_info(self, msg: str) -> None:
        self.info.append(msg)

    def print_report(self) -> None:
        print("\n" + "=" * 70)
        print("VALIDATION REPORT")
        print("=" * 70)
        status = "PASSED" if self.passed else "FAILED"
        print(f"\n  Status: {status}")

        if self.info:
            print("\n  Info:")
            for msg in self.info:
                print(f"    [INFO]    {msg}")

        if self.warnings:
            print("\n  Warnings:")
            for msg in self.warnings:
                print(f"    [WARN]    {msg}")

        if self.errors:
            print("\n  Errors:")
            for msg in self.errors:
                print(f"    [ERROR]   {msg}")

        if self.content_loss_pct > 0:
            print(
                f"\n  Content loss: {self.content_loss_chars} chars "
                f"({self.content_loss_pct:.1f}% of original)"
            )
        print()


# ---------------------------------------------------------------------------
# Task 30.1 – CLI and backup mechanism
# ---------------------------------------------------------------------------


def build_arg_parser() -> argparse.ArgumentParser:
    """Build the argument parser for the migration CLI."""
    parser = argparse.ArgumentParser(
        prog="migrate_context_to_layered",
        description=textwrap.dedent("""\
            Migrate a monolithic context.txt to the layered context architecture.

            Splits a single context file into five specialized files:
              domain_context.txt, architecture_context.txt,
              implementation_context.txt, cybersecurity_context.txt,
              gantt_context.txt
        """),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              # Preview without writing files
              %(prog)s --input ts_context_files/UGS/UGS_context.txt \\
                        --output ts_documents/UGS --dry-run

              # Live migration
              %(prog)s --input ts_context_files/L2/L2_context.txt \\
                        --output ts_documents/Level\\ 2 --force

              # AI-assisted splitting
              %(prog)s --input ts_context_files/L2/L2_context.txt \\
                        --output ts_documents/Level\\ 2 --ai-assist
        """),
    )

    parser.add_argument(
        "--input", "-i",
        required=True,
        metavar="CONTEXT_FILE",
        help="Path to the monolithic context.txt (or any .txt) to migrate.",
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        metavar="OUTPUT_DIR",
        help="Directory where layered files will be written (the ts_documents TS type folder).",
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        default=False,
        help="Preview the split without writing any files.",
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        default=False,
        help="Overwrite existing layered files without prompting.",
    )
    parser.add_argument(
        "--ai-assist",
        action="store_true",
        default=False,
        help=(
            "Use Gemini API to categorize ambiguous sections. "
            "Requires GEMINI_API_KEY environment variable."
        ),
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        default=False,
        help="Only validate existing layered files in --output dir (no splitting).",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        default=False,
        help="Do not create .bak backup of existing files before overwriting.",
    )
    parser.add_argument(
        "--report",
        metavar="REPORT_FILE",
        default=None,
        help="Write a JSON validation report to this file path.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        default=False,
        help="Enable verbose logging.",
    )
    return parser


def backup_file(path: Path) -> Optional[Path]:
    """
    Create a .bak backup of a file if it exists.

    Returns the backup path, or None if no backup was made.
    """
    if not path.exists():
        return None

    backup_path = path.with_suffix(BACKUP_SUFFIX)

    # If backup already exists, add a timestamp suffix
    if backup_path.exists():
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = path.parent / f"{path.stem}_{ts}{BACKUP_SUFFIX}"

    shutil.copy2(path, backup_path)
    logger.info("Backed up %s → %s", path.name, backup_path.name)
    return backup_path


def restore_backups(backup_map: Dict[Path, Path]) -> None:
    """Restore files from their backups (used in rollback)."""
    for original, bak in backup_map.items():
        if bak.exists():
            shutil.copy2(bak, original)
            logger.info("Restored %s from backup.", original.name)


# ---------------------------------------------------------------------------
# Task 30.2 – Regex-based content splitting
# ---------------------------------------------------------------------------

# Section header patterns that signal the start of a categorizable block.
# Each tuple: (regex_pattern, target_file_key)
# Patterns are matched case-insensitively against lines in the source file.
_SECTION_PATTERNS: List[Tuple[re.Pattern, str]] = [
    # ---- domain_context: what the product is, business value, plant env ----
    (re.compile(r"(what\s+\w+\s+is|domain\s+knowledge|core\s+capabilit|business\s+driver|plant\s+environment|standard\s+assumption|standard\s+exclusion)", re.I), "domain"),
    (re.compile(r"(repository\s+section\s+mapping|section\s+mapping|section\s+guidance)", re.I), "domain"),  # section mapping belongs to domain context
    (re.compile(r"(integration\s+pattern|diagram\s+guidance|protocols?)", re.I), "architecture"),  # protocols/integration → arch

    # ---- architecture_context: tech stack, arch options, protocols --------
    (re.compile(r"(architect|technology\s+stack|tech\s+stack|data\s+acqui|data\s+stor)", re.I), "architecture"),
    (re.compile(r"(hardware\s+spec|software\s+spec|third.?party\s+sw)", re.I), "architecture"),
    (re.compile(r"(option\s+[ab]\b|hx\s+edge|edge\s+control)", re.I), "architecture"),

    # ---- implementation_context: phases, risks, buyer obligations ---------
    (re.compile(r"(implementation\s+phase|project\s+phase|testing|fat\s+condition|commissioning)", re.I), "implementation"),
    (re.compile(r"(buyer\s+obligation|buyer\s+prerequisite|exclusion|value\s+addition|work\s+completion|poc\b|proof.of.concept)", re.I), "implementation"),
    (re.compile(r"(risk\b|risks\b|scope\s+definition|division\s+of\s+eng|supervisor)", re.I), "implementation"),

    # ---- cybersecurity_context: security, compliance ----------------------
    (re.compile(r"(cybersecuri|information\s+securi|patch\s+manag|secure\s+default|rbac|nda\s+required|liability)", re.I), "cybersecurity"),
    (re.compile(r"(disclaimer|binding\s+condition|confidential)", re.I), "cybersecurity"),

    # ---- gantt_context: scheduling, milestones, timeline -----------------
    (re.compile(r"(gantt|schedule|milestone|shutdown\s+gantt|critical\s+path|draw\.io|week.based)", re.I), "gantt"),
    (re.compile(r"(m[1-5]\s+gate|m[1-5]:|handover)", re.I), "gantt"),
]

# Patterns for section headers that act as "section boundary" markers
_HEADER_PATTERNS = [
    re.compile(r"^#+\s+(.+)$"),        # Markdown headers
    re.compile(r"^={3,}\s*$"),          # Separator lines
    re.compile(r"^-{3,}\s*$"),          # Separator lines
    re.compile(r"^##\s+(.+?)\s*$"),     # Sub-headers
]

# Skip patterns — lines that are metadata/boilerplate, not content
_SKIP_PATTERNS = [
    re.compile(r"^#\s*(Version|Category knowledge|GLOBAL PRIORITY|Priority order|Conflict rule|Missing data rule|Hard prohibition)", re.I),
    re.compile(r"^End of.*context.*$", re.I),
]

# Special block patterns that start a full block assignment
_BLOCK_STARTS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"^#\s*UGS\s+DOMAIN\s+KNOWLEDGE", re.I), "domain"),
    (re.compile(r"^#+\s*(Architecture|Technology Stack|Tech Stack|Data Acqui|Data Stor|Protocol|Integration Pattern|Diagram Guidance)", re.I), "architecture"),
    (re.compile(r"^#+\s*(Implementation Phase|Testing|Risks?|Standard Assumption|Standard Exclusion)", re.I), "implementation"),
    (re.compile(r"^#+\s*(Buyer Obligation|Buyer Prerequisite|Exclusion|Work Completion|Value Addition|PoC|Proof.of.Concept|Scope Definition|Division of Eng|Supervisor)", re.I), "implementation"),
    (re.compile(r"^#+\s*(Cybersecuri|Secure Default|Disclaimer|Binding Condition|Confidential)", re.I), "cybersecurity"),
    (re.compile(r"^#+\s*(Gantt|Schedule|Milestone|Shutdown)", re.I), "gantt"),
    # Repository section mapping: each ## section_key maps to its domain by name
    (re.compile(r"^##\s+(executive_summary|introduction|process_flow|overview|features|remote_support|documentation_control|customer_training)", re.I), "domain"),
    (re.compile(r"^##\s+(fat_condition|hardware_specs|software_specs|third_party_sw|system_config|tech_stack)", re.I), "architecture"),
    (re.compile(r"^##\s+(supervisors|division_of_eng|work_completion|value_addition|buyer_obligations|exclusion_list|buyer_prerequisites|poc)", re.I), "implementation"),
    (re.compile(r"^##\s+(binding_conditions|cybersecurity|disclaimer)", re.I), "cybersecurity"),
    (re.compile(r"^##\s+(overall_gantt|shutdown_gantt)", re.I), "gantt"),
    (re.compile(r"^##\s+(scope_definitions)", re.I), "implementation"),
]

# Boilerplate header lines to always skip (global priority rules etc.)
_BOILERPLATE_SECTIONS = {
    "global priority and safety rules",
    "repository section mapping",  # index block — not content
}


def _classify_line(line: str) -> Optional[str]:
    """
    Classify a single line to a target bucket using regex patterns.
    Returns one of: 'domain', 'architecture', 'implementation', 'cybersecurity', 'gantt', or None.
    """
    for pattern, target in _SECTION_PATTERNS:
        if pattern.search(line):
            return target
    return None


def _is_section_header(line: str) -> bool:
    """Return True if the line looks like a section header."""
    stripped = line.strip()
    for pat in _HEADER_PATTERNS:
        if pat.match(stripped):
            return True
    return False


def _get_block_target(header_line: str) -> Optional[str]:
    """
    Check if a header line starts a block that belongs to a specific target.
    Returns the target key or None.
    """
    stripped = header_line.strip()
    for pattern, target in _BLOCK_STARTS:
        if pattern.match(stripped):
            return target
    return None


def split_by_regex(content: str) -> SplitResult:
    """
    Task 30.2: Split a monolithic context.txt into layered files using regex patterns.

    Algorithm:
    1. Parse the file line-by-line
    2. Detect section header lines to identify block boundaries
    3. Assign each block to the most relevant target bucket based on patterns
    4. Concatenate content per bucket

    Returns a SplitResult with filled bucket strings.
    """
    result = SplitResult(method="regex")

    # Buckets for accumulating content
    buckets: Dict[str, List[str]] = {
        "domain": [],
        "architecture": [],
        "implementation": [],
        "cybersecurity": [],
        "gantt": [],
        "uncategorized": [],
    }

    lines = content.splitlines()
    current_target: Optional[str] = None
    current_block: List[str] = []
    in_boilerplate = False

    def flush_block():
        """Flush accumulated block lines into current_target bucket."""
        nonlocal current_block
        block_text = "\n".join(current_block).strip()
        if block_text:
            target = current_target or "domain"
            buckets[target].append(block_text)
        current_block = []

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Skip empty lines between blocks (keep within-block blank lines)
        if not stripped:
            if current_block:
                current_block.append("")
            i += 1
            continue

        # Detect section header
        if _is_section_header(line):
            # Check if this is a boilerplate/skip section
            header_text = stripped.lstrip("#").strip().lower()
            if header_text in _BOILERPLATE_SECTIONS or any(
                p.search(stripped) for p in _SKIP_PATTERNS
            ):
                in_boilerplate = True
                flush_block()
                i += 1
                continue

            # Check if this header signals a block assignment
            block_target = _get_block_target(stripped)
            if block_target:
                flush_block()
                in_boilerplate = False
                current_target = block_target
                current_block = [line]
                i += 1
                continue

            # Generic header — classify by content
            classified = _classify_line(stripped)
            if classified:
                flush_block()
                in_boilerplate = False
                current_target = classified
                current_block = [line]
                i += 1
                continue

            # Unclassifiable header — this is an unrecognized section
            flush_block()
            in_boilerplate = False
            current_target = "uncategorized"
            current_block = [line]
            i += 1
            continue

        # Non-header line
        if in_boilerplate:
            i += 1
            continue

        current_block.append(line)
        i += 1

    # Flush final block
    flush_block()

    # Assemble result strings
    result.domain_context = "\n\n".join(buckets["domain"])
    result.architecture_context = "\n\n".join(buckets["architecture"])
    result.implementation_context = "\n\n".join(buckets["implementation"])
    result.cybersecurity_context = "\n\n".join(buckets["cybersecurity"])
    result.gantt_context = "\n\n".join(buckets["gantt"])
    result.uncategorized = "\n\n".join(buckets["uncategorized"])

    return result


# ---------------------------------------------------------------------------
# Task 30.3 – AI-assisted splitting (Gemini API)
# ---------------------------------------------------------------------------


def split_with_ai_assist(content: str, ts_type_hint: str = "") -> SplitResult:
    """
    Task 30.3: Use Gemini API to classify ambiguous sections.

    This function:
    1. First runs the regex splitter to handle clear-cut sections
    2. Sends uncategorized content to Gemini for classification
    3. Merges Gemini's classification back into the SplitResult
    4. Optionally allows human review of AI assignments

    Requires: GEMINI_API_KEY environment variable.
    """
    import os

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error(
            "GEMINI_API_KEY not set. Cannot use --ai-assist. "
            "Either set the env var or run without --ai-assist."
        )
        sys.exit(1)

    # Step 1: Run regex split first
    result = split_by_regex(content)
    logger.info("AI-assisted: regex pass complete. Uncategorized chars: %d", len(result.uncategorized))

    if not result.uncategorized.strip():
        logger.info("No uncategorized content — AI assist not needed.")
        result.method = "regex+ai"
        return result

    # Step 2: Call Gemini to classify uncategorized content
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=api_key)
    except ImportError:
        logger.error(
            "google-generativeai package not installed. "
            "Install it with: pip install google-generativeai"
        )
        sys.exit(1)

    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""You are classifying content from a technical specification context file for an industrial automation project.

The context file describes a product called: {ts_type_hint or "[TS TYPE]"}

Classify the following text into one of these 5 buckets:
1. domain — Business domain knowledge: what the product is, core capabilities, business drivers, plant environment, standard assumptions, standard exclusions, section-by-section repository guidance
2. architecture — Technical architecture: architecture options, protocols, technology stack, data acquisition, data storage, integration patterns, hardware specs, software specs, diagram guidance
3. implementation — Project execution: implementation phases, testing (FAT), risks, buyer obligations, buyer prerequisites, exclusion list, work completion, value addition, PoC, scope definitions, division of engineering, supervisors
4. cybersecurity — Security: cybersecurity policies, secure defaults, RBAC, NDA, patch management, binding conditions, disclaimer, confidentiality, liability
5. gantt — Scheduling: gantt guidance, milestones, critical path, shutdown gantt, draw.io format, timeline

For each paragraph or block in the text below, output a JSON array where each item has:
  "content": the exact text (verbatim)
  "bucket": one of "domain", "architecture", "implementation", "cybersecurity", "gantt"

TEXT TO CLASSIFY:
---
{result.uncategorized[:4000]}
---

Output ONLY valid JSON, no explanation."""

    try:
        response = model.generate_content(prompt)
        raw_json = response.text.strip()

        # Strip markdown code fences if present
        if raw_json.startswith("```"):
            raw_json = re.sub(r"^```[a-z]*\n?", "", raw_json)
            raw_json = re.sub(r"\n?```$", "", raw_json)

        classified: List[Dict] = json.loads(raw_json)

    except Exception as e:
        logger.warning("AI classification failed: %s. Using regex result as-is.", e)
        result.method = "regex+ai_failed"
        return result

    # Step 3: Merge AI classifications
    bucket_map = {
        "domain": "domain_context",
        "architecture": "architecture_context",
        "implementation": "implementation_context",
        "cybersecurity": "cybersecurity_context",
        "gantt": "gantt_context",
    }

    for item in classified:
        bucket = item.get("bucket", "domain")
        text = item.get("content", "").strip()
        if not text:
            continue

        attr = bucket_map.get(bucket, "domain_context")
        existing = getattr(result, attr, "")
        if existing:
            setattr(result, attr, existing + "\n\n" + text)
        else:
            setattr(result, attr, text)

    # Clear uncategorized since AI handled it
    result.uncategorized = ""
    result.method = "regex+ai"

    # Step 4: Human-in-the-loop review
    print("\n" + "=" * 70)
    print("AI-ASSISTED CLASSIFICATION COMPLETE")
    print("=" * 70)
    print("\nAI classified the uncategorized sections. Preview:")
    for bucket, filename in [
        ("domain_context", "domain_context.txt"),
        ("architecture_context", "architecture_context.txt"),
        ("implementation_context", "implementation_context.txt"),
        ("cybersecurity_context", "cybersecurity_context.txt"),
        ("gantt_context", "gantt_context.txt"),
    ]:
        val = getattr(result, bucket, "")
        print(f"\n  {filename}: {len(val)} chars")
        if val:
            preview = val[:200].replace("\n", " ")
            print(f"  Preview: {preview}...")

    answer = input("\n  Accept AI classifications? [Y/n]: ").strip().lower()
    if answer not in ("", "y", "yes"):
        logger.info("User rejected AI classifications. Falling back to regex-only result.")
        result = split_by_regex(content)
        result.method = "regex"

    return result


# ---------------------------------------------------------------------------
# Task 30.4 – Validation
# ---------------------------------------------------------------------------


def _normalize_for_comparison(text: str) -> str:
    """
    Normalize text for content-loss comparison:
    - Collapse whitespace
    - Remove punctuation and separators
    - Lowercase
    """
    text = re.sub(r"[\s\-=#+*_|]+", " ", text)
    text = re.sub(r"[^\w\s]", "", text)
    return text.lower().strip()


def validate_split(
    original_content: str,
    split_result: SplitResult,
    output_files: Optional[Dict[str, str]] = None,
) -> ValidationReport:
    """
    Task 30.4: Validate the split result for correctness.

    Checks:
    1. Content loss — significant content from original is not in any output file
    2. Duplication — same content appears in multiple output files
    3. File sizes — reasonable per-file sizes (< MAX_FILE_SIZE_CHARS per file)
    4. Non-empty outputs — at least 3 of 5 files have content
    """
    report = ValidationReport()
    file_contents = output_files or split_result.as_dict()

    # Remove header/boilerplate from original for comparison
    original_clean = _normalize_for_comparison(original_content)

    # Combine all split output
    all_output = " ".join(v for v in file_contents.values() if v)
    output_clean = _normalize_for_comparison(all_output)

    # ---- Check 1: Content loss ----
    # Compare word-level presence of significant original words in output
    original_words = set(w for w in original_clean.split() if len(w) > 4)
    output_words = set(output_clean.split())
    missing_words = original_words - output_words
    missing_pct = (len(missing_words) / len(original_words) * 100) if original_words else 0

    report.content_loss_chars = len(original_content) - len(all_output)
    report.content_loss_pct = missing_pct

    if missing_pct > 30:
        report.record_error(
            f"Significant content loss detected: {missing_pct:.1f}% of unique "
            f"words from original not found in split output. "
            f"Review uncategorized content."
        )
    elif missing_pct > 10:
        report.record_warning(
            f"Moderate content loss: {missing_pct:.1f}% of unique words not found in output. "
            f"Consider reviewing uncategorized sections."
        )
    else:
        report.record_info(
            f"Content coverage: {100 - missing_pct:.1f}% of unique original words found in output."
        )

    # ---- Check 2: Duplication ----
    # Check if same long phrases appear in multiple files
    seen_phrases = set()
    dup_found = False
    for fname, content in file_contents.items():
        if not content:
            continue
        # Extract 6-word chunks for overlap detection
        words = content.lower().split()
        for j in range(len(words) - 5):
            phrase = " ".join(words[j : j + 6])
            if phrase in seen_phrases:
                dup_found = True
                break
            seen_phrases.add(phrase)
        if dup_found:
            break

    if dup_found:
        report.duplication_detected = True
        report.record_warning(
            "Potential content duplication detected between output files. "
            "Review files for overlapping content."
        )
    else:
        report.record_info("No significant content duplication detected.")

    # ---- Check 3: File sizes ----
    for fname, content in file_contents.items():
        size = len(content)
        if size == 0:
            report.record_warning(f"{fname}: EMPTY — no content assigned to this file.")
        elif size < MIN_FILE_SIZE_CHARS:
            report.record_warning(
                f"{fname}: Very sparse content ({size} chars). "
                f"Consider merging with another file or adding more content."
            )
        elif size > MAX_FILE_SIZE_CHARS:
            report.record_warning(
                f"{fname}: Exceeds recommended size ({size} chars > {MAX_FILE_SIZE_CHARS} max). "
                f"Consider trimming content."
            )
        else:
            guidance = SIZE_GUIDANCE.get(fname, 600)
            report.record_info(
                f"{fname}: {size} chars (target: ~{guidance} chars) ✓"
            )

    # ---- Check 4: Minimum non-empty files ----
    non_empty = sum(1 for v in file_contents.values() if v.strip())
    if non_empty < 3:
        report.record_error(
            f"Only {non_empty}/5 output files have content. "
            f"Migration may be incomplete or input file format is unusual."
        )
    else:
        report.record_info(f"{non_empty}/5 output files have content.")

    # ---- Uncategorized content ----
    if split_result.uncategorized.strip():
        unc_size = len(split_result.uncategorized)
        report.record_warning(
            f"Uncategorized content: {unc_size} chars could not be automatically classified. "
            f"Review and manually assign to appropriate files."
        )

    return report


def validate_existing_files(output_dir: Path) -> ValidationReport:
    """Validate already-written layered files in output_dir."""
    report = ValidationReport()
    file_contents = {}

    for fname in LAYERED_FILES:
        fpath = output_dir / fname
        if fpath.exists():
            content = fpath.read_text(encoding="utf-8")
            file_contents[fname] = content
            size = len(content)
            guidance = SIZE_GUIDANCE.get(fname, 600)
            if size < MIN_FILE_SIZE_CHARS:
                report.record_warning(f"{fname}: Very sparse ({size} chars).")
            elif size > MAX_FILE_SIZE_CHARS:
                report.record_warning(
                    f"{fname}: Oversized ({size} chars > {MAX_FILE_SIZE_CHARS} chars)."
                )
            else:
                report.record_info(f"{fname}: {size} chars (target ~{guidance}) ✓")
        else:
            report.record_warning(f"{fname}: Not found in {output_dir}.")
            file_contents[fname] = ""

    non_empty = sum(1 for v in file_contents.values() if v.strip())
    if non_empty < 3:
        report.record_error(f"Only {non_empty}/5 layered files are present and non-empty.")
    else:
        report.record_info(f"{non_empty}/5 layered files present and non-empty.")

    return report


# ---------------------------------------------------------------------------
# Core migration workflow
# ---------------------------------------------------------------------------


def run_migration(args: argparse.Namespace) -> int:
    """
    Main migration workflow combining tasks 30.1–30.4.

    Returns exit code (0=success, 1=failure, 2=cancelled).
    """
    input_path = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()

    # ---- Validate-only mode ----
    if args.validate_only:
        logger.info("Validate-only mode: checking existing files in %s", output_dir)
        report = validate_existing_files(output_dir)
        report.print_report()
        if args.report:
            _write_json_report(args.report, report, output_dir, None)
        return 0 if report.passed else 1

    # ---- Input file validation ----
    if not input_path.exists():
        logger.error("Input file not found: %s", input_path)
        return 1

    if not input_path.is_file():
        logger.error("Input path is not a file: %s", input_path)
        return 1

    content = input_path.read_text(encoding="utf-8")
    if not content.strip():
        logger.error("Input file is empty: %s", input_path)
        return 1

    logger.info("Input: %s (%d chars)", input_path, len(content))

    # ---- Output directory ----
    output_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Output directory: %s", output_dir)

    # ---- Check for existing files ----
    existing_files = [output_dir / fname for fname in LAYERED_FILES if (output_dir / fname).exists()]
    if existing_files and not args.force and not args.dry_run:
        print(f"\n  WARNING: {len(existing_files)} layered file(s) already exist in {output_dir}:")
        for f in existing_files:
            print(f"    {f.name}")
        answer = input("\n  Overwrite? [y/N]: ").strip().lower()
        if answer not in ("y", "yes"):
            logger.info("Migration cancelled by user.")
            return 2

    # ---- Content splitting ----
    logger.info("Splitting content using %s...", "AI-assist" if args.ai_assist else "regex")
    ts_type_hint = output_dir.name

    if args.ai_assist:
        split_result = split_with_ai_assist(content, ts_type_hint)
    else:
        split_result = split_by_regex(content)

    file_contents = split_result.as_dict()

    # ---- Validation ----
    logger.info("Validating split result...")
    validation_report = validate_split(content, split_result, file_contents)
    validation_report.print_report()

    if not validation_report.passed and not args.force:
        logger.error(
            "Validation failed. Use --force to proceed anyway, or fix issues first."
        )
        if args.report:
            _write_json_report(args.report, validation_report, output_dir, split_result)
        return 1

    # ---- Dry-run preview ----
    if args.dry_run:
        print("\n" + "=" * 70)
        print("DRY-RUN PREVIEW (no files written)")
        print("=" * 70)
        for fname, text in file_contents.items():
            print(f"\n  [{fname}] — {len(text)} chars")
            if text:
                preview = text[:300].replace("\n", " ↵ ")
                print(f"  {preview}...")
            else:
                print("  (empty)")

        if split_result.uncategorized:
            print(f"\n  [UNCATEGORIZED] — {len(split_result.uncategorized)} chars")
            print("  (not written to any file — review manually)")

        print("\n  (Dry-run complete. Use without --dry-run to write files.)\n")
        if args.report:
            _write_json_report(args.report, validation_report, output_dir, split_result)
        return 0

    # ---- Write files ----
    backup_map: Dict[Path, Path] = {}
    written: List[Path] = []

    try:
        for fname, text in file_contents.items():
            out_path = output_dir / fname

            # Backup existing file
            if not args.no_backup and out_path.exists():
                bak = backup_file(out_path)
                if bak:
                    backup_map[out_path] = bak

            # Write file (even if empty — empty = intentionally not used)
            if text.strip():
                out_path.write_text(text.strip() + "\n", encoding="utf-8")
                written.append(out_path)
                logger.info("Written: %s (%d chars)", fname, len(text))
            else:
                logger.warning("Skipping empty file: %s", fname)

        # Write uncategorized content as a review file if non-trivial
        if split_result.uncategorized.strip():
            unc_path = output_dir / "_uncategorized_review.txt"
            unc_path.write_text(split_result.uncategorized.strip() + "\n", encoding="utf-8")
            written.append(unc_path)
            logger.warning(
                "Uncategorized content written to %s for manual review.", unc_path.name
            )

    except Exception as e:
        logger.error("Error writing files: %s — attempting rollback.", e)
        restore_backups(backup_map)
        for p in written:
            if p.exists():
                p.unlink()
        return 1

    # ---- Success summary ----
    print("\n" + "=" * 70)
    print("MIGRATION COMPLETE")
    print("=" * 70)
    print(f"\n  Files written to: {output_dir}")
    for p in written:
        size = p.stat().st_size
        print(f"    {p.name}: {size} bytes")
    if backup_map:
        print(f"\n  Backups created ({len(backup_map)}):")
        for orig, bak in backup_map.items():
            print(f"    {orig.name} → {bak.name}")
    print()

    if args.report:
        _write_json_report(args.report, validation_report, output_dir, split_result)

    return 0 if validation_report.passed else 1


def _write_json_report(
    report_path: str,
    report: ValidationReport,
    output_dir: Path,
    split_result: Optional[SplitResult],
) -> None:
    """Write a JSON validation report to the given path."""
    data = {
        "timestamp": datetime.now().isoformat(),
        "output_dir": str(output_dir),
        "passed": report.passed,
        "content_loss_pct": round(report.content_loss_pct, 2),
        "content_loss_chars": report.content_loss_chars,
        "duplication_detected": report.duplication_detected,
        "errors": report.errors,
        "warnings": report.warnings,
        "info": report.info,
    }
    if split_result:
        data["split_method"] = split_result.method
        data["file_sizes"] = {k: len(v) for k, v in split_result.as_dict().items()}
        data["uncategorized_chars"] = len(split_result.uncategorized)

    Path(report_path).write_text(json.dumps(data, indent=2), encoding="utf-8")
    logger.info("Report written to: %s", report_path)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)

    logger.debug("Arguments: %s", vars(args))

    return run_migration(args)


if __name__ == "__main__":
    sys.exit(main())
