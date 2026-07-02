# Implementation Plan: AI Suggestions Feature

## Overview

This implementation plan breaks down the AI Suggestions Feature into actionable coding tasks. The feature adds AI-powered content generation for TS Document sections, leveraging a 7-layer knowledge hierarchy and preserving the existing explicit SAVE workflow.

**Technology Stack:**
- **Backend:** Python 3.11 + FastAPI
- **Frontend:** TypeScript + React 18
- **AI Provider:** Google Gemini API
- **Database:** PostgreSQL (existing)

## Tasks

- [x] 1. Backend Foundation - Database and Configuration
  - [x] 1.1 Create Alembic migration for `ts_type` column
    - Add nullable `ts_type` column to `projects` table
    - Create migration file: `backend/alembic/versions/002_add_ts_type_to_projects.py`
    - _Requirements: 2.1, 2.2_
    - Note: The database column must be nullable to preserve legacy projects; the business rule requires that new project creation requests include a non-null `ts_type` value â€” enforce this validation in the API and require selection in the UI.

  - [x] 1.2 Create TS Type enumeration and utilities
    - Implement `backend/app/projects/ts_types.py` with `TSType` enum
    - Include TS type categories as defined by business requirements
    - Add helper methods: `get_display_label()`, `to_folder_path()`
    - _Requirements: 2.7, 14.1_

  - [x] 1.3 Update project schemas with `ts_type` field
    - Modify `ProjectCreate`, `ProjectDetail`, `ProjectSummary` in `backend/app/projects/schemas.py`
    - Add `ts_type` field as Optional[str] for backward compatibility
    - _Requirements: 2.6, 16.6_

  - [x] 1.4 Add configuration settings for AI features
    - Update `backend/app/config.py` Settings class
    - Add: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MAX_TOKENS`, `GEMINI_TIMEOUT_SECONDS`, `TS_DOCUMENTS_DIR`
    - Set appropriate defaults per design specification
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 1.5 Update Docker Compose configuration
    - Add `ts_documents` volume mount to backend service in `docker-compose.yml`
    - Mount as read-only: `./ts_documents:/app/ts_documents:ro`
    - _Requirements: 15.6, 14.10_

- [x] 2. Backend Foundation - AI Suggestions Module Structure
  - [x] 2.1 Create ai_suggestions module structure
    - Create directory: `backend/app/ai_suggestions/`
    - Create files: `__init__.py`, `router.py`, `service.py`, `schemas.py`, `builders.py`, `retrieval.py`, `gantt_converter.py`, `section_schemas.py`
    - _Requirements: 3.0, 4.0_

  - [x] 2.2 Implement TS Types API endpoint
    - Create `GET /api/v1/ts-types` endpoint in `backend/app/projects/router.py`
    - Return `TSTypesResponse` with value/label pairs from TSType enum
    - TSType enum provides authoritative display labels (e.g., "Data Analysis â€” Data Centralization")
    - _Requirements: 2.4, 2.8, 19.12, 19.13, 19.14_

  - [x] 2.3 Implement Gemini API wrapper
    - Create `call_gemini()` function in `backend/app/ai_suggestions/service.py`
    - Configure with API key, model, max tokens, temperature
    - Implement timeout handling (30 seconds default)
    - Map errors: missing keyâ†’503, provider errorâ†’502, timeoutâ†’504
    - Never log raw prompts or responses, only redacted metadata
    - _Requirements: 13.1, 13.5, 13.6, 14.7_

- [x] 3. Historical Document Retrieval System
  - [x] 3.1 Implement folder-based retrieval module
    - Create `load_category_context()` in `backend/app/ai_suggestions/retrieval.py`
    - Resolve `ts_type` to folder path and validate against `TS_DOCUMENTS_DIR` (prevent path traversal)
    - Scan for `context.txt` in folder root
    - Recursively scan for `.docx`, `.txt`, `.md` files
    - Return `CategoryContext` with `context_text`, `documents`, `historical_context_available`
    - _Requirements: 6.1, 6.2, 6.3, 6.9, 14.2_

  - [x] 3.2 Implement document text extraction
    - For `.docx`: extract paragraph text using `python-docx` library
    - For `.txt` and `.md`: read as UTF-8
    - Truncate `context.txt` at 2000 characters
    - Truncate each historical document at 1500 characters
    - Normalize whitespace and strip non-printable characters
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 14.8, 14.9_

  - [x] 3.3 Implement diversity-aware document selection
    - Perform diversity-aware selection over collected historical documents
    - Select up to 5 documents
    - Ensure total historical documents content â‰¤ 6000 characters
    - Prioritize different filenames/subfolders and low text overlap
    - _Requirements: 6.8, 5.7, 5.8, 17.5_

- [x] 4. Section Schema Mapping and Classification
  - [x] 4.1 Create section field schema mapping
    - Create `backend/app/ai_suggestions/section_schemas.py`
    - Generate `SECTION_SCHEMAS` dict from `frontend/src/components/sections/predefinedSectionContent.ts`
    - Map predefined sections to content families (A/B/C/D/E) based on repository schema
    - Include field names and descriptions for each section from repository definitions
    - Repository schema is source of truth; this file is a generated mapping
    - _Requirements: 7.1-7.10_

  - [x] 4.2 Implement section-aware prompt builders
    - Create prompt builder functions in `backend/app/ai_suggestions/builders.py`
    - Implement `build_section_prompt()` with 7-layer knowledge hierarchy
    - Embed PROJECT_CONTEXT.md content at build time (not runtime filesystem read)
    - Validate build fails if PROJECT_CONTEXT.md embedding fails
    - Create family-specific output instructions (A: HTML, B: JSON rows, C: JSON object, D: JSON array, E: text description)
    - Sanitize user-supplied metadata (HTML-strip, truncate to 500 chars)
    - Implement truncation strategy: historical docs â†’ draft â†’ saved sections â†’ context.txt
    - _Requirements: 5.1-5.8, 7.7-7.10, 18.1-18.6_

- [x] 5. Predefined Section AI Suggestions
  - [x] 5.1 Implement suggestion request/response schemas
    - Create `SuggestionRequest` in `backend/app/ai_suggestions/schemas.py`
    - Create `SuggestionResponse` with all PRD-required fields
    - Create `SubsectionSuggestion` schema
    - Include: `section_key`, `section_title`, `suggestion_mode`, `structured_import_available`, `content`, `subsection_suggestions`, `raw_text`, `historical_context_available`, `context_sources`, `context_txt_used`
    - _Requirements: 19.1-19.11_

  - [x] 5.2 Implement predefined section suggestion endpoint
    - Create `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}` in router
    - Validate project exists and has non-NULL `ts_type`
    - Validate section key is not suppressed (`cover`, `revision_history`, `abbreviations`)
    - Load project metadata and all saved section content
    - Include draft_content from request body in knowledge hierarchy
    - _Requirements: 3.1-3.12, 13.2-13.4_

  - [x] 5.3 Implement response parsing by content family
    - Create parsing functions: `parse_rich_text_response()`, `parse_table_response()`, `parse_mixed_field_response()`, `parse_list_response()`, `parse_image_description_response()`
    - Handle JSON parse failures gracefully: return `structured_import_available: false` with `raw_text`
    - Strip markdown code fences if present
    - Validate table rows have expected field names
    - _Requirements: 7.1-7.6, 13.7_

  - [x]* 5.4 Write unit tests for prompt builders
    - Test knowledge hierarchy priority order (7 layers: metadata â†’ saved â†’ draft â†’ context.txt â†’ historical â†’ PROJECT_CONTEXT â†’ LLM)
    - Test truncation behavior when exceeding token budget
    - Test sanitization of user-supplied metadata
    - Test PROJECT_CONTEXT.md embedding (no runtime filesystem read)
    - Test build failure when PROJECT_CONTEXT.md embedding fails
    - _Requirements: 20.2, 18.1-18.6_

  - [x]* 5.5 Write unit tests for response parsers
    - Test parsing for each content family (A/B/C/D/E)
    - Test handling of invalid JSON responses
    - Test markdown code fence stripping
    - _Requirements: 20.2_

- [x] 6. Custom Section AI Suggestions
  - [x] 6.1 Implement custom section suggestion logic
    - Add custom section handling in `service.py`
    - Load saved custom section content including title and subsections array
    - Return 404 if custom section has never been saved
    - Validate custom section has title and at least one subsection
    - _Requirements: 4.1, 4.2, 13.4_

  - [x] 6.2 Implement subsection-aware prompt generation
    - For each subsection, determine `contentType` (paragraph/table/image)
    - Generate subsection-specific prompts
    - Paragraph subsections: generate HTML narrative
    - Table subsections: generate JSON rows based on existing table schema
    - Image subsections: generate caption/description text only
    - _Requirements: 4.3, 4.4_

  - [x] 6.3 Implement subsection suggestions response
    - Return `subsection_suggestions` array with one entry per subsection
    - Include `subsection_index`, `subsection_name`, `content` for each
    - Preserve subsection count and contentType (never add/remove/change types)
    - Handle mixed structured/unstructured parsing results
    - _Requirements: 4.5, 4.6, 4.7, 4.8_

  - [x]* 6.4 Write integration tests for custom sections
    - Test unsaved custom section returns 404
    - Test multi-subsection response structure
    - Test subsection structure preservation (no add/remove/type changes)
    - _Requirements: 20.7_

- [x] 7. Checkpoint - Backend Core Complete
  - Ensure all backend tests pass
  - Verify API endpoints return correct status codes
  - Test with mock Gemini API responses

- [x] 8. Frontend - TS Type Selection
  - [x] 8.1 Update project creation with TS Type dropdown
    - Modify `frontend/src/components/projects/NewProjectModal.tsx`
    - Add `ts_type` field to project creation form
    - Fetch TS types from `GET /api/v1/ts-types` endpoint
    - Display with em dash separator in dropdown
    - Make field required for new projects
    - _Requirements: 2.3, 2.8_

  - [x] 8.2 Update project stores and types
    - Add `ts_type` field to project TypeScript interfaces
    - Update `ProjectCreate`, `ProjectDetail` types
    - Update project store to include `ts_type`
    - _Requirements: 2.6_

- [x] 9. Frontend - AI Suggestions Button Component
  - [x] 9.1 Create AI Suggestions Button component
    - Create `frontend/src/components/shared/AISuggestionsButton.tsx`
    - Props: `projectId`, `sectionKey`, `onSuggestionReceived`, `disabled`
    - Render "âœ¨ AI Suggestions" button with sparkle icon
    - Show loading spinner during API call
    - Display tooltip when disabled due to NULL ts_type
    - _Requirements: 1.7, 8.6_

  - [x] 9.2 Implement button visibility logic
    - Suppress button for `cover`, `revision_history`, `abbreviations` sections
    - Hide button for unsaved custom sections
    - Disable button when project ts_type is NULL
    - Disable button when GEMINI_API_KEY not configured
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 9.3 Integrate button into section editors
    - Add AI Suggestions button to all predefined section components
    - Add to `SectionInputPanel.tsx` for generic integration
    - Position appropriately in editor UI
    - _Requirements: 1.1_

- [x] 10. Frontend - Suggestion Panel Component
  - [x] 10.1 Create Suggestion Panel component
    - Create `frontend/src/components/shared/SuggestionPanel.tsx`
    - Props: `sectionKey`, `sectionTitle`, `suggestion`, `onImport`, `onRegenerate`, `onDismiss`, `isRegenerating`
    - Display section title and AI-generated content preview
    - Show disclaimer: "AI-generated content. Review before saving."
    - _Requirements: 8.1-8.4_

  - [x] 10.2 Implement panel action buttons
    - Add "Import Suggestion" button
    - Add "Regenerate" button
    - Add "Dismiss" button
    - Handle loading state during regeneration
    - _Requirements: 8.5, 8.6, 8.7_

  - [x] 10.3 Implement content preview rendering
    - For structured content: render formatted preview based on content family
    - For raw text (structured_import_available=false): display in pre-formatted block
    - Display context sources and context_txt_used indicators
    - _Requirements: 8.8, 8.9, 8.10, 8.11_

  - [x] 10.4 Add Draw.io chart generation button for Gantt sections
    - Show "Generate Draw.io Chart" button when section is `overall_gantt` or `shutdown_gantt`
    - Trigger separate Gantt endpoint
    - _Requirements: 11.1_

- [x] 11. Frontend - Import Logic Implementation
  - [x] 11.1 Create import utility functions
    - Create `frontend/src/utils/aiSuggestionImport.ts`
    - Implement `importSuggestion()` main function
    - Implement family-specific import functions
    - _Requirements: 9.1-9.9_

  - [x] 11.2 Implement Family A (Rich Text) import
    - Replace text/paragraphs fields with suggestion content
    - Preserve structural fields (e.g., client_logo_rows)
    - Update draft state via sectionDraftStore
    - _Requirements: 9.1_

  - [x] 11.3 Implement Family B (Tabular) import
    - Replace entire `rows` array with suggestion content
    - Update draft state via sectionDraftStore
    - _Requirements: 9.2_

  - [x] 11.4 Implement Family C (Mixed-Field) import
    - Perform shallow object merge: `{ ...existingDraft, ...suggestion.content }`
    - Suggestion fields overwrite existing draft fields
    - Update draft state via sectionDraftStore
    - _Requirements: 9.3_

  - [x] 11.5 Implement Family D (List-Based) import
    - Merge imported items with existing draft according to repository-defined schema behavior
    - Update draft state via sectionDraftStore
    - _Requirements: 9.4_

  - [x] 11.6 Implement Family E (Image-Backed) import
    - Replace prose description fields only
    - Preserve existing images
    - Update draft state via sectionDraftStore
    - _Requirements: 9.5_

  - [x] 11.7 Implement custom section import logic
    - Import subsection suggestions by subsection_index
    - Update each subsection's `data` field in draft
    - Preserve subsection structure (count and contentType)
    - Update draft state via sectionDraftStore
    - _Requirements: 9.1-9.5_

  - [x]* 11.8 Write unit tests for import logic
    - Test each content family import function
    - Test custom section import with multiple subsections
    - Test draft state updates without backend mutation
    - _Requirements: 20.4_

- [x] 12. Checkpoint - Frontend Import Complete
  - Test import functionality for all content families
  - Verify draft state updates correctly
  - Verify saved state unchanged until SAVE clicked

- [x] 13. Frontend - Save and Persistence Integration
  - [x] 13.1 Verify save workflow with imported content
    - After import, user can edit content further
    - SAVE button triggers existing `PUT /api/v1/projects/{project_id}/sections/{section_key}` endpoint
    - Backend upserts to `section_data` table
    - Preview updates to reflect saved content
    - _Requirements: 10.1-10.4_

  - [x] 13.2 Verify preview rendering
    - AI-imported and saved content appears in preview identically to manually authored content
    - No visual distinction between AI-generated and manual content
    - _Requirements: 10.5_

  - [x] 13.3 Verify DOCX export compatibility
    - AI-imported and saved content exports to DOCX identically to manually authored content
    - No metadata about AI generation stored or exported
    - _Requirements: 10.6, 10.7, 16.8_

- [x] 14. Draw.io Gantt Chart Generation
  - [x] 14.1 Implement Gantt task schema
    - Create `GanttTask` Pydantic model in `backend/app/ai_suggestions/schemas.py`
    - Fields: `task`, `phase`, `start_week`, `duration_weeks`, `milestone`, `dependencies`
    - Week-based (not date-based)
    - _Requirements: 11.4_

  - [x] 14.2 Implement Gantt-specific LLM prompt
    - Create Gantt chart prompt in `builders.py`
    - Instruct LLM to output week-based JSON array of GanttTask objects
    - Include project timeline context from metadata
    - _Requirements: 11.3_

  - [x] 14.3 Implement Gantt converter module
    - Create `convert_gantt_json_to_drawio()` in `backend/app/ai_suggestions/gantt_converter.py`
    - Accept list of `GanttTask` objects
    - Create `<mxGraphModel>` root element
    - Compute X position: `(start_week - project_start_week) * WEEK_PIXEL_WIDTH`
    - Compute bar width: `duration_weeks * WEEK_PIXEL_WIDTH`
    - Create `<mxCell>` nodes for task bars and milestone markers
    - Add dependency edges as arrows
    - Return valid mxGraph XML string
    - _Requirements: 12.1-12.9, 11.5-11.8_

  - [x] 14.4 Implement Draw.io endpoint
    - Create `POST /api/v1/projects/{project_id}/ai-suggestions/{section_key}/drawio`
    - Call Gemini API with Gantt-specific prompt
    - Validate LLM response against GanttTask schema
    - Convert JSON to mxGraph XML
    - Return `DrawioResponse` with `drawio_xml` and `chart_instructions`
    - _Requirements: 11.2, 11.7, 19.12-19.14_

  - [x] 14.5 Implement frontend Draw.io UI
    - Display mxGraph XML in pre-formatted block in Suggestion Panel
    - Add "Copy XML" button with clipboard functionality
    - Display step-by-step instructions: "1. Open draw.io 2. File â†’ Import â†’ paste XML 3. Edit as needed 4. File â†’ Export as PNG"
    - _Requirements: 11.8, 11.9, 11.10_

  - [x]* 14.6 Write unit tests for Gantt converter
    - Test JSON-to-XML conversion
    - Test milestone marker creation
    - Test dependency arrow generation
    - Test week-based positioning calculations
    - _Requirements: 20.3_

  - [x]* 14.7 Write integration tests for Draw.io endpoint
    - Test Gantt JSON validation
    - Test XML generation and validity
    - _Requirements: 20.10_

- [x] 15. Error Handling and User Feedback
  - [x] 15.1 Implement backend error responses
    - Return 503 for missing GEMINI_API_KEY
    - Return 400 for NULL ts_type projects
    - Return 400 for suppressed section keys
    - Return 404 for unsaved custom sections
    - Return 502 for Gemini provider errors
    - Return 504 for Gemini timeouts
    - Return 200 with structured_import_available=false for JSON parse failures
    - _Requirements: 13.1-13.7_ 

  - [x] 15.2 Implement frontend error handling
    - Display user-friendly error messages for all error scenarios
    - Show toast notifications for errors
    - Provide actionable guidance (e.g., "Update project to select TS type")
    - _Requirements: 13.1-13.6_

  - [x] 15.3 Implement logging with redaction
    - Log error metadata (error_type, project_id, section_key, provider_status_code, response_size, response_sha256)
    - Never log raw prompts, raw responses, or GEMINI_API_KEY
    - Log warnings for missing context.txt or empty historical documents folders
    - _Requirements: 13.9, 14.7_

  - [x]* 15.4 Write integration tests for error scenarios
    - Test NULL ts_type returns 400
    - Test suppressed sections return 400
    - Test unsaved custom sections return 404
    - Test missing GEMINI_API_KEY returns 503
    - _Requirements: 20.6, 20.7, 20.8_

- [x] 16. Security and Input Validation
  - [x] 16.1 Implement security validations
    - Validate `ts_type` against TSType enum
    - Prevent path traversal in folder resolution (validate paths start with TS_DOCUMENTS_DIR)
    - Sanitize user-supplied metadata (HTML-strip before prompt inclusion)
    - Truncate user-supplied metadata to 500 characters max
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 16.2 Implement input validation
    - Validate `section_key` pattern: `^[a-z_]+$` for predefined or `^custom_section_\d+_[a-f0-9-]+$` for custom
    - Validate `project_id` is valid UUID
    - Strip non-printable characters from text blocks
    - Normalize whitespace in text blocks
    - _Requirements: 14.5, 14.6, 14.8, 14.9_

  - [x]* 16.3 Write security tests
    - Test path traversal prevention
    - Test metadata sanitization
    - Test input validation rejection of invalid patterns
    - _Requirements: 20.1, 20.2_

  - [x] 16.4 Implement legacy project handling
    - Validate NULL ts_type projects return 400 from backend
    - Disable AI Suggestions button in frontend when ts_type is NULL
    - Display tooltip: "Select a TS type for this project to enable AI suggestions"
    - Write acceptance tests for legacy project behavior
    - _Requirements: 2.2, 3.4, 13.2, 16.6, 16.7, 20.6_

- [x] 17. Performance Optimization and Caching
  - [x] 17.1 Implement retrieval caching
    - Cache historical documents metadata per ts_type
    - Invalidate cache when directory modification timestamp changes
    - _Requirements: 17.4_

  - [x] 17.2 Optimize prompt token usage
    - Implement truncation strategy respecting 8000-token soft budget
    - Monitor and log prompt token counts
    - _Requirements: 17.5_

  - [x] 17.3 Add performance monitoring
    - Log AI suggestion response times
    - Track average and 95th percentile latency
    - _Requirements: 17.1, 17.2_

  - [x]* 17.4 Write performance tests
    - Test with 10 concurrent users
    - Verify average response time < 5 seconds
    - Verify 95th percentile < 8 seconds
    - _Requirements: 20.12_

- [x] 18. Integration and End-to-End Testing
  - [x]* 18.1 Write end-to-end tests for predefined sections
    - Test complete workflow: button click â†’ suggestion â†’ import â†’ save
    - Test for multiple content families
    - Test button suppression for excluded sections
    - _Requirements: 20.9, 20.11_

  - [x]* 18.2 Write end-to-end tests for custom sections
    - Test complete custom section workflow
    - Test multi-subsection import
    - _Requirements: 20.9_

  - [x]* 18.3 Write end-to-end tests for Draw.io generation
    - Test Gantt chart generation workflow
    - Test XML copy-to-clipboard
    - _Requirements: 20.10_

  - [x]* 18.4 Write backward compatibility tests
    - Test legacy projects with NULL ts_type
    - Test AI button disabled for legacy projects
    - Test existing save/preview/export pipeline unchanged
    - _Requirements: 16.6, 16.7, 16.8_

- [x] 19. Documentation and Deployment
  - [x] 19.1 Create ts_documents folder structure
    - Create TS type category folders as defined by business requirements
    - Document folder structure and naming conventions
    - _Requirements: 6.1, 15.5_

  - [x] 19.2 Create context.txt template and documentation
    - Document context.txt format and best practices
    - Create template files for each category
    - _Requirements: 6.3, 6.4_

  - [x] 19.3 Document API endpoints
    - Add OpenAPI documentation for all new endpoints
    - Include request/response examples
    - Document error codes and meanings
    - _Requirements: All API requirements_

  - [x] 19.4 Create deployment guide
    - Document GEMINI_API_KEY setup
    - Document ts_documents volume mount
    - Document environment variable configuration
    - Include rollback procedures
    - _Requirements: 15.1-15.8_

  - [x] 19.5 Create user guide
    - Document how to use AI Suggestions button
    - Explain import workflow and SAVE semantics
    - Document Draw.io chart generation
    - Include screenshots and examples
    - _Requirements: All user-facing requirements_

- [ ] 20. Final Integration and Verification
  - Verify all 20 requirements from PRD are met
  - Run full test suite (unit, integration, e2e)
  - Verify AI-generated content flows through existing pipeline unchanged
  - Verify DOCX export includes AI content correctly
  - Test with real Gemini API (not mocks)
  - Verify error handling for all documented scenarios

## Phase 2: Layered Context Architecture

- [ ] 21. Create Section Context Routing System
  - [ ] 21.1 Create section_context_map.py module
    - Create `backend/app/ai_suggestions/section_context_map.py`
    - Define `DEFAULT_SECTION_CONTEXT_MAP` dictionary mapping ALL predefined repository sections to shared context files
    - **Template Alignment:** Map all sections from ORIGINAL TS template structure
    - Include mappings for: executive_summary, introduction, abbreviations (abbreviations_used), process_flow, overview, features, remote_support, documentation_control, customer_training, system_config, fat_condition, tech_stack, hardware_specs, software_specs, third_party_sw, overall_gantt, shutdown_gantt, supervisors, scope_definitions, division_of_eng, work_completion, value_addition, buyer_obligations, exclusion_list, buyer_prerequisites, binding_conditions, cybersecurity, disclaimer, poc
    - Map custom sections (custom_section_*) to domain_context as fallback
    - _Requirements: Complete template coverage, scalability, relevance, token efficiency_

  - [ ] 21.2 Implement routing functions
    - Implement `get_shared_context_files(section_key) -> List[str]`
    - Implement `get_section_guidance_file(section_key) -> Optional[str]`
    - Implement `has_section_guidance(section_key) -> bool`
    - Handle custom sections (default to domain_context)
    - _Requirements: Configurability, extensibility_

  - [ ] 21.3 Add JSON override support
    - Support loading custom routing maps from JSON config file
    - Merge custom maps with default map (custom overrides default)
    - Validate JSON structure on load
    - Document JSON format in BUILDERS_README.md
    - _Requirements: Future-proof, TS-type specific customization_

  - [ ] 21.4 Document template-to-repository section mapping
    - Create `docs/TEMPLATE_SECTION_MAPPING.md` in the project root
    - Document complete mapping of ORIGINAL TS template headings → repository section keys
    - Create machine-readable mapping (JSON or Python dict) for validation
    - Document sections where template names differ from repository keys
    - Include mapping rationale and design decisions
    - _Requirements: Clear mapping documentation, machine-readable format, validation support_

  - [ ]* 21.5 Write unit tests for routing system
    - Test routing map correctness for all predefined sections
    - Test custom section fallback behavior
    - Test JSON override loading and merging
    - Test invalid section keys return safe defaults
    - Test that template section variations map to correct repository keys
    - _Test Coverage: 95%+ for routing logic_

- [ ] 22. Create Layered Context Schema
  - [ ] 22.1 Define LayeredCategoryContext Pydantic model
    - Create `LayeredCategoryContext` in `retrieval.py`
    - Fields: domain_context, architecture_context, implementation_context, cybersecurity_context, gantt_context
    - Fields: section_guidance, historical_documents, loaded_shared_contexts, section_guidance_available
    - Field: legacy_context_txt (for backward compatibility fallback)
    - All context fields Optional[str] to handle missing files gracefully
    - _Requirements: Type safety, validation, backward compatibility_

  - [ ] 22.2 Add context metadata fields
    - Add `loaded_shared_contexts: List[str]` to track which files were loaded
    - Add `section_guidance_available: bool` flag
    - Add `folder_path: str` for debugging
    - Add `historical_context_available: bool` (existing field)
    - _Requirements: Observability, debugging support_

  - [ ] 22.3 Create type aliases for migration
    - Add `LegacyCategoryContext = CategoryContext` alias
    - Add `ModernCategoryContext = LayeredCategoryContext` alias
    - Document migration path in docstrings
    - _Requirements: Smooth migration, code clarity_

- [ ] 23. Implement Layered Context Loader
  - [ ] 23.1 Implement load_layered_context() function
    - Create `load_layered_context(ts_type, ts_documents_dir, section_key, max_docs)`
    - Resolve ts_type to folder path with path traversal prevention
    - Get list of shared context files from routing map
    - Get section guidance filename from routing map
    - _Requirements: Security, routing integration_

  - [ ] 23.2 Implement shared context file loading
    - For each shared context file in routing list:
      - Build path: `{folder}/domain_context.txt`, etc.
      - Read file as UTF-8 if exists
      - Normalize and truncate each to 1000 chars max
      - Store in corresponding LayeredCategoryContext field
    - Track which files were successfully loaded
    - _Requirements: File I/O, error handling, normalization_

  - [ ] 23.3 Implement section guidance loading
    - Build path: `{folder}/section_guidance/{section_key}.txt`
    - Read file as UTF-8 if exists
    - Normalize and truncate to 500 chars max
    - Store in section_guidance field
    - Set section_guidance_available flag
    - _Requirements: Per-section customization_

  - [ ] 23.4 Implement legacy fallback logic
    - Check if ANY new layered files exist in folder
    - If NO layered files exist: Load `context.txt` and store in legacy_context_txt field
    - If layered files exist, ignore context.txt
    - Log info message about fallback mode
    - _Requirements: Backward compatibility, zero breaking changes_

  - [ ] 23.5 Implement caching with invalidation
    - Cache key: (ts_type, section_key, max_docs, folder_fingerprint)
    - Invalidate when folder modification time changes
    - Use thread-safe cache (RLock)
    - Return deep copy of cached objects (prevent mutation)
    - _Requirements: Performance, consistency_

  - [ ] 23.6 Load historical documents (unchanged)
    - Reuse existing historical document loading logic
    - Recursively scan for .txt, .md, .docx files
    - Diversity-aware selection (up to max_docs)
    - Truncate each to 1500 chars
    - _Requirements: Maintain existing functionality_

  - [ ]* 23.7 Write comprehensive unit tests
    - Test with valid layered structure (all files present)
    - Test with partial layered structure (some files missing)
    - Test with legacy fallback (no layered files)
    - Test path traversal prevention
    - Test file reading errors (missing, corrupt, wrong encoding)
    - Test cache hits and invalidation
    - Test section_key routing integration
    - _Test Coverage: 90%+ for retrieval logic_

- [ ] 24. Update Prompt Builder for Layered Context
  - [ ] 24.1 Create _format_layered_context() function
    - Accept LayeredCategoryContext and section_key
    - Format header: "## 5. Category Context (layered - loaded for {section_key})"
    - List loaded files metadata
    - Format each present context type with subheader
    - Handle legacy fallback formatting
    - _Requirements: Clear prompt structure, observability_

  - [ ] 24.2 Integrate into build_section_prompt()
    - Update function signature to accept LayeredCategoryContext
    - Replace _format_context_txt() call with _format_layered_context()
    - Maintain layer 5 position in prompt hierarchy
    - Ensure truncation logic still applies
    - _Requirements: No behavior change for legacy context_

  - [ ] 24.3 Update build_custom_section_prompt()
    - Update to accept LayeredCategoryContext
    - Apply same layered formatting
    - _Requirements: Consistency across section types_

  - [ ] 24.4 Update build_gantt_prompt()
    - Update to accept LayeredCategoryContext
    - Prioritize gantt_context over other shared contexts
    - _Requirements: Gantt-specific context optimization_

  - [ ]* 24.5 Write prompt builder tests
    - Test layered context formatting with all context types present
    - Test with partial context (some files missing)
    - Test with legacy fallback
    - Test truncation still works correctly
    - Test layer ordering preserved
    - _Test Coverage: 85%+ for formatting logic_

- [ ] 25. Update Service Layer Integration
  - [ ] 25.1 Update generate_suggestion() in service.py
    - Replace load_category_context() call with load_layered_context()
    - Pass section_key to retrieval function
    - Handle LayeredCategoryContext return type
    - _Requirements: API compatibility_

  - [ ] 25.2 Update generate_gantt_chart() in service.py
    - Replace load_category_context() call with load_layered_context()
    - Pass section_key (overall_gantt or shutdown_gantt)
    - _Requirements: Gantt-specific context loading_

  - [ ] 25.3 Update error handling
    - Handle file not found errors gracefully
    - Log warnings for missing context files
    - Never fail request due to missing context (fall back to legacy)
    - _Requirements: Robustness, graceful degradation_

  - [ ] 25.4 Update response metadata
    - Update context_sources list with loaded layered files
    - Update context_txt_used flag based on loaded contexts
    - Add section_guidance_used flag to response
    - _Requirements: Observability, debugging support_

- [ ] 26. Split UGS Context into Layered Files
  - [ ] 26.1 Analyze UGS_context.txt structure
    - Read `ts_context_files/Data Analysis/Data Centralization/UGS/UGS_context.txt`
    - Identify domain knowledge sections
    - Identify architecture sections
    - Identify implementation/phase sections
    - Identify cybersecurity sections
    - Identify gantt/scheduling sections
    - Document section boundaries and content types
    - _Requirements: Content analysis, categorization_

  - [ ] 26.2 Create UGS domain_context.txt
    - Extract: "What UGS Is", "Core Capabilities", "Business Drivers", "Plant Environment"
    - Target size: ~800 chars
    - Save to: `ts_documents/Data Analysis/Data Centralization/UGS/domain_context.txt`
    - Validate: All domain concepts covered, no architecture details
    - _Requirements: Domain knowledge completeness_

  - [ ] 26.3 Create UGS architecture_context.txt
    - Extract: "Architecture Options", "Technology Stack", "Protocols", "Data Acquisition", "Data Storage"
    - Target size: ~600 chars
    - Save to: `ts_documents/Data Analysis/Data Centralization/UGS/architecture_context.txt`
    - Validate: All technical patterns covered, no implementation phases
    - _Requirements: Technical completeness_

  - [ ] 26.4 Create UGS implementation_context.txt
    - Extract: "Implementation Phases", "Buyer Obligations", "Value Addition", "Exclusions"
    - Target size: ~1000 chars
    - Save to: `ts_documents/Data Analysis/Data Centralization/UGS/implementation_context.txt`
    - Validate: All phase and obligation details covered
    - _Requirements: Project execution completeness_

  - [ ] 26.5 Create UGS cybersecurity_context.txt
    - Extract: "Cybersecurity", "Responsibility Matrix", "Secure Defaults", "Security Disclaimers"
    - Target size: ~500 chars
    - Save to: `ts_documents/Data Analysis/Data Centralization/UGS/cybersecurity_context.txt`
    - Validate: All security policies covered
    - _Requirements: Security compliance_

  - [ ] 26.6 Create UGS gantt_context.txt
    - Extract: "Implementation Phases" timing, "Critical Path", "Milestones", "Gates"
    - Target size: ~400 chars
    - Save to: `ts_documents/Data Analysis/Data Centralization/UGS/gantt_context.txt`
    - Validate: All scheduling guidance covered
    - _Requirements: Timeline accuracy_

  - [ ] 26.7 Validate completeness
    - Run diff between original context.txt and combined layered files
    - Ensure no content lost in split
    - Ensure no duplication across files
    - Keep original context.txt as backup
    - _Requirements: Zero information loss_

- [ ] 27. Create UGS Section Guidance Files
  - [ ] 27.1 Create section_guidance directory structure
    - Create `ts_documents/Data Analysis/Data Centralization/UGS/section_guidance/`
    - Document directory purpose in README.md
    - Create TEMPLATE_MAPPING.md to document template heading → repository key relationships
    - _Requirements: Organized file structure, clear mapping documentation_

  - [ ] 27.2 Create Executive & Overview section guidance files
    - Create executive_summary.txt, introduction.txt, overview.txt, abbreviations_used.txt, process_flow.txt (~200 chars each)
    - Content: Template-specific guidance for narrative sections
    - _Requirements: Narrative and foundational sections covered_

  - [ ] 27.3 Create Offerings section guidance files
    - Create features.txt, remote_support.txt, documentation_control.txt, customer_training.txt (~200-300 chars each)
    - Content: Template-specific guidance for service offering sections
    - _Requirements: Service offering sections aligned to template_

  - [ ] 27.4 Create Technical Configuration section guidance files
    - Create system_config.txt, fat_condition.txt, tech_stack.txt, hardware_specs.txt, software_specs.txt, third_party_sw.txt (~200-300 chars each)
    - Content: Template-specific guidance for technical sections
    - _Requirements: Technical specification sections aligned to template_

  - [ ] 27.5 Create Schedule section guidance files
    - Create overall_gantt.txt, shutdown_gantt.txt (~250-300 chars each)
    - Content: Phase structure, indicative language, week-based JSON format guidance
    - _Requirements: Timeline sections with draw.io integration guidance_

  - [ ] 27.6 Create Scope section guidance files
    - Create scope_definitions.txt, division_of_eng.txt, supervisors.txt (~200-300 chars each)
    - Content: Responsibility matrix structure, party definitions, man-day allocation guidance
    - _Requirements: Scope and responsibility sections aligned_

  - [ ] 27.7 Create Work Completion & Value Addition section guidance files
    - Create value_addition.txt, work_completion.txt (~200-250 chars each)
    - Content: PoC structure, completion criteria, deemed-issued clause guidance
    - _Requirements: Delivery and acceptance sections aligned_

  - [ ] 27.8 Create Obligations & Prerequisites section guidance files
    - Create buyer_obligations.txt, exclusion_list.txt, buyer_prerequisites.txt (~250-300 chars each)
    - Content: Standard prerequisite lists, scope dispute prevention, phase-gate organization
    - _Requirements: Contractual obligation sections aligned_

  - [ ] 27.9 Create Legal & Compliance section guidance files
    - Create binding_conditions.txt, cybersecurity.txt, disclaimer.txt (~200-250 chars each)
    - Content: Boilerplate-only instruction, responsibility statements, approved template language
    - _Requirements: Legal sections with strict boilerplate adherence_

  - [ ] 27.10 Create PoC section guidance file
    - Create poc.txt (~250 chars)
    - Content: Platform description structure, demonstration period, IP retention guidance
    - _Requirements: PoC section aligned to template_

  - [ ] 27.11 Validate guidance file completeness and alignment
    - Verify all ORIGINAL TS template sections have corresponding guidance files
    - Cross-reference with TEMPLATE_MAPPING.md
    - Ensure guidance files use template terminology
    - Validate no duplication with shared context files
    - _Requirements: Quality assurance, template alignment verification_

- [ ] 28. Validate UGS Migration
  - [ ] 28.1 Generate baseline metrics (before migration)
    - Run AI suggestions for 10 key UGS sections with OLD context.txt
    - Record prompt token counts per section
    - Record context relevance scores (manual review 1-5)
    - Record output quality scores (manual review 1-5)
    - Save generated outputs for comparison
    - _Requirements: Baseline for comparison_

  - [ ] 28.2 Run layered context suggestions (after migration)
    - Run AI suggestions for same 10 sections with NEW layered context
    - Record prompt token counts per section
    - Record context relevance and output quality scores
    - Save generated outputs for comparison
    - _Requirements: Migration validation data_

  - [ ] 28.3 Compare token usage
    - Calculate token reduction % per section
    - Calculate average token reduction across all sections
    - Target: 50%+ reduction for technical sections, 30%+ overall
    - Document sections with largest improvements
    - _Requirements: Efficiency validation_

  - [ ] 28.4 Compare context relevance
    - Calculate relevance improvement per section
    - Target: 90%+ relevance for all sections (vs ~40% with monolithic)
    - Document sections with improved relevance
    - Identify any sections with decreased relevance (investigate)
    - _Requirements: Relevance validation_

  - [ ] 28.5 Compare output quality
    - Side-by-side comparison of generated content
    - Check for any quality regressions
    - Check for quality improvements (more specific, accurate content)
    - Target: Equal or better quality for all sections
    - _Requirements: Quality assurance_

  - [ ] 28.6 Test routing correctness
    - Verify correct context loaded for hardware_specs, overall_gantt, executive_summary, cybersecurity
    - Verify incorrect context NOT loaded
    - _Requirements: Routing validation_

  - [ ] 28.7 Test legacy fallback
    - Temporarily rename layered files to simulate missing files
    - Verify system falls back to context.txt
    - Verify suggestions still work (no errors)
    - Restore layered files
    - _Requirements: Backward compatibility validation_

  - [ ] 28.8 Document findings
    - Create validation report with metrics comparison
    - Document lessons learned
    - Document any issues found and resolutions
    - Update routing map if needed based on findings
    - _Requirements: Knowledge capture_

- [ ] 29. Write Comprehensive Tests
  - [ ]* 29.1 Write routing unit tests
    - Test `get_shared_context_files()` for all predefined sections
    - Test `get_section_guidance_file()` for all sections
    - Test custom section routing (should return ["domain_context"])
    - Test invalid section keys return safe defaults
    - Test JSON override loading and merging
    - _Test File: `test_section_context_map.py`_

  - [ ]* 29.2 Write retrieval unit tests
    - Test layered context loading with all files present
    - Test with partial files (some missing)
    - Test legacy fallback when no layered files exist
    - Test path traversal prevention
    - Test file encoding errors
    - Test cache hit and invalidation
    - _Test File: `test_layered_retrieval.py`_

  - [ ]* 29.3 Write prompt builder unit tests
    - Test layered context formatting
    - Test with all context types present
    - Test with some context types missing
    - Test legacy fallback formatting
    - Test truncation logic with layered context
    - _Test File: `test_layered_builders.py`_

  - [ ]* 29.4 Write integration tests
    - Test end-to-end suggestion generation with layered context
    - Test multiple sections with different routing configurations
    - Test that incorrect context is NOT loaded
    - Test section guidance is included when available
    - Test legacy projects still work with old context.txt
    - _Test File: `test_layered_integration.py`_

  - [ ]* 29.5 Write performance tests
    - Measure retrieval performance (layered vs legacy)
    - Measure cache hit rates over multiple requests
    - Measure prompt assembly time
    - Compare token usage across sections
    - _Test File: `test_layered_performance.py`_

- [ ] 30. Create Context Migration Tools
  - [ ] 30.1 Create migration script skeleton
    - Create `scripts/migrate_context_to_layered.py`
    - Implement CLI with argparse (input, output, dry-run, force)
    - Implement backup mechanism (copy original to .bak)
    - Implement validation checks
    - _Requirements: Safe, reversible migrations_

  - [ ] 30.2 Implement content splitting logic
    - Read monolithic context.txt
    - Use regex patterns to identify section boundaries
    - Extract sections to respective layered files
    - _Requirements: Accurate content categorization_

  - [ ] 30.3 Implement AI-assisted splitting (optional)
    - Use Gemini API to help categorize ambiguous sections
    - Provide human-in-the-loop review interface
    - Allow manual adjustment of splits
    - _Requirements: High accuracy splitting_

  - [ ] 30.4 Implement validation
    - Check that no content was lost (diff original vs combined splits)
    - Check that no duplication occurred
    - Check file sizes are reasonable (<1200 chars per file)
    - Generate validation report
    - _Requirements: Zero information loss_

  - [ ] 30.5 Create section guidance generator
    - Analyze historical generated outputs for each section
    - Extract common patterns and quality issues
    - Generate draft guidance files
    - Provide template for manual refinement
    - _Requirements: Accelerate guidance creation_

  - [ ] 30.6 Test migration script
    - Test with UGS context.txt (known good split)
    - Test with Level 2 context.txt
    - Test with edge cases (empty file, malformed content)
    - Test dry-run mode doesn't modify files
    - Test backup and restore functionality
    - _Requirements: Tool reliability_

- [ ] 31. Create Context File Templates & Documentation
  - [ ] 31.1 Create shared context file templates
    - Create templates for domain_context.txt, architecture_context.txt, implementation_context.txt, cybersecurity_context.txt, gantt_context.txt
    - Document target size and content guidelines for each
    - _Requirements: Consistent structure across TS types_

  - [ ] 31.2 Create section guidance template
    - Create `templates/section_guidance.txt.template`
    - Provide structure: Structure, Avoid, Tone, Examples
    - Include best practices
    - Target size: 200-300 chars
    - _Requirements: High-quality guidance_

  - [ ] 31.3 Update BUILDERS_README.md
    - Document layered context architecture
    - Explain routing map configuration
    - Document shared context file purposes
    - Document section guidance file purpose
    - Document migration process
    - _Requirements: Architecture documentation_

  - [ ] 31.4 Create migration guide
    - Document step-by-step migration process
    - When to migrate (new TS type vs existing)
    - How to use migration script
    - How to validate migration
    - How to roll back if needed
    - _Requirements: Clear migration process_

  - [ ] 31.5 Create troubleshooting guide
    - Common issues and solutions
    - How to debug routing problems
    - How to debug file loading errors
    - How to verify context is loaded correctly
    - _Requirements: Support documentation_

  - [ ] 31.6 Update API documentation
    - Document LayeredCategoryContext schema
    - Document new response fields
    - Update example responses
    - _Requirements: API clarity_

- [ ] 32. Migrate Remaining TS Types
  - [ ] 32.1 Migrate Level 2
    - Run migration script on Level 2 context.txt
    - Review and refine split outputs
    - Create section guidance files for key sections
    - Run validation tests
    - _Requirements: Level 2 coverage_

  - [ ] 32.2 Migrate OT Cybersecurity
    - Run migration script
    - Special attention to cybersecurity_context.txt
    - Create section guidance files
    - Run validation tests
    - _Requirements: OT Cybersecurity coverage_

  - [ ] 32.3 Migrate OT Upgrades (HMI)
    - Run migration script on HMI folder
    - Create section guidance files
    - Run validation tests
    - _Requirements: HMI coverage_

  - [ ] 32.4 Migrate OT Upgrades (L2)
    - Run migration script on L2 upgrade folder
    - Create section guidance files
    - Run validation tests
    - _Requirements: L2 upgrade coverage_

  - [ ] 32.5 Migrate OT Upgrades (POC Upgrade)
    - Run migration script
    - Create section guidance files
    - Run validation tests
    - _Requirements: POC upgrade coverage_

  - [ ] 32.6 Migrate Yard Management (HSM)
    - Run migration script on HSM folder
    - Create section guidance files
    - Run validation tests
    - _Requirements: HSM coverage_

  - [ ] 32.7 Migrate Yard Management (Plate Mill)
    - Run migration script
    - Create section guidance files
    - Run validation tests
    - _Requirements: Plate Mill coverage_

  - [ ] 32.8 Migrate Data Analysis (Advanced Analysis)
    - Run migration script
    - Create section guidance files
    - Run validation tests
    - _Requirements: Advanced Analysis coverage_

  - [ ] 32.9 Migrate Data Analysis (Data Monitoring)
    - Run migration script
    - Create section guidance files
    - Run validation tests
    - _Requirements: Data Monitoring coverage_

  - [ ] 32.10 Validate all migrations
    - Run comprehensive test suite across all TS types
    - Compare token usage before/after for each
    - Verify no quality regressions
    - Document findings and metrics
    - _Requirements: Complete migration validation_

- [ ] 33. Remove Legacy Code & Optimize
  - [ ] 33.1 Deprecate old CategoryContext
    - Mark `CategoryContext` as deprecated in docstrings
    - Add deprecation warnings when used
    - Document migration path for any external callers
    - _Requirements: Clear deprecation_

  - [ ] 33.2 Remove legacy load_category_context()
    - Remove `load_category_context()` function after all callers updated
    - Remove related test files
    - Update imports across codebase
    - _Requirements: Code cleanup_

  - [ ] 33.3 Optimize routing map based on usage
    - Analyze production logs for context usage patterns
    - Identify sections with suboptimal context assignments
    - Adjust routing map for better relevance
    - Document changes and rationale
    - _Requirements: Continuous improvement_

  - [ ] 33.4 Implement multi-file caching optimization
    - Optimize cache to store individual context files, not full context objects
    - Allow partial cache hits (some files cached, others fresh)
    - Measure cache hit rate improvement
    - _Requirements: Performance optimization_

  - [ ] 33.5 Performance profiling
    - Profile retrieval performance under load
    - Identify any bottlenecks
    - Optimize file reading (async I/O if needed)
    - Document performance improvements
    - _Requirements: Production readiness_

- [ ] 34. Final Documentation & Deployment
  - [ ] 34.1 Update design.md
    - Add "Layered Context Architecture" section
    - Document architecture decisions
    - Document routing system
    - Document migration strategy
    - _Requirements: Design documentation complete_

  - [ ] 34.2 Update requirements.md (if needed)
    - Add any new requirements from this refactoring
    - Update existing requirements affected by changes
    - _Requirements: Requirements accuracy_

  - [ ] 34.3 Update deployment guide
    - Document new file structure requirements
    - Document migration steps for existing deployments
    - Document rollback procedures
    - Document monitoring recommendations
    - _Requirements: Deployment safety_

  - [ ] 34.4 Create TS type maintainer guide
    - How to create new TS type with layered context
    - How to update existing context files
    - How to add new section guidance files
    - Best practices for context content
    - _Requirements: Maintainer enablement_

  - [ ] 34.5 Create monitoring dashboard
    - Track context loading performance
    - Track cache hit rates
    - Track token usage per section
    - Track fallback usage (legacy context.txt)
    - Alert on high fallback rate
    - _Requirements: Production observability_

  - [ ] 34.6 Final pre-deployment checklist
    - All tests passing (unit, integration, performance)
    - All TS types migrated and validated
    - Documentation complete and reviewed
    - Deployment guide tested
    - Rollback plan documented and tested
    - Stakeholder sign-off obtained
    - _Requirements: Production readiness_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.4", "1.5", "2.1"]
    },
    {
      "id": 1,
      "tasks": ["1.3", "2.2", "2.3"]
    },
    {
      "id": 2,
      "tasks": ["3.1", "4.1"]
    },
    {
      "id": 3,
      "tasks": ["3.2", "3.3", "4.2", "5.1"]
    },
    {
      "id": 4,
      "tasks": ["5.2", "5.3", "5.4", "5.5"]
    },
    {
      "id": 5,
      "tasks": ["6.1", "6.2", "8.1"]
    },
    {
      "id": 6,
      "tasks": ["6.3", "6.4", "8.2", "9.1"]
    },
    {
      "id": 7,
      "tasks": ["9.2", "9.3", "10.1"]
    },
    {
      "id": 8,
      "tasks": ["10.2", "10.3", "10.4", "11.1"]
    },
    {
      "id": 9,
      "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "11.7"]
    },
    {
      "id": 10,
      "tasks": ["11.8", "13.1", "14.1"]
    },
    {
      "id": 11,
      "tasks": ["13.2", "13.3", "14.2", "14.3"]
    },
    {
      "id": 12,
      "tasks": ["14.4", "14.5", "14.6", "14.7", "15.1"]
    },
    {
      "id": 13,
      "tasks": ["15.2", "15.3", "15.4", "16.1"]
    },
    {
      "id": 14,
      "tasks": ["16.2", "16.3", "16.4", "17.1", "17.2"]
    },
    {
      "id": 15,
      "tasks": ["17.3", "17.4", "18.1", "18.2", "18.3", "18.4"]
    },
    {
      "id": 16,
      "tasks": ["19.1", "19.2", "19.3", "19.4", "19.5"]
    },
    {
      "id": 17,
      "tasks": ["21.1", "21.2"]
    },
    {
      "id": 18,
      "tasks": ["21.3", "21.4", "21.5", "22.1", "22.2"]
    },
    {
      "id": 19,
      "tasks": ["22.3", "23.1", "23.2", "23.3"]
    },
    {
      "id": 20,
      "tasks": ["23.4", "23.5", "23.6", "23.7"]
    },
    {
      "id": 21,
      "tasks": ["24.1", "24.2", "24.3", "24.4"]
    },
    {
      "id": 22,
      "tasks": ["24.5", "25.1", "25.2", "25.3", "25.4"]
    },
    {
      "id": 23,
      "tasks": ["26.1", "26.2", "26.3", "26.4", "26.5", "26.6"]
    },
    {
      "id": 24,
      "tasks": ["26.7", "27.1", "27.2", "27.3"]
    },
    {
      "id": 25,
      "tasks": ["27.4", "27.5", "27.6", "27.7", "27.8", "27.9", "27.10"]
    },
    {
      "id": 26,
      "tasks": ["27.11", "28.1", "28.2"]
    },
    {
      "id": 27,
      "tasks": ["28.3", "28.4", "28.5", "28.6", "28.7", "28.8"]
    },
    {
      "id": 28,
      "tasks": ["29.1", "29.2", "29.3", "29.4", "29.5"]
    },
    {
      "id": 29,
      "tasks": ["30.1", "30.2", "30.3"]
    },
    {
      "id": 30,
      "tasks": ["30.4", "30.5", "30.6", "31.1", "31.2"]
    },
    {
      "id": 31,
      "tasks": ["31.3", "31.4", "31.5", "31.6"]
    },
    {
      "id": 32,
      "tasks": ["32.1", "32.2", "32.3", "32.4", "32.5"]
    },
    {
      "id": 33,
      "tasks": ["32.6", "32.7", "32.8", "32.9"]
    },
    {
      "id": 34,
      "tasks": ["32.10"]
    },
    {
      "id": 35,
      "tasks": ["33.1", "33.2", "33.3", "33.4", "33.5"]
    },
    {
      "id": 36,
      "tasks": ["34.1", "34.2", "34.3", "34.4", "34.5", "34.6"]
    }
  ]
}
```

## Notes

- Tasks marked with `*` are testing tasks that may be deferred for MVP builds but are required for production readiness per Requirement 20
- Each task references specific requirements for traceability
- Checkpoints (tasks 7, 12, 20) ensure incremental validation for Phase 1
- Tasks 21-34 implement the Layered Context Architecture refactoring (Phase 2)
- Phase 2 depends on completion of tasks 1-20
- Property tests should validate universal correctness properties from the design
- Unit tests should validate specific examples and edge cases
- The dependency graph ensures tasks execute in the correct order with maximum parallelism
- All backend tasks use Python 3.11 + FastAPI
- All frontend tasks use TypeScript + React 18
- Layered Context Architecture delivers 50%+ token reduction and 90%+ context relevance



