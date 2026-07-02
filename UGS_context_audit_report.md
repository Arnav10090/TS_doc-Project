# UGS Context.txt Audit Report

## Executive Summary
- Overall score out of 10: 2.8/10
- Readiness level: Not production-ready
- One-sentence verdict: The file contains useful UGS domain material, but as a prompt asset it is bloated, misaligned to the repository, overfit to one proposal, and unsafe to use as grounding for production section-by-section Gemini suggestions.

## What Is Strong
- The file contains real UGS category knowledge on architecture patterns, protocols, integration boundaries, risks, exclusions, and cybersecurity responsibilities.
- The file at least attempts anti-hallucination controls through repeated "must never be invented" blocks and placeholder usage.
- The diagram and Gantt sections correctly understand that downstream generation should be semantic and structured rather than raw mxGraph XML.
- The file distinguishes some recurring UGS patterns from occasional or rare patterns, which is useful when generalized correctly.
- The historical PDF and the context file are directionally aligned on major TS themes, so the author did read relevant source material.

## Critical Problems
- Severity: Critical. Location / section: `Repository Section Mapping`, `Section-Level Authoring Guidance`. What is wrong: The file maps many non-repository keys such as `general_overview`, `plant_technical_data`, `functional_specifications`, `future_scalability`, `system_architecture`, `network_architecture`, `scope_of_supply`, `training`, `support`, `risk_assessment`, `assumptions`, and `project_schedule`, while missing many real predefined keys such as `introduction`, `process_flow`, `overview`, `features`, `remote_support`, `documentation_control`, `customer_training`, `fat_condition`, `hardware_specs`, `software_specs`, `third_party_sw`, `supervisors`, `division_of_eng`, `work_completion`, `value_addition`, `buyer_prerequisites`, and `poc`. Why it matters for Gemini output: prompt assembly will either target keys that do not exist or fail to ground keys that do exist, which directly causes wrong structure, wrong content family, and import failures. Why it matters for token efficiency: a large share of the longest part of the file is spent on invalid mappings and therefore buys zero useful grounding. Recommended direction: delete all inferred or renamed section mappings and rebuild the section map from `backend/app/sections/router.py` and `frontend/src/components/sections/predefinedSectionContent.ts` only.
- Severity: Critical. Location / section: `Repository Section Mapping`, `tech_stack`, `system_config`, `overall_gantt`, `shutdown_gantt`, `scope_definitions`. What is wrong: even where a real key exists, several output shapes are wrong. `tech_stack` is defined in the repo as `rows` with `sr_no/component/technology/note`, but the context demands `software_rows` plus `hardware_rows`; `system_config` invents `key_parameters`; `overall_gantt` and `shutdown_gantt` invent text JSON contracts that do not match the repository's image-backed section fields; `scope_definitions` is left ambiguous as "Mode A or Mode C". Why it matters for Gemini output: the model can return payloads the frontend cannot import or render. Why it matters for token efficiency: verbose wrong schemas are worse than missing schemas because they actively train the model toward invalid output. Recommended direction: remove schema invention from the context file and let repository-derived builders own payload shape and mode selection.
- Severity: Critical. Location / section: whole file, especially repeated per-section blocks. What is wrong: the file is massively oversized for a grounding asset at roughly 180k characters, 26k words, and 3,084 lines, with `## Purpose` repeated 24 times and `### Section Purpose`, `### Expected Inputs`, and `### AI Generation Rules` repeated more than 20 times each. Why it matters for Gemini output: excessive prompt mass dilutes high-value facts, raises truncation pressure, and makes it harder for the model to weight the actually relevant constraints. Why it matters for token efficiency: the file burns a large amount of context budget restating the same instruction scaffolding instead of UGS-specific knowledge. Recommended direction: compress repeated section scaffolding into a compact matrix and keep only category facts that materially change model behavior.
- Severity: Critical. Location / section: `UGS Domain Overview`, `Project Schedule Guidance`, `Gantt Planning Guidance`, `Technology Stack Guidance`, `Section-Level Authoring Guidance`. What is wrong: the file is overfit to the single JSOL historical proposal and promotes one-proposal specifics as quasi-defaults, including steel as the fallback industry, IBA PDA as the expected source, 10-second and 60-second polling, 1-year retention, 20,000 tags, SQL Server and .NET stack choices, 32 GB RAM, 2 TB storage, 10 man-days, 3 training days, 5 trainees, 6 months support, and fixed duration bands. Why it matters for Gemini output: Gemini will present proposal residue as UGS truth and hallucinate project specifics when metadata is absent. Why it matters for token efficiency: every sample-specific number consumes context while narrowing generalization. Recommended direction: reframe proposal-derived numbers as observed examples only, or remove them when they are implementation choices rather than category knowledge.
- Severity: High. Location / section: `General Authoring Rules for All UGS TS Sections`, all per-section "Safe default assumption" blocks. What is wrong: fallback behavior is weak and inconsistent. The file sometimes says use placeholders, sometimes says infer, and sometimes says assume steel industry, IBA PDA, OPC UA, or specific architecture patterns. It also includes "Questions Gemini should ask" even though the AI Suggestions flow is single-shot and cannot ask follow-up questions. Why it matters for Gemini output: when data is missing, the model has conflicting instructions and is nudged toward invention rather than disciplined placeholders or omissions. Why it matters for token efficiency: unreachable instruction patterns such as "ask the user" waste tokens and create false affordances. Recommended direction: replace all interactive or assumption-heavy fallback text with one hard global rule: if project-specific data is absent, use placeholders or leave the field generic; do not guess.
- Severity: High. Location / section: whole file, especially legal and disclaimer sections. What is wrong: the file tries to be four things at once: category knowledge base, repository schema registry, prompt-format contract, and legal-language library. That is architectural drift, not grounding. Why it matters for Gemini output: the model receives mixed signals about whether the file is teaching domain facts, UI/import contracts, or approved legal clauses, which increases inconsistency and verbatim copying risk. Why it matters for token efficiency: schema and legal boilerplate dominate context that should be reserved for durable UGS knowledge patterns. Recommended direction: keep only reusable UGS domain knowledge and minimal global safety rules in `context.txt`; move section schemas to repository code and legal boilerplate to approved templates or static section defaults.
- Severity: High. Location / section: `Repository Section Mapping` status labels. What is wrong: the file marks mappings as `[CONFIRMED]`, `[MAPPED]`, and `[INFERRED]`, then still expects Gemini to rely on them. Inferred prompt contracts have no place in production grounding. Why it matters for Gemini output: the model is explicitly told to operate from partially guessed section definitions. Why it matters for token efficiency: inferred mappings add risk without adding trustworthy signal. Recommended direction: purge all inferred section contracts from the context file; if a section is not confirmed in code, it should not be described here as a generation target.
- Severity: High. Location / section: `Diagram Guidance`, `Gantt Planning Guidance`, `overall_gantt`, `shutdown_gantt`. What is wrong: these sections contain useful intent but too much implementation chatter, including colors, shapes, icon suggestions, exact layer labels, phase/task duplication, and fixed duration logic copied from one proposal. Why it matters for Gemini output: the model is likely to over-specify diagrams and timelines instead of generating clean, project-grounded semantic structures. Why it matters for token efficiency: the same schedule knowledge is repeated in multiple places with small variations. Recommended direction: reduce diagrams to node groups, allowed labels, and scope-boundary rules; reduce Gantt guidance to phases, dependency principles, milestone rules, and hard "indicative only" constraints.

