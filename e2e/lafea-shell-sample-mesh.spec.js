import { expect, test } from '@playwright/test';

const SHELL_ROUTE = 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL';

test('production LAFEA.4 and LAFEA.5 Sample retained mesh is the authoritative solve mesh', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(workbench).toBeVisible();

  for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
    await workbench.locator(`.lafea-workbench__stages [data-stage-id="${stageId}"]`).click();
    await workbench.locator('[data-role="lafea-mock"]').click();
    await expect(workbench.locator('.lafea-workbench__status')).toHaveText('READY');

    const source = await page.evaluate((id) => {
      const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[id];
      return id === 'LAFEA.4'
        ? {
          modelIdentity: stage.document.modelIdentity,
          nodeCount: stage.document.nodes.length,
          elementCount: stage.document.elements.length,
          parentSchema: stage.retainedShellMidsurfaceEvidence?.schema ?? null,
          parentKind: stage.retainedShellMidsurfaceEvidence?.geometry?.surface?.kind ?? null,
          parentRadius: stage.retainedShellMidsurfaceEvidence?.geometry?.surface?.radius ?? null,
          domainFirst: stage.domainFirstProfileActive,
          shellParentActive: stage.shellMidsurfaceProfileActive,
        }
        : {
          workflowIdentity: stage.document.workflowIdentity,
          nodeCount: stage.document.shellTemplate.nodes.length,
          elementCount: stage.document.shellTemplate.elements.length,
          parentSchema: stage.retainedShellMidsurfaceEvidence?.schema ?? null,
          domainFirst: stage.domainFirstProfileActive,
          shellParentActive: stage.shellMidsurfaceProfileActive,
        };
    }, stageId);

    if (stageId === 'LAFEA.4') {
      expect(source).toMatchObject({
        modelIdentity: 'CYLINDRICAL_PIPE_SHELL_BENCHMARK',
        nodeCount: 26,
        elementCount: 24,
        parentKind: 'CYLINDER',
        parentRadius: 100,
        domainFirst: false,
        shellParentActive: true,
      });
    } else {
      expect(source).toMatchObject({
        workflowIdentity: 'TRUNNION-WORKFLOW-1',
        nodeCount: 24,
        elementCount: 24,
        parentSchema: 'lafea5-source-shell-parent/v1',
        domainFirst: false,
        shellParentActive: true,
      });
    }

    const quickMesh = workbench.locator('.lafea-next-action-banner__button');
    await expect(quickMesh).toBeEnabled();
    await expect(quickMesh).toHaveText(
      stageId === 'LAFEA.4' ? 'Generate qualified mesh' : 'Adopt qualified source mesh',
    );
    await quickMesh.click();

    await expect.poll(() => page.evaluate(
      (id) => globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
        .stages[id].retainedAnalysisMeshEvidenceV2?.qualification ?? null,
      stageId,
    )).toBe('PASS');

    const retained = await page.evaluate((id) => {
      const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[id];
      const evidence = stage.retainedAnalysisMeshEvidenceV2;
      const result = {
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
        producerRef: evidence.authority.producerRef,
        nodes: evidence.mesh.nodes,
        elements: evidence.mesh.elements,
        sourceNodes: null,
        sourceElements: null,
      };
      if (id === 'LAFEA.5') {
        result.sourceNodes = stage.document.shellTemplate.nodes.map((row) => ({
          nodeId: row.nodeId,
          x: row.position[0], y: row.position[1], z: row.position[2],
        })).sort((a, b) => a.nodeId.localeCompare(b.nodeId));
        result.sourceElements = stage.document.shellTemplate.elements.map((row) => ({
          elementId: row.elementId,
          elementType: 'CST_DKT_TRI3_THIN_SHELL_V1',
          nodeIds: [...row.nodeIds],
        })).sort((a, b) => a.elementId.localeCompare(b.elementId));
      }
      return result;
    }, stageId);

    expect(retained.custody).toBe('CURRENT_PASS');
    expect(retained.orientationQualification).toBe('PASS');
    expect(retained.solverModelState).toBe('CURRENT_PASS');
    expect(retained.solverModelHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(retained.solverModelBindingHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(retained.usableForRun).toBe(true);
    expect(retained.runBlockingReasons).toEqual([]);
    expect(retained.authorizationState).toBe('READY');
    expect(retained.authorizationReasons).toEqual([]);
    expect(retained.executionActions).toContain('RUN_SOLVE');
    await expect(workbench.locator('[data-role="lafea-overview-run"]')).toBeEnabled();

    if (stageId === 'LAFEA.4') {
      expect(retained.solverMappingMode).toBe('PARAMETRIC_MIDSURFACE_UNIFORM_REGION_TRANSFER_V1');
      expect(retained.nodes.length).toBeGreaterThan(0);
      expect(retained.elements.length).toBeGreaterThan(0);
      for (const node of retained.nodes) {
        expect(Math.hypot(node.y, node.z)).toBeCloseTo(100, 8);
        expect(node.x).toBeGreaterThanOrEqual(-1e-9);
        expect(node.x).toBeLessThanOrEqual(50 + 1e-9);
      }
    } else {
      expect(retained.solverMappingMode).toBe('LOSSLESS_TRUNNION_SOURCE_SHELL_BINDING_V1');
      expect(retained.producerRef).toBe('LAFEA5_CALLER_AUTHORED_SHELL_TEMPLATE_ADOPTION_V1');
      expect(retained.nodes).toEqual(retained.sourceNodes);
      expect(retained.elements).toEqual(retained.sourceElements);
      expect(retained.nodes).toHaveLength(24);
      expect(retained.elements).toHaveLength(24);
    }

    const viewport = workbench.locator('[data-guided-target="viewport"]');
    await expect(viewport).toBeVisible();
    const retainedOverlay = viewport.locator('[data-role="lafea-retained-mesh-overlay"]');
    await expect(retainedOverlay).toBeVisible();
    await expect(retainedOverlay.locator('[data-mesh-element-id]')).toHaveCount(retained.elements.length);
    await expect(workbench.locator('[data-role="lafea-viewport-mode-panel"]')).toContainText(
      `${retained.elements.length} ELEMENTS`,
    );

    // The product-level proof is not merely that the retained mesh is visible:
    // the same meshHash must be carried through compiler, execution and lifecycle.
    await workbench.locator('[data-role="lafea-overview-run"]').click();
    await expect.poll(() => page.evaluate(
      (id) => globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
        .stages[id].execution?.status ?? null,
      stageId,
    )).toBe('QUALIFIED');

    const executed = await page.evaluate((id) => {
      const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[id];
      const execution = stage.execution;
      return {
        workbenchStatus: globalThis.AnalysisWorkspace.getLafeaWorkbenchState().status,
        route: execution.route,
        meshHash: execution.meshHash,
        solverModelHash: execution.solverModelHash,
        solverModelBindingHash: execution.solverModelBindingHash,
        executionMeshBindingHash: execution.executionMeshBindingHash,
        compiledExecutionHash: execution.compiledExecutionHash,
        resultAccepted: execution.result?.qualification?.accepted === true,
        calculationState: stage.lifecycleReadiness.calculationState,
        resultReady: stage.lifecycleReadiness.resultReady,
        lifecycleMeshHash: stage.lifecycle.artifacts.ANALYSIS_MESH?.artifactHash ?? null,
        lifecycleExecutionHash: stage.lifecycle.artifacts.EXECUTION?.artifactHash ?? null,
        lifecycleRecoveryState: stage.lifecycle.artifacts.RECOVERY?.status ?? null,
        lifecycleRecoveryQualification: stage.lifecycle.artifacts.RECOVERY?.qualification ?? null,
        orchestrationExecutionState: stage.orchestration.sections.EXECUTION.state,
        orchestrationResultsState: stage.orchestration.sections.RESULTS.state,
      };
    }, stageId);

    expect(executed.workbenchStatus).not.toBe('FAILED');
    expect(executed.route).toBe(SHELL_ROUTE);
    expect(executed.meshHash).toBe(retained.meshHash);
    expect(executed.solverModelHash).toBe(retained.solverModelHash);
    expect(executed.solverModelBindingHash).toBe(retained.solverModelBindingHash);
    expect(executed.executionMeshBindingHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(executed.compiledExecutionHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(executed.resultAccepted).toBe(true);
    expect(executed.lifecycleMeshHash).toBe(retained.meshHash);
    expect(executed.lifecycleExecutionHash).toBe(executed.compiledExecutionHash);
    expect(executed.lifecycleRecoveryState).toBe('CURRENT');
    expect(executed.lifecycleRecoveryQualification).toBe('PASS');
    expect(executed.calculationState).toBe('CALCULATION_ACCEPTED_BY_STAGE_CONTRACT');
    expect(executed.resultReady).toBe(true);
    expect(executed.orchestrationExecutionState).toBe('COMPLETE');
    expect(executed.orchestrationResultsState).toBe('COMPLETE');

    await viewport.scrollIntoViewIfNeeded();
    const screenshotPath = testInfo.outputPath(`${stageId.replace('.', '').toLowerCase()}-sample-mesh.png`);
    await viewport.screenshot({ path: screenshotPath });
    await testInfo.attach(`${stageId}-sample-mesh`, { path: screenshotPath, contentType: 'image/png' });
  }
});
