import {
  BINDING_CONDITIONS_PARAGRAPHS,
  BUYER_OBLIGATION_ITEMS,
  CYBERSECURITY_DISCLAIMER_PARAGRAPHS,
  DISCLAIMER_SECTIONS,
  DOCUMENTATION_CONTROL_ITEMS,
  EXECUTIVE_SUMMARY_PARAGRAPHS,
  EXCLUSION_INTRO_PARAGRAPHS,
  EXCLUSION_STANDARD_ITEMS,
  INTRODUCTION_PARAGRAPHS,
  POC_PARAGRAPHS,
  REMOTE_SUPPORT_PARAGRAPHS,
  RESPONSIBILITY_MATRIX_ROWS,
  SCOPE_SUPPLY_DEFINITION_LINES,
  VALUE_ADDITION_INTRO,
  WORK_COMPLETION_CRITERIA,
  WORK_COMPLETION_PARAGRAPHS,
} from '../preview/templateContent';

export interface DefaultContentContext {
  solutionName?: string;
  solutionFullName?: string;
  clientName?: string;
  clientLocation?: string;
}

export interface RequiredFieldHint {
  path: string;
  label: string;
}

export const PREDEFINED_SECTION_TITLES: Record<string, string> = {
  cover: 'Cover Page',
  revision_history: 'Revision History',
  executive_summary: 'Executive Summary',
  introduction: 'Introduction',
  abbreviations: 'Abbreviations',
  process_flow: 'Process Flow',
  overview: 'Overview',
  features: 'Features',
  remote_support: 'Remote Support',
  documentation_control: 'Documentation Control',
  customer_training: 'Customer Training',
  system_config: 'System Configuration',
  fat_condition: 'FAT Condition',
  tech_stack: 'Technology Stack',
  hardware_specs: 'Hardware Specifications',
  software_specs: 'Software Specifications',
  third_party_sw: 'Third Party Software',
  overall_gantt: 'Overall Gantt Chart',
  shutdown_gantt: 'Shutdown Gantt Chart',
  supervisors: 'Supervisors',
  scope_definitions: 'Scope Definitions',
  division_of_eng: 'Division of Engineering',
  work_completion: 'Work Completion',
  buyer_obligations: 'Buyer Obligations',
  exclusion_list: 'Exclusion List',
  buyer_prerequisites: 'Buyer Prerequisites',
  binding_conditions: 'Binding Conditions',
  cybersecurity: 'Cybersecurity',
  disclaimer: 'Disclaimer',
  value_addition: 'Value Addition',
  poc: 'Proof of Concept',
  list_of_figures_tables: 'List of Figures & Tables',
};

export const PREDEFINED_SECTION_KEYS = Object.keys(PREDEFINED_SECTION_TITLES);

const revisionRows = [
  {
    sr_no: 1,
    revised_by: '',
    checked_by: '',
    approved_by: '',
    details: 'First issue',
    date: '23-01-2026',
    rev_no: '0',
  },
];

const abbreviationRows = [
  { sr_no: 1, abbreviation: 'JSPL', description: 'Jindal Steel & Power Ltd.' },
  { sr_no: 2, abbreviation: 'HIL', description: 'Hitachi India Pvt. Ltd.' },
  { sr_no: 3, abbreviation: 'SV', description: 'Supervisor' },
  { sr_no: 4, abbreviation: 'HMI', description: 'Human Machine Interface' },
  { sr_no: 5, abbreviation: 'PLC', description: 'Programmable Logic Controller' },
  { sr_no: 6, abbreviation: 'EOT', description: 'Electric Overhead Travelling Crane' },
  { sr_no: 7, abbreviation: 'HHT', description: 'Hand-held Terminal' },
  { sr_no: 8, abbreviation: 'LT', description: 'Long Travel of EOT Crane' },
  { sr_no: 9, abbreviation: 'CT', description: 'Cross Travel of EOT Crane' },
  { sr_no: 10, abbreviation: 'L1', description: 'Level-1 system' },
  { sr_no: 11, abbreviation: 'L2', description: 'Level-2 system' },
  { sr_no: 12, abbreviation: 'L3', description: 'Level-3 system' },
  { sr_no: 13, abbreviation: '', description: 'Plate Mill Yard Management System' },
  { sr_no: 14, abbreviation: 'HTC', description: 'Heat Treatment Complex' },
];