## High-Value Compression Opportunities
- Compress the entire front half from `UGS Domain Overview` through `Gantt Planning Guidance` into a short pattern library of UGS purpose, common architecture options, integration patterns, recurring risks, recurring exclusions, and schedule principles.
- Collapse the 20+ repeated per-section blocks of `Section Purpose`, `Expected Inputs`, `Required Information`, `Information That Must Never Be Invented`, `AI Generation Rules`, and `Suggested Content Outline` into a concise table keyed only by real repository sections.
- Delete every `Questions Gemini should ask` block because the downstream feature is not conversational and cannot use that instruction path.
- Delete the duplicated schedule material that appears in `Implementation Methodology`, `Project Schedule Guidance`, `Gantt Planning Guidance`, `overall_gantt`, `shutdown_gantt`, and `project_schedule`.
- Delete the summary table at the end once repository-driven mapping exists in code; it adds drift and duplicates the already bloated mapping block.
- Delete stylistic draw.io details such as colors, icon types, and decorative legend advice unless a downstream converter explicitly consumes them.
- Delete proposal-style prose that helps a human reviewer but not the model, especially long explanatory paragraphs that restate obvious UGS concepts without adding generation constraints.

## Overfitting / Over-Specificity Issues
- `steel industry`, `integrated steel plant`, `Blast Furnace`, `Sinter`, and `RMHS` are treated as de facto defaults because the historical JSOL proposal is the hidden anchor. These should be framed as observed examples, not fallback truth.
- `10 seconds`, `60 seconds`, and `10 ms to 100 ms` polling intervals are presented too strongly. These are project-dependent and should never behave like defaults unless metadata confirms them.
- `1 year` retention is repeated throughout the file as if standard. That is a proposal-specific sizing choice and should be framed as an example or removed.
- `20,000 tags`, `32 GB RAM`, `2 TB storage`, `24 inch monitor`, `Windows Server`, `MS SQL Server`, `.NET Core`, `SignalR`, and specific antivirus/tooling references are implementation snapshots from one solution stack, not universal UGS knowledge.
- `10 man-days`, `3 days`, `5 trainees`, and `6 months` are repeatedly treated as normal parameters instead of optional commercial values. They should be explicitly labeled as observed examples only.
- `10-14 weeks`, `12-18 weeks`, `16-24 weeks`, `14-20 weeks`, and `18-28 weeks` appear in multiple schedule sections and read like default commitments. These must be clearly downgraded to indicative examples or removed.
- `3 Months for Software Configuration & Testing` in the historical PDF has leaked into the schedule logic. That is one proposal commitment, not category knowledge.
- `IBA PDA` and `OPC UA` are over-emphasized to the point of bias. They are common patterns, not safe substitutes for unknown source-system metadata.

