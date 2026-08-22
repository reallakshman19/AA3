import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_AUTHORITY_BROWSER__?.controller?.destroy?.();
  delete globalThis.__EMP1_AUTHORITY_BROWSER__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('EMP.1 C starts source-incomplete with no result', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  const cRun = workbench.locator('[data-role="emp1-run-c"]');
  await expect(cRun).toBeDisabled();
  await expect(cRun).toHaveAttribute('data-c-state', 'SOURCE_INCOMPLETE');
  await expect(workbench.locator('[data-role="emp1-c-result-evidence"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="emp1-c-run-configuration"]'))
    .toHaveAttribute('data-c-state', 'SOURCE_INCOMPLETE');
});

test('complete EMP.1 qualification sample reaches prepared C and remains fail-closed', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  const sample = workbench.locator('[data-role="emp1-load-complete-qualification-sample"]');
  await expect(sample).toBeVisible();
  await sample.click();

  const summary = workbench.locator('[data-role="emp1-product-execution-summary"]');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('A 1 · B 1 · prepare C 1 · production C 0');
  await expect(summary.getByRole('row').filter({ hasText: 'C current/reportable result' }))
    .toContainText('NO');
  await expect(summary.getByRole('row').filter({ hasText: 'C retained numerical evidence' }))
    .toContainText('NO');

  const cRun = workbench.locator('[data-role="emp1-run-c"]');
  await expect(cRun).toBeDisabled();
  await expect(cRun).toHaveAttribute('data-c-state', 'ROUTE_SUSPENDED');

  const cStep = workbench.locator('[data-role="emp1-step"][data-emp1-step="C"]');
  await expect(cStep).toBeEnabled();
  await expect(cStep).toContainText('PREPARED · ROUTE SUSPENDED');

  const runConfiguration = workbench.locator('[data-role="emp1-c-run-configuration"]');
  await expect(runConfiguration).toHaveAttribute('data-c-state', 'ROUTE_SUSPENDED');
  await expect(runConfiguration).toHaveAttribute('data-production-authority', 'SUSPENDED');

  const blocker = workbench.locator('[data-role="emp1-c-blocker"]');
  await expect(blocker).toHaveAttribute('data-qualification-state', 'ROUTE_SUSPENDED');
  await expect(blocker.locator(
    '[data-blocker-code="WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE"]',
  )).toHaveCount(1);

  await expect(workbench.locator('[data-role="emp1-c-result-evidence"]')).toHaveCount(0);
  await expect(summary.getByRole('row').filter({ hasText: 'C production route executed' }))
    .toContainText('NO');
  await expect(summary.getByRole('row').filter({ hasText: 'Code compliance produced' }))
    .toContainText('NO');
  await expect(summary.getByRole('row').filter({ hasText: 'Release qualified' }))
    .toContainText('NO');

  const authorityEvidence = summary.locator('[data-role="emp1-c-authority-evidence"]');
  await expect(authorityEvidence).toHaveCount(1);
  await expect(authorityEvidence).toHaveAttribute('data-current-result-available', 'false');
  await expect(authorityEvidence.getByRole('row').filter({ hasText: 'Current production use authorized' }))
    .toContainText('NO');

  const evidence = await page.evaluate(() => {
    const execution = globalThis.__EMP1_AUTHORITY_BROWSER__.controller.getEmp1Execution();
    return {
      status: execution?.status ?? null,
      invocations: execution?.invocations ?? null,
      prepared: execution?.authority?.boundedLocalRoutePrepared ?? null,
      executed: execution?.authority?.boundedLocalRouteExecuted ?? null,
      stressesPresent: execution?.result?.localCorrelation?.stresses != null,
      codeComplianceProduced: execution?.authority?.codeComplianceProduced ?? null,
      releaseQualified: execution?.authority?.releaseQualified ?? null,
      routeAuthorityHash: execution?.authority?.routeAuthorityHash ?? null,
      routeAuthoritySnapshotHash: execution?.authority?.routeAuthoritySnapshot?.semanticHash ?? null,
      blockedEvidenceAuthorityHash: execution?.result?.localCorrelation?.routeAuthorityHash ?? null,
    };
  });
  expect(evidence.status).toBe('PREPARED_C_BLOCKED');
  expect(evidence.invocations).toEqual({
    loadTransfer: 1,
    sectionScreening: 1,
    localPreparation: 1,
    localCorrelation: 0,
  });
  expect(evidence.prepared).toBe(true);
  expect(evidence.executed).toBe(false);
  expect(evidence.stressesPresent).toBe(false);
  expect(evidence.codeComplianceProduced).toBe(false);
  expect(evidence.releaseQualified).toBe(false);
  expect(evidence.routeAuthorityHash).toEqual(expect.any(String));
  expect(evidence.routeAuthorityHash).toBe(evidence.routeAuthoritySnapshotHash);
  expect(evidence.blockedEvidenceAuthorityHash).toBe(evidence.routeAuthorityHash);
});

