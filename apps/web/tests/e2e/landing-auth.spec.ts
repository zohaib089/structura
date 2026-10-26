import { expect, test } from '@playwright/test'
import { BRAND, quickstartCommand } from '../../../../packages/brand/src/brand'

test('landing page presents the product and its section navigation', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Launch app' })).toBeVisible()
  await expect(page.getByRole('heading', { name: BRAND.tagline })).toBeVisible()
  await expect(page.getByText(quickstartCommand()).first()).toBeVisible()
  await expect(page.locator('[data-testid="graph-canvas"]')).toBeVisible()
  await expect(page.getByText('Sample data').first()).toBeVisible()
  await expect(page.getByText('Trusted by forward-thinking teams')).toHaveCount(0)
  await expect(page.getByText('System Online')).toHaveCount(0)
  await expect(page.getByText('2.1x')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Known limits' })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'How it works' }).click()
  await expect(page).toHaveURL(/#how$/)
  await expect(page.locator('#how')).toBeVisible()
  await expect(page.locator('#how').getByRole('heading', { name: 'How it works' })).toBeVisible()
})

test('authenticated landing page hides guest authentication links', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'e2e-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'user-1',
        fullName: 'Taylor Engineer',
        email: 'taylor@example.test',
        company: 'Example',
        accountType: 'individual',
        verified: true,
        createdAt: new Date().toISOString()
      }
    }))
  })

  await page.goto('/en')

  await expect(page.getByRole('banner').getByRole('button', { name: 'Log out' })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toHaveCount(0)
  await expect(page.getByRole('banner').getByRole('link', { name: 'Launch app' })).toHaveCount(0)
  const footer = page.getByRole('contentinfo')
  await expect(footer.getByRole('link', { name: 'Request access' })).toHaveCount(0)
  await expect(footer.getByRole('link', { name: 'Log in' })).toHaveCount(0)
  await expect(footer.getByRole('link', { name: 'Sign up' })).toHaveCount(0)
  await expect(footer.getByRole('link', { name: 'Verify email' })).toHaveCount(0)
})

test('signup route renders an improved authentication card', async ({ page }) => {
  await page.goto('/auth/signup')

  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'I agree to the Terms and Privacy Policy.' })).not.toBeChecked()
  await expect(page.getByText('Secure team onboarding')).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeVisible()
  await expect(page.getByRole('button', { name: /create personal account/i })).toBeVisible()

  const password = page.getByLabel('Password', { exact: true })
  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).first().click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).first().click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('localized signup renders translated core auth copy and password controls', async ({ page }) => {
  await page.goto('/pt/auth/signup')

  await expect(page.getByRole('heading', { name: 'Crie sua conta' })).toBeVisible()
  await expect(page.getByLabel('Nome completo')).toBeVisible()
  await expect(page.getByLabel('E-mail profissional')).toBeVisible()
  await expect(page.getByText('Concordo com os Termos e a Política de Privacidade.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toHaveCount(2)
})

test('localized password recovery and verification flows render translated controls', async ({ page }) => {
  await page.goto('/es/auth/forgot-password')

  await expect(page.getByRole('heading', { name: 'Restablecer tu contraseña' })).toBeVisible()
  await expect(page.getByLabel('Correo de recuperación')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar enlace de restablecimiento' })).toBeVisible()

  await page.goto('/ja/auth/verify-email?email=person%40example.test')
  await expect(page.getByRole('heading', { name: 'メールアドレスを確認' })).toBeVisible()
  await expect(page.getByLabel('確認コード')).toBeVisible()
  await expect(page.getByRole('button', { name: 'コードを再送信' })).toBeVisible()
})

test('password reset route reads the emailed address and offers new-password fields', async ({ page }) => {
  let submittedPayload: Record<string, string> | undefined
  await page.route('**/api/auth/reset-password', async (route) => {
    submittedPayload = route.request().postDataJSON() as Record<string, string>
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Password reset successfully.' })
    })
  })
  await page.goto('/auth/reset-password?email=person%40example.test&token=reset-token')

  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Confirm new password', { exact: true })).toBeVisible()
  await page.getByLabel('New password', { exact: true }).fill('NewPassword123!')
  await page.getByLabel('Confirm new password', { exact: true }).fill('NewPassword123!')
  await page.getByRole('button', { name: 'Set new password' }).click()

  await expect.poll(() => submittedPayload).toEqual({
    email: 'person@example.test',
    token: 'reset-token',
    password: 'NewPassword123!'
  })
  await expect(page).toHaveURL(/\/(?:[a-z]{2}(?:-[A-Za-z]+)?\/)?auth\/login$/)
})

test('auth card fits a mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/auth/login')

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }))

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})

