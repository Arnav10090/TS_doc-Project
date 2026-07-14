import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getImages } from "../../api/images";
import { useProjectStore } from "../../store/project.store";
import { useOptionalEditor } from "../../contexts/EditorContext";
import {
  BINDING_CONDITIONS_PARAGRAPHS,
  CYBERSECURITY_DISCLAIMER_PARAGRAPHS,
  DISCLAIMER_SECTIONS,
  EXECUTIVE_SUMMARY_PARAGRAPHS,
  EXCLUSION_INTRO_PARAGRAPHS,
  INTRODUCTION_PARAGRAPHS,
  POC_PARAGRAPHS,
  REMOTE_SUPPORT_PARAGRAPHS,
  RESPONSIBILITY_MATRIX_ROWS,
  SCOPE_SUPPLY_DEFINITION_LINES,
  VALUE_ADDITION_INTRO,
  WORK_COMPLETION_PARAGRAPHS,
} from "./templateContent";
import PageBreakWithButton from "./PageBreakWithButton";
import SectionTypeModal from "../modals/SectionTypeModal";
import {
  CustomSectionContent,
  CustomSubsection,
  getImageItems,
  getParagraphItems,
  getTableItems,
  isTableData,
  isImageData,
  isParagraphData,
} from "../../types/customSections";
import {
  getCustomSectionDisplayName,
  isCustomSectionKey,
  generateCustomSectionKey,
} from "../../utils/customSectionUtils";
import {
  isRequiredPath,
  mergeSectionContent,
} from "../sections/predefinedSectionContent";
import {
  getEditMetadata,
  stripEditMetadata,
  type EditMetadata,
} from "../../utils/editMetadata";

interface DocumentPreviewProps {
  projectId: string;
  activeSectionKey: string | null;
  activeSubsectionKey?: string | null;
  sectionContents: Record<string, Record<string, any>>;
  onSectionClick?: (sectionKey: string) => void;
  onSubsectionClick?: (sectionKey: string, subsectionKey: string) => void;
}

type PreviewImageType = "architecture" | "gantt_overall" | "gantt_shutdown";
type PreviewImageMap = Partial<Record<PreviewImageType, string>>;
type TocPageNumbers = Record<string, number>;

interface TocEntry {
  id: string;
  level: 1 | 2 | 3;
  numberLabel: string;
  label: string;
}

interface SectionWrapperProps {
  sectionKey: string;
  isActive: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  sectionRef: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
  tocId?: string;
  children: React.ReactNode;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25];
const REQUIRED_PREVIEW_COLOR = "#E60012";
const LAST_CHANGED_COLOR = "#17F131";
const LAST_CHANGED_SOFT = "rgba(23, 241, 49, 0.14)";
const LAST_CHANGED_FILL = "rgba(23, 241, 49, 0.18)";
const WORD_PAGE_WIDTH = "21.59cm";
const WORD_PAGE_HEIGHT = "27.94cm";
const WORD_PAGE_MARGIN = "2.54cm";
const EXECUTIVE_SUMMARY_IMAGE_SRC = "/Executive_summary.png";
const CLIENTS_IMAGE_SRC = "/Clients.png";

type RequiredFieldRef = {
  sectionKey: string;
  path: string;
};

const TEMPLATE_REQUIREMENTS: Record<string, RequiredFieldRef> = {
  SolutionFullName: { sectionKey: "cover", path: "solution_full_name" },
  ClientName: { sectionKey: "cover", path: "client_name" },
  CLIENTNAME: { sectionKey: "cover", path: "client_name" },
  ClientLocation: { sectionKey: "cover", path: "client_location" },
  CLIENTLOCATION: { sectionKey: "cover", path: "client_location" },
  TenderReference: { sectionKey: "introduction", path: "tender_reference" },
  TenderDate: { sectionKey: "introduction", path: "tender_date" },
  ExecutiveSummaryPara1: { sectionKey: "executive_summary", path: "para1" },
  ProcessFlowDescription: { sectionKey: "process_flow", path: "text" },
  SystemObjective: { sectionKey: "overview", path: "system_objective" },
  ExistingSystemDescription: { sectionKey: "overview", path: "existing_system" },
  TrainingPersons: { sectionKey: "customer_training", path: "persons" },
  TrainingDays: { sectionKey: "customer_training", path: "days" },
  FATCondition: { sectionKey: "fat_condition", path: "text" },
  ValueAddedOfferings: { sectionKey: "value_addition", path: "text" },
  PMDays: { sectionKey: "supervisors", path: "pm_days" },
  DevDays: { sectionKey: "supervisors", path: "dev_days" },
  CommDays: { sectionKey: "supervisors", path: "comm_days" },
  TotalManDays: { sectionKey: "supervisors", path: "total_man_days" },
  SW3_Name: { sectionKey: "software_specs", path: "rows.name" },
  TS2_Technology: { sectionKey: "tech_stack", path: "rows.technology" },
  POCName: { sectionKey: "poc", path: "name" },
  POCDescription: { sectionKey: "poc", path: "description" },
};

const stripHtml = (html: string): string => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
};

const resolveTemplateText = (
  text: string,
  replacements: Record<string, string>,
): string => {
  let resolved = text;

  Object.entries(replacements).forEach(([key, value]) => {
    const safeValue = value || "";
    resolved = resolved.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      safeValue,
    );
  });

  return resolved.replace(/\s+/g, " ").trim();
};

const filterFilledItems = (items?: string[]) =>
  (items || []).map((item) => item.trim()).filter(Boolean);

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  sectionKey,
  isActive,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  sectionRef,
  style,
  tocId,
  children,
}) => (
  <div
    ref={sectionRef}
    data-section-key={sectionKey}
    data-toc-id={tocId}
    style={style}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={onClick}
  >
    {isHovered && !isActive && (
      <div
        className="section-hover-indicator"
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          fontSize: "11px",
          color: "#E60012",
          fontWeight: 600,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        Click to edit {"->"}
      </div>
    )}
    {children}
  </div>
);

interface PaginatedWordPreviewProps {
  children: React.ReactNode;
  docFont: string;
  activeSectionKey: string | null;
  onSectionClick?: (sectionKey: string) => void;
  onSubsectionClick?: (sectionKey: string, subsectionKey: string) => void;
  onAddSectionClick: (insertAfterKey: string) => void;
  onTocPageNumbersChange?: (pageNumbers: TocPageNumbers) => void;
}

const PaginatedWordPreview: React.FC<PaginatedWordPreviewProps> = ({
  children,
  docFont,
  activeSectionKey,
  onSectionClick,
  onSubsectionClick,
  onAddSectionClick,
  onTocPageNumbersChange,
}) => {
  const visibleRootRef = useRef<HTMLDivElement | null>(null);
  const sourceContentRef = useRef<HTMLDivElement | null>(null);
  const sourceRootRef = useRef<HTMLDivElement | null>(null);

  if (!sourceRootRef.current && typeof document !== "undefined") {
    sourceRootRef.current = document.createElement("div");
  }

  const handlePreviewClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const addButton = target.closest(".add-section-button");

    if (addButton) {
      const breakElement = addButton.closest("[data-insert-after-key]");
      const insertAfterKey = breakElement?.getAttribute("data-insert-after-key");

      if (insertAfterKey) {
        onAddSectionClick(insertAfterKey);
      }
      return;
    }

    const subsectionElement = target.closest("[data-subsection-key]");
    if (subsectionElement) {
      const sectionKey = subsectionElement.getAttribute("data-section-key");
      const subsectionKey = subsectionElement.getAttribute("data-subsection-key");

      if (sectionKey && subsectionKey && onSubsectionClick) {
        onSubsectionClick(sectionKey, subsectionKey);
        return;
      }
    }

    const sectionElement = target.closest("[data-section-key]");
    const sectionKey = sectionElement?.getAttribute("data-section-key");

    if (sectionKey && onSectionClick) {
      onSectionClick(sectionKey);
    }
  };

  useLayoutEffect(() => {
    const visibleRoot = visibleRootRef.current;
    const sourceRoot = sourceRootRef.current;
    const sourceContent = sourceContentRef.current;

    if (!visibleRoot || !sourceRoot || !sourceContent) {
      return;
    }

    const configureSourceRoot = () => {
      sourceRoot.className = "word-pagination-source-root";
      sourceRoot.style.position = "absolute";
      sourceRoot.style.left = "-100000px";
      sourceRoot.style.top = "0";
      sourceRoot.style.visibility = "hidden";
      sourceRoot.style.pointerEvents = "none";
      sourceRoot.style.zIndex = "-1";
      sourceRoot.style.width = `calc(${WORD_PAGE_WIDTH} - (${WORD_PAGE_MARGIN} * 2))`;
    };

    const paginate = () => {
      configureSourceRoot();

      if (!sourceRoot.isConnected) {
        document.body.appendChild(sourceRoot);
      }

      visibleRoot.innerHTML = "";

      const pagesRoot = document.createElement("div");
      pagesRoot.className = "word-preview-pages";
      visibleRoot.appendChild(pagesRoot);

      let currentContent = createPage(pagesRoot);

      const overflowsPage = () =>
        currentContent.scrollHeight - currentContent.clientHeight > 2;

      const hasContent = (element: Element) =>
        Array.from(element.childNodes).some((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return Boolean(node.textContent?.trim());
          }

          if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
          }

          const child = node as HTMLElement;
          return !child.classList.contains("section-hover-indicator");
        });

      const startNewPage = () => {
        currentContent = createPage(pagesRoot);
        return currentContent;
      };

      const appendSeparator = (node: Element) => {
        if (!hasContent(currentContent)) {
          currentContent.closest(".word-preview-page")?.remove();
        }

        pagesRoot.appendChild(node.cloneNode(true));
        startNewPage();
      };

      const appendTable = (
        table: HTMLTableElement,
        ensureParent: () => HTMLElement,
        startNewParent: () => HTMLElement,
      ) => {
        const thead = table.querySelector(":scope > thead");
        const colgroups = Array.from(table.querySelectorAll(":scope > colgroup"));
        const directRows = Array.from(table.querySelectorAll(":scope > tbody > tr"));
        const fallbackRows =
          directRows.length > 0
            ? directRows
            : Array.from(table.rows).filter((row) => !thead?.contains(row));
        const repeatedBodyRows =
          !thead && fallbackRows.length > 12 ? fallbackRows.slice(0, 2) : [];
        let isFirstChunk = true;
        let parent = ensureParent();
        let tableClone: HTMLTableElement;
        let tbodyClone: HTMLTableSectionElement;

        const appendNewTable = () => {
          tableClone = table.cloneNode(false) as HTMLTableElement;
          colgroups.forEach((colgroup) =>
            tableClone.appendChild(colgroup.cloneNode(true)),
          );

          if (thead) {
            tableClone.appendChild(thead.cloneNode(true));
          }

          tbodyClone = document.createElement("tbody");

          if (!isFirstChunk) {
            repeatedBodyRows.forEach((row) =>
              tbodyClone.appendChild(row.cloneNode(true)),
            );
          }

          tableClone.appendChild(tbodyClone);
          parent.appendChild(tableClone);
        };

        appendNewTable();

        fallbackRows.forEach((row) => {
          const rowClone = row.cloneNode(true);
          tbodyClone.appendChild(rowClone);

          if (!overflowsPage()) {
            return;
          }

          tbodyClone.removeChild(rowClone);
          const bodyRowsInChunk =
            tbodyClone.rows.length - (isFirstChunk ? 0 : repeatedBodyRows.length);

          if (bodyRowsInChunk > 0) {
            isFirstChunk = false;
            parent = startNewParent();
            appendNewTable();
            tbodyClone.appendChild(rowClone);
            return;
          }

          tbodyClone.appendChild(rowClone);
        });
      };

      const appendElementByChildren = (element: HTMLElement) => {
        let shell: HTMLElement | null = null;

        const ensureShell = () => {
          if (!shell || shell.parentElement !== currentContent) {
            shell = element.cloneNode(false) as HTMLElement;
            currentContent.appendChild(shell);
          }

          return shell;
        };

        const startNewShell = () => {
          startNewPage();
          shell = null;
          return ensureShell();
        };

        Array.from(element.childNodes).forEach((child) => {
          if (
            child.nodeType === Node.TEXT_NODE &&
            !child.textContent?.trim()
          ) {
            return;
          }

          if (
            child.nodeType === Node.ELEMENT_NODE &&
            (child as HTMLElement).tagName === "TABLE"
          ) {
            appendTable(child as HTMLTableElement, ensureShell, startNewShell);
            return;
          }

          const parent = ensureShell();
          const childClone = child.cloneNode(true);
          parent.appendChild(childClone);

          if (!overflowsPage()) {
            return;
          }

          parent.removeChild(childClone);

          if (hasContent(parent)) {
            const nextParent = startNewShell();
            nextParent.appendChild(childClone);
            return;
          }

          parent.appendChild(childClone);
        });
      };

      const appendFlowNode = (node: ChildNode) => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        const element = node as HTMLElement;

        if (element.classList.contains("page-break-with-button")) {
          appendSeparator(element);
          return;
        }

        if (element.tagName === "TABLE") {
          appendTable(
            element as HTMLTableElement,
            () => currentContent,
            () => startNewPage(),
          );
          return;
        }

        const clone = element.cloneNode(true);
        currentContent.appendChild(clone);

        if (!overflowsPage()) {
          return;
        }

        currentContent.removeChild(clone);

        if (hasContent(currentContent)) {
          startNewPage();
        }

        if (element.children.length > 1) {
          appendElementByChildren(element);
          return;
        }

        currentContent.appendChild(clone);
      };

      Array.from(sourceContent.childNodes).forEach(appendFlowNode);

      const lastPage = pagesRoot.lastElementChild as HTMLElement | null;
      const lastContent = lastPage?.querySelector(".word-preview-page-content");
      if (lastPage && lastContent && !hasContent(lastContent)) {
        lastPage.remove();
      }

      const nextTocPageNumbers: TocPageNumbers = {};
      Array.from(
        pagesRoot.querySelectorAll<HTMLElement>(".word-preview-page"),
      ).forEach((page, pageIndex) => {
        Array.from(page.querySelectorAll<HTMLElement>("[data-toc-id]")).forEach(
          (element) => {
            const tocId = element.getAttribute("data-toc-id");
            if (tocId && !(tocId in nextTocPageNumbers)) {
              nextTocPageNumbers[tocId] = pageIndex + 1;
            }
          },
        );
      });
      onTocPageNumbersChange?.(nextTocPageNumbers);

      if (activeSectionKey) {
        const activeElement = Array.from(
          visibleRoot.querySelectorAll<HTMLElement>("[data-section-key]"),
        ).find(
          (element) =>
            element.getAttribute("data-section-key") === activeSectionKey,
        );

        if (typeof activeElement?.scrollIntoView === "function") {
          activeElement.scrollIntoView({ block: "center" });
        }
      }

      sourceRoot.remove();
    };

    paginate();
    const animationFrame = window.requestAnimationFrame(paginate);
    const timeout = window.setTimeout(paginate, 250);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
      sourceRoot.remove();
    };
  }, [
    activeSectionKey,
    children,
    docFont,
    onAddSectionClick,
    onSectionClick,
    onSubsectionClick,
    onTocPageNumbersChange,
  ]);

  const portal =
    sourceRootRef.current &&
    createPortal(
      <div
        ref={sourceContentRef}
        className="word-pagination-source-content"
        style={{
          fontFamily: docFont,
          fontSize: "11pt",
          lineHeight: "1.5",
        }}
      >
        {children}
      </div>,
      sourceRootRef.current,
    );

  return (
    <>
      <div
        ref={visibleRootRef}
        className="word-preview-paginated"
        onClick={handlePreviewClick}
      />
      {portal}
    </>
  );
};

const createPage = (pagesRoot: HTMLElement): HTMLDivElement => {
  const page = document.createElement("div");
  page.className = "word-preview-page";

  const content = document.createElement("div");
  content.className = "word-preview-page-content";

  page.appendChild(content);
  pagesRoot.appendChild(page);

  return content;
};

