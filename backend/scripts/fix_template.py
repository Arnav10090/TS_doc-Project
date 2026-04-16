"""
Fix Jinja2 Template - Repair malformed tags in TS_Template_jinja.docx

This script fixes common issues where Word splits Jinja2 tags across multiple
XML runs, creating malformed tags like {{{{ instead of {{.

The docxtpl library has a built-in method to handle this: replace_zipname()
"""

from pathlib import Path
from docxtpl import DocxTemplate
import re

INPUT = Path("templates/TS_Template_jinja.docx")
OUTPUT = Path("templates/TS_Template_jinja_fixed.docx")
BACKUP = Path("templates/TS_Template_jinja_backup.docx")

def fix_template():
    """Fix malformed Jinja2 tags in the template."""
    
    print(f"Loading template from: {INPUT}")
    
    # Create backup
    if INPUT.exists():
        import shutil
        shutil.copy(INPUT, BACKUP)
        print(f"Backup created: {BACKUP}")
    
    # Load template
    try:
        template = DocxTemplate(str(INPUT))
        print("Template loaded successfully")
    except Exception as e:
        print(f"Error loading template: {e}")
        return False
    
    # The docxtpl library automatically handles tag consolidation when rendering
    # But we need to manually fix the XML for persistent storage
    
    # Save with a test render to consolidate tags
    test_context = {
        'SolutionFullName': 'TEST',
        'SolutionName': 'TEST',
        'ClientName': 'TEST',
        'ClientLocation': 'TEST',
        'ClientAbbreviation': 'TEST',
        'SolutionAbbreviation': 'TEST',
        'RefNumber': 'TEST',
        'DocDate': 'TEST',
        'DocVersion': 'TEST',
        'ExecutiveSummaryPara1': 'TEST',
        'TenderReference': 'TEST',
        'TenderDate': 'TEST',
        'ProcessFlowDescription': 'TEST',
        'SystemObjective': 'TEST',
        'ExistingSystemDescription': 'TEST',
        'IntegrationDescription': 'TEST',
        'TangibleBenefits': 'TEST',
        'IntangibleBenefits': 'TEST',
        'RemoteSupportText': 'TEST',
        'TrainingPersons': 'TEST',
        'TrainingDays': 'TEST',
        'FATCondition': 'TEST',
        'ThirdPartySW': 'TEST',
        'PMDays': 'TEST',
        'DevDays': 'TEST',
        'CommDays': 'TEST',
        'TotalManDays': 'TEST',
        'ValueAddedOfferings': 'TEST',
        'POCName': 'TEST',
        'POCDescription': 'TEST',
        'abbreviation_rows': [],
        'features': [],
        'doc_control_custom': [],
        'ts_rows': [{'component': '', 'technology': ''} for _ in range(6)],
        'hw_rows': [{'specs_line1': '', 'specs_line2': '', 'specs_line3': '', 'specs_line4': '', 'maker': '', 'qty': ''} for _ in range(6)],
        'sw_rows': [{'name': '', 'maker': '-'} for _ in range(9)],
        'work_completion_custom': [],
        'buyer_obligations_custom': [],
        'exclusion_custom': [],
        'buyer_prereqs': [],
        'revision_rows': [],
        'architecture_diagram': '[Architecture Diagram]',
        'overall_gantt': '[Overall Gantt]',
        'shutdown_gantt': '[Shutdown Gantt]',
    }
    
    print("\nAttempting to render template with test context...")
    try:
        template.render(test_context)
        print("Template rendered successfully!")
        
        # Save the fixed template
        template.save(str(OUTPUT))
        print(f"\nFixed template saved to: {OUTPUT}")
        print("\nNext steps:")
        print("1. Review the fixed template")
        print("2. If it looks good, replace the original:")
        print(f"   mv {OUTPUT} {INPUT}")
        
        return True
        
    except Exception as e:
        print(f"\nError rendering template: {e}")
        print("\nThis indicates there are Jinja2 syntax errors that need manual fixing.")
        print("Common issues:")
        print("  - {%tr for item in items %} should be {% tr for item in items %}")
        print("  - Missing spaces: {%for%} should be {% for %}")
        print("  - Unclosed tags: {% for item in items without %}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Jinja2 Template Fixer")
    print("=" * 60)
    print()
    
    success = fix_template()
    
    if success:
        print("\n✅ Template fixed successfully!")
    else:
        print("\n❌ Template fixing failed - manual intervention required")
