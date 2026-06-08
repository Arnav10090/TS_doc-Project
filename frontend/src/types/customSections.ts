/**
 * Type definitions for custom sections feature
 * Supports user-created sections with tables, images, and rich text content
 */

/**
 * Table data structure for table subsections
 */
export interface TableItem {
  columns: string[];  // Column names
  rows: Record<string, string>[];  // Array of row objects with column names as keys
  caption?: string;  // Optional table caption/name for document references
}

export interface TableData {
  tables?: TableItem[];  // Multi-table payload for table subsections
  columns?: string[];  // Legacy single-table payload
  rows?: Record<string, string>[];  // Legacy single-table payload
}

/**
 * Image data structure for image subsections
 */
export interface SubsectionImageItem {
  base64: string;  // Base64-encoded image data
  filename: string;  // Original filename
  mimeType: string;  // MIME type (image/png or image/jpeg)
  caption?: string;  // Optional figure caption/name for document references
}

export interface ImageData {
  images?: SubsectionImageItem[];  // Multi-image payload for image subsections
  base64?: string;  // Legacy single-image payload
  filename?: string;  // Legacy single-image payload
  mimeType?: string;  // Legacy single-image payload
}

/**
 * Paragraph data structure for rich text subsections
 */
export interface ParagraphItem {
  html: string;  // HTML content with formatting
}

export interface ParagraphData {
  paragraphs?: ParagraphItem[];  // Multi-paragraph payload for paragraph subsections
  html?: string;  // Legacy single-paragraph payload
}

/**
 * Content type discriminator for subsections
 */
export type SubsectionContentType = 'table' | 'image' | 'paragraph';

/**
 * Union type for subsection data
 */
export type SubsectionData = TableData | ImageData | ParagraphData;

/**
 * Custom subsection structure
 */
export interface CustomSubsection {
  key: string;  // custom_subsection_{timestamp}_{uuid}
  name: string;  // Subsection title
  contentType: SubsectionContentType;
  data: SubsectionData;
}

/**
 * Custom section content structure
 */
export interface CustomSectionContent {
  title?: string;  // Section title (optional, defaults to "NEW SECTION")
  subsections: CustomSubsection[];  // Array of subsections
  insertAfterKey: string;  // Key of section before this one
  displayMode?: 'section' | 'subsection';  // Controls whether the item renders as a top-level section or inline subsection(s)
}

/**
 * Type guard to check if data is TableData
 */
export function isTableData(data: SubsectionData): data is TableData {
  return (
    ('tables' in data && Array.isArray(data.tables)) ||
    ('columns' in data && Array.isArray(data.columns) && 'rows' in data)
  );
}

/**
 * Type guard to check if data is ImageData
 */
export function isImageData(data: SubsectionData): data is ImageData {
  return (
    ('images' in data && Array.isArray(data.images)) ||
    ('base64' in data && typeof data.base64 === 'string')
  );
}

export function getImageItems(data: ImageData): SubsectionImageItem[] {
  if (Array.isArray(data.images)) {
    return data.images;
  }

  if (data.base64) {
    return [
      {
        base64: data.base64,
        filename: data.filename || '',
        mimeType: data.mimeType || '',
      },
    ];
  }

  return [];
}

export function getTableItems(data: TableData): TableItem[] {
  if (Array.isArray(data.tables)) {
    return data.tables;
  }

  if (Array.isArray(data.columns) && Array.isArray(data.rows)) {
    return [
      {
        columns: data.columns,
        rows: data.rows,
      },
    ];
  }

  return [];
}

/**
 * Type guard to check if data is ParagraphData
 */
export function isParagraphData(data: SubsectionData): data is ParagraphData {
  return (
    ('paragraphs' in data && Array.isArray(data.paragraphs)) ||
    ('html' in data && typeof data.html === 'string')
  );
}

export function getParagraphItems(data: ParagraphData): ParagraphItem[] {
  if (Array.isArray(data.paragraphs)) {
    return data.paragraphs;
  }

  if (typeof data.html === 'string') {
    return [{ html: data.html }];
  }

  return [];
}
