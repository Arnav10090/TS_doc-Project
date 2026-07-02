# AI-Powered TS Document Assistant

## Overview

The TS Document Generator should be extended with an AI-powered assistant that helps users draft high-quality Technical Specification (TS) documents section by section.

When a user creates a new project, they will select a **TS type** from the available TS folder structure. That TS type determines which category of historical TS documents the AI should use as grounding context. The AI will then generate section-specific suggestions for the new document by combining:

- current project metadata
- currently saved section content
- the selected TS category’s `context.txt` file, when available
- historical TS documents from the matching TS folder
- the existing project context document

The goal is to reduce manual writing effort, improve consistency, and speed up TS document creation while preserving the current explicit SAVE workflow, preview behavior, and Word export pipeline.

---

## Business Objective

Hitachi already has a large body of previous TS documents organized by solution category. Those documents contain useful domain knowledge, recurring section patterns, typical wording, and project structure conventions.

The AI assistant should use this historical knowledge to suggest section-by-section content for a new TS document based on the selected TS type, instead of generating generic text.

This will help authors:

- start faster
- maintain consistency across TS documents
- reduce repetitive drafting
- reuse proven category-specific patterns
- keep the document aligned with Hitachi’s technical writing style

---

## Core Feature

## AI Suggestions for Every Section

Every section in the TS Document Generator should include an **AI Suggestions** button in the right-side section input panel.

This applies to:

- predefined sections
- custom sections
- custom subsections

When the user clicks the button, the backend should:

1. Identify the project’s selected TS type.
2. Resolve that TS type to the matching folder in the TS folder structure.
3. Load the category’s `context.txt` file if one exists.
4. Load relevant historical TS documents from that folder.
5. Combine that data with the current project metadata and saved section state.
6. Call Gemini and ask it to generate section-specific suggestions.
7. Return the response in a rich-text friendly format.
8. Allow the user to import the suggestion into the existing editor.
9. Let the user edit the imported content manually.
10. Save the content through the existing SAVE button.
11. Reflect the saved content in the preview and final DOCX export exactly as manually entered content would.

This preserves the existing explicit-save workflow and does not introduce autosave.

---

## TS Type Based Knowledge Routing

## Category Selection During Project Creation

A required **TS Type** field should be added to the project creation flow.

The user’s selected TS type will map to one of these folder categories:

- Data Analysis
  - Advanced Analysis
    - AutoML Platform
  - Data Centralization
    - Historian
    - UGS
  - Data Monitoring
    - EMS
    - HPMS
    - RAS
- Level 2
- OT Cybersecurity
- OT Upgrades
  - HMI
  - L2
  - POC Upgrade
- Yard Management
  - HSM
  - Plate Mill

The selected TS type becomes part of the project metadata and is used as the primary routing key for AI grounding.

---

## Historical TS Knowledge Base

The AI should not rely only on a generic prompt.

Instead, it should be grounded in the knowledge hierarchy below:

### 1. Current Project Metadata
Includes:

- solution name
- client name
- client location
- reference number
- document date
- selected TS type

### 2. Current Saved Sections
The AI should consider whatever section content already exists in the project, so it can produce consistent suggestions that fit the document so far.

### 3. Category Context File
A future `context.txt` file will be created for each TS type folder. This file will contain curated, category-specific knowledge such as:

- common architecture patterns
- standard terminology
- typical project scope
- reusable wording
- section-level assumptions
- common deliverable structure

### 4. Historical TS Documents
The AI should also use the historical TS documents found inside the selected TS type folder and its subfolders as supporting examples.

### 5. PROJECT_CONTEXT.md
The existing project context should be used to preserve the current app structure, data model, workflow, and constraints.

This hierarchy ensures the AI stays grounded in the most relevant source first, and falls back to broader context only when necessary.

---

## Retrieval Strategy

The retrieval system should work like this:

- The user selects a TS type while creating the project.
- That TS type maps to a specific TS folder path.
- The system first checks for a `context.txt` file in that category folder.
- It then reads relevant historical TS documents from the same folder tree.
- Those sources are used to generate a section-specific prompt for Gemini.

This should be treated as a **folder-based retrieval system with curated context support**, not just a generic “latest documents” lookup.

Later, this pipeline can evolve into more advanced RAG with:

- document chunking
- embeddings
- semantic search
- vector databases

But the first implementation should remain file-based and category-driven so it is simple, explainable, and easy to maintain.

---

## Section-Aware Content Generation

The AI should understand the purpose of each section and generate suggestions accordingly.

Examples:

- **Executive Summary**  
  concise business and solution overview

- **Architecture / System Description**  
  integration-focused technical narrative

- **Hardware Specifications**  
  structured hardware recommendations

- **Software Specifications**  
  software stack and platform-related content

- **Cybersecurity Sections**  
  control-oriented, compliance-conscious wording

- **Features / Scope Sections**  
  capability summaries and bullet points

- **Schedule / Gantt Sections**  
  milestone-oriented planning content

The output should always be relevant to the selected section and should fit the document’s technical specification style.

---

## Rich Text Output

AI suggestions should be returned in a format that the existing editor can accept and display cleanly.

The response should support:

- bullet points
- numbered lists
- paragraphs
- tables
- headings where appropriate

The user should be able to import the suggestion directly into the section editor and continue editing it normally.

---

## Import Workflow

The workflow should be:

AI Suggestion → Review → Import Suggestion → Populate Editor → Edit Manually → SAVE → Preview Updates → DOCX Updates

Important rules:

- importing a suggestion must not auto-save
- the imported content must behave exactly like manually authored content after saving
- once saved, the preview and exported DOCX must use the saved content with no special AI-specific behavior

---

## AI-Assisted Gantt and Schedule Generation

For sections that require Gantt charts or schedule charts, the AI should also help generate draw.io-compatible output.

The AI should be able to produce content that the user can:

1. copy from the app
2. paste into draw.io / diagrams.net
3. convert into a chart
4. export as a PNG
5. upload back into the TS Document Generator using the existing image upload flow

This should work alongside the existing text suggestion flow and should not replace it.

A safer implementation may be to generate a structured schedule model first and convert it into draw.io XML server-side, rather than asking the model to produce raw XML directly.

---

## AI Assistant Design Goals

The assistant should be:

- context-aware
- category-aware
- section-aware
- editable
- non-destructive
- preview-compatible
- DOCX-compatible
- extendable for future RAG improvements

It should help the user write better TS documents while keeping the current editing workflow intact.

---

## Success Criteria

This feature is successful when:

- every section shows an AI Suggestions button
- the AI uses the correct TS folder based on the selected TS type
- the AI uses `context.txt` plus historical TS documents for grounding
- custom sections and subsections are supported
- imported suggestions can be edited and saved normally
- preview and DOCX export reflect saved AI content exactly
- Gantt and schedule sections can generate draw.io-compatible assistance
- document creation becomes faster and more consistent without changing the core app workflow
