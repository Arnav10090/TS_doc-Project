import { test, expect } from '@playwright/test'

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
    await page.goto('http://localhost:5173/editor/test-project-id')
    
    // Click Cover Page section
    await page.click('text=Cover Page')
    
    // Edit field
    await page.fill('input[name="solution_full_name"]', 'Updated Solution Name')
    
    // Wait for auto-save indicator
    await expect(page.locator('text=Saving...')).toBeVisible()
    await expect(page.locator('text=Saved ✓')).toBeVisible({ timeout: 2000 })
  })

  test('should update solution name across all sections', async ({ page }) => {
    await page.goto('http://localhost:5173/editor/test-project-id')
    
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
    await page.goto('http://localhost:5173/editor/complete-project-id')
    
    // Click Generate Document
    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Generate Document')
    
    // Should trigger download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/TS_.+\.docx/)
  })

  test('should show missing sections on incomplete project', async ({ page }) => {
    await page.goto('http://localhost:5173/editor/incomplete-project-id')
    
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
    await page.goto('http://localhost:5173/editor/test-project-id')
    
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