const techStackRows = [
  {
    sr_no: 1,
    component: 'Frontend Application',
    technology: '',
    note: 'Application can be viewed on a standard web browser like Chrome, Edge & Mozilla',
  },
  { sr_no: 2, component: 'Backend Application', technology: '', note: '' },
  { sr_no: 3, component: 'Database', technology: '', note: '' },
  { sr_no: 4, component: 'Integration Layer', technology: '', note: '' },
  { sr_no: 5, component: 'Mobile/HHT Application', technology: '', note: '' },
  { sr_no: 6, component: 'Communication Protocol', technology: '', note: '' },
];

const softwareRows = [
  { sr_no: 1, name: '', maker: 'Microsoft', qty: '2' },
  { sr_no: 2, name: '', maker: 'Microsoft', qty: '4' },
  { sr_no: 3, name: '', maker: 'Microsoft', qty: '6' },
  { sr_no: 4, name: '', maker: 'Microsoft/ Other', qty: '2' },
  { sr_no: 5, name: '', maker: '', qty: '6' },
  { sr_no: 6, name: '', maker: '-', qty: '2' },
  { sr_no: 7, name: '', maker: '-', qty: '2' },
  { sr_no: 8, name: '', maker: '-', qty: '2' },
  { sr_no: 9, name: '', maker: '', qty: '2' },
];

const hardwareRows = (solutionName?: string) => {
  const name = solutionName || '{SolutionName}';

  return [
    {
      sr_no: 1,
      name: 'Server (Tower Based)',
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '',
    },
    {
      sr_no: 2,
      name: 'Server Console & accessories',
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '2',
    },
    {
      sr_no: 3,
      name: 'GSM Modem',
      specs_line1: '2G/3G/4G Industrial Cellular GSM Model with Ethernet Port & 2dBi Antenna 2mtr cable',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '',
    },
    {
      sr_no: 4,
      name: 'HX Controller',
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '1 set',
    },
    {
      sr_no: 5,
      name: `${name} Client Desktop`,
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '4 set',
    },
    {
      sr_no: 6,
      name: `${name} Client Console & accessories`,
      specs_line1: '23.8" FHD (1920x1080) resolution monitor with USB Mouse and Keyboard',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '4 Set',
    },
  ];
};

const disclaimerSections = DISCLAIMER_SECTIONS.map((section) => ({
  title: section.title,
  paragraphs: [...section.paragraphs],
}));

export const REQUIRED_FIELD_HINTS: Record<string, RequiredFieldHint[]> = {
  cover: [
    { path: 'solution_full_name', label: 'Required' },
    { path: 'client_name', label: 'Required' },
    { path: 'client_location', label: 'Required' },
  ],
  revision_history: [{ path: 'rows.details', label: 'Required in at least one row' }],
  executive_summary: [{ path: 'para1', label: 'Required' }],
  introduction: [
    { path: 'tender_reference', label: 'Required' },
    { path: 'tender_date', label: 'Required' },
  ],
  abbreviations: [{ path: 'rows.abbreviation', label: 'Required where applicable' }],
  process_flow: [{ path: 'text', label: 'Required' }],
  overview: [
    { path: 'system_objective', label: 'Required' },
    { path: 'existing_system', label: 'Required' },
  ],
  features: [
    { path: 'items.title', label: 'Required' },
    { path: 'items.description', label: 'Required' },
  ],
  remote_support: [{ path: 'text', label: 'Required' }],
  customer_training: [
    { path: 'persons', label: 'Required' },
    { path: 'days', label: 'Required' },
  ],
  fat_condition: [{ path: 'text', label: 'Required' }],
  tech_stack: [{ path: 'rows.technology', label: 'Required' }],
  hardware_specs: [
    { path: 'rows.specs_line1', label: 'Required' },
    { path: 'rows.maker', label: 'Required' },
  ],
  software_specs: [{ path: 'rows.name', label: 'Required' }],
  third_party_sw: [{ path: 'sw4_name', label: 'Required' }],
  supervisors: [
    { path: 'pm_days', label: 'Required' },
    { path: 'dev_days', label: 'Required' },
    { path: 'comm_days', label: 'Required' },
    { path: 'total_man_days', label: 'Required' },
  ],
  value_addition: [{ path: 'text', label: 'Required' }],
  buyer_prerequisites: [{ path: 'items', label: 'Required' }],
  poc: [
    { path: 'name', label: 'Required' },
    { path: 'description', label: 'Required' },
  ],
};

