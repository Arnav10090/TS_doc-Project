from typing import List, Dict, Optional
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape


def _make_cell(root, cell_id: str, parent: str = None, value: Optional[str] = None, style: Optional[str] = None, vertex: bool = False, edge: bool = False, source: Optional[str] = None, target: Optional[str] = None):
    attrs = {"id": cell_id}
    if parent is not None:
        attrs["parent"] = parent
    if value is not None:
        attrs["value"] = value
    if style is not None:
        attrs["style"] = style
    if vertex:
        attrs["vertex"] = "1"
    if edge:
        attrs["edge"] = "1"
    if source is not None:
        attrs["source"] = source
    if target is not None:
        attrs["target"] = target

    cell = ET.SubElement(root, "mxCell", attrs)
    return cell


def _add_geometry(cell, x: float, y: float, width: float, height: float, as_attr: str = "geometry"):
    geom = ET.SubElement(cell, "mxGeometry", {"x": str(x), "y": str(y), "width": str(width), "height": str(height), "as": as_attr})
    return geom


def convert_gantt_json_to_drawio(tasks: List[Dict], week_pixel_width: int = 30, left_margin: int = 120, top_margin: int = 40, bar_height: int = 20, row_height: int = 40) -> str:
    """Convert list of GanttTask-like dicts to mxGraph XML string.

    The converter expects each task dict to include at least:
    - task (str), start_week (int), duration_weeks (int)
    Optional fields: phase (str), milestone (bool), dependencies (list of int indexes)

    The algorithm computes X positions relative to the minimal start_week across tasks
    unless callers pass already-normalized week numbers.
    """
    # Defensive copy and basic validation
    if not isinstance(tasks, list):
        raise ValueError("tasks must be a list of task dicts")

    # Normalize and validate tasks
    norm_tasks = []
    for idx, t in enumerate(tasks):
        if not isinstance(t, dict):
            raise ValueError(f"Task at index {idx} is not an object")
        try:
            task_name = str(t.get("task", "")).strip()
            start_week = int(t.get("start_week", 0))
            duration_weeks = int(t.get("duration_weeks", 0))
            milestone = bool(t.get("milestone", False))
            phase = t.get("phase")
            deps = t.get("dependencies") or []
            # Accept dependencies as list of ints or strings representing ints
            deps_clean = []
            for d in deps:
                try:
                    deps_clean.append(int(d))
                except Exception:
                    # ignore invalid dependency entries
                    continue

        except Exception as e:
            raise ValueError(f"Invalid task at index {idx}: {e}")

        norm_tasks.append({
            "task": task_name,
            "start_week": start_week,
            "duration_weeks": duration_weeks,
            "milestone": milestone,
            "phase": phase,
            "dependencies": deps_clean,
            "_idx": idx,
        })

    if len(norm_tasks) == 0:
        # Return an empty mxGraphModel wrapper
        return '<mxfile><diagram name="Gantt"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'

    # Determine project_start_week as the minimum start_week across tasks
    project_start_week = min(t["start_week"] for t in norm_tasks)

    # Compute positions
    # Root XML structure: mxfile > diagram > mxGraphModel > root > mxCell...
    mxfile = ET.Element("mxfile")
    diagram = ET.SubElement(mxfile, "diagram", {"name": "Gantt"})
    model = ET.SubElement(diagram, "mxGraphModel")
    root = ET.SubElement(model, "root")

    # Standard root cells
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    # Create one container cell as the page parent
    page_cell = ET.SubElement(root, "mxCell", {"id": "2", "parent": "1", "value": "", "style": "rounded=0;whiteSpace=wrap;html=1;", "vertex": "1"})
    _add_geometry(page_cell, 0, 0, 1200, top_margin + len(norm_tasks) * row_height + 40)

    # Create task bars
    cells_by_index = {}
    for i, t in enumerate(norm_tasks):
        x = left_margin + (t["start_week"] - project_start_week) * week_pixel_width
        y = top_margin + i * row_height
        width = max(t["duration_weeks"] * week_pixel_width, 4) if not t["milestone"] else 8

        cell_id = f"task_{i}"
        # Value uses escaped task name (raw text shown in diagram)
        value = escape(t["task"]) if t["task"] else ""
        style = "rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"

        task_cell = _make_cell(root, cell_id, parent="2", value=value, style=style, vertex=True)
        _add_geometry(task_cell, x, y, width, bar_height)
        cells_by_index[i] = cell_id

        # If milestone, also add a small diamond marker centered on the bar start
        if t["milestone"]:
            marker_id = f"milestone_{i}"
            m_x = x - 4
            m_y = y + (bar_height / 2) - 4
            marker_style = "shape=rhombus;fillColor=#f5d6a0;strokeColor=#b77d3e;"
            marker_cell = _make_cell(root, marker_id, parent="2", value="", style=marker_style, vertex=True)
            _add_geometry(marker_cell, m_x, m_y, 8, 8)

    # Add dependency edges
    edge_idx = 0
    for i, t in enumerate(norm_tasks):
        deps = t.get("dependencies") or []
        for dep in deps:
            if dep is None:
                continue
            if dep < 0 or dep >= len(norm_tasks):
                # ignore out-of-range dependencies
                continue
            source_id = cells_by_index.get(dep)
            target_id = cells_by_index.get(i)
            if not source_id or not target_id:
                continue
            edge_cell_id = f"edge_{edge_idx}"
            edge = _make_cell(root, edge_cell_id, parent="2", style="edgeStyle=elbowEdgeStyle;elbow=horizontal;", edge=True, source=source_id, target=target_id)
            # Provide an empty geometry for the edge
            ET.SubElement(edge, "mxGeometry", {"relative": "1", "as": "geometry"})
            edge_idx += 1

    # Convert XML tree to string
    xml_str = ET.tostring(mxfile, encoding="unicode")
    return xml_str
