import { expect, test } from '@playwright/test';

test('Verification/QA drawer toggles from the shell toolbar and stays open across step navigation', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  const toggle = page.locator('[data-action="lfea-pipeline-toggle-verification-drawer"]');
  const drawerHost = page.locator('[data-role="lfea-pipeline-verification-drawer-host"]');
  await expect(toggle).toBeVisible();
  await expect(drawerHost).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(drawerHost).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  // Both QA panels -- the benchmark suite and the ACCDB cross-check --
  // are real, self-contained panels reused directly from the continuum
  // Workbench, not reimplemented, and render real content on open.
  await expect(page.locator('[data-role="lfea-pipeline-verification-benchmark-host"]')).not.toBeEmpty();
  await expect(page.locator('[data-role="lfea-pipeline-verification-caesar-accdb-host"]')).not.toBeEmpty();

  // Reachable from any step, not gated behind the step sequence: the
  // drawer stays open while navigating the pipeline stepper.
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]').click();
  await expect(drawerHost).toBeVisible();
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]').click();
  await expect(drawerHost).toBeVisible();

  await toggle.click();
  await expect(drawerHost).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('the continuum Workbench no longer duplicates the QA panels inline', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  const consumerRoot = page.locator('[data-role="lfea-consumer-root"]');
  await expect(consumerRoot).toBeVisible();
  await expect(consumerRoot.locator('.lfea-workbench__benchmark')).toHaveCount(0);
  await expect(consumerRoot.locator('.lfea-workbench__caesar-accdb-benchmark')).toHaveCount(0);
  // The Run Benchmark toolbar button is hidden along with the panel it
  // has nowhere to show a result in anymore (see the LFEA revamp plan's
  // Phase 7 note on the orphaned-affordance fix).
  await expect(consumerRoot.locator('[data-role="lfea-benchmark"]')).toBeHidden();
});
