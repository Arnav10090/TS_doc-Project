# Requirements Document

## Introduction

This requirements document specifies the functional and non-functional requirements for the AI Suggestions Feature in the TS Document Generator. This feature adds AI-powered section content generation capabilities that leverage a 7-layer knowledge hierarchy to provide contextually relevant suggestions for Technical Specification documents used by Hitachi India.

The AI Suggestions Feature integrates with the existing TS Document Generator to augment, not replace, the manual authoring workflow. All AI-generated content flows through an explicit review and save process, preserving the existing workflow semantics.

## Glossary

- **AI_Suggestions_System**: The backend subsystem responsible for generating AI-powered content suggestions
- **Gemini_API**: The Google Generative AI API used for content generation
- **Knowledge_Hierarchy**: The 7-layer prioritized context used for AI prompt construction (project metadata → saved sections → draft content → context.txt → historical documents → PROJECT_CONTEXT.md → LLM knowledge)
- **TS_Type**: A project-level categorization indicating the technical domain and folder path for historical document retrieval
- **Content_Family**: A classification of section types based on their data structure (Rich Text, Tabular, Mixed-Field, List-Based, Image-Backed)
- **Draft_State**: The unsaved editor state managed by `sectionDraftStore` in the frontend
- **Saved_State**: The persisted section content in the PostgreSQL `section_data` table
- **Predefined_Section**: One of the 34 standard sections defined in `predefinedSectionContent.ts`
- **Custom_Section**: A user-defined section with configurable subsections
- **Subsection**: A child content block within a Custom_Section (table, paragraph, or image)
- **Historical_Document**: A previously created TS document stored in the `ts_documents/` directory hierarchy
- **Context_TXT**: A category-specific plain text file containing domain knowledge for a TS_Type
- **Draw_io_Chart**: An mxGraph XML representation of a Gantt chart for import into draw.io
- **Suggestion_Response**: The structured API response containing AI-generated content
- **Import_Operation**: The frontend action that populates Draft_State with AI-generated content without saving
- **Structured_Import**: The ability to programmatically populate form fields from parsed JSON/HTML content

## Requirements

### Requirement 1: AI Suggestions Button Availability

**User Story:** As a technical writer, I want to see an AI Suggestions button in eligible sections, so that I can request AI-generated content when needed.

#### Acceptance Criteria

1. THE Frontend SHALL display an "✨ AI Suggestions" button in all Predefined_Section editors except `cover`, `revision_history`, and `abbreviations`
2. THE Frontend SHALL display an "✨ AI Suggestions" button in all Custom_Section editors that have been saved at least once
3. WHEN a Project has `ts_type` set to NULL, THE Frontend SHALL disable the AI Suggestions button in Predefined_Section editors and display tooltip text: "Select a TS type for this project to enable AI suggestions"
4. WHEN a Custom_Section has never been saved, THE Frontend SHALL hide the AI Suggestions button for that specific Custom_Section editor
5. WHEN the AI service is unavailable or other blocking conditions exist, THE Frontend SHALL disable the AI Suggestions button
6. WHEN the GEMINI_API_KEY is not configured, THE AI Suggestions button SHALL remain disabled
7. THE Frontend SHALL render the AI Suggestions button with a sparkle icon (✨) and label "AI Suggestions"

### Requirement 2: TS Type Selection

**User Story:** As a project creator, I want to select a TS type when creating a project, so that AI suggestions can retrieve relevant historical documents.

#### Acceptance Criteria

1. THE Backend SHALL add a `ts_type` column to the `projects` table via Alembic migration
2. THE `ts_type` column SHALL be nullable to support legacy Projects created before this feature

	(Clarification: database nullability is a schema property and does not imply the business rule for new project creation. Newly created projects MUST provide a non-null `ts_type` value; the API and UI must validate and reject creations that omit `ts_type`.)
3. WHEN creating a new Project, THE Frontend SHALL require the user to select a `ts_type` from a dropdown
4. THE Backend SHALL provide a `GET /api/v1/ts-types` endpoint that returns all available TS type options
5. THE Backend SHALL store the selected `ts_type` value in the `projects.ts_type` column
6. THE Backend SHALL include the `ts_type` field in `ProjectCreate`, `ProjectDetail`, and `ProjectSummary` schemas
7. THE `ts_type` values SHALL use the format "Category/Subcategory/..." supporting multi-level hierarchy (e.g., "Data Analysis/Data Centralization/Historian", "Level 2")
8. THE Frontend SHALL display `ts_type` labels with em dash separator (e.g., "Data Analysis — Data Centralization — Historian", "Level 2")

