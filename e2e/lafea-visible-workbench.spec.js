import { expect, test } from '@playwright/test';
import { destroyStage17, mountStage17 } from './helpers/lafea-stage17-playwright.js';

test.afterEach(async ({ page }) => destroyStage17(page));

test('LAFEA.3 visibly presents governed model mesh solver and computed results', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const initial = await mountStage17(page, { buildSha: 'cccccccccccccccccccccccccccccccccccccccc', targetElementLength: 25 });
  expect(initial.meshState).toBe('CURRENT_PASS');

  const workbench = page.locator('[data-role="lafea-workbench"]');
  const overview = workbench.locator('[data-role="lafea-engineering-overview"]');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('Model → mesh → solve → results');
  const summary = overview.locator('[data-role="lafea-engineering-summary"]');
  await expect(summary).toContainText('Qualified');
  await expect(summary).toContainText('Linear continuum solver');
  await expect(summary).not.toContainText('CURRENT_PASS');
  await expect(summary).not.toContainText('T3_T6_Q8_LINEAR_CONTINUUM');
  const technical = overview.locator('[data-role="lafea-technical-evidence"]').first();
  await expect(technical).toContainText('CURRENT_PASS');
  await expect(technical).toContainText('T3_T6_Q8_LINEAR_CONTINUUM');
  await expect(technical).toContainText('Qualification profile ID');

  const mesh = workbench.locator('[data-role="lafea-mesh-workspace-summary"]');
  await expect(mesh).toBeVisible();
  await expect(mesh).toContainText('T6');
  await expect(mesh).toContainText('25 mm');

  const viewportModes = workbench.locator('[data-role="lafea-viewport-mode-panel"]');
  await expect(viewportModes).toContainText('Geometry');
  await expect(viewportModes).toContainText('Mesh');
  await expect(viewportModes).toContainText('Result contour');

  await expect(workbench.locator('[data-role="lafea-result-empty"]')).toBeVisible();
  await expect(workbench.locator('[data-role="lafea-overview-run"]')).toBeDisabled();

  const preflight = await page.evaluate(() => globalThis.__A17__.controller.store.prepareContinuumForRun().projection?.state ?? null);
  expect(preflight).toBe('CURRENT_PASS');
  await expect(workbench.locator('[data-role="lafea-overview-run"]')).toBeEnabled();
  await workbench.locator('[data-role="lafea-overview-run"]').click();

  await expect(overview).toHaveAttribute('data-execution-status', 'QUALIFIED');
  const results = workbench.locator('[data-guided-target="results"]');
  const resultHighlights = results.locator('[data-role="lafea-result-highlights"]');
  await expect(resultHighlights).toBeVisible();
  await expect(resultHighlights).toContainText('Engineering result summary');
  await expect(resultHighlights).toContainText('Max displacement');
  await expect(resultHighlights).toContainText('Max von Mises');
  await expect(resultHighlights).toContainText('Total strain energy');
  await expect(resultHighlights).toContainText('integration-point stress is authoritative');

  const retained = await page.evaluate(() => {
    const result = globalThis.__A17__.controller.getState().stages['LAFEA.3'].execution?.result;
    const loadCases = result?.loadCaseResults ?? [];
    return {
      qualification: result?.qualification?.state ?? null,
      loadCases: loadCases.length,
      energy: loadCases.every((row) => Number.isFinite(row.totalStrainEnergy)),
      displacement: loadCases.every((row) => Array.isArray(row.nodalDisplacements) && row.nodalDisplacements.length > 0),
    };
  });
  expect(retained).toEqual({ qualification: 'ACCEPTED', loadCases: 2, energy: true, displacement: true });

  await overview.scrollIntoViewIfNeeded();
  const topScreenshotPath = testInfo.outputPath('lafea-visible-workbench-top.png');
  await page.screenshot({ path: topScreenshotPath, fullPage: false });
  await testInfo.attach('lafea-visible-workbench-top', { path: topScreenshotPath, contentType: 'image/png' });

  const resultScreenshotPath = testInfo.outputPath('lafea-visible-workbench-results.png');
  await resultHighlights.screenshot({ path: resultScreenshotPath });
  await testInfo.attach('lafea-visible-workbench-results', { path: resultScreenshotPath, contentType: 'image/png' });
});

