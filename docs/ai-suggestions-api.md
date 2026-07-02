# AI Suggestions API Reference

The AI Suggestions feature is exposed through FastAPI under `/api/v1`. Interactive OpenAPI documentation is available at `/docs` when the backend is running.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/ai-suggestions/status` | Returns whether Groq is configured. |
| `GET` | `/api/v1/ts-types` | Returns selectable TS type values and labels. |
| `GET` | `/api/v1/projects/ts-types` | Compatibility route used by the current frontend. Same response as `/api/v1/ts-types`. |
| `POST` | `/api/v1/projects/{project_id}/ai-suggestions/{section_key}` | Generates a section suggestion. |
| `POST` | `/api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio` | Generates draw.io XML for Gantt sections. |

## GET /api/v1/ai-suggestions/status

Returns non-secret feature availability for the frontend.

Response:

```json
{
  "groq_configured": true
}
```

`groq_configured` is `false` when `GROQ_API_KEY` is empty or missing.

## GET /api/v1/ts-types

Returns the canonical TS type values accepted by project creation and AI retrieval.

Response:

```json
{
  "ts_types": [
    {
      "value": "Data Analysis/Data Centralization/UGS",
      "label": "Data Analysis - Data Centralization - UGS"
    },
    {
      "value": "Level 2",
      "label": "Level 2"
    }
  ]
}
```

Use `value` as the project `ts_type`. The backend validates this value against the enum before resolving any filesystem path.

## POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}

Generates AI content for one eligible predefined or saved custom section.

Request body:

```json
{
  "draft_content": {
    "paragraph": "Current unsaved editor text or structured draft data"
  }
}
```

`draft_content` is optional. When present, it is included in the prompt before category context and historical documents so the AI sees unsaved edits.

Predefined rich-text response example:

```json
{
  "section_key": "executive_summary",
  "section_title": "Executive Summary",
  "suggestion_mode": "predefined",
  "structured_import_available": true,
  "content": "<p>Suggested executive summary...</p>",
  "subsection_suggestions": null,
  "raw_text": null,
  "historical_context_available": true,
  "context_sources": ["UGS/Technical Proposal_Jindal_Steel_UGS_R1.Pdf"],
  "context_txt_used": true
}
```

Tabular or mixed-field sections return JSON that matches the editable section schema. If Groq returns text that cannot be parsed into the target schema, the endpoint still returns `200` with `structured_import_available: false` and the unstructured text in `raw_text`.

Custom section response example:

```json
{
  "section_key": "custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "section_title": "Site Integration Notes",
  "suggestion_mode": "custom",
  "structured_import_available": true,
  "content": null,
  "subsection_suggestions": [
    {
      "subsection_index": 0,
      "subsection_name": "Integration Scope",
      "type": "paragraph",
      "content": "<p>Suggested subsection content...</p>",
      "raw_text": null,
      "structured_import_available": true
    }
  ],
  "raw_text": null,
  "historical_context_available": true,
  "context_sources": ["Historian/example.docx"],
  "context_txt_used": false
}
```

Suppressed section keys:

- `cover`
- `revision_history`
- `abbreviations`

These return `400` because they are metadata-driven or managed by existing workflows.

## POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio

Generates draw.io-compatible mxGraph XML from an AI-generated Gantt task list.

Supported section keys:

- `overall_gantt`
- `shutdown_gantt`

Request body:

```json
{
  "draft_content": {
    "rows": [
      {
        "task": "Mobilization",
        "duration": "2 weeks"
      }
    ]
  }
}
```

Response:

```json
{
  "drawio_xml": "<mxGraphModel><root>...</root></mxGraphModel>",
  "chart_instructions": "Copy the XML below, open https://app.diagrams.net, then File - Import From - Device. Paste the XML and import the diagram."
}
```

## Error Codes

| Status | Applies to | Meaning |
| --- | --- | --- |
| `400` | Suggestion and draw.io | Invalid section key, suppressed section, missing TS type, invalid TS type, or non-Gantt draw.io section. |
| `404` | Suggestion and draw.io | Project not found. For custom sections, the custom section has not been saved yet. |
| `502` | Suggestion and draw.io | Groq provider error, invalid Gantt JSON, or Gantt JSON schema mismatch. |
| `503` | Suggestion and draw.io | `GROQ_API_KEY` is not configured. |
| `504` | Suggestion and draw.io | Groq request timed out. |
| `500` | Draw.io | Gantt JSON was valid, but XML conversion failed. |

## Save Semantics

The AI endpoints never persist generated content. The frontend imports suggestions into draft state only. Users must click the existing SAVE button to write section content to the database and include it in preview/export.

## Layered Context Response Fields

When using the Layered Context Architecture (all TS types migrated from Phase 2 onward), the suggestion response includes additional context observability fields:

### `loaded_shared_contexts`

**Type:** `List[str]`  
**Description:** Names of shared context files that were successfully loaded for this section.

```json
{
  "loaded_shared_contexts": ["domain_context.txt", "architecture_context.txt"]
}
```

Empty list `[]` indicates no layered files were found (legacy fallback may be active).

### `section_guidance_available`

**Type:** `bool`  
**Description:** `true` if a per-section guidance file (`section_guidance/{section_key}.txt`) was found and loaded.

```json
{
  "section_guidance_available": true
}
```

### `context_txt_used`

**Type:** `bool`  
**Description:** `true` if the legacy `context.txt` fallback was used. This indicates the TS type has NOT been migrated to the layered architecture yet.

```json
{
  "context_txt_used": false
}
```

### Full Layered Context Response Example

Response for a `hardware_specs` section on a migrated TS type (UGS):

```json
{
  "section_key": "hardware_specs",
  "section_title": "Hardware Specifications",
  "suggestion_mode": "predefined",
  "structured_import_available": true,
  "content": null,
  "subsection_suggestions": null,
  "raw_text": "[{\"name\": \"UGS Server\", ...}]",
  "historical_context_available": true,
  "context_sources": [
    "domain_context.txt",
    "architecture_context.txt",
    "section_guidance/hardware_specs.txt"
  ],
  "context_txt_used": false,
  "loaded_shared_contexts": ["domain_context.txt", "architecture_context.txt"],
  "section_guidance_available": true
}
```

## LayeredCategoryContext Schema

The internal `LayeredCategoryContext` Pydantic model represents the loaded context:

```python
class LayeredCategoryContext(BaseModel):
    # Shared context file contents (None if file not found)
    domain_context: Optional[str] = None
    architecture_context: Optional[str] = None
    implementation_context: Optional[str] = None
    cybersecurity_context: Optional[str] = None
    gantt_context: Optional[str] = None

    # Per-section guidance
    section_guidance: Optional[str] = None

    # Historical documents (same as legacy CategoryContext)
    historical_documents: List[HistoricalDoc] = []

    # Observability metadata
    loaded_shared_contexts: List[str] = []      # filenames loaded successfully
    section_guidance_available: bool = False    # True if guidance file found
    folder_path: str = ""                       # TS type folder path (for debugging)

    # Legacy fallback
    legacy_context_txt: Optional[str] = None    # populated only in fallback mode
    historical_context_available: bool = False
```

## Routing Map Configuration

The section routing map (`section_context_map.py`) defines which shared context files are loaded per section. This can be customized per TS type via `context_routing_override.json`. See `backend/app/ai_suggestions/BUILDERS_README.md` for full configuration details.

