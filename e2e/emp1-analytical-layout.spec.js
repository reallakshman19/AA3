import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_ANALYTICAL_LAYOUT__?.controller?.destroy?.();
  delete globalThis.__EMP1_ANALYTICAL_LAYOUT__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('EMP.1 task shell keeps one active task and one heavy evidence view without residual waterfall growth', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1058 });
  await mountEmp1Workbench(page);

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();

  let analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  let workflow = workbench.locator('[data-role="emp1-workflow"]');
  await expect(analytical).toHaveAttribute('data-emp1-task-shell', 'true');
  await expect(workflow.locator('[data-role="emp1-workflow-compact-status"]')).toBeVisible();
  await expect(workflow.locator('[data-role="emp1-professional-step"]')).toHaveCount(7);
  await expect(workflow.locator('[data-role="emp1-workflow-details"]')).not.toHaveAttribute('open', '');

  await assertUniqueLayoutSurfaceManifest(analytical);
  await assertEngineerFacingCardinality(analytical);
  await assertSingleVisibleEvidence(analytical, 'results');
  await expect(analytical.locator('[data-role="emp1-professional-step"][aria-current="step"]'))
    .toHaveAttribute('data-emp1-professional-step', 'BASIS_SOURCE');
  await expect(analytical.locator('.lafea-doc-table-section[data-input-group]:visible')).toHaveCount(0);

  const desktopGeometry = await regionGeometry(analytical);
  expect(desktopGeometry.primary.width).toBeGreaterThan(0);
  expect(desktopGeometry.basis.width).toBeGreaterThan(0);
  expect(desktopGeometry.primary.right).toBeLessThanOrEqual(desktopGeometry.basis.left + 1);
  expect(Math.abs(desktopGeometry.primary.top - desktopGeometry.basis.top)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.detail.width).toBeGreaterThanOrEqual(desktopGeometry.lanes.width - 1);
  expect(desktopGeometry.basis.height).toBeLessThanOrEqual(desktopGeometry.viewportHeight + 1);
  expect(desktopGeometry.detail.height).toBeLessThanOrEqual(Math.min(desktopGeometry.viewportHeight * 0.72, 760) + 2);
  expect(desktopGeometry.analyticalScrollWidth).toBeLessThanOrEqual(desktopGeometry.analyticalClientWidth + 1);
  expect(desktopGeometry.pageScrollHeight / desktopGeometry.clientHeight).toBeLessThan(6);

  await professionalStep(workflow, 2, 'Geometry').click();
  await expect(analytical).toHaveAttribute('data-emp1-professional-task', 'GEOMETRY');
  await assertVisibleInputGroups(analytical, ['PIPE_GEOMETRY', 'THICKNESS']);
  await expect(analytical.locator('[data-role="emp1-c-run-configuration"]')).toBeVisible();

  await professionalStep(workflow, 3, 'Loads').click();
  await expect(analytical).toHaveAttribute('data-emp1-professional-task', 'LOADS');
  await assertVisibleInputGroups(analytical, ['PRESSURE', 'LOAD_CASES']);
  await expect(analytical.locator('[data-guided-target="source"]')).toBeVisible();
  await expect(analytical.locator('[data-role="emp1-c-run-configuration"]')).toBeHidden();

  await professionalStep(workflow, 4, 'Load Transfer').click();
  analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  workflow = workbench.locator('[data-role="emp1-workflow"]');
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(analytical).toHaveAttribute('data-emp1-professional-task', 'LOAD_TRANSFER');
  await assertVisibleInputGroups(analytical, ['REFERENCE_POINTS']);
  await assertSingleVisibleEvidence(analytical, 'results');

  await professionalStep(workflow, 5, 'Section Screening').click();
  analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  workflow = workbench.locator('[data-role="emp1-workflow"]');
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(analytical).toHaveAttribute('data-emp1-professional-task', 'SECTION_SCREENING');
  await assertVisibleInputGroups(analytical, ['SCREENING_CASES', 'EVALUATION_LOCATIONS']);

  await professionalStep(workflow, 6, 'Local Correlation').click();
  await expect(analytical).toHaveAttribute('data-emp1-professional-task', 'LOCAL_CORRELATION');
  await expect(analytical.locator('[data-role="emp1-c-run-configuration"]')).toBeVisible();
  await expect(analytical.locator('[data-guided-target="source"]')).toBeHidden();
  await assertSingleVisibleEvidence(analytical, 'correlationResult');

  await professionalStep(workflow, 7, 'Review & Evidence').click();
  await expect(analytical).toHaveAttribute('data-emp1-professional-task', 'REVIEW_EVIDENCE');
  await assertSingleVisibleEvidence(analytical, 'transactionSummary');
  const executionSummary = analytical.locator('[data-role="emp1-product-execution-summary"]');
  await expect(executionSummary).toHaveCount(1);
  await expect(executionSummary).toBeInViewport();
  await expect(workflow.locator('[data-role="emp1-workflow-details"]')).not.toHaveAttribute('open', '');

  const benchmarkTab = analytical.locator('[data-role="emp1-evidence-tab"][data-emp1-evidence-view="benchmarkEvidence"]');
  await benchmarkTab.click();
  await assertSingleVisibleEvidence(analytical, 'benchmarkEvidence');
  await expect(analytical.locator('[data-role="emp1-benchmark-evidence-panel"]')).toBeVisible();
  await expect(analytical.locator('[data-role="emp1-benchmark-evidence-panel"]')).toHaveCount(1);

  const beforeHiddenSentinel = await pageDepth(analytical);
  const hiddenSentinelDelta = await analytical.evaluate((root) => {
    const region = root.querySelector('[data-role="emp1-analytical-full-width-detail"]');
    const before = document.documentElement.scrollHeight;
    const sentinel = document.createElement('div');
    sentinel.hidden = true;
    sentinel.style.height = '5000px';
    sentinel.dataset.role = 'emp1-unselected-evidence-height-falsifier';
    region.append(sentinel);
    const after = document.documentElement.scrollHeight;
    sentinel.remove();
    return { before, after, delta: after - before };
  });
  expect(Math.abs(hiddenSentinelDelta.delta)).toBeLessThanOrEqual(1);

  await analytical.locator('[data-role="emp1-evidence-tab"][data-emp1-evidence-view="results"]').click();
  await assertSingleVisibleEvidence(analytical, 'results');
  await expect(analytical.locator('[data-role="emp1-benchmark-evidence-panel"]')).toBeHidden();
  await expect(analytical.locator('[data-role="emp1-benchmark-evidence-panel"]')).toHaveCount(1);

  const sameStageDesktopManifest = await liveManifest(analytical);

  await page.setViewportSize({ width: 720, height: 900 });
  const narrowAnalytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await expect(narrowAnalytical).toBeVisible();
  const narrowGeometry = await regionGeometry(narrowAnalytical);
  expect(Math.abs(narrowGeometry.primary.left - narrowGeometry.basis.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(narrowGeometry.primary.width - narrowGeometry.basis.width)).toBeLessThanOrEqual(1);
  expect(narrowGeometry.basis.top).toBeGreaterThanOrEqual(narrowGeometry.primary.bottom - 1);
  expect(narrowGeometry.basis.height).toBeLessThanOrEqual(Math.min(narrowGeometry.viewportHeight * 0.54, 560) + 2);
  expect(narrowGeometry.detail.height).toBeLessThanOrEqual(Math.min(narrowGeometry.viewportHeight * 0.68, 620) + 2);
  expect(narrowGeometry.analyticalScrollWidth).toBeLessThanOrEqual(narrowGeometry.analyticalClientWidth + 1);
  expect(narrowGeometry.pageScrollHeight / narrowGeometry.clientHeight).toBeLessThan(6);

  await assertUniqueLayoutSurfaceManifest(narrowAnalytical);
  await assertEngineerFacingCardinality(narrowAnalytical);
  await assertSingleVisibleEvidence(narrowAnalytical, 'results');
  const narrowManifest = await liveManifest(narrowAnalytical);
  expect(narrowManifest.roles).toEqual(sameStageDesktopManifest.roles);
  expect(narrowManifest.guidedTargets).toEqual(sameStageDesktopManifest.guidedTargets);

  await testInfo.attach('emp1-task-shell-layout-geometry', {
    body: Buffer.from(`${JSON.stringify({
      desktopGeometry,
      narrowGeometry,
      beforeHiddenSentinel,
      hiddenSentinelDelta,
    }, null, 2)}\n`, 'utf8'),
    contentType: 'application/json',
  });
});

