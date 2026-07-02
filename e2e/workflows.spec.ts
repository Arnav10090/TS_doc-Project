import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

const API_BASE_URL = 'http://localhost:8000'
const createdProjectIds: string[] = []

const completeSections: Array<{ key: string; content: Record<string, any> }> = [
  {
    key: 'cover',
    content: {
      solution_full_name: 'Complete Solution',
      client_name: 'Complete Client',
      client_location: 'Complete Location',
    },
  },
  {
    key: 'revision_history',
    content: { rows: [{ details: 'Initial version' }] },
  },
  {
    key: 'executive_summary',
    content: { para1: '<p>Executive summary content</p>' },
  },
  {
    key: 'introduction',
    content: { tender_reference: 'REF-001', tender_date: '2026-06-22' },
  },
  {
    key: 'abbreviations',
    content: { rows: Array.from({ length: 14 }, (_, index) => (index === 13 ? { abbreviation: 'TS' } : {})) },
  },
  {
    key: 'process_flow',
    content: { text: '<p>Process flow description</p>' },
  },
  {
    key: 'overview',
    content: { system_objective: 'System objective', existing_system: 'Existing system' },
  },
  {
    key: 'features',
    content: { items: [{ title: 'Feature 1', description: 'Description 1' }] },
  },
  {
    key: 'remote_support',
    content: { text: 'Remote support text' },
  },
  {
    key: 'documentation_control',
    content: {},
  },
  {
    key: 'customer_training',
    content: { persons: '5', days: '3' },
  },
  {
    key: 'system_config',
    content: {},
  },
  {
    key: 'fat_condition',
    content: { text: 'FAT condition text' },
  },
  {
    key: 'tech_stack',
    content: { rows: [{ component: 'Component 1', technology: 'Tech 1' }] },
  },
  {
    key: 'hardware_specs',
    content: { rows: [{ specs_line1: 'Spec 1', maker: 'Maker 1' }] },
  },
  {
    key: 'software_specs',
    content: { rows: [{ name: 'Software 1' }] },
  },
  {
    key: 'third_party_sw',
    content: { sw4_name: 'Third Party SW' },
  },
  {
    key: 'overall_gantt',
    content: {},
  },
  {
    key: 'shutdown_gantt',
    content: {},
  },
  {
    key: 'supervisors',
    content: { pm_days: '10', dev_days: '20', comm_days: '5', total_man_days: '35' },
  },
  {
    key: 'scope_definitions',
    content: {},
  },
  {
    key: 'division_of_eng',
    content: {},
  },
  {
    key: 'work_completion',
    content: {},
  },
  {
    key: 'buyer_obligations',
    content: {},
  },
  {
    key: 'exclusion_list',
    content: {},
  },
  {
    key: 'binding_conditions',
    content: {},
  },
  {
    key: 'cybersecurity',
    content: {},
  },
  {
    key: 'disclaimer',
    content: {},
  },
  {
    key: 'value_addition',
    content: { text: '<p>Value addition text</p>' },
  },
  {
    key: 'buyer_prerequisites',
    content: { items: ['Prerequisite 1'] },
  },
  {
    key: 'poc',
    content: { name: 'POC Name', description: 'POC Description' },
  },
]

const createProject = async (
  request: APIRequestContext,
  overrides: Record<string, any> = {},
) => {
  const response = await request.post(`${API_BASE_URL}/api/v1/projects`, {
    data: {
      solution_name: 'Playwright Solution',
      solution_full_name: 'Playwright Solution Full Name',
      client_name: 'Playwright Client',
      client_location: 'Playwright Location',
      ts_type: 'Level 2',
      ...overrides,
    },
  })

  expect(response.ok()).toBeTruthy()
  const project = await response.json()
  createdProjectIds.push(project.id)
  return project
}