test('C setup stays navigable while production C remains disabled', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();

  const cStep = workbench.locator('[data-role="emp1-step"][data-emp1-step="C"]');
  const cRun = workbench.locator('[data-role="emp1-run-c"]');
  await expect(cStep).toBeEnabled();
  await expect(cRun).toBeDisabled();
  await cStep.click();
  await expect(workbench.locator('[data-role="emp1-c-run-configuration"]')).toBeVisible();
  await expect(workbench.locator('[data-role="emp1-c-production-authority"]'))
    .toContainText('C production execution suspended');
});

test('synthetic current C presentation uses reportable result and execution authority hash', async ({ page }) => {
  await page.goto(HOST_URL);
  const authoritySnapshot = authoritySnapshotForUi('Q1');
  const localCorrelation = currentCorrelationForUi();
  const execution = executionForUi(authoritySnapshot, localCorrelation);
  const result = await page.evaluate(async (fixture) => {
    const { renderEmp1WorkbenchExecutionSummary } = await import(
      '/src/workspace/emp1-workbench-run-view.js'
    );
    const { renderEmp1CorrelationResultEvidence } = await import(
      '/src/workspace/emp1-engineering-evidence-view.js'
    );
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    const currentness = {
      state: 'CURRENT',
      reasons: [],
      inputCurrent: true,
      cAuthorityCurrent: true,
      cReportable: true,
    };
    const cState = {
      state: 'CALCULATED_CURRENT',
      stageBadge: 'CALCULATED · CURRENT',
      productionUseAuthorized: true,
      currentResultAvailable: true,
      retainedResultAvailable: true,
      reportableResult: fixture.localCorrelation,
      currentExecutionEvidence: fixture.localCorrelation,
      retainedHistoricalEvidence: [],
      executionAuthorityHash: fixture.authoritySnapshot.semanticHash,
      currentAuthorityHash: fixture.authoritySnapshot.semanticHash,
      executionAuthoritySnapshot: fixture.authoritySnapshot,
      currentAuthoritySnapshot: fixture.authoritySnapshot,
    };
    const summary = renderEmp1WorkbenchExecutionSummary(
      host, fixture.execution, currentness, cState,
    );
    const currentResult = renderEmp1CorrelationResultEvidence(host, cState.reportableResult);
    host.append(summary);
    if (currentResult) host.append(currentResult);
    return {
      normalResultCards: host.querySelectorAll('[data-role="emp1-c-result-evidence"]').length,
      summaryText: summary.textContent,
      resultText: currentResult?.textContent ?? '',
    };
  }, { authoritySnapshot, localCorrelation, execution });
  expect(result.normalResultCards).toBe(1);
  expect(result.summaryText).toContain('C current/reportable resultYES');
  expect(result.summaryText).toContain('AUTH-Q1');
  expect(result.summaryText).toContain('Code compliance producedNO');
  expect(result.summaryText).toContain('Release qualifiedNO');
  expect(result.resultText).toContain('Eight-location shell stress trace');
  expect(result.resultText).toContain('72.672816');
});