async function assertUniqueLayoutSurfaceManifest(analytical) {
  const manifest = await analytical.locator('[data-emp1-layout-surface]').evaluateAll((nodes) => nodes.map((node) => ({
    surfaceId: node.dataset.emp1LayoutSurface,
    regionId: node.dataset.emp1LayoutRegion,
  })));
  const ids = manifest.map((entry) => entry.surfaceId);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain('workflow');
  expect(ids).toContain('route');
  expect(ids).toContain('source');
  expect(ids).toContain('runConfiguration');
  expect(ids).toContain('settings');
  expect(ids).toContain('engineeringEvidence');
  expect(ids).toContain('boundedCorrelation');
  expect(ids).toContain('transactionSummary');
  expect(ids).toContain('correlationResult');
  expect(ids).toContain('results');
  expect(ids).toContain('lineage');
  expect(ids).toContain('benchmarkEvidence');
  expect(manifest.find((entry) => entry.surfaceId === 'workflow')?.regionId).toBe('COMPACT_WORKFLOW_NAV');
  expect(manifest.find((entry) => entry.surfaceId === 'source')?.regionId).toBe('ACTIVE_TASK');
  expect(manifest.find((entry) => entry.surfaceId === 'settings')?.regionId).toBe('BASIS_RAIL');
  expect(manifest.find((entry) => entry.surfaceId === 'benchmarkEvidence')?.regionId).toBe('EVIDENCE_WORKSPACE');
}

