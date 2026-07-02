# Plate Mill TS Type Context Architecture

## Purpose
This directory contains the production-ready context files and section guidance mapping for the Plate Mill Yard Management System TS Type.

## Layered Context Architecture
The knowledge is decomposed into the following shared context layers:

- **domain_context.txt**: Domain knowledge (business drivers, operational environment, capabilities, glossary).
- **architecture_context.txt**: Architecture knowledge (deployment topology, integration patterns, technology stack).
- **implementation_context.txt**: Implementation knowledge (testing, risks, standard assumptions/exclusions).
- **cybersecurity_context.txt**: Cybersecurity boundaries and disclaimers.
- **gantt_context.txt**: Schedule strategy, implementation phases, and draw.io diagram guidance.
- **context.txt.template**: Global rules, placeholders, and anti-hallucination constraints.

## Section Guidance
The `section_guidance/` directory contains targeted writing instructions for every TS template section. This ensures high-quality AI generation without duplicating shared contextual knowledge. See `section_guidance/TEMPLATE_MAPPING.md` for the explicit mapping.

## Runtime Loading
During AI generation, the system loads the shared context files (domain, architecture, implementation, etc.) alongside the specific section guidance file for the active section being generated.

## Maintenance Guidance
- Keep shared contexts pure: do not add section-specific formatting to domain/architecture files.
- Keep section guidance pure: do not add domain knowledge to the section guidance files.
- When adding new features, update `domain_context.txt` and `architecture_context.txt`.
- When modifying the template, update `section_guidance/` and `TEMPLATE_MAPPING.md`.