### Requirement 3: AI Suggestion Generation for Predefined Sections

**User Story:** As a technical writer, I want to generate AI-powered content for predefined sections, so that I can accelerate document authoring with contextually relevant suggestions.

#### Acceptance Criteria

1. WHEN a user clicks the AI Suggestions button in a Predefined_Section, THE Frontend SHALL send a POST request to `/api/v1/projects/{project_id}/ai-suggestions/{section_key}`
2. THE Frontend SHALL include the current `draft_content` (unsaved editor state) in the request body
3. IF the GEMINI_API_KEY is not configured, THE Backend SHALL return HTTP 503 with message: "AI suggestions are not configured." without invoking Gemini_API
4. IF the Project `ts_type` is NULL, THE Backend SHALL return HTTP 400 with message: "This project has no TS type assigned. Update the project to select a TS type before using AI Suggestions." without invoking Gemini_API
5. IF the `section_key` is `cover`, `revision_history`, or `abbreviations`, THE Backend SHALL return HTTP 400 with message: "AI suggestions are not available for this section." without invoking Gemini_API
6. THE Backend SHALL load the Project metadata and all saved section content
7. THE Backend SHALL retrieve the category context using the retrieval module
8. THE Backend SHALL build a section-specific prompt following the Knowledge_Hierarchy priority order
9. THE Backend SHALL call the Gemini_API with the constructed prompt
10. THE Backend SHALL parse the LLM response according to the section's Content_Family
11. THE Backend SHALL return a Suggestion_Response with structured content
12. IF the Gemini_API returns an error (4xx or 5xx from provider), THE Backend SHALL return HTTP 502 with message: "AI provider error. Please try again."
13. IF the Gemini_API times out (exceeds `GEMINI_TIMEOUT_SECONDS`), THE Backend SHALL return HTTP 504 with message: "AI suggestion timed out. Please try again."

### Requirement 4: AI Suggestion Generation for Custom Sections

**User Story:** As a technical writer, I want to generate AI-powered content for custom sections, so that I can get suggestions for project-specific content structures.

#### Acceptance Criteria

1. WHEN a user clicks the AI Suggestions button in a Custom_Section, THE Frontend SHALL send a POST request to `/api/v1/projects/{project_id}/ai-suggestions/{section_key}`
2. IF the Custom_Section has never been saved, THE Backend SHALL return HTTP 404 with message: "Section not found. Save the section at least once before requesting AI suggestions."
3. THE Backend SHALL load the saved Custom_Section content including title and subsections array
4. FOR EACH Subsection in the Custom_Section, THE Backend SHALL generate content based on the Subsection `contentType`: paragraph subsections receive narrative content suggestions, table subsections receive structured row suggestions, and image subsections receive textual guidance only
5. THE Backend SHALL return a Suggestion_Response with a `subsection_suggestions` array containing one entry per Subsection
6. EACH subsection suggestion SHALL include `subsection_index`, `subsection_name`, and `content` fields
7. THE AI_Suggestions_System SHALL preserve the contentType of each Subsection without adding, removing, or changing subsection types
8. THE AI_Suggestions_System SHALL only modify the `data` field values within each Subsection

### Requirement 5: Knowledge Hierarchy Implementation

**User Story:** As a system architect, I want AI suggestions to prioritize project-specific knowledge over general knowledge, so that generated content is contextually accurate.

#### Acceptance Criteria

1. THE AI_Suggestions_System SHALL construct prompts using the following priority order: (1) Project metadata, (2) Existing saved section content, (3) Current draft content, (4) Context_TXT, (5) Historical_Documents, (6) PROJECT_CONTEXT.md, (7) LLM general knowledge
2. THE Project metadata SHALL NEVER be truncated from the prompt
3. THE Section identity block SHALL NEVER be truncated from the prompt
4. WHEN the prompt exceeds token budget, THE AI_Suggestions_System SHALL truncate content in this order: (1) Historical_Documents (shortest first), (2) Current draft content, (3) Existing saved sections, (4) Context_TXT (as last resort)
5. THE Context_TXT content SHALL be truncated at 2000 characters
6. EACH Historical_Document excerpt SHALL be truncated at 1500 characters
7. THE AI_Suggestions_System SHALL include at most 5 Historical_Documents in the prompt
8. THE total Historical_Documents content SHALL NOT exceed 6000 characters

### Requirement 6: Historical Document Retrieval