export const getDefaultSectionContent = (
  sectionKey: string,
  context: DefaultContentContext = {},
): Record<string, any> => {
  const solutionName = context.solutionName || '{SolutionName}';

  switch (sectionKey) {
    case 'cover':
      return {
        cover_heading: 'TECHNICAL SPECIFICATION',
        solution_full_name: context.solutionFullName || '',
        client_name: context.clientName || '',
        client_location: context.clientLocation || '',
        ref_number: '26/XXXX/XXXXX/v0',
        doc_date: '23rd Jan 2026',
        doc_version: '0',
        company_name: 'Hitachi India Pvt Ltd.',
        company_contact: 'www.hitachi.co.in | sales.paeg@hitachi.co.in',
      };
    case 'revision_history':
      return {
        heading: 'REVISION HISTORY:',
        rows: revisionRows,
        copyright: 'Copyright (C) 2026 Hitachi India Pvt. Ltd.',
        confidentiality_notice:
          'All rights in this work are strictly reserved by the producer and the owner. Any unauthorized use of this material, including copying, reproduction, hiring, lending, public performance, broadcasting, communication to the public or via the internet, or transmission by any distribution or diffusion service, whether in whole or in part, is strictly prohibited. This work contains confidential and/or proprietary information. The information and ideas contained herein are provided solely for the use of the intended recipient. All content remains the exclusive property of Hitachi India and may not be disclosed, shared, or communicated to any third party, in any form or by any means, without prior written authorization.',
      };
    case 'executive_summary':
      return {
        heading: 'EXECUTIVE SUMMARY',
        paragraphs: [...EXECUTIVE_SUMMARY_PARAGRAPHS],
        para1: '',
        client_logo_rows: [
          ['HITACHI', 'Client Logo', 'Client Logo'],
          ['Client Logo', 'Client Logo', 'Client Logo'],
        ],
      };
    case 'introduction':
      return {
        heading: 'INTRODUCTION',
        paragraphs: [...INTRODUCTION_PARAGRAPHS],
        tender_reference: '',
        tender_date: '',
      };
    case 'abbreviations':
      return {
        heading: 'ABBREVIATIONS USED',
        rows: abbreviationRows,
      };
    case 'process_flow':
      return {
        heading: 'PROCESS FLOW',
        text: '',
      };
    case 'overview':
      return {
        heading: `OVERVIEW OF ${solutionName.toUpperCase()}`,
        process_summary: '',
        intro_text: 'This proposal outlines the technical feature of {{SolutionName}}',
        system_objective_label: 'System Objective:',
        system_objective: '',
        existing_system_label: 'Existing System Architecture:',
        existing_system: '',
        integration_label: 'Integration:',
        integration: '',
        benefits_label: 'Benefits:',
        tangible_benefits_label: 'Tangible benefits',
        tangible_benefits: '',
        intangible_benefits_label: 'Intangible benefits',
        intangible_benefits: '',
      };
    case 'features':
      return {
        heading: 'DESIGN SCOPE OF WORK',
        intro_text: 'Implementation of {{SolutionName}}',
        items: [{ id: 'feature-1', title: '', brief: '', description: '' }],
      };
    case 'remote_support':
      return {
        heading: 'REMOTE SUPPORT SYSTEM',
        paragraphs: [...REMOTE_SUPPORT_PARAGRAPHS],
        text: '',
      };
    case 'documentation_control':
      return {
        heading: 'DOCUMENTATION CONTROL',
        intro_text: 'SELLER shall provide the following technical documentation of the complete {{SolutionName}} solution:',
        items: [...DOCUMENTATION_CONTROL_ITEMS],
        custom_items: [],
      };
    case 'customer_training':
      return {
        heading: 'CUSTOMER TRAINING',
        paragraph:
          'SELLER shall provide training at site during commissioning to a maximum of {{TrainingPersons}} people for a maximum of {{TrainingDays}} days. Training shall cover mutually agreed topics on {{SolutionName}} application. Training shall comprise of classroom training at site.',
        persons: '',
        days: '',
      };
    case 'system_config':
      return {
        heading: 'SYSTEM CONFIGURATION (FOR REFERENCE)',
        intro_text: 'The reference system configuration of {{SolutionName}} is shown below:',
        placeholder_text: '[Architecture diagram to be inserted]',
        note:
          'Note: The above architecture is provided for illustrative purposes only and is subject to modification during detailed engineering to optimize overall system performance and functionality',
      };
    case 'fat_condition':
      return {
        heading: 'FAT CONDITION',
        text: '',
      };
    case 'tech_stack':
      return {
        heading: 'TECHNOLOGY STACK',
        intro_text: 'The technology stack for various components is as follows:',
        rows: techStackRows,
      };
    case 'hardware_specs':
      return {
        heading: 'HARDWARE SPECIFICATIONS',
        intro_text: 'Following is the list of Hardware required for {{SolutionName}} Application.',
        rows: hardwareRows(context.solutionName),
      };
    case 'software_specs':
      return {
        heading: 'SOFTWARE SPECIFICATIONS',
        intro_text: 'Below are the Software Specifications for the Proposed {{SolutionName}} system.',
        rows: softwareRows,
      };
    case 'third_party_sw':
      return {
        heading: 'THIRD PARTY SOFTWARE',
        sw4_name: '',
        remote_link_text:
          'Remote Link: To provide a suitable level of response to operation & process execution problems and queries raised on site, SELLER requires a network connection via broadband / VPN / Remote connectivity.',
      };
    case 'overall_gantt':
      return {
        heading: 'OVERALL GANTT CHART',
        placeholder_text: '[Overall Gantt chart to be inserted]',
        note:
          'Note: After Approval on System Design Document SELLER will take 4 Months for Software development. In the event of a delay in System design document approvals from the Customer, it will lead to an overall delay in the delivery. Above delivery schedule is for {{SolutionName}} application',
      };
    case 'shutdown_gantt':
      return {
        heading: 'SHUTDOWN GANTT CHART',
        placeholder_text: '[Shutdown Gantt chart to be inserted]',
        note_label: 'NOTE:',
        note:
          '{{SolutionName}} Application Deployment & commissioning is subject to site readiness from BUYER. The above shutdown schedule provided is for reference only. The final shutdown schedule will be determined through discussion and mutual agreement between the BUYER & SELLER',
      };
    case 'supervisors':
      return {
        heading: 'SUPERVISORS:',
        intro_text:
          'The following site-supervisor will be deputed to the site for the commissioning, deployment & training at site:',
        pm_days: '',
        dev_days: '',
        comm_days: '',
        total_man_days: '',
      };
    case 'scope_definitions':
      return {
        heading: 'SCOPE OF SUPPLY DEFINITIONS',
        lines: [...SCOPE_SUPPLY_DEFINITION_LINES],
      };
    case 'division_of_eng':
      return {
        heading: 'DIVISION OF ENGINEERING, SOFTWARE DEVELOPMENT, & ERECTION/COMMISSIONING SERVICES',
        matrix_rows: RESPONSIBILITY_MATRIX_ROWS.map((row) => [...row]),
        note_label: 'Note:',
        note_paragraphs: [
          '1) Any additional requirements beyond the scope mentioned above shall be discussed and mutually agreed upon. A separate proposal will be submitted for such additional requirements.',
          '2) Firewall Configuration will be managed by BUYER.',
        ],
        training_days: '',
        training_persons: '',
      };
    case 'value_addition':
      return {
        heading: 'VALUE ADDITION',
        intro_text: VALUE_ADDITION_INTRO,
        text: '',
      };
    case 'work_completion':
      return {
        heading: 'WORK COMPLETION CERTIFICATE',
        criteria_label: 'Work Completion Criteria:',
        criteria: [...WORK_COMPLETION_CRITERIA],
        custom_items: [],
        paragraphs: [...WORK_COMPLETION_PARAGRAPHS],
      };
    case 'buyer_obligations':
      return {
        heading: 'BUYER OBLIGATIONS',
        intro_text: 'The BUYER should fulfil the following obligations',
        items: [...BUYER_OBLIGATION_ITEMS],
        custom_items: [],
      };
    case 'exclusion_list':
      return {
        heading: 'EXCLUSION LIST',
        intro_paragraphs: [...EXCLUSION_INTRO_PARAGRAPHS],
        items: [...EXCLUSION_STANDARD_ITEMS],
        custom_items: [],
      };
    case 'buyer_prerequisites':
      return {
        heading: 'BUYER PREREQUISITES:',
        items: [''],
      };
    case 'binding_conditions':
      return {
        heading: 'BINDING CONDITIONS:',
        paragraphs: [...BINDING_CONDITIONS_PARAGRAPHS],
      };
    case 'cybersecurity':
      return {
        heading: 'CYBERSECURITY DISCLAIMER',
        paragraphs: [...CYBERSECURITY_DISCLAIMER_PARAGRAPHS],
      };
    case 'disclaimer':
      return {
        heading: 'DISCLAIMER',
        sections: disclaimerSections,
      };
    case 'poc':
      return {
        heading: 'COMPLIMENTRY PROOF OF CONCEPTS (PoC)',
        paragraphs: [...POC_PARAGRAPHS],
        intro_text: 'The following solution will be part of the PoC:',
        name: '',
        description: '',
      };
    case 'list_of_figures_tables':
      return {
        heading: 'LIST OF FIGURES & TABLES',
      };
    default:
      return {};
  }
};

const isPlainRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const clone = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    ) as T;
  }

  return value;
};

const LEGACY_RESPONSIBILITY_MATRIX_KEYS = [
  'No',
  'ITEM',
  'Responsibility_Buyer',
  'Responsibility_Design',
  'Responsibility_Seller',
  'Responsibility_Erection',
  'Responsibility_Supervision',
  'Responsibility_Commissioning',
];

const cloneResponsibilityMatrixRows = () =>
  RESPONSIBILITY_MATRIX_ROWS.map((row) => [...row]);

const hasExpectedResponsibilityHeaders = (rows: string[][]) => {
  const headerRow = rows[0] || [];
  const subHeaderRow = rows[1] || [];

  return (
    headerRow[0] === 'No.' &&
    headerRow[1] === 'ITEM' &&
    headerRow[2] === 'Responsibility' &&
    subHeaderRow[0] === 'No.' &&
    subHeaderRow[1] === 'ITEM' &&
    subHeaderRow[2] === 'BD' &&
    subHeaderRow[3] === 'BE' &&
    subHeaderRow[4] === 'DD' &&
    subHeaderRow[5] === 'SU' &&
    subHeaderRow[6] === 'ER' &&
    subHeaderRow[7] === 'COM'
  );
};

const isValidResponsibilityMatrixRows = (rows: string[][]) => {
  if (rows.length < 3) {
    return false;
  }

  if (!hasExpectedResponsibilityHeaders(rows)) {
    return false;
  }

  return rows.every((row) => row.length >= 8);
};

