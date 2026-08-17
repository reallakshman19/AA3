import { expect, test } from '@playwright/test';

test('LAFEA.2 exposes correlation capability without exposing synthetic engineering authority', async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('.lafea-workbench__stages [data-stage-id="LAFEA.2"]').click();
  await workbench.locator('[data-role="lafea-mock"]').click();

  let availability = workbench.locator('[data-role="lafea-correlation-availability"]');
  await expect(availability).toBeVisible();
  await expect(availability).toHaveAttribute('data-correlation-state', 'BLOCKED');
  await expect(availability.locator('[data-role="lafea-correlation-status"]')).toHaveText('BLOCKED');
  await expect(availability).toContainText('Registered engineering methods');
  await expect(availability).toContainText('No qualified engineering correlation method/edition is registered.');
  await expect(availability).toContainText('Run and qualify the current LAFEA.2 nominal screening result');
  await expect(availability).toContainText('No local-attachment empirical stress result is authorized.');
  await expect(availability).not.toContainText('SYNTHETIC_LOCAL_ATTACHMENT_CORRELATION');
  await expect(availability.locator('[data-correlation-blocker="NO_ENGINEERING_CORRELATION_PROFILE_REGISTERED"]')).toHaveCount(1);
  await expect(availability.locator('[data-correlation-blocker="QUALIFIED_LAFEA2_RESULT_REQUIRED"]')).toHaveCount(1);

  const methodCountBefore = await availability.locator('tr')
    .filter({ hasText: 'Registered engineering methods' }).locator('td').textContent();
  expect(methodCountBefore).toBe('0');

  const run = workbench.locator('[data-role="lafea-run"]');
  await expect(run).toBeEnabled();
  await run.click();

  availability = workbench.locator('[data-role="lafea-correlation-availability"]');
  await expect(availability).toHaveAttribute('data-correlation-state', 'BLOCKED');
  await expect(availability.locator('[data-correlation-blocker="NO_ENGINEERING_CORRELATION_PROFILE_REGISTERED"]')).toHaveCount(1);
  await expect(availability.locator('[data-correlation-blocker="QUALIFIED_LAFEA2_RESULT_REQUIRED"]')).toHaveCount(0);
  await expect(availability).toContainText('QUALIFIED');
  await expect(availability).toContainText('ACCEPTED');

  const state = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  const resultHash = state.stages['LAFEA.2'].execution.result.semanticHashes.screeningResultPayloadSemanticHash;
  expect(resultHash).toMatch(/^fnv1a64:[0-9a-f]{16}$/u);
  await expect(availability).toContainText(resultHash);
  await expect(availability).not.toContainText('SYNTHETIC_LOCAL_ATTACHMENT_CORRELATION');
});