test('dashboard displays real workspace and project states instead of fabricated metrics', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.addInitScript(() => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'e2e-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'user-1',
        fullName: 'Taylor Engineer',
        email: 'taylor@example.test',
        company: 'Example',
        accountType: 'individual',
        verified: true,
        createdAt: new Date().toISOString()
      }
    }))
  })
  await page.route('**/api/workspaces', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        workspaces: [{
          id: 'workspace-1',
          name: 'Platform team',
          role: 'owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      })
    })
  })
  await page.route('**/api/workspaces/workspace-1/projects', async route => {
    if (route.request().method() === 'POST') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const payload = route.request().postDataJSON() as { name: string; description: string }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          project: {
            id: 'project-1',
            name: payload.name,
            description: payload.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, projects: [] })
    })
  })

  await page.goto('/dashboard')

  const dashboardBounds = await page.locator('.dashboard-shell').evaluate(element => {
    const bounds = element.getBoundingClientRect()
    return { width: bounds.width, viewportWidth: document.documentElement.clientWidth }
  })
  expect(dashboardBounds.width).toBeGreaterThan(1400)
  expect(dashboardBounds.width).toBeLessThan(dashboardBounds.viewportWidth)
  await expect(page.getByRole('banner').getByRole('button', { name: 'Log out' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Log in' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Launch app' })).toHaveCount(0)

  const localeControl = await page.getByRole('combobox', { name: 'Language' }).evaluate(element => {
    const control = element as HTMLSelectElement
    const wrapper = control.parentElement
    return {
      appearance: getComputedStyle(control).appearance,
      inlineEndPadding: Number.parseFloat(getComputedStyle(control).paddingInlineEnd),
      arrowInset: wrapper ? getComputedStyle(wrapper, '::after').insetInlineEnd : ''
    }
  })
  expect(localeControl.appearance).toBe('none')
  expect(localeControl.inlineEndPadding).toBeGreaterThan(20)
  expect(localeControl.arrowInset).not.toBe('')

  await expect(page.getByRole('status', { name: 'Loading your workspaces...' })).toBeVisible()
  await expect(page.locator('.loading-skeleton .skeleton-line')).toHaveCount(3)
  await page.getByRole('navigation', { name: 'Dashboard navigation' }).getByRole('button', { name: 'Projects' }).click()
  await expect(page.getByRole('navigation', { name: 'Dashboard navigation' }).getByRole('button', { name: 'Projects' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Platform team' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible()
  await page.getByLabel('Project name').fill('Source analyzer')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  await expect(page.locator('.button-loader')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Source analyzer' })).toBeVisible()
  await expect(page.getByText(/Last updated/)).toBeVisible()
  await expect(page.getByRole('status', { name: 'Project created.' })).toBeVisible()
  await expect(page.getByText('Healthy systems')).toHaveCount(0)
  await expect(page.getByText('AI insights')).toHaveCount(0)

  const projectSearch = page.getByRole('searchbox', { name: 'Search projects' })
  await projectSearch.fill('missing project')
  await expect(page.getByText('No projects match your search.')).toBeVisible()
  await projectSearch.fill('source analyzer')
  await expect(page.getByRole('heading', { name: 'Source analyzer' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Dashboard navigation' }).getByRole('button', { name: 'Overview' }).click()
  await expect(page.getByRole('heading', { name: 'Recently updated projects' })).toBeVisible()
  await expect(page.getByText('Source analyzer')).toBeVisible()
})

test('authenticated navbar logs out instead of showing launch links', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'e2e-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'user-1',
        fullName: 'Taylor Engineer',
        email: 'taylor@example.test',
        company: 'Example',
        accountType: 'individual',
        verified: true,
        createdAt: new Date().toISOString()
      }
    }))
  })
  await page.route('**/api/auth/logout', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: 'Signed out successfully.' })
  }))
  await page.route('**/api/workspaces', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, workspaces: [] })
  }))

  await page.goto('/dashboard')
  await expect(page.getByRole('banner').getByRole('button', { name: 'Log out' })).toBeVisible()
  await page.getByRole('banner').getByRole('button', { name: 'Log out' }).click()

  await expect(page).toHaveURL(/\/en\/auth\/login$/)
  await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Launch app' })).toBeVisible()
})

