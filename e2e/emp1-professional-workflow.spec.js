import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';
const STEP_LABELS = [
  'Basis & Source',
  'Geometry',
  'Loads',
  'Load Transfer',
  'Section Screening',
  'Local Correlation',
  'Review & Evidence',
];

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_WRC_WORKFLOW_BROWSER__?.controller?.destroy?.();
  delete globalThis.__EMP1_WRC_WORKFLOW_BROWSER__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('WRC professional workflow exposes seven engineer tasks and starts fail-closed', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  const workflow = workbench.locator('[data-role="emp1-workflow"]');
  const steps = workflow.locator('[data-role="emp1-professional-step"]');

  await expect(workflow).toBeVisible();
  await expect(steps).toHaveCount(7);
  for (const [index, label] of STEP_LABELS.entries()) {
    await expect(steps.nth(index)).toContainText(`${index + 1} ${label}`);
    await expect(steps.nth(index)).toBeEnabled();
  }

  await expect(workflow.locator('[data-role="emp1-workflow-details"]')).not.toHaveAttribute('open', '');
  const summary = workflow.locator('[data-role="emp1-professional-authority-summary"]');
  await expect(summary).toContainText('SOURCE INPUT REQUIRED');
  await expect(summary).toContainText('TRANSFER INPUT REQUIRED');
  await expect(summary).toContainText('SCREENING INPUT REQUIRED');
  await expect(summary).toContainText('LOCAL METHOD BLOCKED');
  await expect(summary).toContainText('LOCAL RESULT NOT CALCULATED');
  await expect(summary).toContainText('RELEASE PROFILE NOT QUALIFIED');
  await expect(summary).toContainText('CODE COMPLIANCE NOT ASSESSED');

  const notice = workflow.locator('[data-role="emp1-professional-currentness-notice"]');
  await expect(notice).toHaveAttribute('data-state', 'BLOCKED');
  await expect(notice.locator('[data-role="emp1-professional-required-action"]'))
    .toContainText('Complete the listed source or geometry binding');
  await expect(workbench.locator('[data-role="emp1-c-result-evidence"]')).toHaveCount(0);

  const technical = workflow.locator('[data-role="emp1-technical-backing-steps"]');
  await expect(technical).toHaveJSProperty('open', false);
});

test('current bounded WRC qualification sample produces current local evidence without implying release', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();

  const workflow = workbench.locator('[data-role="emp1-workflow"]');
  const summary = workflow.locator('[data-role="emp1-professional-authority-summary"]');
  await expect(summary).toContainText('SOURCE CURRENT');
  await expect(summary).toContainText('TRANSFER CURRENT');
  await expect(summary).toContainText('SCREENING CURRENT');
  await expect(summary).toContainText('LOCAL METHOD QUALIFIED');
  await expect(summary).toContainText('LOCAL RESULT CURRENT');
  await expect(summary).toContainText('RELEASE PROFILE NOT QUALIFIED');
  await expect(summary).toContainText('CODE COMPLIANCE NOT ASSESSED');

  await expect(workflow.locator('[data-role="emp1-professional-currentness-notice"]')).toHaveCount(0);

  // Local result evidence is no longer part of the default document waterfall.
  // Enter the Local Correlation task, which foregrounds the same retained result
  // and run configuration without creating calculation or route authority.
  await workflow.getByRole('button', { name: /^6 Local Correlation/u }).click();
  const cEvidence = workbench.locator('[data-role="emp1-c-result-evidence"]');
  await expect(cEvidence).toBeVisible();
  const governing = workbench.locator('[data-role="emp1-c-eight-point-governing"]');
  await expect(governing).toBeVisible();
  await expect(governing).toContainText('Professional WRC result scope');
  await expect(governing).toContainText('Continuous/global shell maximum');
  await expect(governing).toContainText('NOT CLAIMED');
  await expect(governing).toContainText('Code compliance');
  await expect(governing).toContainText('NOT ESTABLISHED BY THIS WRC RESULT');

  const cRun = workbench.locator('[data-role="emp1-run-c"]');
  await expect(cRun).toBeEnabled();
  await expect(cRun).toContainText('Re-run C');
});

test('seven-step route navigation lands on the intended WRC task surface', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();
  const workflow = workbench.locator('[data-role="emp1-workflow"]');
  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');

  await workflow.getByRole('button', { name: /^4 Load Transfer/u }).click();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(workbench.locator('[data-guided-target="results"]')).toBeInViewport();

  await workflow.getByRole('button', { name: /^5 Section Screening/u }).click();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(workbench.locator('[data-role="lafea-screening-load-custody"]')).toBeInViewport();
  await expect(workbench.locator('[data-role="emp1-analytical-full-width-detail"]'))
    .toHaveAttribute('data-emp1-evidence-view', 'screeningCustody');

  await workflow.getByRole('button', { name: /^6 Local Correlation/u }).click();
  await expect(workbench.locator('[data-role="emp1-c-run-configuration"]')).toBeInViewport();
  await expect(workbench.locator('[data-role="emp1-c-result-evidence"]')).toBeVisible();

  await workflow.getByRole('button', { name: /^7 Review & Evidence/u }).click();
  await expect(workbench.locator('[data-role="emp1-product-execution-summary"]')).toBeInViewport();
});

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_WRC_WORKFLOW_BROWSER__ = { controller };
    const state = controller.getState();
    return { stageId: state.activeStageId, status: state.status };
  }, { controllerUrl: CONTROLLER_URL });
}
