import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SuggestionPanel from './SuggestionPanel'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

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
})
