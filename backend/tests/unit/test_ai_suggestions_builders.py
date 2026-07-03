"""
Unit tests for AI suggestions prompt builders.

Tests the 7-layer knowledge hierarchy implementation:
1. Project metadata (never truncated)
2. Existing saved section content (truncate as needed)
3. Current draft content (truncate before saved sections)
4. Context.txt (truncate at 2000 chars)
5. Historical documents (max 5 docs, 1500 chars each, 6000 total)
6. PROJECT_CONTEXT.md (embedded at build time)
7. LLM general knowledge (implicit)

Requirements: 5.1-5.8, 7.7-7.10, 18.1-18.6
"""

import pytest
from unittest.mock import Mock
from app.ai_suggestions.builders import (
    build_section_prompt,
    build_custom_section_prompt,
    _sanitize_text,
    _format_project_metadata,
    _format_section_identity,
    _format_saved_sections,
    _format_draft_content,
    _format_context_txt,
    _format_historical_documents,
    _format_project_context_md,
    _format_output_instructions,
    PROJECT_CONTEXT_MD_EMBEDDED,
    PROMPT_SOFT_TOKEN_BUDGET,
    estimate_prompt_tokens,
)
from app.ai_suggestions.retrieval import CategoryContext, HistoricalDoc


class TestSanitizeText:
    """Test text sanitization for user-supplied metadata (Requirements 7.8, 7.9, 14.3, 14.4)."""
    
    def test_sanitize_html_tags(self):
        """Should strip HTML tags from input."""
        text = "<script>alert('xss')</script>Hello <b>World</b>"
        result = _sanitize_text(text)
        assert "<" not in result
        assert ">" not in result
        assert "Hello World" in result
    
    def test_sanitize_truncate_to_500(self):
        """Should truncate text to 500 characters by default."""
        text = "A" * 1000
        result = _sanitize_text(text)
        assert len(result) == 500
    
    def test_sanitize_custom_max_length(self):
        """Should respect custom max_length parameter."""
        text = "A" * 1000
        result = _sanitize_text(text, max_length=100)
        assert len(result) == 100
    
    def test_sanitize_normalize_whitespace(self):
        """Should normalize multiple spaces to single space."""
        text = "Hello    \n\n   World   \t  Test"
        result = _sanitize_text(text)
        assert result == "Hello World Test"
    
    def test_sanitize_empty_string(self):
        """Should handle empty string."""
        result = _sanitize_text("")
        assert result == ""
    
    def test_sanitize_none(self):
        """Should handle None input."""
        result = _sanitize_text(None)
        assert result == ""


class TestFormatProjectMetadata:
    """Test project metadata formatting (Layer 1 - never truncated)."""
    
    def test_format_project_metadata_complete(self):
        """Should format all project fields."""
        project = Mock()
        project.solution_name = "Test Solution"
        project.solution_full_name = "Test Solution Full Name"
        project.client_name = "Test Client"
        project.client_location = "Mumbai"
        project.ts_type = "Level 2"
        project.doc_date = "2024-01-15"
        
        result = _format_project_metadata(project)
        
        assert "## 1. Project Metadata" in result
        assert "Test Solution" in result
        assert "Test Client" in result
        assert "Mumbai" in result
        assert "Level 2" in result
        assert "2024-01-15" in result
    
    def test_format_project_metadata_sanitizes_html(self):
        """Should sanitize HTML in project fields."""
        project = Mock()
        project.solution_name = "<script>alert()</script>SafeName"
        project.solution_full_name = "Full Name"
        project.client_name = "Client"
        project.client_location = "Location"
        project.ts_type = "Type"
        project.doc_date = "Date"
        
        result = _format_project_metadata(project)
        
        assert "<script>" not in result
        assert "SafeName" in result


class TestFormatSectionIdentity:
    """Test section identity formatting (Layer 2 - never truncated)."""
    
    def test_format_section_identity_predefined(self):
        """Should format section identity for predefined sections."""
        result = _format_section_identity("tech_stack")
        
        assert "## 2. Section Identity" in result
        assert "tech_stack" in result
        assert "Tech Stack" in result
        assert "Technology stack" in result
    
    def test_format_section_identity_custom(self):
        """Should format section identity for custom sections."""
        result = _format_section_identity("custom_section_123_abc")
        
        assert "## 2. Section Identity" in result
        assert "custom_section_123_abc" in result