test('production application LAFEA.3 stage mounts the engineering workbench', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const productionView = page.locator('[data-application-view="LAFEA"]');
  await expect(productionView).toBeVisible();
  await productionView.locator('.lafea-workbench__stages [data-stage-id="LAFEA.3"]').click();
  const overview = productionView.locator('[data-role="lafea-engineering-overview"]');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('Model → mesh → solve → results');
  await expect(productionView.locator('[data-guided-target="source"]')).toContainText('Model inputs');
  await expect(productionView.locator('[data-guided-target="profile"]')).toContainText('Solver and analysis settings');
  await expect(productionView.locator('[data-guided-target="viewport"]')).toContainText('Engineering viewport');
  await expect(productionView.locator('[data-guided-target="discretization"]')).toContainText('Meshing and discretization');
  await expect(productionView.locator('[data-guided-target="results"]')).toContainText('Analysis results');

  await overview.scrollIntoViewIfNeeded();
  const screenshotPath = testInfo.outputPath('lafea-production-tab.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('lafea-production-tab', { path: screenshotPath, contentType: 'image/png' });
});

test('production exposes one EMP.1 product with A/B retained engines and C visibly blocked', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const productionView = page.locator('[data-application-view="LAFEA"]');
  await expect(productionView).toBeVisible();
  const workbench = productionView.locator('[data-role="lafea-workbench"]');
  const product = workbench.locator(':scope > [data-lafea-slot="navigation"] [data-product-id="EMP.1"]');
  await expect(product).toHaveCount(1);
  await expect(product).toContainText('EMP.1 Local Attachment Analytical Assessment');
  await expect(workbench.locator(':scope > [data-lafea-slot="navigation"] [data-stage-id="LAFEA.1"]')).toHaveCount(0);
  await expect(workbench.locator(':scope > [data-lafea-slot="navigation"] [data-stage-id="LAFEA.2"]')).toHaveCount(0);
  await expect(workbench.locator(':scope > [data-lafea-slot="navigation"] [data-stage-id="LAFEA.3"]')).toBeVisible();
  await product.click();

  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await expect(analytical).toBeVisible();
  await expect(analytical).toHaveAttribute('data-product-id', 'EMP.1');
  await expect(workbench.locator('h1')).toContainText('EMP.1 — Local Attachment Analytical Assessment');
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(analytical).toHaveAttribute('data-emp1-step', 'A');

  const steps = analytical.locator('[data-role="emp1-step"]');
  await expect(steps).toHaveCount(3);
  const stepA = analytical.locator('[data-role="emp1-step"][data-emp1-step="A"]');
  const stepB = analytical.locator('[data-role="emp1-step"][data-emp1-step="B"]');
  const stepC = analytical.locator('[data-role="emp1-step"][data-emp1-step="C"]');
  await expect(stepA).toBeEnabled();
  await expect(stepB).toBeEnabled();
  await expect(stepC).toBeDisabled();
  await expect(stepC).toContainText('Local correlation · BLOCKED');
  const cBlocker = analytical.locator('[data-role="emp1-c-blocker"]');
  await expect(cBlocker).toContainText('no production local-correlation authority');
  await expect(cBlocker).toContainText('WRC extraction package is not READY_FOR_IMPLEMENTATION');
  await expect(cBlocker).toContainText('WRC a–j numerical coefficient payload is not qualified');
  await expect(cBlocker).toContainText('WRC load/sign convention arbitration remains open');
  await expect(cBlocker).toContainText('CAUx 2017 pp.24–31 benchmark values');

  await expect(workbench.locator('[data-role="lafea-run"]')).toHaveAttribute('data-emp1-step', 'A');
  const mockA = workbench.locator('[data-role="lafea-mock"]');
  if (await mockA.isVisible()) await mockA.click();
  await expect(workbench.locator('[data-role="lafea-run"]')).toBeEnabled();
  await workbench.locator('[data-role="lafea-run"]').click();
  await expect(analytical.locator('[data-role="lafea-result-highlights"]')).toContainText('Max |transferred force|');

  await stepB.click();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(analytical).toHaveAttribute('data-emp1-step', 'B');
  await expect(workbench.locator('h1')).toContainText('EMP.1 — Local Attachment Analytical Assessment');
  await expect(analytical.locator('[data-role="lafea-analytical-route-heading"]')).toContainText('EMP.1.B');
  await expect(workbench.locator('[data-role="lafea-run"]')).toHaveAttribute('data-emp1-step', 'B');

  const mockB = workbench.locator('[data-role="lafea-mock"]');
  if (await mockB.isVisible()) await mockB.click();
  const custody = analytical.locator('[data-role="lafea-screening-load-custody"]');
  await expect(custody).toContainText('retained snapshot of EMP.1.A foundation evidence');
  await expect(custody).toContainText('If A changes, refresh/re-import B evidence before relying on B');
  await expect(custody).toContainText('Retained EMP.1.A transformed resultants');
  const factor = custody.locator(
    '[data-role="lafea-screening-term-factor"][data-screening-case-id="CASE-B"][data-load-case-id="LC-A"]',
  );
  await expect(factor).toHaveValue('-0.5');
  await factor.fill('0.25');
  await custody.locator(
    '[data-role="lafea-apply-screening-term-factor"][data-screening-case-id="CASE-B"][data-load-case-id="LC-A"]',
  ).click();
  const editedFactor = await page.evaluate(() => globalThis.AnalysisWorkspace
    .getLafeaWorkbenchState().stages['LAFEA.2'].document.screeningCases
    .find((row) => row.screeningCaseId === 'CASE-B').mechanicalTerms
    .find((row) => row.loadCaseId === 'LC-A').factor);
  expect(editedFactor).toBe(0.25);

  await expect(workbench.locator('[data-role="lafea-run"]')).toBeEnabled();
  await workbench.locator('[data-role="lafea-run"]').click();
  const highlights = analytical.locator('[data-role="lafea-result-highlights"]');
  await expect(highlights).toContainText('Governing nominal von Mises');
  await expect(highlights.locator('[data-role="lafea-transverse-load-warning"]')).toContainText(
    'LOCAL TRANSVERSE LOAD NOT RECOVERED',
  );

  const stateAfterB = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  expect(stateAfterB.activeStageId).toBe('LAFEA.2');
  expect(stateAfterB.stages['LAFEA.1'].execution?.status).toBe('QUALIFIED');
  expect(stateAfterB.stages['LAFEA.2'].execution?.status).toBe('QUALIFIED');

  const stateWithBlockedC = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  expect(stateWithBlockedC.activeStageId).toBe('LAFEA.2');

  await workbench.locator(':scope > [data-lafea-slot="navigation"] [data-stage-id="LAFEA.3"]').click();
  await expect(workbench.locator('[data-role="lafea-engineering-overview"]')).toBeVisible();

  const screenshotPath = testInfo.outputPath('emp1-unified-navigation.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('emp1-unified-navigation', { path: screenshotPath, contentType: 'image/png' });
});

