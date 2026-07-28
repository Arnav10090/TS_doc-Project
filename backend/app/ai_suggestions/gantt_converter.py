import xml.etree.ElementTree as ET
from typing import List, Dict

def _make_cell(root, cell_id: str, parent: str = None, value: str = None, style: str = None, vertex: bool = False, edge: bool = False, source: str = None, target: str = None):
    attrs = {"id": cell_id}
    if parent is not None: attrs["parent"] = parent
    if value is not None: attrs["value"] = value
    if style is not None: attrs["style"] = style
    if vertex: attrs["vertex"] = "1"
    if edge: attrs["edge"] = "1"
    if source is not None: attrs["source"] = source
    if target is not None: attrs["target"] = target
    return ET.SubElement(root, "mxCell", attrs)

def _add_geometry(cell, x: float, y: float, width: float, height: float, as_attr: str = "geometry"):
    return ET.SubElement(cell, "mxGeometry", {"x": str(x), "y": str(y), "width": str(width), "height": str(height), "as": as_attr})

def convert_gantt_json_to_drawio(tasks: List[Dict], chart_title: str = "Project Schedule", left_margin: int = 300, bar_height: int = 24, row_height: int = 40) -> str:
    """Convert list of GanttTask-like dicts to mxGraph XML string."""
    norm_tasks = []
    for idx, t in enumerate(tasks):
        task_name = str(t.get("task", "")).strip()
        start_week = int(t.get("start_week", 0))
        duration_weeks = int(t.get("duration_weeks", 0))
        milestone = bool(t.get("milestone", False))
        phase = t.get("phase") or "General"
        
        # Heuristic phase naming
        if phase.lower().startswith("phase ") or phase.lower() == "general":
            lower_task = task_name.lower()
            if "engineer" in lower_task or "design" in lower_task: phase = "Engineering"
            elif "softw" in lower_task or "dev" in lower_task: phase = "Software Development"
            elif "hardw" in lower_task or "cabinet" in lower_task or "panel" in lower_task: phase = "Hardware Development"
            elif "test" in lower_task or "fat" in lower_task or "sat" in lower_task or "qms" in lower_task: phase = "Testing"
            elif "dispatch" in lower_task or "deliver" in lower_task or "ship" in lower_task or "logistic" in lower_task: phase = "Dispatch & Logistics"
            elif "site" in lower_task or "install" in lower_task: phase = "Site Activities"
            elif "comm" in lower_task: phase = "Commissioning"

        deps_clean = [int(d) for d in t.get("dependencies") or []]
        norm_tasks.append({
            "task": task_name,
            "start_week": start_week,
            "duration_weeks": duration_weeks,
            "milestone": milestone,
            "phase": phase,
            "dependencies": deps_clean,
            "_idx": idx,
        })

    phases = []
    for t in norm_tasks:
        if t["phase"] not in phases: phases.append(t["phase"])
            
    ordered_tasks = []
    task_idx_map = {} 
    
    new_idx = 0
    for phase in phases:
        for t in norm_tasks:
            if t["phase"] == phase:
                task_idx_map[t["_idx"]] = new_idx
                t["new_idx"] = new_idx
                ordered_tasks.append(t)
                new_idx += 1
                
    for t in ordered_tasks:
        t["dependencies"] = [task_idx_map[d] for d in t["dependencies"] if d in task_idx_map]

    project_start_week = min((t["start_week"] for t in ordered_tasks), default=0)
    max_week = max((t["start_week"] + t["duration_weeks"] for t in ordered_tasks), default=0)
    total_weeks = max(max_week - project_start_week, 1)

    if total_weeks <= 20:
        week_pixel_width = 40
        timeline_mode = "weeks"
    elif total_weeks <= 52:
        week_pixel_width = 20
        timeline_mode = "months_weeks"
    else:
        week_pixel_width = 10
        timeline_mode = "months"
        
    header_rows = 2 if timeline_mode == "months_weeks" else 1
    top_margin = 50 + header_rows * row_height
    
    num_rows = len(phases) + len(ordered_tasks)
    canvas_height = top_margin + num_rows * row_height + 40
    canvas_width = left_margin + total_weeks * week_pixel_width + 40

    mxfile = ET.Element("mxfile", {"host": "app.diagrams.net"})
    diagram = ET.SubElement(mxfile, "diagram", {"name": "Gantt"})
    model = ET.SubElement(diagram, "mxGraphModel", {
        "dx": "1400", "dy": "800", "grid": "1", "gridSize": "10", 
        "guides": "1", "tooltips": "1", "connect": "1", "arrows": "1"
    })
    root = ET.SubElement(model, "root")

    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    page_cell = ET.SubElement(root, "mxCell", {"id": "2", "parent": "1", "value": "", "style": "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fillColor=none;", "vertex": "1"})
    _add_geometry(page_cell, 0, 0, canvas_width, canvas_height)

    title_cell = _make_cell(root, "title", parent="2", value=chart_title, style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=24;fontStyle=1;", vertex=True)
    _add_geometry(title_cell, left_margin / 2, 10, canvas_width - left_margin, 40)

    header_y_bottom = top_margin - row_height
    header_y_top = top_margin - 2 * row_height
    
    if timeline_mode == "weeks":
        for w in range(total_weeks + 1):
            x = left_margin + w * week_pixel_width
            week_cell = _make_cell(root, f"week_header_{w}", parent="2", value=f"W{w+1}", style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=12;fontStyle=1;fontColor=#666666;", vertex=True)
            _add_geometry(week_cell, x - week_pixel_width/2, header_y_bottom, week_pixel_width, row_height)
            if w > 0:
                grid_style = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#E0E0E0;strokeWidth=1;dashed=1;endArrow=none;endFill=0;"
                grid_edge = _make_cell(root, f"grid_{w}", parent="2", style=grid_style, edge=True)
                geom = ET.SubElement(grid_edge, "mxGeometry", {"relative": "1", "as": "geometry"})
                ET.SubElement(geom, "mxPoint", {"x": str(x), "y": str(header_y_bottom + row_height), "as": "sourcePoint"})
                ET.SubElement(geom, "mxPoint", {"x": str(x), "y": str(canvas_height - 20), "as": "targetPoint"})

    elif timeline_mode == "months_weeks":
        num_months = (total_weeks + 3) // 4
        for m in range(num_months):
            m_x = left_margin + m * 4 * week_pixel_width
            m_width = min(4, total_weeks - m * 4) * week_pixel_width
            month_cell = _make_cell(root, f"month_header_{m}", parent="2", value=f"Month {m+1}", style="text;html=1;strokeColor=#D0D0D0;fillColor=#F8F9FA;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=12;fontStyle=1;fontColor=#333333;", vertex=True)
            _add_geometry(month_cell, m_x, header_y_top, m_width, row_height)
            
        for w in range(total_weeks + 1):
            x = left_margin + w * week_pixel_width
            if w < total_weeks:
                week_cell = _make_cell(root, f"week_header_{w}", parent="2", value=f"W{w+1}", style="text;html=1;strokeColor=#E0E0E0;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=10;fontColor=#666666;", vertex=True)
                _add_geometry(week_cell, x, header_y_bottom, week_pixel_width, row_height)
                
            if w > 0:
                grid_style = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#E0E0E0;strokeWidth=1;dashed=1;endArrow=none;endFill=0;"
                grid_edge = _make_cell(root, f"grid_{w}", parent="2", style=grid_style, edge=True)
                geom = ET.SubElement(grid_edge, "mxGeometry", {"relative": "1", "as": "geometry"})
                ET.SubElement(geom, "mxPoint", {"x": str(x), "y": str(header_y_bottom + row_height), "as": "sourcePoint"})
                ET.SubElement(geom, "mxPoint", {"x": str(x), "y": str(canvas_height - 20), "as": "targetPoint"})
    else: 
        num_months = (total_weeks + 3) // 4
        for m in range(num_months):
            m_x = left_margin + m * 4 * week_pixel_width
            m_width = min(4, total_weeks - m * 4) * week_pixel_width
            month_cell = _make_cell(root, f"month_header_{m}", parent="2", value=f"Month {m+1}", style="text;html=1;strokeColor=#D0D0D0;fillColor=#F8F9FA;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=12;fontStyle=1;fontColor=#333333;", vertex=True)
            _add_geometry(month_cell, m_x, header_y_bottom, m_width, row_height)
            
            if m > 0:
                grid_style = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#E0E0E0;strokeWidth=1;dashed=1;endArrow=none;endFill=0;"
                grid_edge = _make_cell(root, f"grid_m_{m}", parent="2", style=grid_style, edge=True)
                geom = ET.SubElement(grid_edge, "mxGeometry", {"relative": "1", "as": "geometry"})
                ET.SubElement(geom, "mxPoint", {"x": str(m_x), "y": str(header_y_bottom + row_height), "as": "sourcePoint"})
                ET.SubElement(geom, "mxPoint", {"x": str(m_x), "y": str(canvas_height - 20), "as": "targetPoint"})

    task_header = _make_cell(root, "task_header", parent="2", value="Task Name", style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=13;fontStyle=1;fontColor=#333333;spacingLeft=10;", vertex=True)
    _add_geometry(task_header, 0, header_y_bottom, left_margin - 10, row_height)

    cells_by_index = {}
    current_row = 0
    
    blue_bar = "rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;arcSize=20;"
    milestone_diamond = "shape=rhombus;fillColor=#f5d6a0;strokeColor=#b77d3e;perimeter=rhombusPerimeter;"
    phase_header_style = "rounded=0;fillColor=#E8E8E8;strokeColor=#C0C0C0;fontColor=#333333;fontStyle=1;align=left;spacingLeft=10;fontSize=13;"
    task_name_style = "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;spacingLeft=20;fontSize=12;fontColor=#333333;"

    for phase in phases:
        y = top_margin + current_row * row_height
        p_cell = _make_cell(root, f"phase_{phase}", parent="2", value=phase, style=phase_header_style, vertex=True)
        _add_geometry(p_cell, 0, y, canvas_width - 20, row_height)
        current_row += 1
        
        phase_tasks = [t for t in ordered_tasks if t["phase"] == phase]
        for t in phase_tasks:
            i = t["new_idx"]
            y = top_margin + current_row * row_height
            
            task_name_cell = _make_cell(root, f"task_name_{i}", parent="2", value=t["task"], style=task_name_style, vertex=True)
            _add_geometry(task_name_cell, 0, y, left_margin - 10, row_height)
            
            div_style = "edgeStyle=none;rounded=0;html=1;strokeColor=#F0F0F0;strokeWidth=1;endArrow=none;endFill=0;"
            div_edge = _make_cell(root, f"div_{i}", parent="2", style=div_style, edge=True)
            geom = ET.SubElement(div_edge, "mxGeometry", {"relative": "1", "as": "geometry"})
            ET.SubElement(geom, "mxPoint", {"x": "0", "y": str(y + row_height), "as": "sourcePoint"})
            ET.SubElement(geom, "mxPoint", {"x": str(canvas_width - 20), "y": str(y + row_height), "as": "targetPoint"})

            x = left_margin + (t["start_week"] - project_start_week) * week_pixel_width
            
            if t["milestone"] or t["duration_weeks"] == 0:
                width = 16
                m_x = x - (width / 2)
                m_y = y + (row_height / 2) - (width / 2)
                cell_id = f"task_{i}"
                task_cell = _make_cell(root, cell_id, parent="2", value="", style=milestone_diamond, vertex=True)
                _add_geometry(task_cell, m_x, m_y, width, width)
                
                label_id = f"ms_label_{i}"
                label_style = "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=nowrap;fontSize=10;fontColor=#666666;fontStyle=2;"
                label_cell = _make_cell(root, label_id, parent="2", value=f"W{t['start_week'] - project_start_week + 1}", style=label_style, vertex=True)
                _add_geometry(label_cell, m_x + width + 4, m_y, 40, width)
            else:
                width = max(t["duration_weeks"] * week_pixel_width, 10)
                b_y = y + (row_height - bar_height) / 2
                cell_id = f"task_{i}"
                
                # Inline label if space allows (approx 7px per char + 10px padding)
                char_width_req = len(t["task"]) * 7 + 10
                inline_val = t["task"] if width > char_width_req else ""
                
                task_cell = _make_cell(root, cell_id, parent="2", value=inline_val, style=blue_bar, vertex=True)
                _add_geometry(task_cell, x, b_y, width, bar_height)
            
            cells_by_index[i] = cell_id
            current_row += 1

    # 11. Prepare and Render Dependencies (Edges)
    edges_to_draw = set()
    for t in ordered_tasks:
        for dep in t["dependencies"]:
            if dep == t["new_idx"]:
                continue  # Prevent self-loops
                
            source_task = next((st for st in ordered_tasks if st["new_idx"] == dep), None)
            if not source_task: 
                continue
                
            s_idx = dep
            t_idx = t["new_idx"]
            
            # Force forward-in-time relationship
            if source_task["start_week"] > t["start_week"]:
                s_idx, t_idx = t_idx, s_idx
                
            edges_to_draw.add((s_idx, t_idx))

    edge_idx = 0
    # Thinner line, lighter color
    edge_style = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#999999;strokeWidth=1;endArrow=block;endFill=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
    for s_idx, t_idx in edges_to_draw:
        source_id = cells_by_index.get(s_idx)
        target_id = cells_by_index.get(t_idx)
        if not source_id or not target_id: 
            continue
            
        edge_cell_id = f"edge_{edge_idx}"
        edge = _make_cell(root, edge_cell_id, parent="2", style=edge_style, edge=True, source=source_id, target=target_id)
        ET.SubElement(edge, "mxGeometry", {"relative": "1", "as": "geometry"})
        edge_idx += 1

    return ET.tostring(mxfile, encoding="unicode")
