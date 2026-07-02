# TS Documents Directory

This directory stores historical Technical Specification documents and curated category context for AI Suggestions.

## Folder Structure

The folder names must match the canonical `ts_type` values returned by the backend TS type API.

```text
ts_documents/
|-- Data Analysis/
|   |-- Advanced Analysis/
|   |   `-- AutoML Platform/
|   |-- Data Centralization/
|   |   |-- Historian/
|   |   `-- UGS/
|   `-- Data Monitoring/
|       |-- EMS/
|       |-- HPMS/
|       `-- RAS/
|-- Level 2/
|-- OT Cybersecurity/
|-- OT Upgrades/
|   |-- HMI/
|   |-- L2/
|   `-- POC Upgrade/
`-- Yard Management/
    |-- HSM/
    `-- Plate Mill/
```

Selectable category folders:

| TS type value | Context file path |
| --- | --- |
| `Data Analysis/Advanced Analysis` | `ts_documents/Data Analysis/Advanced Analysis/context.txt` |
| `Data Analysis/Advanced Analysis/AutoML Platform` | `ts_documents/Data Analysis/Advanced Analysis/AutoML Platform/context.txt` |
| `Data Analysis/Data Centralization` | `ts_documents/Data Analysis/Data Centralization/context.txt` |
| `Data Analysis/Data Centralization/Historian` | `ts_documents/Data Analysis/Data Centralization/Historian/context.txt` |
| `Data Analysis/Data Centralization/UGS` | `ts_documents/Data Analysis/Data Centralization/UGS/context.txt` |
| `Data Analysis/Data Monitoring` | `ts_documents/Data Analysis/Data Monitoring/context.txt` |
| `Data Analysis/Data Monitoring/EMS` | `ts_documents/Data Analysis/Data Monitoring/EMS/context.txt` |
| `Data Analysis/Data Monitoring/HPMS` | `ts_documents/Data Analysis/Data Monitoring/HPMS/context.txt` |
| `Data Analysis/Data Monitoring/RAS` | `ts_documents/Data Analysis/Data Monitoring/RAS/context.txt` |
| `Level 2` | `ts_documents/Level 2/context.txt` |
| `OT Cybersecurity` | `ts_documents/OT Cybersecurity/context.txt` |
| `OT Upgrades/HMI` | `ts_documents/OT Upgrades/HMI/context.txt` |
| `OT Upgrades/L2` | `ts_documents/OT Upgrades/L2/context.txt` |
| `OT Upgrades/POC Upgrade` | `ts_documents/OT Upgrades/POC Upgrade/context.txt` |
| `Yard Management/HSM` | `ts_documents/Yard Management/HSM/context.txt` |
| `Yard Management/Plate Mill` | `ts_documents/Yard Management/Plate Mill/context.txt` |

## Context Files

Each selectable category can contain one optional `context.txt` file at the category root. This file is the curated grounding source used before historical document excerpts in the prompt.

Use `ts_documents/context.txt.template` as the base template. Each selectable category folder also contains a `context.txt.template` copy for convenience. Do not rename a template to `context.txt` until the content has been reviewed and category-specific placeholder text has been removed.

Recommended sections:

- `## Category Summary`
- `## Standard Scope Patterns`
- `## Key Components And Integrations`
- `## Technical Architecture Notes`
- `## Assumptions And Dependencies`
- `## Delivery And Gantt Guidance`
- `## Section-Specific Guidance`
- `## Preferred Terminology`
- `## Avoid Or Verify`

Best practices:

- Keep `context.txt` plain UTF-8 text.
- Put only category-specific technical guidance in the file.
- Prefer concise, reusable statements over copied proposal paragraphs.
- Keep the strongest information near the top; the backend truncates `context.txt` at 2000 characters.
- Do not include secrets, commercial pricing, credentials, private customer contacts, or raw API keys.
- Review generated or AI-assisted context before committing it.

## Historical Documents

Place complete or representative historical TS documents under the matching category folder or project subfolders.

Supported retrieval formats:

- `.docx`
- `.txt`
- `.md`

PDF files can be stored here for team reference, but the current retrieval service does not extract PDF text for AI Suggestions.

The retrieval service recursively scans the selected category folder, excludes files named exactly `context.txt`, truncates each document excerpt at 1500 characters, and selects up to 5 diverse documents with a combined historical context budget of 6000 characters.

## Security

The Docker backend mounts this directory read-only:

```yaml
./ts_documents:/app/ts_documents:ro
```

The backend validates TS type values before resolving paths and rejects traversal attempts. Keep this directory under version control only if the documents are approved for repository storage.

## AI Suggestions Flow

When a project has a selected `ts_type`:

1. The backend resolves `ts_type` to a folder under `TS_DOCUMENTS_DIR`.
2. It reads category-level `context.txt` if present.
3. It recursively scans supported historical document files.
4. It normalizes and truncates text blocks.
5. It selects diverse excerpts.
6. It adds the context to the 7-layer prompt hierarchy for Gemini.