test('Analytical Calc uses one EMP.1 public navigation authority with A/B/C internal steps', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const productionView = page.locator('[data-application-view="LAFEA"]');
  await expect(productionView).toBeVisible();
  const workbench = productionView.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-lafea-tab="ANALYTICAL_CALC"]').click();

  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await expect(analytical).toBeVisible();
  await expect(workbench.locator('h1')).toContainText('EMP.1');
  await expect(analytical).toContainText('Assessment workflow');
  await expect(analytical).toContainText('EMP.1.A inputs');
  await expect(workbench).toContainText('FE mesh: NOT APPLICABLE');
  await expect(workbench.locator('[data-guided-target="viewport"]')).toHaveCount(0);
  await expect(workbench.locator('[data-guided-target="discretization"]')).toHaveCount(0);
  await expect(workbench.locator('.lafea-workbench__svg')).toHaveCount(0);

  const publicNavigation = workbench.locator(':scope > [data-lafea-slot="navigation"]');
  await expect(publicNavigation.locator('[data-product-id="EMP.1"]')).toHaveCount(1);
  await expect(publicNavigation.locator('[data-stage-id="LAFEA.1"]')).toHaveCount(0);
  await expect(publicNavigation.locator('[data-stage-id="LAFEA.2"]')).toHaveCount(0);
  await expect(analytical.locator('[data-role="emp1-step"]')).toHaveCount(3);
  await expect(analytical.locator('[data-role="emp1-step"][data-emp1-step="C"]')).toBeDisabled();

  let state = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  expect(state.activeStageId).toBe('LAFEA.1');
  await analytical.locator('[data-role="emp1-step"][data-emp1-step="B"]').click();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(workbench.locator('h1')).toContainText('EMP.1');
  await expect(analytical.locator('[data-role="lafea-analytical-route-heading"]')).toContainText('EMP.1.B');
  state = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  expect(state.activeStageId).toBe('LAFEA.2');

  const screenshotPath = testInfo.outputPath('emp1-analytical-calc.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('emp1-analytical-calc', { path: screenshotPath, contentType: 'image/png' });
});

