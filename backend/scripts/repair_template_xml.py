"""
Repair Template XML - Fix malformed Jinja2 tags in document.xml

This script directly edits the document.xml inside the .docx file to fix:
1. Quadruple braces {{{{ → {{
2. Nested braces {{{{ {{ X }} }}}} → {{ X }}
3. Extra spaces and malformed structures
"""

import zipfile
import re
from pathlib import Path
import shutil

INPUT = Path("templates/TS_Template_jinja.docx")
OUTPUT = Path("templates/TS_Template_jinja_repaired.docx")
BACKUP = Path("templates/TS_Template_jinja_backup.docx")

def repair_jinja_tags(xml_content: str) -> str:
    """
    Repair malformed Jinja2 tags in XML content.
    """
    original = xml_content
    
    # Step 1: Fix nested braces like {{{{ {{ ClientName }} }}}}
    # Pattern: {{{{ {{ VARNAME }} }}}} → {{ VARNAME }}
    xml_content = re.sub(
        r'\{\{\{\{\s*\{\{\s*([^}]+?)\s*\}\}\s*\}\}\}\}',
        r'{{ \1 }}',
        xml_content
    )
    
    # Step 2: Fix quadruple braces {{{{ VARNAME }}}} → {{ VARNAME }}
    xml_content = re.sub(
        r'\{\{\{\{\s*([^}]+?)\s*\}\}\}\}',
        r'{{ \1 }}',
        xml_content
    )
    
    # Step 3: Fix incomplete quadruple opening {{{{ VARNAME }} → {{ VARNAME }}
    xml_content = re.sub(
        r'\{\{\{\{\s*([^}]+?)\s*\}\}',
        r'{{ \1 }}',
        xml_content
    )
    
    # Step 4: Fix incomplete quadruple closing {{ VARNAME }}}} → {{ VARNAME }}
    xml_content = re.sub(
        r'\{\{\s*([^}]+?)\s*\}\}\}\}',
        r'{{ \1 }}',
        xml_content
    )
    
    # Step 5: Fix triple braces {{{ VARNAME }}} → {{ VARNAME }}
    xml_content = re.sub(
        r'\{\{\{\s*([^}]+?)\s*\}\}\}',
        r'{{ \1 }}',
        xml_content
    )
    
    # Step 6: Clean up extra spaces in variable names
    # {{ VARNAME  }} → {{ VARNAME }}
    xml_content = re.sub(
        r'\{\{\s+([^}]+?)\s+\}\}',
        r'{{ \1 }}',
        xml_content
    )
    
    # Step 7: Fix control structures if any
    # {%tr for item in items %} → {% tr for item in items %}
    xml_content = re.sub(
        r'\{%tr\s+',
        r'{% tr ',
        xml_content
    )
    xml_content = re.sub(
        r'\s+%\}',
        r' %}',
        xml_content
    )
    
    changes = len(original) - len(xml_content)
    if changes != 0:
        print(f"  Content length changed by {changes} characters")
    
    return xml_content