test('dashboard navigation opens the synthetic architecture demo and manages workspace invitations', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'e2e-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'user-1',
        fullName: 'Taylor Engineer',
        email: 'taylor@example.test',
        company: 'Example',
        accountType: 'individual',
        verified: true,
        createdAt: new Date().toISOString()
      }
    }))
  })
  await page.route('**/api/workspaces', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      workspaces: [{
        id: 'workspace-1',
        name: 'Platform team',
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    })
  }))
  await page.route('**/api/workspaces/workspace-1/projects', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, projects: [] })
  }))
  await page.route('**/api/workspaces/workspace-1/members', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      members: [{
        id: 'user-1',
        full_name: 'Taylor Engineer',
        email: 'taylor@example.test',
        role: 'owner',
        created_at: new Date().toISOString()
      }]
    })
  }))
  const invitations: Array<{
    id: string
    email: string
    role: 'member'
    created_at: string
    expires_at: string
    inviter_name: string
  }> = []
  await page.route('**/api/workspaces/workspace-1/invitations', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, invitations })
      })
      return
    }

    const { email } = route.request().postDataJSON() as { email: string }
    const invitation = {
      id: 'invitation-1',
      email,
      role: 'member' as const,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      inviter_name: 'Taylor Engineer'
    }
    invitations.push(invitation)
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, invitation })
    })
  })
  await page.route('**/api/workspaces/workspace-1/invitations/invitation-1', async route => {
    if (route.request().method() === 'DELETE') {
      invitations.splice(0)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    }
  })

  await page.goto('/en/dashboard')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  const dashboardNavigation = page.getByRole('navigation', { name: 'Dashboard navigation' })
  await dashboardNavigation.getByRole('button', { name: 'Projects' }).click()
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible()
  await dashboardNavigation.getByRole('button', { name: 'Architecture' }).click()
  await expect(page.getByRole('heading', { name: 'Explore a sample architecture' })).toBeVisible()
  const databaseNode = page.getByRole('button', { name: 'Database' })
  await databaseNode.click()
  await expect(databaseNode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('apps/api/src/database')).toBeVisible()
  await expect(page.locator('.node-connections').getByText('Auth', { exact: true })).toBeVisible()
  await expect(page.getByText(/bundled demo data, not your project/i)).toBeVisible()

  await dashboardNavigation.getByRole('button', { name: 'Team' }).click()
  await expect(page.getByText('Taylor Engineer')).toBeVisible()
  await page.getByLabel('Invite by email').fill('new.member@example.test')
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('Invitation email sent.')).toBeVisible()
  await expect(page.getByText('new.member@example.test')).toBeVisible()
  await page.getByRole('button', { name: 'Revoke invitation' }).click()
  await expect(page.getByText('No pending invitations.')).toBeVisible()

  await dashboardNavigation.getByRole('button', { name: 'Overview' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('button', { name: 'Log out' })).toBeVisible()
})