test('stale numerical C is hidden from results but retained in authority evidence', async ({ page }) => {
  await page.goto(HOST_URL);
  const executionAuthoritySnapshot = authoritySnapshotForUi('Q1');
  const currentAuthoritySnapshot = authoritySnapshotForUi('Q2');
  const staleLocalCorrelation = currentCorrelationForUi();
  staleLocalCorrelation.resultHash = 'C-Q1-RESULT';
  const execution = executionForUi(executionAuthoritySnapshot, staleLocalCorrelation);
  execution.decision = 'RETAINED_Q1_ONLY';
  const result = await page.evaluate(async (fixture) => {
    const { renderEmp1WorkbenchExecutionSummary } = await import(
      '/src/workspace/emp1-workbench-run-view.js'
    );
    const { renderEmp1CorrelationResultEvidence } = await import(
      '/src/workspace/emp1-engineering-evidence-view.js'
    );
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    const currentness = {
      state: 'STALE',
      reasons: ['EMP1_WORKBENCH_ROUTE_AUTHORITY_CHANGED'],
      inputCurrent: true,
      cAuthorityCurrent: false,
      cReportable: false,
    };
    const cState = {
      state: 'STALE_AUTHORITY',
      stageBadge: 'STALE · AUTHORITY CHANGED',
      productionUseAuthorized: true,
      currentResultAvailable: false,
      retainedResultAvailable: true,
      reportableResult: null,
      currentExecutionEvidence: fixture.staleLocalCorrelation,
      retainedHistoricalEvidence: [],
      executionAuthorityHash: fixture.executionAuthoritySnapshot.semanticHash,
      currentAuthorityHash: fixture.currentAuthoritySnapshot.semanticHash,
      executionAuthoritySnapshot: fixture.executionAuthoritySnapshot,
      currentAuthoritySnapshot: fixture.currentAuthoritySnapshot,
    };
    const summary = renderEmp1WorkbenchExecutionSummary(
      host, fixture.execution, currentness, cState,
    );
    const normalResult = renderEmp1CorrelationResultEvidence(host, cState.reportableResult);
    host.append(summary);
    if (normalResult) host.append(normalResult);
    return {
      normalResultCards: host.querySelectorAll('[data-role="emp1-c-result-evidence"]').length,
      authorityDrawer: host.querySelectorAll('[data-role="emp1-c-authority-evidence"]').length,
      reportableFlag: host.querySelector('[data-role="emp1-c-authority-evidence"]')
        ?.dataset.currentResultAvailable ?? null,
      staleWarning: host.querySelector('[data-role="emp1-c-retained-stale-result-warning"]')
        ?.textContent ?? null,
      stalePayload: host.querySelector('[data-role="emp1-c-retained-stale-result-payload"]')
        ?.textContent ?? null,
      summaryText: summary.textContent,
    };
  }, { executionAuthoritySnapshot, currentAuthoritySnapshot, staleLocalCorrelation, execution });
  expect(result.normalResultCards).toBe(0);
  expect(result.authorityDrawer).toBe(1);
  expect(result.reportableFlag).toBe('false');
  expect(result.staleWarning).toContain('historical/stale evidence only');
  expect(result.stalePayload).toContain('C-Q1-RESULT');
  expect(result.stalePayload).toContain('72.67281563686576');
  expect(result.summaryText).toContain('AUTH-Q1');
  expect(result.summaryText).toContain('AUTH-Q2');
  expect(result.summaryText).toContain('C current/reportable resultNO');
});

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_AUTHORITY_BROWSER__ = { controller };
    const state = controller.getState();
    return { stageId: state.activeStageId, status: state.status };
  }, { controllerUrl: CONTROLLER_URL });
}

function authoritySnapshotForUi(qualificationId) {
  return {
    schema: 'emp1-workbench-route-authority-snapshot/v1',
    routeId: 'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP',
    productionUseAuthorized: true,
    semanticHash: `AUTH-${qualificationId}`,
    registry: {
      method: {
        qualificationRecordSha256: `QUAL-${qualificationId}`,
        sourceDocumentSha256: `SOURCE-${qualificationId}`,
        datasetHash: `DATASET-${qualificationId}`,
      },
    },
  };
}

function currentCorrelationForUi() {
  return {
    schema: 'emp1-local-correlation-result/v1',
    resultHash: 'C-Q1-RESULT',
    productionRouteAuthority: true,
    stresses: {
      circumferential: [41, 39, 37, 35, 33, 31, 29, 27],
      longitudinal: [21, 20, 19, 18, 17, 16, 15, 14],
      shear: [3, 3, 3, 3, 3, 3, 3, 3],
      stressIntensity: [
        72.67281563686576, 61.1, 52.2, 43.3, 34.4, 25.5, 16.6, 7.7,
      ],
    },
  };
}

function executionForUi(authoritySnapshot, localCorrelation) {
  return {
    status: 'CALCULATED',
    decision: 'BOUNDED_CALCULATION_ONLY',
    sourceHash: 'SOURCE-HASH-Q1',
    invocations: { loadTransfer: 0, sectionScreening: 0, localPreparation: 0, localCorrelation: 1 },
    authority: {
      boundedLocalRoutePrepared: true,
      boundedLocalRouteExecuted: true,
      routeAuthorityHash: authoritySnapshot.semanticHash,
      routeAuthoritySnapshot: authoritySnapshot,
      globalEmp1CRouteAuthority: false,
      codeComplianceProduced: false,
      releaseQualified: false,
    },
    result: {
      loadTransfer: { resultHash: 'A-RESULT' },
      sectionScreening: { resultHash: 'B-RESULT' },
      localCorrelation,
    },
  };
}