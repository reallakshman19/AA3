import { expect, test } from '@playwright/test';

test('LAFEA.3 Sample generates and displays the retained T6 mesh before solve', async ({ page }, testInfo) => {
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
      meshHash: evidence.meshHash,
      qualification: evidence.qualification,
      nodeCount: evidence.mesh.nodes.length,
      elementCount: evidence.mesh.elements.length,
      elementTypes: [...new Set(evidence.mesh.elements.map((row) => row.elementType))],
      warningCount: evidence.quality.warningElementIds.length,
      blockingCount: evidence.quality.blockingElementIds.length,
      characteristicLengthMax: stage.lastAnalysisMeshPlan?.characteristicLengthMax ?? null,
      resourceDisposition: stage.lastAnalysisMeshPlan?.resourceDisposition ?? null,
    };
  });
  expect(['CURRENT_PASS', 'CURRENT_WARNING']).toContain(retained.custody);
  expect(retained.canView).toBe(true);
  expect(retained.qualification).toBe('PASS');
  expect(retained.meshHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(retained.nodeCount).toBeGreaterThan(0);
  expect(retained.elementCount).toBeGreaterThan(0);
  expect(retained.elementTypes).toEqual(['T6']);
  expect(retained.blockingCount).toBe(0);
  expect(retained.resourceDisposition).not.toBe('BLOCK');
  expect(retained.characteristicLengthMax).toBeLessThanOrEqual(30 + 1e-9);

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
  const screenshotPath = testInfo.outputPath('lafea3-sample-generated-t6-mesh.png');
  await viewport.screenshot({ path: screenshotPath });
  await testInfo.attach('LAFEA.3-sample-generated-t6-mesh', {
    path: screenshotPath,
    contentType: 'image/png',
  });
});
