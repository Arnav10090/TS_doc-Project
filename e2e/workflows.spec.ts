import { test, expect } from '@playwright/test'

// Test fixtures: Create projects before tests
let testProjectId: string
let completeProjectId: string
let incompleteProjectId: string

test.beforeAll(async ({ request }) => {
  // Create test project
  const testProject = await request.post('http://localhost:8000/api/v1/projects', {
    data: {
      solution_name: 'PMYMS',
      solution_full_name: 'Plate Mill Yard Management System',
      client_name: 'JSPL',
      client_location: 'Angul',
    }
  })
  const testData = await testProject.json()
  testProjectId = testData.id

  // Create complete project (with all sections filled)
  const completeProject = await request.post('http://localhost:8000/api/v1/projects', {
    data: {
      solution_name: 'Complete',
      solution_full_name: 'Complete Test Project',
      client_name: 'Test Client',
      client_location: 'Test Location',
    }
  })
  const completeData = await completeProject.json()
  completeProjectId = completeData.id

  // Fill all required sections for complete project
  const sections = [
    'cover', 'revision_history', 'executive_summary', 'introduction',
    'abbreviations', 'process_flow', 'overview', 'features', 'remote_support',
    'documentation_control', 'customer_training', 'system_config', 'fat_condition',
    'tech_stack', 'hardware_specs', 'software_specs', 'third_party_sw',
    'overall_gantt', 'shutdown_gantt', 'supervisors', 'division_of_eng',
    'work_completion', 'buyer_obligations', 'exclusion_list', 'value_addition',
    'buyer_prerequisites', 'poc'
  ]

  for (const section of sections) {
    await request.put(`http://localhost:8000/api/v1/projects/${completeProjectId}/sections/${section}`, {
      data: { content: { test: 'data' } }
    })
  }

  // Create incomplete project (only cover section)
  const incompleteProject = await request.post('http://localhost:8000/api/v1/projects', {
    data: {
      solution_name: 'Incomplete',
      solution_full_name: 'Incomplete Test Project',
      client_name: 'Test Client',
      client_location: 'Test Location',
    }
  })
  const incompleteData = await incompleteProject.json()
  incompleteProjectId = incompleteData.id
})

test.afterAll(async ({ request }) => {
  // Clean up test projects
  if (testProjectId) {
    await request.delete(`http://localhost:8000/api/v1/projects/${testProjectId}`)
  }
  if (completeProjectId) {
    await request.delete(`http://localhost:8000/api/v1/projects/${completeProjectId}`)
  }
  if (incompleteProjectId) {
    await request.delete(`http://localhost:8000/api/v1/projects/${incompleteProjectId}`)
  }
})

test.describe('Project Creation and Editing', () => {
  test('should create new project and navigate to editor', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Click New Project button
    await page.click('text=New Project')
    
    // Fill form
    await page.fill('input[name="solution_name"]', 'PMYMS')
    await page.fill('input[name="solution_full_name"]', 'Plate Mill Yard Management System')
    await page.fill('input[name="client_name"]', 'JSPL')
    await page.fill('input[name="client_location"]', 'Angul')
    
    // Submit
    await page.click('text=Create Project')
    
    // Should navigate to editor
    await expect(page).toHaveURL(/\/editor\/.+/)
    await expect(page.locator('text=Cover Page')).toBeVisible()
  })

  test('should auto-save section changes', async ({ page }) => {
    // Navigate to existing project
    await page.goto(`http://localhost:5173/editor/${testProjectId}`)
    
    // Click Cover Page section
    await page.click('text=Cover Page')
    
    // Edit field
    await page.fill('input[name="solution_full_name"]', 'Updated Solution Name')
    
    // Wait for auto-save indicator
    await expect(page.locator('text=Saving...')).toBeVisible()
    await expect(page.locator('text=Saved ✓')).toBeVisible({ timeout: 2000 })
  })

  test('should update solution name across all sections', async ({ page }) => {
    await page.goto(`http://localhost:5173/editor/${testProjectId}`)
    
    // Update solution name in cover
    await page.click('text=Cover Page')
    await page.fill('input[name="solution_name"]', 'NewName')
    
    // Navigate to hardware specs
    await page.click('text=Hardware Specifications')
    
    // Should see updated name in row 5
    const row5 = page.locator('table tr:nth-child(5)')
    await expect(row5).toContainText('NewName Client Desktop')
  })
})

test.describe('Document Generation', () => {
  test('should generate document when all sections complete', async ({ page }) => {
    // Navigate to complete project
    await page.goto(`http://localhost:5173/editor/${completeProjectId}`)
    
    // Click Generate Document
    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Generate Document')
    
    // Should trigger download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/TS_.+\.docx/)
  })

  test('should show missing sections on incomplete project', async ({ page }) => {
    await page.goto(`http://localhost:5173/editor/${incompleteProjectId}`)
    
    // Click Generate Document
    await page.click('text=Generate Document')
    
    // Should show error with missing sections
    await expect(page.locator('text=Please complete all required sections')).toBeVisible()
    await expect(page.locator('text=Cover Page')).toBeVisible()
    await expect(page.locator('text=Features')).toBeVisible()
  })
})

test.describe('Image Upload', () => {
  test('should upload architecture diagram', async ({ page }) => {
    await page.goto(`http://localhost:5173/editor/${testProjectId}`)
    
    // Navigate to System Configuration
    await page.click('text=System Configuration')
    
    // Upload image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/architecture.png')
    
    // Should show success message
    await expect(page.locator('text=Image uploaded successfully')).toBeVisible()
    
    // Should display thumbnail
    await expect(page.locator('img[alt="Architecture diagram"]')).toBeVisible()
  })
})
