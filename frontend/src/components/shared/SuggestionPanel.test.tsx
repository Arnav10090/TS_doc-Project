import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import * as fc from 'fast-check'
import SuggestionPanel from './SuggestionPanel'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

afterEach(() => {
  cleanup()
})

describe('SuggestionPanel', () => {
  it('renders introduction suggestions in formatted form without showing embedded JSON', () => {
    const repeatedParagraph =
      'This Technical Specification (TS) document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.'

    render(
      <SuggestionPanel
        sectionKey="introduction"
        sectionTitle="Introduction"
        suggestion={{
          section_key: 'introduction',
          structured_import_available: true,
          content: `${repeatedParagraph}

The solution is tailored to the specific needs of the JSPL Angul facility.

{
  "paragraphs": [
    "${repeatedParagraph}",
    "The solution is tailored to the specific needs of the JSPL Angul facility."
  ],
  "tender_reference": "TS-PMYMS-2026-001",
  "tender_date": "29 Jun 2026"
}`,
        }}
      />,
    )

    expect(
      screen.getAllByText(
        /This Technical Specification \(TS\) document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026\./,
      ),
    ).toHaveLength(1)
    expect(screen.getByText(/Tender Information/i)).toBeInTheDocument()
    expect(screen.queryByText(/\{"paragraphs":/i)).toBeNull()
  })

  it('formats markdown-style introduction metadata labels cleanly', () => {
    render(
      <SuggestionPanel
        sectionKey="introduction"
        sectionTitle="Introduction"
        suggestion={{
          section_key: 'introduction',
          structured_import_available: true,
          content:
            'This Technical Specification (TS) document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.\n\nTender Information\n- **tender_reference**: TS-PMYMS-2026-001\n- **tender_date**: 29 Jun 2026',
        }}
      />,
    )

    expect(screen.getByText(/Tender Information/i)).toBeInTheDocument()
    expect(screen.getByText(/Tender Reference:/i)).toBeInTheDocument()
    expect(screen.getByText(/Tender Date:/i)).toBeInTheDocument()
    expect(screen.queryByText(/\*\*tender_reference\*\*/i)).toBeNull()
    expect(screen.queryByText(/\*\*tender_date\*\*/i)).toBeNull()
  })

  /**
   * Bug Condition Exploration Test
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * DO NOT attempt to fix the test or the code when it fails
   * 
   * This test encodes the expected behavior (no context sources display) and will
   * validate the fix when it passes after implementation.
   * 
   * GOAL: Surface counterexamples that demonstrate the unwanted context sources display
   */
  describe('Bug Condition Exploration: Context Sources Display', () => {
    it('should NOT display context sources heading or list when context_sources array exists and has length > 0', () => {
      // Generate various suggestion types with context_sources to trigger bug condition
      fc.assert(
        fc.property(
          // Generate different section types
          fc.constantFrom('introduction', 'project_schedule', 'abbreviations', 'system_config', 'overall_gantt'),
          // Generate context sources arrays (non-empty to trigger bug condition)
          fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          // Generate section content
          fc.string({ minLength: 20, maxLength: 100 }),

          (sectionKey, contextSources, content) => {
            // Render SuggestionPanel with suggestion containing context_sources
            const { container } = render(
              <SuggestionPanel
                sectionKey={sectionKey}
                sectionTitle={`Test Section: ${sectionKey}`}
                suggestion={{
                  section_key: sectionKey,
                  structured_import_available: false,
                  raw_text: content,
                  context_sources: contextSources,
                  context_txt_used: true,
                }}
                onImport={vi.fn()}
                onRegenerate={vi.fn()}
                onDismiss={vi.fn()}
              />,
            )

            // EXPECTED BEHAVIOR (after fix): Context sources should NOT be displayed
            // On UNFIXED code, these assertions will FAIL, proving the bug exists
            
            // Assert: "Context sources" heading should NOT be present
            expect(screen.queryByText(/Context sources/i)).toBeNull()
            
            // Assert: Source file paths should NOT be visible in the UI
            contextSources.forEach(source => {
              expect(screen.queryByText(source)).toBeNull()
            })

            // Verify the container doesn't have the context sources display
            const html = container.innerHTML
            expect(html).not.toMatch(/Context sources/i)
          },
        ),
        { numRuns: 50 }, // Run 50 test cases with different suggestion types
      )
    })

    it('should NOT display context sources for introduction section with structured content', () => {
      const contextSources = [
        'docs/requirements/system-architecture.md',
        'docs/specifications/technical-details.md',
        'docs/context/project-background.md',
      ]

      const { container } = render(
        <SuggestionPanel
          sectionKey="introduction"
          sectionTitle="Introduction"
          suggestion={{
            section_key: 'introduction',
            structured_import_available: true,
            content: `This Technical Specification document outlines the solution for the client.

The solution addresses key business requirements and technical constraints.

{
  "paragraphs": [
    "This Technical Specification document outlines the solution for the client.",
    "The solution addresses key business requirements and technical constraints."
  ],
  "tender_reference": "TS-2024-001",
  "tender_date": "15 Jan 2024"
}`,
            context_sources: contextSources,
            context_txt_used: true,
          }}
          onImport={vi.fn()}
          onRegenerate={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      // EXPECTED BEHAVIOR: Context sources should NOT be displayed
      expect(screen.queryByText(/Context sources/i)).toBeNull()
      
      // Verify none of the source files are displayed
      contextSources.forEach(source => {
        expect(screen.queryByText(source)).toBeNull()
      })

      // Verify the container doesn't have the context sources display
      const html = container.innerHTML
      expect(html).not.toMatch(/Context sources/i)
    })

    it('should NOT display context sources for table section', () => {
      const contextSources = [
        'data/tables/abbreviations.json',
        'docs/references/terminology.md',
      ]

      const { container } = render(
        <SuggestionPanel
          sectionKey="abbreviations"
          sectionTitle="Abbreviations"
          suggestion={{
            section_key: 'abbreviations',
            structured_import_available: true,
            content: {
              rows: [
                { sr_no: 1, abbreviation: 'API', description: 'Application Programming Interface' },
                { sr_no: 2, abbreviation: 'DB', description: 'Database' },
              ],
            },
            context_sources: contextSources,
            context_txt_used: true,
          }}
          onImport={vi.fn()}
          onRegenerate={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      // EXPECTED BEHAVIOR: Context sources should NOT be displayed
      expect(screen.queryByText(/Context sources/i)).toBeNull()
      
      // Verify none of the source files are displayed
      contextSources.forEach(source => {
        expect(screen.queryByText(source)).toBeNull()
      })

      // Verify the container doesn't have the context sources display
      const html = container.innerHTML
      expect(html).not.toMatch(/Context sources/i)
    })

    it('should NOT display context sources for Draw.io-enabled sections (system_config)', () => {
      const contextSources = [
        'architecture/system-design.md',
        'diagrams/component-layout.drawio',
      ]

      const { container } = render(
        <SuggestionPanel
          sectionKey="system_config"
          sectionTitle="System Configuration"
          suggestion={{
            section_key: 'system_config',
            structured_import_available: false,
            raw_text: 'System architecture description with component details.',
            context_sources: contextSources,
            context_txt_used: true,
          }}
          onImport={vi.fn()}
          onRegenerate={vi.fn()}
          onGenerateDrawio={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      // EXPECTED BEHAVIOR: Context sources should NOT be displayed
      expect(screen.queryByText(/Context sources/i)).toBeNull()
      
      // Verify none of the source files are displayed
      contextSources.forEach(source => {
        expect(screen.queryByText(source)).toBeNull()
      })

      // Verify the container doesn't have the context sources display
      const html = container.innerHTML
      expect(html).not.toMatch(/Context sources/i)
    })

    it('should NOT display context sources for structured section with subsections', () => {
      const contextSources = [
        'docs/project-schedule.md',
        'data/milestones.json',
      ]

      const { container } = render(
        <SuggestionPanel
          sectionKey="project_schedule"
          sectionTitle="Project Schedule"
          suggestion={{
            section_key: 'project_schedule',
            structured_import_available: true,
            subsection_suggestions: [
              {
                subsection_index: 0,
                subsection_name: 'Phase 1',
                type: 'structured',
                content: 'Phase 1 details and timeline.',
                structured_import_available: true,
              },
              {
                subsection_index: 1,
                subsection_name: 'Phase 2',
                type: 'structured',
                content: 'Phase 2 details and deliverables.',
                structured_import_available: true,
              },
            ],
            context_sources: contextSources,
            context_txt_used: true,
          }}
          onImport={vi.fn()}
          onRegenerate={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      // EXPECTED BEHAVIOR: Context sources should NOT be displayed
      expect(screen.queryByText(/Context sources/i)).toBeNull()
      
      // Verify none of the source files are displayed
      contextSources.forEach(source => {
        expect(screen.queryByText(source)).toBeNull()
      })

      // Verify the container doesn't have the context sources display
      const html = container.innerHTML
      expect(html).not.toMatch(/Context sources/i)
    })
  })

  /**
   * Preservation Property Tests
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**
   * 
   * IMPORTANT: Follow observation-first methodology
   * These tests capture existing behavior on UNFIXED code to ensure preservation after fix
   * 
   * EXPECTED OUTCOME: Tests PASS (confirms baseline behavior to preserve)
   */
  describe('Preservation: All Other UI Elements and Functionality', () => {
    describe('Button Functionality Preservation', () => {
      it('should always render Import Suggestion button and call handler when clicked', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('introduction', 'project_schedule', 'abbreviations', 'system_config'),
            fc.string({ minLength: 20, maxLength: 100 }),

            (sectionKey, content) => {
              const onImport = vi.fn()
              
              const { container } = render(
                <SuggestionPanel
                  sectionKey={sectionKey}
                  sectionTitle={`Section: ${sectionKey}`}
                  suggestion={{
                    section_key: sectionKey,
                    structured_import_available: false,
                    raw_text: content,
                    context_sources: ['source1.md', 'source2.md'],
                  }}
                  onImport={onImport}
                  onRegenerate={vi.fn()}
                  onDismiss={vi.fn()}
                />,
              )

              // Assert: Import button is present
              const importButton = screen.getByRole('button', { name: /Import Suggestion/i })
              expect(importButton).toBeInTheDocument()
              
              // Assert: Button is functional
              importButton.click()
              expect(onImport).toHaveBeenCalledTimes(1)
            },
          ),
          { numRuns: 30 },
        )
      })

      it('should always render Regenerate button and call handler when clicked', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('introduction', 'abbreviations', 'project_schedule'),
            fc.string({ minLength: 20, maxLength: 100 }),

            (sectionKey, content) => {
              const onRegenerate = vi.fn()
              
              render(
                <SuggestionPanel
                  sectionKey={sectionKey}
                  sectionTitle={`Section: ${sectionKey}`}
                  suggestion={{
                    section_key: sectionKey,
                    structured_import_available: false,
                    raw_text: content,
                    context_sources: ['source1.md'],
                  }}
                  onImport={vi.fn()}
                  onRegenerate={onRegenerate}
                  onDismiss={vi.fn()}
                />,
              )

              // Assert: Regenerate button is present
              const regenerateButton = screen.getByRole('button', { name: /Regenerate/i })
              expect(regenerateButton).toBeInTheDocument()
              
              // Assert: Button is functional
              regenerateButton.click()
              expect(onRegenerate).toHaveBeenCalledTimes(1)
            },
          ),
          { numRuns: 30 },
        )
      })

      it('should always render Dismiss button and call handler when clicked', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('introduction', 'abbreviations', 'system_config'),
            fc.string({ minLength: 20, maxLength: 100 }),

            (sectionKey, content) => {
              const onDismiss = vi.fn()
              
              render(
                <SuggestionPanel
                  sectionKey={sectionKey}
                  sectionTitle={`Section: ${sectionKey}`}
                  suggestion={{
                    section_key: sectionKey,
                    structured_import_available: false,
                    raw_text: content,
                    context_sources: ['source1.md', 'source2.md'],
                  }}
                  onImport={vi.fn()}
                  onRegenerate={vi.fn()}
                  onDismiss={onDismiss}
                />,
              )

              // Assert: Dismiss button is present
              const dismissButton = screen.getByRole('button', { name: /Dismiss/i })
              expect(dismissButton).toBeInTheDocument()
              
              // Assert: Button is functional
              dismissButton.click()
              expect(onDismiss).toHaveBeenCalledTimes(1)
            },
          ),
          { numRuns: 30 },
        )
      })

      it('should render Generate Draw.io button for applicable sections (system_config, overall_gantt, shutdown_gantt)', () => {
        const drawioSections = ['system_config', 'overall_gantt', 'shutdown_gantt']
        
        drawioSections.forEach((sectionKey) => {
          const onGenerateDrawio = vi.fn()
          
          const { unmount } = render(
            <SuggestionPanel
              sectionKey={sectionKey}
              sectionTitle={`Section: ${sectionKey}`}
              suggestion={{
                section_key: sectionKey,
                structured_import_available: false,
                raw_text: 'Test diagram content for Draw.io generation.',
                context_sources: ['diagram.md'],
              }}
              onImport={vi.fn()}
              onRegenerate={vi.fn()}
              onGenerateDrawio={onGenerateDrawio}
              onDismiss={vi.fn()}
            />,
          )

          // Assert: Generate Draw.io button is present for these sections
          const drawioButton = screen.getByRole('button', { name: /Generate Draw\.io/i })
          expect(drawioButton).toBeInTheDocument()
          
          unmount()
        })
      })

      it('should NOT render Generate Draw.io button for non-applicable sections', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('introduction', 'abbreviations', 'project_schedule'),
            fc.string({ minLength: 20, maxLength: 100 }),

            (sectionKey, content) => {
              render(
                <SuggestionPanel
                  sectionKey={sectionKey}
                  sectionTitle={`Section: ${sectionKey}`}
                  suggestion={{
                    section_key: sectionKey,
                    structured_import_available: false,
                    raw_text: content,
                    context_sources: ['source.md'],
                  }}
                  onImport={vi.fn()}
                  onRegenerate={vi.fn()}
                  onDismiss={vi.fn()}
                />,
              )

              // Assert: Generate Draw.io button should NOT be present
              expect(screen.queryByRole('button', { name: /Generate Draw\.io/i })).toBeNull()
            },
          ),
          { numRuns: 20 },
        )
      })
    })

    describe('Content Rendering Preservation', () => {
      it('should render section title and AI-generated content message', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('introduction', 'abbreviations', 'project_schedule', 'system_config'),
            fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length > 0),

            (sectionKey, sectionTitle, content) => {
              const { unmount } = render(
                <SuggestionPanel
                  sectionKey={sectionKey}
                  sectionTitle={sectionTitle}
                  suggestion={{
                    section_key: sectionKey,
                    structured_import_available: false,
                    raw_text: content,
                    context_sources: ['source.md'],
                  }}
                  onImport={vi.fn()}
                  onRegenerate={vi.fn()}
                  onDismiss={vi.fn()}
                />,
              )

              // Assert: Section title is displayed
              expect(screen.getByText(sectionTitle)).toBeInTheDocument()
              
              // Assert: AI-generated content message is displayed
              expect(screen.getByText(/AI-generated content\. Review before importing\./i)).toBeInTheDocument()
              
              // Assert: Content is rendered
              expect(screen.getByText(content)).toBeInTheDocument()
              
              unmount()
            },
          ),
          { numRuns: 30 },
        )
      })

      it('should render introduction section with tender information correctly', () => {
        const suggestion = {
          section_key: 'introduction',
          structured_import_available: true,
          content: `This document outlines the technical solution.

The system will meet all specified requirements.

{
  "paragraphs": [
    "This document outlines the technical solution.",
    "The system will meet all specified requirements."
  ],
  "tender_reference": "TS-2024-XYZ",
  "tender_date": "20 Dec 2024"
}`,
          context_sources: ['intro-context.md', 'requirements.md'],
        }

        render(
          <SuggestionPanel
            sectionKey="introduction"
            sectionTitle="Introduction"
            suggestion={suggestion}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Introduction paragraphs are rendered (only once, not duplicated)
        const paragraphs = screen.getAllByText(/This document outlines the technical solution\./i)
        expect(paragraphs).toHaveLength(1)

        // Assert: Tender information section is displayed
        expect(screen.getByText(/Tender Information/i)).toBeInTheDocument()
        expect(screen.getByText(/Tender Reference:/i)).toBeInTheDocument()
        expect(screen.getByText(/TS-2024-XYZ/i)).toBeInTheDocument()
        expect(screen.getByText(/Tender Date:/i)).toBeInTheDocument()
        expect(screen.getByText(/20 Dec 2024/i)).toBeInTheDocument()

        // Assert: Embedded JSON should NOT be displayed
        expect(screen.queryByText(/\{"paragraphs":/i)).toBeNull()
      })

      it('should render table content correctly using ExpandableTableFrame', () => {
        const suggestion = {
          section_key: 'abbreviations',
          structured_import_available: true,
          content: {
            rows: [
              { sr_no: 1, abbreviation: 'CPU', description: 'Central Processing Unit' },
              { sr_no: 2, abbreviation: 'RAM', description: 'Random Access Memory' },
              { sr_no: 3, abbreviation: 'SSD', description: 'Solid State Drive' },
            ],
          },
          context_sources: ['terminology.md'],
        }

        render(
          <SuggestionPanel
            sectionKey="abbreviations"
            sectionTitle="Abbreviations"
            suggestion={suggestion}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Table content is rendered
        expect(screen.getByText(/CPU/i)).toBeInTheDocument()
        expect(screen.getByText(/Central Processing Unit/i)).toBeInTheDocument()
        expect(screen.getByText(/RAM/i)).toBeInTheDocument()
        expect(screen.getByText(/SSD/i)).toBeInTheDocument()
        
        // Assert: ExpandableTableFrame Expand button is present
        expect(screen.getByRole('button', { name: /Expand/i })).toBeInTheDocument()
      })

      it('should render subsection suggestions correctly', () => {
        const suggestion = {
          section_key: 'project_schedule',
          structured_import_available: true,
          subsection_suggestions: [
            {
              subsection_index: 0,
              subsection_name: 'Development Phase',
              type: 'structured',
              content: 'Development tasks and timeline details.',
              structured_import_available: true,
            },
            {
              subsection_index: 1,
              subsection_name: 'Testing Phase',
              type: 'structured',
              content: 'Testing strategy and validation procedures.',
              structured_import_available: true,
            },
          ],
          context_sources: ['schedule.md'],
        }

        render(
          <SuggestionPanel
            sectionKey="project_schedule"
            sectionTitle="Project Schedule"
            suggestion={suggestion}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Subsection names are rendered
        expect(screen.getByText(/Development Phase/i)).toBeInTheDocument()
        expect(screen.getByText(/Testing Phase/i)).toBeInTheDocument()
        
        // Assert: Subsection content is rendered
        expect(screen.getByText(/Development tasks and timeline details\./i)).toBeInTheDocument()
        expect(screen.getByText(/Testing strategy and validation procedures\./i)).toBeInTheDocument()
        
        // Assert: Structured/Unstructured labels are present
        const structuredLabels = screen.getAllByText(/Structured/i)
        expect(structuredLabels.length).toBeGreaterThan(0)
      })

      it('should render array content as list', () => {
        const suggestion = {
          section_key: 'deliverables',
          structured_import_available: true,
          content: [
            'System Architecture Document',
            'Technical Design Specification',
            'Implementation Guide',
            'Test Plan and Results',
          ],
          context_sources: ['deliverables.md'],
        }

        render(
          <SuggestionPanel
            sectionKey="deliverables"
            sectionTitle="Deliverables"
            suggestion={suggestion}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Array items are rendered as list items
        expect(screen.getByText(/System Architecture Document/i)).toBeInTheDocument()
        expect(screen.getByText(/Technical Design Specification/i)).toBeInTheDocument()
        expect(screen.getByText(/Implementation Guide/i)).toBeInTheDocument()
        expect(screen.getByText(/Test Plan and Results/i)).toBeInTheDocument()
      })

      it('should render generic object content as key-value pairs', () => {
        const suggestion = {
          section_key: 'metadata',
          structured_import_available: true,
          content: {
            version: '1.0.0',
            author: 'Engineering Team',
            status: 'Draft',
            last_updated: '2024-12-20',
          },
          context_sources: ['metadata.md'],
        }

        render(
          <SuggestionPanel
            sectionKey="metadata"
            sectionTitle="Document Metadata"
            suggestion={suggestion}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Object keys and values are rendered
        expect(screen.getByText(/version/i)).toBeInTheDocument()
        expect(screen.getByText(/1\.0\.0/i)).toBeInTheDocument()
        expect(screen.getByText(/author/i)).toBeInTheDocument()
        expect(screen.getByText(/Engineering Team/i)).toBeInTheDocument()
        expect(screen.getByText(/status/i)).toBeInTheDocument()
        expect(screen.getByText(/Draft/i)).toBeInTheDocument()
      })

      it('should render HTML content correctly using dangerouslySetInnerHTML', () => {
        const suggestion = {
          section_key: 'overview',
          structured_import_available: true,
          content: '<p><strong>System Overview:</strong> This is a <em>comprehensive</em> solution.</p><ul><li>Feature A</li><li>Feature B</li></ul>',
          context_sources: ['overview.md'],
        }

        const { container } = render(
          <SuggestionPanel
            sectionKey="overview"
            sectionTitle="System Overview"
            suggestion={suggestion}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: HTML is rendered (not escaped as text)
        expect(screen.getByText(/System Overview:/i)).toBeInTheDocument()
        expect(screen.getByText(/comprehensive/i)).toBeInTheDocument()
        
        // Verify HTML structure is preserved
        const html = container.innerHTML
        expect(html).toContain('<strong>')
        expect(html).toContain('<em>')
        expect(html).toContain('<ul>')
        expect(html).toContain('<li>')
      })

      it('should render raw text when structured_import_available is false', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('introduction', 'abbreviations', 'project_schedule'),
            fc.string({ minLength: 30, maxLength: 150 }).filter(s => s.trim().length > 0),

            (sectionKey, rawText) => {
              const { unmount } = render(
                <SuggestionPanel
                  sectionKey={sectionKey}
                  sectionTitle="Test Section"
                  suggestion={{
                    section_key: sectionKey,
                    structured_import_available: false,
                    raw_text: rawText,
                    context_sources: ['raw-source.md'],
                  }}
                  onImport={vi.fn()}
                  onRegenerate={vi.fn()}
                  onDismiss={vi.fn()}
                />,
              )

              // Assert: Raw text is displayed
              expect(screen.getByText(rawText)).toBeInTheDocument()
              
              unmount()
            },
          ),
          { numRuns: 30 },
        )
      })
    })

    describe('Styling and Layout Preservation', () => {
      it('should preserve main container structure and layout', () => {
        const { container } = render(
          <SuggestionPanel
            sectionKey="introduction"
            sectionTitle="Introduction"
            suggestion={{
              section_key: 'introduction',
              structured_import_available: false,
              raw_text: 'Test content for layout verification.',
              context_sources: ['source.md'],
            }}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Main container with flex layout exists
        const mainDiv = container.firstChild
        expect(mainDiv).toHaveStyle({ display: 'flex', gap: '12px', alignItems: 'flex-start' })
      })

      it('should preserve button styling and colors', () => {
        render(
          <SuggestionPanel
            sectionKey="introduction"
            sectionTitle="Introduction"
            suggestion={{
              section_key: 'introduction',
              structured_import_available: false,
              raw_text: 'Test content.',
              context_sources: ['source.md'],
            }}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Import button has green background
        const importButton = screen.getByRole('button', { name: /Import Suggestion/i })
        expect(importButton).toHaveStyle({ backgroundColor: '#10B981', color: '#fff' })

        // Assert: Regenerate button has red background
        const regenerateButton = screen.getByRole('button', { name: /Regenerate/i })
        expect(regenerateButton).toHaveStyle({ backgroundColor: '#E60012', color: '#fff' })

        // Assert: Dismiss button has white background with border
        const dismissButton = screen.getByRole('button', { name: /Dismiss/i })
        expect(dismissButton).toHaveStyle({ 
          backgroundColor: '#FFFFFF', 
          color: '#1F2937',
          border: '1px solid #D1D5DB',
        })
      })
    })

    describe('Edge Cases Preservation', () => {
      it('should handle empty context_sources array gracefully (no display)', () => {
        render(
          <SuggestionPanel
            sectionKey="introduction"
            sectionTitle="Introduction"
            suggestion={{
              section_key: 'introduction',
              structured_import_available: false,
              raw_text: 'Test content with empty context sources.',
              context_sources: [],
            }}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Component renders without errors
        expect(screen.getByText(/Test content with empty context sources\./i)).toBeInTheDocument()
        
        // OBSERVATION: Empty array does NOT trigger context sources display
        // (bug condition requires length > 0)
        expect(screen.queryByText(/Context sources/i)).toBeNull()
      })

      it('should handle null context_sources gracefully (no display)', () => {
        render(
          <SuggestionPanel
            sectionKey="introduction"
            sectionTitle="Introduction"
            suggestion={{
              section_key: 'introduction',
              structured_import_available: false,
              raw_text: 'Test content with null context sources.',
              context_sources: null,
            }}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Component renders without errors
        expect(screen.getByText(/Test content with null context sources\./i)).toBeInTheDocument()
        
        // OBSERVATION: Null value does NOT trigger context sources display
        expect(screen.queryByText(/Context sources/i)).toBeNull()
      })

      it('should handle missing content gracefully', () => {
        render(
          <SuggestionPanel
            sectionKey="introduction"
            sectionTitle="Introduction"
            suggestion={{
              section_key: 'introduction',
              structured_import_available: false,
              context_sources: ['source.md'],
            }}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
          />,
        )

        // Assert: Fallback message is displayed
        expect(screen.getByText(/No suggestion content available/i)).toBeInTheDocument()
      })

      it('should disable Regenerate button when isRegenerating is true', () => {
        render(
          <SuggestionPanel
            sectionKey="introduction"
            sectionTitle="Introduction"
            suggestion={{
              section_key: 'introduction',
              structured_import_available: false,
              raw_text: 'Test content.',
              context_sources: ['source.md'],
            }}
            onImport={vi.fn()}
            onRegenerate={vi.fn()}
            onDismiss={vi.fn()}
            isRegenerating={true}
          />,
        )

        // Assert: Regenerate button is disabled
        const regenerateButton = screen.getByRole('button', { name: /Regenerating\.\.\./i })
        expect(regenerateButton).toBeDisabled()
        expect(regenerateButton).toHaveStyle({ cursor: 'not-allowed' })
      })
    })
  })
})
