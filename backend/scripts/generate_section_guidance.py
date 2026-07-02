"""
generate_section_guidance.py — Section Guidance Generator (Task 30.5)

Analyzes historical generated outputs and context patterns for each TS section,
then generates draft section guidance files ready for human refinement.

Usage:
    # Generate guidance files for all sections (dry-run)
    python backend/scripts/generate_section_guidance.py \\
        --ts-type "Level 2" \\
        --ts-documents-dir ts_documents \\
        --output-dir ts_documents/Level\\ 2/section_guidance \\
        --dry-run

    # Generate for specific sections
    python backend/scripts/generate_section_guidance.py \\
        --ts-type "Level 2" \\
        --ts-documents-dir ts_documents \\
        --output-dir ts_documents/Level\\ 2/section_guidance \\
        --sections executive_summary introduction features

    # Use AI-assisted generation (Gemini API)
    python backend/scripts/generate_section_guidance.py \\
        --ts-type "Data Analysis/Data Centralization/UGS" \\
        --ts-documents-dir ts_documents \\
        --output-dir ts_documents/Data\\ Analysis/Data\\ Centralization/UGS/section_guidance \\
        --ai-assist \\
        --force

    # Use UGS as reference to generate for another TS type
    python backend/scripts/generate_section_guidance.py \\
        --ts-type "Level 2" \\
        --ts-documents-dir ts_documents \\
        --output-dir ts_documents/Level\\ 2/section_guidance \\
        --reference-ts-type "Data Analysis/Data Centralization/UGS" \\
        --ai-assist

Requirements:
    - Run from the project root directory
    - For --ai-assist: GEMINI_API_KEY environment variable must be set

Exit codes:
    0 — success
    1 — error
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import textwrap
from pathlib import Path
from typing import Dict, List, Optional

# Allow importing from backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("generate_section_guidance")

# ---------------------------------------------------------------------------
# All valid section keys from the routing map
# ---------------------------------------------------------------------------

ALL_SECTION_KEYS = [
    "executive_summary",
    "introduction",
    "abbreviations_used",
    "process_flow",
    "overview",
    "features",
    "remote_support",
    "documentation_control",
    "customer_training",
    "system_config",
    "fat_condition",
    "tech_stack",
    "hardware_specs",
    "software_specs",
    "third_party_sw",
    "overall_gantt",
    "shutdown_gantt",
    "supervisors",
    "scope_definitions",
    "division_of_eng",
    "work_completion",
    "value_addition",
    "buyer_obligations",
    "exclusion_list",
    "buyer_prerequisites",
    "binding_conditions",
    "cybersecurity",
    "disclaimer",
    "poc",
]

# ---------------------------------------------------------------------------
# Default/template guidance text per section
# These serve as starting points for NEW TS types that don't have a
# reference project like UGS.
# Format: section_key → template text (to be adapted for the target TS type)
# ---------------------------------------------------------------------------

_TEMPLATE_GUIDANCE: Dict[str, str] = {
    "executive_summary": (
        "Structure: 2-3 paragraphs. (1) Seller capability intro. "
        "(2) Qualification for this engagement. "
        "(3) Solution value framing for [CUSTOMER_NAME]. "
        "Tone: strategic, management-level. No technical jargon. No heading in output."
    ),
    "introduction": (
        "Content: Formal opening referencing enquiry. "
        "Required: tender_reference, tender_date, clientname, clientlocation from project metadata. "
        "Use placeholders if absent: [TENDER_REF], [TENDER_DATE], [CUSTOMER_NAME], [SITE_LOCATION]. "
        "Tone: factual, formal, concise."
    ),
    "abbreviations_used": (
        "Format: Two-column table (Abbreviation | Meaning). "
        "Include: standard project abbreviations + product-specific terms. "
        "Do not invent abbreviations not used in the document."
    ),
    "process_flow": (
        "Content: Data/process flow description from source to destination. "
        "Required: system names or placeholders. "
        "Annotate flow with protocol/tier labels where applicable. "
        "One clear paragraph; avoid bullet lists."
    ),
    "overview": (
        "Structure: process_summary, system_objective, existing_system, integration_approach, "
        "tangible_benefits (bullet list), intangible_benefits (bullet list). "
        "Tone: management-level. Required: [CUSTOMER_NAME], [SITE_NAME], production units."
    ),
    "features": (
        "Structure: Numbered subsections per feature. Each: short title, description, buyer benefit. "
        "Mark value-added items explicitly. "
        "Required: product-specific capability list. Do not invent capabilities not in scope."
    ),
    "remote_support": (
        "Two paragraphs: (1) Scope and duration [SUPPORT_PERIOD]. "
        "(2) VPN/remote link responsibility (buyer), NDA requirement, excluded items. "
        "Tone: contractual. No SLA time commitments unless agreed."
    ),
    "documentation_control": (
        "One paragraph on built-in help system. "
        "Bullet list of delivered documentation (standard docs for this product). "
        "Concise. No invented document titles."
    ),
    "customer_training": (
        "One paragraph: on-site during commissioning, [TRAINEE_COUNT] persons, "
        "[TRAINING_DAYS] days, operational scope, agenda mutually agreed. "
        "No certification or assessment commitments."
    ),
    "system_config": (
        "2-3 sentences describing the selected configuration option and how units connect. "
        "State key parameters inline. End with reference-only caveat: "
        "'The above configuration is for reference only and is subject to finalization during detailed engineering.'"
    ),
    "fat_condition": (
        "Short bulleted list of FAT test items. "
        "FAT report = mandatory output. Shipment conditional on signed FAT report. "
        "Do not invent pass/fail thresholds."
    ),
    "tech_stack": (
        "Single unified table: sr_no, component, technology/make, note. "
        "Version: 'current version at detailed engineering start.' "
        "Hardware sizing: 'sized per [parameter] — confirmed at detailed engineering.'"
    ),
    "hardware_specs": (
        "BOM table: name, maker, qty, specs_line1-4. "
        "Vendor: generic acceptable ('HP/Dell/Lenovo or equivalent'). "
        "Sizing: 'Sized per [parameter] — confirmed at detailed engineering.' "
        "Do not state specific RAM/storage values."
    ),
    "software_specs": (
        "Software component table: name, version, notes. "
        "Version: always 'current version at detailed engineering start.' "
        "Do not hardcode version strings. License count from metadata only."
    ),
    "third_party_sw": (
        "Document third-party software requirements. "
        "Required: remote link/VPN statement (buyer-provided and managed). "
        "Do not invent specific VPN products or bandwidth requirements."
    ),
    "overall_gantt": (
        "2-3 sentence companion text: indicative duration, key phases, milestones. "
        "All durations indicative only; buyer prerequisite delays cause proportional delivery delays. "
        "For draw.io: week-based GanttTask JSON "
        "(task, phase, start_week, duration_weeks, milestone, dependencies)."
    ),
    "shutdown_gantt": (
        "If no shutdown required: one-sentence statement. "
        "If required: week-based GanttTask JSON for shutdown-window activities only. "
        "Confirm shutdown requirement from metadata before generating schedule."
    ),
    "supervisors": (
        "Fields: pm_days, dev_days, comm_days, total_man_days. "
        "From project metadata. Placeholders: [PM_DAYS], [DEV_DAYS], [COMM_DAYS], [TOTAL_DAYS]. "
        "Travel excluded. Do not invent man-day counts."
    ),
    "scope_definitions": (
        "Party definitions + abbreviation table. "
        "Standard abbreviations: BD, BE, DD, SU, ER, COM. "
        "X/Y notation = primary by X with support from Y. "
        "Include [CUSTOMER_ABBREVIATION] and seller name."
    ),
    "division_of_eng": (
        "Responsibility matrix: No., Category, Item, BD, BE, DD, SU, ER, COM. "
        "Codes: B=Buyer, S=Seller, B/S=Joint. "
        "Categories: Services, System Engineering, Hardware, Software, Interface, Training, Construction, Pre-Engineering, Documents. "
        "Each interface appears twice: source side (B) and product side (S)."
    ),
    "work_completion": (
        "Three-bullet criteria: hardware/software supplied, commissioning man-days completed, documentation submitted. "
        "Add deemed-issued clause. One short paragraph. "
        "No specific deadline periods unless commercially agreed."
    ),
    "value_addition": (
        "Brief. State: platform, duration, hosting, limitations. "
        "Explicit scope-limiting language required. "
        "Not a commitment to full deployment. Provided as-is, no SLA."
    ),
    "buyer_obligations": (
        "Bulleted imperative list ('Provide...', 'Arrange...', 'Ensure...', 'Configure...'). "
        "Each item specific enough to be referenced contractually. "
        "Include all standard prerequisites for this product type."
    ),
    "exclusion_list": (
        "Bulleted list. One to two sentences per item. "
        "Standard exclusions for this product type. "
        "Do not add exclusions not grounded in standard scope patterns."
    ),
    "buyer_prerequisites": (
        "Phase-gate organized list. Each: prerequisite → which seller activity it gates. "
        "Standard gates: design start, config start, commissioning start. "
        "Do not add prerequisites for unconfirmed systems."
    ),
    "binding_conditions": (
        "Bulleted list. Use repository-approved boilerplate only. "
        "Do not generate novel legal clauses, penalties, or indemnity terms. "
        "Scope limited to TS-defined content only."
    ),
    "cybersecurity": (
        "2-4 paragraphs: patch recommendation, buyer's full security responsibility, "
        "seller liability limitation, NDA requirement. "
        "Approved boilerplate only. No novel legal language. No security guarantees."
    ),
    "disclaimer": (
        "Four subsections: Software Licenses, Changes Due to Technical Improvements, "
        "Confidentiality, Limitation of Liability. "
        "Approved template language only. No novel legal clauses."
    ),
    "poc": (
        "Short. State: platform, where it runs, duration, limitations. "
        "Scope-limiting language required. "
        "IP remains with seller. Not a deployment commitment. Provided as-is."
    ),
}

# ---------------------------------------------------------------------------
# Task 30.5 – Section guidance generator
# ---------------------------------------------------------------------------


def load_reference_guidance(reference_ts_type: str, ts_documents_dir: str) -> Dict[str, str]:
    """
    Load existing section guidance files from a reference TS type (e.g., UGS)
    as starting points for adapting to a new TS type.

    Returns: dict mapping section_key → guidance text
    """
    ref_guidance_dir = (
        Path(ts_documents_dir) / Path(*reference_ts_type.split("/")) / "section_guidance"
    )
    if not ref_guidance_dir.exists():
        logger.warning("Reference guidance dir not found: %s", ref_guidance_dir)
        return {}

    result: Dict[str, str] = {}
    for fname in ref_guidance_dir.glob("*.txt"):
        section_key = fname.stem
        try:
            result[section_key] = fname.read_text(encoding="utf-8").strip()
        except Exception as e:
            logger.warning("Could not read %s: %s", fname, e)

    logger.info(
        "Loaded %d reference guidance files from %s", len(result), reference_ts_type
    )
    return result


def load_domain_context(ts_type: str, ts_documents_dir: str) -> Optional[str]:
    """Load domain_context.txt for the target TS type as input for AI generation."""
    domain_path = (
        Path(ts_documents_dir) / Path(*ts_type.split("/")) / "domain_context.txt"
    )
    if not domain_path.exists():
        return None
    try:
        return domain_path.read_text(encoding="utf-8").strip()
    except Exception:
        return None


def generate_guidance_from_template(
    section_key: str,
    ts_type: str,
    reference_guidance: Optional[str] = None,
) -> str:
    """
    Generate draft guidance text for a section using the template.

    If reference_guidance is provided, it is used as the starting point and
    the template is appended as supplementary guidance. The result is marked
    as [DRAFT — ADAPT FOR {ts_type}].
    """
    template = _TEMPLATE_GUIDANCE.get(section_key, "")

    if reference_guidance:
        # Use reference as base but mark for adaptation
        draft = (
            f"[DRAFT — ADAPT FOR {ts_type.upper()}]\n"
            f"{reference_guidance}\n"
            f"--- Template structure reminder ---\n"
            f"{template}"
        )
    elif template:
        draft = f"[DRAFT — FILL IN {ts_type.upper()}-SPECIFIC DETAILS]\n{template}"
    else:
        draft = (
            f"[DRAFT — NO TEMPLATE AVAILABLE FOR {section_key}]\n"
            f"Structure: Describe the {section_key.replace('_', ' ')} section content. "
            f"Include required inputs, safe inferences, and forbidden inventions."
        )

    return draft.strip()


def generate_guidance_with_ai(
    section_key: str,
    ts_type: str,
    domain_context: Optional[str],
    reference_guidance: Optional[str],
) -> str:
    """
    Task 30.3 extension: Use Gemini to generate guidance tailored to the TS type.

    Uses domain_context.txt of the target TS type + reference UGS guidance as input.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set. Using template fallback for %s.", section_key)
        return generate_guidance_from_template(section_key, ts_type, reference_guidance)

    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=api_key)
    except ImportError:
        logger.warning("google-generativeai not installed. Using template fallback.")
        return generate_guidance_from_template(section_key, ts_type, reference_guidance)

    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""You are creating section guidance for an AI system that writes Technical Specification (TS) documents.