test('localized routes set the document language and right-to-left direction', async ({ page }) => {
  await page.goto('/ur')

  await expect(page).toHaveURL(/\/ur$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('language selector changes locale and preserves the current URL state', async ({ page }) => {
  await page.goto('/en?campaign=launch#contact')

  await page.getByRole('combobox', { name: 'Language' }).selectOption('ja')

  await expect(page).toHaveURL(/\/ja\?campaign=launch#contact$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
  await expect(page.getByRole('combobox', { name: '言語' })).toHaveValue('ja')
})

test('authentication navigation keeps the selected locale', async ({ page }) => {
  await page.goto('/pt/auth/login')
  await page.getByRole('button', { name: 'Cadastrar-se' }).click()

  await expect(page).toHaveURL(/\/pt\/auth\/signup$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
})

test('authentication navigation preserves a workspace invitation token', async ({ page }) => {
  await page.goto('/en/auth/login?invitation=invite-token-for-test')
  await page.getByRole('button', { name: 'Sign up' }).click()

  await expect(page).toHaveURL(/\/en\/auth\/signup\?invitation=invite-token-for-test$/)
})

test('signup and email verification preserve an invitation until the user logs in', async ({ page }) => {
  await page.route('**/api/auth/signup', route => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: 'Verification email sent.' })
  }))
  await page.route('**/api/auth/verify-email', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: 'Email verified.' })
  }))

  await page.goto('/en/auth/login?invitation=invite-token-for-test')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.getByLabel('Full name').fill('Taylor Engineer')
  await page.getByLabel('Work email').fill('invitee@example.test')
  await page.getByLabel('Password', { exact: true }).fill('StrongPassword1!')
  await page.getByLabel('Confirm', { exact: true }).fill('StrongPassword1!')
  await page.getByRole('checkbox', { name: 'I agree to the Terms and Privacy Policy.' }).check()
  await page.getByRole('button', { name: 'Create personal account' }).click()

  await expect(page).toHaveURL(/\/en\/auth\/verify-email\?email=invitee@example\.test&invitation=invite-token-for-test$/)
  await page.getByLabel('Verification code').fill('123456')
  await page.getByRole('button', { name: 'Verify email' }).click()
  await expect(page).toHaveURL(/\/en\/auth\/login\?invitation=invite-token-for-test$/)
})

test('dashboard accepts an invitation after authentication and removes its token from the URL', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'e2e-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'user-1',
        fullName: 'Taylor Engineer',
        email: 'taylor@example.test',
        company: 'Example',
        accountType: 'individual',
        verified: true,
        createdAt: new Date().toISOString()
      }
    }))
  })
  await page.route('**/api/workspace-invitations/accept', async route => {
    const { token } = route.request().postDataJSON() as { token: string }
    expect(token).toBe('invite-token-for-test')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, workspaceId: 'workspace-1' })
    })
  })
  await page.route('**/api/workspaces', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      workspaces: [{
        id: 'workspace-1',
        name: 'Platform team',
        role: 'member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    })
  }))
  await page.route('**/api/workspaces/workspace-1/projects', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, projects: [] })
  }))
  await page.route('**/api/workspaces/workspace-1/members', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, members: [] })
  }))

  await page.goto('/en/dashboard?invitation=invite-token-for-test')

  await expect(page).toHaveURL(/\/en\/dashboard$/)
  await expect(page.getByText('Workspace invitation accepted.')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Dashboard navigation' })
    .getByRole('button', { name: 'Team' })).toHaveAttribute('aria-current', 'page')
})

test('legacy protected URLs redirect to a localized authentication route', async ({ page }) => {
  await page.goto('/dashboard?next=projects')

  await expect(page).toHaveURL(/\/en\/auth\/login\?next=projects$/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
