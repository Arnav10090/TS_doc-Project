import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import DocumentPreview from './DocumentPreview'

vi.mock('../../store/project.store', () => ({
  useProjectStore: () => ({
    solutionName: 'PMYMS',
    solutionFullName: 'Plate Mill Yard Management System',
    clientName: 'JSPL Angul',
    clientLocation: 'Angul, Odisha, India',
    sectionCompletion: {},
  }),
}))

vi.mock('../../api/images', () => ({
  getImages: vi.fn().mockResolvedValue([]),
}))

describe('DocumentPreview division_of_eng matrix layout', () => {
  it('renders the responsibility header with merged columns that match the document template', () => {
    const { container } = render(
      <BrowserRouter>
        <DocumentPreview
          projectId="test-project-id"
          activeSectionKey={null}
          sectionContents={{
            cover: { solution_full_name: 'Plate Mill Yard Management System' },
            division_of_eng: {},
          }}
        />
      </BrowserRouter>,
    )

    const section = container.querySelector('[data-section-key="division_of_eng"]')
    expect(section).not.toBeNull()

    const table = section?.querySelector('table')
    expect(table).not.toBeNull()

    const rows = table?.querySelectorAll('tr') || []
    expect(rows.length).toBeGreaterThan(2)

    const firstHeaderCells = rows[0].querySelectorAll('td')
    const secondHeaderCells = rows[1].querySelectorAll('td')

    expect(firstHeaderCells).toHaveLength(3)
    expect(firstHeaderCells[0].textContent).toBe('No.')
    expect(firstHeaderCells[0].getAttribute('rowspan')).toBe('2')
    expect(firstHeaderCells[1].textContent).toBe('ITEM')
    expect(firstHeaderCells[1].getAttribute('rowspan')).toBe('2')
    expect(firstHeaderCells[2].textContent).toBe('Responsibility')
    expect(firstHeaderCells[2].getAttribute('colspan')).toBe('6')

    expect(Array.from(secondHeaderCells).map((cell) => cell.textContent)).toEqual([
      'BD',
      'BE',
      'DD',
      'SU',
      'ER',
      'COM',
    ])
  })
})
