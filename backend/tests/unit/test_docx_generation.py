import os
from pathlib import Path

import pytest

from app.generation import docx_generator


def test_generate_document_writes_saved_content(tmp_path, monkeypatch):
    """Ensure that saved section content is rendered into the generated document."""
    # Create a simple dummy project
    DummyProject = type("DummyProject", (), {})
    project = DummyProject()
    project.id = 123
    project.client_name = "ClientCo"
    project.solution_name = "SolutionX"

    # A minimal sections map containing the field we will assert appears
    all_sections = {
        "introduction": {
            "tender_reference": "AI_CONTENT_TEST",
            "tender_date": "2026-06-19",
        }
    }

    # Use tmp_path as upload_dir
    upload_dir = str(tmp_path)

    # Patch heavy dependencies in docx_generator to simple fakes so this unit test
    # doesn't require the real template or docxtpl behavior.
    class FakeDocxTemplate:
        def __init__(self, template_path):
            self.template_path = template_path
            self._context = None

        def render(self, context):
            self._context = context

        def save(self, out_path):
            # Write a tiny file containing the intro tender_reference so we can assert
            content = self._context.get("introduction", {}).get("tender_reference", "")
            Path(out_path).write_bytes(content.encode("utf-8"))

    # Replace DocxTemplate and other helpers on the module with no-ops or fakes
    monkeypatch.setattr(docx_generator, "DocxTemplate", FakeDocxTemplate)
    monkeypatch.setattr(docx_generator, "build_context", lambda p, s, u: {**s})
    monkeypatch.setattr(docx_generator, "finalize_context_with_images", lambda ctx, tpl: ctx)
    monkeypatch.setattr(docx_generator, "apply_document_references", lambda fp, s, u, pid: None)

    # Call generate_document
    file_path, filename = docx_generator.generate_document(
        project, all_sections, template_path="unused.docx", upload_dir=upload_dir, version_number=1
    )

    # Assert file was created and contains the AI-saved content
    assert os.path.exists(file_path)
    data = Path(file_path).read_bytes().decode("utf-8")
    assert "AI_CONTENT_TEST" in data
