/**
 * Utility functions for custom sections feature
 * Handles key generation, validation, and position tracking
 */

import { getTableItems } from '../types/customSections';
import type { CustomSectionContent, CustomSubsection, TableData } from '../types/customSections';

export const PREVIEW_SECTION_ORDER = [
  'cover',
  'revision_history',
  'executive_summary',
  'introduction',
  'abbreviations',
  'process_flow',
  'overview',
  'features',
  'remote_support',
  'documentation_control',
  'customer_training',
  'system_config',
  'fat_condition',
  'tech_stack',
  'hardware_specs',
  'software_specs',
  'third_party_sw',
  'overall_gantt',
  'shutdown_gantt',
  'supervisors',
  'scope_definitions',
  'division_of_eng',
  'value_addition',
  'work_completion',
  'buyer_obligations',
  'exclusion_list',
  'buyer_prerequisites',
  'binding_conditions',
  'cybersecurity',
  'disclaimer',
  'poc',
] as const;

/**
 * Generates a unique custom section key
 * Format: custom_section_{timestamp}_{uuid}
 * 
 * @returns Unique section key string
 * 
 * Requirements: 3.2, 8.1
 */
export function generateCustomSectionKey(): string {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `custom_section_${timestamp}_${uuid}`;
}

/**
 * Generates a unique custom subsection key
 * Format: custom_subsection_{timestamp}_{uuid}
 * 
 * @returns Unique subsection key string
 * 
 * Requirements: 4.7, 8.2
 */
export function generateCustomSubsectionKey(): string {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `custom_subsection_${timestamp}_${uuid}`;
}

/**
 * Checks if a section key is a custom section
 * 
 * @param key Section key to check
 * @returns True if key matches custom section pattern
 */
export function isCustomSectionKey(key: string): boolean {
  return /^custom_section_\d+_[a-f0-9-]{36}$/.test(key);
}

/**
 * Checks if a section key is a custom subsection
 * 
 * @param key Section key to check
 * @returns True if key matches custom subsection pattern
 */
export function isCustomSubsectionKey(key: string): boolean {
  return /^custom_subsection_\d+_[a-f0-9-]{36}$/.test(key);
}

export function getCustomSectionsInPreviewOrder(
  customSections: Record<string, CustomSectionContent>,
  predefinedSectionOrder: readonly string[] = PREVIEW_SECTION_ORDER,
): Array<[string, CustomSectionContent]> {
  const ordered: Array<[string, CustomSectionContent]> = [];
  const visited = new Set<string>();
  const entries = Object.entries(customSections);

  const isInlineSubsectionSection = (content: CustomSectionContent) =>
    content.displayMode === 'subsection';

  const addCustomAfter = (afterKey: string) => {
    const matchingEntries = entries.filter(
      ([sectionKey, content]) =>
        !visited.has(sectionKey) && content.insertAfterKey === afterKey,
    );
    const inlineEntries = matchingEntries.filter(([, content]) =>
      isInlineSubsectionSection(content),
    );
    const topLevelEntries = matchingEntries.filter(
      ([, content]) => !isInlineSubsectionSection(content),
    );

    [...inlineEntries, ...topLevelEntries].forEach(([sectionKey, content]) => {
      visited.add(sectionKey);
      ordered.push([sectionKey, content]);
      addCustomAfter(sectionKey);
    });
  };

  predefinedSectionOrder.forEach(addCustomAfter);

  entries.forEach(([sectionKey, content]) => {
    if (visited.has(sectionKey)) {
      return;
    }

    visited.add(sectionKey);
    ordered.push([sectionKey, content]);
    addCustomAfter(sectionKey);
  });

  return ordered;
}

export function getCustomSectionDisplayName(
  content: CustomSectionContent,
): string {
  const title = (content.title || '').trim();
  const subsectionName =
    content.subsections
      ?.map((subsection) => subsection.name.trim())
      .find(Boolean) || '';

  if (content.displayMode === 'subsection') {
    return subsectionName || 'NEW SUBSECTION';
  }

  if (title && title.toUpperCase() !== 'NEW SECTION') {
    return title;
  }

  return subsectionName || 'NEW SECTION';
}

/**
 * Error state for validation failures
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates image file type (PNG/JPG only)
 * 
 * @param file File to validate
 * @returns ValidationError if invalid, null if valid
 * 
 * Requirements: 6.2
 */
export function validateImageType(file: File): ValidationError | null {
  const validTypes = ['image/png', 'image/jpeg'];
  
  if (!validTypes.includes(file.type)) {
    return {
      field: 'image',
      message: 'Image must be PNG or JPG'
    };
  }
  
  return null;
}

/**
 * Validates image file size (max 10MB)
 * 
 * @param file File to validate
 * @returns ValidationError if invalid, null if valid
 * 
 * Requirements: 6.3
 */
export function validateImageSize(file: File): ValidationError | null {
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  
  if (file.size > maxSize) {
    return {
      field: 'image',
      message: 'Image must be under 10MB'
    };
  }
  
  return null;
}

/**
 * Validates image file (type and size)
 * 
 * @param file File to validate
 * @returns ValidationError if invalid, null if valid
 * 
 * Requirements: 6.2, 6.3
 */