const DocumentPreview: React.FC<DocumentPreviewProps> = React.memo(
  ({
    projectId,
    activeSectionKey,
    activeSubsectionKey,
    sectionContents,
    onSectionClick,
    onSubsectionClick,
  }) => {
    const {
      solutionName,
      solutionFullName,
      clientName,
      clientLocation,
      sectionCompletion,
    } = useProjectStore();

    const editorContext = useOptionalEditor();
    const refreshSections = editorContext?.refreshSections || (async () => {});

    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [hoveredSection, setHoveredSection] = useState<string | null>(null);
    const [imageUrls, setImageUrls] = useState<PreviewImageMap>({});
    const [tocPageNumbers, setTocPageNumbers] = useState<TocPageNumbers>({});
    const [zoom, setZoom] = useState<number>(() => {
      const saved = localStorage.getItem("documentPreviewZoom");
      return saved ? parseFloat(saved) : 1;
    });

    // State for Section Type Modal
    const [isSectionTypeModalOpen, setIsSectionTypeModalOpen] = useState(false);
    const [pendingInsertAfterKey, setPendingInsertAfterKey] = useState<string>('');

    // Counter management for section and subsection numbering
    const sectionCounter = useRef<number>(0);
    const subsectionCounter = useRef<number>(0);

    const completedCount = useMemo(() => {
      const excludedSections = [
        "binding_conditions",
        "cybersecurity",
        "disclaimer",
        "scope_definitions",
        "list_of_figures_tables",
      ];

      return Object.entries(sectionCompletion).filter(
        ([key, isComplete]) => !excludedSections.includes(key) && isComplete,
      ).length;
    }, [sectionCompletion]);

    const totalCompletable = sectionContents
      ? Object.keys(sectionContents).length - 5
      : 27;

    const getSectionContent = (key: string): Record<string, any> => {
      const content = stripEditMetadata(sectionContents[key] || {}) || {};

      if (isCustomSectionKey(key)) {
        return content;
      }

      return mergeSectionContent(key, content, {
        solutionName,
        solutionFullName,
        clientName,
        clientLocation,
      });
    };

    const editMetadataBySection = useMemo(() => {
      const metadataMap: Record<string, EditMetadata> = {};

      Object.entries(sectionContents).forEach(([key, content]) => {
        const metadata = getEditMetadata(content);
        if (metadata) {
          metadataMap[key] = metadata;
        }
      });

      return metadataMap;
    }, [sectionContents]);

    const latestEditTimestamp = useMemo(() => {
      const timestamps = Object.values(editMetadataBySection).flatMap((metadata) =>
        Object.values(metadata.markers).map((marker) => marker.updatedAt),
      );

      return timestamps
        .filter(Boolean)
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
    }, [editMetadataBySection]);

    const sectionExists = (key: string): boolean => key in sectionContents;

    useEffect(() => {
      if (activeSectionKey && sectionRefs.current[activeSectionKey]) {
        const activeSectionElement = sectionRefs.current[activeSectionKey];

        if (typeof activeSectionElement?.scrollIntoView === "function") {
          activeSectionElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }, [activeSectionKey]);

    useEffect(() => {
      localStorage.setItem("documentPreviewZoom", zoom.toString());
    }, [zoom]);

    useEffect(() => {
      let cancelled = false;

      const loadImages = async () => {
        try {
          const images = await getImages(projectId);
          if (cancelled) return;

          const next: PreviewImageMap = {};
          images.forEach((image) => {
            if (
              image.type === "architecture" ||
              image.type === "gantt_overall" ||
              image.type === "gantt_shutdown"
            ) {
              next[image.type] = image.url;
            }
          });
          setImageUrls(next);
        } catch (error) {
          if (!cancelled) {
            setImageUrls({});
          }
          console.error("Failed to load preview images:", error);
        }
      };

      const handleImagesChanged = (event: Event) => {
        const customEvent = event as CustomEvent<{ projectId?: string }>;
        if (
          !customEvent.detail?.projectId ||
          customEvent.detail.projectId === projectId
        ) {
          void loadImages();
        }
      };

      void loadImages();
      window.addEventListener(
        "project-images-changed",
        handleImagesChanged as EventListener,
      );

      return () => {
        cancelled = true;
        window.removeEventListener(
          "project-images-changed",
          handleImagesChanged as EventListener,
        );
      };
    }, [projectId]);

    const handleZoomIn = () => {
      const currentIndex = ZOOM_LEVELS.indexOf(zoom);
      if (currentIndex < ZOOM_LEVELS.length - 1) {
        setZoom(ZOOM_LEVELS[currentIndex + 1]);
      }
    };

    const handleZoomOut = () => {
      const currentIndex = ZOOM_LEVELS.indexOf(zoom);
      if (currentIndex > 0) {
        setZoom(ZOOM_LEVELS[currentIndex - 1]);
      }
    };

    const handleFitWidth = () => {
      setZoom(1);
    };

    const handleTocPageNumbersChange = useCallback(
      (nextPageNumbers: TocPageNumbers) => {
        setTocPageNumbers((currentPageNumbers) => {
          const currentKeys = Object.keys(currentPageNumbers);
          const nextKeys = Object.keys(nextPageNumbers);

          if (
            currentKeys.length === nextKeys.length &&
            currentKeys.every(
              (key) => currentPageNumbers[key] === nextPageNumbers[key],
            )
          ) {
            return currentPageNumbers;
          }

          return nextPageNumbers;
        });
      },
      [],
    );

    const documentContent = useMemo(() => {
      return {
        coverContent: getSectionContent("cover"),
        revisionHistory: getSectionContent("revision_history"),
        executiveSummary: getSectionContent("executive_summary"),
        introduction: getSectionContent("introduction"),
        abbreviations: getSectionContent("abbreviations"),
        processFlow: getSectionContent("process_flow"),
        overview: getSectionContent("overview"),
        features: getSectionContent("features"),
        remoteSupport: getSectionContent("remote_support"),
        documentationControl: getSectionContent("documentation_control"),
        customerTraining: getSectionContent("customer_training"),
        systemConfig: getSectionContent("system_config"),
        techStack: getSectionContent("tech_stack"),
        hardwareSpecs: getSectionContent("hardware_specs"),
        softwareSpecs: getSectionContent("software_specs"),
        thirdPartySw: getSectionContent("third_party_sw"),
        overallGantt: getSectionContent("overall_gantt"),
        shutdownGantt: getSectionContent("shutdown_gantt"),
        fatCondition: getSectionContent("fat_condition"),
        supervisors: getSectionContent("supervisors"),
        scopeDefinitions: getSectionContent("scope_definitions"),
        divisionOfEng: getSectionContent("division_of_eng"),
        workCompletion: getSectionContent("work_completion"),
        buyerObligations: getSectionContent("buyer_obligations"),
        exclusionList: getSectionContent("exclusion_list"),
        valueAddition: getSectionContent("value_addition"),
        buyerPrerequisites: getSectionContent("buyer_prerequisites"),
        bindingConditions: getSectionContent("binding_conditions"),
        cybersecurity: getSectionContent("cybersecurity"),
        disclaimer: getSectionContent("disclaimer"),
        poc: getSectionContent("poc"),
        listOfFiguresTables: getSectionContent("list_of_figures_tables"),
      };
    }, [sectionContents]);

    const coverSolutionName =
      documentContent.coverContent.solution_full_name ||
      solutionFullName ||
      solutionName;
    const coverClientName =
      documentContent.coverContent.client_name || clientName;
    const coverClientLocation =
      documentContent.coverContent.client_location || clientLocation;
    const coverRefNumber =
      documentContent.coverContent.ref_number || "26/XXXX/XXXXX/v0";
    const coverDate = documentContent.coverContent.doc_date || "23rd Jan 2026";
    const coverVersion = documentContent.coverContent.doc_version || "0";

    const revisionRows =
      documentContent.revisionHistory.rows?.length > 0
        ? documentContent.revisionHistory.rows
        : [
            {
              sr_no: 1,
              revised_by: "",
              checked_by: "",
              approved_by: "",
              details: "First issue",
              date: "23-01-2026",
              rev_no: "0",
            },
          ];

    const techRows = documentContent.techStack.rows || [];
    const hardwareRows = documentContent.hardwareSpecs.rows || [];
    const softwareRows = documentContent.softwareSpecs.rows || [];
    const featureItems = documentContent.features.items || [];
    const documentationControlItems = [
      ...filterFilledItems(documentContent.documentationControl.items),
      ...filterFilledItems(documentContent.documentationControl.custom_items),
    ];
    const workCompletionCriteria = [
      ...filterFilledItems(documentContent.workCompletion.criteria),
      ...filterFilledItems(documentContent.workCompletion.custom_items),
    ];
    const buyerObligationItems = [
      ...filterFilledItems(documentContent.buyerObligations.items),
      ...filterFilledItems(documentContent.buyerObligations.custom_items),
    ];
    const exclusionItems = [
      ...filterFilledItems(documentContent.exclusionList.items),
      ...filterFilledItems(documentContent.exclusionList.custom_items),
    ];
    const buyerPrerequisites = filterFilledItems(
      documentContent.buyerPrerequisites.items,
    );

    const templateReplacements = useMemo<Record<string, string>>(
      () => ({
        ExecutiveSummaryPara1: stripHtml(
          documentContent.executiveSummary.para1 || "",
        ),
        SolutionName: solutionName || "{SolutionName}",
        SolutionFullName: coverSolutionName || "{SolutionFullName}",
        ClientName: coverClientName || "{ClientName}",
        CLIENTNAME: coverClientName || "{CLIENTNAME}",
        ClientLocation: coverClientLocation || "{ClientLocation}",
        CLIENTLOCATION: coverClientLocation || "{CLIENTLOCATION}",
        ClientAbbreviation: coverClientName || "{ClientAbbreviation}",
        TenderReference:
          documentContent.introduction.tender_reference || "{TenderReference}",
        TenderDate: documentContent.introduction.tender_date || "{TenderDate}",
        ProcessFlowDescription:
          stripHtml(documentContent.processFlow.text || "") ||
          "{ProcessFlowDescription}",
        SystemObjective:
          stripHtml(documentContent.overview.system_objective || "") ||
          "{SystemObjective}",
        ExistingSystemDescription:
          stripHtml(documentContent.overview.existing_system || "") ||
          "{ExistingSystemDescription}",
        IntegrationDescription:
          stripHtml(documentContent.overview.integration || "") ||
          "{IntegrationDescription}",
        TangibleBenefits:
          stripHtml(documentContent.overview.tangible_benefits || "") ||
          "{TangibleBenefits}",
        IntangibleBenefits:
          stripHtml(documentContent.overview.intangible_benefits || "") ||
          "{IntangibleBenefits}",
        TrainingPersons:
          documentContent.customerTraining.persons || "[TrainingPersons]",
        TrainingDays: documentContent.customerTraining.days || "[TrainingDays]",
        FATCondition:
          stripHtml(documentContent.fatCondition.text || "") ||
          "{FATCondition}",
        ValueAddedOfferings:
          stripHtml(documentContent.valueAddition.text || "") ||
          "{ValueAddedOfferings}",
        PMDays: documentContent.supervisors.pm_days || "[PMDays]",
        DevDays: documentContent.supervisors.dev_days || "[DevDays]",
        CommDays: documentContent.supervisors.comm_days || "[CommDays]",
        TotalManDays:
          documentContent.supervisors.total_man_days || "[TotalManDays]",
        SW3_Name: softwareRows[2]?.name || "{SW3_Name}",
        TS4_Component: techRows[3]?.component || "{TS4_Component}",
        TS2_Technology: techRows[1]?.technology || "{TS2_Technology}",
        POCName: documentContent.poc.name || "[POC Name]",
        POCDescription:
          stripHtml(documentContent.poc.description || "") ||
          "[POC Description]",
      }),
      [
        coverClientLocation,
        coverClientName,
        coverSolutionName,
        documentContent.customerTraining.days,
        documentContent.customerTraining.persons,
        documentContent.executiveSummary.para1,
        documentContent.fatCondition.text,
        documentContent.introduction.tender_date,
        documentContent.introduction.tender_reference,
        documentContent.overview.existing_system,
        documentContent.overview.integration,
        documentContent.overview.intangible_benefits,
        documentContent.overview.system_objective,
        documentContent.overview.tangible_benefits,
        documentContent.poc.description,
        documentContent.poc.name,
        documentContent.processFlow.text,
        documentContent.supervisors.comm_days,
        documentContent.supervisors.dev_days,
        documentContent.supervisors.pm_days,
        documentContent.supervisors.total_man_days,
        documentContent.valueAddition.text,
        softwareRows,
        solutionName,
        techRows,
      ],
    );

    const matrixRows = useMemo(
      () => documentContent.divisionOfEng.matrix_rows || RESPONSIBILITY_MATRIX_ROWS,
      [documentContent.divisionOfEng.matrix_rows],
    );

    const resolvedMatrixRows = useMemo(
      () =>
        matrixRows.map((row: string[]) =>
          row.map((cell) => resolveTemplateText(cell, templateReplacements)),
        ),
      [matrixRows, templateReplacements],
    );

    // Separate custom sections from predefined sections
    const { customSections } = useMemo(() => {
      const predefined: Record<string, Record<string, any>> = {};
      const custom: Record<string, CustomSectionContent> = {};

      Object.entries(sectionContents).forEach(([key, content]) => {
        const cleanContent = stripEditMetadata(content || {}) || {};
        if (isCustomSectionKey(key)) {
          custom[key] = cleanContent as CustomSectionContent;
        } else {
          predefined[key] = cleanContent;
        }
      });

      return { predefinedSections: predefined, customSections: custom };
    }, [sectionContents]);

    // ── Collect all figures and tables across the document in order ──
    interface FigureEntry { sNo: number; figNo: string; name: string; }
    interface TableEntry { sNo: number; tableNo: string; name: string; }

    const { figureEntries, tableEntries } = useMemo(() => {
      const figures: FigureEntry[] = [];
      const tables: TableEntry[] = [];
      let figCounter = 0;
      let tblCounter = 0;

      // Helper: collect figures/tables from custom sections inserted after a given key
      const collectFromCustomSectionsAfter = (afterKey: string) => {
        const customAfter = Object.entries(customSections).filter(
          ([, content]) => content.insertAfterKey === afterKey,
        );
        customAfter.forEach(([csKey, content]) => {
          (content.subsections || []).forEach((sub) => {
            if (sub.contentType === 'image' && isImageData(sub.data)) {
              const images = getImageItems(sub.data);
              images.forEach((img) => {
                figCounter += 1;
                figures.push({
                  sNo: figures.length + 1,
                  figNo: `Fig ${figCounter}`,
                  name: img.caption || sub.name || `Figure ${figCounter}`,
                });
              });
            }
            if (sub.contentType === 'table' && isTableData(sub.data)) {
              const tbs = getTableItems(sub.data);
              tbs.forEach((tb) => {
                tblCounter += 1;
                tables.push({
                  sNo: tables.length + 1,
                  tableNo: `Table ${tblCounter}`,
                  name: tb.caption || sub.name || `Table ${tblCounter}`,
                });
              });
            }
          });
          // Recurse for nested custom sections
          collectFromCustomSectionsAfter(csKey);
        });
      };

      // Walk document in render order, collecting predefined figures/tables
      // then custom sections after each predefined section

      // Cover & Revision History: no figures, 1 table (revision history)
      if (sectionExists('revision_history')) {
        tblCounter += 1;
        tables.push({ sNo: tables.length + 1, tableNo: `Table ${tblCounter}`, name: 'Revision History' });
      }
      collectFromCustomSectionsAfter('cover');
      collectFromCustomSectionsAfter('revision_history');

      // Executive Summary
      collectFromCustomSectionsAfter('executive_summary');

      // General Overview group
      collectFromCustomSectionsAfter('introduction');

      if (sectionExists('abbreviations')) {
        tblCounter += 1;
        tables.push({ sNo: tables.length + 1, tableNo: `Table ${tblCounter}`, name: 'Abbreviations' });
      }
      collectFromCustomSectionsAfter('abbreviations');
      collectFromCustomSectionsAfter('process_flow');
      collectFromCustomSectionsAfter('overview');

      // Offerings group
      collectFromCustomSectionsAfter('features');
      collectFromCustomSectionsAfter('remote_support');
      collectFromCustomSectionsAfter('documentation_control');
      collectFromCustomSectionsAfter('customer_training');

      if (sectionExists('system_config')) {
        figCounter += 1;
        figures.push({ sNo: figures.length + 1, figNo: `Fig ${figCounter}`, name: 'System Architecture Diagram' });
      }
      collectFromCustomSectionsAfter('system_config');
      collectFromCustomSectionsAfter('fat_condition');

      // Technology Stack group
      if (sectionExists('tech_stack')) {
        tblCounter += 1;
        tables.push({ sNo: tables.length + 1, tableNo: `Table ${tblCounter}`, name: 'Technology Stack' });
      }
      collectFromCustomSectionsAfter('tech_stack');

      if (sectionExists('hardware_specs')) {
        tblCounter += 1;
        tables.push({ sNo: tables.length + 1, tableNo: `Table ${tblCounter}`, name: 'Hardware Specifications' });
      }
      collectFromCustomSectionsAfter('hardware_specs');

      if (sectionExists('software_specs')) {
        tblCounter += 1;
        tables.push({ sNo: tables.length + 1, tableNo: `Table ${tblCounter}`, name: 'Software Specifications' });
      }
      collectFromCustomSectionsAfter('software_specs');
      collectFromCustomSectionsAfter('third_party_sw');

      // Schedule group
      if (sectionExists('overall_gantt')) {
        figCounter += 1;
        figures.push({ sNo: figures.length + 1, figNo: `Fig ${figCounter}`, name: 'Overall Gantt Chart' });
      }
      collectFromCustomSectionsAfter('overall_gantt');

      if (sectionExists('shutdown_gantt')) {
        figCounter += 1;
        figures.push({ sNo: figures.length + 1, figNo: `Fig ${figCounter}`, name: 'Shutdown Gantt Chart' });
      }
      collectFromCustomSectionsAfter('shutdown_gantt');

      if (sectionExists('supervisors')) {
        tblCounter += 1;
        tables.push({ sNo: tables.length + 1, tableNo: `Table ${tblCounter}`, name: 'Supervisors' });
      }
      collectFromCustomSectionsAfter('supervisors');

      // Scope of Supply group
      if (sectionExists('division_of_eng')) {
        tblCounter += 1;
        tables.push({ sNo: tables.length + 1, tableNo: `Table ${tblCounter}`, name: 'Division of Engineering Responsibility Matrix' });
      }
      collectFromCustomSectionsAfter('scope_definitions');
      collectFromCustomSectionsAfter('division_of_eng');
      collectFromCustomSectionsAfter('value_addition');
      collectFromCustomSectionsAfter('work_completion');
      collectFromCustomSectionsAfter('buyer_obligations');
      collectFromCustomSectionsAfter('exclusion_list');
      collectFromCustomSectionsAfter('buyer_prerequisites');
      collectFromCustomSectionsAfter('binding_conditions');
      collectFromCustomSectionsAfter('cybersecurity');

      // Legal group
      collectFromCustomSectionsAfter('disclaimer');
      collectFromCustomSectionsAfter('poc');

      return { figureEntries: figures, tableEntries: tables };
    }, [customSections, sectionContents]);

    const getCustomSectionsAfter = (afterKey: string) =>
      Object.entries(customSections).filter(
        ([_, content]) => content.insertAfterKey === afterKey,
      );

    const isInlineSubsectionSection = (content: CustomSectionContent) =>
      content.displayMode === 'subsection';

    // Inline subsections stay on the current page; only full sections get a page break.
    const renderInsertionsAfter = (
      afterKey: string,
      appendBreakAfterLast: boolean = true,
    ) => {
      const sectionsToRender = getCustomSectionsAfter(afterKey);
      const inlineSections = sectionsToRender.filter(([_, content]) =>
        isInlineSubsectionSection(content),
      );
      const topLevelSections = sectionsToRender.filter(
        ([_, content]) => !isInlineSubsectionSection(content),
      );

      if (sectionsToRender.length === 0) {
        return appendBreakAfterLast ? (
          <PageBreakWithButton
            insertAfterKey={afterKey}
            onAddClick={handleAddSectionClick}
          />
        ) : null;
      }

      return (
        <>
          {inlineSections.map(([sectionKey]) => (
            <React.Fragment key={sectionKey}>
              {renderInlineCustomSubsectionSection(sectionKey, sectionCounter.current)}
              {renderInsertionsAfter(sectionKey, false)}
            </React.Fragment>
          ))}
          {(topLevelSections.length > 0 || appendBreakAfterLast) && (
            <PageBreakWithButton
              insertAfterKey={afterKey}
              onAddClick={handleAddSectionClick}
            />
          )}
          {topLevelSections.map(([sectionKey], index) => {
            const sectionNumber = getNextSectionNumber();
            const hasFollowingSibling = index < topLevelSections.length - 1;

            return (
              <React.Fragment key={sectionKey}>
                {renderCustomSection(sectionKey, sectionNumber)}
                {renderInsertionsAfter(
                  sectionKey,
                  hasFollowingSibling || appendBreakAfterLast,
                )}
              </React.Fragment>
            );
          })}
        </>
      );
    };

    const isActive = (sectionKey: string) => activeSectionKey === sectionKey;
    const isActiveSubsection = (subsectionKey: string) =>
      activeSubsectionKey === subsectionKey;

    const sectionStyle = (sectionKey: string): React.CSSProperties => ({
      position: "relative",
      cursor: onSectionClick ? "pointer" : "default",
      transition: "all 0.2s ease",
      marginBottom: "24px",
      ...(hasSectionEdits(sectionKey) &&
        sectionKey !== "cover" && {
          borderLeft: `3px solid ${LAST_CHANGED_COLOR}`,
          paddingLeft: "8px",
          marginLeft: "-8px",
        }),
      ...(hasSectionEdits(sectionKey) &&
        sectionKey === "cover" && {
          boxShadow: `inset 3px 0 0 ${LAST_CHANGED_COLOR}`,
        }),
      ...(isActive(sectionKey) &&
        sectionKey !== "cover" && {
          background: "#FFF9C4",
          borderLeft: "3px solid #E60012",
          borderRadius: "2px",
          paddingLeft: "8px",
          marginLeft: "-8px",
        }),
      ...(isActive(sectionKey) &&
        sectionKey === "cover" && {
          background: "#FFF9C4",
        }),
      ...(hoveredSection === sectionKey &&
        !isActive(sectionKey) &&
        sectionKey !== "cover" && {
          border: "1px solid #BFDBFE",
          borderRadius: "2px",
          padding: "4px",
          margin: "-4px -4px 20px",
        }),
      ...(hoveredSection === sectionKey &&
        !isActive(sectionKey) &&
        sectionKey === "cover" && {
          opacity: 0.9,
        }),
    });

    const subsectionStyle = (subsectionKey: string): React.CSSProperties => ({
      position: "relative",
      cursor: onSubsectionClick || onSectionClick ? "pointer" : "default",
      padding: "8px 12px",
      margin: "0 -12px 16px",
      borderRadius: "4px",
      transition: "all 0.2s ease",
      ...(isActiveSubsection(subsectionKey) && {
        background: "#FFF5F5",
        outline: "2px solid #E60012",
      }),
    });

    // ─── STYLE CONSTANTS (updated to match TS_Template_original.docx) ───────

    // Document font: Hitachi Sans with Arial fallback (matches template font)
    const DOC_FONT = "'Hitachi Sans', Arial, sans-serif";

    const heading1BurgundyStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: "16pt",
      fontWeight: "bold",
      color: "#000000", // Changed to black
      marginTop: "16px", // 12pt space-before (matches template)
      marginBottom: "12px",
      textTransform: "uppercase",
    };

    const heading1RedStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: "16pt",
      fontWeight: "bold",
      color: "#000000", // Changed to black
      marginTop: "16px",
      marginBottom: "12px",
      textTransform: "uppercase",
    };

    const heading1BlueStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: "16pt",
      fontWeight: "bold",
      color: "#000000", // Changed to black
      marginTop: "16px",
      marginBottom: "12px",
      textTransform: "uppercase",
    };

    const heading2BlackStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: "12pt",
      fontWeight: "bold",
      color: "#000000",
      marginTop: "12px",
      marginBottom: "10px",
    };

    const heading2RedStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: "12pt",
      fontWeight: "bold",
      color: "#000000", // Changed to black
      marginTop: "12px",
      marginBottom: "10px",
      textTransform: "uppercase",
    };

    const heading2BlueStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: "12pt",
      fontWeight: "bold",
      color: "#000000", // Changed to black
      marginTop: "12px",
      marginBottom: "10px",
      textTransform: "uppercase",
    };

    const heading3RedStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: "11pt",
      fontWeight: "bold",
      color: "#000000", // Changed to black
      marginTop: "10px",
      marginBottom: "8px",
    };

    // Body text: justified alignment matches template (WD_ALIGN_PARAGRAPH.JUSTIFY)
    const bodyParagraphStyle: React.CSSProperties = {
      marginBottom: "8px",
      textAlign: "justify",
    };

    const bulletListStyle: React.CSSProperties = {
      margin: "0 0 12px 22px",
      paddingLeft: "18px",
    };

    const bulletListItemStyle: React.CSSProperties = {
      marginBottom: "4px",
      paddingLeft: "2px",
      textAlign: "justify",
    };

    const labelParagraphStyle: React.CSSProperties = {
      ...bodyParagraphStyle,
      fontWeight: "bold",
      marginBottom: "4px",
      textAlign: "left",
    };

    const noteParagraphStyle: React.CSSProperties = {
      marginBottom: "8px",
      fontSize: "10pt",
      fontStyle: "italic",
      color: "#4F81BD", // Blue color for notes
      textAlign: "left",
    };

    const tocEntryBaseStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "baseline",
      gap: "8px",
      width: "100%",
      marginBottom: "4px",
      color: "#000000",
      fontFamily: DOC_FONT,
      fontSize: "10.5pt",
      lineHeight: "1.2",
    };

    const tocLeaderStyle: React.CSSProperties = {
      flex: 1,
      minWidth: "12px",
      borderBottom: "1px dotted #000000",
      transform: "translateY(-2px)",
    };

    const tocPageNumberStyle: React.CSSProperties = {
      minWidth: "18px",
      textAlign: "right",
      fontVariantNumeric: "tabular-nums",
    };

    const tableStyle: React.CSSProperties = {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "10pt",
      marginBottom: "12px",
    };

    // Base table header - no background (overridden per-table below)
    const tableHeaderStyle: React.CSSProperties = {
      fontWeight: "bold",
      padding: "4px 8px",
      border: "1px solid #000",
      textAlign: "left",
      verticalAlign: "top",
    };

    const tableCellStyle: React.CSSProperties = {
      padding: "4px 8px",
      border: "1px solid #000",
      verticalAlign: "top",
    };

    const matrixCellStyle: React.CSSProperties = {
      padding: "3px 4px",
      border: "1px solid #000",
      verticalAlign: "top",
      fontSize: "8.5pt",
      textAlign: "center",
    };

    const matrixItemCellStyle: React.CSSProperties = {
      ...matrixCellStyle,
      textAlign: "left",
    };

    const placeholderStyle: React.CSSProperties = {
      fontStyle: "italic",
      color: "#6B7280",
    };

    const requiredTextStyle: React.CSSProperties = {
      color: REQUIRED_PREVIEW_COLOR,
    };

    const requiredPlaceholderStyle: React.CSSProperties = {
      ...placeholderStyle,
      color: REQUIRED_PREVIEW_COLOR,
    };

    const normalizeEditPath = (path: string) =>
      path.replace(/\.\d+(?=\.|$)/g, "");

    const getSectionEditMetadata = (sectionKey: string) =>
      editMetadataBySection[sectionKey];

    const getEditedMarker = (sectionKey: string, path: string) => {
      const metadata = getSectionEditMetadata(sectionKey);
      if (!metadata || !latestEditTimestamp) {
        return undefined;
      }

      const normalizedPath = normalizeEditPath(path);

      return Object.values(metadata.markers).find((marker) => {
        if (marker.updatedAt !== latestEditTimestamp) {
          return false;
        }

        const markerPath = marker.path;
        const normalizedMarkerPath = normalizeEditPath(markerPath);

        return (
          markerPath === path ||
          markerPath.startsWith(`${path}.`) ||
          normalizedMarkerPath === normalizedPath ||
          normalizedMarkerPath.startsWith(`${normalizedPath}.`)
        );
      });
    };

    const isEditedPath = (sectionKey: string, path: string): boolean =>
      Boolean(getEditedMarker(sectionKey, path));

    const hasSectionEdits = (sectionKey: string) => {
      const metadata = getSectionEditMetadata(sectionKey);

      return Boolean(
        metadata &&
          latestEditTimestamp &&
          Object.values(metadata.markers).some(
            (marker) => marker.updatedAt === latestEditTimestamp,
          ),
      );
    };

    const formatEditedTitle = (sectionKey: string, path?: string) => {
      const metadata = getSectionEditMetadata(sectionKey);
      const marker = path ? getEditedMarker(sectionKey, path) : undefined;
      const updatedAt = marker?.updatedAt || metadata?.sectionUpdatedAt;

      if (!updatedAt) {
        return "Modified previously";
      }

      const editedDate = new Date(updatedAt);
      const formattedDate = Number.isNaN(editedDate.getTime())
        ? updatedAt
        : editedDate.toLocaleString();

      return `Last edited: ${formattedDate}${marker?.editor ? ` by ${marker.editor}` : ""}`;
    };

    const getEditedTextStyle = (
      sectionKey: string,
      path: string,
    ): React.CSSProperties =>
      isEditedPath(sectionKey, path)
        ? {
            color: "#000000",
            backgroundColor: LAST_CHANGED_SOFT,
            boxShadow: `inset 3px 0 0 ${LAST_CHANGED_COLOR}`,
            paddingLeft: "4px",
          }
        : {};

    const getEditedBlockStyle = (
      sectionKey: string,
      path: string,
    ): React.CSSProperties =>
      isEditedPath(sectionKey, path)
        ? {
            color: "#000000",
            backgroundColor: LAST_CHANGED_SOFT,
            borderLeft: `3px solid ${LAST_CHANGED_COLOR}`,
            paddingLeft: "8px",
          }
        : {};

    const getEditedCellStyle = (
      sectionKey: string,
      path: string,
    ): React.CSSProperties =>
      isEditedPath(sectionKey, path)
        ? {
            color: LAST_CHANGED_COLOR,
            backgroundColor: LAST_CHANGED_FILL,
            border: `1.5px solid ${LAST_CHANGED_COLOR}`,
          }
        : {};

    const imageFrameStyle: React.CSSProperties = {
      width: "100%",
      minHeight: "180px",
      border: "1px solid #000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F9FAFB",
      marginBottom: "10px",
      overflow: "hidden",
    };

    const isRequiredPreviewPath = (sectionKey: string, path: string): boolean =>
      isRequiredPath(sectionKey, path);

    const getRequiredStyle = (
      sectionKey: string,
      path: string,
    ): React.CSSProperties | undefined =>
      isRequiredPreviewPath(sectionKey, path) ? requiredTextStyle : undefined;

    const renderRequiredValue = (
      sectionKey: string,
      path: string,
      value: React.ReactNode,
    ) => (
      <span
        title={isEditedPath(sectionKey, path) ? formatEditedTitle(sectionKey, path) : undefined}
        style={{
          ...(getRequiredStyle(sectionKey, path) || {}),
          ...getEditedTextStyle(sectionKey, path),
        }}
      >
        {value}
      </span>
    );

    const renderTemplateText = (text: string): React.ReactNode[] => {
      const parts = text.split(/(\{\{[^}]+\}\})/g);

      return parts.map((part, index) => {
        const match = part.match(/^\{\{([^}]+)\}\}$/);

        if (!match) {
          return part;
        }

        const key = match[1];
        const value = templateReplacements[key] ?? "";
        const requiredRef = TEMPLATE_REQUIREMENTS[key];

        if (requiredRef && isRequiredPreviewPath(requiredRef.sectionKey, requiredRef.path)) {
          return (
            <span
              key={`${key}-${index}`}
              style={requiredTextStyle}
            >
              {value}
            </span>
          );
        }

        return value;
      });
    };

    const renderTemplateParagraphs = (
      paragraphs: string[],
      style: React.CSSProperties = bodyParagraphStyle,
    ) =>
      paragraphs.map((paragraph, index) => (
        <p key={`${paragraph}-${index}`} style={style}>
          {renderTemplateText(paragraph)}
        </p>
      ));

    const renderRichTextPreview = (
      html: string | undefined,
      placeholderText?: string,
      requiredField?: RequiredFieldRef,
    ) => {
      const isRequired =
        requiredField &&
        isRequiredPreviewPath(requiredField.sectionKey, requiredField.path);

      if (!html || !stripHtml(html)) {
        return placeholderText ? (
          <p
            style={{
              ...bodyParagraphStyle,
              ...(isRequired ? requiredPlaceholderStyle : placeholderStyle),
            }}
          >
            {placeholderText}
          </p>
        ) : null;
      }

      return (
        <div
          className={[
            "rich-text-preview",
            isRequired ? "required-preview-content" : "",
            requiredField && isEditedPath(requiredField.sectionKey, requiredField.path)
              ? "edited-preview-content"
              : "",
          ].filter(Boolean).join(" ")}
          title={
            requiredField && isEditedPath(requiredField.sectionKey, requiredField.path)
              ? formatEditedTitle(requiredField.sectionKey, requiredField.path)
              : undefined
          }
          style={{
            ...(requiredField
              ? getEditedBlockStyle(requiredField.sectionKey, requiredField.path)
              : {}),
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    };

    const renderBulletList = (
      items: Array<string | undefined | null>,
      keyPrefix: string,
      requiredField?: RequiredFieldRef,
    ) => {
      const isRequired =
        requiredField &&
        isRequiredPreviewPath(requiredField.sectionKey, requiredField.path);
      const filledItems = items.filter(
        (item): item is string => Boolean(item && item.trim()),
      );

      if (filledItems.length === 0) {
        return null;
      }

      return (
        <ul style={bulletListStyle}>
          {filledItems.map((item, index) => (
            <li
              key={`${keyPrefix}-${index}`}
              title={
                requiredField &&
                isEditedPath(requiredField.sectionKey, `${requiredField.path}.${index}`)
                  ? formatEditedTitle(requiredField.sectionKey, `${requiredField.path}.${index}`)
                  : undefined
              }
              style={{
                ...bulletListItemStyle,
                ...(isRequired ? requiredTextStyle : {}),
                ...(requiredField
                  ? getEditedTextStyle(requiredField.sectionKey, `${requiredField.path}.${index}`)
                  : {}),
              }}
            >
              {renderTemplateText(item)}
            </li>
          ))}
        </ul>
      );
    };

    const renderImageOrPlaceholder = (
      imageType: PreviewImageType,
      placeholderText: string,
      alt: string,
    ) => {
      const imageUrl = imageUrls[imageType];

      if (imageUrl) {
        return (
          <div style={imageFrameStyle}>
            <img
              src={imageUrl}
              alt={alt}
              style={{
                width: "100%",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
        );
      }

      return (
        <div style={imageFrameStyle}>
          <span style={requiredPlaceholderStyle}>{placeholderText}</span>
        </div>
      );
    };

    const renderSpecLines = (row: Record<string, any>, rowIndex?: number) => {
      const lines = [
        ["specs_line1", row.specs_line1],
        ["specs_line2", row.specs_line2],
        ["specs_line3", row.specs_line3],
        ["specs_line4", row.specs_line4],
      ].filter((entry): entry is [string, string] => Boolean(entry[1]));

      if (lines.length === 0) {
        return (
          <span style={requiredPlaceholderStyle}>
            [Specifications pending]
          </span>
        );
      }

      return (
        <div style={getRequiredStyle("hardware_specs", "rows.specs_line1")}>
          {lines.map(([key, line]) => (
            <div
              key={key}
              style={
                rowIndex === undefined
                  ? undefined
                  : getEditedTextStyle("hardware_specs", `rows.${rowIndex}.${key}`)
              }
            >
              {line}
            </div>
          ))}
        </div>
      );
    };

    const formatSoftwareName = (row: Record<string, any>, index: number) => {
      const name = row.name || "";

      if (!name) {
        return (
          <span style={requiredPlaceholderStyle}>
            [Software name pending]
          </span>
        );
      }

      const formatted =
        index === 0
          ? `${name} (5 CAL)`
          : index === 3
            ? `${name} (5 CAL) / Other`
            : name;

      return renderRequiredValue("software_specs", `rows.${index}.name`, formatted);
    };

    const getExtraTableColumns = (
      rows: Record<string, any>[],
      standardColumns: string[],
    ) => {
      const extras: string[] = [];

      rows.forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (
            !standardColumns.includes(key) &&
            key !== "locked" &&
            key !== "locked_specs_line1" &&
            !extras.includes(key)
          ) {
            extras.push(key);
          }
        });
      });

      return extras;
    };

    const formatColumnTitle = (key: string) =>
      key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

    const renderExtraHeaderCells = (columns: string[]) =>
      columns.map((column) => (
        <th
          key={`extra-header-${column}`}
          style={{
            ...tableHeaderStyle,
            backgroundColor: "#BFBFBF",
          }}
        >
          {formatColumnTitle(column)}
        </th>
      ));

    const renderExtraRowCells = (
      row: Record<string, any>,
      columns: string[],
      sectionKey?: string,
      basePath = "rows",
      rowIndex?: number,
    ) =>
      columns.map((column) => {
        const path =
          rowIndex === undefined
            ? `${basePath}.${column}`
            : `${basePath}.${rowIndex}.${column}`;

        return (
          <td
            key={`extra-cell-${column}`}
            title={
              sectionKey && isEditedPath(sectionKey, path)
                ? formatEditedTitle(sectionKey, path)
                : undefined
            }
            style={{
              ...tableCellStyle,
              ...(sectionKey && isRequiredPreviewPath(sectionKey, path)
                ? requiredTextStyle
                : {}),
              ...(sectionKey ? getEditedCellStyle(sectionKey, path) : {}),
            }}
          >
            {row[column] || ""}
          </td>
        );
      });

    const handleSectionClick = (sectionKey: string) => {
      if (onSectionClick) {
        onSectionClick(sectionKey);
      }
    };

    const handleSubsectionClick = (
      sectionKey: string,
      subsectionKey: string,
      event?: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    ) => {
      event?.stopPropagation();

      if (onSubsectionClick) {
        onSubsectionClick(sectionKey, subsectionKey);
        return;
      }

      handleSectionClick(sectionKey);
    };

    const handleAddSectionClick = (insertAfterKey: string) => {
      setPendingInsertAfterKey(insertAfterKey);
      setIsSectionTypeModalOpen(true);
    };

    const handleCreateSection = async (insertAfterKey: string) => {
      const newSectionKey = generateCustomSectionKey();
      const newSection: CustomSectionContent = {
        title: '',
        subsections: [],
        insertAfterKey,
        displayMode: 'section',
      };

      try {
        const { upsertSection } = await import('../../api/sections');
        await upsertSection(projectId, newSectionKey, newSection);
        await refreshSections();

        if (onSectionClick) {
          onSectionClick(newSectionKey);
        }

        const toast = (await import('react-hot-toast')).default;
        toast.success('New section created! Add a title to get started.');
      } catch (error) {
        console.error('Failed to create section:', error);
        const toast = (await import('react-hot-toast')).default;
        toast.error('Failed to create section');
        throw error;
      }
    };

    const handleCreateSubsection = async (
      parentSectionKey: string,
      subsection: CustomSubsection,
    ) => {
      const parentSection = customSections[parentSectionKey];

      if (!parentSection) {
        const inlineSubsectionKey = generateCustomSectionKey();
        const inlineSubsectionSection: CustomSectionContent = {
          title: '',
          subsections: [subsection],
          insertAfterKey: parentSectionKey,
          displayMode: 'subsection',
        };

        try {
          const { upsertSection } = await import('../../api/sections');
          await upsertSection(projectId, inlineSubsectionKey, inlineSubsectionSection);
          await refreshSections();

          if (onSectionClick) {
            onSectionClick(inlineSubsectionKey);
          }

          const toast = (await import('react-hot-toast')).default;
          const contentLabel =
            subsection.contentType === 'table'
              ? 'Table'
              : subsection.contentType === 'image'
                ? 'Image'
                : 'Paragraph';
          toast.success(`${contentLabel} subsection created successfully.`);
        } catch (error) {
          console.error('Failed to create subsection:', error);
          const toast = (await import('react-hot-toast')).default;
          toast.error('Failed to create subsection');
          throw error;
        }
        return;
      }

      const updatedSection: CustomSectionContent = {
        ...parentSection,
        subsections: [...parentSection.subsections, subsection],
      };

      try {
        const { upsertSection } = await import('../../api/sections');
        await upsertSection(projectId, parentSectionKey, updatedSection);
        await refreshSections();

        if (onSectionClick) {
          onSectionClick(parentSectionKey);
        }

        const toast = (await import('react-hot-toast')).default;
        const contentLabel =
          subsection.contentType === 'table'
            ? 'Table'
            : subsection.contentType === 'image'
              ? 'Image'
              : 'Paragraph';
        toast.success(`${contentLabel} subsection created successfully.`);
      } catch (error) {
        console.error('Failed to create subsection:', error);
        const toast = (await import('react-hot-toast')).default;
        toast.error('Failed to create subsection');
        throw error;
      }
    };

    const handleCloseModal = () => {
      setIsSectionTypeModalOpen(false);
      setPendingInsertAfterKey('');
    };

    // Helper functions for section and subsection numbering
    const resetCounters = () => {
      sectionCounter.current = 0;
      subsectionCounter.current = 0;
    };

    const getNextSectionNumber = (): number => {
      sectionCounter.current += 1;
      subsectionCounter.current = 0;
      return sectionCounter.current;
    };

    const getNextSubsectionNumber = (): number => {
      subsectionCounter.current += 1;
      return subsectionCounter.current;
    };

    const formatHeadingWithNumber = (text: string, number: string): string => {
      return `${number} ${text}`;
    };

    const tocEntries = useMemo<TocEntry[]>(() => {
      const entries: TocEntry[] = [];
      let sectionNumber = 0;
      let subsectionNumber = 0;
      let subSubsectionNumber = 0;

      const addSection = (id: string, label: string) => {
        sectionNumber += 1;
        subsectionNumber = 0;
        subSubsectionNumber = 0;
        entries.push({
          id,
          level: 1,
          numberLabel: `${sectionNumber}.`,
          label,
        });
      };

      const addSubsection = (id: string, label: string) => {
        subsectionNumber += 1;
        subSubsectionNumber = 0;
        entries.push({
          id,
          level: 2,
          numberLabel: `${sectionNumber}.${subsectionNumber}`,
          label,
        });
      };

      const addSubSubsection = (id: string, label: string) => {
        subSubsectionNumber += 1;
        entries.push({
          id,
          level: 3,
          numberLabel: `${sectionNumber}.${subsectionNumber}.${subSubsectionNumber}`,
          label,
        });
      };

      const appendCustomInsertions = (afterKey: string) => {
        const sectionsToRender = getCustomSectionsAfter(afterKey);
        const inlineSections = sectionsToRender.filter(([, content]) =>
          isInlineSubsectionSection(content),
        );
        const topLevelSections = sectionsToRender.filter(
          ([, content]) => !isInlineSubsectionSection(content),
        );

        inlineSections.forEach(([sectionKey, content]) => {
          content.subsections.forEach((subsection) => {
            addSubsection(
              `custom-subsection:${subsection.key}`,
              subsection.name || "NEW SUBSECTION",
            );
          });
          appendCustomInsertions(sectionKey);
        });

        topLevelSections.forEach(([sectionKey, content]) => {
          addSection(
            `custom-section:${sectionKey}`,
            getCustomSectionDisplayName(content),
          );
          content.subsections.forEach((subsection) => {
            addSubsection(
              `custom-subsection:${subsection.key}`,
              subsection.name || "NEW SUBSECTION",
            );
          });
          appendCustomInsertions(sectionKey);
        });
      };

      if (sectionExists("executive_summary")) {
        addSection(
          "section:executive_summary",
          documentContent.executiveSummary.heading || "EXECUTIVE SUMMARY",
        );
        appendCustomInsertions("executive_summary");
      }

      if (
        sectionExists("introduction") ||
        sectionExists("abbreviations") ||
        sectionExists("process_flow") ||
        sectionExists("overview")
      ) {
        addSection("group:general_overview", "GENERAL OVERVIEW");

        if (sectionExists("introduction")) {
          addSubsection(
            "section:introduction",
            documentContent.introduction.heading || "INTRODUCTION",
          );
          appendCustomInsertions("introduction");
        }

        if (sectionExists("abbreviations")) {
          addSubsection(
            "section:abbreviations",
            documentContent.abbreviations.heading || "ABBREVIATIONS USED",
          );
          appendCustomInsertions("abbreviations");
        }

        if (sectionExists("process_flow")) {
          addSubsection(
            "section:process_flow",
            documentContent.processFlow.heading || "PROCESS FLOW",
          );
          appendCustomInsertions("process_flow");
        }

        if (sectionExists("overview")) {
          addSubsection(
            "section:overview",
            documentContent.overview.heading ||
              `OVERVIEW OF ${(solutionName || "{SolutionName}").toUpperCase()}`,
          );
          appendCustomInsertions("overview");
        }
      }

      if (
        sectionExists("features") ||
        sectionExists("remote_support") ||
        sectionExists("documentation_control") ||
        sectionExists("customer_training") ||
        sectionExists("system_config") ||
        sectionExists("fat_condition")
      ) {
        addSection("group:offerings", "OFFERINGS");

        if (sectionExists("features")) {
          addSubsection(
            "section:features",
            documentContent.features.heading || "DESIGN SCOPE OF WORK",
          );
          // Add feature items as level-3 entries
          const items = documentContent.features.items || [];
          items.forEach((feature: any, index: number) => {
            addSubSubsection(
              `feature-item:${index}`,
              feature.title || `Feature ${index + 1}`,
            );
          });
          appendCustomInsertions("features");
        }

        if (sectionExists("remote_support")) {
          addSubsection(
            "section:remote_support",
            documentContent.remoteSupport.heading || "REMOTE SUPPORT SYSTEM",
          );
          appendCustomInsertions("remote_support");
        }

        if (sectionExists("documentation_control")) {
          addSubsection(
            "section:documentation_control",
            documentContent.documentationControl.heading ||
              "DOCUMENTATION CONTROL",
          );
          appendCustomInsertions("documentation_control");
        }

        if (sectionExists("customer_training")) {
          addSubsection(
            "section:customer_training",
            documentContent.customerTraining.heading || "CUSTOMER TRAINING",
          );
          appendCustomInsertions("customer_training");
        }

        if (sectionExists("system_config")) {
          addSubsection(
            "section:system_config",
            documentContent.systemConfig.heading ||
              "SYSTEM CONFIGURATION (FOR REFERENCE)",
          );
          appendCustomInsertions("system_config");
        }

        if (sectionExists("fat_condition")) {
          addSubsection(
            "section:fat_condition",
            documentContent.fatCondition.heading || "FAT CONDITION",
          );
          appendCustomInsertions("fat_condition");
        }
      }

      if (sectionExists("tech_stack")) {
        addSection(
          "section:tech_stack",
          documentContent.techStack.heading || "TECHNOLOGY STACK",
        );
        appendCustomInsertions("tech_stack");
      }

      if (sectionExists("hardware_specs")) {
        addSubsection(
          "section:hardware_specs",
          documentContent.hardwareSpecs.heading || "HARDWARE SPECIFICATIONS",
        );
        appendCustomInsertions("hardware_specs");
      }

      if (sectionExists("software_specs")) {
        addSubsection(
          "section:software_specs",
          documentContent.softwareSpecs.heading || "SOFTWARE SPECIFICATIONS",
        );
        appendCustomInsertions("software_specs");
      }

      if (sectionExists("third_party_sw")) {
        addSubsection(
          "section:third_party_sw",
          documentContent.thirdPartySw.heading || "THIRD PARTY SOFTWARE",
        );
        appendCustomInsertions("third_party_sw");
      }

      if (
        sectionExists("overall_gantt") ||
        sectionExists("shutdown_gantt") ||
        sectionExists("supervisors")
      ) {
        addSection("group:schedule", "SCHEDULE");

        if (sectionExists("overall_gantt")) {
          addSubsection(
            "section:overall_gantt",
            documentContent.overallGantt.heading || "OVERALL GANTT CHART",
          );
          appendCustomInsertions("overall_gantt");
        }

        if (sectionExists("shutdown_gantt")) {
          addSubsection(
            "section:shutdown_gantt",
            documentContent.shutdownGantt.heading || "SHUTDOWN GANTT CHART",
          );
          appendCustomInsertions("shutdown_gantt");
        }

        if (sectionExists("supervisors")) {
          appendCustomInsertions("supervisors");
        }
      }

      if (
        sectionExists("scope_definitions") ||
        sectionExists("division_of_eng") ||
        sectionExists("value_addition") ||
        sectionExists("work_completion") ||
        sectionExists("buyer_obligations") ||
        sectionExists("exclusion_list") ||
        sectionExists("buyer_prerequisites") ||
        sectionExists("binding_conditions") ||
        sectionExists("cybersecurity")
      ) {
        addSection("group:scope_of_supply", "SCOPE OF SUPPLY");

        if (sectionExists("scope_definitions")) {
          addSubsection(
            "section:scope_definitions",
            documentContent.scopeDefinitions.heading ||
              "SCOPE OF SUPPLY DEFINITIONS",
          );
          appendCustomInsertions("scope_definitions");
        }

        if (sectionExists("division_of_eng")) {
          addSubsection(
            "section:division_of_eng",
            documentContent.divisionOfEng.heading ||
              "DIVISION OF ENGINEERING, SOFTWARE DEVELOPMENT, & ERECTION/COMMISSIONING SERVICES",
          );
          appendCustomInsertions("division_of_eng");
        }

        if (sectionExists("value_addition")) {
          addSubsection(
            "section:value_addition",
            documentContent.valueAddition.heading || "VALUE ADDITION",
          );
          appendCustomInsertions("value_addition");
        }

        if (sectionExists("work_completion")) {
          addSubsection(
            "section:work_completion",
            documentContent.workCompletion.heading ||
              "WORK COMPLETION CERTIFICATE",
          );
          appendCustomInsertions("work_completion");
        }

        if (sectionExists("buyer_obligations")) {
          addSubsection(
            "section:buyer_obligations",
            documentContent.buyerObligations.heading || "BUYER OBLIGATIONS",
          );
          appendCustomInsertions("buyer_obligations");
        }

        if (sectionExists("exclusion_list")) {
          addSubsection(
            "section:exclusion_list",
            documentContent.exclusionList.heading || "EXCLUSION LIST",
          );
          appendCustomInsertions("exclusion_list");
        }

        if (sectionExists("buyer_prerequisites")) {
          addSubsection(
            "section:buyer_prerequisites",
            documentContent.buyerPrerequisites.heading ||
              "BUYER PREREQUISITES:",
          );
          appendCustomInsertions("buyer_prerequisites");
        }

        if (sectionExists("binding_conditions")) {
          addSubsection(
            "section:binding_conditions",
            documentContent.bindingConditions.heading || "BINDING CONDITIONS:",
          );
          appendCustomInsertions("binding_conditions");
        }

        if (sectionExists("cybersecurity")) {
          addSubsection(
            "section:cybersecurity",
            documentContent.cybersecurity.heading || "CYBERSECURITY DISCLAIMER",
          );
          appendCustomInsertions("cybersecurity");
        }
      }

      if (sectionExists("disclaimer")) {
        addSection(
          "section:disclaimer",
          documentContent.disclaimer.heading || "DISCLAIMER",
        );
        (documentContent.disclaimer.sections || DISCLAIMER_SECTIONS).forEach(
          (section: any, index: number) => {
            addSubsection(
              `disclaimer-subsection:${index}`,
              section.title || `DISCLAIMER ${index + 1}`,
            );
          },
        );
        appendCustomInsertions("disclaimer");
      }

      if (sectionExists("poc")) {
        addSection(
          "section:poc",
          documentContent.poc.heading || "COMPLIMENTRY PROOF OF CONCEPTS (PoC)",
        );
        appendCustomInsertions("poc");
      }

      if (sectionExists("list_of_figures_tables")) {
        addSection(
          "section:list_of_figures_tables",
          documentContent.listOfFiguresTables.heading || "LIST OF FIGURES & TABLES",
        );
        addSubsection(
          "section:list_of_figures",
          "List of Figures",
        );
        addSubsection(
          "section:list_of_tables",
          "List of Tables",
        );
        appendCustomInsertions("list_of_figures_tables");
      }

      return entries;
    }, [customSections, documentContent, sectionContents, solutionName]);

    // Custom section rendering functions
    const renderCustomSubsectionContent = (
      sectionKey: string,
      subsection: CustomSubsection,
      subsectionIndex: number,
    ) => {
      const { contentType, data } = subsection;
      const dataPath = `subsections.${subsectionIndex}.data`;

      if (contentType === 'table' && isTableData(data)) {
        const tables = getTableItems(data);
        if (tables.length === 0) {
          return null;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tables.map((table, tableIndex) => (
              <table
                key={tableIndex}
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  margin: '16px 0',
                }}
              >
                <thead>
                  <tr>
                    {table.columns.map((column, columnIndex) => (
                      <th
                        key={`${column}-${columnIndex}`}
                        style={{
                          border: '1px solid #ddd',
                          padding: '12px',
                          backgroundColor: '#f5f5f5',
                          textAlign: 'left',
                          fontWeight: 'bold',
                        }}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {table.columns.map((column, columnIndex) => {
                        const cellPath = `${dataPath}.tables.${tableIndex}.rows.${rowIndex}.${column}`;
                        return (
                          <td
                            key={`${column}-${columnIndex}`}
                            title={
                              isEditedPath(sectionKey, cellPath)
                                ? formatEditedTitle(sectionKey, cellPath)
                                : undefined
                            }
                            style={{
                              border: '1px solid #ddd',
                              padding: '12px',
                              textAlign: 'left',
                              ...getEditedCellStyle(sectionKey, cellPath),
                            }}
                          >
                            {row[column] || ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        );
      }

      if (contentType === 'image' && isImageData(data)) {
        const images = getImageItems(data);
        if (images.length === 0) {
          return null;
        }

        return (
          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {images.map((image, index) => (
              <img
                key={`${image.filename}-${index}`}
                src={image.base64}
                alt={image.filename}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  alignSelf: 'center',
                }}
              />
            ))}
          </div>
        );
      }

      if (contentType === 'paragraph' && isParagraphData(data)) {
        const paragraphs = getParagraphItems(data);
        if (paragraphs.length === 0) {
          return null;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {paragraphs.map((paragraph, index) => (
              <div
                key={index}
                className={[
                  "rich-text-preview",
                  isEditedPath(sectionKey, `${dataPath}.paragraphs.${index}.html`)
                    ? "edited-preview-content"
                    : "",
                ].filter(Boolean).join(" ")}
                title={
                  isEditedPath(sectionKey, `${dataPath}.paragraphs.${index}.html`)
                    ? formatEditedTitle(sectionKey, `${dataPath}.paragraphs.${index}.html`)
                    : undefined
                }
                style={getEditedBlockStyle(
                  sectionKey,
                  `${dataPath}.paragraphs.${index}.html`,
                )}
                dangerouslySetInnerHTML={{ __html: paragraph.html }}
              />
            ))}
          </div>
        );
      }

      return null;
    };

    const renderCustomSubsection = (
      sectionKey: string,
      subsection: CustomSubsection,
      sectionNumber: number,
      subsectionNumber: number,
      subsectionIndex: number,
    ) => {
      return (
        <div
          key={subsection.key}
          data-section-key={sectionKey}
          data-subsection-key={subsection.key}
          data-toc-id={`custom-subsection:${subsection.key}`}
          role="button"
          tabIndex={0}
          style={subsectionStyle(subsection.key)}
          onClick={(event) =>
            handleSubsectionClick(sectionKey, subsection.key, event)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleSubsectionClick(sectionKey, subsection.key, event);
            }
          }}
        >
          <h2 style={heading2BlackStyle}>
            <span
              title={
                isEditedPath(
                  sectionKey,
                  `subsections.${subsectionIndex}.name`,
                )
                  ? formatEditedTitle(
                      sectionKey,
                      `subsections.${subsectionIndex}.name`,
                    )
                  : undefined
              }
              style={getEditedTextStyle(
                sectionKey,
                `subsections.${subsectionIndex}.name`,
              )}
            >
              {sectionNumber}.{subsectionNumber}{" "}
              {subsection.name || (
                <span style={requiredPlaceholderStyle}>[Subsection Name]</span>
              )}
            </span>
          </h2>
          {renderCustomSubsectionContent(sectionKey, subsection, subsectionIndex)}
        </div>
      );
    };

    const renderCustomSection = (
      sectionKey: string,
      sectionNumber: number
    ) => {
      const content = customSections[sectionKey];
      if (!content) return null;

      return (
        <SectionWrapper
          key={sectionKey}
          sectionKey={sectionKey}
          tocId={`custom-section:${sectionKey}`}
          isActive={isActive(sectionKey)}
          isHovered={hoveredSection === sectionKey}
          onMouseEnter={() => setHoveredSection(sectionKey)}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick(sectionKey)}
          sectionRef={(el) => (sectionRefs.current[sectionKey] = el)}
          style={sectionStyle(sectionKey)}
        >
          <h1 style={heading1RedStyle}>
            <span
              title={
                isEditedPath(sectionKey, "title")
                  ? formatEditedTitle(sectionKey, "title")
                  : undefined
              }
              style={getEditedTextStyle(sectionKey, "title")}
            >
              {sectionNumber}.{" "}
              {content.title || (
                <span style={requiredPlaceholderStyle}>NEW SECTION</span>
              )}
            </span>
          </h1>
          {content.subsections.map((subsection, index) =>
            renderCustomSubsection(sectionKey, subsection, sectionNumber, index + 1, index)
          )}
        </SectionWrapper>
      );
    };

    const renderInlineCustomSubsectionSection = (
      sectionKey: string,
      sectionNumber: number,
    ) => {
      const content = customSections[sectionKey];
      if (!content) return null;

      return (
        <SectionWrapper
          key={sectionKey}
          sectionKey={sectionKey}
          isActive={isActive(sectionKey)}
          isHovered={hoveredSection === sectionKey}
          onMouseEnter={() => setHoveredSection(sectionKey)}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick(sectionKey)}
          sectionRef={(el) => (sectionRefs.current[sectionKey] = el)}
          style={sectionStyle(sectionKey)}
        >
          {content.subsections.map((subsection, index) =>
            renderCustomSubsection(
              sectionKey,
              subsection,
              sectionNumber,
              getNextSubsectionNumber(),
              index,
            ),
          )}
        </SectionWrapper>
      );
    };

    // Reset counters at the start of each render
    resetCounters();

    return (
      <>
        <style>{`
          .rich-text-preview {
            margin-bottom: 8px;
            text-align: justify;
          }
          .rich-text-preview p {
            margin: 0 0 8px 0;
            text-align: justify;
          }
          .rich-text-preview p:empty {
            display: none;
          }
          .rich-text-preview ul,
          .rich-text-preview ol {
            margin: 0 0 8px 22px;
            padding-left: 18px;
          }
          .rich-text-preview ul {
            list-style-type: disc;
          }
          .rich-text-preview ol {
            list-style-type: decimal;
          }
          .rich-text-preview li {
            margin: 0 0 4px 0;
            padding-left: 2px;
            text-align: justify;
          }
          .rich-text-preview li p {
            display: inline;
            margin: 0;
          }
          .required-preview-content,
          .required-preview-content * {
            color: ${REQUIRED_PREVIEW_COLOR} !important;
          }
          .edited-preview-content,
          .edited-preview-content * {
            color: ${LAST_CHANGED_COLOR} !important;
          }
          .word-preview-pages {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            padding-bottom: 24px;
          }
          .word-preview-page {
            width: ${WORD_PAGE_WIDTH};
            height: ${WORD_PAGE_HEIGHT};
            box-sizing: border-box;
            padding: ${WORD_PAGE_MARGIN};
            background: #FFFFFF;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            break-after: page;
            page-break-after: always;
          }
          .word-preview-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .word-preview-page-content {
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: ${DOC_FONT};
            font-size: 11pt;
            line-height: 1.5;
          }
          .word-pagination-source-content {
            width: calc(${WORD_PAGE_WIDTH} - (${WORD_PAGE_MARGIN} * 2));
          }
          .word-preview-page table,
          .word-pagination-source-content table {
            max-width: 100%;
          }
          .word-preview-page tr,
          .word-pagination-source-content tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .word-preview-page img,
          .word-pagination-source-content img {
            max-width: 100%;
          }
          @page {
            size: ${WORD_PAGE_WIDTH} ${WORD_PAGE_HEIGHT};
            margin: 0;
          }

          @media print {
            body * {
              visibility: hidden;
            }
            .document-preview-print, .document-preview-print * {
              visibility: visible;
            }
            .document-preview-print {
              position: absolute;
              left: 0;
              top: 0;
              padding: 0 !important;
              transform: none !important;
            }
            .word-preview-pages {
              gap: 0 !important;
              padding: 0 !important;
            }
            .word-preview-page {
              box-shadow: none !important;
            }
            .preview-toolbar, .completion-badge {
              display: none !important;
            }
            /* Hide Add Section buttons in print mode */
            .page-break-with-button, .add-section-button {
              display: none !important;
            }
            /* Ensure page breaks work in print and hide visual indicator */
            .page-break {
              page-break-after: always;
              break-after: page;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              background: none !important;
              box-shadow: none !important;
            }
            .page-break span {
              display: none !important;
            }
          }
          
          @media screen {
            /* Show page break indicator on screen only */
            .page-break {
              background-color: #E8E8E8;
              border-top: 1px solid #D1D5DB;
              border-bottom: 1px solid #D1D5DB;
            }
          }
        `}</style>

        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#E8E8E8",
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="preview-toolbar"
            style={{
              padding: "12px 24px",
              backgroundColor: "#FFFFFF",
              borderBottom: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoom === ZOOM_LEVELS[0]}
              style={{
                padding: "4px 12px",
                border: "1px solid #D1D5DB",
                borderRadius: "4px",
                background: "white",
                cursor: zoom === ZOOM_LEVELS[0] ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              -
            </button>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                minWidth: "50px",
                textAlign: "center",
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              style={{
                padding: "4px 12px",
                border: "1px solid #D1D5DB",
                borderRadius: "4px",
                background: "white",
                cursor:
                  zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
              }}
            >
              +
            </button>
            <button
              onClick={handleFitWidth}
              style={{
                padding: "4px 12px",
                border: "1px solid #D1D5DB",
                borderRadius: "4px",
                background: "white",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Fit Width
            </button>
          </div>

          <div
            className="completion-badge"
            style={{
              position: "absolute",
              top: "80px",
              right: "24px",
              padding: "8px 12px",
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              fontSize: "12px",
              fontWeight: 500,
              color: "#1A1A2E",
              zIndex: 10,
            }}
          >
            Preview - {completedCount} / {totalCompletable} complete
          </div>

          <div
            className="document-preview-print"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 0",
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.2s ease",
            }}
          >
            {/* ── A4/Letter page: 21.59cm wide, 2.54cm margins = 96px margin ── */}
            <PaginatedWordPreview
              docFont={DOC_FONT}
              activeSectionKey={activeSectionKey}
              onSectionClick={onSectionClick}
              onSubsectionClick={onSubsectionClick}
              onAddSectionClick={handleAddSectionClick}
              onTocPageNumbersChange={handleTocPageNumbersChange}
            >
              {/* ── COVER PAGE ── */}
              <SectionWrapper
                sectionKey="cover"
                isActive={isActive("cover")}
                isHovered={hoveredSection === "cover"}
                onMouseEnter={() => setHoveredSection("cover")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("cover")}
                sectionRef={(el) => (sectionRefs.current.cover = el)}
                style={{
                  ...sectionStyle("cover"),
                  // Cover box: black border, cream/yellow background (matches Word template)
                  border: "2px solid #000000",
                  backgroundColor: "#FFFFF0",
                  width: "78%",
                  minHeight: "360px",
                  margin: "0 auto 48px",
                  padding: "44px 32px",
                  textAlign: "center",
                }}
              >
                <h1
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "18pt",
                    fontWeight: "bold",
                    marginBottom: "20px",
                  }}
                >
                  {documentContent.coverContent.cover_heading ||
                    "TECHNICAL SPECIFICATION"}
                </h1>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "20pt",
                    fontWeight: "bold",
                    marginBottom: "14px",
                  }}
                >
                  {renderRequiredValue(
                    "cover",
                    "solution_full_name",
                    coverSolutionName || "{SolutionFullName}",
                  )}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "14pt",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                >
                  FOR
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "14pt",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  {renderRequiredValue(
                    "cover",
                    "client_name",
                    coverClientName || "{CLIENTNAME}",
                  )}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "14pt",
                    fontWeight: "bold",
                    marginBottom: "28px",
                  }}
                >
                  {renderRequiredValue(
                    "cover",
                    "client_location",
                    coverClientLocation || "{CLIENTLOCATION}",
                  )}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "12pt",
                    marginBottom: "12px",
                  }}
                >
                  (Ref No - {coverRefNumber})
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "12pt",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  {coverDate} Ver. {coverVersion}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "12pt",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  {documentContent.coverContent.company_name ||
                    "Hitachi India Pvt Ltd."}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: "12pt",
                    marginBottom: 0,
                  }}
                >
                  {documentContent.coverContent.company_contact ||
                    "www.hitachi.co.in | sales.paeg@hitachi.co.in"}
                </p>
              </SectionWrapper>

              {/* Page Break: End of Page 1 (Cover) */}
              {sectionExists('revision_history') && renderInsertionsAfter('cover')}

              {/* ── REVISION HISTORY ── */}
              {sectionExists('revision_history') && (
              <SectionWrapper
                sectionKey="revision_history"
                isActive={isActive("revision_history")}
                isHovered={hoveredSection === "revision_history"}
                onMouseEnter={() => setHoveredSection("revision_history")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("revision_history")}
                sectionRef={(el) => (sectionRefs.current.revision_history = el)}
                style={sectionStyle("revision_history")}
              >
                {/* "REVISION HISTORY:" is Normal style + #EE0000 bold in template */}
                <h2 style={heading2RedStyle}>
                  {documentContent.revisionHistory.heading || "REVISION HISTORY:"}
                </h2>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Revision history table has NO header shading in template */}
                      <th style={tableHeaderStyle}>Sr. No.</th>
                      <th style={tableHeaderStyle}>Revised By</th>
                      <th style={tableHeaderStyle}>Checked By</th>
                      <th style={tableHeaderStyle}>Approved By (QMS)</th>
                      <th style={tableHeaderStyle}>Details</th>
                      <th style={tableHeaderStyle}>Date</th>
                      <th style={tableHeaderStyle}>Rev No.</th>
                      {renderExtraHeaderCells(
                        getExtraTableColumns(revisionRows, [
                          "sr_no",
                          "revised_by",
                          "checked_by",
                          "approved_by",
                          "details",
                          "date",
                          "rev_no",
                        ]),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {revisionRows.map((row: any, index: number) => (
                      <tr key={`revision-row-${index}`}>
                        <td style={{ ...tableCellStyle, ...getEditedCellStyle("revision_history", `rows.${index}.sr_no`) }}>{row.sr_no || index + 1}</td>
                        <td style={{ ...tableCellStyle, ...getEditedCellStyle("revision_history", `rows.${index}.revised_by`) }}>{row.revised_by || ""}</td>
                        <td style={{ ...tableCellStyle, ...getEditedCellStyle("revision_history", `rows.${index}.checked_by`) }}>{row.checked_by || ""}</td>
                        <td style={{ ...tableCellStyle, ...getEditedCellStyle("revision_history", `rows.${index}.approved_by`) }}>{row.approved_by || ""}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            ...requiredTextStyle,
                            ...getEditedCellStyle("revision_history", `rows.${index}.details`),
                          }}
                        >
                          {row.details || ""}
                        </td>
                        <td style={{ ...tableCellStyle, ...getEditedCellStyle("revision_history", `rows.${index}.date`) }}>{row.date || ""}</td>
                        <td style={{ ...tableCellStyle, ...getEditedCellStyle("revision_history", `rows.${index}.rev_no`) }}>{row.rev_no || ""}</td>
                        {renderExtraRowCells(
                          row,
                          getExtraTableColumns(revisionRows, [
                            "sr_no",
                            "revised_by",
                            "checked_by",
                            "approved_by",
                            "details",
                            "date",
                            "rev_no",
                          ]),
                          "revision_history",
                          "rows",
                          index,
                        )}
                      </tr>
                    ))}
                    {revisionRows.length < 4 &&
                      Array.from({ length: 4 - revisionRows.length }).map(
                        (_, index) => (
                          <tr key={`empty-revision-row-${index}`}>
                            <td style={tableCellStyle}>&nbsp;</td>
                            <td style={tableCellStyle}>&nbsp;</td>
                            <td style={tableCellStyle}>&nbsp;</td>
                            <td style={tableCellStyle}>&nbsp;</td>
                            <td style={tableCellStyle}>&nbsp;</td>
                            <td style={tableCellStyle}>&nbsp;</td>
                            <td style={tableCellStyle}>&nbsp;</td>
                          </tr>
                        ),
                      )}
                  </tbody>
                </table>
                <p
                  style={{
                    color: "#000000",
                    fontSize: "9pt",
                    marginBottom: "4px",
                  }}
                >
                  Copyright © 2026 Hitachi India Pvt. Ltd.
                </p>
                <p
                  style={{
                    ...noteParagraphStyle,
                    color: "#000000",
                    fontSize: "8.5pt",
                    lineHeight: "1.3",
                  }}
                >
                  All rights in this work are strictly reserved by the producer
                  and the owner. Any unauthorized use of this
                  material—including, but not limited to, copying, reproduction,
                  hiring, lending, public performance, broadcasting (including
                  communication to the public or via the internet), or
                  transmission by any distribution or diffusion service, whether
                  in whole or in part—is strictly prohibited. This work contains
                  confidential and/or proprietary information. The information
                  and ideas contained herein are provided solely for the use of
                  the intended recipient. All content remains the exclusive
                  property of Hitachi India and may not be disclosed, shared, or
                  communicated to any third party, in any form or by any means,
                  without prior written authorization.
                </p>
              </SectionWrapper>
              )}

              <div style={{ marginBottom: "32px" }}>
                <h2 style={heading2RedStyle}>TABLE OF CONTENTS</h2>
                {tocEntries.length > 0 ? (
                  tocEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        ...tocEntryBaseStyle,
                        paddingLeft: entry.level === 1 ? "0" : entry.level === 2 ? "28px" : "56px",
                        fontWeight: entry.level === 1 ? "bold" : "normal",
                        textTransform: entry.level === 3 ? "capitalize" as const : "uppercase" as const,
                      }}
                    >
                      <span>{entry.numberLabel}</span>
                      <span>{entry.label}</span>
                      <span style={tocLeaderStyle} />
                      <span style={tocPageNumberStyle}>
                        {tocPageNumbers[entry.id] || ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={placeholderStyle}>
                    [Auto-generated table of contents]
                  </p>
                )}
              </div>

              {/* Page Break: End of Page 2-4 (Revision History / Legal / TOC) */}
              {sectionExists('executive_summary') &&
                renderInsertionsAfter('revision_history')}

              {/* ── EXECUTIVE SUMMARY ── */}
              <SectionWrapper
                sectionKey="executive_summary"
                tocId="section:executive_summary"
                isActive={isActive("executive_summary")}
                isHovered={hoveredSection === "executive_summary"}
                onMouseEnter={() => setHoveredSection("executive_summary")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("executive_summary")}
                sectionRef={(el) =>
                  (sectionRefs.current.executive_summary = el)
                }
                style={sectionStyle("executive_summary")}
              >
                {/* Heading 1, burgundy #943634 — matches template */}
                <h1 style={heading1BurgundyStyle}>
                  {formatHeadingWithNumber(
                    documentContent.executiveSummary.heading ||
                      "EXECUTIVE SUMMARY",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>
                <p style={bodyParagraphStyle}>
                  {renderTemplateText(
                    (documentContent.executiveSummary.paragraphs?.[0] ||
                      EXECUTIVE_SUMMARY_PARAGRAPHS[0]).replace(
                        "{{ExecutiveSummaryPara1}}",
                        "",
                      ),
                  )}
                </p>
                {renderRichTextPreview(
                  documentContent.executiveSummary.para1,
                  "[Enter executive summary content]",
                  { sectionKey: "executive_summary", path: "para1" },
                )}
                <div style={{ marginBottom: "6px" }}>
                  <img
                    src={EXECUTIVE_SUMMARY_IMAGE_SRC}
                    alt="Executive summary"
                    style={{
                      width: "90%",
                      height: "auto",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                </div>
                {renderTemplateParagraphs(
                  (documentContent.executiveSummary.paragraphs ||
                    EXECUTIVE_SUMMARY_PARAGRAPHS).slice(1),
                )}
                <p style={{...bodyParagraphStyle, marginBottom: "4px"}}>Some of our clients include:</p>
                <div style={{ marginBottom: "6px" }}>
                  <img
                    src={CLIENTS_IMAGE_SRC}
                    alt="Client references"
                    style={{
                      width: "90%",
                      height: "auto",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                </div>
              </SectionWrapper>

              {/* Page Break: End of Page 5 (Executive Summary) */}
              {(sectionExists('introduction') || sectionExists('abbreviations') ||
                sectionExists('process_flow') || sectionExists('overview')) &&
                renderInsertionsAfter('executive_summary')}

              {/* ── GENERAL OVERVIEW heading (Heading 1, #EE0000) ── */}
              {(sectionExists('introduction') || sectionExists('abbreviations') || 
                sectionExists('process_flow') || sectionExists('overview')) && (
                <h1 style={heading1RedStyle} data-toc-id="group:general_overview">
                  {formatHeadingWithNumber(
                    "GENERAL OVERVIEW",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>
              )}

              {/* ── INTRODUCTION ── */}
              {sectionExists('introduction') && (
                <SectionWrapper
                  sectionKey="introduction"
                  tocId="section:introduction"
                  isActive={isActive("introduction")}
                  isHovered={hoveredSection === "introduction"}
                  onMouseEnter={() => setHoveredSection("introduction")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("introduction")}
                  sectionRef={(el) => (sectionRefs.current.introduction = el)}
                  style={sectionStyle("introduction")}
                >
                  {/* Heading 2, no color (black) — matches template */}
                  <h2 style={heading2BlackStyle}>
                    {formatHeadingWithNumber(
                      documentContent.introduction.heading || "INTRODUCTION",
                      `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                    )}
                  </h2>
                  {renderTemplateParagraphs(INTRODUCTION_PARAGRAPHS)}
                </SectionWrapper>
              )}

              {/* ── ABBREVIATIONS ── */}
              {sectionExists('abbreviations') && (
                <SectionWrapper
                  sectionKey="abbreviations"
                  tocId="section:abbreviations"
                  isActive={isActive("abbreviations")}
                  isHovered={hoveredSection === "abbreviations"}
                  onMouseEnter={() => setHoveredSection("abbreviations")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("abbreviations")}
                  sectionRef={(el) => (sectionRefs.current.abbreviations = el)}
                  style={sectionStyle("abbreviations")}
                >
                  <h2 style={heading2RedStyle}>
                    {formatHeadingWithNumber(
                      documentContent.abbreviations.heading ||
                        "ABBREVIATIONS USED",
                      `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                    )}
                  </h2>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {/* Abbreviations table: header shade = #D9D9D9 (from template) */}
                        <th
                          style={{
                            ...tableHeaderStyle,
                            width: "60px",
                            backgroundColor: "#D9D9D9",
                          }}
                        >
                          Sr. No.
                        </th>
                        <th
                          style={{
                            ...tableHeaderStyle,
                            width: "140px",
                            backgroundColor: "#D9D9D9",
                          }}
                        >
                          Abbreviation
                        </th>
                        <th
                          style={{
                            ...tableHeaderStyle,
                            backgroundColor: "#D9D9D9",
                          }}
                        >
                          Full Form / Description
                        </th>
                        {renderExtraHeaderCells(
                          getExtraTableColumns(
                            documentContent.abbreviations.rows || [],
                            ["sr_no", "abbreviation", "description"],
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(documentContent.abbreviations.rows || []).map(
                        (row: any, index: number) => (
                          <tr key={`abbr-${index}`}>
                            <td style={{ ...tableCellStyle, ...getEditedCellStyle("abbreviations", `rows.${index}.sr_no`) }}>
                              {row.sr_no || index + 1}
                            </td>
                            <td
                              style={{
                                ...tableCellStyle,
                                ...requiredTextStyle,
                                ...getEditedCellStyle("abbreviations", `rows.${index}.abbreviation`),
                              }}
                            >
                              {row.abbreviation || ""}
                            </td>
                            <td style={{ ...tableCellStyle, ...getEditedCellStyle("abbreviations", `rows.${index}.description`) }}>
                              {row.description || ""}
                            </td>
                            {renderExtraRowCells(
                              row,
                              getExtraTableColumns(
                                documentContent.abbreviations.rows || [],
                                ["sr_no", "abbreviation", "description"],
                              ),
                              "abbreviations",
                              "rows",
                              index,
                            )}
                          </tr>
                        ),
                      )}
                      {(!documentContent.abbreviations.rows ||
                        documentContent.abbreviations.rows.length === 0) && (
                        <tr>
                          <td colSpan={3} style={tableCellStyle}>
                            <span style={requiredPlaceholderStyle}>
                              [No abbreviations defined]
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </SectionWrapper>
              )}

              {/* ── PROCESS FLOW ── */}
              {sectionExists('process_flow') && (
                <SectionWrapper
                  sectionKey="process_flow"
                  tocId="section:process_flow"
                  isActive={isActive("process_flow")}
                  isHovered={hoveredSection === "process_flow"}
                  onMouseEnter={() => setHoveredSection("process_flow")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("process_flow")}
                  sectionRef={(el) => (sectionRefs.current.process_flow = el)}
                  style={sectionStyle("process_flow")}
                >
                  <h2 style={heading2RedStyle}>
                    {formatHeadingWithNumber(
                      documentContent.processFlow.heading || "PROCESS FLOW",
                      `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderRichTextPreview(
                  documentContent.processFlow.text,
                  "[Enter process flow description]",
                  { sectionKey: "process_flow", path: "text" },
                )}
                </SectionWrapper>
              )}

              {/* ── OVERVIEW ── */}
              {sectionExists('overview') && (
                <SectionWrapper
                  sectionKey="overview"
                  tocId="section:overview"
                  isActive={isActive("overview")}
                  isHovered={hoveredSection === "overview"}
                  onMouseEnter={() => setHoveredSection("overview")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("overview")}
                  sectionRef={(el) => (sectionRefs.current.overview = el)}
                  style={sectionStyle("overview")}
                >
                  <h2 style={heading2RedStyle}>
                    {formatHeadingWithNumber(
                      documentContent.overview.heading ||
                        `OVERVIEW OF ${(solutionName || "{SolutionName}").toUpperCase()}`,
                      `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderRichTextPreview(
                  documentContent.overview.process_summary ||
                    documentContent.processFlow.text,
                  "[Process flow summary will appear here]",
                )}
                <p style={bodyParagraphStyle}>
                    {renderTemplateText(
                      documentContent.overview.intro_text ||
                        "This proposal outlines the technical feature of {{SolutionName}}",
                    )}
                  </p>
                  <p style={labelParagraphStyle}>
                    {documentContent.overview.system_objective_label ||
                      "System Objective:"}
                  </p>
                  {renderRichTextPreview(
                    documentContent.overview.system_objective,
                    "[Enter system objective]",
                    { sectionKey: "overview", path: "system_objective" },
                  )}
                  <p style={labelParagraphStyle}>
                    {documentContent.overview.existing_system_label ||
                      "Existing System Architecture:"}
                  </p>
                  {renderRichTextPreview(
                    documentContent.overview.existing_system,
                    "[Enter existing system architecture]",
                    { sectionKey: "overview", path: "existing_system" },
                  )}
                  <p style={labelParagraphStyle}>
                    {documentContent.overview.integration_label || "Integration:"}
                  </p>
                  {renderRichTextPreview(
                    documentContent.overview.integration,
                    "[Enter integration details]",
                  )}
                  <p style={labelParagraphStyle}>
                    {documentContent.overview.benefits_label || "Benefits:"}
                  </p>
                  <p style={labelParagraphStyle}>
                    {documentContent.overview.tangible_benefits_label ||
                      "Tangible benefits"}
                  </p>
                  {renderRichTextPreview(
                    documentContent.overview.tangible_benefits,
                    "[Enter tangible benefits]",
                  )}
                  <p style={labelParagraphStyle}>
                    {documentContent.overview.intangible_benefits_label ||
                      "Intangible benefits"}
                  </p>
                  {renderRichTextPreview(
                    documentContent.overview.intangible_benefits,
                    "[Enter intangible benefits]",
                  )}
                </SectionWrapper>
              )}

              {/* Page Break: End of Page 6-8 (General Overview) */}
              {(sectionExists("features") ||
                sectionExists("remote_support") ||
                sectionExists("documentation_control") ||
                sectionExists("customer_training") ||
                sectionExists("system_config") ||
                sectionExists("fat_condition")) &&
                renderInsertionsAfter('overview')}

              {/* ── OFFERINGS heading (Heading 1, #EE0000) ── */}
              {(sectionExists("features") ||
                sectionExists("remote_support") ||
                sectionExists("documentation_control") ||
                sectionExists("customer_training") ||
                sectionExists("system_config") ||
                sectionExists("fat_condition")) && (
                <h1 style={heading1RedStyle} data-toc-id="group:offerings">
                  {formatHeadingWithNumber(
                    "OFFERINGS",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>
              )}

              {/* ── FEATURES ── */}
              {sectionExists("features") && (
                <SectionWrapper
                sectionKey="features"
                tocId="section:features"
                isActive={isActive("features")}
                isHovered={hoveredSection === "features"}
                onMouseEnter={() => setHoveredSection("features")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("features")}
                sectionRef={(el) => (sectionRefs.current.features = el)}
                style={sectionStyle("features")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.features.heading || "DESIGN SCOPE OF WORK",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {renderTemplateText(
                    documentContent.features.intro_text ||
                      "Implementation of {{SolutionName}}",
                  )}
                </p>
                {featureItems.length > 0 ? (
                  featureItems.map((feature: any, index: number) => {
                    const featureSubNum = `${sectionCounter.current}.${subsectionCounter.current}.${index + 1}`;
                    return (
                      <div
                        key={feature.id || `feature-${index}`}
                        data-toc-id={`feature-item:${index}`}
                        style={{ marginBottom: "14px" }}
                      >
                        {/* Feature titles: Heading 3, numbered sub-subsection — matches template TOC */}
                        <h3 style={heading3RedStyle}>
                          {featureSubNum}{" "}
                          {renderRequiredValue(
                            "features",
                            `items.${index}.title`,
                            feature.title || `Feature ${index + 1}`,
                          )}
                        </h3>
                        {renderRichTextPreview(
                          feature.description,
                          "[Enter feature description]",
                          { sectionKey: "features", path: `items.${index}.description` },
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p style={requiredPlaceholderStyle}>
                    [No features defined yet]
                  </p>
                )}
              </SectionWrapper>
              )}

              {/* ── REMOTE SUPPORT ── */}
              {sectionExists("remote_support") && (
                <SectionWrapper
                sectionKey="remote_support"
                tocId="section:remote_support"
                isActive={isActive("remote_support")}
                isHovered={hoveredSection === "remote_support"}
                onMouseEnter={() => setHoveredSection("remote_support")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("remote_support")}
                sectionRef={(el) => (sectionRefs.current.remote_support = el)}
                style={sectionStyle("remote_support")}
              >
                {/* Heading 2, #EE0000 — matches template (was incorrectly black before) */}
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.remoteSupport.heading ||
                      "REMOTE SUPPORT SYSTEM",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderTemplateParagraphs(
                  documentContent.remoteSupport.paragraphs ||
                    REMOTE_SUPPORT_PARAGRAPHS,
                )}
                {renderRichTextPreview(
                  documentContent.remoteSupport.text,
                  "[Enter remote support details]",
                  { sectionKey: "remote_support", path: "text" },
                )}
              </SectionWrapper>
              )}

              {/* ── DOCUMENTATION CONTROL ── */}
              {sectionExists("documentation_control") && (
                <SectionWrapper
                sectionKey="documentation_control"
                tocId="section:documentation_control"
                isActive={isActive("documentation_control")}
                isHovered={hoveredSection === "documentation_control"}
                onMouseEnter={() => setHoveredSection("documentation_control")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("documentation_control")}
                sectionRef={(el) =>
                  (sectionRefs.current.documentation_control = el)
                }
                style={sectionStyle("documentation_control")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.documentationControl.heading ||
                      "DOCUMENTATION CONTROL",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {renderTemplateText(
                    documentContent.documentationControl.intro_text ||
                      "SELLER shall provide the following technical documentation of the complete {{SolutionName}} solution:",
                  )}
                </p>
                {renderBulletList(
                  documentationControlItems,
                  "documentation-item",
                )}
              </SectionWrapper>
              )}

              {/* ── CUSTOMER TRAINING ── */}
              {sectionExists("customer_training") && (
                <SectionWrapper
                sectionKey="customer_training"
                tocId="section:customer_training"
                isActive={isActive("customer_training")}
                isHovered={hoveredSection === "customer_training"}
                onMouseEnter={() => setHoveredSection("customer_training")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("customer_training")}
                sectionRef={(el) =>
                  (sectionRefs.current.customer_training = el)
                }
                style={sectionStyle("customer_training")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.customerTraining.heading ||
                      "CUSTOMER TRAINING",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {renderTemplateText(
                    documentContent.customerTraining.paragraph ||
                      "SELLER shall provide training at site during commissioning to a maximum of {{TrainingPersons}} people for a maximum of {{TrainingDays}} days. Training shall cover mutually agreed topics on {{SolutionName}} application. Training shall comprise of classroom training at site.",
                  )}
                </p>
              </SectionWrapper>
              )}

              {/* ── SYSTEM CONFIGURATION ── */}
              {sectionExists("system_config") && (
                <SectionWrapper
                sectionKey="system_config"
                tocId="section:system_config"
                isActive={isActive("system_config")}
                isHovered={hoveredSection === "system_config"}
                onMouseEnter={() => setHoveredSection("system_config")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("system_config")}
                sectionRef={(el) => (sectionRefs.current.system_config = el)}
                style={sectionStyle("system_config")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.systemConfig.heading ||
                      "SYSTEM CONFIGURATION (FOR REFERENCE)",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {renderTemplateText(
                    documentContent.systemConfig.intro_text ||
                      "The reference system configuration of {{SolutionName}} is shown below:",
                  )}
                </p>
                {renderImageOrPlaceholder(
                  "architecture",
                  documentContent.systemConfig.placeholder_text ||
                    "[Architecture diagram to be inserted]",
                  "Architecture diagram",
                )}
                <p style={noteParagraphStyle}>
                  {documentContent.systemConfig.note ||
                    "Note: The above architecture is provided for illustrative purposes only and is subject to modification during detailed engineering to optimize overall system performance and functionality"}
                </p>
              </SectionWrapper>
              )}

              {/* ── FAT CONDITION ── */}
              {sectionExists("fat_condition") && (
                <SectionWrapper
                sectionKey="fat_condition"
                tocId="section:fat_condition"
                isActive={isActive("fat_condition")}
                isHovered={hoveredSection === "fat_condition"}
                onMouseEnter={() => setHoveredSection("fat_condition")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("fat_condition")}
                sectionRef={(el) => (sectionRefs.current.fat_condition = el)}
                style={sectionStyle("fat_condition")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.fatCondition.heading || "FAT CONDITION",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderRichTextPreview(
                  documentContent.fatCondition.text,
                  "[Enter FAT condition text]",
                  { sectionKey: "fat_condition", path: "text" },
                )}
              </SectionWrapper>
              )}

              {/* Page Break: End of Page 9-11 (Offerings) */}
              {sectionExists('tech_stack') && renderInsertionsAfter('fat_condition')}

              {/* ── TECHNOLOGY STACK (Heading 1, #EE0000) ── */}
              {sectionExists('tech_stack') && (
                <SectionWrapper
                  sectionKey="tech_stack"
                  tocId="section:tech_stack"
                  isActive={isActive("tech_stack")}
                  isHovered={hoveredSection === "tech_stack"}
                  onMouseEnter={() => setHoveredSection("tech_stack")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("tech_stack")}
                  sectionRef={(el) => (sectionRefs.current.tech_stack = el)}
                  style={sectionStyle("tech_stack")}
                >
                  <h1 style={heading1RedStyle}>
                    {formatHeadingWithNumber(
                      documentContent.techStack.heading || "TECHNOLOGY STACK",
                      `${getNextSectionNumber()}.`,
                    )}
                  </h1>
                <p style={{ ...bodyParagraphStyle, textAlign: "left" }}>
                  {documentContent.techStack.intro_text ||
                    "The technology stack for various components is as follows:"}
                </p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Tech stack table: header shade = #BFBFBF (from template) */}
                      <th
                        style={{
                          ...tableHeaderStyle,
                          width: "60px",
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Sr. No.
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Components
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Technology Used
                      </th>
                      {renderExtraHeaderCells(
                        getExtraTableColumns(techRows, [
                          "sr_no",
                          "component",
                          "technology",
                          "note",
                        ]),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {techRows.length > 0 ? (
                      techRows.map((row: any, index: number) => (
                        <tr key={`tech-row-${index}`}>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("tech_stack", `rows.${index}.sr_no`) }}>
                            {row.sr_no || index + 1}
                          </td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("tech_stack", `rows.${index}.component`) }}>{row.component || ""}</td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("tech_stack", `rows.${index}.technology`) }}>
                            <div style={{ ...requiredTextStyle, ...getEditedTextStyle("tech_stack", `rows.${index}.technology`) }}>
                              {row.technology || (
                                <span style={requiredPlaceholderStyle}>
                                  [Technology]
                                </span>
                              )}
                            </div>
                            {index === 0 && row.note && (
                              <div
                                style={{
                                  ...noteParagraphStyle,
                                  marginBottom: 0,
                                  marginTop: "6px",
                                  ...getEditedTextStyle("tech_stack", `rows.${index}.note`),
                                }}
                              >
                                {row.note}
                              </div>
                            )}
                          </td>
                          {renderExtraRowCells(
                            row,
                            getExtraTableColumns(techRows, [
                              "sr_no",
                              "component",
                              "technology",
                              "note",
                            ]),
                            "tech_stack",
                            "rows",
                            index,
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={tableCellStyle}>
                          <span style={requiredPlaceholderStyle}>
                            [Technology stack will appear here]
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SectionWrapper>
              )}

              {/* ── HARDWARE SPECS (Heading 3, #EE0000) ── */}
              {sectionExists('hardware_specs') && (
                <SectionWrapper
                sectionKey="hardware_specs"
                tocId="section:hardware_specs"
                isActive={isActive("hardware_specs")}
                isHovered={hoveredSection === "hardware_specs"}
                onMouseEnter={() => setHoveredSection("hardware_specs")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("hardware_specs")}
                sectionRef={(el) => (sectionRefs.current.hardware_specs = el)}
                style={sectionStyle("hardware_specs")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.hardwareSpecs.heading ||
                      "HARDWARE SPECIFICATIONS",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={{ ...bodyParagraphStyle, textAlign: "left" }}>
                  {renderTemplateText(
                    documentContent.hardwareSpecs.intro_text ||
                      "Following is the list of Hardware required for {{SolutionName}} Application.",
                  )}
                </p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Hardware specs table: header shade = #BFBFBF (from template) */}
                      <th
                        style={{
                          ...tableHeaderStyle,
                          width: "60px",
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Sr. No.
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Equipment Name
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Specifications
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Maker
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          width: "110px",
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        Quantity (Nos.)
                      </th>
                      {renderExtraHeaderCells(
                        getExtraTableColumns(hardwareRows, [
                          "sr_no",
                          "name",
                          "specs_line1",
                          "specs_line2",
                          "specs_line3",
                          "specs_line4",
                          "maker",
                          "qty",
                        ]),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {hardwareRows.length > 0 ? (
                      hardwareRows.map((row: any, index: number) => (
                        <tr key={`hardware-row-${index}`}>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("hardware_specs", `rows.${index}.sr_no`) }}>
                            {row.sr_no || index + 1}
                          </td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("hardware_specs", `rows.${index}.name`) }}>{row.name || ""}</td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("hardware_specs", `rows.${index}.specs_line1`) }}>{renderSpecLines(row, index)}</td>
                          <td
                            style={{
                              ...tableCellStyle,
                              ...requiredTextStyle,
                              ...getEditedCellStyle("hardware_specs", `rows.${index}.maker`),
                            }}
                          >
                            {row.maker || (
                              <span style={requiredPlaceholderStyle}>
                                [Maker]
                              </span>
                            )}
                          </td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("hardware_specs", `rows.${index}.qty`) }}>
                            {row.qty || (
                              <span style={placeholderStyle}>[Qty]</span>
                            )}
                          </td>
                          {renderExtraRowCells(
                            row,
                            getExtraTableColumns(hardwareRows, [
                              "sr_no",
                              "name",
                              "specs_line1",
                              "specs_line2",
                              "specs_line3",
                              "specs_line4",
                              "maker",
                              "qty",
                            ]),
                            "hardware_specs",
                            "rows",
                            index,
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={tableCellStyle}>
                          <span style={requiredPlaceholderStyle}>
                            [Hardware specifications will appear here]
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SectionWrapper>
              )}

              {/* ── SOFTWARE SPECS (Heading 3, #EE0000) ── */}
              {sectionExists('software_specs') && (
                <SectionWrapper
                sectionKey="software_specs"
                tocId="section:software_specs"
                isActive={isActive("software_specs")}
                isHovered={hoveredSection === "software_specs"}
                onMouseEnter={() => setHoveredSection("software_specs")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("software_specs")}
                sectionRef={(el) => (sectionRefs.current.software_specs = el)}
                style={sectionStyle("software_specs")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.softwareSpecs.heading ||
                      "SOFTWARE SPECIFICATIONS",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={{ ...bodyParagraphStyle, textAlign: "left" }}>
                  {renderTemplateText(
                    documentContent.softwareSpecs.intro_text ||
                      "Below are the Software Specifications for the Proposed {{SolutionName}} system.",
                  )}
                </p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Software specs table: header shade = #BFBFBF (from template) */}
                      <th
                        style={{
                          ...tableHeaderStyle,
                          width: "60px",
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        SR. NO.
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        EQUIPMENT/SOFTWARE NAME
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        MAKER
                      </th>
                      <th
                        style={{
                          ...tableHeaderStyle,
                          width: "120px",
                          backgroundColor: "#BFBFBF",
                        }}
                      >
                        QUANTITY (NOS.)
                      </th>
                      {renderExtraHeaderCells(
                        getExtraTableColumns(softwareRows, [
                          "sr_no",
                          "name",
                          "maker",
                          "qty",
                        ]),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {softwareRows.length > 0 ? (
                      softwareRows.map((row: any, index: number) => (
                        <tr key={`software-row-${index}`}>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("software_specs", `rows.${index}.sr_no`) }}>
                            {row.sr_no || index + 1}
                          </td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("software_specs", `rows.${index}.name`) }}>
                            {formatSoftwareName(row, index)}
                          </td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("software_specs", `rows.${index}.maker`) }}>
                            {row.maker || (
                              <span style={placeholderStyle}>[Maker]</span>
                            )}
                          </td>
                          <td style={{ ...tableCellStyle, ...getEditedCellStyle("software_specs", `rows.${index}.qty`) }}>{row.qty || ""}</td>
                          {renderExtraRowCells(
                            row,
                            getExtraTableColumns(softwareRows, [
                              "sr_no",
                              "name",
                              "maker",
                              "qty",
                            ]),
                            "software_specs",
                            "rows",
                            index,
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={tableCellStyle}>
                          <span style={requiredPlaceholderStyle}>
                            [Software specifications will appear here]
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SectionWrapper>
              )}

              {/* ── THIRD PARTY SW (Heading 3, #EE0000) ── */}
              {sectionExists('third_party_sw') && (
                <SectionWrapper
                sectionKey="third_party_sw"
                tocId="section:third_party_sw"
                isActive={isActive("third_party_sw")}
                isHovered={hoveredSection === "third_party_sw"}
                onMouseEnter={() => setHoveredSection("third_party_sw")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("third_party_sw")}
                sectionRef={(el) => (sectionRefs.current.third_party_sw = el)}
                style={sectionStyle("third_party_sw")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.thirdPartySw.heading ||
                      "THIRD PARTY SOFTWARE",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {documentContent.thirdPartySw.sw4_name ? (
                    renderRequiredValue(
                      "third_party_sw",
                      "sw4_name",
                      documentContent.thirdPartySw.sw4_name,
                    )
                  ) : (
                    <span style={requiredPlaceholderStyle}>
                      [Enter third party software requirement]
                    </span>
                  )}
                </p>
                <p style={bodyParagraphStyle}>
                  {documentContent.thirdPartySw.remote_link_text ||
                    "Remote Link: To provide a suitable level of response to operation & process execution problems and queries raised on site, SELLER requires a network connection via broadband / VPN / Remote connectivity."}
                </p>
              </SectionWrapper>
              )}

              {/* Page Break: End of Page 12-14 (Technology Stack) */}
              {(sectionExists("overall_gantt") ||
                sectionExists("shutdown_gantt") ||
                sectionExists("supervisors")) &&
                renderInsertionsAfter('third_party_sw')}

              {/* ── SCHEDULE (Heading 1, #EE0000) ── */}
              {(sectionExists("overall_gantt") ||
                sectionExists("shutdown_gantt") ||
                sectionExists("supervisors")) && (
                <h1 style={heading1RedStyle} data-toc-id="group:schedule">
                  {formatHeadingWithNumber(
                    "SCHEDULE",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>
              )}

              {/* ── OVERALL GANTT ── */}
              {sectionExists("overall_gantt") && (
                <SectionWrapper
                sectionKey="overall_gantt"
                tocId="section:overall_gantt"
                isActive={isActive("overall_gantt")}
                isHovered={hoveredSection === "overall_gantt"}
                onMouseEnter={() => setHoveredSection("overall_gantt")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("overall_gantt")}
                sectionRef={(el) => (sectionRefs.current.overall_gantt = el)}
                style={sectionStyle("overall_gantt")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.overallGantt.heading ||
                      "OVERALL GANTT CHART",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderImageOrPlaceholder(
                  "gantt_overall",
                  documentContent.overallGantt.placeholder_text ||
                    "[Overall Gantt chart to be inserted]",
                  "Overall Gantt chart",
                )}
                <p style={noteParagraphStyle}>
                  {renderTemplateText(
                    documentContent.overallGantt.note ||
                      "Note: After Approval on System Design Document SELLER will take 4 Months for Software development. In the event of a delay in System design document approvals from the Customer, it will lead to an overall delay in the delivery. Above delivery schedule is for {{SolutionName}} application",
                  )}
                </p>
              </SectionWrapper>
              )}

              {/* ── SHUTDOWN GANTT ── */}
              {sectionExists("shutdown_gantt") && (
                <SectionWrapper
                sectionKey="shutdown_gantt"
                tocId="section:shutdown_gantt"
                isActive={isActive("shutdown_gantt")}
                isHovered={hoveredSection === "shutdown_gantt"}
                onMouseEnter={() => setHoveredSection("shutdown_gantt")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("shutdown_gantt")}
                sectionRef={(el) => (sectionRefs.current.shutdown_gantt = el)}
                style={sectionStyle("shutdown_gantt")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.shutdownGantt.heading ||
                      "SHUTDOWN GANTT CHART",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderImageOrPlaceholder(
                  "gantt_shutdown",
                  documentContent.shutdownGantt.placeholder_text ||
                    "[Shutdown Gantt chart to be inserted]",
                  "Shutdown Gantt chart",
                )}
                <p style={labelParagraphStyle}>
                  {documentContent.shutdownGantt.note_label || "NOTE:"}
                </p>
                <p style={noteParagraphStyle}>
                  {renderTemplateText(
                    documentContent.shutdownGantt.note ||
                      "{{SolutionName}} Application Deployment & commissioning is subject to site readiness from BUYER. The above shutdown schedule provided is for reference only. The final shutdown schedule will be determined through discussion and mutual agreement between the BUYER & SELLER",
                  )}
                </p>
              </SectionWrapper>
              )}

              {/* ── SUPERVISORS (Heading 3, #EE0000) ── */}
              {sectionExists("supervisors") && (
                <SectionWrapper
                sectionKey="supervisors"
                isActive={isActive("supervisors")}
                isHovered={hoveredSection === "supervisors"}
                onMouseEnter={() => setHoveredSection("supervisors")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("supervisors")}
                sectionRef={(el) => (sectionRefs.current.supervisors = el)}
                style={sectionStyle("supervisors")}
              >
                <h3 style={heading3RedStyle}>
                  {documentContent.supervisors.heading || "SUPERVISORS:"}
                </h3>
                <p style={bodyParagraphStyle}>
                  {documentContent.supervisors.intro_text ||
                    "The following site-supervisor will be deputed to the site for the commissioning, deployment & training at site:"}
                </p>
                {renderBulletList(
                  [
                    "Project Manager: {{PMDays}} Days",
                    "{{SolutionName}} Developer: {{DevDays}} Days",
                    "Commissioning SV (QA SV): {{CommDays}} Days",
                  ],
                  "supervisor",
                )}
                <p style={bodyParagraphStyle}>
                  {renderTemplateText(
                    "Total {{TotalManDays}} man-days (Inclusive of on-site training).",
                  )}
                </p>
              </SectionWrapper>
              )}

              {/* Page Break: End of Page 15 (Schedule) */}
              {(sectionExists('scope_definitions') || sectionExists('division_of_eng') ||
                sectionExists('value_addition') || sectionExists('work_completion') ||
                sectionExists('buyer_obligations') || sectionExists('exclusion_list') ||
                sectionExists('buyer_prerequisites') || sectionExists('binding_conditions') ||
                sectionExists('cybersecurity')) &&
                renderInsertionsAfter('supervisors')}

              {/* ── SCOPE OF SUPPLY (Heading 1, #EE0000) ── */}
              {(sectionExists('scope_definitions') || sectionExists('division_of_eng') || 
                sectionExists('value_addition') || sectionExists('work_completion') || 
                sectionExists('buyer_obligations') || sectionExists('exclusion_list') || 
                sectionExists('buyer_prerequisites') || sectionExists('binding_conditions') || 
                sectionExists('cybersecurity')) && (
              <h1 style={heading1RedStyle} data-toc-id="group:scope_of_supply">
                {formatHeadingWithNumber(
                  "SCOPE OF SUPPLY",
                  `${getNextSectionNumber()}.`,
                )}
              </h1>
              )}

              {/* ── SCOPE DEFINITIONS (Heading 2, black — no color in template) ── */}
              {sectionExists('scope_definitions') && (
              <SectionWrapper
                sectionKey="scope_definitions"
                tocId="section:scope_definitions"
                isActive={isActive("scope_definitions")}
                isHovered={hoveredSection === "scope_definitions"}
                onMouseEnter={() => setHoveredSection("scope_definitions")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("scope_definitions")}
                sectionRef={(el) =>
                  (sectionRefs.current.scope_definitions = el)
                }
                style={sectionStyle("scope_definitions")}
              >
                <h2 style={heading2BlackStyle}>
                  {formatHeadingWithNumber(
                    documentContent.scopeDefinitions.heading ||
                      "SCOPE OF SUPPLY DEFINITIONS",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderTemplateParagraphs(
                  documentContent.scopeDefinitions.lines ||
                    SCOPE_SUPPLY_DEFINITION_LINES,
                )}
              </SectionWrapper>
              )}

              {/* ── DIVISION OF ENGINEERING ── */}
              {sectionExists('division_of_eng') && (
              <SectionWrapper
                sectionKey="division_of_eng"
                tocId="section:division_of_eng"
                isActive={isActive("division_of_eng")}
                isHovered={hoveredSection === "division_of_eng"}
                onMouseEnter={() => setHoveredSection("division_of_eng")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("division_of_eng")}
                sectionRef={(el) => (sectionRefs.current.division_of_eng = el)}
                style={sectionStyle("division_of_eng")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.divisionOfEng.heading ||
                      "DIVISION OF ENGINEERING, SOFTWARE DEVELOPMENT, & ERECTION/COMMISSIONING SERVICES",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <table
                  style={{
                    ...tableStyle,
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    {resolvedMatrixRows.map((row: string[], rowIndex: number) => {
                      const sourceRow = matrixRows[rowIndex] || row;
                      const isHeaderRow = rowIndex <= 1;
                      const isGroupRow =
                        !isHeaderRow && row[0] && !row[0].startsWith("-");

                      return (
                        <tr key={`matrix-row-${rowIndex}`}>
                          {row.map((cell: string, cellIndex: number) => {
                            const sourceCell = sourceRow[cellIndex] || cell;
                            const cellStyle =
                              cellIndex === 1
                                ? matrixItemCellStyle
                                : matrixCellStyle;

                            // Responsibility matrix header: shade = #2E75B5 (blue) from template
                            const headerBg = isHeaderRow
                              ? "#2E75B5"
                              : undefined;
                            const headerColor = isHeaderRow
                              ? "#FFFFFF"
                              : undefined;
                            const groupBg =
                              !isHeaderRow && isGroupRow
                                ? "#F3F3F3"
                                : undefined;

                            return (
                              <td
                                key={`matrix-cell-${rowIndex}-${cellIndex}`}
                                title={
                                  isEditedPath(
                                    "division_of_eng",
                                    `matrix_rows.${rowIndex}.${cellIndex}`,
                                  )
                                    ? formatEditedTitle(
                                        "division_of_eng",
                                        `matrix_rows.${rowIndex}.${cellIndex}`,
                                      )
                                    : undefined
                                }
                                style={{
                                  ...cellStyle,
                                  fontWeight:
                                    isHeaderRow || isGroupRow
                                      ? "bold"
                                      : "normal",
                                  backgroundColor:
                                    headerBg || groupBg || "#FFFFFF",
                                  color: headerColor || undefined,
                                  ...getEditedCellStyle(
                                    "division_of_eng",
                                    `matrix_rows.${rowIndex}.${cellIndex}`,
                                  ),
                                }}
                              >
                                {cell ? renderTemplateText(sourceCell) : "\u00A0"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p style={labelParagraphStyle}>
                  {documentContent.divisionOfEng.note_label || "Note:"}
                </p>
                {(documentContent.divisionOfEng.note_paragraphs || []).map(
                  (note: string, index: number) => (
                    <p key={`division-note-${index}`} style={noteParagraphStyle}>
                      {renderTemplateText(note)}
                    </p>
                  ),
                )}
              </SectionWrapper>
              )}

              {/* ── VALUE ADDITION ── */}
              {sectionExists('value_addition') && (
              <SectionWrapper
                sectionKey="value_addition"
                tocId="section:value_addition"
                isActive={isActive("value_addition")}
                isHovered={hoveredSection === "value_addition"}
                onMouseEnter={() => setHoveredSection("value_addition")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("value_addition")}
                sectionRef={(el) => (sectionRefs.current.value_addition = el)}
                style={sectionStyle("value_addition")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.valueAddition.heading || "VALUE ADDITION",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {renderTemplateText(
                    documentContent.valueAddition.intro_text ||
                      VALUE_ADDITION_INTRO,
                  )}
                </p>
                {renderRichTextPreview(
                  documentContent.valueAddition.text,
                  "[Enter value addition details]",
                  { sectionKey: "value_addition", path: "text" },
                )}
              </SectionWrapper>
              )}

              {/* ── WORK COMPLETION ── */}
              {sectionExists('work_completion') && (
              <SectionWrapper
                sectionKey="work_completion"
                tocId="section:work_completion"
                isActive={isActive("work_completion")}
                isHovered={hoveredSection === "work_completion"}
                onMouseEnter={() => setHoveredSection("work_completion")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("work_completion")}
                sectionRef={(el) => (sectionRefs.current.work_completion = el)}
                style={sectionStyle("work_completion")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.workCompletion.heading ||
                      "WORK COMPLETION CERTIFICATE",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {documentContent.workCompletion.criteria_label ||
                    "Work Completion Criteria:"}
                </p>
                {renderBulletList(
                  workCompletionCriteria,
                  "completion-criterion",
                )}
                {renderTemplateParagraphs(
                  documentContent.workCompletion.paragraphs ||
                    WORK_COMPLETION_PARAGRAPHS,
                )}
              </SectionWrapper>
              )}

              {/* ── BUYER OBLIGATIONS ── */}
              {sectionExists('buyer_obligations') && (
              <SectionWrapper
                sectionKey="buyer_obligations"
                tocId="section:buyer_obligations"
                isActive={isActive("buyer_obligations")}
                isHovered={hoveredSection === "buyer_obligations"}
                onMouseEnter={() => setHoveredSection("buyer_obligations")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("buyer_obligations")}
                sectionRef={(el) =>
                  (sectionRefs.current.buyer_obligations = el)
                }
                style={sectionStyle("buyer_obligations")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.buyerObligations.heading ||
                      "BUYER OBLIGATIONS",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                <p style={bodyParagraphStyle}>
                  {documentContent.buyerObligations.intro_text ||
                    "The BUYER should fulfil the following obligations"}
                </p>
                {renderBulletList(
                  buyerObligationItems,
                  "buyer-obligation",
                )}
              </SectionWrapper>
              )}

              {/* ── EXCLUSION LIST ── */}
              {sectionExists('exclusion_list') && (
              <SectionWrapper
                sectionKey="exclusion_list"
                tocId="section:exclusion_list"
                isActive={isActive("exclusion_list")}
                isHovered={hoveredSection === "exclusion_list"}
                onMouseEnter={() => setHoveredSection("exclusion_list")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("exclusion_list")}
                sectionRef={(el) => (sectionRefs.current.exclusion_list = el)}
                style={sectionStyle("exclusion_list")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.exclusionList.heading || "EXCLUSION LIST",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderTemplateParagraphs(
                  documentContent.exclusionList.intro_paragraphs ||
                    EXCLUSION_INTRO_PARAGRAPHS,
                )}
                {renderBulletList(exclusionItems, "exclusion-item")}
              </SectionWrapper>
              )}

              {/* ── BUYER PREREQUISITES ── */}
              {sectionExists('buyer_prerequisites') && (
              <SectionWrapper
                sectionKey="buyer_prerequisites"
                tocId="section:buyer_prerequisites"
                isActive={isActive("buyer_prerequisites")}
                isHovered={hoveredSection === "buyer_prerequisites"}
                onMouseEnter={() => setHoveredSection("buyer_prerequisites")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("buyer_prerequisites")}
                sectionRef={(el) =>
                  (sectionRefs.current.buyer_prerequisites = el)
                }
                style={sectionStyle("buyer_prerequisites")}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(
                    documentContent.buyerPrerequisites.heading ||
                      "BUYER PREREQUISITES:",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {buyerPrerequisites.length > 0 ? (
                  renderBulletList(
                    buyerPrerequisites,
                    "buyer-prereq",
                    { sectionKey: "buyer_prerequisites", path: "items" },
                  )
                ) : (
                  <p style={requiredPlaceholderStyle}>
                    [Enter buyer prerequisites]
                  </p>
                )}
              </SectionWrapper>
              )}

              {/* ── BINDING CONDITIONS (Heading 2, #4F81BD) ── */}
              {sectionExists('binding_conditions') && (
              <SectionWrapper
                sectionKey="binding_conditions"
                tocId="section:binding_conditions"
                isActive={isActive("binding_conditions")}
                isHovered={hoveredSection === "binding_conditions"}
                onMouseEnter={() => setHoveredSection("binding_conditions")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("binding_conditions")}
                sectionRef={(el) =>
                  (sectionRefs.current.binding_conditions = el)
                }
                style={sectionStyle("binding_conditions")}
              >
                <h2 style={heading2BlueStyle}>
                  {formatHeadingWithNumber(
                    documentContent.bindingConditions.heading ||
                      "BINDING CONDITIONS:",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderTemplateParagraphs(
                  documentContent.bindingConditions.paragraphs ||
                    BINDING_CONDITIONS_PARAGRAPHS,
                )}
              </SectionWrapper>
              )}

              {/* ── CYBERSECURITY (Heading 2, #4F81BD) ── */}
              {sectionExists('cybersecurity') && (
              <SectionWrapper
                sectionKey="cybersecurity"
                tocId="section:cybersecurity"
                isActive={isActive("cybersecurity")}
                isHovered={hoveredSection === "cybersecurity"}
                onMouseEnter={() => setHoveredSection("cybersecurity")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("cybersecurity")}
                sectionRef={(el) => (sectionRefs.current.cybersecurity = el)}
                style={sectionStyle("cybersecurity")}
              >
                <h2 style={heading2BlueStyle}>
                  {formatHeadingWithNumber(
                    documentContent.cybersecurity.heading ||
                      "CYBERSECURITY DISCLAIMER",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderTemplateParagraphs(
                  documentContent.cybersecurity.paragraphs ||
                    CYBERSECURITY_DISCLAIMER_PARAGRAPHS,
                )}
              </SectionWrapper>
              )}

              {/* Page Break: End of Page 16-23 (Scope of Supply) */}
              {sectionExists('disclaimer') &&
                renderInsertionsAfter('cybersecurity')}

              {/* ── DISCLAIMER (Heading 1, #4F81BD) ── */}
              {sectionExists('disclaimer') && (
              <SectionWrapper
                sectionKey="disclaimer"
                tocId="section:disclaimer"
                isActive={isActive("disclaimer")}
                isHovered={hoveredSection === "disclaimer"}
                onMouseEnter={() => setHoveredSection("disclaimer")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("disclaimer")}
                sectionRef={(el) => (sectionRefs.current.disclaimer = el)}
                style={sectionStyle("disclaimer")}
              >
                <h1 style={heading1BlueStyle}>
                  {formatHeadingWithNumber(
                    documentContent.disclaimer.heading || "DISCLAIMER",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>
                {(documentContent.disclaimer.sections || DISCLAIMER_SECTIONS).map((section: any, sectionIdx: number) => (
                  <div key={section.title} style={{ marginBottom: "18px" }} data-toc-id={`disclaimer-subsection:${sectionIdx}`}>
                    {/* Disclaimer subsections: Heading 2, no color (black) — matches template */}
                    <h2 style={heading2BlackStyle}>
                      {formatHeadingWithNumber(
                        section.title,
                        `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                      )}
                    </h2>
                    {renderTemplateParagraphs(section.paragraphs)}
                  </div>
                ))}
              </SectionWrapper>
              )}

              {/* Page Break: End of Page 24-25 (Disclaimer) */}
              {sectionExists('poc') && renderInsertionsAfter('disclaimer')}

              {/* ── PROOF OF CONCEPT (Heading 1, #4F81BD) ── */}
              {sectionExists('poc') && (
              <SectionWrapper
                sectionKey="poc"
                tocId="section:poc"
                isActive={isActive("poc")}
                isHovered={hoveredSection === "poc"}
                onMouseEnter={() => setHoveredSection("poc")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("poc")}
                sectionRef={(el) => (sectionRefs.current.poc = el)}
                style={sectionStyle("poc")}
              >
                <h1 style={heading1BlueStyle}>
                  {formatHeadingWithNumber(
                    documentContent.poc.heading ||
                      "COMPLIMENTRY PROOF OF CONCEPTS (PoC)",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>
                {renderTemplateParagraphs(
                  documentContent.poc.paragraphs || POC_PARAGRAPHS,
                )}
                <p style={bodyParagraphStyle}>
                  {documentContent.poc.intro_text ||
                    "The following solution will be part of the PoC:"}
                </p>
                <p style={{ ...heading2BlackStyle, marginBottom: "10px" }}>
                  {documentContent.poc.name ? (
                    renderRequiredValue("poc", "name", documentContent.poc.name)
                  ) : (
                    <span style={requiredPlaceholderStyle}>[POC Name]</span>
                  )}
                </p>
                {renderRichTextPreview(
                  documentContent.poc.description,
                  "[Enter PoC description]",
                  { sectionKey: "poc", path: "description" },
                )}
              </SectionWrapper>
              )}

              {/* Render custom sections after poc */}
              {sectionExists('list_of_figures_tables') && renderInsertionsAfter('poc')}
              {!sectionExists('list_of_figures_tables') && renderInsertionsAfter('poc', false)}

              {/* ── LIST OF FIGURES & TABLES (Heading 1, #4F81BD) ── */}
              {sectionExists('list_of_figures_tables') && (
              <SectionWrapper
                sectionKey="list_of_figures_tables"
                tocId="section:list_of_figures_tables"
                isActive={isActive("list_of_figures_tables")}
                isHovered={hoveredSection === "list_of_figures_tables"}
                onMouseEnter={() => setHoveredSection("list_of_figures_tables")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("list_of_figures_tables")}
                sectionRef={(el) => (sectionRefs.current.list_of_figures_tables = el)}
                style={sectionStyle("list_of_figures_tables")}
              >
                <h1 style={heading1BlueStyle}>
                  {formatHeadingWithNumber(
                    documentContent.listOfFiguresTables.heading ||
                      "LIST OF FIGURES & TABLES",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>

                {/* ── List of Figures subsection ── */}
                <h2
                  data-toc-id="section:list_of_figures"
                  style={{
                    ...heading2BlackStyle,
                    marginTop: '24px',
                  }}
                >
                  {`${sectionCounter.current}.${getNextSubsectionNumber()} List of Figures`}
                </h2>
                {figureEntries.length > 0 ? (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      margin: '12px 0 24px',
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '8px 12px', backgroundColor: '#D9E2F3', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>S No.</th>
                        <th style={{ border: '1px solid #000', padding: '8px 12px', backgroundColor: '#D9E2F3', textAlign: 'center', fontWeight: 'bold', width: '100px' }}>Fig No.</th>
                        <th style={{ border: '1px solid #000', padding: '8px 12px', backgroundColor: '#D9E2F3', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {figureEntries.map((entry) => (
                        <tr key={entry.figNo}>
                          <td style={{ border: '1px solid #000', padding: '6px 12px', textAlign: 'center' }}>{entry.sNo}</td>
                          <td style={{ border: '1px solid #000', padding: '6px 12px', textAlign: 'center' }}>{entry.figNo}</td>
                          <td style={{ border: '1px solid #000', padding: '6px 12px', textAlign: 'left' }}>{entry.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontStyle: 'italic', color: '#888', margin: '12px 0 24px' }}>
                    No figures in the document.
                  </p>
                )}

                {/* ── List of Tables subsection ── */}
                <h2
                  data-toc-id="section:list_of_tables"
                  style={{
                    ...heading2BlackStyle,
                    marginTop: '24px',
                  }}
                >
                  {`${sectionCounter.current}.${getNextSubsectionNumber()} List of Tables`}
                </h2>
                {tableEntries.length > 0 ? (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      margin: '12px 0 24px',
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '8px 12px', backgroundColor: '#D9E2F3', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>S No.</th>
                        <th style={{ border: '1px solid #000', padding: '8px 12px', backgroundColor: '#D9E2F3', textAlign: 'center', fontWeight: 'bold', width: '100px' }}>Table No.</th>
                        <th style={{ border: '1px solid #000', padding: '8px 12px', backgroundColor: '#D9E2F3', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableEntries.map((entry) => (
                        <tr key={entry.tableNo}>
                          <td style={{ border: '1px solid #000', padding: '6px 12px', textAlign: 'center' }}>{entry.sNo}</td>
                          <td style={{ border: '1px solid #000', padding: '6px 12px', textAlign: 'center' }}>{entry.tableNo}</td>
                          <td style={{ border: '1px solid #000', padding: '6px 12px', textAlign: 'left' }}>{entry.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontStyle: 'italic', color: '#888', margin: '12px 0 24px' }}>
                    No tables in the document.
                  </p>
                )}
              </SectionWrapper>
              )}

              {/* Render custom sections after list_of_figures_tables (last section) */}
              {renderInsertionsAfter('list_of_figures_tables', false)}

              <p
                style={{
                  marginTop: "36px",
                  textAlign: "center",
                  fontFamily: DOC_FONT,
                  fontSize: "11pt",
                }}
              >
                End of Technical Proposal
              </p>
            </PaginatedWordPreview>
          </div>
        </div>

        {/* Section Type Modal */}
        <SectionTypeModal
          isOpen={isSectionTypeModalOpen}
          insertAfterKey={pendingInsertAfterKey}
          availableCustomSections={Object.entries(customSections).map(([key, content]) => ({
            key,
            title: content.title || 'NEW SECTION',
          }))}
          onClose={handleCloseModal}
          onCreateSection={handleCreateSection}
          onCreateSubsection={handleCreateSubsection}
        />
      </>
    );
  },
);

DocumentPreview.displayName = "DocumentPreview";

export default DocumentPreview;