const normalizeResponsibilityMatrixRows = (value: unknown): unknown => {
  if (!Array.isArray(value)) {
    return value;
  }

  const hasObjectRows = value.some((row) => isPlainRecord(row));

  const normalizedRows = value.map((row) => {
    if (Array.isArray(row)) {
      return row.map((cell) => (cell == null ? '' : String(cell)));
    }

    if (isPlainRecord(row)) {
      return LEGACY_RESPONSIBILITY_MATRIX_KEYS.map((key) =>
        row[key] == null ? '' : String(row[key]),
      );
    }

    return [];
  });

  const resolvedRows = hasObjectRows
    ? [
      ...RESPONSIBILITY_MATRIX_ROWS.slice(0, 2).map((row) => [...row]),
      ...normalizedRows,
    ]
    : normalizedRows;

  return isValidResponsibilityMatrixRows(resolvedRows)
    ? resolvedRows
    : cloneResponsibilityMatrixRows();
};

const mergeDefaults = (defaults: any, current: any): any => {
  if (current === undefined || current === null) {
    return clone(defaults);
  }

  if (Array.isArray(defaults)) {
    // Preserve explicitly provided arrays (including empty arrays).
    // Previously empty arrays were replaced by defaults; that caused
    // empty-but-present sections to render with default content instead
    // of showing placeholders. Honor the caller's empty array as "intentionally empty".
    return Array.isArray(current) ? clone(current) : clone(defaults);
  }

  if (isPlainRecord(defaults)) {
    const currentRecord = isPlainRecord(current) ? current : {};
    const merged: Record<string, any> = {};

    Object.entries(defaults).forEach(([key, value]) => {
      merged[key] = mergeDefaults(value, currentRecord[key]);
    });

    Object.entries(currentRecord).forEach(([key, value]) => {
      if (!(key in merged)) {
        merged[key] = clone(value);
      }
    });

    return merged;
  }

  return clone(current);
};

export const mergeSectionContent = (
  sectionKey: string,
  content: Record<string, any> | undefined,
  context: DefaultContentContext = {},
): Record<string, any> => {
  const merged = mergeDefaults(getDefaultSectionContent(sectionKey, context), content || {});

  if (sectionKey === 'division_of_eng') {
    return {
      ...merged,
      matrix_rows: normalizeResponsibilityMatrixRows(merged.matrix_rows),
    };
  }

  return merged;
};

export const isRequiredPath = (sectionKey: string, path: string): boolean =>
  Boolean(
    REQUIRED_FIELD_HINTS[sectionKey]?.some(
      (hint) => path === hint.path || path.startsWith(`${hint.path}.`) || hint.path.startsWith(`${path}.`),
    ),
  );

export const getRequiredHint = (sectionKey: string, path: string): string | undefined =>
  REQUIRED_FIELD_HINTS[sectionKey]?.find(
    (hint) => path === hint.path || path.startsWith(`${hint.path}.`) || hint.path.startsWith(`${path}.`),
  )?.label;