TARGET TS TYPE: {ts_type}

SECTION: {section_key.replace("_", " ")}

{"DOMAIN CONTEXT for " + ts_type + ":\\n" + domain_context[:600] if domain_context else "No domain context available."}

{"REFERENCE GUIDANCE (from UGS product — adapt for " + ts_type + "):\\n" + reference_guidance[:400] if reference_guidance else ""}

TEMPLATE STRUCTURE:
{_TEMPLATE_GUIDANCE.get(section_key, "No template available.")}

Write concise section guidance (150-300 chars) for the {section_key.replace("_", " ")} section specifically for a {ts_type} Technical Specification document.

Guidelines for the guidance text:
- State what structure/format to use
- List required inputs (use [PLACEHOLDER] for project-specific values)
- State what to infer (standard patterns for {ts_type})
- State what NOT to invent
- Mention output tone if relevant
- Be actionable and specific to {ts_type}

Output ONLY the guidance text, no headers, no explanation."""

    try:
        response = model.generate_content(prompt)
        guidance = response.text.strip()
        # Truncate to 500 chars (section_guidance file limit)
        if len(guidance) > 500:
            guidance = guidance[:497] + "..."
        return guidance
    except Exception as e:
        logger.warning("AI generation failed for %s: %s. Using template.", section_key, e)
        return generate_guidance_from_template(section_key, ts_type, reference_guidance)


def generate_section_guidance_files(
    ts_type: str,
    ts_documents_dir: str,
    output_dir: Path,
    sections: Optional[List[str]] = None,
    dry_run: bool = False,
    force: bool = False,
    ai_assist: bool = False,
    reference_ts_type: Optional[str] = None,
) -> Dict[str, str]:
    """
    Task 30.5: Generate draft section guidance files for a TS type.

    For each section:
    1. Check if reference guidance exists (from UGS or specified reference TS type)
    2. Load domain_context.txt for AI prompting
    3. Generate guidance via AI or template
    4. Write to output_dir/{section_key}.txt

    Returns: dict mapping section_key → generated guidance text
    """
    target_sections = sections or ALL_SECTION_KEYS
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load reference guidance
    reference_guidance_map: Dict[str, str] = {}
    if reference_ts_type:
        reference_guidance_map = load_reference_guidance(reference_ts_type, ts_documents_dir)
        if not reference_guidance_map:
            logger.warning(
                "No reference guidance found for %s. Using templates only.", reference_ts_type
            )

    # Load domain context for AI prompting
    domain_context = load_domain_context(ts_type, ts_documents_dir)
    if domain_context:
        logger.info("Loaded domain_context.txt (%d chars) for AI prompting.", len(domain_context))
    else:
        logger.info("No domain_context.txt found — AI will use general knowledge.")

    generated: Dict[str, str] = {}

    for section_key in target_sections:
        output_path = output_dir / f"{section_key}.txt"

        # Skip if exists and not force
        if output_path.exists() and not force and not dry_run:
            logger.info("Skipping %s (already exists — use --force to overwrite).", section_key)
            continue

        ref_guidance = reference_guidance_map.get(section_key)

        # Generate guidance
        if ai_assist:
            text = generate_guidance_with_ai(section_key, ts_type, domain_context, ref_guidance)
        else:
            text = generate_guidance_from_template(section_key, ts_type, ref_guidance)

        generated[section_key] = text

        if dry_run:
            print(f"\n  [{section_key}.txt] — {len(text)} chars")
            print(f"  {text[:200].replace(chr(10), ' ')}...")
        else:
            output_path.write_text(text + "\n", encoding="utf-8")
            logger.info("Written: %s (%d chars)", output_path.name, len(text))

    return generated


# ---------------------------------------------------------------------------
# Task 30.5: Also write a README for the section_guidance directory
# ---------------------------------------------------------------------------

_SECTION_GUIDANCE_README = """\
# Section Guidance Files

