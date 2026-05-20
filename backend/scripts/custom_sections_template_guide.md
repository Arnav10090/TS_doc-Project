# Custom Sections Template Integration Guide

## Overview

This document describes how to integrate custom sections into the DOCX template (`backend/templates/TS_Template_jinja.docx`).

## Context Variables Available

The context builder now provides the following variables for custom sections:

### `custom_sections` (List)

An array of processed custom sections, each containing:

```python
{
    'section_number': int,  # Sequential section number (e.g., 15, 16, 17)
    'title': str,  # Section title or "NEW SECTION"
    'subsections': [  # Array of subsections
        {
            'section_number': int,  # Parent section number
            'subsection_number': int,  # Subsection number within parent (1, 2, 3...)
            'name': str,  # Subsection name
            'content_type': str,  # 'table', 'image', or 'paragraph'
            
            # For table subsections:
            'table_data': {
                'columns': ['Column1', 'Column2', ...],
                'rows': [
                    {'Column1': 'value1', 'Column2': 'value2'},
                    ...
                ]
            },
            
            # For image subsections:
            'image': InlineImage(...) or "[Image — To Be Inserted]",
            
            # For paragraph subsections:
            'paragraph_html': str  # Plain text (HTML stripped)
        }
    ]
}
```

### `section_numbers` (Dict)

A dictionary mapping section keys to their sequential numbers, including both predefined and custom sections.

## Template Jinja2 Code

Add this code to the template at the end of the document (after all predefined sections):

```jinja2
{# Custom Sections #}
{% for custom_section in custom_sections %}

{# Section Heading #}
{{ custom_section.section_number }}. {{ custom_section.title }}

{# Subsections #}
{% for subsection in custom_section.subsections %}

{# Subsection Heading #}
{{ subsection.section_number }}.{{ subsection.subsection_number }} {{ subsection.name }}

{# Table Content #}
{% if subsection.content_type == 'table' %}
{%tr for row in subsection.table_data.rows %}
{{ row[subsection.table_data.columns[0]] }}
{{ row[subsection.table_data.columns[1]] }}
{# Add more columns as needed based on table structure #}
{%tr endfor %}
{% endif %}

{# Image Content #}
{% if subsection.content_type == 'image' %}
{{ subsection.image }}
{% endif %}

{# Paragraph Content #}
{% if subsection.content_type == 'paragraph' %}
{{ subsection.paragraph_html }}
{% endif %}

{% endfor %}

{% endfor %}
```

## Table Rendering

For tables, you'll need to create a table structure in Word first, then add the Jinja2 loop:

1. Insert a table with the appropriate number of columns
2. Add the `{%tr for row in subsection.table_data.rows %}` tag in the first data row
3. Add column references like `{{ row[subsection.table_data.columns[0]] }}`
4. Add the `{%tr endfor %}` tag after the row

## Image Rendering

Images are provided as `InlineImage` objects that can be directly inserted into the template using `{{ subsection.image }}`.

## Paragraph Rendering

Paragraphs are provided as plain text (HTML stripped) and can be inserted using `{{ subsection.paragraph_html }}`.

## Section Numbering

Section numbers are automatically calculated to include custom sections in the sequence. For example:

- Section 1: Cover (predefined)
- Section 2: Revision History (predefined)
- ...
- Section 14: Features (predefined)
- Section 15: Custom Section 1 (custom)
- Section 16: Remote Support (predefined)
- Section 17: Custom Section 2 (custom)
- ...

The `section_numbers` dictionary can be used to update predefined section numbers if needed.

## Implementation Steps

1. Open `backend/templates/TS_Template_jinja.docx` in Microsoft Word
2. Navigate to the end of the document
3. Add a page break
4. Insert the custom sections template code
5. Format the headings to match existing section styles
6. Save the template
7. Run the repair script if needed: `python backend/scripts/repair_template_xml.py`

## Testing

After updating the template, test with:

```bash
# Generate a document with custom sections
curl -X POST http://localhost:8000/api/v1/projects/{project_id}/generate
```

Verify that:
- Custom sections appear in the correct positions
- Section numbering is sequential
- Tables render correctly
- Images display properly
- Paragraph formatting is preserved