const seedCompleteProject = async (request: APIRequestContext, projectId: string) => {
  for (const section of completeSections) {
    const response = await request.put(`${API_BASE_URL}/api/v1/projects/${projectId}/sections/${section.key}`, {
      data: { content: section.content },
    })
    expect(response.ok()).toBeTruthy()
  }
}

const getInputAfterLabel = (page: Page, label: string) =>
  page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::input[1]')

test.describe.configure({ mode: 'serial' })

test.afterAll(async ({ request }) => {
  for (const projectId of createdProjectIds) {
    await request.delete(`${API_BASE_URL}/api/v1/projects/${projectId}`)
  }
})

test.describe('Project Creation and Editing', () => {
  test('creates a new project and navigates to the editor', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'New Project' }).first().click()

    await page.getByPlaceholder('e.g., MES System').fill('PMYMS')
    await page.getByPlaceholder('e.g., Manufacturing Execution System').fill('Plate Mill Yard Management System')
    await page.getByPlaceholder('e.g., ABC Manufacturing Ltd').fill('JSPL')
    await page.getByPlaceholder('e.g., Mumbai, India').fill('Angul')

    await expect(page.getByText('TS Categories')).toBeVisible()
    await page.getByRole('button', { name: 'Level 2', exact: true }).first().click()
    await page.getByRole('button', { name: 'Level 2', exact: true }).nth(1).click()

    await page.getByRole('button', { name: 'Create Project' }).click()

    await expect(page).toHaveURL(/\/editor\/.+/)
    await expect(page.getByText('Cover')).toBeVisible()

    const projectId = page.url().split('/editor/')[1]?.split('#')[0]
    expect(projectId).toBeTruthy()
    createdProjectIds.push(projectId!)
  })

  test('keeps draft edits local until SAVE and persists them after manual save', async ({ page, request }) => {
    const project = await createProject(request, {
      solution_name: 'Draft Save Project',
      solution_full_name: 'Draft Save Solution',
    })

    await page.goto(`/editor/${project.id}`)
    await page.getByText('Introduction').click()

    const tenderReferenceInput = getInputAfterLabel(page, 'Tender Reference')
    await expect(tenderReferenceInput).toBeVisible()
    await tenderReferenceInput.fill('PW-REF-001')

    const unsavedResponse = await request.get(`${API_BASE_URL}/api/v1/projects/${project.id}/sections`)
    const unsavedSections = await unsavedResponse.json()
    expect(unsavedSections.find((section: any) => section.section_key === 'introduction')).toBeFalsy()

    await page.getByRole('button', { name: 'SAVE' }).click()
    await expect(page.getByText('Saved')).toBeVisible()

    const savedResponse = await request.get(`${API_BASE_URL}/api/v1/projects/${project.id}/sections/introduction`)
    expect(savedResponse.ok()).toBeTruthy()
    const savedSection = await savedResponse.json()
    expect(savedSection.content.tender_reference).toBe('PW-REF-001')

    await page.reload()
    await page.getByText('Introduction').click()
    await expect(getInputAfterLabel(page, 'Tender Reference')).toHaveValue('PW-REF-001')
  })
})

test.describe('Document Generation', () => {
  test('shows missing sections when document generation is attempted on an incomplete project', async ({ page, request }) => {
    const project = await createProject(request, {
      solution_name: 'Incomplete Project',
      solution_full_name: 'Incomplete Test Project',
    })

    await page.goto(`/editor/${project.id}`)
    await page.getByRole('button', { name: 'Generate Document' }).click()

    await expect(page.getByText('Missing Sections')).toBeVisible()
    await expect(page.getByRole('button', { name: /Introduction/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Features/ })).toBeVisible()
  })

  test('downloads a document when all required sections are complete', async ({ page, request }) => {
    const project = await createProject(request, {
      solution_name: 'Complete Project',
      solution_full_name: 'Complete Test Project',
    })
    await seedCompleteProject(request, project.id)

    await page.goto(`/editor/${project.id}`)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generate Document' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/TS_.+\.docx|TS_Document_.+\.docx/)
  })
})
