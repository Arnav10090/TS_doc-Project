"""
Demo script to show the prompt builder in action.

This demonstrates the 7-layer knowledge hierarchy:
1. Project metadata
2. Section identity
3. Existing saved sections
4. Current draft content
5. Category context.txt
6. Historical documents
7. PROJECT_CONTEXT.md (embedded)
"""

from unittest.mock import Mock
from app.ai_suggestions.builders import build_section_prompt
from app.ai_suggestions.retrieval import CategoryContext, HistoricalDoc


def demo_prompt_builder():
    """Generate a sample prompt to demonstrate the 7-layer hierarchy."""
    
    # Create mock project
    project = Mock()
    project.solution_name = "Level 2 Automation System"
    project.solution_full_name = "Level 2 Process Control and Automation System"
    project.client_name = "ABC Steel Limited"
    project.client_location = "Mumbai, Maharashtra"
    project.ts_type = "Level 2"
    project.doc_date = "2024-01-15"
    
    # Sample saved sections
    all_sections = {
        "overview": {
            "process_summary": "The Hot Strip Mill produces steel coils through a multi-stage rolling process.",
            "system_objective": "Implement a centralized Level 2 automation system for process optimization."
        },
        "tech_stack": {
            "rows": [
                {
                    "sr_no": 1,
                    "component": "SCADA System",
                    "technology": "Siemens WinCC",
                    "note": "Primary HMI interface"
                }
            ]
        }
    }
    
    # Sample draft content (unsaved changes)
    draft_content = {
        "rows": [
            {
                "sr_no": 1,
                "component": "Level 2 Server",
                "technology": "Dell PowerEdge R740",
                "note": "Dual redundant configuration"
            },
            {
                "sr_no": 2,
                "component": "Network Switch",
                "technology": "Cisco Catalyst 9300",
                "note": "Industrial-grade managed switch"
            }
        ]
    }
    
    # Sample category context
    category_context = CategoryContext(
        context_txt="""Level 2 systems provide production management, quality control, and optimization functions.
Common applications include:
- Rolling mill optimization
- Quality tracking and reporting
- Production scheduling
- Material tracking
- Energy management

These systems interface with Level 1 PLCs and Level 3 ERP systems.""",
        historical_documents=[
            HistoricalDoc(
                filename="JSW_Level2_TS.docx",
                file_path="Level 2/JSW Steel/JSW_Level2_TS.docx",
                content="""The Level 2 system for JSW Steel Hot Strip Mill includes:
- Real-time production tracking
- Quality prediction models
- Thermal crown control
- Automated gauge control
- Integration with existing SAP system

Key benefits:
- 15% improvement in gauge accuracy
- 20% reduction in quality defects
- Automated shift reports generation"""
            ),
            HistoricalDoc(
                filename="TATA_Level2_Overview.txt",
                file_path="Level 2/TATA Steel/TATA_Level2_Overview.txt",
                content="""TATA Steel Kalinganagar Level 2 Implementation:

Scope: Complete Level 2 automation for 5 MTPA Hot Strip Mill
- Production management system
- Quality control system
- Energy management system
- Predictive maintenance analytics

Technology Stack:
- SCADA: Siemens PCS7
- Historian: OSIsoft PI
- Analytics: Python + TensorFlow
- Reporting: Power BI"""
            )
        ],
        folder_path="/app/ts_documents/Level 2",
        historical_context_available=True
    )
    
    # Build the prompt
    prompt = build_section_prompt(
        section_key="hardware_specs",
        project=project,
        all_sections=all_sections,
        draft_content=draft_content,
        category_context=category_context,
        project_context_md=""  # Not used - embedded instead
    )
    
    print("=" * 80)
    print("SAMPLE PROMPT FOR AI SUGGESTIONS")
    print("=" * 80)
    print()
    print(prompt)
    print()
    print("=" * 80)
    print("PROMPT STATISTICS")
    print("=" * 80)
    print(f"Total length: {len(prompt)} characters")
    print(f"Estimated tokens: ~{len(prompt) // 4}")
    print()
    print("Layer verification:")
    print(f"✓ Layer 1 (Project metadata): {'## 1. Project Metadata' in prompt}")
    print(f"✓ Layer 2 (Section identity): {'## 2. Section Identity' in prompt}")
    print(f"✓ Layer 3 (Saved sections): {'## 3. Existing Saved Section Content' in prompt}")
    print(f"✓ Layer 4 (Draft content): {'## 4. Current Draft Content' in prompt}")
    print(f"✓ Layer 5 (Context.txt): {'## 5. Category Context' in prompt}")
    print(f"✓ Layer 6 (Historical docs): {'## 6. Historical TS Document Excerpts' in prompt}")
    print(f"✓ Layer 7 (PROJECT_CONTEXT.md): {'## 7. System Knowledge' in prompt}")
    print(f"✓ Output instructions: {'## 8. Output Format' in prompt}")


if __name__ == "__main__":
    demo_prompt_builder()
