import { expect, test } from '@playwright/test';

test('LAFEA.3 Sample generates, displays, preflights and solves the retained T6 mesh', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('.lafea-workbench__stages [data-stage-id="LAFEA.3"]').click();
  await workbench.locator('[data-role="lafea-mock"]').click();
  await expect(workbench.locator('.lafea-workbench__status')).toHaveText('READY');

  const prepared = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.3'];
    return {
      domainFirst: stage.domainFirstProfileActive,
      domainState: stage.analysisDomainProjection?.state ?? null,
      geometryState: stage.analysisGeometryProjection?.state ?? null,
      profileIdentity: stage.retainedAnalysisMeshProfile?.profileIdentity ?? null,
      elementFamily: stage.retainedAnalysisMeshProfile?.fields?.continuumElement ?? null,
      targetElementLength: stage.retainedAnalysisMeshProfile?.fields?.globalTargetSize ?? null,
      retainedMesh: stage.retainedAnalysisMeshEvidenceV2 ?? null,
    };
  });
  expect(prepared).toMatchObject({
    domainFirst: true,
    domainState: 'CURRENT_PASS',
    geometryState: 'CURRENT_PASS',
    profileIdentity: 'LAFEA3_SIMULATED_T6_H30_V1',
    elementFamily: 'T6',
    targetElementLength: 30,
    retainedMesh: null,
  });

  const generate = workbench.locator('[data-role="lafea-generation-generate"]');
  await expect(generate).toBeVisible();
  await expect(generate).toBeEnabled();
  await expect(generate).toHaveText('Generate and retain mesh');
  await generate.click();

  await expect.poll(() => page.evaluate(() =>
    globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
      .stages['LAFEA.3'].retainedAnalysisMeshEvidenceV2?.qualification ?? null,
  )).toBe('PASS');

  const retained = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.3'];
    const evidence = stage.retainedAnalysisMeshEvidenceV2;
    return {
      custody: stage.analysisMeshCustodyProjection.state,
      canView: stage.analysisMeshCustodyProjection.canView,
      usableForRun: stage.analysisMeshCustodyProjection.usableForRun,
      meshHash: evidence.meshHash,
      meshProfileHash: evidence.meshProfileHash,
      qualification: evidence.qualification,
      nodeCount: evidence.mesh.nodes.length,
      elementCount: evidence.mesh.elements.length,
      elementTypes: [...new Set(evidence.mesh.elements.map((row) => row.elementType))],
      warningCount: evidence.quality.warningElementIds.length,
      blockingCount: evidence.quality.blockingElementIds.length,
      characteristicLengthMax: stage.lastAnalysisMeshPlan?.characteristicLengthMax ?? null,
      resourceDisposition: stage.lastAnalysisMeshPlan?.resourceDisposition ?? null,
      preparationState: stage.preparationProjection?.state ?? null,
    };
  });
  expect(retained.custody).toBe('CURRENT_PASS');
  expect(retained.canView).toBe(true);
  expect(retained.usableForRun).toBe(true);
  expect(retained.qualification).toBe('PASS');
  expect(retained.meshHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(retained.nodeCount).toBeGreaterThan(0);
  expect(retained.elementCount).toBeGreaterThan(0);
  expect(retained.elementTypes).toEqual(['T6']);
  expect(retained.blockingCount).toBe(0);
  expect(retained.resourceDisposition).not.toBe('BLOCK');
  expect(retained.characteristicLengthMax).toBeLessThanOrEqual(30 + 1e-9);
  expect(retained.preparationState).toBe('ABSENT');

  const viewport = workbench.locator('[data-guided-target="viewport"]');
  await expect(viewport).toBeVisible();
  await expect(viewport.locator('.lafea-workbench__svg')).toHaveAttribute(
    'data-live-viewport-mode',
    'SOURCE_AUTHORING',
  );
  const overlay = viewport.locator('[data-role="lafea-retained-mesh-overlay"]');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('[data-mesh-element-id]')).toHaveCount(retained.elementCount);
  await expect(overlay.locator('path[data-mesh-element-type="T6"]')).toHaveCount(retained.elementCount);
  await expect(overlay.locator('polygon[data-mesh-element-type="T6"]')).toHaveCount(0);

  const firstPath = overlay.locator('path[data-mesh-element-type="T6"]').first();
  const pathData = await firstPath.getAttribute('d');
  expect(pathData).toBeTruthy();
  expect((pathData.match(/\bQ\b/g) ?? [])).toHaveLength(3);
  expect(pathData.trim().endsWith('Z')).toBe(true);
  await expect(workbench.locator('[data-role="lafea-viewport-mode-panel"]')).toContainText(
    `${retained.elementCount} ELEMENTS`,
  );

  await viewport.scrollIntoViewIfNeeded();
  const meshScreenshotPath = testInfo.outputPath('lafea3-sample-generated-t6-mesh.png');
  await viewport.screenshot({ path: meshScreenshotPath });
  await testInfo.attach('LAFEA.3-sample-generated-t6-mesh', {
    path: meshScreenshotPath,
    contentType: 'image/png',
  });

  const run = workbench.locator('[data-role="lafea-overview-run"]');
  await expect(run).toBeDisabled();
  const preflight = workbench.locator('[data-role="lafea-discretization-advance"]');
  await expect(preflight).toBeVisible();
  await expect(preflight).toBeEnabled();
  await expect(preflight).toHaveText('Advance to numerical preflight');
  await preflight.click();

  await expect.poll(() => page.evaluate(() =>
    globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
      .stages['LAFEA.3'].preparationProjection?.state ?? null,
  )).toBe('CURRENT_PASS');

  const preflightEvidence = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.3'];
    const evidence = stage.retainedContinuumPreflightEvidence;
    return {
      preparationState: stage.preparationProjection.state,
      authorizationState: stage.orchestration.sections.AUTHORIZATION.state,
      evidenceHash: stage.preparationProjection.evidenceHash,
      meshHash: evidence?.meshHash ?? null,
      meshProfileHash: evidence?.meshProfileHash ?? null,
      solverModelHash: evidence?.solverModelHash ?? null,
      topologyQualificationHash: evidence?.topologyQualificationHash ?? null,
      highOrderJacobianQualificationHash: evidence?.highOrderJacobianQualificationHash ?? null,
      status: evidence?.status ?? null,
      solverExecuted: evidence?.solverExecuted ?? null,
      executionAuthorized: evidence?.executionAuthorized ?? null,
      releaseQualified: evidence?.releaseQualified ?? null,
    };
  });
  expect(preflightEvidence.preparationState).toBe('CURRENT_PASS');
  expect(preflightEvidence.authorizationState).toBe('READY');
  expect(preflightEvidence.evidenceHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(preflightEvidence.meshHash).toBe(retained.meshHash);
  expect(preflightEvidence.meshProfileHash).toBe(retained.meshProfileHash);
  expect(preflightEvidence.solverModelHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(preflightEvidence.topologyQualificationHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(preflightEvidence.highOrderJacobianQualificationHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(preflightEvidence.status).toBe('PASS');
  expect(preflightEvidence.solverExecuted).toBe(false);
  expect(preflightEvidence.executionAuthorized).toBe(true);
  expect(preflightEvidence.releaseQualified).toBe(false);

  await expect(run).toBeEnabled();
  await run.click();
  await expect.poll(() => page.evaluate(() =>
    globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
      .stages['LAFEA.3'].execution?.status ?? null,
  )).toBe('QUALIFIED');

  const executed = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.3'];
    const execution = stage.execution;
    return {
      workbenchStatus: globalThis.AnalysisWorkspace.getLafeaWorkbenchState().status,
      route: execution.route,
      meshHash: execution.meshHash,
      meshProfileHash: execution.meshProfileHash,
      solverModelHash: execution.solverModelHash,
      compiledExecutionHash: execution.compiledExecutionHash,
      qualification: execution.result?.qualification?.state ?? null,
      loadCaseCount: execution.result?.loadCaseResults?.length ?? 0,
      finiteEnergy: (execution.result?.loadCaseResults ?? []).every(
        (row) => Number.isFinite(row.totalStrainEnergy),
      ),
      displacementRecovered: (execution.result?.loadCaseResults ?? []).every(
        (row) => Array.isArray(row.nodalDisplacements) && row.nodalDisplacements.length > 0,
      ),
      calculationState: stage.lifecycleReadiness.calculationState,
      resultReady: stage.lifecycleReadiness.resultReady,
      lifecycleMeshHash: stage.lifecycle.artifacts.ANALYSIS_MESH?.artifactHash ?? null,
      lifecycleExecutionHash: stage.lifecycle.artifacts.EXECUTION?.artifactHash ?? null,
      lifecycleRecoveryState: stage.lifecycle.artifacts.RECOVERY?.status ?? null,
      lifecycleRecoveryQualification: stage.lifecycle.artifacts.RECOVERY?.qualification ?? null,
    };
  });
  expect(executed.workbenchStatus).not.toBe('FAILED');
  expect(executed.route).toBe('DOMAIN_FIRST_COMPILED_SOLVER_MODEL');
  expect(executed.meshHash).toBe(retained.meshHash);
  expect(executed.meshProfileHash).toBe(retained.meshProfileHash);
  expect(executed.solverModelHash).toBe(preflightEvidence.solverModelHash);
  expect(executed.compiledExecutionHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(executed.qualification).toBe('ACCEPTED');
  expect(executed.loadCaseCount).toBe(2);
  expect(executed.finiteEnergy).toBe(true);
  expect(executed.displacementRecovered).toBe(true);
  expect(executed.calculationState).toBe('CALCULATION_ACCEPTED_BY_STAGE_CONTRACT');
  expect(executed.resultReady).toBe(true);
  expect(executed.lifecycleMeshHash).toBe(retained.meshHash);
  expect(executed.lifecycleExecutionHash).toBe(executed.compiledExecutionHash);
  expect(executed.lifecycleRecoveryState).toBe('CURRENT');
  expect(executed.lifecycleRecoveryQualification).toBe('PASS');

  const results = workbench.locator('[data-guided-target="results"]');
  const resultHighlights = results.locator('[data-role="lafea-result-highlights"]');
  await expect(resultHighlights).toBeVisible();
  await expect(resultHighlights).toContainText('Max displacement');
  await expect(resultHighlights).toContainText('Max von Mises');

  const resultScreenshotPath = testInfo.outputPath('lafea3-sample-results.png');
  await resultHighlights.screenshot({ path: resultScreenshotPath });
  await testInfo.attach('LAFEA.3-sample-results', {
    path: resultScreenshotPath,
    contentType: 'image/png',
  });
});