**User Story:** As a system, I need to retrieve and process historical TS documents, so that AI suggestions can learn from past projects.

#### Acceptance Criteria

1. THE Retrieval_Module SHALL resolve the `ts_type` to a folder path within the `ts_documents/` directory
2. THE Retrieval_Module SHALL validate the resolved path against the base `TS_DOCUMENTS_DIR` to prevent path traversal attacks
3. THE Retrieval_Module SHALL check for a `context.txt` file in the folder root
4. IF a `context.txt` file exists, THE Retrieval_Module SHALL read it as UTF-8 and truncate at 2000 characters
5. THE Retrieval_Module SHALL recursively scan the folder for files with extensions `.docx`, `.txt`, `.md`
6. FOR `.docx` files, THE Retrieval_Module SHALL extract paragraph text using the `python-docx` library and truncate at 1500 characters
7. FOR `.txt` and `.md` files, THE Retrieval_Module SHALL read as UTF-8 and truncate at 1500 characters
8. THE Retrieval_Module SHALL perform diversity-aware selection over collected Historical_Documents
9. THE Retrieval_Module SHALL return a `CategoryContext` object with `context_txt`, `historical_documents`, and `category_path` (relative to TS_DOCUMENTS_DIR)
10. THE Context_TXT SHALL NOT be included in the `historical_documents` list (it is returned separately)

### Requirement 7: Section-Aware Prompt Generation

**User Story:** As a system, I need to generate prompts tailored to each section's data structure, so that the LLM produces appropriately formatted output.

#### Acceptance Criteria

1. FOR sections in Content_Family A (Rich Text), THE Prompt_Builder SHALL instruct the LLM to output clean HTML with `<p>`, `<ul>`, `<li>`, `<strong>`, and `<em>` tags
2. FOR sections in Content_Family B (Tabular), THE Prompt_Builder SHALL instruct the LLM to output a JSON array of row objects with specified field names
3. FOR sections in Content_Family C (Mixed-Field), THE Prompt_Builder SHALL instruct the LLM to output a JSON object with specified field keys
4. FOR sections in Content_Family D (List-Based), THE Prompt_Builder SHALL instruct the LLM to output a JSON array of items with specified structure
5. FOR sections in Content_Family E (Image-Backed), THE Prompt_Builder SHALL instruct the LLM to output a JSON object with text description fields only
6. THE Prompt_Builder SHALL include section-specific output instructions in the prompt
7. THE Prompt_Builder SHALL include the section title and description in the prompt
8. THE Prompt_Builder SHALL sanitize and HTML-strip all user-supplied metadata values before inclusion
9. THE Prompt_Builder SHALL truncate each user-supplied metadata value to 500 characters
10. THE Prompt_Builder SHALL embed PROJECT_CONTEXT.md content in prompt templates at build time (not read from filesystem at runtime)

### Requirement 8: Suggestion Display and Review

**User Story:** As a technical writer, I want to review AI-generated content before importing it, so that I can verify its accuracy and relevance.

#### Acceptance Criteria

1. WHEN the AI suggestion is received, THE Frontend SHALL render a Suggestion Panel component
2. THE Suggestion Panel SHALL display the section title
3. THE Suggestion Panel SHALL display a preview of the AI-generated content
4. THE Suggestion Panel SHALL display a disclaimer: "AI-generated content. Review before saving."
5. THE Suggestion Panel SHALL provide an "Import Suggestion" button
6. WHEN the Suggestion Panel is visible, THE Suggestion Panel SHALL provide a "Regenerate" button
7. WHEN the Suggestion Panel is visible, THE Suggestion Panel SHALL provide a "Dismiss" button
8. IF `structured_import_available` is false, THE Suggestion Panel SHALL display the `raw_text` in a pre-formatted block
9. IF `structured_import_available` is false, THE Suggestion Panel SHALL enable the "Import Suggestion" button to allow importing raw text content
10. THE Suggestion Panel SHALL display the context sources used (from `context_sources` field)
11. THE Suggestion Panel SHALL indicate whether `context_txt_used` is true or false

### Requirement 9: Suggestion Import Semantics

**User Story:** As a technical writer, I want imported AI content to merge appropriately with my existing draft, so that I don't lose work in progress.

#### Acceptance Criteria

