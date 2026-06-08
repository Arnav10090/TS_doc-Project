import {
  CustomSectionContent,
  getImageItems,
  getTableItems,
  isImageData,
  isTableData,
} from '../types/customSections';
import { isCustomSectionKey } from './customSectionUtils';
import { stripEditMetadata } from './editMetadata';

export type FigureReference = {
  id: string;
  number: number;
  name: string;
};

export type TableReference = {
  id: string;
  number: number;
  name: string;
};

export type DocumentReferences = {
  figures: FigureReference[];
  tables: TableReference[];
  figureById: Record<string, FigureReference>;
  tableById: Record<string, TableReference>;
};

type PreviewImageAvailability = {
  architecture?: boolean;
  gantt_overall?: boolean;
  gantt_shutdown?: boolean;
};

const PREDEFINED_SECTION_ORDER = [
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
];

const BUILT_IN_TABLES: Record<string, { id: string; name: string }> = {
  revision_history: {
    id: 'table:revision_history',
    name: 'Revision History',
  },
  executive_summary: {
    id: 'table:executive_summary:client_logos',
    name: 'Client Reference Logos',
  },
  abbreviations: {
    id: 'table:abbreviations',
    name: 'Abbreviations Used',
  },
  tech_stack: {
    id: 'table:tech_stack',
    name: 'Technology Stack',
  },
  hardware_specs: {
    id: 'table:hardware_specs',
    name: 'Hardware Specifications',
  },
  software_specs: {
    id: 'table:software_specs',
    name: 'Software Specifications',
  },
  division_of_eng: {
    id: 'table:division_of_eng',
    name: 'Responsibility Matrix',
  },
};

const BUILT_IN_FIGURES: Record<
  string,
  { id: string; imageKey: keyof PreviewImageAvailability; name: string }
> = {
  system_config: {
    id: 'figure:system_config:architecture',
    imageKey: 'architecture',
    name: 'System Architecture',
  },
  overall_gantt: {
    id: 'figure:overall_gantt',
    imageKey: 'gantt_overall',
    name: 'Overall Gantt Chart',
  },
  shutdown_gantt: {
    id: 'figure:shutdown_gantt',
    imageKey: 'gantt_shutdown',
    name: 'Shutdown Gantt Chart',
  },
};

const stripExtension = (filename: string) =>
  filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

const captionOrFallback = (caption: unknown, fallback: string) => {
  const text = typeof caption === 'string' ? caption.trim() : '';
  return text || fallback;
};

const sortCustomSections = (
  entries: Array<[string, CustomSectionContent]>,
) =>
  [...entries].sort(([leftKey], [rightKey]) => {
    const leftTimestamp = Number(leftKey.split('_')[2]);
    const rightTimestamp = Number(rightKey.split('_')[2]);

    if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)) {
      return leftTimestamp - rightTimestamp;
    }

    return leftKey.localeCompare(rightKey);
  });

export const buildDocumentReferences = (
  sectionContents: Record<string, Record<string, any>>,
  imageAvailability: PreviewImageAvailability = {},
): DocumentReferences => {
  const figures: FigureReference[] = [];
  const tables: TableReference[] = [];
  const customSections: Record<string, CustomSectionContent> = {};

  Object.entries(sectionContents).forEach(([key, content]) => {
    if (isCustomSectionKey(key)) {
      customSections[key] = (stripEditMetadata(content || {}) || {}) as CustomSectionContent;
    }
  });

  const addFigure = (id: string, name: string) => {
    figures.push({
      id,
      name,
      number: figures.length + 1,
    });
  };

  const addTable = (id: string, name: string) => {
    tables.push({
      id,
      name,
      number: tables.length + 1,
    });
  };

  const addCustomReferencesAfter = (insertAfterKey: string) => {
    const matchingSections = sortCustomSections(
      Object.entries(customSections).filter(
        ([, content]) => content.insertAfterKey === insertAfterKey,
      ),
    );

    matchingSections.forEach(([sectionKey, content]) => {
      content.subsections?.forEach((subsection, subsectionIndex) => {
        if (subsection.contentType === 'table' && isTableData(subsection.data)) {
          getTableItems(subsection.data).forEach((table, tableIndex) => {
            addTable(
              `table:${sectionKey}:${subsection.key}:${tableIndex}`,
              captionOrFallback(
                table.caption,
                subsection.name ||
                  `Table ${subsectionIndex + 1}${tableIndex > 0 ? `.${tableIndex + 1}` : ''}`,
              ),
            );
          });
        }

        if (subsection.contentType === 'image' && isImageData(subsection.data)) {
          getImageItems(subsection.data).forEach((image, imageIndex) => {
            addFigure(
              `figure:${sectionKey}:${subsection.key}:${imageIndex}`,
              captionOrFallback(
                image.caption,
                subsection.name ||
                  stripExtension(image.filename) ||
                  `Figure ${subsectionIndex + 1}${imageIndex > 0 ? `.${imageIndex + 1}` : ''}`,
              ),
            );
          });
        }
      });

      addCustomReferencesAfter(sectionKey);
    });
  };

  PREDEFINED_SECTION_ORDER.forEach((sectionKey) => {
    if (!(sectionKey in sectionContents)) {
      return;
    }

    const builtInTable = BUILT_IN_TABLES[sectionKey];
    if (builtInTable) {
      addTable(builtInTable.id, builtInTable.name);
    }

    const builtInFigure = BUILT_IN_FIGURES[sectionKey];
    if (builtInFigure && imageAvailability[builtInFigure.imageKey]) {
      addFigure(builtInFigure.id, builtInFigure.name);
    }

    addCustomReferencesAfter(sectionKey);
  });

  return {
    figures,
    tables,
    figureById: Object.fromEntries(figures.map((figure) => [figure.id, figure])),
    tableById: Object.fromEntries(tables.map((table) => [table.id, table])),
  };
};
