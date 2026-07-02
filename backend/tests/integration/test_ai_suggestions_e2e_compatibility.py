import pytest


@pytest.mark.asyncio
async def test_legacy_project_save_and_generate_pipeline_without_ai_ts_type_gate(
    client,
    create_complete_project,
    tmp_path,
    monkeypatch,
):
    project = await create_complete_project(ts_type=None)

    save_response = await client.put(
        f"/api/v1/projects/{project.id}/sections/introduction",
        json={
            "content": {
                "tender_reference": "LEGACY-REF-001",
                "tender_date": "2026-06-22",
            }
        },
    )

    assert save_response.status_code == 200
    assert save_response.json()["content"]["tender_reference"] == "LEGACY-REF-001"

    ai_response = await client.post(
        f"/api/v1/projects/{project.id}/ai-suggestions/introduction",
        json={"draft_content": None},
    )
    assert ai_response.status_code == 400
    assert "TS type" in ai_response.json()["detail"]

    generated_file = tmp_path / "legacy-output.docx"
    generated_file.write_bytes(b"legacy docx bytes")

    def fake_generate_document(project_arg, sections_dict, template_path, upload_dir, version_number):
        assert project_arg.ts_type is None
        assert sections_dict["introduction"]["tender_reference"] == "LEGACY-REF-001"
        return str(generated_file), "legacy-output.docx"

    monkeypatch.setattr("app.generation.router.generate_document", fake_generate_document)

    generate_response = await client.post(f"/api/v1/projects/{project.id}/generate")

    assert generate_response.status_code == 200
    assert generate_response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