class TestFormatSavedSections:
    """Test saved sections formatting (Layer 3 - truncate as needed)."""
    
    def test_format_saved_sections_empty(self):
        """Should handle empty saved sections."""
        result = _format_saved_sections({})
        
        assert "## 3. Existing Saved Section Content" in result
        assert "No saved sections yet" in result
    
    def test_format_saved_sections_with_content(self):
        """Should format saved sections as JSON."""
        sections = {
            "tech_stack": {"rows": [{"component": "Frontend", "technology": "React"}]},
            "overview": {"process_summary": "Test summary"}
        }
        
        result = _format_saved_sections(sections)
        
        assert "## 3. Existing Saved Section Content" in result
        assert "tech_stack" in result
        assert "Frontend" in result
        assert "React" in result
    
    def test_format_saved_sections_truncates_large_content(self):
        """Should truncate if content exceeds max_chars."""
        large_sections = {f"section_{i}": {"data": "A" * 1000} for i in range(20)}
        
        result = _format_saved_sections(large_sections, max_chars=500)
        
        assert len(result) <= 600  # Some overhead for formatting
        assert "[truncated]" in result


class TestFormatDraftContent:
    """Test draft content formatting (Layer 4 - truncate before saved sections)."""
    
    def test_format_draft_content_none(self):
        """Should handle None draft content."""
        result = _format_draft_content(None)
        
        assert "## 4. Current Draft Content" in result
        assert "No draft changes" in result
    
    def test_format_draft_content_with_changes(self):
        """Should format draft changes as JSON."""
        draft = {"paragraphs": ["Draft text here"], "edited": True}
        
        result = _format_draft_content(draft)
        
        assert "## 4. Current Draft Content" in result
        assert "Draft text here" in result
        assert "edited" in result
    
    def test_format_draft_content_truncates(self):
        """Should truncate large draft content."""
        draft = {"data": "A" * 10000}
        
        result = _format_draft_content(draft, max_chars=500)
        
        assert len(result) <= 600
        assert "[truncated]" in result


class TestFormatContextTxt:
    """Test context.txt formatting (Layer 5 - truncate at 2000 chars)."""
    
    def test_format_context_txt_none(self):
        """Should handle missing context.txt."""
        result = _format_context_txt(None)
        
        assert "## 5. Category Context" in result
        assert "No context.txt available" in result
    
    def test_format_context_txt_short(self):
        """Should include full context.txt if under 2000 chars."""
        context = "This is category-specific context for Level 2 systems."
        
        result = _format_context_txt(context)
        
        assert "## 5. Category Context" in result
        assert "Level 2 systems" in result
    
    def test_format_context_txt_truncates_at_2000(self):
        """Should truncate context.txt at exactly 2000 chars (Requirement 5.5)."""
        context = "A" * 5000
        
        result = _format_context_txt(context)
        
        # Check that content is truncated (accounting for header and truncation message)
        assert "[truncated at 2000 chars]" in result
        # The content portion should not exceed 2000 chars
        content_part = result.split("## 5. Category Context (context.txt)\n")[1]
        assert len(content_part) <= 2050  # 2000 + truncation message


class TestFormatHistoricalDocuments:
    """Test historical documents formatting (Layer 6 - max 5 docs, 1500 each, 6000 total)."""
    
    def test_format_historical_documents_empty(self):
        """Should handle no historical documents."""
        result = _format_historical_documents([])
        
        assert "## 6. Historical TS Document Excerpts" in result
        assert "No historical documents available" in result
    
    def test_format_historical_documents_single(self):
        """Should format single historical document."""
        docs = [
            HistoricalDoc(
                filename="doc1.txt",
                file_path="Level 2/doc1.txt",
                content="Historical content about Level 2 systems."
            )
        ]
        
        result = _format_historical_documents(docs)
        
        assert "## 6. Historical TS Document Excerpts" in result
        assert "doc1.txt" in result
        assert "Level 2/doc1.txt" in result
        assert "Historical content" in result
    
    def test_format_historical_documents_respects_max_5(self):
        """Should include at most 5 documents (Requirement 5.7)."""
        docs = [
            HistoricalDoc(
                filename=f"doc{i}.txt",
                file_path=f"path/doc{i}.txt",
                content=f"Content {i}"
            )
            for i in range(10)
        ]
        
        result = _format_historical_documents(docs, max_docs=5)
        
        # Check that only first 5 are included
        assert "doc0.txt" in result
        assert "doc4.txt" in result
        assert "doc5.txt" not in result
    
    def test_format_historical_documents_truncates_each_at_1500(self):
        """Should truncate each document at 1500 chars (Requirement 5.6)."""
        docs = [
            HistoricalDoc(
                filename="large_doc.txt",
                file_path="path/large_doc.txt",
                content="A" * 5000
            )
        ]
        
        result = _format_historical_documents(docs)
        
        assert "[truncated at 1500 chars]" in result
    
    def test_format_historical_documents_respects_6000_total(self):
        """Should not exceed 6000 total chars for all docs (Requirement 5.8)."""
        # Create 5 docs with 2000 chars each (would be 10000 total)
        docs = [
            HistoricalDoc(
                filename=f"doc{i}.txt",
                file_path=f"path/doc{i}.txt",
                content="B" * 2000
            )
            for i in range(5)
        ]
        
        result = _format_historical_documents(docs, max_docs=5, max_total_chars=6000)
        
        # Extract just the document content portion
        content_start = result.find("### doc0.txt")
        if content_start != -1:
            docs_content = result[content_start:]
            # Should be under 6000 + overhead for formatting
            assert len(docs_content) <= 6500