## Missing or Weak Repository Mapping
- Missing repository sections: `introduction`, `process_flow`, `overview`, `features`, `remote_support`, `documentation_control`, `customer_training`, `fat_condition`, `hardware_specs`, `software_specs`, `third_party_sw`, `supervisors`, `division_of_eng`, `work_completion`, `value_addition`, `buyer_prerequisites`, and `poc`.
- Invented or renamed sections: `general_overview`, `plant_technical_data`, `functional_specifications`, `future_scalability`, `system_architecture`, `network_architecture`, `scope_of_supply`, `training`, `support`, `risk_assessment`, `assumptions`, and `project_schedule`.
- Implicit but not actionable mappings: `scope_of_supply` appears to be a human grouping over multiple actual sections, but the file never cleanly resolves that into repository-usable targets.
- Mode drift: the file mixes human TS section headings from the JSOL PDF with repository-defined editor sections from the app, which are not the same thing.
- Output-shape drift: `tech_stack`, `system_config`, `overall_gantt`, and `shutdown_gantt` are not mapped to the same structures used by `predefinedSectionContent.ts`.
- Confirmation labels are not enough: `[MAPPED]` and `[INFERRED]` still leave Gemini guessing, which defeats the point of repository alignment.

## Missing Safety Rules
- There is no hard global rule stating that project metadata, saved content, and draft content always override `context.txt` and historical documents when they conflict.
- There is no hard contradiction rule stating what Gemini must do when metadata says one thing and the category context says another.
- There is no hard fallback rule stating that when required project detail is absent, Gemini must use placeholders, generic wording, or omit the detail rather than assume steel, IBA PDA, OPC UA, SQL Server, or fixed durations.
- The anti-hallucination guidance is fragmented across many sections instead of enforced globally in a small number of priority rules.
- The file does not clearly separate "stable category pattern" from "single-document example" at the point of use; it often buries "Observed" notes in prose and then still treats the value as default.
- The file still encourages generated legal language from prompt context instead of requiring an approved legal template source where available.
- The file says "do not reproduce copyrighted source document text verbatim" once, but it does not strongly forbid copying historical-doc wording or standard disclaimer paragraphs line-for-line.
- The file includes interactive instructions such as "Questions Gemini should ask" even though the feature does not support follow-up clarification; that is a workflow safety failure.

