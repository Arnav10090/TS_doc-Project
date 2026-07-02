import xml.etree.ElementTree as ET
from app.ai_suggestions.gantt_converter import convert_gantt_json_to_drawio


def test_basic_conversion():
    tasks = [
        {"task": "Mobilization", "phase": "Preparation", "start_week": 1, "duration_weeks": 2, "milestone": False, "dependencies": []},
        {"task": "Commissioning", "phase": "Execution", "start_week": 3, "duration_weeks": 1, "milestone": True, "dependencies": [0]},
    ]
    xml = convert_gantt_json_to_drawio(tasks)
    assert "<mxGraphModel" in xml

    # Basic XML parse sanity
    root = ET.fromstring(xml)
    assert root is not None

    # Ensure task names appear in XML
    assert "Mobilization" in xml
    assert "Commissioning" in xml


def test_milestone_marker_and_dependency():
    tasks = [
        {"task": "A", "start_week": 2, "duration_weeks": 1, "milestone": True, "dependencies": []},
        {"task": "B", "start_week": 3, "duration_weeks": 2, "milestone": False, "dependencies": [0]},
    ]
    xml = convert_gantt_json_to_drawio(tasks, week_pixel_width=10, left_margin=0)

    # Rhombus marker style should be present for milestone
    assert "shape=rhombus" in xml

    # Dependency edge style or edge id should be present
    assert ("edgeStyle=elbowEdgeStyle" in xml) or ("edge_" in xml)


def test_week_positioning():
    tasks = [
        {"task": "T1", "start_week": 2, "duration_weeks": 1, "milestone": False, "dependencies": []},
        {"task": "T2", "start_week": 4, "duration_weeks": 1, "milestone": False, "dependencies": []},
    ]
    xml = convert_gantt_json_to_drawio(tasks, week_pixel_width=30, left_margin=120)

    # Expect geometry x positions for T1 and T2 according to algorithm
    # T1: left_margin + (2-2)*30 == 120
    # T2: left_margin + (4-2)*30 == 180
    assert 'x="120"' in xml
    assert 'x="180"' in xml
