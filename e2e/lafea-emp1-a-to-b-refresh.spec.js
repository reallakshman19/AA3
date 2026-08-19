import { expect, test } from '@playwright/test';

test('EMP.1 user refreshes B from rerun A without losing B-owned screening inputs', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator(':scope > [data-lafea-slot="navigation"] [data-product-id="EMP.1"]').click();
  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  const step = (id) => analytical.locator(`[data-role="emp1-step"][data-emp1-step="${id}"]`);
  const run = workbench.locator('[data-role="lafea-run"]');

  const mockA = workbench.locator('[data-role="lafea-mock"]');
  if (await mockA.isVisible()) await mockA.click();
  await expect(run).toBeEnabled();
  await run.click();
  await expect(analytical.locator('[data-role="lafea-result-highlights"]')).toContainText('Max |transferred force|');

  await step('B').click();
  const mockB = workbench.locator('[data-role="lafea-mock"]');
  if (await mockB.isVisible()) await mockB.click();
  let currentness = analytical.locator('[data-role="emp1-b-source-currentness"]');
  let refresh = analytical.locator('[data-role="emp1-refresh-b-from-a"]');
  await expect(currentness).toHaveAttribute('data-state', 'CURRENT_A_EVIDENCE');
  await expect(refresh).toBeDisabled();

  const retainedFactor = analytical.locator(
    '[data-role="lafea-screening-term-factor"][data-screening-case-id="CASE-B"][data-load-case-id="LC-A"]',
  );
  await expect(retainedFactor).toHaveValue('-0.5');
  await expect(run).toBeEnabled();
  await run.click();
  await expect(analytical.locator('[data-role="lafea-result-highlights"]')).toContainText('Governing nominal von Mises');

  await step('A').click();
  const loadGroup = analytical.locator('.lafea-doc-group-editor[data-input-group="LOAD_CASES"]');
  const forceX = loadGroup.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.x"]',
  ).first();
  const forceY = loadGroup.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.y"]',
  ).first();
  await expect(forceX).toBeVisible();
  await expect(forceY).toBeVisible();
  const beforeX = Number(await forceX.inputValue());
  const beforeY = Number(await forceY.inputValue());
  await forceX.fill(String(beforeX + 11));
  await forceY.fill(String(beforeY - 7));
  await loadGroup.locator('[data-role="lafea-apply-group"][data-input-group="LOAD_CASES"]').click();

  const aAfterEdit = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.1']);
  expect(aAfterEdit.execution).toBeNull();
  await expect(run).toBeEnabled();
  await run.click();

  await step('B').click();
  currentness = analytical.locator('[data-role="emp1-b-source-currentness"]');
  refresh = analytical.locator('[data-role="emp1-refresh-b-from-a"]');
  await expect(currentness).toHaveAttribute('data-state', 'STALE_A_EVIDENCE_REFRESH_AVAILABLE');
  await expect(step('B')).toContainText('STALE A EVIDENCE');
  await expect(refresh).toBeEnabled();
  await expect(run).toBeDisabled();
  await expect(run).toHaveAttribute('data-emp1-currentness-gate', 'BLOCKED');
  await expect(analytical.locator('[data-role="emp1-b-stale-result-blocker"]')).toBeVisible();
  await expect(analytical.locator(
    '[data-role="lafea-screening-term-factor"][data-screening-case-id="CASE-B"][data-load-case-id="LC-A"]',
  )).toHaveValue('-0.5');

  const staleCustody = await page.evaluate(() => {
    const state = globalThis.AnalysisWorkspace.getLafeaWorkbenchState();
    return {
      bRetainedExecutionStatus: state.stages['LAFEA.2'].execution?.status ?? null,
    };
  });
  expect(staleCustody.bRetainedExecutionStatus).toBe('QUALIFIED');

  await refresh.click();
  currentness = analytical.locator('[data-role="emp1-b-source-currentness"]');
  refresh = analytical.locator('[data-role="emp1-refresh-b-from-a"]');
  await expect(currentness).toHaveAttribute('data-state', 'CURRENT_A_EVIDENCE');
  await expect(refresh).toBeDisabled();
  await expect(analytical.locator('[data-role="emp1-b-stale-result-blocker"]')).toHaveCount(0);
  await expect(analytical.locator(
    '[data-role="lafea-screening-term-factor"][data-screening-case-id="CASE-B"][data-load-case-id="LC-A"]',
  )).toHaveValue('-0.5');

  const custody = await page.evaluate(() => {
    const state = globalThis.AnalysisWorkspace.getLafeaWorkbenchState();
    const a = state.stages['LAFEA.1'];
    const b = state.stages['LAFEA.2'];
    return {
      aExecutionStatus: a.execution?.status ?? null,
      bExecution: b.execution,
      aModelHash: a.document?.semanticHash ?? null,
      bSourceModelHash: b.document?.sourceEvidence?.foundationModel?.semanticHash ?? null,
      bFactor: b.document.screeningCases
        .find((row) => row.screeningCaseId === 'CASE-B').mechanicalTerms
        .find((row) => row.loadCaseId === 'LC-A').factor,
    };
  });
  expect(custody.aExecutionStatus).toBe('QUALIFIED');
  expect(custody.bExecution).toBeNull();
  expect(custody.bSourceModelHash).toBe(custody.aModelHash);
  expect(custody.bFactor).toBe(-0.5);

  await expect(run).toBeEnabled();
  await run.click();
  await expect(analytical.locator('[data-role="lafea-result-highlights"]')).toContainText('Governing nominal von Mises');

  const screenshotPath = testInfo.outputPath('emp1-a-to-b-currentness-refresh.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('emp1-a-to-b-currentness-refresh', { path: screenshotPath, contentType: 'image/png' });
});

async function openProductionLafea(page) {
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  const nav = page.locator('[data-application-nav="LAFEA"]');
  await expect(nav).toBeVisible();
  await nav.click();
  await expect.poll(() => page.evaluate(
    () => globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null,
  )).toBe('LAFEA');
}