1. WHEN a user clicks "Import Suggestion" for a Content_Family A section, THE Frontend SHALL replace text/paragraphs fields and preserve structural fields
2. WHEN a user clicks "Import Suggestion" for a Content_Family B section, THE Frontend SHALL replace the entire `rows` array
3. WHEN a user clicks "Import Suggestion" for a Content_Family C section, THE Frontend SHALL perform a shallow object merge (suggestion fields overwrite existing draft fields)
4. WHEN a user clicks "Import Suggestion" for a Content_Family D section, THE Frontend SHALL merge imported items with existing draft content according to repository-defined schema behavior
5. WHEN a user clicks "Import Suggestion" for a Content_Family E section, THE Frontend SHALL replace prose description fields only and preserve existing images
6. THE Frontend SHALL update the Draft_State (sectionDraftStore) after import
7. THE Frontend SHALL update the editor fields to reflect the imported content
8. THE Frontend SHALL NOT send a save request to the backend during import
9. THE Saved_State SHALL remain unchanged until the user clicks SAVE

### Requirement 10: Save and Persistence

**User Story:** As a technical writer, I want to explicitly save AI-imported content, so that I maintain control over what gets persisted to the document.

#### Acceptance Criteria

1. WHEN a user clicks SAVE after importing AI content that includes at least some content, THE Frontend SHALL send a PUT request to `/api/v1/projects/{project_id}/sections/{section_key}`
2. THE Backend SHALL upsert the section content to the `section_data` table
3. THE Backend SHALL return a `SectionDataResponse` confirming the save
4. THE Frontend SHALL update the preview to reflect the saved content
5. WHEN both AI-generated and manually authored content are present in a section, THE saved content SHALL be indistinguishable between the two types in preview
6. WHEN both AI-generated and manually authored content are present in a section, THE saved content SHALL be indistinguishable between the two types in DOCX export
7. THE AI_Suggestions_System SHALL NOT store metadata about whether content was AI-generated

### Requirement 11: Draw.io Gantt Chart Generation

**User Story:** As a technical writer, I want to generate Gantt charts in draw.io format, so that I can create visual project timelines without manual chart construction.

#### Acceptance Criteria

1. FOR sections with keys `overall_gantt` or `shutdown_gantt`, THE Suggestion Panel SHALL display a "Generate Draw.io Chart" button
2. WHEN a user clicks "Generate Draw.io Chart", THE Frontend SHALL send a POST request to `/api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio`
3. THE Backend SHALL call the Gemini_API with a Gantt-specific prompt
4. THE LLM SHALL emit a week-based JSON array of `GanttTask` objects with fields: `task`, `phase`, `start_week`, `duration_weeks`, `milestone`, `dependencies`
5. THE Backend SHALL validate the LLM response against the `GanttTask` Pydantic schema
6. THE Backend SHALL convert the validated JSON to mxGraph XML format using the Gantt_Converter module
7. THE Backend SHALL return a `DrawioResponse` with `gantt_json`, `drawio_xml`, and `chart_instructions` fields
8. THE Frontend SHALL display the mxGraph XML in a pre-formatted block
9. THE Frontend SHALL provide a "Copy XML" button that copies the XML to the clipboard
10. THE Frontend SHALL display step-by-step instructions: "1. Open draw.io 2. File → Import → paste XML 3. Edit as needed 4. File → Export as PNG"

### Requirement 12: Gantt Converter Module

**User Story:** As a system, I need to convert week-based Gantt JSON to mxGraph XML, so that users can import charts into draw.io.

#### Acceptance Criteria

1. THE Gantt_Converter SHALL accept a list of `GanttTask` objects as input
2. THE Gantt_Converter SHALL create an `<mxGraphModel>` root element
3. FOR EACH task, THE Gantt_Converter SHALL compute X position as `(start_week - project_start_week) * WEEK_PIXEL_WIDTH`
4. FOR EACH task, THE Gantt_Converter SHALL compute bar width as `duration_weeks * WEEK_PIXEL_WIDTH`
5. FOR EACH task, THE Gantt_Converter SHALL create an `<mxCell>` node for the task bar
6. FOR tasks with `milestone` set to true, THE Gantt_Converter SHALL create a milestone marker instead of a bar
7. IF a task has `dependencies`, THE Gantt_Converter SHALL create `<mxCell>` arrow edges between the dependent tasks
8. THE Gantt_Converter SHALL return a valid mxGraph XML string
9. THE generated XML SHALL be importable into draw.io without errors

### Requirement 13: Error Handling and Resilience

**User Story:** As a technical writer, I want clear error messages when AI suggestions fail, so that I can take corrective action.

#### Acceptance Criteria