test('Empirical analytical surface presents one truthful EMP.1 product and page-owned vertical scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openProductionEmpirical(page);

  const empiricalView = page.locator('[data-application-view="EMPIRICAL"]');
  const root = empiricalView.locator('[data-role="empirical-lafea-consumer-root"]');
  const workbench = root.locator('[data-role="lafea-workbench"]');
  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');

  await expect(empiricalView).toBeVisible();
  await expect(workbench).toBeVisible();
  await expect(analytical).toBeVisible();
  await expect(analytical).toHaveAttribute('data-product-id', 'EMP.1');
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(workbench.locator(':scope > [data-lafea-slot="navigation"] [data-product-id="EMP.1"]')).toHaveCount(1);
  await expect(workbench.locator(':scope > [data-lafea-slot="navigation"] [data-stage-id]')).toHaveCount(0);
  await expect(analytical.locator('[data-role="emp1-step"]')).toHaveCount(3);
  await expect(analytical.locator('[data-role="emp1-step"][data-emp1-step="C"]')).toBeDisabled();
  await expect(workbench.locator('.lafea-workbench__status')).toBeHidden();

  const scope = analytical.locator('[data-role="lafea-analytical-scope-boundary"]');
  await expect(scope).toBeVisible();
  await expect(scope).toContainText('does not calculate WRC 107/537 local-attachment stress');
  await expect(analytical.locator('[data-role="emp1-c-blocker"]')).toContainText('CAUx 2017 pp.24–31');

  const mock = workbench.locator('[data-role="lafea-mock"]');
  if (await mock.isVisible()) await mock.click();
  const scopeStatus = analytical.locator('[data-role="lafea-analytical-scope-status"]');
  await expect(scopeStatus).toBeVisible();
  await expect(scopeStatus).toContainText('EMP.1.A LOAD & REFERENCE');

  const fileInput = workbench.locator('input[data-role="lafea-import"]');
  const importLabel = workbench.locator('label[for^="lafea-import-"]');
  await expect(importLabel).toBeVisible();
  await expect(importLabel).toHaveText('Import EMP.1.A source JSON');
  await expect(fileInput).toHaveCSS('position', 'absolute');
  await expect(fileInput).toHaveCSS('clip-path', /inset/);
  await expect.poll(async () => {
    const box = await fileInput.boundingBox();
    if (!box) return null;
    return box.width <= 1 && box.height <= 1;
  }).toBe(true);

  const scrolling = await page.evaluate(() => {
    const view = document.querySelector('[data-application-view="EMPIRICAL"]');
    const scrollOwner = view?.querySelector('[data-role="empirical-lafea-consumer-root"]');
    const editor = scrollOwner?.querySelector('.lafea-doc-table-view');
    const viewStyle = view ? getComputedStyle(view) : null;
    const scrollStyle = scrollOwner ? getComputedStyle(scrollOwner) : null;
    const editorStyle = editor ? getComputedStyle(editor) : null;
    return {
      shellOverflowY: viewStyle?.overflowY ?? null,
      paneOverflowY: scrollStyle?.overflowY ?? null,
      paneClientHeight: scrollOwner?.clientHeight ?? 0,
      paneScrollHeight: scrollOwner?.scrollHeight ?? 0,
      editorMaxHeight: editorStyle?.maxHeight ?? null,
      editorOverflowY: editorStyle?.overflowY ?? null,
      editorClientHeight: editor?.clientHeight ?? 0,
      editorScrollHeight: editor?.scrollHeight ?? 0,
    };
  });
  expect(scrolling.shellOverflowY).toBe('hidden');
  expect(scrolling.paneOverflowY).toBe('auto');
  expect(scrolling.paneScrollHeight).toBeGreaterThan(scrolling.paneClientHeight);
  expect(scrolling.editorMaxHeight).toBe('none');
  expect(scrolling.editorOverflowY).toBe('visible');
  expect(scrolling.editorScrollHeight).toBeLessThanOrEqual(scrolling.editorClientHeight + 2);

  const screenshotPath = testInfo.outputPath('emp1-empirical-analytical.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('emp1-empirical-analytical', { path: screenshotPath, contentType: 'image/png' });
});

async function openProductionLafea(page) {
  await openProductionView(page, 'LAFEA');
}

async function openProductionEmpirical(page) {
  await openProductionView(page, 'EMPIRICAL');
}

async function openProductionView(page, viewId) {
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  const nav = page.locator(`[data-application-nav="${viewId}"]`);
  await expect(nav).toBeVisible();
  await nav.click();
  await expect.poll(() => page.evaluate(
    () => globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null,
  )).toBe(viewId);
}
