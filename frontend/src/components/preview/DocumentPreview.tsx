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
  isCustomSectionKey,
  generateCustomSectionKey,
  insertSubsectionAfter,
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
import {
  buildDocumentReferences,
  type FigureReference,
  type TableReference,
} from "../../utils/documentReferences";

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
type TocEntryLevel = 1 | 2 | 3;
type TocPageMap = Record<string, number>;
type InsertTarget = {
  sectionKey: string;
  subsectionKey?: string;
};

interface TocEntry {
  id: string;
  number: string;
  title: string;
  level: TocEntryLevel;
  placement?: SubsectionAnchorPlacement;
}

interface SubsectionAnchorPlacement {
  anchorKey: string;
  insertAfterKey: string;
  insertAfterSubsectionKey?: string;
}

interface SubsectionAnchorOption extends SubsectionAnchorPlacement {
  key: string;
  label: string;
}

interface CurrentSectionContext {
  label: string;
  subsections: SubsectionAnchorOption[];
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

const areTocPageMapsEqual = (a: TocPageMap, b: TocPageMap): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) => a[key] === b[key])
  );
};

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  sectionKey,
  isActive,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  sectionRef,
  style,
  children,
}) => (
  <div
    ref={sectionRef}
    data-section-key={sectionKey}
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
  onAddSectionClick: (
    insertAfterKey: string,
    insertAfterSubsectionKey?: string,
  ) => void;
  onTocPageMapChange?: (pageMap: TocPageMap) => void;
}