async function assertEngineerFacingCardinality(analytical) {
  for (const selector of [
    '[data-role="emp1-workflow"]',
    '[data-guided-target="source"]',
    '[data-role="emp1-c-run-configuration"]',
    '[data-role="emp1-product-execution-summary"]',
    '[data-role="emp1-c-result-evidence"]',
    '[data-guided-target="results"]',
    '[data-guided-target="lineage"]',
    '[data-role="emp1-benchmark-evidence-panel"]',
  ]) {
    await expect(analytical.locator(selector)).toHaveCount(1);
  }
  const governedInputs = analytical.locator('[data-role="lafea-governed-input"]');
  expect(await governedInputs.count()).toBeGreaterThan(0);
}

async function assertVisibleInputGroups(analytical, expectedGroups) {
  const groups = await analytical.locator('.lafea-doc-table-section[data-input-group]').evaluateAll((nodes) => nodes
    .filter((node) => !node.hidden && getComputedStyle(node).display !== 'none')
    .map((node) => node.dataset.inputGroup));
  expect(groups).toEqual(expectedGroups);
}

async function assertSingleVisibleEvidence(analytical, expectedSurfaceId) {
  const evidence = await analytical.locator('[data-emp1-layout-region="EVIDENCE_WORKSPACE"][data-emp1-evidence-view]').evaluateAll((nodes) => nodes
    .filter((node) => !node.hidden && getComputedStyle(node).display !== 'none')
    .map((node) => node.dataset.emp1LayoutSurface));
  expect(evidence).toEqual([expectedSurfaceId]);
  await expect(analytical.locator('[data-role="emp1-analytical-full-width-detail"]'))
    .toHaveAttribute('data-emp1-evidence-view', expectedSurfaceId);
}

async function liveManifest(analytical) {
  return analytical.evaluate((root) => {
    const count = (selector) => root.querySelectorAll(selector).length;
    return {
      roles: {
        workflow: count('[data-role="emp1-workflow"]'),
        runConfiguration: count('[data-role="emp1-c-run-configuration"]'),
        executionSummary: count('[data-role="emp1-product-execution-summary"]'),
        correlationResult: count('[data-role="emp1-c-result-evidence"]'),
        benchmarkEvidence: count('[data-role="emp1-benchmark-evidence-panel"]'),
        governedInputs: count('[data-role="lafea-governed-input"]'),
        evidenceTabs: count('[data-role="emp1-evidence-tab"]'),
      },
      guidedTargets: {
        route: count('[data-guided-target="analytical-route"]'),
        source: count('[data-guided-target="source"]'),
        profile: count('[data-guided-target="profile"]'),
        results: count('[data-guided-target="results"]'),
        lineage: count('[data-guided-target="lineage"]'),
      },
    };
  });
}

async function regionGeometry(analytical) {
  return analytical.evaluate((root) => {
    const box = (role) => {
      const rect = root.querySelector(`[data-role="${role}"]`).getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      primary: box('emp1-analytical-primary-work'),
      basis: box('emp1-analytical-engineering-basis'),
      detail: box('emp1-analytical-full-width-detail'),
      lanes: box('emp1-analytical-layout-lanes'),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      analyticalScrollWidth: root.scrollWidth,
      analyticalClientWidth: root.clientWidth,
      pageScrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    };
  });
}

async function pageDepth(analytical) {
  return analytical.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    viewportRatio: document.documentElement.scrollHeight / document.documentElement.clientHeight,
  }));
}

function professionalStep(workflow, ordinal, label) {
  return workflow.getByRole('button', { name: new RegExp(`^${ordinal} ${escapeRegExp(label)}`, 'u') });
}

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_ANALYTICAL_LAYOUT__ = { controller };
    return controller.getState().activeStageId;
  }, { controllerUrl: CONTROLLER_URL });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