export function validateImageUpload(file: File): ValidationError | null {
  const typeError = validateImageType(file);
  if (typeError) return typeError;
  
  const sizeError = validateImageSize(file);
  if (sizeError) return sizeError;
  
  return null;
}

/**
 * Converts image file to base64 string
 * 
 * @param file Image file to convert
 * @returns Promise resolving to base64 string
 * 
 * Requirements: 6.4
 */
export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Calculates the ordered list of sections (predefined + custom)
 * Custom sections are inserted based on their insertAfterKey field
 * 
 * @param predefinedSections Array of predefined section keys in order
 * @param customSections Record of custom section keys to content
 * @returns Ordered array of all section keys
 * 
 * Requirements: 3.3, 8.3, 9.1
 */
export function getOrderedSections(
  predefinedSections: string[],
  customSections: Record<string, CustomSectionContent>
): string[] {
  const ordered: string[] = [];
  
  predefinedSections.forEach(predefinedKey => {
    ordered.push(predefinedKey);
    
    // Find custom sections that should appear after this predefined section
    Object.entries(customSections).forEach(([customKey, content]) => {
      if (content.insertAfterKey === predefinedKey) {
        ordered.push(customKey);
      }
    });
  });
  
  return ordered;
}

/**
 * Calculates section numbers for all sections (predefined + custom)
 * Section numbers are sequential starting from 1
 * 
 * @param orderedSections Array of section keys in display order
 * @returns Record mapping section keys to their numbers
 * 
 * Requirements: 3.4, 9.2, 9.3
 */
export function calculateSectionNumbers(
  orderedSections: string[]
): Record<string, number> {
  const numbers: Record<string, number> = {};
  
  orderedSections.forEach((key, index) => {
    numbers[key] = index + 1;
  });
  
  return numbers;
}

/**
 * Calculates subsection numbers within a parent section
 * Subsection numbers are sequential starting from 1 for each parent
 * 
 * @param subsections Array of subsections
 * @returns Record mapping subsection keys to their numbers
 * 
 * Requirements: 4.9, 9.4
 */
export function calculateSubsectionNumbers(
  subsections: CustomSubsection[]
): Record<string, number> {
  const numbers: Record<string, number> = {};
  
  subsections.forEach((subsection, index) => {
    numbers[subsection.key] = index + 1;
  });
  
  return numbers;
}

/**
 * Inserts a custom subsection after a specific existing subsection.
 * Falls back to appending when no anchor is provided or the anchor is missing.
 */
export function insertSubsectionAfter(
  subsections: CustomSubsection[],
  subsection: CustomSubsection,
  insertAfterSubsectionKey?: string | null,
): CustomSubsection[] {
  if (!insertAfterSubsectionKey) {
    return [...subsections, subsection];
  }

  const insertAfterIndex = subsections.findIndex(
    (item) => item.key === insertAfterSubsectionKey,
  );

  if (insertAfterIndex === -1) {
    return [...subsections, subsection];
  }

  return [
    ...subsections.slice(0, insertAfterIndex + 1),
    subsection,
    ...subsections.slice(insertAfterIndex + 1),
  ];
}

/**
 * Finds the insertion position for a new custom section
 * 
 * @param insertAfterKey Key of section before insertion point
 * @param orderedSections Current ordered sections array
 * @returns Index where new section should be inserted
 * 
 * Requirements: 3.3, 8.3
 */
export function findInsertionPosition(
  insertAfterKey: string,
  orderedSections: string[]
): number {
  const index = orderedSections.indexOf(insertAfterKey);
  return index >= 0 ? index + 1 : orderedSections.length;
}

/**
 * Generates HTML table from TableData structure
 * Includes proper table, thead, tbody, tr, th, td elements with inline styles
 * 
 * @param data Table data with columns and rows
 * @returns HTML string representing the table
 * 
 * Requirements: 5.5
 */
export function generateTableHTML(data: TableData): string {
  const table = getTableItems(data)[0];

  if (!table) {
    return '';
  }

  const { columns, rows } = table;
  const tableStyle = 'width: 100%; border-collapse: collapse; margin: 16px 0;';
  const thStyle = 'border: 1px solid #ddd; padding: 12px; background-color: #f5f5f5; text-align: left; font-weight: bold;';
  const tdStyle = 'border: 1px solid #ddd; padding: 12px; text-align: left;';
  
  // Generate table header
  const headerCells = columns
    .map(col => `<th style="${thStyle}">${escapeHtml(col)}</th>`)
    .join('');
  const thead = `<thead><tr>${headerCells}</tr></thead>`;
  
  // Generate table body
  const bodyRows = rows
    .map(row => {
      const cells = columns
        .map(col => `<td style="${tdStyle}">${escapeHtml(row[col] || '')}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  const tbody = `<tbody>${bodyRows}</tbody>`;
  
  return `<table style="${tableStyle}">${thead}${tbody}</table>`;
}

/**
 * Escapes HTML special characters to prevent XSS
 * 
 * @param text Text to escape
 * @returns Escaped text safe for HTML insertion
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
