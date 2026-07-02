# AI Assistance for TS Document Sections
## Feature Requirement Document — KIRO-READY

**Product:** TS Document Generator (Hitachi India)
**Feature:** AI Section Suggestions via Gemini API
**Document version:** 1.4
**Date:** 2026-06-11
**Status:** Revised — TRAE AUDIT2 alignment complete (Issues 1–7)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals](#3-goals)
4. [Non-Goals](#4-non-goals)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [UX / UI Requirements](#7-ux--ui-requirements)
8. [Backend Requirements](#8-backend-requirements)
9. [AI / Prompt Engineering Requirements](#9-ai--prompt-engineering-requirements)
10. [Retrieval / Grounding Requirements](#10-retrieval--grounding-requirements)
11. [Data Flow and Sequence Flow](#11-data-flow-and-sequence-flow)
12. [API Contract Recommendations](#12-api-contract-recommendations)
13. [Suggested Data Models and Storage Changes](#13-suggested-data-models-and-storage-changes)
14. [Draw.io Chart Generation Requirements](#14-drawio-chart-generation-requirements)
15. [Import Suggestion Workflow](#15-import-suggestion-workflow)
16. [Error Handling and Fallback Behavior](#16-error-handling-and-fallback-behavior)
17. [Security and Abuse Considerations](#17-security-and-abuse-considerations)
18. [Performance and Latency Considerations](#18-performance-and-latency-considerations)
19. [Testing Requirements](#19-testing-requirements)
20. [Acceptance Criteria](#20-acceptance-criteria)
21. [Rollout Plan / Implementation Phases](#21-rollout-plan--implementation-phases)
22. [Open Questions / Assumptions](#22-open-questions--assumptions)

---

## 1. Executive Summary

This document specifies the requirements for adding AI-assisted content suggestions to every eligible section of the TS Document Generator — all predefined sections, custom sections, and custom subsections — with three sections suppressed (`cover`, `revision_history`, `abbreviations`). When authoring a Technical Specification document, users will see an **AI Suggestions** button in each eligible section's input panel. Clicking this button invokes the Gemini API through the existing FastAPI backend.

Every suggestion is assembled per section using a layered knowledge hierarchy: current project metadata, current saved section content, current draft content (unsaved edits already in the editor), a category-specific `context.txt` file, historical TS documents from the matching TS category folder, and the LLM's general knowledge. Including draft content means the AI always sees the user's latest edits without requiring a save first. Each section receives its own independent prompt; sections are not batched.

The AI returns section-specific content that the user reviews and optionally imports with a single click. Imported content populates the section's draft state in editable form. The existing explicit SAVE workflow is unchanged: AI content is not persisted until the user clicks SAVE. After saving, AI-imported content flows through the existing preview and DOCX export pipeline without modification. Once saved, AI content is architecturally identical to manually authored content.

For Gantt and schedule chart sections (`overall_gantt`, `shutdown_gantt`), the AI can additionally generate draw.io-compatible output via a separate endpoint. The backend converts structured AI output to mxGraph XML deterministically. The user imports this XML into draw.io, exports a PNG, and uploads it through the existing image upload mechanism.

**Coexistence with `ai_prompts`:** The repository already contains a separate `ai_prompts` subsystem that generates prompts for external tools. This new AI Suggestions feature is a distinct, additive module. It does not share routes, logic, or data with `ai_prompts`. The `ai_prompts` endpoints remain untouched in all phases of this feature. Both subsystems coexist independently under `/api/v1`.

**Section taxonomy:** The predefined section keys and content field shapes used throughout this document must match the actual keys and shapes defined in the repository's `predefinedSectionContent.ts` and `sections/router.py`. Those files are the authoritative source of truth. Any section key or field name that does not appear in those files must not be used in prompt examples, API examples, or schema mappings.

> **Global document rule — repository taxonomy:** The repository-defined section taxonomy (keys defined in `predefinedSectionContent.ts` and `sections/router.py`) is the authoritative source of truth for all section references in this document. This document must not introduce section keys that do not exist in the repository. Any section key used in examples, mode assignments, API contracts, acceptance criteria, or test cases must be confirmed as present in the repository's predefined section allowlist or match the `custom_section_*` pattern. Where example section keys are needed and the correct key cannot be confirmed, use neutral wording such as "narrative prose sections whose schema is defined in `predefinedSectionContent.ts`" instead of inventing or assuming a key.

> **Global document rule — repository schema mapping:** The mode assignment for each predefined section (Mode A, B, C, D, E) must be derived from the actual repository schema mapping implemented in `builders.py`. The repository schema mapping is the source of truth. This document defines how each mode behaves; it does not authoritatively assign sections to modes. Any section-family assignment stated in this document is advisory only and must be confirmed against `predefinedSectionContent.ts` before being encoded in `builders.py`.

---

## 2. Problem Statement

TS document authors at Hitachi India spend significant time writing section content from scratch or copy-pasting from previous documents manually. Two specific pain points exist:

1. **Content initiation friction.** Each document section requires authors to recall relevant technical details, standard phrasing used by Hitachi, and content patterns from prior TS documents in the same category. This discovery process is manual, inconsistent, and time-consuming.

2. **Gantt and schedule chart creation.** Authors must manually author charts in external tools. Prompts are generic and not grounded in category-specific history or the project's technical data, requiring significant rework before the chart can be imported as an image.

Both problems are solvable by grounding a generative model in the project's own metadata plus historical TS documents from the same deployment category, then surfacing the output directly inside the editing workflow. Note: the repository already contains AI prompt-generation functionality for architecture and chart-related workflows. This feature is scoped to per-section TS content authoring and must not duplicate or replace that existing flow.

---

## 3. Goals

- **G1.** Place an AI Suggestions button in every eligible section editor — all predefined sections (except the three suppressed ones), custom sections, and custom subsections — accessible without leaving the editor page.
- **G2.** Ground every AI response through a layered knowledge hierarchy: current project metadata → existing saved section content → current draft content (unsaved edits in the request body) → category `context.txt` → historical TS documents from the matching category folder → PROJECT_CONTEXT.md product knowledge → LLM general knowledge.
- **G3.** Issue per-section prompts assembled in the knowledge hierarchy priority order. Each button click constructs a prompt specific to the target section; sections are never batched.
- **G4.** Support a `context.txt` file per TS category that the retrieval pipeline automatically includes as the primary curated grounding source when present.
- **G5.** Return suggestions in a structure that matches the actual editable data shape of the target section — rich text HTML for prose sections, JSON row arrays for table sections using the exact field keys defined by the frontend schema, and structured JSON objects for mixed-field sections — so import requires no manual reformatting.
- **G6.** For Gantt and schedule chart sections (`overall_gantt`, `shutdown_gantt`), generate draw.io-compatible mxGraph XML via a backend JSON-to-XML converter so the chart creation loop is shorter. This is scoped to Gantt/schedule sections only.
- **G7.** Preserve the existing explicit SAVE workflow; AI content must not persist to the backend unless the user clicks SAVE.
- **G8.** Preserve preview/export parity: AI-imported content saved via SAVE must appear in the browser preview and in the generated DOCX exactly as manually authored content does.
- **G9.** Keep the Gemini API key server-side only; never expose it to the frontend.
- **G10.** Design the retrieval API contract to remain stable even if the underlying retrieval strategy is later upgraded from folder-based file scanning to a vector-based RAG system. Do not expose retrieval implementation details in the API response.

---

## 4. Non-Goals

- **NG1.** This feature does not add autosave to the backend. The explicit SAVE workflow is unchanged.
- **NG2.** This feature does not add authentication or RBAC.
- **NG3.** This feature does not replace the TipTap rich text editor or the existing section JSON schema.
- **NG4.** This feature does not create a persistent vector database or semantic search index in this phase. Historical document retrieval is filesystem-based. However, the API contract for the retrieval module is designed so that the internal retrieval strategy can be upgraded to vector-based RAG in a future phase without changing the endpoint shape or the prompt assembly logic.
- **NG5.** This feature does not automatically generate the full DOCX from AI content. AI content goes through the same manual editing and save process as any other content.
- **NG6.** The AI Suggestions button is not shown for `cover`, `revision_history`, and `abbreviations`. These sections are auto-populated with project metadata or managed by automated workflows and do not benefit from AI content suggestions. This is a UI-level suppression only; it does not change how those sections are saved or exported.
- **NG7.** This feature does not stream Gemini responses token-by-token to the UI. Responses are returned when complete.
- **NG8.** This feature does not send DOCX files or binary data to the Gemini API. Only extracted plain text from historical documents is included in prompts.
- **NG9.** This feature does not add multi-turn AI conversation. Each button click is a single, stateless API request.
- **NG10.** This feature does not replace or duplicate the existing AI prompt-generation endpoints (`ai_prompts`) already present in the repository. It is a separate, additive feature scoped to per-section content authoring. Both can coexist. **Phase 1 coexistence boundaries (enforced in all phases):** The `ai_prompts` routes are untouched; the `ai_prompts` data model is untouched; the `ai_prompts` UX is untouched; no changes to `ai_prompts/router.py`, `ai_prompts/builders.py`, or any related `ai_prompts` files are permitted in any phase of this feature. The new AI Suggestions module must be fully additive and must not reference, depend on, or modify any component of the `ai_prompts` module.

---

## 5. User Stories

**US-01 — TS Type Selection at Project Creation**
As a TS document author, when I create a new project I want to select the TS category (e.g., "Data Analysis / Data Centralization") so that the AI can ground its suggestions in the right category of historical documents.

**US-02 — AI Suggestions Button in Every Section**
As an author editing any section in the right input panel — whether a predefined section, a custom section, or a custom subsection — I want to see an "AI Suggestions" button so I can request a content suggestion for that section without switching tools.

**US-03 — Section-Specific Content Suggestions**
As an author, when I click AI Suggestions for a repository-confirmed predefined section whose editable schema includes row data, I want to receive a prefilled structure with rows grounded in my project metadata and historical TS documents from my selected category, so I have a relevant starting point rather than an empty section.

**US-04 — Rich Text Suggestions**
As an author working on a repository-confirmed predefined section whose editable schema includes narrative prose fields, I want to receive formatted prose with bullet points that reflects my project's solution name, client, and context, so I can quickly import and refine it rather than writing from scratch.

**US-05 — Import Suggestion into Editor**
As an author reviewing an AI suggestion, I want to click one button to import the suggestion into the section editor in editable form, so I can make further changes before saving.

**US-06 — Save AI Content Like Any Other Content**
As an author who has imported and refined an AI suggestion, I want to use the existing SAVE button to persist the content so it appears in the preview and flows into the generated DOCX exactly as manually authored content does.

**US-07 — Draw.io Output for Gantt Sections**
As an author working on the Overall Gantt or Shutdown Gantt section, I want to generate draw.io-compatible output grounded in my project timeline and category context, so I can import it into draw.io, export a PNG, and upload the chart back into the app.

**US-08 — Graceful Failure**
As an author, if the AI Suggestions call fails or returns unusable content, I want to see a clear error message and be able to dismiss the panel and continue editing manually, without any data loss or disruption to my draft.

**US-09 — Custom Section AI Suggestions**
As an author who has added a custom section to the document, I want to click AI Suggestions for that custom section and receive relevant content grounded in my project context and TS category, so custom sections benefit from the same AI assistance as predefined ones.

---

## 6. Functional Requirements

### 6.1 TS Type at Project Creation

**FR-6.1.1** The project creation form (`NewProjectModal.tsx`) must include a required "TS Type" dropdown field.

**FR-6.1.2** The dropdown must be populated from a fixed enumeration of valid TS types defined in the backend. The enumeration maps a display label to a canonical category folder path string. Each category path corresponds to a folder within `ts_documents/` whose subfolders contain the actual example TS document files.

| Display Label | Canonical Path Value |
|---|---|
| Data Analysis — Advanced Analysis | `Data Analysis/Advanced Analysis` |
| Data Analysis — Data Centralization | `Data Analysis/Data Centralization` |
| Data Analysis — Data Monitoring | `Data Analysis/Data Monitoring` |
| Level 2 | `Level 2` |
| OT Cybersecurity | `OT Cybersecurity` |
| OT Upgrades — HMI | `OT Upgrades/HMI` |
| OT Upgrades — L2 | `OT Upgrades/L2` |
| OT Upgrades — POC Upgrade | `OT Upgrades/POC Upgrade` |
| Yard Management — HSM | `Yard Management/HSM` |
| Yard Management — Plate Mill | `Yard Management/Plate Mill` |

Example mapping: selecting "Data Analysis — Data Centralization" resolves to the folder `ts_documents/Data Analysis/Data Centralization/`, which itself contains project subfolders such as `Historian/` and `UGS/`, each holding historical TS document files. The retrieval service scans the category folder and all its subfolders recursively to locate historical documents (see Section 10.2).

**FR-6.1.4** The `ts_type` field must be sent in `POST /api/v1/projects` as the canonical path string. The backend must validate that the value is one of the defined enum members and reject the request with `422` if it is not.

**FR-6.1.5** A new `ts_type` column must be added to the `projects` table and stored on the `Project` SQLAlchemy model. The database column shall be nullable to preserve backward compatibility with existing projects. Separately, the business rule requires that newly created projects provide a non-null `ts_type` value; the API and UI must enforce this validation and reject creations that omit `ts_type`.

**FR-6.1.5** The `ts_type` value must be returned in `ProjectDetail` and `ProjectSummary` response schemas.

**FR-6.1.6** **Product decision:** `ts_type` is treated as immutable after project creation in this phase. If the team later determines that TS type should be editable, a PATCH mechanism must be added as a separate feature. This decision is recorded in Section 22 (Open Questions / Assumptions).

### 6.2 AI Suggestions Button

**FR-6.2.1** Every eligible section editor rendered inside `SectionInputPanel` must include an "AI Suggestions" button. This includes all 31 predefined section keys and all custom sections (`custom_section_*` keys). AI suggestions must work for every eligible section type, subject only to FR-6.2.3. The button placement must be consistent across both predefined and custom section editors.

**FR-6.2.2** The button must be visible without scrolling within the section input panel header area, positioned alongside or near the section title. It must not obscure the existing SAVE button.

**FR-6.2.3** The AI Suggestions button must NOT appear for three sections: `cover`, `revision_history`, and `abbreviations`. These sections are auto-populated at project creation time and are managed by automated or user-identity-specific workflows. AI content suggestions have no value for them. All other predefined sections and all custom sections and subsections must show the button.

**FR-6.2.4** When clicked, the button must enter a loading state (spinner, disabled) while the API request is in flight.

**FR-6.2.5** The button must return to its default state after the response is received (success or error).

**FR-6.2.6** A second click while loading must be ignored (button is disabled during loading).

**FR-6.2.7** If the current project has `ts_type = NULL` (a project created before TS type selection was introduced), the AI Suggestions button must be visible but disabled. A tooltip or inline message must read: "Select TS Type first. This project was created before TS type selection was available." No API call must be made when the button is in this disabled state. A future PATCH mechanism to set `ts_type` on legacy projects would re-enable the button. This rule applies consistently in the frontend; the backend also enforces it (see Section 16.1).

### 6.3 AI Suggestion Panel

**FR-6.3.1** When an AI suggestion is successfully returned, a suggestion panel must appear within the section input area, below the section's input fields. The panel must not replace the editor or push existing content off-screen.

**FR-6.3.2** The suggestion panel must display a formatted preview of the suggested content. Bullet points must render as visual bullets. Tables must render as a table preview. Rich text must render with basic formatting visible.

**FR-6.3.3** The panel must include an **Import Suggestion** button, a **Regenerate** button, and a **Dismiss** button.

**FR-6.3.4** Clicking **Import Suggestion** must populate the section's current draft state with the suggestion content (see Section 15 for detailed import logic). The panel must close or collapse after import.

**FR-6.3.5** Clicking **Regenerate** must issue a new API request and replace the panel content with the new suggestion. The existing draft is not modified.

**FR-6.3.6** Clicking **Dismiss** must close the panel without modifying the draft.

**FR-6.3.7** Navigating to a different section must automatically dismiss any open suggestion panel without modifying the draft.

**FR-6.3.8** For Gantt and schedule sections that support draw.io chart generation (`overall_gantt`, `shutdown_gantt`), the suggestion panel must include an additional **Generate Draw.io Chart** button. This button triggers a separate API call and is independent of the text suggestion flow. It does not appear for any other section type.

### 6.4 Import Behavior

**FR-6.4.1** Imported content must populate the section's in-memory draft state, not the persisted backend state. The draft follows the existing `sectionDraftStore` mechanism in `frontend/src/utils/`.

**FR-6.4.2** After import, the section editor fields must reflect the imported content and be fully editable by the user.

**FR-6.4.3** The existing SAVE button must persist the imported (and potentially further-edited) content through the standard `PUT /api/v1/projects/{project_id}/sections/{section_key}` endpoint.

**FR-6.4.4** After saving imported AI content, the browser preview must reflect it using the same `mergeSectionContent` and `buildContentWithEditMetadata` functions used for manually authored content.

**FR-6.4.5** After saving imported AI content, the DOCX export must include it without any additional processing steps.

**FR-6.4.6** Import semantics differ by section content family, as defined in Section 15.2. For table sections (Mode B), importing replaces all existing rows in the draft because the user is explicitly requesting a new set of rows. For mixed-field sections (Mode C), importing performs a field-level merge that preserves fields not covered by the suggestion. For rich text sections (Mode A), importing replaces the full editor content. These are intentional per-family behaviors, not contradictions.

### 6.5 Draw.io Chart Generation

**FR-6.5.1** The draw.io chart generation endpoint is available for Gantt and schedule sections only: `overall_gantt` and `shutdown_gantt`. Requests for any other section key must return `400`. `system_config` is not in scope for chart generation; it receives a text description suggestion only (Mode E).

**FR-6.5.2** The response must contain a string field `drawio_xml` containing valid mxGraph XML produced by the backend `gantt_converter.py` module (Option B: JSON-to-server-conversion). The LLM outputs structured Gantt task JSON; the backend converts it deterministically to mxGraph XML. The resulting XML can be imported directly into draw.io / diagrams.net.

**FR-6.5.3** The response must also contain a `chart_instructions` string field with a short step-by-step guide for the user on how to import the XML into draw.io and export a PNG.

**FR-6.5.4** The XML must represent a horizontal bar Gantt chart with tasks derived from the project timeline data and grounded in category-specific historical context.

**FR-6.5.5** The user must be able to copy the `drawio_xml` content from the UI with a single click (copy-to-clipboard button).

**FR-6.5.6** After the user generates and exports the chart from draw.io, they upload the PNG through the existing image upload mechanism (`DiagramUpload` component and `POST /api/v1/projects/{project_id}/images/{image_type}` endpoint). No new upload flow is required for this.

### 6.6 AI Suggestions for Custom Sections and Subsections

**FR-6.6.0** Custom sections are persisted as a single JSONB section payload in `section_data` under the `custom_section_*` section key. Subsections are nested within that payload as a `subsections` array (per the `CustomSectionContent` schema in `customSections.ts`). AI suggestions target the content values of existing subsections within this nested structure. AI suggestions never create new subsection entities, delete existing subsection entities, or persist subsection data as standalone records separate from the parent custom section payload.

**FR-6.6.1** Custom sections (`custom_section_*` keys) must support AI suggestions. The AI Suggestions button must appear in the custom section editor with the same behavior as for predefined sections.

**FR-6.6.2** For custom sections, the backend must read the section's saved `section_data.content` to determine the custom section's title and its subsection structure before building the prompt. If the custom section has never been saved, the backend must return `404` with: `{"detail": "Section not found. Save the section at least once before requesting AI suggestions."}` This ensures the prompt has a title and content structure to work with.

**FR-6.6.3** The backend must inspect the saved custom section's content structure to determine which content type each subsection holds (prose, table, image, or other). The exact field names used in the custom section JSON payload are defined by the frontend's custom section schema. The backend must not assume invented field names — it must read the actual saved structure. The output mode per subsection must be derived from the saved content type, not from a hardcoded mapping.

**FR-6.6.4** When a custom section contains multiple subsections of mixed types, the AI generates suggestions for each subsection independently. The `SuggestionResponse` for a custom section includes a `subsection_suggestions` array field instead of a single `content` field. Each entry in the array corresponds to a subsection by its index or identifier as stored in the saved content. The import logic distributes suggestions to the correct subsection editor inputs.

**FR-6.6.5** The existing `PUT /api/v1/projects/{project_id}/sections/{section_key}` endpoint persists custom section content after import, unchanged from the standard save workflow. No additional endpoints are required.

**FR-6.6.6** Custom section AI suggestions must not create or delete subsections. Only the content values within existing subsections may change. The overall section structure (number of subsections, their types) is preserved.

---

## 7. UX / UI Requirements

### 7.1 Button Placement

**UI-7.1.1** The AI Suggestions button must appear in the header area of `SectionInputPanel`, in the same toolbar row as the section title and existing SAVE button. It must be placed to the left of the SAVE button so SAVE remains the rightmost primary action.

**UI-7.1.2** The button label must read "✨ AI Suggestions". The sparkle emoji provides a consistent visual cue across all sections without requiring an icon library addition.

**UI-7.1.3** The button must use a secondary visual style (outline or ghost variant) to visually distinguish it from the primary SAVE button.

**UI-7.1.4** While loading, the button label must change to a spinner icon plus "Generating…" text and the button must be disabled.

### 7.2 Suggestion Panel Layout

**UI-7.2.1** The suggestion panel must render as a collapsible card directly below the section's input fields within `SectionInputPanel`, not as a modal or overlay that obscures the document preview.

**UI-7.2.2** The panel header must read "AI Suggestion — [Section Title]" and include a close (×) icon aligned to the right.

**UI-7.2.3** The panel must have a visually distinct background (e.g., a light blue or tinted background) to communicate that the content is AI-generated and not yet part of the saved document.

**UI-7.2.4** A small disclaimer line must appear at the bottom of the panel in muted text: "AI-generated content. Review before saving."

**UI-7.2.5** For rich text sections, the suggested content must render using the same preview styling as the existing document preview (same font family, paragraph spacing). A read-only rendering of TipTap output is acceptable.

**UI-7.2.6** For table-type sections, the suggested rows must render as a compact HTML table inside the panel with visible borders.

**UI-7.2.7** The **Import Suggestion** button must be styled as the primary action within the panel (filled/solid button style). The **Regenerate** and **Dismiss** buttons must be styled as secondary actions.

**UI-7.2.8** For draw.io-capable sections, the **Generate Draw.io Chart** button must appear as a separate secondary action inside the suggestion panel, below the text suggestion content. It must have its own loading state independent of the text suggestion loading state.

**UI-7.2.9** The draw.io XML output must be shown in a scrollable `<pre>` code block with a "Copy XML" button. The copy button must change to a checkmark for 2 seconds on success.

### 7.3 Section Selector and Navigation

**UI-7.3.1** Navigating away from a section in the sidebar while a suggestion panel is open must automatically close the panel. No confirmation dialog is required.

**UI-7.3.2** The suggestion panel state (open/closed, current suggestion content) is transient UI state. It must not be persisted to `localStorage` or the backend.

### 7.4 Toast Notifications

**UI-7.4.1** On successful import, a `react-hot-toast` success toast must read: "Suggestion imported. Review and click SAVE to persist."

**UI-7.4.2** On AI API failure, a `react-hot-toast` error toast must read: "AI suggestion failed. Please try again." The suggestion panel must show an error state with the Regenerate button.

**UI-7.4.3** On successful copy of draw.io XML, a `react-hot-toast` success toast must read: "XML copied. Paste into draw.io to create your chart."

---

## 8. Backend Requirements

### 8.1 New Domain: `ai_suggestions`

**BE-8.1.1** Create a new domain module at `backend/app/ai_suggestions/`. The module must follow the existing router + service pattern: thin router in `router.py`, business logic in `service.py`, prompt builders in `builders.py`.

**BE-8.1.2** The router must be registered in `backend/app/main.py` with prefix `/api/v1` and tag `ai_suggestions`.

**BE-8.1.3** The service must be a stateless async module. It must not maintain conversation history or session state between requests.

**BE-8.1.4** This feature must not modify, extend, delete, or depend on any file under `backend/app/ai_prompts/`. The `ai_prompts` routes, data model, builders, and UX remain completely unchanged throughout all phases of this implementation. The `ai_suggestions` module is fully additive.

### 8.2 Environment and Configuration

**BE-8.2.1** Add `GEMINI_API_KEY: str` to `backend/app/config.py` `Settings` class. The key must be read from the environment variable `GEMINI_API_KEY`.

**BE-8.2.2** Add `TS_DOCUMENTS_DIR: str` to `Settings`, defaulting to `"/app/ts_documents"`. This is the root directory where historical TS documents and context files are stored.

**BE-8.2.3** If `GEMINI_API_KEY` is not set or is empty, any call to the AI suggestions endpoints must return `503 Service Unavailable` with a clear message: `{"detail": "AI suggestions are not configured. Set GEMINI_API_KEY in the environment."}`. The rest of the application must start and function normally.

**BE-8.2.4** Add `GEMINI_MODEL: str = "gemini-2.0-flash"` to `Settings` so the model can be changed without code changes.

**BE-8.2.5** Add `GEMINI_MAX_TOKENS: int = 2048` and `GEMINI_TIMEOUT_SECONDS: int = 30` to `Settings`.

### 8.3 Historical Documents Volume

**BE-8.3.1** Add a bind mount in `docker-compose.yml` mapping the host path `./ts_documents` to the container path `/app/ts_documents`. The `./ts_documents` folder on the host must be created as part of setup and populated by the team with historical TS documents.

**BE-8.3.2** The `ts_documents` folder is read-only from the backend service's perspective. The backend must never write to this folder.

**BE-8.3.3** If the `TS_DOCUMENTS_DIR` path does not exist or is empty, the AI suggestions service must still function but include a note in the response metadata indicating that no historical context was available.

### 8.4 TS Type Enumeration on Backend

**BE-8.4.1** Define a Python `Enum` class `TSType` in `backend/app/ai_suggestions/ts_types.py` (or an appropriate shared location such as `backend/app/projects/ts_types.py`). Each member maps a canonical path value to its display label. This enum is the single source of truth for valid TS type values.

**BE-8.4.2** The `ProjectCreate` Pydantic schema in `backend/app/projects/schemas.py` must accept the new `ts_type: str` field. The field must be validated against the `TSType` enum members. Invalid values must return `422`.

**BE-8.4.3** The `ProjectDetail` and `ProjectSummary` response schemas must include the `ts_type` field.

**BE-8.4.4** Add a new GET endpoint `GET /api/v1/ts-types` that returns the list of valid TS types as a wrapped JSON object: `{ "ts_types": [{ "value": "...", "label": "..." }, ...] }`. This is the canonical response shape; use it consistently in API documentation, the frontend adapter, tests, and acceptance criteria. Do not use a bare array shape anywhere in this document.

### 8.5 AI Suggestion Service Logic

**BE-8.5.1** The main suggestion service function must:\n1. Accept `project_id: UUID`, `section_key: str`, `draft_content: Optional[dict]` (from the request body), and `db: AsyncSession` as parameters.\n2. Fetch the project row from the database to obtain `ts_type`, `solution_name`, `solution_full_name`, `client_name`, `client_location`, and `doc_date`.\n3. If `ts_type` is `NULL` on the fetched project row, return `400` with `{\"detail\": \"This project has no TS type assigned. Update the project to select a TS type before using AI Suggestions.\"}`. No Gemini call must be made.\n4. Fetch all saved section rows for the project to provide existing saved content as context.\n5. Invoke the retrieval module (Section 10) to load historical documents and context files for the `ts_type`.\n6. Build the prompt using the `builders.py` module (Section 9), passing `draft_content` as the current draft state so the AI always sees the user's latest unsaved edits.\n7. Call the Gemini API using the `google-generativeai` Python SDK (or `httpx` if SDK is unavailable).\n8. Parse the Gemini response into a structured output matching the section's content format.\n9. Return a `SuggestionResponse` Pydantic model.

**BE-8.5.2** The service must not mutate any section data in the database. It is a read-and-generate operation only.

**BE-8.5.3** The service must validate `section_key` as follows:
- If the key matches a known predefined section key (from the existing allowlist in `backend/app/sections/router.py`), proceed with predefined section logic.
- If the key matches the custom section key pattern (`custom_section_{timestamp}_{uuid}`), proceed with custom section logic (see FR-6.6). The service must fetch the saved section content to determine the custom section's title and subsection types before building the prompt.
- If the key matches neither pattern, return `400`.

**BE-8.5.4** Only the three explicitly suppressed sections (`cover`, `revision_history`, `abbreviations`) must return `400` with: `{"detail": "AI suggestions are not available for this section."}`. All other section keys — predefined or custom — must be processed.

### 8.6 Gemini API Call

**BE-8.6.1** Use the `google-generativeai` Python package (`pip install google-generativeai`). Add this dependency to `backend/requirements.txt`.

**BE-8.6.2** The Gemini client must be instantiated once per request using the `GEMINI_API_KEY` from settings. Do not use a module-level singleton to allow future key rotation.

**BE-8.6.3** Use `model.generate_content()` with `generation_config` specifying `max_output_tokens` from `settings.GEMINI_MAX_TOKENS` and `temperature=0.4` for consistent, factual output.

**BE-8.6.4** Wrap the Gemini API call in a `try/except` block. Map exception types to appropriate HTTP responses as defined in Section 16.

**BE-8.6.5** Log redacted request metadata at `DEBUG` level: project_id, section_key, ts_type, prompt token count, and response token count. Do not log the full assembled prompt or the raw Gemini response at any level. These may contain client-confidential project data and vendor-confidential document content.

---

## 9. AI / Prompt Engineering Requirements

### 9.0 Knowledge Hierarchy

Every AI suggestion is assembled using a layered knowledge hierarchy. Sources are applied in priority order: higher-priority sources override or supplement lower-priority ones. All six layers are passed to the prompt where available, with higher-priority layers placed earlier in the user message so they carry more weight.

| Priority | Source | When Available |
|---|---|---|
| 1 (highest) | **Current project metadata** | Always. `solution_name`, `client_name`, `ts_type`, `doc_date`, etc. |
| 2 | **Current saved section data** | When the section has previously been saved. Used for coherence on Regenerate. |
| 3 | **Current draft content** | When the request body includes `draft_content`. Contains the user's latest unsaved edits in the editor at the time of the button click. The AI always sees the latest draft state without requiring a SAVE first. |
| 4 | **Category `context.txt`** | When a `context.txt` file exists in the resolved TS category folder. This is the primary curated grounding source. |
| 5 | **Historical TS documents** | Files found in the TS category folder and its subfolders. Supporting evidence, not the primary source. |
| 6 | **PROJECT_CONTEXT.md reference** | A static summary of the TS Document Generator product context embedded in the system instruction. This is not loaded at runtime; it is baked into the system prompt template to orient the model. |
| 7 (lowest) | **LLM general knowledge** | Always present as the model's training data. Fills gaps not covered by the above sources. |

**PR-9.0.1** The prompt for every section must include all available layers from this hierarchy. The system must not rely solely on LLM general knowledge when project-specific or category-specific context is available. Draft content from the request body (hierarchy priority 3) must always be passed to the prompt builder so the AI reflects the user's latest edits without requiring a SAVE.

**PR-9.0.2** The per-section prompt is generated independently for each section. A suggestion for `tech_stack` uses a different prompt than a suggestion for `executive_summary`, even within the same project. Sections are not batched into a single document-wide prompt.

**PR-9.0.3** The prompt assembly order within the dynamic user message must follow the priority table above: project metadata first, then existing saved section content, then current draft content, then category context (`context.txt`), then historical document excerpts, then the section-specific output instruction. This order ensures the model weighs project-specific and user-current information most heavily and uses category knowledge before falling back to historical examples.

### 9.1 Prompt Architecture

Each AI suggestions call assembles a **two-part prompt**: a fixed system instruction and a dynamic user message.

**PR-9.1.1** The system instruction must be identical for all section types. It sets the AI's role and enforces output discipline:

> You are an expert technical specification writer for Hitachi Energy's industrial automation and digitalization solutions. Your role is to generate professional, accurate, and concise content for specific sections of Technical Specification (TS) documents used in client proposals and project deliveries. You write in a formal, third-person technical style consistent with industrial engineering documentation. You do not add preamble, apology text, or explanations. You output only the section content as requested.

**PR-9.1.2** The dynamic user message must be constructed by the `builders.py` module. It must include, in order matching the knowledge hierarchy (Section 9.0, highest priority first):
1. **Project metadata block** (always present)
2. **Section identity block** (always present — specifies the target section)
3. **Existing saved section content block** (present if the section has previously saved content — improvement context, hierarchy priority 2)
4. **Current draft content block** (present when `draft_content` is non-null in the request body — hierarchy priority 3; contains the user's latest unsaved edits)
5. **Category context block** (present if `context.txt` is found for the TS type — hierarchy priority 4)
6. **Historical document excerpts block** (present if historical documents are found — hierarchy priority 5)
7. **Section-specific output instruction block** (always present, section-type-dependent)

### 9.2 Project Metadata Block

```
PROJECT METADATA:
- Solution Name: {solution_name}
- Full Solution Name: {solution_full_name}
- Client Name: {client_name}
- Client Location: {client_location}
- Document Date: {doc_date}
- TS Category: {ts_type_display_label}
```

All values must be HTML-stripped and truncated at 500 characters each before inclusion.

### 9.3 Section Identity Block

```
TARGET SECTION:
- Section Key: {section_key}
- Section Title: {section_title}
- Section Type: {predefined | custom | custom_subsection}
```

For **predefined sections**, `section_title` is derived from a backend constant mapping of `section_key → section_title` maintained in `builders.py`. This mapping must cover all 31 predefined section keys. Example entries: `"tech_stack" → "Technology Stack"`, `"hardware_specs" → "Hardware Specifications"`, `"system_config" → "System Configuration"`.

For **custom sections and subsections**, `section_title` is read from the custom section's `content.title` field stored in `section_data.content`. If `content.title` is absent or empty, fall back to the literal section key string. The backend must fetch the saved custom section content before building the prompt so the title is available.

### 9.4 Category Context Block

When a `context.txt` file exists for the selected TS category (see Section 10), include:

```
CATEGORY CONTEXT:
{full content of context.txt, truncated at 2000 characters}
```

When the file does not exist, omit this block entirely. Do not include placeholder text.

### 9.5 Historical Document Excerpts Block

When historical documents are found (see Section 10), include:

```
REFERENCE DOCUMENTS FROM THIS TS CATEGORY ({document_count} documents):

--- Document: {document_filename} (from: {relative_subfolder_path}) ---
{extracted_text, truncated at 1500 characters per document}
--- End of Document ---

[repeat for each document]
```

The `relative_subfolder_path` provides the model with context about which specific project type (e.g., Historian, UGS) the document came from, helping it understand the range of examples within the category.

Total historical content must not exceed 6000 characters across all documents. If the combined extraction exceeds this limit, truncate the last document that pushes over the limit. Include at most 5 documents.

### 9.6 Existing Saved Section Content Block

If the section already has saved content in the database, include:

```
EXISTING SAVED SECTION CONTENT (may be partial or placeholder — improve upon it):
{JSON.stringify(existing_content_payload)}
```

Truncate at 1000 characters. This enables the Regenerate action to produce contextually improved output rather than ignoring prior work.

### 9.6a Current Draft Content Block

If `draft_content` is non-null in the request body, include:

```
CURRENT DRAFT CONTENT (user's latest unsaved edits — build upon or improve this):
{JSON.stringify(draft_content)}
```

Truncate at 1000 characters. This block ensures the AI always reflects the user's current editing state, not just the last saved snapshot. This block is positioned after saved content and before category context so the model weights the user's live work most heavily when both are present.

### 9.7 Section-Specific Output Instructions

The output instruction block must be section-type-aware. Define six output modes:

> **The repository-defined schema mapping is the source of truth. This document defines mode behavior, not section-family assignments.** The mode assignment for every section must be derived from the repository schema mapping implemented in `builders.py`. No section key is assigned to a mode by this document alone.

**Mode A — Rich Text (HTML)**

Used for: narrative prose sections whose schema is defined in `predefinedSectionContent.ts`. The mode assignment for every section must be derived from the repository schema mapping implemented in `builders.py`. Mode A applies to any section whose `section_data.content` stores a single HTML string field as defined in the repository. The repository-defined schema mapping is the source of truth. This document defines mode behavior, not section-family assignments.

Instruction:

> Generate the content for this section as formatted HTML compatible with TipTap rich text editor. Use `<p>` for paragraphs and `<ul><li>` for bullet lists. Do not use Markdown. Do not include `<html>`, `<body>`, or `<head>` tags. Return only the HTML fragment for the section body. Aim for 150–350 words. Keep content specific to the project context provided.

**Mode B — Table Rows (JSON)**

Used for: sections whose content is a list of structured rows stored as a JSON array. **The mode assignment for each section must be derived from the actual repository schema mapping implemented in `builders.py`. The repository schema mapping is the source of truth; the PRD defines how Mode B works, not which sections belong to it.** The exact sections and their row field schemas must be read from the repository's frontend section content definitions (`predefinedSectionContent.ts` or equivalent) and encoded as constants in `builders.py`. If a section's schema cannot be confirmed from the repository, do not assign it to Mode B — use Mode A fallback instead.

Instruction template:

> Generate a JSON array of table rows for the {section_title} section. Each row must be a JSON object matching this schema: {row_schema_for_section_key}. Return ONLY a valid JSON array. No markdown fences. No explanation. Aim for 5–10 rows relevant to the project context.

The `row_schema_for_section_key` must be a JSON object template with the exact field keys used by the frontend for that section. `builders.py` is the single source of truth for this mapping. If a section's schema is not confirmed from the repository, do not include it in Mode B — use Mode A fallback instead.

**Policy:** The mode assignment and output format for each section must be derived from the section's actual frontend storage schema and backend persistence model as encoded in `builders.py`. **Do not assign a section to Mode B based on its name, assumed structure, or any statement in this document.** Confirm each section's row schema against the repository's frontend section content definitions (`predefinedSectionContent.ts` or equivalent) before adding it to the Mode B mapping in `builders.py`. If the repository schema cannot be confirmed, the section must fall back to Mode A. The repository schema mapping is the source of truth; this document's mode descriptions define behavior only.

**Mode C — Mixed Fields (JSON Object)**

Used for: sections whose content is a structured JSON object with named scalar or list fields, rather than a flat row array. **The mode assignment for each section must be derived from the actual repository schema mapping implemented in `builders.py`. The repository schema mapping is the source of truth; the PRD defines how Mode C works, not which sections belong to it.** The exact sections and their object schemas must be read from the repository's frontend section content definitions and encoded in `builders.py`. Do not assign a section to Mode C based on assumptions or this document alone; confirm the object schema against `predefinedSectionContent.ts` first.

Instruction:

> Generate a JSON object for this section. The schema is: {schema_for_section_key}. Return ONLY a valid JSON object. No markdown fences. No explanation.

**Mode D — Gantt/Schedule Description (text) + draw.io trigger**

Used for: `overall_gantt`, `shutdown_gantt`.

Instruction:

> Generate a timeline description for this section. Include key phases, durations in weeks, and milestones relevant to the project. Format as an HTML fragment with `<p>` paragraphs and `<ul><li>` bullets. Aim for 100–200 words. Keep it specific to the project's solution name and category context.

The draw.io JSON-to-XML generation for these sections uses a separate prompt (Section 14) and is not combined with this text suggestion.

**Mode E — Image-Backed Section Description**

Used for: `system_config` and any other section whose primary content is a diagram image with optional accompanying text.

Instruction:

> Generate a short textual description for the {section_title} section. This section will display a diagram uploaded by the user. Generate only the descriptive text that will appear below or alongside the diagram. Use `<p>` HTML paragraphs. Aim for 50–150 words. Reference the solution name and client context.

**Mode F — Custom Section / Subsection**

Used for: any section key matching the `custom_section_*` pattern.

The output mode for each subsection within the custom section is determined by reading the actual saved content type from the section's stored data (as defined by the frontend custom section schema). The backend must not assume content types from field names not present in the saved data. Map each subsection to the closest equivalent mode (A, B, or E) based on the saved structure.

Instruction template per subsection:

> This is a subsection of a custom TS section titled "{custom_section_title}" for {solution_name}. Generate appropriate content for this subsection using the project context and category knowledge provided above. {mode_specific_format_instruction}

### 9.8 Prompt Token Budget

The total assembled prompt must not exceed 8000 tokens (approximately 30,000 characters). If the assembled prompt exceeds this limit, apply truncation in the following order (lowest-priority blocks first):
1. Truncate historical document excerpts (shortest excerpts first, then remove whole documents)
2. Truncate the current draft content block
3. Truncate the existing saved section content block
4. Truncate the category context block (`context.txt`) — only as a last resort

Project metadata and section identity blocks must never be truncated. The section-specific output instruction must never be truncated. These two blocks are required for the model to produce usable output.

### 9.9 Response Parsing

**PR-9.9.1** For Mode A (rich text), the raw Gemini text response is used as-is as the HTML content, after stripping any accidental markdown code fences.

**PR-9.9.2** For Mode B and C (JSON), the response must be parsed using `json.loads()`. If parsing fails, the service must return the raw text as a fallback `raw_text` field and set `structured_import_available: false` in the response.

**PR-9.9.3** Strip markdown code fences from Gemini responses before parsing. The pattern to strip is ` ```json ` ... ` ``` ` or ` ``` ` ... ` ``` `.

**PR-9.9.4** The parsed content must be validated against the expected schema for the section (at least that required keys are present and values are strings or arrays as expected). If validation fails, fall back to `raw_text` mode.

---

## 10. Retrieval / Grounding Requirements

### 10.1 TS Documents Folder Structure

**RET-10.1.1** Historical TS documents must be stored on the filesystem under `TS_DOCUMENTS_DIR` (default `/app/ts_documents`). The folder structure has two levels within the documents root: the **category folder** (matching the `ts_type` canonical path) and **project subfolders** inside it, which contain the actual historical TS document files. The `context.txt` file for each category lives at the category folder level, not inside project subfolders.

```
/app/ts_documents/
  Data Analysis/
    context.txt                  ← optional, category-level curated context
    Advanced Analysis/
      AutoML Platform/
        {TS document files}      ← historical TS docs for AutoML Platform project
    Data Centralization/
      context.txt                ← optional, subcategory-level curated context
      Historian/
        {TS document files}      ← historical TS docs for Historian project
      UGS/
        {TS document files}      ← historical TS docs for UGS project
    Data Monitoring/
      EMS/
        {TS document files}
      HPMS/
        {TS document files}
      RAS/
        {TS document files}
  Level 2/
    context.txt
    {TS document files}          ← docs may be directly in the category folder too
  OT Cybersecurity/
    context.txt
    {TS document files}
  OT Upgrades/
    HMI/
      context.txt
      {TS document files}
    L2/
      {TS document files}
    POC Upgrade/
      {TS document files}
  Yard Management/
    HSM/
      context.txt
      {TS document files}
    Plate Mill/
      {TS document files}
```

**RET-10.1.2** A `ts_type` value such as `"Data Analysis/Data Centralization"` resolves to the category folder path `{TS_DOCUMENTS_DIR}/Data Analysis/Data Centralization/`. The retrieval service must scan this folder **and all its subdirectories recursively** to locate historical TS document files. This captures documents stored in project subfolders like `Historian/` and `UGS/` without requiring manual path configuration.

**RET-10.1.3** Supported document file formats for retrieval: `.txt`, `.md`, `.docx`. PDF is not supported in this phase (see Open Questions). Unsupported file formats encountered during the recursive scan are silently ignored.

**RET-10.1.4** For `.docx` files, text extraction must use `python-docx` (already in `requirements.txt`). Extract all paragraph text. Skip tables and headers/footers to keep extraction simple and predictable. Extracted text from each document must be truncated at 1500 characters before inclusion.

**RET-10.1.5** For `.txt` and `.md` files, read the file as UTF-8 text. Truncate at 1500 characters.

### 10.2 Document Selection

**RET-10.2.1** The retrieval service must recursively walk the resolved category folder (including all subdirectories) to discover supported document files. Files named exactly `context.txt` must be excluded from this list.

**RET-10.2.2** From the discovered documents, select at most 5 using the following combined rule, applied in sequence:
1. **Diversity pass:** Select one document per project subfolder, choosing the most recently modified file (by filesystem `mtime`) from each subfolder. If there are more than 5 subfolders, select from the 5 subfolders that each contain the most recently modified document overall.
2. **Fill pass:** If fewer than 5 documents have been selected after the diversity pass (because there are fewer than 5 subfolders), fill remaining slots from the subfolder(s) with the most files, again picking by most recent `mtime` among unused files.

This rule favours one representative document per project type (diversity), then supplements with additional recent examples when the document count permits.

**RET-10.2.3** For each selected document, record both the filename and the relative subfolder path from the category root (e.g., `Historian/TS_Historian_v2.docx`) so this context can be included in the prompt per Section 9.5.

**RET-10.2.4** If the category folder does not exist or contains no supported files after the recursive scan, the retrieval service must return an empty list. The calling service must proceed without historical context and include `"historical_context_available": false` in the response.

**RET-10.2.5** The retrieval service must handle `PermissionError`, `OSError`, and `UnicodeDecodeError` exceptions gracefully and return an empty list rather than raising a 500 error.

### 10.3 `context.txt` — Primary Curated Grounding Source

**RET-10.3.1** The retrieval service must check for a file named exactly `context.txt` in the resolved category folder. The search is non-recursive: only the category root is checked (e.g., `/app/ts_documents/Data Analysis/Data Centralization/context.txt`). Project subfolders are not checked for `context.txt`.

**RET-10.3.2** If `context.txt` is found, read it as UTF-8 text and truncate at 2000 characters. Include it in the prompt as the Category Context Block (Section 9.4), positioned above historical document excerpts. The `context_txt_used: true` flag must be set in the response.

**RET-10.3.3** `context.txt` files are not required to be present. The pipeline must function without them, using only historical document excerpts and project metadata for grounding.

**RET-10.3.4** The `context.txt` file is the **preferred and highest-quality grounding source** for a category. It is a curated, team-authored document that encodes category-specific knowledge more reliably than unprocessed historical documents. When both `context.txt` and historical documents are available, `context.txt` must appear first in the prompt and carries more weight due to its position.

**RET-10.3.5** `context.txt` must NOT be included in the historical documents list. The document selection in RET-10.2 must explicitly skip any file named `context.txt`.

**RET-10.3.6** The distinction between `context.txt` and historical TS documents is architectural:
- `context.txt` is **curated human-authored context**: a condensed, reliable knowledge base for the category, written or maintained by the Hitachi team. It contains patterns, standard terminology, common component lists, and reusable technical assumptions.
- **Historical TS documents** are **raw source evidence**: real TS documents authored for actual projects, included to show the AI what real output looks like in practice. They are supporting evidence, not a substitute for curated context.

### 10.4 Retrieval Service Module

**RET-10.4.1** Implement the retrieval logic in `backend/app/ai_suggestions/retrieval.py` as a standalone async function `load_category_context(ts_type: str, settings: Settings) -> CategoryContext`. The `CategoryContext` dataclass must expose: `context_text: Optional[str]`, `documents: List[DocumentExcerpt]`, `historical_context_available: bool`. The `DocumentExcerpt` dataclass must expose: `filename: str`, `relative_path: str`, `text: str`.

**RET-10.4.2** File I/O operations must use `aiofiles` (already in `requirements.txt`) for reading `.txt` and `.md` files to remain consistent with the async FastAPI runtime.

**RET-10.4.3** `python-docx` is synchronous. For `.docx` extraction, use `asyncio.get_event_loop().run_in_executor(None, extract_docx_text, path)` to avoid blocking the event loop.

### 10.5 `context.txt` Generation Process (Guidance for Future Phase)

The Phase 5 deliverable includes authoring `context.txt` files for all 10 TS category folders. This section defines how those files should be generated so that future contributors produce consistent, high-quality grounding sources.

**RET-10.5.1** Each `context.txt` file should be generated by a team member (or a one-time AI-assisted script) reading through the historical TS documents in that category and extracting the following into a structured plain-text format:

- **Common Components**: A list of hardware, software, and vendor components that appear across multiple TS documents in this category. Include version numbers and descriptions where consistent.
- **Standard Section Wording**: Recurring phrases, boilerplate sentences, or standard clauses used across documents in key sections (e.g., standard scope exclusion statements, typical system overview language).
- **Typical Project Scope and Scale**: The usual size of a project in this category (number of nodes, servers, PLCs, user licenses, etc.).
- **Common Constraints and Assumptions**: Assumptions the team typically makes for this category (e.g., "OT network is isolated", "Customer provides civil works").
- **Category-Specific Technical Details**: Domain knowledge specific to this category that the LLM may not have at sufficient depth (e.g., specific Hitachi Historian tags, EMS measurement protocols, Yard Management system integration patterns).

**RET-10.5.2** The `context.txt` format is plain text with section headers prefixed by `##`. Example structure:
```
## Common Components
- Hitachi Historian Server v9.0 — real-time and historical data archiving
- OPC DA/UA Gateway — connects to field controllers
...

## Standard Section Wording
Executive Summary: "{solution_name} is a data centralization solution deployed at {client_name}..."
...

## Typical Project Scope
- 1–3 Historian servers
- 10,000–50,000 tag points
...

## Common Constraints and Assumptions
- Customer provides server hardware
- Hitachi provides software licenses and engineering support
...
```

**RET-10.5.3** The `context.txt` generation process is not automated in this phase. In future phases, it may be generated from historical documents using an AI pipeline that reads all documents in the category folder and synthesizes the above structure. The format defined in RET-10.5.2 is intended to remain stable so that both human-authored and AI-generated context files are interchangeable.

### 10.6 Retrieval Strategy and RAG-Readiness

**RET-10.6.1** The current retrieval strategy is folder-based file scanning with full-text extraction. This is intentionally simple and appropriate for the current scale (a small number of historical documents per category).

**RET-10.6.2** The `load_category_context()` function signature and the `CategoryContext` return type must remain stable even if the internal implementation is later upgraded. Specifically: the function accepts `ts_type` and returns a `CategoryContext` with `context_text`, `documents`, and `historical_context_available`. A future vector-based RAG implementation would satisfy the same interface by replacing the folder scan with a vector store query, returning the most semantically relevant document chunks rather than the most recently modified files.

**RET-10.6.3** The API endpoint contract (Section 12) must not expose retrieval implementation details in its response schema. The `context_sources` field in `SuggestionResponse` must return filenames only, not internal vector store IDs or chunk identifiers. This ensures the frontend is decoupled from the retrieval backend.

---

## 11. Data Flow and Sequence Flow

### 11.1 Project Creation with TS Type

```
User submits NewProjectModal with ts_type selected
  → Frontend: POST /api/v1/projects { ...metadata, ts_type: "Data Analysis/Data Centralization" }
  → Backend: Validate ts_type against TSType enum
  → Backend: Insert projects row with ts_type column
  → Backend: Bootstrap cover, abbreviations, revision_history (unchanged)
  → Backend: Return ProjectDetail including ts_type
  → Frontend: Navigate to /editor/{id}
```

### 11.2 AI Suggestion Request (Text)

```
User in editor, section X active, draft edits may be present in sectionDraftContents
  → User clicks "✨ AI Suggestions"
  → Frontend: Button enters loading state
  → Frontend: Read current sectionDraftContents[section_key] from draft store
  → Frontend: POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}
               { draft_content: currentSectionDraft }
  → Backend Router: Validate project_id and section_key
  → Backend Service:
      1. Fetch project row (ts_type, solution_name, client_name, ...)
      2. If ts_type is NULL → return 400 immediately; no Gemini call
      3. Fetch all section rows for saved context
      4. Invoke retrieval.load_category_context(ts_type)
          → Resolve folder path from ts_type
          → Check for context.txt → read if present
          → Scan folder for documents → apply diversity-aware selection per RET-10.2.2
          → Extract text from each document
          → Return CategoryContext
      5. Invoke builders.build_prompt(project, section_key, category_context,
                                      existing_section, draft_content)
          → Assemble system instruction + dynamic user message
          → Block order: metadata → section identity → saved content →
            draft_content (if present) → category context → historical docs →
            output instruction
      6. Call Gemini API
      7. Parse response into SuggestionResponse
  → Backend: Return SuggestionResponse (200)
  → Frontend: Button exits loading state
  → Frontend: Suggestion panel appears below section editor
  → User reviews suggestion
  → User clicks "Import Suggestion"
  → Frontend: Merge suggestion content into sectionDraftStore for section_key
  → Frontend: Section editor fields update to show imported content
  → Frontend: Toast: "Suggestion imported. Review and click SAVE to persist."
  → User edits if needed
  → User clicks SAVE
  → Frontend: PUT /api/v1/projects/{project_id}/sections/{section_key} { content: { ...draft } }
  → Backend: Upsert section_data JSONB (unchanged save flow)
  → Backend: Maybe append revision history entry (unchanged)
  → Frontend: Preview refreshes with saved content (unchanged)
```

### 11.3 Draw.io Chart Generation

```
User in editor, overall_gantt or shutdown_gantt section active
  → User clicks "AI Suggestions" → text suggestion loads (11.2)
  → Suggestion panel shows text suggestion plus "Generate Draw.io Chart" button
  → User clicks "Generate Draw.io Chart"
  → Frontend: Draw.io button enters loading state
  → Frontend: POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio
  → Backend: Same context assembly as 11.2 (project + retrieval)
  → Backend: Build draw.io prompt (Section 14)
  → Backend: Call Gemini API with draw.io prompt
  → Backend: Validate XML response is parseable mxGraph XML
  → Backend: Return DrawioResponse { drawio_xml: "...", chart_instructions: "..." }
  → Frontend: Draw.io button exits loading state
  → Frontend: XML displayed in suggestion panel in scrollable code block
  → User clicks "Copy XML"
  → Frontend: Clipboard API copies drawio_xml value
  → Frontend: Toast: "XML copied. Paste into draw.io to create your chart."
  → User opens draw.io, imports XML, adjusts as needed, exports PNG
  → User uploads PNG via existing DiagramUpload component
```

### 11.4 Failure Paths

```
Gemini API returns error / times out:
  → Backend: Catch exception, map to SuggestionError response
  → Backend: Return 502 / 504 / 503 (see Section 16)
  → Frontend: Toast error
  → Frontend: Suggestion panel shows error state with Regenerate button

Gemini API returns unparseable JSON (for table sections):
  → Backend: Parse fails, set structured_import_available=false
  → Backend: Return raw_text in SuggestionResponse
  → Frontend: Suggestion panel shows raw text in pre-formatted block
  → Frontend: Import Suggestion button is disabled (greyed)
  → Frontend: Note: "Structured import not available. Copy text manually."
```

---

## 12. API Contract Recommendations

### 12.1 `GET /api/v1/ts-types`

Returns the enumeration of valid TS types for the project creation dropdown.

**Request:** No parameters.

**Response (200):**
```json
{
  "ts_types": [
    { "value": "Data Analysis/Advanced Analysis", "label": "Data Analysis — Advanced Analysis" },
    { "value": "Data Analysis/Data Centralization", "label": "Data Analysis — Data Centralization" },
    { "value": "Data Analysis/Data Monitoring", "label": "Data Analysis — Data Monitoring" },
    { "value": "Level 2", "label": "Level 2" },
    { "value": "OT Cybersecurity", "label": "OT Cybersecurity" },
    { "value": "OT Upgrades/HMI", "label": "OT Upgrades — HMI" },
    { "value": "OT Upgrades/L2", "label": "OT Upgrades — L2" },
    { "value": "OT Upgrades/POC Upgrade", "label": "OT Upgrades — POC Upgrade" },
    { "value": "Yard Management/HSM", "label": "Yard Management — HSM" },
    { "value": "Yard Management/Plate Mill", "label": "Yard Management — Plate Mill" }
  ]
}
```

### 12.2 `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}`

Generates a text-based content suggestion for the specified section. Applicable to all predefined sections (except `cover`, `revision_history`, `abbreviations`) and all custom sections that have saved content in `section_data`.

**Path parameters:**
- `project_id` — UUID of the project
- `section_key` — a predefined section key confirmed in the repository's section allowlist, or a custom section key (e.g., `custom_section_1718123456_123e4567-e89b-12d3-a456-426614174000`)

**Request body:**
```json
{
  "draft_content": { }
}
```
`draft_content` is the current in-editor draft state for the target section at the time of the button click (the `sectionDraftContents[section_key]` object from the frontend draft store). It may be `null` if the section has no draft edits yet. Passing draft content ensures the AI sees the user's latest unsaved work without requiring a SAVE first. Persistence remains SAVE-only; this field is consumed by the AI only.

**Response (200 — predefined table section):**

> **Note:** The section key and row field keys shown below are illustrative only. The actual section key must be confirmed as Mode B in `builders.py`. The actual row field keys for any Mode B section must be read from the repository's frontend section content definitions (`predefinedSectionContent.ts` or equivalent) and encoded in `builders.py`. Do not hardcode the section key or field keys from this example into the implementation. The repository schema mapping is the source of truth.

```json
{
  "section_key": "<predefined_table_section_key>",
  "section_title": "<Section Title>",
  "suggestion_mode": "predefined",
  "structured_import_available": true,
  "content": {
    "rows": [
      { "<field_1>": "...", "<field_2>": "...", "<field_3>": "..." }
    ]
  },
  "subsection_suggestions": null,
  "raw_text": null,
  "historical_context_available": true,
  "context_sources": ["Historian/TS_Historian_v2.docx", "UGS/TS_UGS_v1.txt"],
  "context_txt_used": true
}
```

**Response (200 — custom section with paragraph and table subsections):**

> **Note:** The field names `subsection_index` and `type` in this example are illustrative. Use the repository's existing custom section data model as the source of truth for the actual field structure of subsection entries. The implementation must read and match the real custom section content structure stored in `section_data.content`, as defined by the frontend's custom section schema. Do not hardcode field names from this example into the implementation.

```json
{
  "section_key": "custom_section_1718123456_123e4567-e89b-12d3-a456-426614174000",
  "section_title": "Integration Requirements",
  "suggestion_mode": "custom",
  "structured_import_available": true,
  "content": null,
  "subsection_suggestions": [
    { "subsection_index": 0, "type": "paragraph", "content": "<p>...</p>" },
    { "subsection_index": 1, "type": "table", "content": { "rows": [...] } }
  ],
  "raw_text": null,
  "historical_context_available": true,
  "context_sources": ["Historian/TS_Historian_v2.docx"],
  "context_txt_used": false
}
```

**Response (200 — fallback mode, structured import unavailable):**
```json
{
  "section_key": "<predefined_table_section_key>",
  "section_title": "<Section Title>",
  "suggestion_mode": "predefined",
  "structured_import_available": false,
  "content": null,
  "subsection_suggestions": null,
  "raw_text": "Historian Server — Hitachi — v8.0 ...",
  "historical_context_available": false,
  "context_sources": [],
  "context_txt_used": false
}
```

**Error responses:**
- `400` — invalid or excluded section key
- `404` — project not found
- `503` — Gemini API key not configured
- `502` — Gemini API returned an error
- `504` — Gemini API timed out
- `422` — Pydantic validation error

### 12.3 `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio`

Generates draw.io-compatible mxGraph XML for Gantt and schedule sections. The LLM outputs structured JSON; the backend `gantt_converter.py` converts it deterministically to mxGraph XML (Option B architecture).

**Path parameters:** Same as 12.2. Valid only for `overall_gantt` and `shutdown_gantt`. Any other section key returns `400`.

**Request body:** Empty (`{}`).

**Response (200):**
```json
{
  "section_key": "overall_gantt",
  "drawio_xml": "<mxGraphModel><root>...</root></mxGraphModel>",
  "chart_instructions": "1. Copy the XML above. 2. Open draw.io at diagrams.net. 3. Go to Extras → Edit Diagram, paste the XML, and click OK. 4. Adjust task labels and dates as needed. 5. Export as PNG (File → Export As → PNG). 6. Upload the PNG using the diagram upload in this section.",
  "historical_context_available": true
}
```

**Error responses:**
- `400` — section does not support draw.io generation
- All other errors same as 12.2

### 12.4 Frontend API Adapter

Create `frontend/src/api/aiSuggestions.ts` following the existing Axios client pattern in `frontend/src/api/client.ts`. Expose:

```typescript
getTsTypes(): Promise<TsTypesResponse>
getAiSuggestion(projectId: string, sectionKey: string): Promise<SuggestionResponse>
getDrawioSuggestion(projectId: string, sectionKey: string): Promise<DrawioResponse>
```

Define TypeScript types `SuggestionResponse`, `DrawioResponse`, and `TsTypesResponse` in `frontend/src/types/aiSuggestions.ts`. The `TsTypesResponse` type must be defined as `{ ts_types: Array<{ value: string; label: string }> }` to match the canonical `GET /api/v1/ts-types` wrapped-object response shape (see Section 12.1). Do not define `TsTypesResponse` as a bare array.

---

## 13. Suggested Data Models and Storage Changes

### 13.1 Database Migration — `projects.ts_type`

**DM-13.1.1** Add a new column `ts_type VARCHAR(100)` to the `projects` table. This column is nullable to preserve backward compatibility with projects created before this migration. (Note: database nullability is a schema property and does not imply the business rule for new project creation, which requires a non-null `ts_type`.)

**DM-13.1.2** Create an Alembic migration under `backend/alembic/versions/`. Name: `002_add_ts_type_to_projects.py`. The migration must be purely additive.

**DM-13.1.3** Migration `upgrade()` pseudocode:
```
op.add_column('projects', sa.Column('ts_type', sa.String(100), nullable=True))
```

**DM-13.1.4** Migration `downgrade()` pseudocode:
```
op.drop_column('projects', 'ts_type')
```

**DM-13.1.5** The SQLAlchemy `Project` model in `backend/app/projects/models.py` must be updated to include: `ts_type = Column(String(100), nullable=True)`.

**DM-13.1.6** For existing projects with `ts_type = NULL` (projects created before this migration), the AI Suggestions button must be visible but disabled in the frontend, with the message "Select TS Type first." If the backend endpoint is called directly for such a project (e.g., via API), it must return `400` with `{"detail": "This project has no TS type assigned. Update the project to select a TS type before using AI Suggestions."}`. No Gemini request must be executed for a project with `ts_type = NULL`.

### 13.2 No New Tables Required

**DM-13.2.1** The AI suggestions feature does not require any new database tables. All suggestion content flows through the existing section data JSONB storage via the existing save workflow. There is no need to persist suggestions themselves.

**DM-13.2.2** AI-generated content, once imported and saved by the user, is indistinguishable from manually authored content in the `section_data.content` JSONB. No origin metadata needs to be stored about whether content was AI-generated. This is intentional: the user reviews and approves content before saving, making it the user's content at that point.

### 13.3 New Filesystem Location

**DM-13.3.1** The historical TS documents directory at `./ts_documents/` (host path) is a new filesystem resource. It is not tracked in the existing `UPLOAD_DIR` volume and must not be mixed with uploaded images or generated DOCX versions.

**DM-13.3.2** The `docker-compose.yml` must be updated to add:
```yaml
volumes:
  - ./ts_documents:/app/ts_documents:ro
```
Under the `backend` service definition. The `:ro` flag ensures the backend cannot write to this directory.

### 13.4 Settings Additions Summary

The following fields must be added to `backend/app/config.py` `Settings`:

| Field | Type | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | `str` | `""` | Gemini API key |
| `GEMINI_MODEL` | `str` | `"gemini-2.0-flash"` | Gemini model name |
| `GEMINI_MAX_TOKENS` | `int` | `2048` | Max output tokens |
| `GEMINI_TIMEOUT_SECONDS` | `int` | `30` | API timeout |
| `TS_DOCUMENTS_DIR` | `str` | `"/app/ts_documents"` | TS documents root |

---

## 14. Draw.io Chart Generation Requirements

### 14.0 Architecture Decision: JSON-to-Server-Conversion (Option B)

**This document specifies Option B as the implemented architecture for draw.io chart generation.** The LLM is prompted to output structured Gantt task data as a JSON array. The backend converts this JSON to mxGraph XML deterministically using `gantt_converter.py`. Raw XML generation from the LLM (Option A) is not used.

Rationale: LLMs are unreliable XML generators. The mxGraph XML schema is complex, and LLM output frequently produces structurally invalid XML requiring user-visible retries. Structured JSON is simpler to validate with Pydantic, tolerant of minor LLM variation, and the server-side conversion is independently testable without any LLM dependency. The user-visible draw.io XML output is identical under either approach.

All requirements in Section 14 implement Option B. Any future consideration of Option A must be treated as a separate architectural decision and must not be mixed with this implementation.

### 14.1 Scope and Applicability

**DIO-14.1.1** Draw.io XML generation is available for two section keys only: `overall_gantt` and `shutdown_gantt`. Requests for any other section key — including `system_config` — must return `400`. `system_config` uses Mode E (image-backed text description) and does not require Gantt chart generation.

**DIO-14.1.2** The draw.io generation is triggered via the separate endpoint defined in Section 12.3. It is independent of the text suggestion endpoint.

### 14.2 Chart Data Format (JSON → mxGraph XML)

**DIO-14.2.1** The LLM must be prompted to output a JSON array of Gantt task objects, not mxGraph XML. The JSON schema for a single task object is:

```json
{
  "task": "string — task label",
  "phase": "string — phase group name (e.g., Engineering, Installation)",
  "start_week": "integer — 1-indexed start week",
  "duration_weeks": "integer — number of weeks the task spans",
  "milestone": "boolean — true if this is a milestone, false if a duration task",
  "dependencies": "array of integers — optional; each integer is an index (0-based) referencing another task in the emitted array"
}
```

**DIO-14.2.2** The backend must validate the LLM-returned JSON against this schema using Pydantic before any conversion. If the JSON is missing required fields or has wrong types, return a graceful error response. Do not attempt XML conversion on invalid input.

**DIO-14.2.3** A `gantt_converter.py` module in `backend/app/ai_suggestions/` must implement a deterministic function `convert_gantt_json_to_mxgraph(tasks: List[GanttTask]) -> str` that converts the validated task list into a valid mxGraph XML string. This function must be independently unit-testable with no LLM dependency.

**DIO-14.2.4** The mxGraph XML output must represent a horizontal bar Gantt chart. The converter must:
- Generate a swimlane-style layout with phase rows as horizontal bands.
- Place task rectangle cells within their phase row, sized proportionally to `duration_weeks`.
- Add a timeline header row with week labels ("Week 1", "Week 2", etc.).
- Use consistent `mxCell` ID assignment starting from integer 2 (IDs 0 and 1 are reserved for the mxGraph root cells).
- Use simple `rounded=0;whiteSpace=wrap;` style for task cells to ensure compatibility across draw.io versions.

**DIO-14.2.5** The final `drawio_xml` field in the `DrawioResponse` must be the output of `convert_gantt_json_to_mxgraph()`, not raw LLM output. The system must validate the converter output is parseable using Python's `xml.etree.ElementTree.fromstring()` before returning it. This validation is expected to always pass since the converter is deterministic; it serves as a regression safeguard.

### 14.3 Context for Chart Generation

**DIO-14.3.1** The draw.io generation prompt must instruct the LLM to output a JSON array of `GanttTask` objects (as defined in DIO-14.2.1). The prompt must include the JSON schema and two or three example task objects so the LLM understands the expected format.

**DIO-14.3.2** In addition to the standard project metadata and category context, the prompt must include saved content from sections that contain timeline or work-package data. The specific sections to include depend on what content has been saved and what the actual section schemas contain:

For `overall_gantt`:
- Any saved content from sections containing work packages, project phases, or assigned supervisors (determined by reading the actual saved section data, not assumed field names)
- Any saved content from schedule-related sections already populated

For `shutdown_gantt`:
- Any saved content from sections containing installation, commissioning, or shutdown timeline data

The backend must read the relevant sections' `section_data.content` values to assemble this context. It must not assume specific field names or section structures; it includes whatever relevant timeline data is present in saved form.

**DIO-14.3.3** The prompt must instruct the LLM to use realistic week durations derived from the category context and historical documents. Actual calendar dates must not be used. Durations must be expressed as `start_week` (integer) and `duration_weeks` (integer) so the converter can calculate bar positions deterministically.

### 14.4 User Workflow for Draw.io Charts

**DIO-14.4.1** After receiving the draw.io XML, the user must perform the following manual steps (described in `chart_instructions`):
1. Copy the XML using the "Copy XML" button in the suggestion panel.
2. Open draw.io at [https://app.diagrams.net](https://app.diagrams.net) or any desktop installation.
3. Open the XML dialog: Extras → Edit Diagram (or Ctrl+Shift+X).
4. Paste the XML into the dialog and click OK.
5. Adjust task labels, durations, and layout as needed.
6. Export as PNG: File → Export As → PNG, with appropriate resolution (≥150 DPI).
7. Upload the PNG via the diagram upload component in the same section in the TS Document Generator.

**DIO-14.4.2** The `chart_instructions` field in the API response must contain exactly these steps as a numbered list. No HTML formatting in this field — plain text only.

---

## 15. Import Suggestion Workflow

### 15.1 Import Trigger

**IMP-15.1.1** The **Import Suggestion** button is only active (`enabled`) when `structured_import_available: true` in the response.

**IMP-15.1.2** When `structured_import_available: false`, the Import button is disabled and the panel shows raw text in a scrollable `<pre>` block with a note: "Structured import unavailable. You can copy this text and paste it manually."

### 15.2 Draft State Merge Rules by Section Content Type

All imports operate on the in-memory draft state managed by `sectionDraftStore`. The `PUT` to the backend only occurs when the user explicitly clicks SAVE. This applies identically to predefined and custom sections.

**IMP-15.2.1 — Rich Text (Mode A) Import:**

The section editor uses `RichTextEditor.tsx` (TipTap). The import mechanism must:
- Call the TipTap editor's `setContent(htmlString)` method via a ref exposed from `RichTextEditor`.
- `htmlString` is the `content` field from the `SuggestionResponse`.
- This replaces the current editor content entirely.
- The editor remains fully editable after import.
- The draft store is updated to reflect the new TipTap content on the next editor `onUpdate` event.

**IMP-15.2.2 — Table Rows (Mode B) Import:**

For sections with a list of rows (Mode B sections as confirmed in `builders.py`):
- The section editor renders rows as a list of input groups.
- Import must replace the draft's `rows` array with the suggestion's `content.rows` array.
- The `sectionDraftStore` for this section key must be updated with `{ ...existingDraft, rows: suggestion.content.rows }`.
- Existing rows are completely replaced. This is acceptable because the user is explicitly importing a new suggestion; the prior draft rows are discarded.
- If the user wants to retain existing rows, they must not click Import, or they must undo by navigating away and back without saving.

**IMP-15.2.3 — Mixed Fields (Mode C) Import:**

- The import must merge the suggestion's `content` object fields over the existing draft object.
- Merge is a shallow object spread: `{ ...existingDraft, ...suggestion.content }`.
- Fields present in the suggestion overwrite the draft; fields not present in the suggestion are preserved.

**IMP-15.2.4 — Image-Backed Sections (Mode E) Import:**

- Only the repository-confirmed text-bearing field or fields for the target image-backed section are imported.
- The image slot is unaffected by the import. Images are managed independently through `DiagramUpload`.
- Import updates only the text field in the draft.

**IMP-15.2.5 — Custom Sections and Subsections (Mode F) Import:**

Custom sections are persisted as a single section payload in `section_data`. Subsections are nested arrays within that payload (per `CustomSectionContent` in `customSections.ts`). The import workflow operates entirely within this nested structure:

- For custom sections with a single subsection type, apply the relevant merge rule from IMP-15.2.1 (paragraph), IMP-15.2.2 (table), or IMP-15.2.4 (image) to the subsection content value within the nested payload.
- For custom sections with multiple subsections, the `subsection_suggestions` array in the response maps suggestions to subsections by subsection index or ID as stored in the existing nested payload. The import logic must iterate over the array and apply each suggestion to the corresponding subsection editor.
- The overall `subsections` array structure in `section_data.content` must not be modified by the import. Only the `content` (or equivalent data field) within each existing subsection is updated in the draft. New subsections are never created by import; existing ones are never deleted; the `subsections` array length and each subsection's `contentType` and structural metadata remain unchanged.
- After import, the full custom section draft object — the single payload including all subsections with their updated content — is written to `sectionDraftStore` for the `custom_section_*` key. The standard SAVE flow persists this as a single PUT request to `PUT /api/v1/projects/{project_id}/sections/{section_key}`, unchanged from any other section save.

### 15.3 Post-Import Behavior

**IMP-15.3.1** After import, the section editor must visibly reflect the imported content. For table sections, rows must be populated in the existing row editor UI. For rich text sections, the TipTap editor must display the imported HTML. For custom sections, each subsection editor must display the updated content.

**IMP-15.3.2** The suggestion panel must close (collapse) after a successful import.

**IMP-15.3.3** No automatic save must occur after import. The existing SAVE button retains its sole responsibility for persisting content to the backend. This applies to all section types including custom sections.

**IMP-15.3.4** The imported draft flows through `buildContentWithEditMetadata` when saved, exactly as any manually authored draft does. No special tagging of AI-generated content is added to the JSONB payload. Once saved, AI-imported content is architecturally identical to manually authored content.

**IMP-15.3.5** After saving, the `DocumentPreview` component updates using the same `mergeSectionContent` path it always uses. No changes to preview logic are required.

**IMP-15.3.6** After saving, the DOCX export reads from the same `section_data.content` JSONB using the same `context_builder.py`, `docx_generator.py`, and `document_references.py` pipeline. No changes to the export pipeline are required for AI content specifically.

**IMP-15.3.7** The section completion tracking logic in `backend/app/generation/completion.py` evaluates saved content using its existing rules. AI-imported content that satisfies the existing completion criteria will mark the section complete exactly as manually authored content would. No changes to completion logic are required.

---

## 16. Error Handling and Fallback Behavior

### 16.1 Backend Error Mapping

| Condition | HTTP Status | Response body |
|---|---|---|
| `GEMINI_API_KEY` not set | 503 | `{"detail": "AI suggestions are not configured."}` |
| Project not found | 404 | `{"detail": "Project not found."}` |
| Suppressed section (`cover`, `revision_history`, `abbreviations`) | 400 | `{"detail": "AI suggestions are not available for this section."}` |
| Unknown section key (not predefined, not custom pattern) | 400 | `{"detail": "AI suggestions are not available for this section."}` |
| Custom section key not found in section_data | 404 | `{"detail": "Section not found. Save the section at least once before requesting AI suggestions."}` |
| Gemini API error (4xx from Gemini) | 502 | `{"detail": "AI provider returned an error. Please try again."}` |
| Gemini API timeout (> `GEMINI_TIMEOUT_SECONDS`) | 504 | `{"detail": "AI provider timed out. Please try again."}` |
| Gantt JSON invalid (missing required fields) | 200 | `structured_import_available: false, raw_text: "..."` — not an HTTP error; draw.io XML is omitted |
| JSON parse failure (table sections) | 200 | `structured_import_available: false, raw_text: "..."` — not an HTTP error |
| Historical documents folder missing | 200 | `historical_context_available: false` — not an HTTP error; suggestion proceeds with project context only |
| `ts_type` is NULL on project | 400 | `{"detail": "This project has no TS type assigned. Update the project to select a TS type before using AI Suggestions."}` — no Gemini request is executed |

### 16.2 Frontend Error Handling

**ERR-16.2.1** On any non-200 HTTP response from the AI suggestions endpoint, the frontend must:
1. Display a `react-hot-toast` error toast with the message from `response.data.detail` if available, otherwise: "AI suggestion failed. Please try again."
2. Set the suggestion panel to an error state showing the error message and the Regenerate button.
3. Not modify the draft state in any way.

**ERR-16.2.2** On network failure (Axios error without response), display: "Network error. Check your connection and try again."

**ERR-16.2.3** The error state in the suggestion panel must show only the Regenerate button (no Import button), since there is no suggestion to import.

**ERR-16.2.4** Errors in the draw.io generation must not affect the text suggestion display. The text suggestion panel must remain visible and usable after a draw.io generation error.

### 16.3 Degraded Mode (No AI Key)

**ERR-16.3.1** If `GEMINI_API_KEY` is not configured, the AI Suggestions button must still appear in the UI. Clicking it must return the 503 response, and the error toast must display the message clearly.

**ERR-16.3.2** If the current project has `ts_type = NULL`, the AI Suggestions button must appear disabled with the message "Select TS Type first." This is a frontend-enforced state that prevents any API call from being made. The backend independently enforces the same rule by returning `400` if the endpoint is called directly for a project with `ts_type = NULL`.

**Assumption:** The team will set up `GEMINI_API_KEY` as part of the deployment runbook. The feature is designed to degrade gracefully rather than hide itself, so authors know to contact the deployment team if suggestions do not work.

---

## 17. Security and Abuse Considerations

**SEC-17.1** The `GEMINI_API_KEY` must only be used server-side. It must never appear in any frontend bundle, API response, or log entry. The backend `config.py` and the `ai_suggestions` service are the only locations where this key may be accessed.

**SEC-17.2** The `project_id` in the request path must be validated against the database. The backend must return `404` if the project does not exist. This prevents enumerating project data via arbitrary UUIDs.

**SEC-17.3** User-supplied text that will be included in the Gemini prompt (project metadata fields such as `solution_name`, `client_name`) must be truncated and HTML-stripped before inclusion. This prevents prompt injection via metadata fields. Maximum per-field length: 500 characters.

**SEC-17.4** The `ts_type` value used to resolve the historical documents folder path must be validated strictly against the `TSType` enum before any filesystem path construction. The path must be constructed using `os.path.join()` with no `..` traversal. Enforce this with an `os.path.abspath()` check: the resolved path must start with `TS_DOCUMENTS_DIR` or the request must be rejected.

**SEC-17.5** The historical documents directory is mounted read-only (`:ro` volume). This prevents any file written through the API from being accessible as a historical document in future AI calls.

**SEC-17.6** This is a trusted internal application with no authentication. Rate limiting is not required in this phase. Teams should be aware that each Regenerate click consumes API quota; a note in the developer README is sufficient.

**SEC-17.7** Extracted text from historical DOCX files must be sandboxed to the `python-docx` parsing layer. No shell commands, script execution, or arbitrary file evaluation must occur during document text extraction.

**SEC-17.8** Full prompt content and raw Gemini responses must not be written to logs at any level. Log only redacted metadata: project_id, section_key, ts_type, prompt token count, response token count, and latency. This protects client-confidential project data and vendor-confidential document content.

---

## 18. Performance and Latency Considerations

**PERF-18.1** The Gemini API call is the dominant latency factor. Expected round-trip time is 5–20 seconds for typical prompt sizes. The frontend must communicate this to the user via a visible loading state throughout the call duration.

**PERF-18.2** Historical document text extraction is performed on every request. For the current scale (≤5 documents, each truncated at 1500 characters), this is acceptable. However, combined prompt size must be monitored: projects with large saved section content plus multi-document category folders can approach the token budget ceiling. Apply truncation as specified in Section 9.8 before each API call.

**PERF-18.3** The Gemini timeout is set to `GEMINI_TIMEOUT_SECONDS = 30` seconds. Requests that exceed this must be cancelled and return `504`. The backend must enforce this using the Gemini SDK's `timeout` parameter or an `asyncio.wait_for()` wrapper.

**PERF-18.4** The AI suggestions endpoint is not on the critical path of DOCX generation, section saving, or preview rendering. It is an on-demand enrichment action. There is no requirement for this endpoint to complete in under 3 seconds.

**PERF-18.5** Concurrent AI suggestion requests from the same project are handled independently by the stateless service. There is no shared mutable state between concurrent requests.

**PERF-18.6** The frontend must enforce single-click protection per section: while one suggestion request is in-flight for a given section, the button is disabled. This prevents duplicate API quota consumption.

**PERF-18.7** The draw.io generation is a second, independent API call. It must not block or affect the text suggestion call. The two calls may occur in any order.

**PERF-18.8** Token cost control: the system must apply per-section prompt truncation (Section 9.8) before every Gemini call. Do not assume prompt size is small because the section is short — saved section content and multi-document category folders contribute variable amounts. Log prompt and response token counts (redacted of content) for cost monitoring.

---

## 19. Testing Requirements

### 19.1 Backend Unit Tests

**TEST-19.1.1** In `backend/tests/unit/test_ai_suggestions_builders.py`: Test `build_prompt()` for each section mode (A through F). Assert that:\n- the assembled prompt contains project metadata, section identity, and the mode-appropriate output instruction\n- the assembly order matches the hierarchy: metadata → section identity → existing saved content → draft content (when provided) → category context → historical docs → output instruction\n- when `draft_content` is non-null, the draft content block appears in the assembled prompt between the saved content block and the category context block\n- when `draft_content` is null, the draft content block is omitted entirely\n- Mode F prompt correctly includes the custom section title read from saved content\nNo Gemini API calls in these tests.

**TEST-19.1.2** In `backend/tests/unit/test_ai_suggestions_retrieval.py`: Test `load_category_context()` against a temp directory structure. Cover: category folder with .txt files directly inside; category folder with documents in project subfolders (recursive); folder missing; context.txt present at category root; context.txt absent; files exceeding character limit (assert truncation); diversity-first selection (assert one file per subfolder before fill); more than 5 subfolders (assert at most 5 selected using the combined diversity rule in RET-10.2.2); context.txt priority (when both `context.txt` and historical documents are present, assert that `context_text` is non-null and positioned before historical excerpts in the assembled prompt, and that `context.txt` is NOT included in the `documents` list).

**TEST-19.1.3** In `backend/tests/unit/test_ai_suggestions_service.py`: Test response parsing for each mode (A through F). Mock the Gemini API client. Test JSON parse failure fallback (assert `structured_import_available=false`). Test Gantt JSON validation failure (assert draw.io endpoint returns graceful error). Test suppressed section key handling (assert 400). Test custom section key with saved section data (assert Mode F is used). Test custom section key with no saved content (assert 404).

**TEST-19.1.4** In `backend/tests/unit/test_gantt_converter.py`: Test `convert_gantt_json_to_mxgraph()` independently with no LLM dependency. Test with 1 task, 5 tasks, and 15 tasks. Assert output is parseable XML. Assert the task count in the XML matches the input. Assert IDs 0 and 1 are reserved root cells.

**TEST-19.1.5** In `backend/tests/unit/test_ts_type_validation.py`: Test that `ProjectCreate` with valid `ts_type` passes validation. Test that invalid `ts_type` returns `422`. Test that the AI suggestions service returns `400` when called for a project with `ts_type = NULL`, and that no Gemini API call is attempted in that path.

### 19.2 Backend Integration Tests

**TEST-19.2.1** In `backend/tests/integration/test_ai_suggestions_router.py`: Test `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}` against a test project in the test database. Mock the Gemini API client to return a fixed response. Assert 200 with correct `SuggestionResponse` shape.

**TEST-19.2.2** Test the 503 response when `GEMINI_API_KEY` is empty in settings.

**TEST-19.2.3** Test the 400 response for suppressed sections (`cover`, `revision_history`, `abbreviations`).

**TEST-19.2.4** Test that a request for a custom section key (`custom_section_*`) returns 200 with `suggestion_mode: "custom"` when the custom section has saved content in the test database.

**TEST-19.2.4b** Test that a request for a custom section key returns 404 when the section does not exist in `section_data`.

**TEST-19.2.5** Test the 404 response for a non-existent `project_id`.

**TEST-19.2.6** Test `GET /api/v1/ts-types` returns the wrapped object `{ "ts_types": [...] }` with 10 entries, each having `value` and `label` string fields.

**TEST-19.2.7** Test `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio` returns `400` for `system_config` and for any non-Gantt section.

**TEST-19.2.8** Test that calling `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}` for a project with `ts_type = NULL` returns `400` with a detail message indicating that TS type selection is required, and that no Gemini API call is made.

### 19.3 Frontend Component Tests

**TEST-19.3.1** In the appropriate component test file: Test that the AI Suggestions button renders for a non-suppressed predefined section on a project with a valid `ts_type`. Test that the button renders for a custom section. Test that the button does NOT render for `cover`, `revision_history`, or `abbreviations`. Test that the button enters loading state on click. Test that the AI Suggestions button renders as **disabled** (with an explanatory tooltip or inline message) for a project with `ts_type = NULL`, and that clicking it has no effect and makes no API call.

**TEST-19.3.2** Test that the suggestion panel renders when `SuggestionResponse` is received. Test that Import is disabled when `structured_import_available: false`. Test that for a custom section response with `subsection_suggestions`, the panel shows per-subsection suggestions.

**TEST-19.3.3** Test the Import workflow: mock `getAiSuggestion()`, click Import, assert that the draft store for the section key is updated with the expected content per the content-family merge rule (replace-all for table, merge for mixed, full-replace for rich text).

**TEST-19.3.4** Test that navigating to a different section closes the suggestion panel without modifying the draft.

### 19.4 Frontend E2E Tests

**TEST-19.4.1** Playwright test: creates a project with a TS type selected, navigates to a predefined section, clicks AI Suggestions (API mocked), verifies the suggestion panel appears, clicks Import, verifies the editor is populated, clicks SAVE, verifies the preview updates.

**TEST-19.4.2** Playwright test: verifies the AI Suggestions button is absent on the `cover` section.

**TEST-19.4.3** Playwright test for draw.io flow: clicks "Generate Draw.io Chart" in the `overall_gantt` section (API mocked), verifies the XML code block appears, verifies the Copy XML button copies to clipboard.

**TEST-19.4.4** Playwright test for custom section: adds and saves a custom section, clicks AI Suggestions (API mocked), imports the suggestion, clicks SAVE, verifies the preview shows the content.

### 19.5 Manual Regression Checklist

- [ ] Existing SAVE workflow is unchanged for sections that have never used AI Suggestions.
- [ ] Preview shows only saved content, not draft AI suggestions.
- [ ] Generated DOCX includes AI-imported content when saved, with the same fidelity as manually authored content.
- [ ] Completion tracking does not treat unsaved AI-imported content as complete.
- [ ] Custom sections show the AI Suggestions button and return usable suggestions.
- [ ] Custom section AI-imported content, when saved, appears in the browser preview and in the generated DOCX.
- [ ] `cover`, `revision_history`, and `abbreviations` sections show no AI Suggestions button.
- [ ] The revision history auto-append behavior is unchanged when saving AI-imported content.
- [ ] The draw.io XML output is importable into draw.io without modification.
- [ ] The JSON-to-mxGraph converter produces valid XML for all tested task counts (1, 5, 15 tasks).
- [ ] Full prompt content does not appear in application logs at any log level.
- [ ] AI Suggestions button is disabled (with "Select TS Type first" message) for projects with `ts_type = NULL`. No API call is made when the disabled button is in this state.
- [ ] All existing `ai_prompts` endpoints continue to function without modification. No regression to `ai_prompts/router.py` behavior.

---

## 20. Acceptance Criteria

**AC-1:** When creating a new project, the TS Type dropdown is present, required, and populated with all 10 TS type options. Submitting without a selection shows a validation error. The project is not created until a TS type is selected.

**AC-2:** `GET /api/v1/ts-types` returns a JSON object `{ "ts_types": [...] }` with exactly 10 entries. Each entry has a `value` string (canonical path) and a `label` string (display name).

**AC-3:** The AI Suggestions button is visible in the input panel for all predefined sections except `cover`, `revision_history`, and `abbreviations`, and for all custom sections. The button is absent from only those three suppressed sections.

**AC-4:** Clicking AI Suggestions for any predefined table section (a section confirmed as Mode B in `builders.py`) on a project with TS type "Data Analysis/Data Centralization" returns a 200 response with `suggestion_mode: "predefined"` and a `content.rows` array with at least 3 rows, each containing the field keys defined by that section's actual schema in the repository.

**AC-5:** Clicking Import Suggestion for a table section populates the section editor's row inputs with the suggestion's rows. The rows are editable. No save occurs automatically.

**AC-6:** After importing a suggestion and clicking SAVE, the browser preview updates to show the imported content. The content is identical to what would appear if the user had typed the same content manually.

**AC-7:** After importing a suggestion and clicking SAVE, the generated DOCX includes the imported content in the correct section position and format.

**AC-8:** When `GEMINI_API_KEY` is absent from the environment, clicking AI Suggestions shows a toast error and does not crash the application or disrupt the editor.

**AC-9:** Clicking AI Suggestions for `overall_gantt` returns a suggestion panel with both a text suggestion (Mode D) and a "Generate Draw.io Chart" button. Clicking the draw.io button returns a response with a non-empty `drawio_xml` string produced by `gantt_converter.py`. The XML must pass `xml.etree.ElementTree.fromstring()` without raising an exception. Clicking AI Suggestions for `system_config` must NOT show a "Generate Draw.io Chart" button.

**AC-10:** The `context.txt` file placed at `./ts_documents/Data Analysis/Data Centralization/context.txt` on the host is used in suggestions for a project with TS type "Data Analysis/Data Centralization". This can be verified by the `context_txt_used: true` field in the `SuggestionResponse`, without requiring inspection of logged prompt content.

**AC-11:** Clicking AI Suggestions for a custom section that has saved content returns a 200 response with `suggestion_mode: "custom"` and content appropriate to the custom section's actual subsection structure.

**AC-12:** Dismissing the suggestion panel without importing leaves the section draft unchanged.

**AC-13:** The Gemini API key does not appear in any frontend network response, HTML source, browser storage, or application log at any log level.

**AC-14:** AI-imported content for a custom section, after the user clicks SAVE, appears in the browser preview and is included in the generated DOCX with the same parity as manually authored custom section content.

**AC-15:** When historical documents exist across multiple project subfolders within the selected TS category, the `context_sources` field in the `SuggestionResponse` contains documents from at least two distinct subfolders (when available), confirming that the diversity-aware selection strategy in RET-10.2.2 was applied rather than a purely mtime-ordered top-5 selection.

**AC-16:** For an existing project with `ts_type = NULL`, the AI Suggestions button is visible but disabled. An explanatory message reads "Select TS Type first." Clicking the button has no effect and makes no API call. If the endpoint is called directly via API for such a project, the backend returns `400` with a message indicating that TS type selection is required. No Gemini call is made.

---

## 21. Rollout Plan / Implementation Phases

### Phase 1 — Foundation (Backend + Schema)

**Deliverables:**
- Alembic migration `002_add_ts_type_to_projects.py`
- `TSType` enum in `backend/app/projects/ts_types.py`
- Updated `ProjectCreate`, `ProjectDetail`, `ProjectSummary` Pydantic schemas
- `GET /api/v1/ts-types` endpoint
- Updated `POST /api/v1/projects` to accept and store `ts_type`
- Settings additions: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MAX_TOKENS`, `GEMINI_TIMEOUT_SECONDS`, `TS_DOCUMENTS_DIR`
- Docker Compose volume addition for `./ts_documents`
- Backend unit tests for TS type validation
- **No changes to `backend/app/ai_prompts/` or any related file (ai_prompts coexistence boundary)**

**Definition of Done:** Existing project creation still works. New projects accept and persist `ts_type`. `GET /api/v1/ts-types` returns the full enumeration. The `ai_prompts` endpoints are fully functional and unchanged.

### Phase 2 — Retrieval and Prompt Module

**Deliverables:**
- `backend/app/ai_suggestions/retrieval.py` with `load_category_context()` using recursive folder scanning
- `backend/app/ai_suggestions/builders.py` with `build_prompt()` for all section modes (A through F), accepting `draft_content` as a parameter
- `backend/app/ai_suggestions/gantt_converter.py` with `convert_gantt_json_to_mxgraph()` (Option B draw.io strategy)
- Section key → title mapping constant in `builders.py`
- Section key → content mode mapping in `builders.py` (derived from `predefinedSectionContent.ts`, not from this document)
- Section key → JSON schema mapping for table and mixed modes in `builders.py` (confirmed against `predefinedSectionContent.ts`)
- `google-generativeai` added to `requirements.txt`
- Unit tests for retrieval (including recursive scan), builders (including draft content block), and gantt_converter
- A populated `./ts_documents/` directory with at least one category folder and project subfolders for integration testing
- **No changes to `backend/app/ai_prompts/` or any related file**

**Definition of Done:** `build_prompt()` produces correctly structured prompts for all six section modes including Mode F (custom sections) and correctly places the `draft_content` block. `load_category_context()` correctly performs recursive scanning, applies truncation, and handles missing folders gracefully. `gantt_converter.py` unit tests pass without any LLM dependency. The `ai_prompts` endpoints are fully functional and unchanged.

### Phase 3 — AI Suggestions API Endpoints

**Deliverables:**
- `backend/app/ai_suggestions/router.py` with `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}` (accepting `draft_content` in request body)
- `backend/app/ai_suggestions/service.py` with full suggestion generation logic, including `400` early return for projects with `ts_type = NULL`
- `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio` endpoint
- Pydantic schemas: `SuggestionResponse`, `DrawioResponse`, `SuggestionError`, `SuggestionRequest` (with `draft_content` field)
- All backend error handling as specified in Section 16, including `400` for `ts_type = NULL`
- Backend integration tests (with mocked Gemini), including tests for `ts_type = NULL` returning `400`
- Router registration in `main.py`
- **No changes to `backend/app/ai_prompts/` or any related file**

**Definition of Done:** All integration tests pass. Manual test with live Gemini API key returns plausible suggestions for at least two section keys and the draw.io endpoint. Calling the endpoint for a project with `ts_type = NULL` returns `400`. The `ai_prompts` endpoints are fully functional and unchanged.

### Phase 4 — Frontend Integration

**Deliverables:**
- `frontend/src/api/aiSuggestions.ts` adapter (with `draft_content` in request)
- `frontend/src/types/aiSuggestions.ts` type definitions (including `subsection_suggestions` field and `SuggestionRequest` with `draft_content`)
- Updated `NewProjectModal.tsx` with TS type dropdown driven by `GET /api/v1/ts-types`
- AI Suggestions button added to `SectionInputPanel` for predefined sections (or `PredefinedSectionEditor` header) — disabled with tooltip for projects with `ts_type = NULL`
- AI Suggestions button added to `CustomSectionInput` editor for custom sections and subsections — disabled with tooltip for projects with `ts_type = NULL`
- Draft state capture before each AI request: `sectionDraftContents[section_key]` passed as `draft_content` in the POST body
- Suggestion panel component (collapsible card with formatted preview, Import/Regenerate/Dismiss buttons)
- Import logic for all section content modes (15.2), including Mode F for custom sections
- Draw.io XML panel with copy button
- Toast notifications per UI requirements
- Component tests for button and panel on both predefined and custom sections, including disabled-state test for `ts_type = NULL` projects
- E2E tests for predefined section flow, custom section flow, and draw.io flow

**Definition of Done:** Full end-to-end flow works for both predefined and custom sections: create project with TS type, open a section, click AI Suggestions (with draft content sent), receive suggestion, import, edit, save, see in preview, generate DOCX with that content. Custom section AI import follows the same path. AI Suggestions button is disabled for projects with `ts_type = NULL`.

### Phase 5 — Polish, Context Files, and Validation

**Deliverables:**
- `context.txt` files authored and placed for all 10 TS category folders, following the format defined in RET-10.5.2
- `context.txt.template` file placed in the `ts_documents/` root for future contributors
- Integration test verifying `context.txt` content appears in the assembled prompt (by inspecting DEBUG logs)
- Integration test verifying recursive folder scanning returns documents from project subfolders
- Developer README updated with: Gemini API key setup, `ts_documents` folder structure, `context.txt` authoring guide, gantt_converter usage
- Full E2E test suite passing
- Manual regression checklist completed

**Definition of Done:** All acceptance criteria pass. Context files are in place for all 10 categories. The feature is ready for use by Hitachi India TS document authors.

---

## 22. Open Questions / Assumptions

### Product Decisions (Confirmed for This Phase)

**PD-1.** `ts_type` is immutable after project creation in this phase (see FR-6.1.6). If the team needs editability later, a `PATCH /api/v1/projects/{id}` mechanism must be added as a separate feature.

**PD-2.** Custom sections must be saved at least once before AI suggestions can be requested. An unsaved custom section has no title or structure for the backend to read, and the endpoint returns 404 in that case. This is an explicit product rule applied consistently in FR-6.6.2, BE-8.5.3, and AC-11.

**PD-3.** draw.io chart generation is available only for `overall_gantt` and `shutdown_gantt`. `system_config` is out of scope for chart generation. This is applied consistently throughout the document.

**PD-4.** The draw.io architecture is Option B: JSON-to-server-conversion via `gantt_converter.py`. This is a firm decision for this phase (Section 14.0, ASS-8).

**PD-5.** The `GET /api/v1/ts-types` response shape is `{ "ts_types": [{ "value": "...", "label": "..." }] }` — a wrapped object. This is applied consistently in BE-8.4.4, Section 12.1, AC-2, and TEST-19.2.6.

**PD-6.** Full prompt content and raw Gemini responses must not be logged at any level. Only redacted metadata (project_id, section_key, ts_type, token counts, latency) may be logged.

### Assumptions

**ASS-1.** The Gemini API is accessible from the Docker network. If the deployment environment has egress restrictions, the team must ensure `generativelanguage.googleapis.com` is reachable.

**ASS-2.** Historical TS documents are stored as `.docx` or `.txt` files and will be manually placed in `./ts_documents/` during setup. No automated import pipeline is required in this phase.

**ASS-3.** `gemini-2.0-flash` is the target model. The `GEMINI_MODEL` setting allows this to be changed without a code deployment.

**ASS-4.** The AI Suggestions button appears for all 28 eligible predefined sections plus all saved custom sections, subject to the project having a non-null `ts_type`. For projects with `ts_type = NULL`, the button is visible but disabled. Eligibility is suppressed (button hidden entirely) only for `cover`, `revision_history`, and `abbreviations`.

**ASS-5.** The existing `__editMetadata` attachment in `buildContentWithEditMetadata` continues to be used for saved AI-imported content. No separate AI-origin flag is needed; the user approves content before saving.

**ASS-6.** The section key → JSON schema mapping for table sections (Mode B) in `builders.py` must stay in sync with the frontend section schemas. If a section schema changes, `builders.py` must be updated in the same PR.

### Open Questions

**OQ-1.** **PDF support for historical documents.** The team may have historical TS documents as PDFs. PDF extraction requires `pdfplumber` or `PyMuPDF`. Recommendation: defer to Phase 3 or later once `.docx`/`.txt` retrieval is confirmed end-to-end.

**OQ-2.** **AI provider abstraction.** The `builders.py` module is provider-agnostic, but `service.py` is Gemini-specific. If multi-provider support is wanted, add a `ai_client.py` interface before Phase 3. Skip if Gemini is confirmed.

**OQ-3.** **Section schema canonical source.** The Mode B row schemas exist in both the frontend content definitions and `builders.py`. Should they be extracted to a shared YAML or JSON file? Recommendation: accept duplication in this phase. Document the coupling in the developer README.

**OQ-4.** **Streaming responses.** Gemini supports streaming. For long suggestions, a streaming UI via Server-Sent Events would reduce perceived latency. Not required in Phase 4; revisit if user testing reveals sustained 15+ second waits.

**OQ-5.** **Suggestion history.** Should the last AI suggestion per section persist across navigation? Currently transient. Recommendation: keep transient in Phase 4; add a `last_suggestion` JSONB field to `section_data` in a future phase if users request it.

**OQ-6.** **context.txt authoring assistance.** A one-time AI-assisted script could generate initial `context.txt` files from historical documents during Phase 5, using the RET-10.5.2 template. Recommendation: yes, run per category, review manually before placement. This is a Phase 5 team operation.

**OQ-7.** **Feedback mechanism.** Thumbs-up/down rating on suggestions is omitted in this phase. If added later, a lightweight `POST /api/v1/projects/{id}/ai-suggestions/{section_key}/feedback` endpoint writing to a log file is sufficient for manual review.

---

*End of Feature Requirement Document*