This directory contains per-section writing guidance files used by the
AI Suggestions system to produce accurate, structured Technical Specification content.

## Purpose

Each file (`{section_key}.txt`) provides the AI model with:
- **Structure**: What format or outline to use
- **Required inputs**: Which project metadata fields are needed
- **Safe inferences**: What can be assumed from standard patterns
- **Prohibited inventions**: What the AI must NOT make up

## File naming

Files are named exactly after the repository section key:
- `executive_summary.txt` → executive_summary section
- `features.txt` → features section
- `hardware_specs.txt` → hardware_specs section
- etc.

## Content guidelines

- Target length: 150–300 chars (truncated to 500 at load time)
- Use [PLACEHOLDER] for project-specific values
- Be concise and actionable for LLM consumption
- Reference template section names in descriptions

## Adding new sections

1. Create `{new_section_key}.txt` in this directory
2. Follow the structure: Structure | Required | Infer | Never invent | Tone
3. Test with the AI suggestions endpoint

## Adapting for this TS type

These guidance files were generated for: **{ts_type}**
Review each file and adapt it to reflect the specific capabilities, terminology,
and scope of this product type. Replace [DRAFT] markers with finalized content.
"""


def write_section_guidance_readme(output_dir: Path, ts_type: str, dry_run: bool = False) -> None:
    """Write a README.md in the section_guidance directory."""
    content = _SECTION_GUIDANCE_README.replace("{ts_type}", ts_type)
    readme_path = output_dir / "README.md"
    if dry_run:
        print(f"\n  [README.md] — {len(content)} chars (would be written)")
        return
    if not readme_path.exists():
        readme_path.write_text(content, encoding="utf-8")
        logger.info("Written: README.md")
    else:
        logger.info("README.md already exists — skipping.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="generate_section_guidance",
        description=textwrap.dedent("""\
            Generate draft section guidance files for a TS type.

            Creates {section_key}.txt files in the section_guidance/ directory
            of the target TS type, ready for human review and refinement.
        """),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              # Dry-run for Level 2
              %(prog)s --ts-type "Level 2" --ts-documents-dir ts_documents \\
                        --output-dir ts_documents/Level\\ 2/section_guidance --dry-run

              # AI-assisted, adapting from UGS reference
              %(prog)s --ts-type "Level 2" --ts-documents-dir ts_documents \\
                        --output-dir ts_documents/Level\\ 2/section_guidance \\
                        --reference-ts-type "Data Analysis/Data Centralization/UGS" \\
                        --ai-assist --force
        """),
    )
    parser.add_argument(
        "--ts-type",
        required=True,
        help="Target TS type path (e.g., 'Level 2', 'Data Analysis/Data Centralization/UGS').",
    )
    parser.add_argument(
        "--ts-documents-dir",
        default="ts_documents",
        help="Root ts_documents directory (default: ts_documents).",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory to write guidance files to (typically <ts_type>/section_guidance/).",
    )
    parser.add_argument(
        "--sections",
        nargs="+",
        default=None,
        metavar="SECTION_KEY",
        help=f"Generate only these sections (default: all {len(ALL_SECTION_KEYS)} sections).",
    )
    parser.add_argument(
        "--reference-ts-type",
        default=None,
        help=(
            "TS type to use as reference for guidance adaptation "
            "(e.g., 'Data Analysis/Data Centralization/UGS')."
        ),
    )
    parser.add_argument(
        "--ai-assist",
        action="store_true",
        default=False,
        help="Use Gemini API to generate TS-specific guidance. Requires GEMINI_API_KEY.",
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        default=False,
        help="Preview guidance without writing files.",
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        default=False,
        help="Overwrite existing guidance files.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        default=False,
        help="Enable verbose logging.",
    )
    return parser


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    output_dir = Path(args.output_dir).resolve()

    if args.dry_run:
        print(f"\nDRY-RUN: Generating section guidance for '{args.ts_type}'")
        print(f"  Output directory: {output_dir}")
        if args.ai_assist:
            print("  Mode: AI-assisted (Gemini)")
        else:
            print("  Mode: Template-based")
        if args.reference_ts_type:
            print(f"  Reference TS type: {args.reference_ts_type}")
        print()

    write_section_guidance_readme(output_dir, args.ts_type, dry_run=args.dry_run)

    generated = generate_section_guidance_files(
        ts_type=args.ts_type,
        ts_documents_dir=args.ts_documents_dir,
        output_dir=output_dir,
        sections=args.sections,
        dry_run=args.dry_run,
        force=args.force,
        ai_assist=args.ai_assist,
        reference_ts_type=args.reference_ts_type,
    )

    total = len(generated)
    if args.dry_run:
        print(f"\n  (Dry-run complete: {total} guidance files would be written.)\n")
    else:
        print(f"\n  Section guidance generation complete: {total} file(s) written to {output_dir}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
