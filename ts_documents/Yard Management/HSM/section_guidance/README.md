# HSM Section Guidance Files

## Purpose

This directory contains **section-specific guidance files** for the HSM (Hot Strip Mill Yard Management System) TS type. Each `.txt` file provides targeted writing instructions for a specific TS template section.

These guidance files are loaded by the AI suggestions engine (layer 5 — section guidance) when generating content for the corresponding section. They complement the shared context files (`domain_context.txt`, `architecture_context.txt`, etc.) with section-specific structure, tone, and content guidelines.

## File Naming Convention

Files are named after the **repository section key** (not the template heading):

`{section_key}.txt`

See `TEMPLATE_MAPPING.md` for the complete template heading → repository key mapping.

## File Format

Each guidance file is plain text, concise, and actionable:

```
Purpose: <Role>
Required Inputs: <Required>
Safe Inferences: <Infer>
Must Not Invent: <Never invent>
Suggested Structure: <Structure>
AI Generation Rules: Do NOT duplicate shared knowledge from the context files.
```

## Maintenance Notes

- Do not duplicate content already in shared context files.
- Use imperative, concise language — these instructions are read directly by the LLM.
- Review after any TS template structural changes.
