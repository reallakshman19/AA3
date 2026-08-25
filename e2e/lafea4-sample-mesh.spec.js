import { expect, test } from '@playwright/test';

const STAGE_ID = 'LAFEA.4';
const SHELL_ROUTE = 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL';

test('production LAFEA.4 Sample retained mesh is the authoritative solve mesh', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(workbench).toBeVisible();
  await workbench.locator(`.lafea-workbench__stages [data-stage-id="${STAGE_ID}"]`).click();
  await workbench.locator('[data-role="lafea-mock"]').click();
  await expect(workbench.locator('.lafea-workbench__status')).toHaveText('READY');

  const source = await page.evaluate((stageId) => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[stageId];
    return {
      modelIdentity: stage.document.modelIdentity,
      nodeCount: stage.document.nodes.length,
      elementCount: stage.document.elements.length,
      parentSchema: stage.retainedShellMidsurfaceEvidence?.schema ?? null,
      parentKind: stage.retainedShellMidsurfaceEvidence?.geometry?.surface?.kind ?? null,
      parentRadius: stage.retainedShellMidsurfaceEvidence?.geometry?.surface?.radius ?? null,
      domainFirst: stage.domainFirstProfileActive,
      shellParentActive: stage.shellMidsurfaceProfileActive,
    };
  }, STAGE_ID);

  expect(source).toMatchObject({
    modelIdentity: 'CYLINDRICAL_PIPE_SHELL_BENCHMARK',
    nodeCount: 26,
    elementCount: 24,
    parentKind: 'CYLINDER',
    parentRadius: 100,
    domainFirst: false,
    shellParentActive: true,
  });

  const quickMesh = workbench.locator('.lafea-next-action-banner__button');
  await expect(quickMesh).toBeEnabled();
  await expect(quickMesh).toHaveText('Generate qualified mesh');
  await quickMesh.click();

  await expect.poll(() => page.evaluate(
    (stageId) => globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
      .stages[stageId].retainedAnalysisMeshEvidenceV2?.qualification ?? null,
    STAGE_ID,
  )).toBe('PASS');

  const retained = await page.evaluate((stageId) => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[stageId];
    const evidence = stage.retainedAnalysisMeshEvidenceV2;
    return {
      custody: stage.analysisMeshCustodyProjection.state,
      usableForRun: stage.analysisMeshCustodyProjection.usableForRun,
      runBlockingReasons: stage.analysisMeshCustodyProjection.runBlockingReasons,
      meshHash: evidence.meshHash,
      solverModelState: stage.shellSolverModelProjection?.state ?? null,
      solverModelHash: stage.shellSolverModelProjection?.solverModelHash ?? null,
      solverModelBindingHash: stage.shellSolverModelProjection?.solverModelBindingHash ?? null,
      solverMappingMode: stage.shellSolverModelProjection?.mappingMode ?? null,
      authorizationState: stage.orchestration.sections.AUTHORIZATION.state,
      authorizationReasons: stage.orchestration.sections.AUTHORIZATION.reasons,
      executionActions: stage.orchestration.sections.EXECUTION.allowedActions,
      orientationQualification: evidence.quality.shellOrientationTopology?.qualification ?? null,
      nodes: evidence.mesh.nodes,
      elements: evidence.mesh.elements,
    };
  }, STAGE_ID);

  expect(retained.custody).toBe('CURRENT_PASS');
  expect(retained.orientationQualification).toBe('PASS');
  expect(retained.solverModelState).toBe('CURRENT_PASS');
  expect(retained.solverModelHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(retained.solverModelBindingHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(retained.solverMappingMode).toBe('PARAMETRIC_MIDSURFACE_UNIFORM_REGION_TRANSFER_V1');
  expect(retained.usableForRun).toBe(true);
  expect(retained.runBlockingReasons).toEqual([]);
  expect(retained.authorizationState).toBe('READY');
  expect(retained.authorizationReasons).toEqual([]);
  expect(retained.executionActions).toContain('RUN_SOLVE');
  expect(retained.nodes.length).toBeGreaterThan(0);
  expect(retained.elements.length).toBeGreaterThan(0);
  for (const node of retained.nodes) {
    expect(Math.hypot(node.y, node.z)).toBeCloseTo(100, 8);
    expect(node.x).toBeGreaterThanOrEqual(-1e-9);
    expect(node.x).toBeLessThanOrEqual(50 + 1e-9);
  }

  const run = workbench.locator('[data-role="lafea-overview-run"]');
  await expect(run).toBeEnabled();

  const viewport = workbench.locator('[data-guided-target="viewport"]');
  await expect(viewport).toBeVisible();
  const retainedOverlay = viewport.locator('[data-role="lafea-retained-mesh-overlay"]');
  await expect(retainedOverlay).toBeVisible();
  await expect(retainedOverlay.locator('[data-mesh-element-id]')).toHaveCount(retained.elements.length);
  await expect(workbench.locator('[data-role="lafea-viewport-mode-panel"]')).toContainText(
    `${retained.elements.length} ELEMENTS`,
  );

  await run.click();
  await expect.poll(() => page.evaluate(
    (stageId) => globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
      .stages[stageId].execution?.status ?? null,
    STAGE_ID,
  )).toBe('QUALIFIED');

  const executed = await page.evaluate((stageId) => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[stageId];
    const execution = stage.execution;
    const shellResult = execution.result;
    return {
      workbenchStatus: globalThis.AnalysisWorkspace.getLafeaWorkbenchState().status,
      route: execution.route,
      meshHash: execution.meshHash,
      solverModelHash: execution.solverModelHash,
      solverModelBindingHash: execution.solverModelBindingHash,
      executionMeshBindingHash: execution.executionMeshBindingHash,
      compiledExecutionHash: execution.compiledExecutionHash,
      resultAccepted: execution.result?.qualification?.accepted === true,
      forceEquilibriumAccepted: (shellResult?.loadCaseResults ?? []).every(
        (row) => row.forceEquilibrium?.qualification?.accepted === true,
      ),
      momentEquilibriumAccepted: (shellResult?.loadCaseResults ?? []).every(
        (row) => row.momentEquilibrium?.qualification?.accepted === true,
      ),
      calculationState: stage.lifecycleReadiness.calculationState,
      resultReady: stage.lifecycleReadiness.resultReady,
      lifecycleMeshHash: stage.lifecycle.artifacts.ANALYSIS_MESH?.artifactHash ?? null,
      lifecycleExecutionHash: stage.lifecycle.artifacts.EXECUTION?.artifactHash ?? null,
      lifecycleRecoveryState: stage.lifecycle.artifacts.RECOVERY?.status ?? null,
      lifecycleRecoveryQualification: stage.lifecycle.artifacts.RECOVERY?.qualification ?? null,
      orchestrationExecutionState: stage.orchestration.sections.EXECUTION.state,
      orchestrationResultsState: stage.orchestration.sections.RESULTS.state,
    };
  }, STAGE_ID);

  expect(executed.workbenchStatus).not.toBe('FAILED');
  expect(executed.route).toBe(SHELL_ROUTE);
  expect(executed.meshHash).toBe(retained.meshHash);
  expect(executed.solverModelHash).toBe(retained.solverModelHash);
  expect(executed.solverModelBindingHash).toBe(retained.solverModelBindingHash);
  expect(executed.executionMeshBindingHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(executed.compiledExecutionHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(executed.resultAccepted).toBe(true);
  expect(executed.forceEquilibriumAccepted).toBe(true);
  expect(executed.momentEquilibriumAccepted).toBe(true);
  expect(executed.lifecycleMeshHash).toBe(retained.meshHash);
  expect(executed.lifecycleExecutionHash).toBe(executed.compiledExecutionHash);
  expect(executed.lifecycleRecoveryState).toBe('CURRENT');
  expect(executed.lifecycleRecoveryQualification).toBe('PASS');
  expect(executed.calculationState).toBe('CALCULATION_ACCEPTED_BY_STAGE_CONTRACT');
  expect(executed.resultReady).toBe(true);
  expect(executed.orchestrationExecutionState).toBe('COMPLETE');
  expect(executed.orchestrationResultsState).toBe('COMPLETE');

  const results = workbench.locator('[data-guided-target="results"]');
  const presentation = results.locator('.lafea-result-presentation');
  await expect(presentation).toBeVisible();
  await expect(presentation.getByRole('heading', {
    name: 'Engineering summary — retained shell evidence only',
  })).toBeVisible();
  const summaryTable = presentation.locator('.lafea-result-table').first();
  await expect(summaryTable).toContainText('Max authoritative surface/IP von Mises');
  await expect(summaryTable).toContainText('Max applied force resultant magnitude');
  await expect(summaryTable).toContainText('Force equilibrium residual · PASS');
  await expect(summaryTable).toContainText('Moment equilibrium residual · PASS');
  await expect(summaryTable).toContainText('forceEquilibrium.qualification.actual');
  await expect(presentation.locator('.lafea-result-governing')).toContainText(
    'Governing retained shell surface/IP von Mises equivalent stress',
  );

  await viewport.scrollIntoViewIfNeeded();
  const screenshotPath = testInfo.outputPath('lafea4-sample-mesh.png');
  await viewport.screenshot({ path: screenshotPath });
  await testInfo.attach('LAFEA.4-sample-mesh', { path: screenshotPath, contentType: 'image/png' });
});