def repair_template():
    """Repair the template by fixing XML content."""
    
    print(f"Loading template: {INPUT}")
    
    if not INPUT.exists():
        print(f"ERROR: Template not found at {INPUT}")
        return False
    
    # Create backup
    shutil.copy(INPUT, BACKUP)
    print(f"Backup created: {BACKUP}")
    
    # Read the template
    with zipfile.ZipFile(INPUT, 'r') as zip_in:
        # Get all file names
        file_list = zip_in.namelist()
        
        # Read document.xml
        doc_xml = zip_in.read('word/document.xml').decode('utf-8')
        print(f"\nOriginal document.xml size: {len(doc_xml)} bytes")
        
        # Count issues before repair
        quadruple_count = len(re.findall(r'\{\{\{\{', doc_xml))
        nested_count = len(re.findall(r'\{\{\{\{\s*\{\{', doc_xml))
        print(f"Issues found:")
        print(f"  - Quadruple braces: {quadruple_count}")
        print(f"  - Nested braces: {nested_count}")
        
        # Repair the XML
        print("\nRepairing XML...")
        repaired_xml = repair_jinja_tags(doc_xml)
        
        # Count issues after repair
        quadruple_after = len(re.findall(r'\{\{\{\{', repaired_xml))
        nested_after = len(re.findall(r'\{\{\{\{\s*\{\{', repaired_xml))
        print(f"After repair:")
        print(f"  - Quadruple braces: {quadruple_after}")
        print(f"  - Nested braces: {nested_after}")
        
        # Create new docx with repaired XML
        with zipfile.ZipFile(OUTPUT, 'w', zipfile.ZIP_DEFLATED) as zip_out:
            for item in file_list:
                if item == 'word/document.xml':
                    # Write repaired XML
                    zip_out.writestr(item, repaired_xml.encode('utf-8'))
                else:
                    # Copy other files as-is
                    zip_out.writestr(item, zip_in.read(item))
        
        print(f"\n✅ Repaired template saved to: {OUTPUT}")
        print(f"Repaired document.xml size: {len(repaired_xml)} bytes")
        
        return True

def test_repaired_template():
    """Test if the repaired template can be rendered."""
    print("\n" + "=" * 60)
    print("Testing repaired template...")
    print("=" * 60)
    
    try:
        from docxtpl import DocxTemplate
        
        template = DocxTemplate(str(OUTPUT))
        print("✅ Template loaded successfully")
        
        # Try rendering with minimal context
        test_context = {
            'SolutionFullName': 'Test Solution',
            'SolutionName': 'TestSol',
            'ClientName': 'Test Client',
            'ClientLocation': 'Test Location',
            'ClientAbbreviation': 'TC',
            'SolutionAbbreviation': 'TS',
            'RefNumber': 'REF001',
            'DocDate': '2024-01-01',
            'DocVersion': '1.0',
            'ExecutiveSummaryPara1': 'Test summary',
            'TenderReference': 'TR001',
            'TenderDate': '2024-01-01',
            'ProcessFlowDescription': 'Test process',
            'SystemObjective': 'Test objective',
            'ExistingSystemDescription': 'Test existing',
            'IntegrationDescription': 'Test integration',
            'TangibleBenefits': 'Test tangible',
            'IntangibleBenefits': 'Test intangible',
            'RemoteSupportText': 'Test remote support',
            'TrainingPersons': '10',
            'TrainingDays': '5',
            'FATCondition': 'Test FAT',
            'ThirdPartySW': 'Test SW',
            'PMDays': '10',
            'DevDays': '20',
            'CommDays': '5',
            'TotalManDays': '35',
            'ValueAddedOfferings': 'Test value',
            'POCName': 'Test POC',
            'POCDescription': 'Test POC desc',
            'abbreviation_rows': [],
            'features': [],
            'doc_control_custom': [],
            'ts_rows': [{'component': '', 'technology': ''} for _ in range(6)],
            'hw_rows': [{'specs_line1': '', 'maker': '', 'qty': ''} for _ in range(6)],
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
        
        template.render(test_context)
        print("✅ Template rendered successfully!")
        
        # Save test output
        test_output = Path("templates/test_output.docx")
        template.save(str(test_output))
        print(f"✅ Test document saved to: {test_output}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Jinja2 Template XML Repair Tool")
    print("=" * 60)
    print()
    
    if repair_template():
        if test_repaired_template():
            print("\n" + "=" * 60)
            print("SUCCESS! Template repaired and tested.")
            print("=" * 60)
            print("\nNext steps:")
            print(f"1. Review the repaired template: {OUTPUT}")
            print(f"2. If it works, replace the original:")
            print(f"   mv {OUTPUT} {INPUT}")
        else:
            print("\n❌ Template repaired but testing failed")
            print("Manual review required")
    else:
        print("\n❌ Template repair failed")