1. IF the GEMINI_API_KEY is not configured, THE Backend SHALL return HTTP 503 with message: "AI suggestions are not configured."
2. IF a Project has `ts_type` set to NULL, THE Backend SHALL return HTTP 400 with message: "This project has no TS type assigned. Update the project to select a TS type before using AI Suggestions."
3. IF a `section_key` is invalid or suppressed, THE Backend SHALL return HTTP 400 with message: "AI suggestions are not available for this section."
4. IF a Custom_Section has not been saved, THE Backend SHALL return HTTP 404 with message: "Section not found. Save the section at least once before requesting AI suggestions."
5. IF the Gemini_API returns an error (4xx or 5xx from provider), THE Backend SHALL return HTTP 502 with message: "AI provider error. Please try again."
6. IF the Gemini_API times out (exceeds `GEMINI_TIMEOUT_SECONDS`), THE Backend SHALL return HTTP 504 with message: "AI suggestion timed out. Please try again."
7. IF the LLM response cannot be parsed as valid JSON for structured sections, THE Backend SHALL return HTTP 200 with `structured_import_available: false` and populate `raw_text` with the unparseable response
8. IF the Historical_Documents folder is missing, empty, or contains no usable documents, THE Backend SHALL continue with HTTP 200 and set `historical_context_available: false` in the response
9. THE Backend SHALL log error metadata (error_type, project_id, section_key, provider_status_code, response_size, response_sha256) without logging raw prompts or responses

### Requirement 14: Security and Input Validation

**User Story:** As a system administrator, I want the AI suggestions feature to validate inputs and prevent security vulnerabilities, so that the system remains secure.

#### Acceptance Criteria

1. THE Backend SHALL validate `ts_type` values against the `TSType` enum
2. THE Backend SHALL prevent path traversal attacks by validating resolved paths start with `TS_DOCUMENTS_DIR`
3. THE Backend SHALL sanitize all user-supplied metadata values by HTML-stripping before prompt inclusion
4. WHEN user-supplied metadata exceeds 500 characters, THE Backend SHALL truncate it to 500 characters maximum
5. THE Backend SHALL validate `section_key` against the pattern `^[a-z_]+$` for predefined sections or `^custom_section_\d+_[a-f0-9-]+$` for custom sections
6. THE Backend SHALL validate `project_id` is a valid UUID
7. THE Backend SHALL NOT log raw prompts, raw LLM responses, or GEMINI_API_KEY values in any circumstances
8. THE Backend SHALL strip non-printable characters from all included text blocks
9. THE Backend SHALL normalize whitespace in all included text blocks
10. THE Backend SHALL use read-only volume mount (`:ro`) for the `ts_documents/` directory

### Requirement 15: Configuration and Deployment

**User Story:** As a system administrator, I want to configure the AI suggestions feature through environment variables, so that I can deploy it across different environments.

#### Acceptance Criteria

1. THE Backend SHALL read the `GEMINI_API_KEY` from environment variables
2. THE Backend SHALL default `GEMINI_MODEL` to "gemini-2.0-flash" if not specified
3. THE Backend SHALL default `GEMINI_MAX_TOKENS` to 2048 if not specified
4. THE Backend SHALL default `GEMINI_TIMEOUT_SECONDS` to 30 if not specified
5. THE Backend SHALL default `TS_DOCUMENTS_DIR` to "/app/ts_documents" if not specified
6. THE docker-compose.yml SHALL mount the `./ts_documents` host directory to `/app/ts_documents` in the backend container with read-only flag
7. IF the `GEMINI_API_KEY` is not configured, THE Backend SHALL log a warning on startup
8. THE Backend SHALL register the `ai_suggestions` router at path `/api/v1`

### Requirement 16: Backward Compatibility

**User Story:** As a system architect, I want the AI suggestions feature to coexist with existing systems, so that current functionality is not disrupted.

#### Acceptance Criteria

1. THE ai_suggestions module SHALL NOT modify any files in the `ai_prompts/` directory
2. THE ai_suggestions module SHALL NOT share routes with the `ai_prompts` module
3. THE ai_suggestions module SHALL NOT share data models with the `ai_prompts` module
4. THE AI-imported content SHALL flow through the existing save/preview/export pipeline unchanged
5. THE existing `sections/router.py` SHALL only be modified to add import statements and route registration for coexistence with ai_suggestions module
6. THE `ts_type` column SHALL be nullable to support legacy Projects created before this feature
7. WHEN a legacy Project has NULL `ts_type`, THE Frontend SHALL disable the AI Suggestions button
8. THE DOCX export SHALL include AI-generated content identically to manually authored content

