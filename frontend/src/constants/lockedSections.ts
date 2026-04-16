/**
 * Locked Section Content Constants
 * 
 * IMPORTANT: These constants contain the exact text from TS_Template_original.docx
 * for sections that are locked and cannot be edited by users.
 * 
 * The content must be extracted from the original Word template to ensure
 * legal accuracy and compliance with Hitachi India standards.
 * 
 * Requirements: 15.1, 15.2, 33.1, 34.1, 40.1, 41.1, 42.1, 43.6
 */

/**
 * Executive Summary Boilerplate (Section 1)
 * Opening text that appears before the project-specific paragraph
 */
export const EXECUTIVE_SUMMARY_BOILERPLATE = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 1]

This section should contain the standard opening text for the Executive Summary
that appears before the user-editable project-specific paragraph.
`;

/**
 * Client Logos Table Structure (Section 1)
 * Table showing Hitachi and client logos side by side
 */
export const CLIENT_LOGOS_TABLE = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 1]

This section should contain the HTML/text structure for the client logos table
that appears in the Executive Summary.
`;

/**
 * Scope Definitions Content (Section 7.1)
 * Standard definitions for scope-related terms
 */
export const SCOPE_DEFINITIONS_CONTENT = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 7.1]

This section should contain the standard scope definitions text that explains
terminology used throughout the technical specification.
`;

/**
 * Division of Engineering Responsibility Matrix (Section 7.2)
 * Table showing responsibility allocation between Hitachi and client
 */
export const RESPONSIBILITY_MATRIX_CONTENT = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 7.2]

This section should contain the responsibility matrix table showing which party
(Hitachi/Client) is responsible for various engineering activities.
`;

/**
 * Binding Conditions Content (Section 8.1)
 * Legal terms and conditions that apply to all proposals
 */
export const BINDING_CONDITIONS_CONTENT = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 8.1]

This section should contain the complete binding conditions text including:
- Price validity period
- Payment terms
- Delivery timeline conditions
- Change order process
- Infrastructure requirements
- Intellectual property rights
- Warranty terms
- Jurisdiction and dispute resolution

CRITICAL: This is legal text and must be extracted exactly from the template.
`;

/**
 * Cybersecurity Content (Section 8.2)
 * Standard cybersecurity practices and commitments
 */
export const CYBERSECURITY_CONTENT = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 8.2]

This section should contain the cybersecurity practices text including:
- Vulnerability scanning
- Secure coding practices
- Data encryption standards
- Access control measures
- Security patches and updates
- Audit logging
- Password policies
- Session management
- Client responsibilities
- Optional security services

CRITICAL: This is compliance text and must be extracted exactly from the template.
`;

/**
 * Disclaimer Content (Section 8.3)
 * Legal disclaimer with all subsections
 */
export const DISCLAIMER_CONTENT = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 8.3]

This section should contain the complete disclaimer text with all 4 subsections:
1. General disclaimer about accuracy and warranties
2. Specification change notice
3. Implementation variation notice
4. Performance metrics disclaimer
5. Third-party terms
6. Liability limitations
7. Client acceptance terms
8. Trademark acknowledgments

CRITICAL: This is legal text and must be extracted exactly from the template.
`;

/**
 * Proof of Concept Boilerplate (Section 9)
 * Standard POC description text
 */
export const POC_BOILERPLATE_CONTENT = `
[PLACEHOLDER - EXTRACT FROM TS_Template_original.docx Section 9]

This section should contain the standard POC boilerplate text that appears
before the user-editable POC name and description fields.
`;

/**
 * Helper function to resolve placeholders in locked content
 * Replaces {{variable}} patterns with actual values from project data
 */
export const resolvePlaceholders = (
  content: string,
  replacements: Record<string, string>
): string => {
  let resolved = content;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    resolved = resolved.replace(pattern, value);
  });
  
  return resolved;
};
