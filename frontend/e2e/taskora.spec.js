import { expect, test } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceExtensions = new Set(['.css', '.html', '.js', '.jsx', '.svg'])
const allowedColors = new Set([
  '#000000',
  '#111111',
  '#333333',
  '#777777',
  '#E5E5E5',
  '#F7F7F7',
  '#FFFFFF',
])
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const hasCredentials = Boolean(email && password)

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(entryPath))
    } else if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath)
    }
  }

  return files
}

async function collectFrontendSource() {
  const files = [path.join(frontendRoot, 'index.html')]
  files.push(...await collectSourceFiles(path.join(frontendRoot, 'src')))
  files.push(...await collectSourceFiles(path.join(frontendRoot, 'public')))
  return Promise.all(files.map(async file => ({
    file: path.relative(frontendRoot, file),
    text: await readFile(file, 'utf8'),
  })))
}

async function signIn(page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:#.*)?$/)
  await expect(page.locator('#overview')).toBeVisible()
}

function localDateTimeOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(days === 0 ? 23 : 12, 0, 0, 0)
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function taskCard(page, title) {
  return page.locator('.task-card').filter({ hasText: title })
}

async function editTask(page, currentTitle, changes, cleanupTitles) {
  await page.getByRole('button', { name: `Edit ${currentTitle}`, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.locator('#task-title')).toHaveValue(currentTitle)

  const nextTitle = changes.title ?? currentTitle
  if (changes.title !== undefined) {
    cleanupTitles.push(changes.title)
    await page.locator('#task-title').fill(changes.title)
  }
  if (changes.description !== undefined) {
    await page.locator('#task-description').fill(changes.description)
  }
  if (changes.status !== undefined) {
    await page.locator('#task-status').selectOption(changes.status)
  }
  if (changes.dueDate !== undefined) {
    await page.locator('#task-due-date').fill(changes.dueDate)
  }

 await page.getByRole('button', { name: 'Save changes' }).click()
await expect(dialog).toHaveCount(0)
await expect(page.getByRole('status').filter({ hasText: 'Task updated.' })).toBeVisible()

await page.reload({ waitUntil: 'networkidle' })
await expect(page.locator('#overview')).toBeVisible()
await expect(await taskCard(page, nextTitle)).toBeVisible()

return nextTitle
}

let cleanupTitles = []

test('monochrome color audit only uses approved colors', async () => {
  const sources = await collectFrontendSource()
  const colorPattern = /#[\da-f]{3,8}\b/gi
  const violations = []

  for (const source of sources) {
    if (!['.css', '.html', '.svg', '.jsx', '.js'].includes(path.extname(source.file).toLowerCase())) continue
    for (const match of source.text.matchAll(colorPattern)) {
      if (!allowedColors.has(match[0].toUpperCase())) {
        violations.push(`${source.file}: ${match[0]}`)
      }
    }
  }

  expect(violations).toEqual([])
})

test('visible source contains no old TaskFlow branding', async () => {
  const sources = await collectFrontendSource()
  const occurrences = sources
    .filter(source => /\.(?:css|html|js|jsx)$/.test(source.file))
    .filter(source => /\bTaskFlow\b/.test(source.text))
    .map(source => source.file)

  expect(occurrences).toEqual([])
})

test('frontend source contains no server-secret identifiers', async () => {
  const sources = await collectSourceFiles(path.join(frontendRoot, 'src'))
  const secretNames = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CLOUDINARY_API_SECRET',
    'EMAIL_APP_PASSWORD',
    'REMINDER_CRON_SECRET',
  ]
  const matches = []

  for (const file of sources) {
    const source = await readFile(file, 'utf8')
    for (const name of secretNames) {
      if (source.includes(name)) matches.push(`${path.relative(frontendRoot, file)}: ${name}`)
    }
  }

  expect(matches).toEqual([])
})

