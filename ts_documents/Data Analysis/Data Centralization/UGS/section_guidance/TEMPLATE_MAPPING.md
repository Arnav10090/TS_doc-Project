# UGS Section Guidance — Template Heading to Repository Key Mapping

## Overview

This document records the complete mapping from ORIGINAL TS template headings to the
repository section keys used in routing and file naming.

## Mapping Table

| Template Heading | Repository Key | Guidance File | Notes |
|---|---|---|---|
| Executive Summary | executive_summary | executive_summary.txt | Top-level business positioning |
| General Overview | *(distributed)* | — | No dedicated repository section |
| Introduction | introduction | introduction.txt | Formal opening with enquiry ref |
| Abbreviations Used | abbreviations_used | abbreviations_used.txt | AI button suppressed in app |
| Process Flow | process_flow | process_flow.txt | Data flow diagram + annotations |
| Overview of {{SolutionName}} | overview | overview.txt | Solution problem-statement section |
| Design Scope of Work (Offerings) | features | features.txt | Feature list with value-add markers |
| Remote Support | remote_support | remote_support.txt | NDA, VPN, working-hours scope |
| Documentation Control | documentation_control | documentation_control.txt | Delivered doc list, built-in help |
| Customer Training | customer_training | customer_training.txt | On-site scope, mutual agenda |
| System Configuration (for Reference) | system_config | system_config.txt | Architecture option, reference-only |
| FAT Condition | fat_condition | fat_condition.txt | Test scope, FAT report, shipment gate |
| Technology Stack | tech_stack | tech_stack.txt | Component table + version guidance |
| Hardware Specifications | hardware_specs | hardware_specs.txt | BOM, sizing by tag count |
| Software Specifications | software_specs | software_specs.txt | Software stack, license derivation |
| Third Party Software | third_party_sw | third_party_sw.txt | Remote support link, buyer VPN |
| Schedule — Overall Gantt | overall_gantt | overall_gantt.txt | M1-M5 phase structure, JSON format |
| Schedule — Shutdown Gantt | shutdown_gantt | shutdown_gantt.txt | Non-intrusive approach, permits |
| Scope of Supply Definitions | scope_definitions | scope_definitions.txt | BD/BE/DD/SU/ER/COM abbreviations |
| Division of Engineering, Software Dev & Erection/Commissioning | division_of_eng | division_of_eng.txt | B/S/B-S codes, responsibility matrix |
| Supervisors | supervisors | supervisors.txt | Man-day allocation, travel exclusion |
| Value Addition | value_addition | value_addition.txt | Complimentary scope, IP retention |
| Work Completion Certificate | work_completion | work_completion.txt | Three-criteria, deemed-issued clause |
| Buyer Obligations | buyer_obligations | buyer_obligations.txt | Prerequisite list, imperative tone |
| Exclusion List | exclusion_list | exclusion_list.txt | Standard exclusions, scope disputes |
| Buyer Prerequisites | buyer_prerequisites | buyer_prerequisites.txt | Phase-gate → gated activity mapping |
| Binding Conditions | binding_conditions | binding_conditions.txt | Boilerplate only, no novel clauses |
| Cybersecurity Disclaimer | cybersecurity | cybersecurity.txt | Responsibility + liability structure |
| Disclaimer | disclaimer | disclaimer.txt | Four-subsection structure, boilerplate |
| Complimentary Proof of Concepts (PoC) | poc | poc.txt | Platform demo, IP retention, scope |

## Design Decisions

- **"abbreviations"** is the base repository key but the guidance file is named
  `abbreviations_used.txt` to match the template heading exactly, since the AI button
  is suppressed for this section in the current application. File kept for completeness.
- **"General Overview"** has no repository section; its content is distributed across
  `overview` and `introduction` sections.
- **Hardware / Software / Third Party SW** are implicit sub-sections of "Technology Stack"
  in the template; they have separate repository keys to enable targeted context routing.
