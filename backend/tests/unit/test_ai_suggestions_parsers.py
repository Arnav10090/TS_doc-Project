import json

from app.ai_suggestions import parsers


def test_parse_rich_text_response_accepts_html():
    html_in = "<p>This is a <strong>test</strong> paragraph.</p>"
    ok, content, raw = parsers.parse_rich_text_response(html_in)
    assert ok is True
    assert content.strip().startswith('<p>')
    assert raw is None


def test_parse_rich_text_response_strips_code_fence():
    fenced = "```html\n<p>Hi</p>\n```"
    ok, content, raw = parsers.parse_rich_text_response(fenced)
    assert ok is True
    assert '<p>Hi</p>' in content


def test_parse_table_response_json_array_and_fill_missing_fields():
    resp = '[{"component": "Frontend", "technology": "React"}]'
    ok, rows, raw = parsers.parse_table_response(resp, expected_row_fields=["sr_no", "component", "technology", "note"])
    assert ok is True
    assert isinstance(rows, list)
    assert rows[0]["sr_no"] == 1
    assert rows[0]["note"] == ""
    assert raw is None


def test_parse_table_response_envelope_rows_key():
    resp = '{"rows": [{"component": "Backend"}]}'
    ok, rows, raw = parsers.parse_table_response(resp, expected_row_fields=["sr_no", "component"])
    assert ok is True
    assert rows[0]["sr_no"] == 1


def test_parse_mixed_field_response_json_object():
    resp = '{"process_summary": "Short summary"}'
    ok, obj, raw = parsers.parse_mixed_field_response(resp, expected_fields=["process_summary", "system_objective"])
    assert ok is True
    assert obj["process_summary"] == "Short summary"
    assert obj["system_objective"] == ""


def test_parse_list_response_array_items():
    resp = '[{"id": 1, "title": "Alpha"}]'
    ok, items, raw = parsers.parse_list_response(resp, expected_item_fields=["id", "title", "brief"])
    assert ok is True
    assert items[0]["brief"] == ""


def test_parse_image_description_response_json_object():
    resp = '{"caption": "Diagram of system", "note": "Use L2 signals"}'
    ok, obj, raw = parsers.parse_image_description_response(resp, expected_fields=["caption", "note"])
    assert ok is True
    assert obj["caption"] == "Diagram of system"