const PaginatedWordPreview: React.FC<PaginatedWordPreviewProps> = ({
  children,
  docFont,
  activeSectionKey,
  onSectionClick,
  onSubsectionClick,
  onAddSectionClick,
  onTocPageMapChange,
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
      const insertAfterSubsectionKey =
        breakElement?.getAttribute("data-insert-after-subsection-key") ||
        undefined;

      if (insertAfterKey) {
        onAddSectionClick(insertAfterKey, insertAfterSubsectionKey);
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

      const getPageContent = (page: HTMLElement) =>
        page.querySelector<HTMLElement>(".word-preview-page-content");

      const findLastContentPage = () => {
        const pages = Array.from(
          pagesRoot.querySelectorAll<HTMLElement>(".word-preview-page"),
        );

        for (let index = pages.length - 1; index >= 0; index -= 1) {
          const pageContent = getPageContent(pages[index]);

          if (pageContent && hasContent(pageContent)) {
            return pages[index];
          }
        }

        return null;
      };

      const markLastContentPageInsertAfter = (
        insertAfterKey: string | null,
        insertAfterSubsectionKey?: string | null,
      ) => {
        if (!insertAfterKey) {
          return;
        }

        const page = findLastContentPage();

        if (page) {
          page.dataset.insertAfterKey = insertAfterKey;

          if (insertAfterSubsectionKey) {
            page.dataset.insertAfterSubsectionKey = insertAfterSubsectionKey;
          } else {
            delete page.dataset.insertAfterSubsectionKey;
          }
        }
      };

      const getLastInsertTargetForPage = (
        page: HTMLElement,
      ): InsertTarget | null => {
        const sectionElements = Array.from(
          page.querySelectorAll<HTMLElement>("[data-section-key]"),
        );

        for (let index = sectionElements.length - 1; index >= 0; index -= 1) {
          const sectionKey = sectionElements[index].getAttribute("data-section-key");

          if (sectionKey) {
            return {
              sectionKey,
              subsectionKey:
                sectionElements[index].getAttribute("data-subsection-key") ||
                undefined,
            };
          }
        }

        return null;
      };

      const getInsertTargetForPage = (
        page: HTMLElement,
        pageIndex: number,
        pages: HTMLElement[],
      ): InsertTarget | null => {
        const explicitInsertAfterKey = page.dataset.insertAfterKey;

        if (explicitInsertAfterKey) {
          return {
            sectionKey: explicitInsertAfterKey,
            subsectionKey: page.dataset.insertAfterSubsectionKey || undefined,
          };
        }

        const pageTarget = getLastInsertTargetForPage(page);

        if (pageTarget) {
          return pageTarget;
        }

        for (let index = pageIndex - 1; index >= 0; index -= 1) {
          const fallbackKey = pages[index].dataset.insertAfterKey;

          if (fallbackKey) {
            return {
              sectionKey: fallbackKey,
              subsectionKey:
                pages[index].dataset.insertAfterSubsectionKey || undefined,
            };
          }

          const fallbackTarget = getLastInsertTargetForPage(pages[index]);

          if (fallbackTarget) {
            return fallbackTarget;
          }
        }

        return null;
      };

      const appendPageBreakControls = () => {
        const pages = Array.from(
          pagesRoot.querySelectorAll<HTMLElement>(".word-preview-page"),
        );

        pages[pages.length - 1]?.classList.add("word-preview-page-last");

        pages.forEach((page, pageIndex) => {
          const insertTarget = getInsertTargetForPage(page, pageIndex, pages);

          if (!insertTarget) {
            return;
          }

          page.after(
            createPageBreakControl(
              insertTarget.sectionKey,
              insertTarget.subsectionKey,
            ),
          );
        });
      };

      const startNewPage = () => {
        currentContent = createPage(pagesRoot);
        return currentContent;
      };

      const appendSeparator = (node: Element) => {
        if (!hasContent(currentContent)) {
          currentContent.closest(".word-preview-page")?.remove();
        }

        const separator = node as HTMLElement;
        markLastContentPageInsertAfter(
          separator.getAttribute("data-insert-after-key"),
          separator.getAttribute("data-insert-after-subsection-key"),
        );
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

      appendPageBreakControls();

      if (onTocPageMapChange) {
        const nextPageMap: TocPageMap = {};
        Array.from(
          pagesRoot.querySelectorAll<HTMLElement>(".word-preview-page"),
        ).forEach((page, pageIndex) => {
          page
            .querySelectorAll<HTMLElement>("[data-toc-target-id]")
            .forEach((element) => {
              const tocId = element.getAttribute("data-toc-target-id");

              if (tocId && nextPageMap[tocId] === undefined) {
                nextPageMap[tocId] = pageIndex + 1;
              }
            });
        });
        onTocPageMapChange(nextPageMap);
      }

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
  });

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

const createPageBreakControl = (
  insertAfterKey: string,
  insertAfterSubsectionKey?: string,
): HTMLDivElement => {
  const container = document.createElement("div");
  container.className = "page-break-with-button";
  container.dataset.insertAfterKey = insertAfterKey;
  if (insertAfterSubsectionKey) {
    container.dataset.insertAfterSubsectionKey = insertAfterSubsectionKey;
  }

  const breakZone = document.createElement("div");
  breakZone.className = "page-break-button-zone";

  const breakGuide = document.createElement("div");
  breakGuide.className = "page-break-guide";
  breakGuide.setAttribute("aria-hidden", "true");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "add-section-button";
  button.textContent = "+ Add New Section";
  button.setAttribute("aria-label", `Add new section after ${insertAfterKey}`);

  breakZone.append(breakGuide, button);
  container.appendChild(breakZone);

  return container;
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
    const [zoom, setZoom] = useState<number>(() => {
      const saved = localStorage.getItem("documentPreviewZoom");
      return saved ? parseFloat(saved) : 1;
    });
    const [tocPageMap, setTocPageMap] = useState<TocPageMap>({});

    // State for Section Type Modal
    const [isSectionTypeModalOpen, setIsSectionTypeModalOpen] = useState(false);
    const [pendingInsertAfterKey, setPendingInsertAfterKey] = useState<string>('');
    const [pendingInsertAfterSubsectionKey, setPendingInsertAfterSubsectionKey] =
      useState<string>('');

    // Counter management for section and subsection numbering
    const sectionCounter = useRef<number>(0);
    const subsectionCounter = useRef<number>(0);

    const completedCount = useMemo(() => {
      const excludedSections = [
        "binding_conditions",
        "cybersecurity",
        "disclaimer",
        "scope_definitions",
      ];

      return Object.entries(sectionCompletion).filter(
        ([key, isComplete]) => !excludedSections.includes(key) && isComplete,
      ).length;
    }, [sectionCompletion]);

    const totalCompletable = sectionContents
      ? Object.keys(sectionContents).length - 4
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

    const handleTocPageMapChange = useCallback((nextPageMap: TocPageMap) => {
      setTocPageMap((currentPageMap) =>
        areTocPageMapsEqual(currentPageMap, nextPageMap)
          ? currentPageMap
          : nextPageMap,
      );
    }, []);

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

    const documentReferences = useMemo(
      () =>
        buildDocumentReferences(sectionContents, {
          architecture: Boolean(imageUrls.architecture),
          gantt_overall: Boolean(imageUrls.gantt_overall),
          gantt_shutdown: Boolean(imageUrls.gantt_shutdown),
        }),
      [imageUrls.architecture, imageUrls.gantt_overall, imageUrls.gantt_shutdown, sectionContents],
    );

    const getCustomSectionsAfter = (afterKey: string) =>
      Object.entries(customSections).filter(
        ([_, content]) => content.insertAfterKey === afterKey,
      );

    const isInlineSubsectionSection = (content: CustomSectionContent) =>
      content.displayMode === 'subsection';

    const renderInlineInsertionsAfter = (afterKey: string): React.ReactNode => {
      const inlineSections = getCustomSectionsAfter(afterKey).filter(([_, content]) =>
        isInlineSubsectionSection(content),
      );

      if (inlineSections.length === 0) {
        return null;
      }

      return (
        <>
          {inlineSections.map(([sectionKey]) => (
            <React.Fragment key={sectionKey}>
              {renderInlineCustomSubsectionSection(sectionKey, sectionCounter.current)}
              {renderInlineInsertionsAfter(sectionKey)}
            </React.Fragment>
          ))}
        </>
      );
    };

    const sectionTocId = (sectionKey: string) => `toc-section-${sectionKey}`;
    const groupTocId = (groupKey: string) => `toc-group-${groupKey}`;
    const customSubsectionTocId = (sectionKey: string, subsectionKey: string) =>
      `toc-subsection-${sectionKey}-${subsectionKey}`;
    const featureTocId = (index: number) => `toc-feature-${index}`;
    const listOfFiguresTocId = sectionTocId("list_of_figures_and_tables");
    const listOfFiguresSubsectionTocId = (subsectionKey: string) =>
      `${listOfFiguresTocId}-${subsectionKey}`;

    const cleanTocTitle = (value: string | undefined, fallback: string) =>
      resolveTemplateText(value || fallback, templateReplacements) || fallback;

    const tocEntries = useMemo<TocEntry[]>(() => {
      const entries: TocEntry[] = [];
      const visitedCustomSections = new Set<string>();
      let sectionNumber = 0;
      let subsectionNumber = 0;

      const addTopLevelEntry = (
        id: string,
        title: string,
        placement?: SubsectionAnchorPlacement,
      ) => {
        sectionNumber += 1;
        subsectionNumber = 0;
        entries.push({
          id,
          number: `${sectionNumber}.`,
          title,
          level: 1,
          placement,
        });
      };

      const addSubsectionEntry = (
        id: string,
        title: string,
        placement?: SubsectionAnchorPlacement,
      ) => {
        subsectionNumber += 1;
        entries.push({
          id,
          number: `${sectionNumber}.${subsectionNumber}`,
          title,
          level: 2,
          placement,
        });
      };

      const addNestedSubsectionEntry = (
        id: string,
        title: string,
        nestedNumber: number,
      ) => {
        entries.push({
          id,
          number: `${sectionNumber}.${subsectionNumber}.${nestedNumber}`,
          title,
          level: 3,
        });
      };

      const addCustomAfter = (
        afterKey: string,
        options: { inlineOnly?: boolean } = {},
      ) => {
        const sectionsToRender = getCustomSectionsAfter(afterKey).filter(
          ([sectionKey]) => !visitedCustomSections.has(sectionKey),
        );
        const inlineSections = sectionsToRender.filter(([_, content]) =>
          isInlineSubsectionSection(content),
        );
        const topLevelSections = sectionsToRender.filter(
          ([_, content]) => !isInlineSubsectionSection(content),
        );

        inlineSections.forEach(([sectionKey, content]) => {
          visitedCustomSections.add(sectionKey);
          (content.subsections || []).forEach((subsection) => {
            addSubsectionEntry(
              customSubsectionTocId(sectionKey, subsection.key),
              cleanTocTitle(subsection.name, "NEW SUBSECTION"),
              {
                anchorKey: `${sectionKey}:${subsection.key}`,
                insertAfterKey: sectionKey,
                insertAfterSubsectionKey: subsection.key,
              },
            );
          });
          addCustomAfter(sectionKey, options);
        });

        if (options.inlineOnly) {
          return;
        }

        topLevelSections.forEach(([sectionKey, content]) => {
          visitedCustomSections.add(sectionKey);
          addTopLevelEntry(
            sectionTocId(sectionKey),
            cleanTocTitle(content.title, "NEW SECTION"),
            {
              anchorKey: sectionKey,
              insertAfterKey: sectionKey,
            },
          );
          (content.subsections || []).forEach((subsection) => {
            addSubsectionEntry(
              customSubsectionTocId(sectionKey, subsection.key),
              cleanTocTitle(subsection.name, "NEW SUBSECTION"),
              {
                anchorKey: `${sectionKey}:${subsection.key}`,
                insertAfterKey: sectionKey,
                insertAfterSubsectionKey: subsection.key,
              },
            );
          });
          addCustomAfter(sectionKey);
        });
      };

      const hasGeneralOverview =
        sectionExists("introduction") ||
        sectionExists("abbreviations") ||
        sectionExists("process_flow") ||
        sectionExists("overview");
      const hasOfferings =
        sectionExists("features") ||
        sectionExists("remote_support") ||
        sectionExists("documentation_control") ||
        sectionExists("customer_training") ||
        sectionExists("system_config") ||
        sectionExists("fat_condition");
      const hasSchedule =
        sectionExists("overall_gantt") ||
        sectionExists("shutdown_gantt") ||
        sectionExists("supervisors");
      const hasScopeOfSupply =
        sectionExists("scope_definitions") ||
        sectionExists("division_of_eng") ||
        sectionExists("value_addition") ||
        sectionExists("work_completion") ||
        sectionExists("buyer_obligations") ||
        sectionExists("exclusion_list") ||
        sectionExists("buyer_prerequisites") ||
        sectionExists("binding_conditions") ||
        sectionExists("cybersecurity");

      if (sectionExists("executive_summary")) {
        addCustomAfter("revision_history");
        addTopLevelEntry(
          sectionTocId("executive_summary"),
          cleanTocTitle(
            documentContent.executiveSummary.heading,
            "EXECUTIVE SUMMARY",
          ),
          {
            anchorKey: "executive_summary",
            insertAfterKey: "executive_summary",
          },
        );
        addCustomAfter("executive_summary", { inlineOnly: true });
      }

      if (hasGeneralOverview) {
        addCustomAfter("executive_summary");
        addTopLevelEntry(groupTocId("general_overview"), "GENERAL OVERVIEW");

        if (sectionExists("introduction")) {
          addSubsectionEntry(
            sectionTocId("introduction"),
            cleanTocTitle(documentContent.introduction.heading, "INTRODUCTION"),
            {
              anchorKey: "introduction",
              insertAfterKey: "introduction",
            },
          );
          addCustomAfter("introduction", { inlineOnly: true });
        }
        if (sectionExists("abbreviations")) {
          addSubsectionEntry(
            sectionTocId("abbreviations"),
            cleanTocTitle(
              documentContent.abbreviations.heading,
              "ABBREVIATIONS USED",
            ),
            {
              anchorKey: "abbreviations",
              insertAfterKey: "abbreviations",
            },
          );
          addCustomAfter("abbreviations", { inlineOnly: true });
        }
        if (sectionExists("process_flow")) {
          addSubsectionEntry(
            sectionTocId("process_flow"),
            cleanTocTitle(documentContent.processFlow.heading, "PROCESS FLOW"),
            {
              anchorKey: "process_flow",
              insertAfterKey: "process_flow",
            },
          );
          addCustomAfter("process_flow", { inlineOnly: true });
        }
        if (sectionExists("overview")) {
          addSubsectionEntry(
            sectionTocId("overview"),
            cleanTocTitle(
              documentContent.overview.heading,
              `OVERVIEW OF ${(solutionName || "{SolutionName}").toUpperCase()}`,
            ),
            {
              anchorKey: "overview",
              insertAfterKey: "overview",
            },
          );
          addCustomAfter("overview", { inlineOnly: true });
        }
      }

      if (hasOfferings) {
        addCustomAfter("overview");
        addTopLevelEntry(groupTocId("offerings"), "OFFERINGS");

        if (sectionExists("features")) {
          addSubsectionEntry(
            sectionTocId("features"),
            cleanTocTitle(
              documentContent.features.heading,
              "DESIGN SCOPE OF WORK",
            ),
            {
              anchorKey: "features",
              insertAfterKey: "features",
            },
          );
          featureItems.forEach((feature: any, index: number) => {
            addNestedSubsectionEntry(
              featureTocId(index),
              cleanTocTitle(feature.title, `Feature ${index + 1}`),
              index + 1,
            );
          });
          addCustomAfter("features", { inlineOnly: true });
        }
        if (sectionExists("remote_support")) {
          addSubsectionEntry(
            sectionTocId("remote_support"),
            cleanTocTitle(
              documentContent.remoteSupport.heading,
              "REMOTE SUPPORT SYSTEM",
            ),
            {
              anchorKey: "remote_support",
              insertAfterKey: "remote_support",
            },
          );
          addCustomAfter("remote_support", { inlineOnly: true });
        }
        if (sectionExists("documentation_control")) {
          addSubsectionEntry(
            sectionTocId("documentation_control"),
            cleanTocTitle(
              documentContent.documentationControl.heading,
              "DOCUMENTATION CONTROL",
            ),
            {
              anchorKey: "documentation_control",
              insertAfterKey: "documentation_control",
            },
          );
          addCustomAfter("documentation_control", { inlineOnly: true });
        }
        if (sectionExists("customer_training")) {
          addSubsectionEntry(
            sectionTocId("customer_training"),
            cleanTocTitle(
              documentContent.customerTraining.heading,
              "CUSTOMER TRAINING",
            ),
            {
              anchorKey: "customer_training",
              insertAfterKey: "customer_training",
            },
          );
          addCustomAfter("customer_training", { inlineOnly: true });
        }
        if (sectionExists("system_config")) {
          addSubsectionEntry(
            sectionTocId("system_config"),
            cleanTocTitle(
              documentContent.systemConfig.heading,
              "SYSTEM CONFIGURATION (FOR REFERENCE)",
            ),
            {
              anchorKey: "system_config",
              insertAfterKey: "system_config",
            },
          );
          addCustomAfter("system_config", { inlineOnly: true });
        }
        if (sectionExists("fat_condition")) {
          addSubsectionEntry(
            sectionTocId("fat_condition"),
            cleanTocTitle(documentContent.fatCondition.heading, "FAT CONDITION"),
            {
              anchorKey: "fat_condition",
              insertAfterKey: "fat_condition",
            },
          );
          addCustomAfter("fat_condition", { inlineOnly: true });
        }
      }

      if (sectionExists("tech_stack")) {
        addCustomAfter("fat_condition");
        addTopLevelEntry(
          sectionTocId("tech_stack"),
          cleanTocTitle(documentContent.techStack.heading, "TECHNOLOGY STACK"),
          {
            anchorKey: "tech_stack",
            insertAfterKey: "tech_stack",
          },
        );
        addCustomAfter("tech_stack", { inlineOnly: true });

        if (sectionExists("hardware_specs")) {
          addSubsectionEntry(
            sectionTocId("hardware_specs"),
            cleanTocTitle(
              documentContent.hardwareSpecs.heading,
              "HARDWARE SPECIFICATIONS",
            ),
            {
              anchorKey: "hardware_specs",
              insertAfterKey: "hardware_specs",
            },
          );
          addCustomAfter("hardware_specs", { inlineOnly: true });
        }
        if (sectionExists("software_specs")) {
          addSubsectionEntry(
            sectionTocId("software_specs"),
            cleanTocTitle(
              documentContent.softwareSpecs.heading,
              "SOFTWARE SPECIFICATIONS",
            ),
            {
              anchorKey: "software_specs",
              insertAfterKey: "software_specs",
            },
          );
          addCustomAfter("software_specs", { inlineOnly: true });
        }
        if (sectionExists("third_party_sw")) {
          addSubsectionEntry(
            sectionTocId("third_party_sw"),
            cleanTocTitle(
              documentContent.thirdPartySw.heading,
              "THIRD PARTY SOFTWARE",
            ),
            {
              anchorKey: "third_party_sw",
              insertAfterKey: "third_party_sw",
            },
          );
          addCustomAfter("third_party_sw", { inlineOnly: true });
        }
      }

      if (hasSchedule) {
        addCustomAfter("third_party_sw");
        addTopLevelEntry(groupTocId("schedule"), "SCHEDULE");

        if (sectionExists("overall_gantt")) {
          addSubsectionEntry(
            sectionTocId("overall_gantt"),
            cleanTocTitle(
              documentContent.overallGantt.heading,
              "OVERALL GANTT CHART",
            ),
            {
              anchorKey: "overall_gantt",
              insertAfterKey: "overall_gantt",
            },
          );
          addCustomAfter("overall_gantt", { inlineOnly: true });
        }
        if (sectionExists("shutdown_gantt")) {
          addSubsectionEntry(
            sectionTocId("shutdown_gantt"),
            cleanTocTitle(
              documentContent.shutdownGantt.heading,
              "SHUTDOWN GANTT CHART",
            ),
            {
              anchorKey: "shutdown_gantt",
              insertAfterKey: "shutdown_gantt",
            },
          );
          addCustomAfter("shutdown_gantt", { inlineOnly: true });
        }
        if (sectionExists("supervisors")) {
          addSubsectionEntry(
            sectionTocId("supervisors"),
            cleanTocTitle(documentContent.supervisors.heading, "SUPERVISORS:"),
            {
              anchorKey: "supervisors",
              insertAfterKey: "supervisors",
            },
          );
          addCustomAfter("supervisors", { inlineOnly: true });
        }
      }

      if (hasScopeOfSupply) {
        addCustomAfter("supervisors");
        addTopLevelEntry(groupTocId("scope_of_supply"), "SCOPE OF SUPPLY");

        if (sectionExists("scope_definitions")) {
          addSubsectionEntry(
            sectionTocId("scope_definitions"),
            cleanTocTitle(
              documentContent.scopeDefinitions.heading,
              "SCOPE OF SUPPLY DEFINITIONS",
            ),
            {
              anchorKey: "scope_definitions",
              insertAfterKey: "scope_definitions",
            },
          );
          addCustomAfter("scope_definitions", { inlineOnly: true });
        }
        if (sectionExists("division_of_eng")) {
          addSubsectionEntry(
            sectionTocId("division_of_eng"),
            cleanTocTitle(
              documentContent.divisionOfEng.heading,
              "DIVISION OF ENGINEERING, SOFTWARE DEVELOPMENT, & ERECTION/COMMISSIONING SERVICES",
            ),
            {
              anchorKey: "division_of_eng",
              insertAfterKey: "division_of_eng",
            },
          );
          addCustomAfter("division_of_eng", { inlineOnly: true });
        }
        if (sectionExists("value_addition")) {
          addSubsectionEntry(
            sectionTocId("value_addition"),
            cleanTocTitle(documentContent.valueAddition.heading, "VALUE ADDITION"),
            {
              anchorKey: "value_addition",
              insertAfterKey: "value_addition",
            },
          );
          addCustomAfter("value_addition", { inlineOnly: true });
        }
        if (sectionExists("work_completion")) {
          addSubsectionEntry(
            sectionTocId("work_completion"),
            cleanTocTitle(
              documentContent.workCompletion.heading,
              "WORK COMPLETION CERTIFICATE",
            ),
            {
              anchorKey: "work_completion",
              insertAfterKey: "work_completion",
            },
          );
          addCustomAfter("work_completion", { inlineOnly: true });
        }
        if (sectionExists("buyer_obligations")) {
          addSubsectionEntry(
            sectionTocId("buyer_obligations"),
            cleanTocTitle(
              documentContent.buyerObligations.heading,
              "BUYER OBLIGATIONS",
            ),
            {
              anchorKey: "buyer_obligations",
              insertAfterKey: "buyer_obligations",
            },
          );
          addCustomAfter("buyer_obligations", { inlineOnly: true });
        }
        if (sectionExists("exclusion_list")) {
          addSubsectionEntry(
            sectionTocId("exclusion_list"),
            cleanTocTitle(documentContent.exclusionList.heading, "EXCLUSION LIST"),
            {
              anchorKey: "exclusion_list",
              insertAfterKey: "exclusion_list",
            },
          );
          addCustomAfter("exclusion_list", { inlineOnly: true });
        }
        if (sectionExists("buyer_prerequisites")) {
          addSubsectionEntry(
            sectionTocId("buyer_prerequisites"),
            cleanTocTitle(
              documentContent.buyerPrerequisites.heading,
              "BUYER PREREQUISITES:",
            ),
            {
              anchorKey: "buyer_prerequisites",
              insertAfterKey: "buyer_prerequisites",
            },
          );
          addCustomAfter("buyer_prerequisites", { inlineOnly: true });
        }
        if (sectionExists("binding_conditions")) {
          addSubsectionEntry(
            sectionTocId("binding_conditions"),
            cleanTocTitle(
              documentContent.bindingConditions.heading,
              "BINDING CONDITIONS:",
            ),
            {
              anchorKey: "binding_conditions",
              insertAfterKey: "binding_conditions",
            },
          );
          addCustomAfter("binding_conditions", { inlineOnly: true });
        }
        if (sectionExists("cybersecurity")) {
          addSubsectionEntry(
            sectionTocId("cybersecurity"),
            cleanTocTitle(
              documentContent.cybersecurity.heading,
              "CYBERSECURITY DISCLAIMER",
            ),
            {
              anchorKey: "cybersecurity",
              insertAfterKey: "cybersecurity",
            },
          );
          addCustomAfter("cybersecurity", { inlineOnly: true });
        }
      }

      if (sectionExists("disclaimer")) {
        addCustomAfter("cybersecurity");
        addTopLevelEntry(
          sectionTocId("disclaimer"),
          cleanTocTitle(documentContent.disclaimer.heading, "DISCLAIMER"),
          {
            anchorKey: "disclaimer",
            insertAfterKey: "disclaimer",
          },
        );
        (documentContent.disclaimer.sections || DISCLAIMER_SECTIONS).forEach(
          (section: any) => {
            addSubsectionEntry(
              `${sectionTocId("disclaimer")}-${section.title}`,
              cleanTocTitle(section.title, "DISCLAIMER SECTION"),
            );
          },
        );
      }

      if (sectionExists("poc")) {
        addCustomAfter("disclaimer");
        addTopLevelEntry(
          sectionTocId("poc"),
          cleanTocTitle(
            documentContent.poc.heading,
            "COMPLIMENTRY PROOF OF CONCEPTS (PoC)",
          ),
          {
            anchorKey: "poc",
            insertAfterKey: "poc",
          },
        );
        addCustomAfter("poc", { inlineOnly: true });
      }

      addCustomAfter("poc");
      addTopLevelEntry(listOfFiguresTocId, "LIST OF FIGURES AND TABLES");
      addSubsectionEntry(
        listOfFiguresSubsectionTocId("figures"),
        "List of Figures",
      );
      addSubsectionEntry(
        listOfFiguresSubsectionTocId("tables"),
        "List of Tables",
      );

      return entries;
    }, [
      customSections,
      documentContent,
      featureItems,
      sectionContents,
      solutionName,
      templateReplacements,
    ]);

    const currentSectionContext = useMemo<CurrentSectionContext | null>(() => {
      if (!pendingInsertAfterKey) {
        return null;
      }

      const normalizeSubsectionKey = (value?: string | null) => value || "";
      const placementMatches = (placement?: SubsectionAnchorPlacement) =>
        Boolean(placement) &&
        placement?.insertAfterKey === pendingInsertAfterKey &&
        normalizeSubsectionKey(placement?.insertAfterSubsectionKey) ===
          normalizeSubsectionKey(pendingInsertAfterSubsectionKey);

      let activeTopLevelIndex = -1;
      let matchedTopLevelIndex = -1;

      for (let index = 0; index < tocEntries.length; index += 1) {
        const entry = tocEntries[index];

        if (entry.level === 1) {
          activeTopLevelIndex = index;
        }

        if (placementMatches(entry.placement)) {
          matchedTopLevelIndex = entry.level === 1 ? index : activeTopLevelIndex;
          break;
        }
      }

      if (matchedTopLevelIndex === -1) {
        return null;
      }

      const topLevelEntry = tocEntries[matchedTopLevelIndex];
      const subsections: SubsectionAnchorOption[] = [];

      for (
        let index = matchedTopLevelIndex + 1;
        index < tocEntries.length && tocEntries[index].level !== 1;
        index += 1
      ) {
        const entry = tocEntries[index];

        if (entry.level !== 2 || !entry.placement) {
          continue;
        }

        subsections.push({
          key: entry.placement.anchorKey,
          label: `${entry.number} ${entry.title}`,
          anchorKey: entry.placement.anchorKey,
          insertAfterKey: entry.placement.insertAfterKey,
          insertAfterSubsectionKey: entry.placement.insertAfterSubsectionKey,
        });
      }

      return {
        label: `${topLevelEntry.number} ${topLevelEntry.title}`,
        subsections,
      };
    }, [pendingInsertAfterKey, pendingInsertAfterSubsectionKey, tocEntries]);

    // Inline subsections stay on the current page; only full sections get a page break.
    const renderInsertionsAfter = (
      afterKey: string,
      appendBreakAfterLast: boolean = true,
    ) => {
      const sectionsToRender = getCustomSectionsAfter(afterKey);
      const topLevelSections = sectionsToRender.filter(
        ([_, content]) => !isInlineSubsectionSection(content),
      );

      if (topLevelSections.length === 0) {
        return appendBreakAfterLast ? (
          <PageBreakWithButton
            insertAfterKey={afterKey}
            onAddClick={handleAddSectionClick}
          />
        ) : null;
      }

      return (
        <>
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
                {renderInlineInsertionsAfter(sectionKey)}
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

    const captionStyle: React.CSSProperties = {
      margin: "4px 0 10px",
      fontSize: "10pt",
      textAlign: "center",
      color: "#000000",
    };

    const tableCaptionStyle: React.CSSProperties = {
      ...captionStyle,
      marginTop: "10px",
      marginBottom: "4px",
    };

    const referenceListTableStyle: React.CSSProperties = {
      ...tableStyle,
      marginTop: "6px",
      marginBottom: "18px",
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

    const tocContainerStyle: React.CSSProperties = {
      marginBottom: "32px",
      fontFamily: DOC_FONT,
      color: "#000000",
    };

    const tocTitleStyle: React.CSSProperties = {
      ...heading2RedStyle,
      marginBottom: "14px",
    };

    const tocRowStyle = (level: TocEntryLevel): React.CSSProperties => ({
      display: "flex",
      alignItems: "baseline",
      gap: "4px",
      marginBottom: "3px",
      paddingLeft: level === 1 ? 0 : level === 2 ? "22px" : "44px",
      fontSize: level === 1 ? "8pt" : "7.5pt",
      fontWeight: level === 1 ? "bold" : 600,
      lineHeight: 1.2,
      textTransform: "uppercase",
    });

    const tocNumberStyle: React.CSSProperties = {
      flex: "0 0 38px",
      whiteSpace: "nowrap",
    };

    const tocTextStyle: React.CSSProperties = {
      flex: "0 1 auto",
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    };

    const tocLeaderStyle: React.CSSProperties = {
      flex: "1 1 auto",
      borderBottom: "1px dotted #000000",
      transform: "translateY(-3px)",
      minWidth: "18px",
    };

    const tocPageStyle: React.CSSProperties = {
      flex: "0 0 28px",
      textAlign: "right",
      whiteSpace: "nowrap",
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

    const getMostRecentMarker = (markers: EditMetadata["markers"]) =>
      Object.values(markers)
        .filter((marker) => Boolean(marker.updatedAt))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];

    const getEditedMarker = (sectionKey: string, path: string) => {
      const metadata = getSectionEditMetadata(sectionKey);
      if (!metadata) {
        return undefined;
      }

      const normalizedPath = normalizeEditPath(path);

      return Object.values(metadata.markers)
        .filter((marker) => {
          const markerPath = marker.path;
          const normalizedMarkerPath = normalizeEditPath(markerPath);

          return (
            markerPath === path ||
            markerPath.startsWith(`${path}.`) ||
            normalizedMarkerPath === normalizedPath ||
            normalizedMarkerPath.startsWith(`${normalizedPath}.`)
          );
        })
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    };

    const isEditedPath = (sectionKey: string, path: string): boolean =>
      Boolean(getEditedMarker(sectionKey, path));

    const hasSectionEdits = (sectionKey: string) => {
      const metadata = getSectionEditMetadata(sectionKey);

      return Boolean(metadata && Object.keys(metadata.markers).length > 0);
    };

    const formatEditedTitle = (sectionKey: string, path?: string) => {
      const metadata = getSectionEditMetadata(sectionKey);
      const marker = path ? getEditedMarker(sectionKey, path) : undefined;
      const updatedAt =
        marker?.updatedAt ||
        getMostRecentMarker(metadata?.markers || {})?.updatedAt ||
        metadata?.sectionUpdatedAt;

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
            color: LAST_CHANGED_COLOR,
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
            color: LAST_CHANGED_COLOR,
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
            ...(isRequired ? requiredTextStyle : {}),
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

    const renderTableOfContents = () => (
      <div style={tocContainerStyle}>
        <h2 style={tocTitleStyle}>TABLE OF CONTENTS</h2>
        {tocEntries.map((entry) => (
          <div key={entry.id} style={tocRowStyle(entry.level)}>
            <span style={tocNumberStyle}>{entry.number}</span>
            <span style={tocTextStyle}>{entry.title}</span>
            <span aria-hidden="true" style={tocLeaderStyle} />
            <span style={tocPageStyle}>{tocPageMap[entry.id] || ""}</span>
          </div>
        ))}
      </div>
    );

    const renderFigureCaption = (referenceId: string) => {
      const reference = documentReferences.figureById[referenceId];

      return reference ? (
        <p style={captionStyle}>
          Figure {reference.number}: {reference.name}
        </p>
      ) : null;
    };

    const renderTableCaption = (referenceId: string) => {
      const reference = documentReferences.tableById[referenceId];

      return reference ? (
        <p style={tableCaptionStyle}>
          Table {reference.number}: {reference.name}
        </p>
      ) : null;
    };

    const renderReferenceRows = (
      references: Array<FigureReference | TableReference>,
      numberColumnLabel: string,
      nameColumnLabel: string,
      prefix: "Figure" | "Table",
    ) => (
      <table style={referenceListTableStyle}>
        <thead>
          <tr>
            <th style={{ ...tableHeaderStyle, width: "70px", backgroundColor: "#D9D9D9" }}>
              S No.
            </th>
            <th style={{ ...tableHeaderStyle, width: "110px", backgroundColor: "#D9D9D9" }}>
              {numberColumnLabel}
            </th>
            <th style={{ ...tableHeaderStyle, backgroundColor: "#D9D9D9" }}>
              {nameColumnLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {references.map((reference, index) => (
            <tr key={reference.id}>
              <td style={tableCellStyle}>{index + 1}</td>
              <td style={tableCellStyle}>
                {prefix} {reference.number}
              </td>
              <td style={tableCellStyle}>{reference.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );

    const renderListOfFiguresAndTables = () => (
      <div style={{ marginTop: "36px" }}>
        <h1 {...tocTargetProps(listOfFiguresTocId)} style={heading1BlueStyle}>
          {tocEntries.find((entry) => entry.id === listOfFiguresTocId)?.number ||
            ""}
          {" "}
          LIST OF FIGURES AND TABLES
        </h1>
        <h2
          {...tocTargetProps(listOfFiguresSubsectionTocId("figures"))}
          style={heading2BlackStyle}
        >
          {tocEntries.find(
            (entry) => entry.id === listOfFiguresSubsectionTocId("figures"),
          )?.number || ""}
          {" "}
          List of Figures
        </h2>
        {renderReferenceRows(
          documentReferences.figures,
          "Figure No.",
          "Figure Name",
          "Figure",
        )}
        <h2
          {...tocTargetProps(listOfFiguresSubsectionTocId("tables"))}
          style={heading2BlackStyle}
        >
          {tocEntries.find(
            (entry) => entry.id === listOfFiguresSubsectionTocId("tables"),
          )?.number || ""}
          {" "}
          List of Tables
        </h2>
        {renderReferenceRows(
          documentReferences.tables,
          "Table No.",
          "Table Name",
          "Table",
        )}
      </div>
    );

    const renderImageOrPlaceholder = (
      imageType: PreviewImageType,
      placeholderText: string,
      alt: string,
      referenceId: string,
    ) => {
      const imageUrl = imageUrls[imageType];

      if (imageUrl) {
        return (
          <>
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
            {renderFigureCaption(referenceId)}
          </>
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

    const handleAddSectionClick = (
      insertAfterKey: string,
      insertAfterSubsectionKey?: string,
    ) => {
      setPendingInsertAfterKey(insertAfterKey);
      setPendingInsertAfterSubsectionKey(insertAfterSubsectionKey || '');
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
      insertAfterSubsectionKey?: string,
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
        subsections: insertSubsectionAfter(
          parentSection.subsections,
          subsection,
          insertAfterSubsectionKey,
        ),
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
      setPendingInsertAfterSubsectionKey('');
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

    const tocTargetProps = (id: string) => ({
      "data-toc-target-id": id,
    });

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
              <div key={tableIndex}>
                {renderTableCaption(`table:${sectionKey}:${subsection.key}:${tableIndex}`)}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    margin: '4px 0 16px',
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
              </div>
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
              <div key={`${image.filename}-${index}`}>
                <img
                  src={image.base64}
                  alt={image.filename}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
                {renderFigureCaption(`figure:${sectionKey}:${subsection.key}:${index}`)}
              </div>
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
          <h2
            {...tocTargetProps(customSubsectionTocId(sectionKey, subsection.key))}
            style={heading2BlackStyle}
          >
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
          isActive={isActive(sectionKey)}
          isHovered={hoveredSection === sectionKey}
          onMouseEnter={() => setHoveredSection(sectionKey)}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick(sectionKey)}
          sectionRef={(el) => (sectionRefs.current[sectionKey] = el)}
          style={sectionStyle(sectionKey)}
        >
          <h1 {...tocTargetProps(sectionTocId(sectionKey))} style={heading1RedStyle}>
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
          .page-break-with-button {
            width: ${WORD_PAGE_WIDTH};
            max-width: 100%;
            margin: 0 auto;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 18px 24px;
            background-color: #E8E8E8;
            box-shadow: inset 0 8px 10px -10px rgba(15, 23, 42, 0.22), inset 0 -8px 10px -10px rgba(15, 23, 42, 0.22);
          }
          .page-break-button-zone {
            position: relative;
            min-height: 44px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .page-break-guide {
            position: absolute;
            left: 24px;
            right: 24px;
            top: 50%;
            transform: translateY(-50%);
            border-top: 1px solid #D1D5DB;
            z-index: 0;
          }
          .add-section-button {
            padding: 8px 18px;
            background-color: #FFFFFF;
            color: #E60012;
            border: 1px solid #E60012;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
            position: relative;
            z-index: 1;
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
          .word-preview-page:last-child,
          .word-preview-page.word-preview-page-last {
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
              onTocPageMapChange={handleTocPageMapChange}
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
                <h2
                  {...tocTargetProps(sectionTocId("remote_support"))}
                  style={heading2RedStyle}
                >
                  {documentContent.revisionHistory.heading || "REVISION HISTORY:"}
                </h2>
                {renderTableCaption("table:revision_history")}
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

              {renderTableOfContents()}

              {/* Page Break: End of Page 2-4 (Revision History / Legal / TOC) */}
              {sectionExists('executive_summary') &&
                renderInsertionsAfter('revision_history')}

              {/* ── EXECUTIVE SUMMARY ── */}
              {sectionExists('executive_summary') && (
              <SectionWrapper
                sectionKey="executive_summary"
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
                <h1
                  {...tocTargetProps(sectionTocId("executive_summary"))}
                  style={heading1BurgundyStyle}
                >
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
                {renderTemplateParagraphs(
                  (documentContent.executiveSummary.paragraphs ||
                    EXECUTIVE_SUMMARY_PARAGRAPHS).slice(1),
                )}
                <p style={bodyParagraphStyle}>Some of our clients include:</p>
                {renderTableCaption("table:executive_summary:client_logos")}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "18px",
                  }}
                >
                  <tbody>
                    {(documentContent.executiveSummary.client_logo_rows || [
                      ["HITACHI", "Client Logo", "Client Logo"],
                      ["Client Logo", "Client Logo", "Client Logo"],
                    ]).map((row: string[], rowIndex: number) => (
                      <tr key={`logo-row-${rowIndex}`}>
                        {row.map((cell, columnIndex) => (
                          <td
                            key={`logo-cell-${rowIndex}-${columnIndex}`}
                            style={{
                              border: "1px solid #D1D5DB",
                              height: "54px",
                              textAlign: "center",
                              color: "#9CA3AF",
                              fontSize: "9pt",
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionWrapper>
              )}
              {sectionExists('executive_summary') && renderInlineInsertionsAfter('executive_summary')}

              {/* Page Break: End of Page 5 (Executive Summary) */}
              {(sectionExists('introduction') || sectionExists('abbreviations') ||
                sectionExists('process_flow') || sectionExists('overview')) &&
                renderInsertionsAfter('executive_summary')}

              {/* ── GENERAL OVERVIEW heading (Heading 1, #EE0000) ── */}
              {(sectionExists('introduction') || sectionExists('abbreviations') || 
                sectionExists('process_flow') || sectionExists('overview')) && (
                <h1
                  {...tocTargetProps(groupTocId("general_overview"))}
                  style={heading1RedStyle}
                >
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
                  isActive={isActive("introduction")}
                  isHovered={hoveredSection === "introduction"}
                  onMouseEnter={() => setHoveredSection("introduction")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("introduction")}
                  sectionRef={(el) => (sectionRefs.current.introduction = el)}
                  style={sectionStyle("introduction")}
                >
                  {/* Heading 2, no color (black) — matches template */}
                  <h2
                    {...tocTargetProps(sectionTocId("introduction"))}
                    style={heading2BlackStyle}
                  >
                    {formatHeadingWithNumber(
                      documentContent.introduction.heading || "INTRODUCTION",
                      `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                    )}
                  </h2>
                  {renderTemplateParagraphs(
                    documentContent.introduction.paragraphs ||
                      INTRODUCTION_PARAGRAPHS,
                  )}
                </SectionWrapper>
              )}
              {sectionExists('introduction') && renderInlineInsertionsAfter('introduction')}

              {/* ── ABBREVIATIONS ── */}
              {sectionExists('abbreviations') && (
                <SectionWrapper
                  sectionKey="abbreviations"
                  isActive={isActive("abbreviations")}
                  isHovered={hoveredSection === "abbreviations"}
                  onMouseEnter={() => setHoveredSection("abbreviations")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("abbreviations")}
                  sectionRef={(el) => (sectionRefs.current.abbreviations = el)}
                  style={sectionStyle("abbreviations")}
                >
                  <h2
                    {...tocTargetProps(sectionTocId("abbreviations"))}
                    style={heading2RedStyle}
                  >
                    {formatHeadingWithNumber(
                      documentContent.abbreviations.heading ||
                        "ABBREVIATIONS USED",
                      `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                    )}
                  </h2>
                  {renderTableCaption("table:abbreviations")}
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
              {sectionExists('abbreviations') && renderInlineInsertionsAfter('abbreviations')}

              {/* ── PROCESS FLOW ── */}
              {sectionExists('process_flow') && (
                <SectionWrapper
                  sectionKey="process_flow"
                  isActive={isActive("process_flow")}
                  isHovered={hoveredSection === "process_flow"}
                  onMouseEnter={() => setHoveredSection("process_flow")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("process_flow")}
                  sectionRef={(el) => (sectionRefs.current.process_flow = el)}
                  style={sectionStyle("process_flow")}
                >
                  <h2
                    {...tocTargetProps(sectionTocId("process_flow"))}
                    style={heading2RedStyle}
                  >
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
              {sectionExists('process_flow') && renderInlineInsertionsAfter('process_flow')}

              {/* ── OVERVIEW ── */}
              {sectionExists('overview') && (
                <SectionWrapper
                  sectionKey="overview"
                  isActive={isActive("overview")}
                  isHovered={hoveredSection === "overview"}
                  onMouseEnter={() => setHoveredSection("overview")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("overview")}
                  sectionRef={(el) => (sectionRefs.current.overview = el)}
                  style={sectionStyle("overview")}
                >
                  <h2
                    {...tocTargetProps(sectionTocId("overview"))}
                    style={heading2RedStyle}
                  >
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
              {sectionExists('overview') && renderInlineInsertionsAfter('overview')}

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
                <h1
                  {...tocTargetProps(groupTocId("offerings"))}
                  style={heading1RedStyle}
                >
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
                isActive={isActive("features")}
                isHovered={hoveredSection === "features"}
                onMouseEnter={() => setHoveredSection("features")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("features")}
                sectionRef={(el) => (sectionRefs.current.features = el)}
                style={sectionStyle("features")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("features"))}
                  style={heading2RedStyle}
                >
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
                  featureItems.map((feature: any, index: number) => (
                    <div
                      key={feature.id || `feature-${index}`}
                      style={{ marginBottom: "14px" }}
                    >
                      {/* Feature titles: Heading 2, no color (black) — matches template */}
                      <h2
                        {...tocTargetProps(featureTocId(index))}
                        style={heading2BlackStyle}
                      >
                        {renderRequiredValue(
                          "features",
                          `items.${index}.title`,
                          feature.title || `Feature ${index + 1}`,
                        )}
                      </h2>
                      {renderRichTextPreview(
                        feature.description,
                        "[Enter feature description]",
                        { sectionKey: "features", path: `items.${index}.description` },
                      )}
                    </div>
                  ))
                ) : (
                  <p style={requiredPlaceholderStyle}>
                    [No features defined yet]
                  </p>
                )}
              </SectionWrapper>
              )}

              {/* ── REMOTE SUPPORT ── */}
              {sectionExists("features") && renderInlineInsertionsAfter("features")}

              {sectionExists("remote_support") && (
                <SectionWrapper
                sectionKey="remote_support"
                isActive={isActive("remote_support")}
                isHovered={hoveredSection === "remote_support"}
                onMouseEnter={() => setHoveredSection("remote_support")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("remote_support")}
                sectionRef={(el) => (sectionRefs.current.remote_support = el)}
                style={sectionStyle("remote_support")}
              >
                {/* Heading 2, #EE0000 — matches template (was incorrectly black before) */}
                <h2
                  {...tocTargetProps(sectionTocId("documentation_control"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists("remote_support") && renderInlineInsertionsAfter("remote_support")}

              {sectionExists("documentation_control") && (
                <SectionWrapper
                sectionKey="documentation_control"
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
                <h2
                  {...tocTargetProps(sectionTocId("customer_training"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists("documentation_control") && renderInlineInsertionsAfter("documentation_control")}

              {sectionExists("customer_training") && (
                <SectionWrapper
                sectionKey="customer_training"
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
                <h2
                  {...tocTargetProps(sectionTocId("system_config"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists("customer_training") && renderInlineInsertionsAfter("customer_training")}

              {sectionExists("system_config") && (
                <SectionWrapper
                sectionKey="system_config"
                isActive={isActive("system_config")}
                isHovered={hoveredSection === "system_config"}
                onMouseEnter={() => setHoveredSection("system_config")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("system_config")}
                sectionRef={(el) => (sectionRefs.current.system_config = el)}
                style={sectionStyle("system_config")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("fat_condition"))}
                  style={heading2RedStyle}
                >
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
                  "figure:system_config:architecture",
                )}
                <p style={noteParagraphStyle}>
                  {documentContent.systemConfig.note ||
                    "Note: The above architecture is provided for illustrative purposes only and is subject to modification during detailed engineering to optimize overall system performance and functionality"}
                </p>
              </SectionWrapper>
              )}

              {/* ── FAT CONDITION ── */}
              {sectionExists("system_config") && renderInlineInsertionsAfter("system_config")}

              {sectionExists("fat_condition") && (
                <SectionWrapper
                sectionKey="fat_condition"
                isActive={isActive("fat_condition")}
                isHovered={hoveredSection === "fat_condition"}
                onMouseEnter={() => setHoveredSection("fat_condition")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("fat_condition")}
                sectionRef={(el) => (sectionRefs.current.fat_condition = el)}
                style={sectionStyle("fat_condition")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("fat_condition"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists('fat_condition') && renderInlineInsertionsAfter('fat_condition')}

              {/* Page Break: End of Page 9-11 (Offerings) */}
              {sectionExists('tech_stack') && renderInsertionsAfter('fat_condition')}

              {/* ── TECHNOLOGY STACK (Heading 1, #EE0000) ── */}
              {sectionExists('tech_stack') && (
                <SectionWrapper
                  sectionKey="tech_stack"
                  isActive={isActive("tech_stack")}
                  isHovered={hoveredSection === "tech_stack"}
                  onMouseEnter={() => setHoveredSection("tech_stack")}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick("tech_stack")}
                  sectionRef={(el) => (sectionRefs.current.tech_stack = el)}
                  style={sectionStyle("tech_stack")}
                >
                  <h1
                    {...tocTargetProps(sectionTocId("tech_stack"))}
                    style={heading1RedStyle}
                  >
                    {formatHeadingWithNumber(
                      documentContent.techStack.heading || "TECHNOLOGY STACK",
                      `${getNextSectionNumber()}.`,
                    )}
                  </h1>
                <p style={{ ...bodyParagraphStyle, textAlign: "left" }}>
                  {documentContent.techStack.intro_text ||
                    "The technology stack for various components is as follows:"}
                </p>
                {renderTableCaption("table:tech_stack")}
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
              {sectionExists('tech_stack') && renderInlineInsertionsAfter('tech_stack')}

              {sectionExists('hardware_specs') && (
                <SectionWrapper
                sectionKey="hardware_specs"
                isActive={isActive("hardware_specs")}
                isHovered={hoveredSection === "hardware_specs"}
                onMouseEnter={() => setHoveredSection("hardware_specs")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("hardware_specs")}
                sectionRef={(el) => (sectionRefs.current.hardware_specs = el)}
                style={sectionStyle("hardware_specs")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("hardware_specs"))}
                  style={heading2RedStyle}
                >
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
                {renderTableCaption("table:hardware_specs")}
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
              {sectionExists('hardware_specs') && renderInlineInsertionsAfter('hardware_specs')}

              {sectionExists('software_specs') && (
                <SectionWrapper
                sectionKey="software_specs"
                isActive={isActive("software_specs")}
                isHovered={hoveredSection === "software_specs"}
                onMouseEnter={() => setHoveredSection("software_specs")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("software_specs")}
                sectionRef={(el) => (sectionRefs.current.software_specs = el)}
                style={sectionStyle("software_specs")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("software_specs"))}
                  style={heading2RedStyle}
                >
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
                {renderTableCaption("table:software_specs")}
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
              {sectionExists('software_specs') && renderInlineInsertionsAfter('software_specs')}

              {sectionExists('third_party_sw') && (
                <SectionWrapper
                sectionKey="third_party_sw"
                isActive={isActive("third_party_sw")}
                isHovered={hoveredSection === "third_party_sw"}
                onMouseEnter={() => setHoveredSection("third_party_sw")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("third_party_sw")}
                sectionRef={(el) => (sectionRefs.current.third_party_sw = el)}
                style={sectionStyle("third_party_sw")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("third_party_sw"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists('third_party_sw') && renderInlineInsertionsAfter('third_party_sw')}

              {(sectionExists("overall_gantt") ||
                sectionExists("shutdown_gantt") ||
                sectionExists("supervisors")) &&
                renderInsertionsAfter('third_party_sw')}

              {/* ── SCHEDULE (Heading 1, #EE0000) ── */}
              {(sectionExists("overall_gantt") ||
                sectionExists("shutdown_gantt") ||
                sectionExists("supervisors")) && (
                <h1
                  {...tocTargetProps(groupTocId("schedule"))}
                  style={heading1RedStyle}
                >
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
                isActive={isActive("overall_gantt")}
                isHovered={hoveredSection === "overall_gantt"}
                onMouseEnter={() => setHoveredSection("overall_gantt")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("overall_gantt")}
                sectionRef={(el) => (sectionRefs.current.overall_gantt = el)}
                style={sectionStyle("overall_gantt")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("overall_gantt"))}
                  style={heading2RedStyle}
                >
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
                  "figure:overall_gantt",
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
              {sectionExists("overall_gantt") && renderInlineInsertionsAfter("overall_gantt")}

              {sectionExists("shutdown_gantt") && (
                <SectionWrapper
                sectionKey="shutdown_gantt"
                isActive={isActive("shutdown_gantt")}
                isHovered={hoveredSection === "shutdown_gantt"}
                onMouseEnter={() => setHoveredSection("shutdown_gantt")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("shutdown_gantt")}
                sectionRef={(el) => (sectionRefs.current.shutdown_gantt = el)}
                style={sectionStyle("shutdown_gantt")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("shutdown_gantt"))}
                  style={heading2RedStyle}
                >
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
                  "figure:shutdown_gantt",
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
              {sectionExists("shutdown_gantt") && renderInlineInsertionsAfter("shutdown_gantt")}

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
                <h3
                  {...tocTargetProps(sectionTocId("supervisors"))}
                  style={heading3RedStyle}
                >
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
              {sectionExists("supervisors") && renderInlineInsertionsAfter("supervisors")}

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
              <h1
                {...tocTargetProps(groupTocId("scope_of_supply"))}
                style={heading1RedStyle}
              >
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
                <h2
                  {...tocTargetProps(sectionTocId("scope_definitions"))}
                  style={heading2BlackStyle}
                >
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
              {sectionExists('scope_definitions') && renderInlineInsertionsAfter('scope_definitions')}

              {sectionExists('division_of_eng') && (
              <SectionWrapper
                sectionKey="division_of_eng"
                isActive={isActive("division_of_eng")}
                isHovered={hoveredSection === "division_of_eng"}
                onMouseEnter={() => setHoveredSection("division_of_eng")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("division_of_eng")}
                sectionRef={(el) => (sectionRefs.current.division_of_eng = el)}
                style={sectionStyle("division_of_eng")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("division_of_eng"))}
                  style={heading2RedStyle}
                >
                  {formatHeadingWithNumber(
                    documentContent.divisionOfEng.heading ||
                      "DIVISION OF ENGINEERING, SOFTWARE DEVELOPMENT, & ERECTION/COMMISSIONING SERVICES",
                    `${sectionCounter.current}.${getNextSubsectionNumber()}`,
                  )}
                </h2>
                {renderTableCaption("table:division_of_eng")}
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
              {sectionExists('division_of_eng') && renderInlineInsertionsAfter('division_of_eng')}

              {sectionExists('value_addition') && (
              <SectionWrapper
                sectionKey="value_addition"
                isActive={isActive("value_addition")}
                isHovered={hoveredSection === "value_addition"}
                onMouseEnter={() => setHoveredSection("value_addition")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("value_addition")}
                sectionRef={(el) => (sectionRefs.current.value_addition = el)}
                style={sectionStyle("value_addition")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("value_addition"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists('value_addition') && renderInlineInsertionsAfter('value_addition')}

              {sectionExists('work_completion') && (
              <SectionWrapper
                sectionKey="work_completion"
                isActive={isActive("work_completion")}
                isHovered={hoveredSection === "work_completion"}
                onMouseEnter={() => setHoveredSection("work_completion")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("work_completion")}
                sectionRef={(el) => (sectionRefs.current.work_completion = el)}
                style={sectionStyle("work_completion")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("work_completion"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists('work_completion') && renderInlineInsertionsAfter('work_completion')}

              {sectionExists('buyer_obligations') && (
              <SectionWrapper
                sectionKey="buyer_obligations"
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
                <h2
                  {...tocTargetProps(sectionTocId("buyer_obligations"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists('buyer_obligations') && renderInlineInsertionsAfter('buyer_obligations')}

              {sectionExists('exclusion_list') && (
              <SectionWrapper
                sectionKey="exclusion_list"
                isActive={isActive("exclusion_list")}
                isHovered={hoveredSection === "exclusion_list"}
                onMouseEnter={() => setHoveredSection("exclusion_list")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("exclusion_list")}
                sectionRef={(el) => (sectionRefs.current.exclusion_list = el)}
                style={sectionStyle("exclusion_list")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("exclusion_list"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists('exclusion_list') && renderInlineInsertionsAfter('exclusion_list')}

              {sectionExists('buyer_prerequisites') && (
              <SectionWrapper
                sectionKey="buyer_prerequisites"
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
                <h2
                  {...tocTargetProps(sectionTocId("buyer_prerequisites"))}
                  style={heading2RedStyle}
                >
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
              {sectionExists('buyer_prerequisites') && renderInlineInsertionsAfter('buyer_prerequisites')}

              {sectionExists('binding_conditions') && (
              <SectionWrapper
                sectionKey="binding_conditions"
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
                <h2
                  {...tocTargetProps(sectionTocId("binding_conditions"))}
                  style={heading2BlueStyle}
                >
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
              {sectionExists('binding_conditions') && renderInlineInsertionsAfter('binding_conditions')}

              {sectionExists('cybersecurity') && (
              <SectionWrapper
                sectionKey="cybersecurity"
                isActive={isActive("cybersecurity")}
                isHovered={hoveredSection === "cybersecurity"}
                onMouseEnter={() => setHoveredSection("cybersecurity")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("cybersecurity")}
                sectionRef={(el) => (sectionRefs.current.cybersecurity = el)}
                style={sectionStyle("cybersecurity")}
              >
                <h2
                  {...tocTargetProps(sectionTocId("cybersecurity"))}
                  style={heading2BlueStyle}
                >
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

              {sectionExists('cybersecurity') && renderInlineInsertionsAfter('cybersecurity')}

              {/* Page Break: End of Page 16-23 (Scope of Supply) */}
              {sectionExists('disclaimer') &&
                renderInsertionsAfter('cybersecurity')}

              {/* ── DISCLAIMER (Heading 1, #4F81BD) ── */}
              {sectionExists('disclaimer') && (
              <SectionWrapper
                sectionKey="disclaimer"
                isActive={isActive("disclaimer")}
                isHovered={hoveredSection === "disclaimer"}
                onMouseEnter={() => setHoveredSection("disclaimer")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("disclaimer")}
                sectionRef={(el) => (sectionRefs.current.disclaimer = el)}
                style={sectionStyle("disclaimer")}
              >
                <h1
                  {...tocTargetProps(sectionTocId("disclaimer"))}
                  style={heading1BlueStyle}
                >
                  {formatHeadingWithNumber(
                    documentContent.disclaimer.heading || "DISCLAIMER",
                    `${getNextSectionNumber()}.`,
                  )}
                </h1>
                {(documentContent.disclaimer.sections || DISCLAIMER_SECTIONS).map((section: any) => (
                  <div key={section.title} style={{ marginBottom: "18px" }}>
                    {/* Disclaimer subsections: Heading 2, no color (black) — matches template */}
                    <h2
                      {...tocTargetProps(`${sectionTocId("disclaimer")}-${section.title}`)}
                      style={heading2BlackStyle}
                    >
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

              {sectionExists('disclaimer') && renderInlineInsertionsAfter('disclaimer')}

              {/* Page Break: End of Page 24-25 (Disclaimer) */}
              {sectionExists('poc') && renderInsertionsAfter('disclaimer')}

              {/* ── PROOF OF CONCEPT (Heading 1, #4F81BD) ── */}
              {sectionExists('poc') && (
              <SectionWrapper
                sectionKey="poc"
                isActive={isActive("poc")}
                isHovered={hoveredSection === "poc"}
                onMouseEnter={() => setHoveredSection("poc")}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick("poc")}
                sectionRef={(el) => (sectionRefs.current.poc = el)}
                style={sectionStyle("poc")}
              >
                <h1 {...tocTargetProps(sectionTocId("poc"))} style={heading1BlueStyle}>
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

              {sectionExists('poc') && renderInlineInsertionsAfter('poc')}

              {/* Render custom sections after poc (last section) */}
              {renderInsertionsAfter('poc', false)}

              {renderListOfFiguresAndTables()}

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
          insertAfterSubsectionKey={pendingInsertAfterSubsectionKey || undefined}
          currentSection={currentSectionContext}
          availableCustomSections={Object.entries(customSections).map(([key, content]) => ({
            key,
            title: content.title || 'NEW SECTION',
            subsections: content.subsections.map((subsection) => ({
              key: subsection.key,
              name: subsection.name,
            })),
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