### Requirement 17: Performance and Scalability

**User Story:** As a technical writer, I want AI suggestions to respond within a reasonable time, so that the feature doesn't disrupt my workflow.

#### Acceptance Criteria

1. THE Backend SHALL target an average AI suggestion response time of less than 5 seconds (excluding external Gemini_API provider latency or outages)
2. THE Backend SHALL target a 95th percentile response time of less than 8 seconds (excluding external Gemini_API provider latency or outages)
3. THE Backend SHALL implement a timeout of 30 seconds for Gemini_API calls
4. THE Retrieval_Module SHALL optimize retrieval performance by caching Historical_Documents metadata per ts_type and SHALL invalidate cached metadata whenever the modification timestamp of the corresponding ts_type directory changes
5. THE Backend SHALL limit total Historical_Documents content to 6000 characters to stay within prompt token budget
6. THE Frontend SHALL display a loading spinner during AI suggestion generation
7. THE Frontend SHALL remain responsive during AI suggestion generation (non-blocking)

### Requirement 18: Prompt Template Embedding

**User Story:** As a system, I need to embed system knowledge in prompt templates at build time, so that runtime does not require filesystem reads.

#### Acceptance Criteria

1. THE PROJECT_CONTEXT.md content SHALL be embedded into prompt templates at build time
2. THE AI_Suggestions_System SHALL NOT read PROJECT_CONTEXT.md from the filesystem at runtime
3. IF embedding PROJECT_CONTEXT.md fails during build time, THE system SHALL fail completely without filesystem fallback
4. THE embedded PROJECT_CONTEXT.md content SHALL appear in the Knowledge_Hierarchy layer 6 position
5. THE embedded PROJECT_CONTEXT.md content SHALL be included in every section prompt
6. THE embedded PROJECT_CONTEXT.md content SHALL NOT be truncated unless the entire prompt exceeds token budget

### Requirement 19: Response Schema Compliance

**User Story:** As a frontend developer, I want consistent response schemas from the API, so that I can reliably parse and display suggestions.

#### Acceptance Criteria

1. THE Suggestion_Response SHALL include field `section_key` (string)
2. THE Suggestion_Response SHALL include field `section_title` (string)
3. THE Suggestion_Response SHALL include field `suggestion_mode` (literal: "predefined" | "custom" | "regenerate")
4. THE Suggestion_Response SHALL include field `structured_import_available` (boolean)
5. THE Suggestion_Response SHALL include field `content` (string | array | object | null)
6. THE Suggestion_Response SHALL include field `subsection_suggestions` (array | null)
7. THE Suggestion_Response SHALL include field `raw_text` (string | null)
8. THE Suggestion_Response SHALL include field `historical_context_available` (boolean)
9. THE Suggestion_Response SHALL include field `context_sources` (array of strings)
10. THE Suggestion_Response SHALL include field `context_txt_used` (boolean)
11. FOR Custom_Section responses, EACH subsection suggestion SHALL include `subsection_index`, `subsection_name`, and `content` fields
12. THE DrawioResponse SHALL include field `gantt_json` (array of GanttTask objects)
13. THE DrawioResponse SHALL include field `drawio_xml` (string)
14. THE DrawioResponse SHALL include field `chart_instructions` (string)

### Requirement 20: Testing Requirements

**User Story:** As a quality assurance engineer, I want comprehensive tests for the AI suggestions feature, so that I can verify correctness and prevent regressions.

#### Acceptance Criteria

1. THE Backend SHALL include unit tests for retrieval module functions
2. THE Backend SHALL include unit tests for prompt builder functions
3. THE Backend SHALL include unit tests for Gantt converter functions
4. THE Frontend SHALL include unit tests for import logic functions
5. THE Backend SHALL include integration tests for AI suggestion endpoints
6. THE Backend SHALL include integration tests verifying NULL ts_type returns 400
7. THE Backend SHALL include integration tests verifying unsaved custom sections return 404
8. THE Backend SHALL include integration tests verifying suppressed sections return 400
9. THE Frontend SHALL include end-to-end tests for the complete suggestion workflow
10. THE Frontend SHALL include end-to-end tests for Draw.io chart generation
11. THE Frontend SHALL include end-to-end tests verifying AI Suggestions button is suppressed for `cover`, `revision_history`, and `abbreviations`
12. THE Backend SHALL include performance tests targeting 10 concurrent users