## Diagram and Gantt Guidance Review
- Actionable enough: yes, at a high level. The file does provide useful semantic concepts such as architecture layers, scope boundaries, phase names, milestone logic, and week-based Gantt tasks.
- Too broad: yes. The guidance tries to cover every possible UGS diagram and schedule case instead of giving a tight downstream contract.
- Too detailed: yes. Color palettes, icon shapes, exact labels, duplicate phase lists, and repeated duration ranges are unnecessary prompt ballast.
- What should be tightened: keep only node groups, relationships, optional vs required labels, buyer/seller boundary rules, allowed placeholders, phase/task/dependency principles, and the rule that all schedule values are indicative unless confirmed by metadata.
- What should be removed: styling guidance, duplicated schedule descriptions, copied proposal durations, and any text JSON contract that does not match actual repository fields.

## Section-by-Section Quality Notes
- `Repository Section Mapping`: worst section in the file; it is not trustworthy enough to drive prompt assembly.
- `Technology Stack`: overfit to one proposal and structurally wrong for the actual `tech_stack` section.
- `System Config`: partially useful but invents extra fields and duplicates adjacent architecture guidance.
- `Overall Gantt` and `Shutdown Gantt`: useful conceptually, but duplicated, over-specific, and only partially aligned with actual section storage.
- `General Authoring Rules for All UGS TS Sections`: contains the right idea but the wrong fallback behavior; placeholders and non-invention rules need to be global and much harder.
- `Executive Summary`, `General Overview`, `Functional Specifications`, and `Future Scalability`: these mirror the historical PDF's human sectioning more than the repository's editor section model.

## Priority Fix List
- Critical: Replace the entire repository mapping with a repo-derived allowlist and payload map from `backend/app/sections/router.py` and `frontend/src/components/sections/predefinedSectionContent.ts`.
- Critical: Remove invented section keys and any output contract that does not match actual repository data shapes.
- Critical: Cut the file aggressively; the current size is unjustifiable for prompt-time use.
- High: Reframe or remove all sample-derived numbers, hardware sizing, polling intervals, retention values, support durations, training counts, and schedule ranges.
- High: Add a short global safety block defining source priority, contradiction handling, missing-data fallback, and "do not invent" behavior.
- High: Delete interactive instructions such as "Questions Gemini should ask" and any prose written for human readers instead of the model.
- Medium: Compress diagrams and Gantt guidance into minimal semantic rules and remove styling chatter.
- Medium: Move legal-language dependence out of `context.txt` if an approved template or section default already exists in the repository.
- Low: Keep only a small curated set of genuinely reusable UGS patterns such as integration boundaries, common risks, common exclusions, and architecture options.

## Final Verdict
- NEEDS SIGNIFICANT REVISION

## Recommended Next Steps
- Rebuild the section mapping against the actual repository keys and delete every invented or inferred section target.
- Strip the file down to reusable UGS category knowledge only; do not let it act as a schema registry or UI contract.
- Add one global precedence and fallback block that explicitly orders metadata, saved content, draft content, `context.txt`, historical docs, and general knowledge.
- Reclassify every hard-coded number, duration, stack choice, and hardware spec as either an observed example or a removal candidate.
- Collapse repeated section scaffolding into a compact format and keep per-section guidance only where it materially improves output.
- Tighten diagram and Gantt guidance to minimal semantic instructions aligned with the real repository section fields.
- Re-run the audit after trimming to verify that the final asset is short, repository-safe, and hallucination-resistant.
