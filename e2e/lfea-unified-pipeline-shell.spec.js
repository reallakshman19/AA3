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

  await expect(sourceHost).toBeVisible();
  await expect(loadCaseHost).toBeHidden();
  await expect(resultsHost).toBeHidden();

  // UI03 exposes source representation as one explicit acquisition choice.
  // Source-specific implementation panels stay hidden until one model owns
  // the engineering session.
  const sourceAcquisition = sourceHost.locator('[data-role="lfea-source-acquisition"]');
  await expect(sourceAcquisition).toBeVisible();
  await expect(sourceAcquisition.getByRole('button', { name: 'CAESAR II InputXML', exact: true })).toBeVisible();
  await expect(sourceAcquisition.getByRole('button', { name: 'StagedJSON', exact: true })).toBeVisible();
  await expect(sourceAcquisition.getByRole('button', { name: 'CAESAR II ACCDB', exact: true })).toBeVisible();
  await expect(sourceHost.locator('[data-role="linear-piping-inputxml-source-workflow"]')).toBeHidden();
  await expect(sourceHost.locator('[data-role="lfea-pipeline-stagedjson-input-panel"]')).toBeHidden();
  await expect(sourceHost.locator('[data-role="lfea-pipeline-accdb-input-panel"]')).toBeHidden();

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
