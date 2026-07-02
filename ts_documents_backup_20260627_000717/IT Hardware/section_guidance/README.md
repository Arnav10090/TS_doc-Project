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

These guidance files were generated for: **IT Hardware**
Review each file and adapt it to reflect the specific capabilities, terminology,
and scope of this product type. Replace [DRAFT] markers with finalized content.
