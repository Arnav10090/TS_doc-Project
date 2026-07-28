import pytest

from app.ai_suggestions import service


def test_extract_system_config_drawio_xml_preserves_mxfile():
    xml = '<mxfile host="app.diagrams.net"><diagram name="System Config"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'

    assert service._extract_system_config_drawio_xml(xml) == xml


def test_extract_system_config_drawio_xml_wraps_raw_mxgraphmodel():
    raw_model = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>'

    extracted = service._extract_system_config_drawio_xml(raw_model)

    assert extracted.startswith('<mxfile host="app.diagrams.net">')
    assert '<diagram name="System Config">' in extracted
    assert raw_model in extracted


def test_validate_system_config_drawio_xml_accepts_valid_document():
    xml = """
    <mxfile host="app.diagrams.net">
      <diagram name="System Config">
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="2" value="Application Server" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
              <mxGeometry x="40" y="40" width="180" height="60" as="geometry"/>
            </mxCell>
            <mxCell id="3" edge="1" parent="1" source="2" target="2" style="endArrow=block;html=1;">
              <mxGeometry relative="1" as="geometry"/>
            </mxCell>
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>
    """.strip()

    assert service._validate_system_config_drawio_xml(xml) == xml


def test_validate_system_config_drawio_xml_rejects_duplicate_attributes():
    invalid_xml = """
    <mxfile host="app.diagrams.net">
      <diagram name="System Config">
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="2" id="3" edge="1" parent="1" source="1" target="1">
              <mxGeometry relative="1" as="geometry"/>
            </mxCell>
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>
    """.strip()

    with pytest.raises(ValueError, match="Malformed XML"):
        service._validate_system_config_drawio_xml(invalid_xml)


def test_validate_system_config_drawio_xml_fixes_missing_geometry():
    invalid_xml = """
    <mxfile host="app.diagrams.net">
      <diagram name="System Config">
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="2" value="Application Server" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"/>
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>
    """.strip()

    fixed_xml = service._validate_system_config_drawio_xml(invalid_xml)
    assert '<mxGeometry ' in fixed_xml
    assert 'x="40"' in fixed_xml
    assert 'y="40"' in fixed_xml
