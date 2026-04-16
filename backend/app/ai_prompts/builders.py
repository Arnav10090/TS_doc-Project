"""
AI prompt generation builders.
Creates prompts for diagram generation using external tools.
"""
from typing import Dict, Any, List


def build_architecture_prompt(project: Any, tech_stack_content: Dict[str, Any]) -> str:
    """
    Build architecture diagram prompt.
    
    Args:
        project: Project model instance
        tech_stack_content: Tech stack section content
    
    Returns:
        Prompt text
    """
    solution_name = project.solution_name or "the system"
    client_name = project.client_name or "the client"
    
    # Extract technology components
    rows = tech_stack_content.get("rows", [])
    tech_list = []
    for row in rows:
        component = row.get("component", "")
        technology = row.get("technology", "")
        if component and technology:
            tech_list.append(f"- {component}: {technology}")
    
    tech_stack_text = "\n".join(tech_list) if tech_list else "- (No technology stack specified)"
    
    prompt = f"""Create a professional system architecture diagram for {solution_name} for {client_name}.

**System Overview:**
- Solution: {solution_name}
- Client: {client_name}

**Technology Stack:**
{tech_stack_text}

**Architecture Requirements:**
1. Show L1/L2/L3 network layers with clear boundaries
2. Include Application Server tier
3. Include Database Server tier
4. Show HMI (Human-Machine Interface) components
5. Include Mobile Device interfaces if applicable
6. Display network boundaries and security zones
7. Show data flow arrows between components
8. Label all major components clearly

**Style Requirements:**
- Clean, professional appearance
- White background
- All components clearly labeled
- Use standard architecture diagram conventions
- Export as PNG at minimum 1920x1080px resolution
- Ensure text is readable at standard zoom levels

Please create a comprehensive architecture diagram following these specifications."""
    
    return prompt


def build_gantt_overall_prompt(project: Any, supervisors_content: Dict[str, Any]) -> str:
    """
    Build overall Gantt chart prompt.
    
    Args:
        project: Project model instance
        supervisors_content: Supervisors section content
    
    Returns:
        Prompt text
    """
    solution_name = project.solution_name or "the project"
    client_name = project.client_name or "the client"
    
    pm_days = supervisors_content.get("pm_days", "TBD")
    dev_days = supervisors_content.get("dev_days", "TBD")
    comm_days = supervisors_content.get("comm_days", "TBD")
    
    prompt = f"""Create a professional project Gantt chart for {solution_name} for {client_name}.

**Project Overview:**
- Solution: {solution_name}
- Client: {client_name}
- PM Days: {pm_days}
- Development Days: {dev_days}
- Commissioning Days: {comm_days}

**Project Phases to Include:**
1. Project Kickoff & Planning
2. Requirements Analysis & Design
3. Development & Implementation
4. Factory Acceptance Testing (FAT)
5. Site Commissioning & Installation
6. User Training
7. Go-Live & Handover

**Gantt Chart Requirements:**
- Show all phases with realistic timelines
- Include dependencies between phases
- Show milestones for key deliverables
- Use the provided day estimates for sizing
- Include buffer time for contingencies

**Style Requirements:**
- Clean, professional appearance
- White background
- Clear phase labels and dates
- Color-coded phases for easy reading
- Export as PNG at minimum 1920x1080px resolution
- Ensure text is readable at standard zoom levels

Please create a comprehensive Gantt chart following these specifications."""
    
    return prompt


def build_gantt_shutdown_prompt(project: Any) -> str:
    """
    Build shutdown/commissioning Gantt chart prompt.
    
    Args:
        project: Project model instance
    
    Returns:
        Prompt text
    """
    solution_name = project.solution_name or "the system"
    client_name = project.client_name or "the client"
    
    prompt = f"""Create a professional 14-day commissioning Gantt chart for {solution_name} for {client_name}.

**Project Overview:**
- Solution: {solution_name}
- Client: {client_name}
- Duration: 14 days (commissioning period)

**Commissioning Activities (14-Day Timeline):**
1. Day 1-2: Site Preparation & Equipment Setup
2. Day 3-4: Hardware Installation & Network Configuration
3. Day 5-6: Software Deployment & Integration
4. Day 7-8: System Testing & Validation
5. Day 9-10: User Training & Documentation
6. Day 11-12: Parallel Run with Existing System
7. Day 13-14: Final Validation & Go-Live

**Gantt Chart Requirements:**
- Show all activities across 14 days
- Include daily breakdown where appropriate
- Show dependencies between activities
- Highlight critical path activities
- Include key milestones (FAT completion, Go-Live)

**Style Requirements:**
- Clean, professional appearance
- White background
- Clear activity labels and day numbers
- Color-coded activities for easy reading
- Export as PNG at minimum 1920x1080px resolution
- Ensure text is readable at standard zoom levels

Please create a detailed 14-day commissioning Gantt chart following these specifications."""
    
    return prompt


def get_recommended_tools(prompt_type: str) -> List[Dict[str, str]]:
    """
    Get recommended tools for a prompt type.
    
    Args:
        prompt_type: Type of prompt (architecture, gantt_overall, gantt_shutdown)
    
    Returns:
        List of tool dictionaries with name, url, and note
    """
    if prompt_type == "architecture":
        return [
            {
                "name": "Eraser.io",
                "url": "https://www.eraser.io/",
                "note": "AI-powered diagram creation with natural language input",
            },
            {
                "name": "Claude.ai",
                "url": "https://claude.ai/",
                "note": "Can generate Mermaid diagram code from prompts",
            },
            {
                "name": "Mermaid Live Editor",
                "url": "https://mermaid.live/",
                "note": "Render Mermaid diagrams and export as PNG",
            },
            {
                "name": "Draw.io",
                "url": "https://app.diagrams.net/",
                "note": "Manual diagram creation with extensive templates",
            },
        ]
    elif prompt_type in ["gantt_overall", "gantt_shutdown"]:
        return [
            {
                "name": "Claude.ai",
                "url": "https://claude.ai/",
                "note": "Can generate Mermaid Gantt chart code from prompts",
            },
            {
                "name": "Mermaid Live Editor",
                "url": "https://mermaid.live/",
                "note": "Render Mermaid Gantt charts and export as PNG",
            },
            {
                "name": "Tom's Planner",
                "url": "https://www.tomsplanner.com/",
                "note": "Online Gantt chart tool with export options",
            },
        ]
    else:
        return []
