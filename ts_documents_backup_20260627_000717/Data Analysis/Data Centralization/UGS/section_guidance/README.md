# UGS Section Guidance Files

## Purpose

This directory contains **section-specific guidance files** for the UGS (Unified Gateway Solution)
TS type. Each `.txt` file provides targeted writing instructions for a specific TS template section.

These guidance files are loaded by the AI suggestions engine (layer 5 — section guidance) when
generating content for the corresponding section. They complement the shared context files
(`domain_context.txt`, `architecture_context.txt`, etc.) with section-specific structure,
tone, and content guidelines.

## File Naming Convention

Files are named after the **repository section key** (not the template heading):

```
{section_key}.txt
```

For example, `executive_summary.txt` corresponds to the "Executive Summary" template section.

See `TEMPLATE_MAPPING.md` for the complete template heading → repository key mapping.

## File Format

Each guidance file is plain text, concise (150–350 chars), and actionable:

```
Structure: <how to organize the content>
Avoid: <what NOT to include or write>
Tone: <language register and style>
UGS-specific: <UGS-particular considerations>
```

## File Index

| Filename | Template Section |
|---|---|
| executive_summary.txt | Executive Summary |
| introduction.txt | Introduction |
| overview.txt | Overview of {{SolutionName}} |
| abbreviations_used.txt | Abbreviations Used |
| process_flow.txt | Process Flow |
| features.txt | Design Scope of Work (Offerings) |
| remote_support.txt | Remote Support |
| documentation_control.txt | Documentation Control |
| customer_training.txt | Customer Training |
| system_config.txt | System Configuration (for Reference) |
| fat_condition.txt | FAT Condition |
| tech_stack.txt | Technology Stack |
| hardware_specs.txt | Hardware Specifications |
| software_specs.txt | Software Specifications |
| third_party_sw.txt | Third Party Software |
| overall_gantt.txt | Schedule — Overall Gantt |
| shutdown_gantt.txt | Schedule — Shutdown Gantt |
| scope_definitions.txt | Scope of Supply Definitions |
| division_of_eng.txt | Division of Engineering, Software Development & Erection/Commissioning Services |
| supervisors.txt | Supervisors |
| value_addition.txt | Value Addition |
| work_completion.txt | Work Completion Certificate |
| buyer_obligations.txt | Buyer Obligations |
| exclusion_list.txt | Exclusion List |
| buyer_prerequisites.txt | Buyer Prerequisites |
| binding_conditions.txt | Binding Conditions |
| cybersecurity.txt | Cybersecurity Disclaimer |
| disclaimer.txt | Disclaimer |
| poc.txt | Complimentary Proof of Concepts (PoC) |

## Maintenance Notes

- Keep each file ≤ 350 chars for token efficiency.
- Do not duplicate content already in shared context files.
- Use imperative, concise language — these instructions are read directly by the LLM.
- Review after any TS template structural changes.
