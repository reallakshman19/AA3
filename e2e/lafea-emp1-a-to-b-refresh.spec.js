import { expect, test } from '@playwright/test';

test('EMP.1 user refreshes B from rerun A without losing B-owned screening inputs', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const productionView = page.locator('[data-application-view="LAFEA"]');
  await expect(productionView).toBeVisible();
  const workbench = productionView.locator('[data-role="lafea-workbench"]');
  await workbench.locator(':scope > [data-lafea-slot="navigation"] [data-product-id="EMP.1"]').click();
  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  const run = workbench.locator('[data-role="lafea-run"]');
  // The A/B/C backing-stage switch now lives behind the "Technical backing
  // calculators" disclosure, nested inside the outer "Readiness, review and
  // technical custody" disclosure - open both (each is recreated on every
  // re-render, so this can't be done once and assumed to stick) before
  // clicking a backing step.
  // A professional-workflow step whose preferredBackingStageId targets A/B
  // switches backing stage itself (see emp1-professional-workflow-view.js);
  // clicking it is both the backing-stage switch and the task selection that
  // makes that stage's controls actually render, in one action.
  const PROFESSIONAL_TASK_FOR_BACKING_STEP = { A: 'BASIS_SOURCE', B: 'SECTION_SCREENING' };
  const stepLocator = (id) => analytical.locator(
    `[data-role="emp1-professional-step"][data-emp1-professional-step="${PROFESSIONAL_TASK_FOR_BACKING_STEP[id]}"]`,
  );
  const step = async (id) => stepLocator(id).click();

  const mockA = workbench.locator('[data-role="lafea-mock"]');
  if (await mockA.isVisible()) await mockA.click();
  await expect(run).toBeEnabled();
  await run.click();
  await expect(analytical.locator('[data-role="lafea-result-highlights"]')).toContainText('Max |transferred force|');

  await step('B');
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

  await step('A');
  // Backing onto A alone lands on the BASIS_SOURCE professional task by
  // default (reconcileSelectionWithBackingStage in emp1-analytical-layout.js);
  // the LOAD_CASES input group specifically lives under the LOADS task.
  await analytical.locator('[data-role="emp1-professional-step"][data-emp1-professional-step="LOADS"]').click();
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

  await step('B');
  currentness = analytical.locator('[data-role="emp1-b-source-currentness"]');
  refresh = analytical.locator('[data-role="emp1-refresh-b-from-a"]');
  await expect(currentness).toHaveAttribute('data-state', 'STALE_A_EVIDENCE_REFRESH_AVAILABLE');
  await expect(stepLocator('B')).toHaveAttribute('title', /Section screening stale/u);
  await expect(refresh).toBeEnabled();
  await expect(run).toBeDisabled();
  await expect(run).toHaveAttribute('data-emp1-currentness-gate', 'BLOCKED');
  // The stale blocker lives in the "results" evidence surface; the refresh
  // control, currentness state and screening-term factor live in the
  // "screeningCustody" evidence surface (createEmp1BSourceCustodyCard in
  // lafea-guided-workflow-view.js, wired in via screeningLoadCustody in
  // lafea-analytical-calc-content.js). Both stay display:none unless the
  // evidence console is expanded *and* that specific view is selected -
  // switch between the two views to reach each.
  const evidenceToggle = analytical.locator('[data-role="emp1-evidence-console-toggle"]');
  const evidenceTab = (view) => analytical.locator(`[data-role="emp1-evidence-tab"][data-emp1-evidence-view="${view}"]`);
  if ((await evidenceToggle.getAttribute('aria-expanded')) !== 'true') await evidenceToggle.click();
  await evidenceTab('results').click();
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

  await evidenceTab('screeningCustody').click();
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
      // The raw LAFEA.1 stage document never carries semanticHash itself;
      // refreshEmp1BSourceEvidence() (emp1-a-to-b-refresh.js) copies B's
      // foundationModel from A's *canonical* model (execution.canonicalInput),
      // which is what actually carries that hash.
      aModelHash: a.execution?.canonicalInput?.semanticHash ?? null,
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