test('login branding, public route, and protected-route redirect', async ({ page }) => {
  const runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })

  await page.goto('/login')
  await expect(page.getByText('TASKORA', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Turn ideas into action.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Welcome to Taskora.' })).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('TaskFlow')

  await page.goto('/dashboard#tasks')
  await expect(page).toHaveURL(/\/login$/)
  expect(runtimeErrors).toEqual([])
})

test.describe('authenticated real-UI workflows', () => {
  test.skip(!hasCredentials, 'Set E2E_EMAIL and E2E_PASSWORD for a dedicated existing E2E user.')

  test.beforeEach(() => {
    cleanupTitles = []
  })

  test.afterEach(async ({ page }) => {
    if (!cleanupTitles.length) return

    const authenticated = await page.evaluate(() => Boolean(localStorage.getItem('taskflow.token'))).catch(() => false)
    if (!authenticated) return

    await page.goto('/dashboard#tasks')
    await expect(page.locator('#tasks')).toBeVisible()

    for (const title of [...new Set(cleanupTitles)].reverse()) {
      const card = await taskCard(page, title)
      if (await card.count() === 0) continue

      await card.getByRole('button', { name: `Edit ${title}`, exact: true }).click()
      const removeImage = page.getByRole('button', { name: 'Remove image', exact: true })
      if (await removeImage.count()) {
        await removeImage.click()
        await page.getByRole('button', { name: 'Save changes' }).click()
      } else {
        await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      }
      await expect(page.locator('.task-form-dialog')).toHaveCount(0)

      const remainingCard = await taskCard(page, title)
      if (await remainingCard.count() === 0) continue
      await remainingCard.getByRole('button', { name: `Delete ${title}`, exact: true }).click()
      const confirmation = page.getByRole('alertdialog')
      await expect(confirmation).toContainText(title)
      await confirmation.getByRole('button', { name: 'Delete task' }).click()
      await expect(remainingCard).toHaveCount(0)
    }
  })

  test('dashboard navigation, theme, responsive layout, CRUD, search, filters, and logout', async ({ page }) => {
    await signIn(page)

    await expect(page.getByText('TASKORA', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Organize. Focus. Complete.').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Task statistics' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Search tasks by title or description' })).toBeVisible()
    await expect(page.getByLabel('Filter tasks by status')).toBeVisible()
    await expect(page.getByLabel('Filter tasks by due date')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible()
    await expect(page.locator('.topbar .theme-toggle')).toBeVisible()
    await expect(page.locator('.sidebar-user-copy strong')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('TaskFlow')

    const pendingStat = page.locator('.stat-card-pending strong')
const inProgressStat = page.locator('.stat-card-in_progress strong')
const completedStat = page.locator('.stat-card-completed strong')

await expect(pendingStat).toHaveText(/^\d+$/)
await expect(inProgressStat).toHaveText(/^\d+$/)
await expect(completedStat).toHaveText(/^\d+$/)

const initialStats = {
  pending: Number.parseInt((await pendingStat.innerText()).trim(), 10),
  inProgress: Number.parseInt((await inProgressStat.innerText()).trim(), 10),
  completed: Number.parseInt((await completedStat.innerText()).trim(), 10),
}

    await page.getByRole('link', { name: 'Tasks' }).click()
    await expect(page).toHaveURL(/\/dashboard#tasks$/)
    await expect(page.getByRole('heading', { name: 'Your Work' })).toBeInViewport()
    await expect(page.getByRole('searchbox', { name: 'Search tasks by title or description' })).toBeVisible()
    await page.getByRole('link', { name: 'Overview' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('#overview')).toBeInViewport()

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.locator('.sidebar.sidebar-open')).toBeVisible()
    await page.locator('.sidebar-theme').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('.sidebar-theme')).toBeVisible()
    await expect(page.getByText('TASKORA', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible()
    await expect(page.locator('.topbar .header-copy h1')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Task statistics' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Search tasks by title or description' })).toBeVisible()
    await expect(page.getByLabel('Filter tasks by status')).toBeVisible()
    await expect(page.getByLabel('Filter tasks by due date')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible()
    await page.getByRole('link', { name: 'Tasks' }).click()
    await expect(page).toHaveURL(/\/dashboard#tasks$/)
    await expect(page.locator('#tasks')).toBeInViewport()
    await expect(page.locator('.sidebar-open')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('#tasks')).toBeInViewport()
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('link', { name: 'Overview' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('#overview')).toBeInViewport()

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      expect(noHorizontalOverflow).toBe(true)
      await expect(page.getByRole('heading', { name: 'Your Work' })).toBeVisible()
    }
    await page.setViewportSize({ width: 1024, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const title = `E2E Task - ${Date.now()}`
    cleanupTitles.push(title)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Create Task' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const dialogBox = await dialog.boundingBox()
    expect(dialogBox).not.toBeNull()
    expect(dialogBox.y).toBeGreaterThanOrEqual(0)
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(850)
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Enter a task title.' })).toBeVisible()

    await page.locator('#task-title').fill(title)
    await page.locator('#task-description').fill('Temporary end-to-end verification task.')
    await page.locator('#task-status').selectOption('pending')
    await page.locator('#task-due-date').fill(localDateTimeOffset(4))
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Task created.' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    let card = await taskCard(page, title)
    await expect(card).toBeVisible()
    await expect(card).toContainText('Temporary end-to-end verification task.')
    await expect(page.locator('.stat-card-pending strong')).toHaveText(String(initialStats.pending + 1))

    const search = page.getByRole('searchbox', { name: 'Search tasks by title or description' })
    await search.fill(title)
    await expect(card).toBeVisible()
    await search.fill(`No-result-${Date.now()}`)
    await expect(page.getByRole('heading', { name: 'No matching work.' })).toBeVisible()
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(await taskCard(page, title)).toBeVisible()

    const statusFilter = page.getByLabel('Filter tasks by status')
    await statusFilter.selectOption('pending')
    await expect(await taskCard(page, title)).toBeVisible()
    await statusFilter.selectOption('in_progress')
    await expect(await taskCard(page, title)).toHaveCount(0)
    await statusFilter.selectOption('completed')
    await expect(await taskCard(page, title)).toHaveCount(0)
    await statusFilter.selectOption('')

    const dueDateFilter = page.getByLabel('Filter tasks by due date')
    await dueDateFilter.selectOption('upcoming')
    await expect(await taskCard(page, title)).toBeVisible()
    for (const filter of ['today', 'tomorrow', 'overdue', 'no_due_date']) {
      await dueDateFilter.selectOption(filter)
      await expect(await taskCard(page, title)).toHaveCount(0)
    }
    await dueDateFilter.selectOption('')

    const editedTitle = `${title} updated`
    cleanupTitles.push(editedTitle)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('button', { name: `Edit ${title}`, exact: true }).click()
    await expect(page.locator('#task-title')).toHaveValue(title)
    await expect(page.locator('#task-description')).toHaveValue('Temporary end-to-end verification task.')
    await page.locator('#task-title').fill(editedTitle)
    await page.locator('#task-description').fill('Edited by the Taskora end-to-end suite.')
    await page.locator('#task-status').selectOption('in_progress')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('.task-form-dialog')).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Task updated.' })).toBeVisible()
    card = await taskCard(page, editedTitle)
    await expect(card).toContainText('Edited by the Taskora end-to-end suite.')
    await expect(page.locator('.stat-card-in_progress strong')).toHaveText(String(initialStats.inProgress + 1))
    await statusFilter.selectOption('in_progress')
    await expect(card).toBeVisible()
    await statusFilter.selectOption('pending')
    await expect(await taskCard(page, editedTitle)).toHaveCount(0)
    await statusFilter.selectOption('')

    await editTask(page, editedTitle, { status: 'completed' }, cleanupTitles)
    await expect(page.locator('.stat-card-completed strong')).toHaveText(String(initialStats.completed + 1))
    await statusFilter.selectOption('completed')
    await expect(await taskCard(page, editedTitle)).toBeVisible()
    await statusFilter.selectOption('')
    await editTask(page, editedTitle, { status: 'in_progress' }, cleanupTitles)

    await editTask(page, editedTitle, { dueDate: localDateTimeOffset(0) }, cleanupTitles)
    await dueDateFilter.selectOption('today')
    await expect(await taskCard(page, editedTitle)).toBeVisible()
    await editTask(page, editedTitle, { dueDate: localDateTimeOffset(1) }, cleanupTitles)
    await dueDateFilter.selectOption('tomorrow')
    await expect(await taskCard(page, editedTitle)).toBeVisible()
    await editTask(page, editedTitle, { dueDate: localDateTimeOffset(-1) }, cleanupTitles)
    await dueDateFilter.selectOption('overdue')
    await expect(await taskCard(page, editedTitle)).toBeVisible()
    await editTask(page, editedTitle, { dueDate: '' }, cleanupTitles)
    await dueDateFilter.selectOption('no_due_date')
    await expect(await taskCard(page, editedTitle)).toBeVisible()
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(await taskCard(page, editedTitle)).toBeVisible()

    await page.getByRole('button', { name: `Delete ${editedTitle}`, exact: true }).click()
    const confirmation = page.getByRole('alertdialog')
    await expect(confirmation).toContainText(editedTitle)
    await confirmation.getByRole('button', { name: 'Delete task' }).click()
    await expect(await taskCard(page, editedTitle)).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Task removed.' })).toBeVisible()
    cleanupTitles = []
    await expect(page.locator('.stat-card-pending strong')).toHaveText(String(initialStats.pending))
    await expect(page.locator('.stat-card-in_progress strong')).toHaveText(String(initialStats.inProgress))
    await expect(page.locator('.stat-card-completed strong')).toHaveText(String(initialStats.completed))

    await page.locator('.topbar .theme-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.evaluate(() => Boolean(localStorage.getItem('taskflow.token')))).resolves.toBe(false)
    await page.goto('/dashboard#tasks')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Cloudinary image upload, replacement, and removal when explicitly enabled', async ({ page }) => {
    test.skip(
      !process.env.E2E_IMAGE_PATH || process.env.E2E_CLOUDINARY_ENABLED !== 'true',
      'Set E2E_IMAGE_PATH and E2E_CLOUDINARY_ENABLED=true only when local Cloudinary upload is configured.',
    )
    await signIn(page)

    const title = `E2E Image Task - ${Date.now()}`
    cleanupTitles.push(title)
    await page.getByRole('button', { name: 'Create Task' }).click()
    await page.locator('#task-title').fill(title)
    await page.locator('#task-image-input').setInputFiles(process.env.E2E_IMAGE_PATH)
    await expect(page.locator('.task-image-preview img')).toBeVisible()
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await expect(page.locator('.task-form-dialog')).toHaveCount(0)

    let card = await taskCard(page, title)
    await expect(card.locator('.task-image-frame img')).toBeVisible()
    const cloudinaryImageReturned = await card.locator('.task-image-frame img').getAttribute('src')
      .then(value => Boolean(value?.startsWith('https://res.cloudinary.com/')))
    expect(cloudinaryImageReturned).toBe(true)

    await card.getByRole('button', { name: `Edit ${title}`, exact: true }).click()
    await page.locator('#task-image-input').setInputFiles(process.env.E2E_IMAGE_PATH)
    await expect(page.locator('.task-image-preview img')).toBeVisible()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('.task-form-dialog')).toHaveCount(0)
    card = await taskCard(page, title)
    await expect(card.locator('.task-image-frame img')).toBeVisible()

    await card.getByRole('button', { name: `Edit ${title}`, exact: true }).click()
    await page.getByRole('button', { name: 'Remove image', exact: true }).click()
    await expect(page.getByText('Existing image will be removed when you save.')).toBeVisible()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('.task-form-dialog')).toHaveCount(0)
    card = await taskCard(page, title)
    await expect(card.locator('.task-image-frame img')).toHaveCount(0)
  })
})