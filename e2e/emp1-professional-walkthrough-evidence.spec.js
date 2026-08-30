import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_WRC_WALKTHROUGH__?.controller?.destroy?.();
  delete globalThis.__EMP1_WRC_WALKTHROUGH__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('records the 12-checkpoint WRC professional walkthrough for human review', async ({ page }, testInfo) => {
  await mountEmp1Workbench(page);
  const checkpointEvidence = [];
  const workbench = page.locator('[data-role="lafea-workbench"]');
  const workflow = workbench.locator('[data-role="emp1-workflow"]');
  const summary = workflow.locator('[data-role="emp1-professional-authority-summary"]');

  await expect(summary).toContainText('SOURCE INPUT REQUIRED');
  await expect(summary).toContainText('LOCAL METHOD BLOCKED');
  await checkpoint(page, testInfo, checkpointEvidence, '01', 'cold-start-fail-closed');

  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();
  await expect(summary).toContainText('SOURCE CURRENT');
  await expect(summary).toContainText('TRANSFER CURRENT');
  await expect(summary).toContainText('SCREENING CURRENT');
  await expect(summary).toContainText('LOCAL METHOD QUALIFIED');
  await expect(summary).toContainText('LOCAL RESULT CURRENT');
  await checkpoint(page, testInfo, checkpointEvidence, '02', 'qualification-source-bundle-current');

  await professionalStep(workflow, 1, 'Basis & Source').click();
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]'))
    .toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(workbench.locator('[data-guided-target="source"]')).toBeInViewport();
  await checkpoint(page, testInfo, checkpointEvidence, '03', 'basis-and-source');

  await professionalStep(workflow, 2, 'Geometry').click();
  await expect(workbench.locator('[data-role="emp1-c-run-configuration"]')).toBeInViewport();
  await checkpoint(page, testInfo, checkpointEvidence, '04', 'geometry');

  await professionalStep(workflow, 3, 'Loads').click();
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]'))
    .toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(workbench.locator('[data-guided-target="source"]')).toBeInViewport();
  await checkpoint(page, testInfo, checkpointEvidence, '05', 'loads');

  await professionalStep(workflow, 4, 'Load Transfer').click();
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]'))
    .toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(workbench.locator('[data-guided-target="results"]')).toBeInViewport();
  await checkpoint(page, testInfo, checkpointEvidence, '06', 'load-transfer-results');

  await professionalStep(workflow, 5, 'Section Screening').click();
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]'))
    .toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(workbench.locator('[data-guided-target="results"]')).toBeInViewport();
  await checkpoint(page, testInfo, checkpointEvidence, '07', 'section-screening-results');

  await professionalStep(workflow, 6, 'Local Correlation').click();
  const cConfiguration = workbench.locator('[data-role="emp1-c-run-configuration"]');
  await expect(cConfiguration).toBeInViewport();
  await checkpoint(page, testInfo, checkpointEvidence, '08', 'local-correlation-configuration');

  const cEvidence = workbench.locator('[data-role="emp1-c-result-evidence"]');
  const governing = workbench.locator('[data-role="emp1-c-eight-point-governing"]');
  await expect(cEvidence).toBeVisible();
  await governing.scrollIntoViewIfNeeded();
  await expect(governing).toContainText('Continuous/global shell maximum');
  await expect(governing).toContainText('NOT CLAIMED');
  await expect(governing).toContainText('NOT ESTABLISHED BY THIS WRC RESULT');
  await checkpoint(page, testInfo, checkpointEvidence, '09', 'current-wrc-result-and-governing-scope');

  await professionalStep(workflow, 7, 'Review & Evidence').click();
  await expect(workbench.locator('[data-role="emp1-product-execution-summary"]')).toBeInViewport();
  await checkpoint(page, testInfo, checkpointEvidence, '10', 'review-and-evidence');

  await professionalStep(workflow, 1, 'Basis & Source').click();
  const outsideDiameter = workbench.getByRole('textbox', { name: 'Pipe outside diameter LAFEA.1' });
  await expect(outsideDiameter).toBeVisible();
  const originalDiameter = Number(await outsideDiameter.inputValue());
  expect(Number.isFinite(originalDiameter)).toBe(true);
  await outsideDiameter.fill(String(originalDiameter + 1));
  const applyGeometry = workbench.locator('[data-role="lafea-apply-group"][data-input-group="PIPE_GEOMETRY"]');
  await expect(applyGeometry).toBeEnabled();
  await applyGeometry.click();
  await checkpoint(page, testInfo, checkpointEvidence, '11', 'upstream-a-geometry-edited');

  await expect(summary).toContainText('LOCAL RESULT STALE');
  const staleNotice = workflow.locator('[data-role="emp1-professional-currentness-notice"]');
  await expect(staleNotice).toHaveAttribute('data-state', 'STALE');
  await expect(staleNotice.locator('[data-role="emp1-professional-required-action"]'))
    .toContainText(/Re-run|rerun/u);
  await expect(workbench.locator('[data-role="emp1-c-result-evidence"]')).toHaveCount(0);
  await staleNotice.scrollIntoViewIfNeeded();
  await checkpoint(page, testInfo, checkpointEvidence, '12', 'downstream-local-result-stale-with-explanation');

  await attachManifest(page, testInfo, originalDiameter, checkpointEvidence);
});

function professionalStep(workflow, ordinal, label) {
  return workflow.getByRole('button', { name: new RegExp(`^${ordinal} ${escapeRegExp(label)}`, 'u') });
}

async function checkpoint(page, testInfo, evidence, ordinal, name) {
  await page.evaluate(() => document.activeElement?.blur?.());
  const viewportState = await page.evaluate(() => ({
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }));
  const screenshotOptions = { animations: 'disabled', caret: 'hide' };
  const viewportBody = await page.screenshot(screenshotOptions);
  await testInfo.attach(`${ordinal}-${name}-viewport`, { body: viewportBody, contentType: 'image/png' });
  const fullPageBody = await page.screenshot({ ...screenshotOptions, fullPage: true });
  await testInfo.attach(`${ordinal}-${name}-full-page`, { body: fullPageBody, contentType: 'image/png' });
  evidence.push({ ordinal: Number(ordinal), name, ...viewportState });
}

async function attachManifest(page, testInfo, originalDiameter, checkpointEvidence) {
  const browserVersion = page.context().browser()?.version() ?? 'UNRESOLVED';
  const manifest = {
    schema: 'emp1-wrc-ui-walkthrough-evidence/v2',
    project: testInfo.project.name,
    browserVersion,
    checkpoints: 12,
    checkpointEvidence,
    attachmentPolicy: {
      viewportScreenshots: 12,
      fullPageContextScreenshots: 12,
      viewportScreenshotProvesLanding: true,
      fullPageScreenshotIsContextOnly: true,
    },
    upstreamMutation: {
      control: 'Pipe outside diameter LAFEA.1',
      originalValue: originalDiameter,
      mutatedValue: originalDiameter + 1,
      action: 'Apply PIPE_GEOMETRY changes',
    },
    automationIsAcceptance: false,
    requiredHumanReview: true,
  };
  await testInfo.attach('walkthrough-manifest', {
    body: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    contentType: 'application/json',
  });
}

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_WRC_WALKTHROUGH__ = { controller };
    return controller.getState().activeStageId;
  }, { controllerUrl: CONTROLLER_URL });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