class TestFormatProjectContextMd:
    """Test PROJECT_CONTEXT.md embedding (Layer 7 - embedded at build time)."""
    
    def test_format_project_context_md_embedded(self):
        """Should include embedded PROJECT_CONTEXT.md (Requirements 18.1-18.6)."""
        result = _format_project_context_md()
        
        assert "## 7. System Knowledge" in result
        assert "embedded at build time" in result
        assert "PROJECT_CONTEXT" in result
    
    def test_project_context_md_constant_populated(self):
        """Should have PROJECT_CONTEXT.md embedded as a constant."""
        assert PROJECT_CONTEXT_MD_EMBEDDED is not None
        assert len(PROJECT_CONTEXT_MD_EMBEDDED) > 0
        assert "TS Document Generator" in PROJECT_CONTEXT_MD_EMBEDDED


class TestFormatOutputInstructions:
    """Test output format instructions (never truncated)."""
    
    def test_format_output_instructions_family_a(self):
        """Should provide HTML instructions for Family A (Rich Text)."""
        result = _format_output_instructions("executive_summary")
        
        assert "## 8. Output Format" in result
        assert "HTML" in result
        assert "<p>" in result
    
    def test_format_output_instructions_family_b(self):
        """Should provide JSON array instructions for Family B (Tabular)."""
        result = _format_output_instructions("tech_stack")
        
        assert "## 8. Output Format" in result
        assert "JSON array" in result
        assert "row objects" in result
        assert "sr_no" in result
    
    def test_format_output_instructions_family_c(self):
        """Should provide JSON object instructions for Family C (Mixed-Field)."""
        result = _format_output_instructions("overview")
        
        assert "## 8. Output Format" in result
        assert "JSON object" in result
        assert "process_summary" in result
    
    def test_format_output_instructions_family_d(self):
        """Should provide JSON array + item-field instructions for Family D (List-Based)."""
        result = _format_output_instructions("features")
        
        assert "## 8. Output Format" in result
        assert "JSON array" in result
        assert "Item fields" in result
        assert "title" in result
        assert "brief" in result
        assert "description" in result
    
    def test_format_output_instructions_unknown_section(self):
        """Should provide generic instruction for unknown sections."""
        result = _format_output_instructions("unknown_section")
        
        assert "## 8. Output Format" in result
        assert "JSON object" in result


class TestBuildSectionPrompt:
    """Test complete section prompt building with 7-layer hierarchy."""
    
    def test_build_section_prompt_complete(self):
        """Should build complete prompt with all 7 layers."""
        project = Mock()
        project.solution_name = "Test Solution"
        project.solution_full_name = "Full Name"
        project.client_name = "Client"
        project.client_location = "Location"
        project.ts_type = "Level 2"
        project.doc_date = "2024-01-15"
        
        all_sections = {"overview": {"process_summary": "Test"}}
        draft_content = {"paragraphs": ["Draft text"]}
        
        category_context = CategoryContext(
            context_txt="Category-specific context",
            historical_documents=[
                HistoricalDoc(
                    filename="doc1.txt",
                    file_path="Level 2/doc1.txt",
                    content="Historical content"
                )
            ],
            folder_path="/app/ts_documents/Level 2",
            historical_context_available=True
        )
        
        result = build_section_prompt(
            section_key="tech_stack",
            project=project,
            all_sections=all_sections,
            draft_content=draft_content,
            category_context=category_context,
            project_context_md=""  # Not used - embedded instead
        )
        
        # Verify all 7 layers are present
        assert "## 1. Project Metadata" in result
        assert "## 2. Section Identity" in result
        assert "## 3. Existing Saved Section Content" in result
        assert "## 4. Current Draft Content" in result
        assert "## 5. Category Context" in result
        assert "## 6. Historical TS Document Excerpts" in result
        assert "## 7. System Knowledge" in result
        assert "## 8. Output Format" in result
        
        # Verify key content
        assert "Test Solution" in result
        assert "tech_stack" in result
        assert "Category-specific context" in result
        assert "Historical content" in result
        assert "PROJECT_CONTEXT" in result
    
    def test_build_section_prompt_rejects_suppressed(self):
        """Should raise ValueError for suppressed sections."""
        project = Mock()
        project.solution_name = "Test"
        project.solution_full_name = "Test"
        project.client_name = "Client"
        project.client_location = "Location"
        project.ts_type = "Level 2"
        project.doc_date = "2024-01-15"
        
        category_context = CategoryContext(
            context_txt=None,
            historical_documents=[],
            folder_path="/app/ts_documents",
            historical_context_available=False
        )
        
        with pytest.raises(ValueError, match="not available for section"):
            build_section_prompt(
                section_key="cover",  # Suppressed section
                project=project,
                all_sections={},
                draft_content=None,
                category_context=category_context,
                project_context_md=""
            )


