import { expect, test } from '@playwright/test';

test('F LFEA tab presents one unified pipeline shell with a working 6-step stepper', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  const shell = page.locator('[data-role="lfea-pipeline-shell"]');
  await expect(shell).toHaveCount(1);
  await expect(page.locator('[data-role="lfea-pipeline-step"]')).toHaveCount(6);

  const sourceHost = page.locator('.lfea-pipeline-shell__host[data-host-group="SOURCE"]');
  const loadCaseHost = page.locator('.lfea-pipeline-shell__host[data-host-group="LOAD_CASE"]');
  const resultsHost = page.locator('.lfea-pipeline-shell__host[data-host-group="RESULTS"]');

  // Input/Error check route to the source panel; Load case has its own
  // dedicated host (Phase 5); Run/Output/Export route to the results
  // panel. This reflects today's real architecture honestly (two
  // pre-existing engines plus one new authoring surface) rather than
  // pretending one engine already spans all six steps.
  await expect(sourceHost).toBeVisible();
  await expect(loadCaseHost).toBeHidden();
  await expect(resultsHost).toBeHidden();
  await expect(sourceHost.getByText('Import CAESAR II InputXML')).toBeVisible();

  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]').click();
  await expect(sourceHost).toBeHidden();
  await expect(loadCaseHost).toBeVisible();
  await expect(resultsHost).toBeHidden();
  await expect(loadCaseHost.getByText('Load case')).toBeVisible();

  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]').click();
  await expect(loadCaseHost).toBeHidden();
  await expect(resultsHost).toBeVisible();
  await expect(resultsHost.getByText('LINEAR PIPING FEA RESULTS')).toBeVisible();

  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="INPUT"]').click();
  await expect(sourceHost).toBeVisible();
  await expect(loadCaseHost).toBeHidden();
  await expect(resultsHost).toBeHidden();
});

test('global settings icon lives in the app-wide header and works from any tab', async ({ page }) => {
  await page.goto('/');
  const settingsButton = page.locator('[data-action="open-global-settings"]');
  await expect(settingsButton).toHaveCount(1);
  await expect(page.locator('[data-role="global-settings-popover"]')).toBeHidden();

  await settingsButton.click();
  await expect(page.locator('[data-role="global-settings-popover"]')).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();
  await expect(settingsButton).toHaveCount(1);
});
