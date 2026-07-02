# Level 2 — Layered Context Architecture

## Purpose

This directory contains the **decomposed context files** for the Level 2 Production Management System
(L2 PMS) TS type. Together with the `section_guidance/` subdirectory, these files provide the
AI Suggestions engine with all domain, architecture, implementation, cybersecurity, and scheduling
knowledge needed to generate grounded, accurate TS section content.

The knowledge in these files is decomposed from the approved master file
`ts_context_files/Level 2/Level2_Context.txt`. That file remains the single source of truth;
these decomposed files are the **runtime representation** optimised for layered context loading.

## Shared Context Files

| File | Contents |
|---|---|
| `domain_context.txt` | What L2 PMS is, core and optional capabilities, business drivers, plant environment |
| `architecture_context.txt` | Three-tier topology, HA option, protocols, data acquisition, storage, integration patterns, tech stack, diagram guidance |
| `implementation_context.txt` | Implementation phases (M0–M5), testing (FAT/SAT), risks, assumptions, exclusions, buyer obligations, value-addition/PoC |
| `cybersecurity_context.txt` | Cybersecurity responsibility split (buyer/seller), disclaimer guidelines, hard prohibitions |
| `gantt_context.txt` | Gantt phases, milestones, draw.io JSON format, shutdown gantt structure, mandatory indicative-only language |

## Section Guidance

The `section_guidance/` subdirectory contains one `.txt` file per repository section key,
providing section-specific writing instructions (structure, tone, avoidances, L2-specific notes).
See `section_guidance/README.md` for the file index and format specification.

See `section_guidance/TEMPLATE_MAPPING.md` for the complete mapping from original TS template
headings to repository section keys, guidance files, and loaded shared contexts.

## Runtime Loading

The AI Suggestions engine loads context in layers:

1. **Project metadata** (highest priority)
2. **Current saved section content**
3. **Current draft content**
4. **Historical L2 PMS TS documents**
5. **Shared context files** (this directory) — loaded based on section needs
6. **Section guidance file** — loaded for the target section
7. **General industry knowledge** (lowest priority)

Conflict resolution: higher-priority layers always override lower-priority layers.

## Maintenance Guidance

- **Master source**: All changes must first be made to `ts_context_files/Level 2/Level2_Context.txt`,
  then decomposed into these files. Do not edit decomposed files directly without updating the master.
- **No duplication**: Shared contexts contain only reusable knowledge. Section guidance files contain
  only section-specific instructions. Do not duplicate content across layers.
- **No invention**: These files must not contain knowledge that does not appear in the approved master.
  Anti-hallucination guardrails (placeholder strategy, "must not invent" rules) are preserved from the master.
- **Format consistency**: Follow the same file format, naming conventions, and decomposition philosophy
  used in the UGS TS type (`ts_documents/Data Analysis/Data Centralization/UGS/`).