class TestBuildCustomSectionPrompt:
    """Test custom section subsection prompt building."""
    
    def test_build_custom_section_prompt_paragraph(self):
        """Should build prompt for paragraph subsection."""
        project = Mock()
        project.solution_name = "Test Solution"
        project.solution_full_name = "Full Name"
        project.client_name = "Client"
        project.client_location = "Location"
        project.ts_type = "Level 2"
        project.doc_date = "2024-01-15"
        
        category_context = CategoryContext(
            context_txt="Context",
            historical_documents=[],
            folder_path="/app/ts_documents",
            historical_context_available=True
        )
        
        result = build_custom_section_prompt(
            custom_section_title="Custom Requirements",
            subsection_name="Special Requirements",
            subsection_type="paragraph",
            project=project,
            all_sections={},
            draft_content=None,
            category_context=category_context
        )
        
        assert "Custom Requirements" in result
        assert "Special Requirements" in result
        assert "paragraph" in result
        assert "HTML" in result
        assert "<p>" in result
    
    def test_build_custom_section_prompt_table(self):
        """Should build prompt for table subsection."""
        project = Mock()
        project.solution_name = "Test"
        project.solution_full_name = "Test"
        project.client_name = "Client"
        project.client_location = "Location"
        project.ts_type = "Type"
        project.doc_date = "Date"
        
        category_context = CategoryContext(
            context_txt=None,
            historical_documents=[],
            folder_path="/app",
            historical_context_available=False
        )
        
        result = build_custom_section_prompt(
            custom_section_title="Custom Table Section",
            subsection_name="Requirements Table",
            subsection_type="table",
            project=project,
            all_sections={},
            draft_content=None,
            category_context=category_context
        )
        
        assert "table" in result
        assert "columns" in result
        assert "rows" in result
    
    def test_build_custom_section_prompt_image(self):
        """Should build prompt for image subsection."""
        project = Mock()
        project.solution_name = "Test"
        project.solution_full_name = "Test"
        project.client_name = "Client"
        project.client_location = "Location"
        project.ts_type = "Type"
        project.doc_date = "Date"
        
        category_context = CategoryContext(
            context_txt=None,
            historical_documents=[],
            folder_path="/app",
            historical_context_available=False
        )
        
        result = build_custom_section_prompt(
            custom_section_title="Architecture",
            subsection_name="Diagram Description",
            subsection_type="image",
            project=project,
            all_sections={},
            draft_content=None,
            category_context=category_context
        )
        
        assert "image" in result
        assert "caption" in result
        assert "note" in result


def test_build_section_prompt_enforces_8000_token_soft_budget():
    project = Mock()
    project.solution_name = "Budget Test"
    project.solution_full_name = "Budget Test Full"
    project.client_name = "Client"
    project.client_location = "Location"
    project.ts_type = "Level 2"
    project.doc_date = "2026-06-22"

    all_sections = {f"section_{i}": {"data": "saved " * 1000} for i in range(20)}
    draft_content = {"notes": "draft " * 3000}
    category_context = CategoryContext(
        context_txt="context " * 1000,
        historical_documents=[
            HistoricalDoc(filename=f"doc{i}.txt", file_path=f"Level 2/doc{i}.txt", content="history " * 1000)
            for i in range(5)
        ],
        folder_path="/app/ts_documents/Level 2",
        historical_context_available=True,
    )

    prompt = build_section_prompt(
        section_key="tech_stack",
        project=project,
        all_sections=all_sections,
        draft_content=draft_content,
        category_context=category_context,
        project_context_md="",
    )

    assert estimate_prompt_tokens(prompt) <= PROMPT_SOFT_TOKEN_BUDGET
    assert "## 1. Project Metadata" in prompt
    assert "## 2. Section Identity" in prompt
    assert "## 8. Output Format" in prompt

