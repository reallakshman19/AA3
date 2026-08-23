import { expect, test } from '@playwright/test';

test('LAFEA.5 source adoption derives profile reference without an editable pseudo-input', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('.lafea-workbench__stages [data-stage-id="LAFEA.5"]').click();
  await workbench.locator('[data-role="lafea-mock"]').click();
  await expect(workbench.locator('.lafea-workbench__status')).toHaveText('READY');

  const profileBinding = workbench.locator('[data-role="lafea-mesh-profile-binding"]');
  await expect(profileBinding).toBeVisible();
  await expect(profileBinding).toContainText('Adoption profile');
  await expect(profileBinding.getByText('Quality-profile reference length')).toHaveCount(0);
  await expect(profileBinding.locator('[data-role="lafea-profile-target-length"]')).toHaveCount(0);

  const referenceEvidence = profileBinding.locator(
    '[data-role="lafea-source-profile-reference-evidence"]',
  );
  await expect(referenceEvidence).toBeVisible();
  await expect(referenceEvidence).toContainText('Source-derived profile reference');
  await expect(referenceEvidence).toContainText('Median unique source-edge length');
  await expect(referenceEvidence).toContainText('not a remesh target');

  await profileBinding.locator('[data-role="lafea-profile-bind"]').click();

  const bound = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.5'];
    const parent = stage.retainedShellMidsurfaceEvidence;
    const nodeById = new Map(parent.mesh.nodes.map((row) => [row.nodeId, row]));
    const edges = new Set();
    for (const element of parent.mesh.elements) {
      const ids = element.nodeIds;
      for (const [left, right] of [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]]) {
        edges.add(left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`);
      }
    }
    const lengths = [...edges].map((key) => {
      const [leftId, rightId] = key.split('\u0000');
      const left = nodeById.get(leftId);
      const right = nodeById.get(rightId);
      return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
    }).sort((a, b) => a - b);
    const middle = Math.floor(lengths.length / 2);
    const expectedReference = lengths.length % 2
      ? lengths[middle]
      : (lengths[middle - 1] + lengths[middle]) / 2;
    return {
      expectedReference,
      boundReference: stage.retainedAnalysisMeshProfile?.fields?.globalTargetSize ?? null,
      profileHash: stage.retainedAnalysisMeshProfile?.semanticHash ?? null,
      sourceNodeCount: parent.mesh.nodes.length,
      sourceElementCount: parent.mesh.elements.length,
    };
  });
  expect(bound.boundReference).toBe(bound.expectedReference);
  expect(bound.profileHash).toMatch(/^fnv1a64:[0-9a-f]{16}$/);

  const generate = workbench.locator('[data-role="lafea-generation-generate"]');
  await expect(generate).toBeVisible();
  await expect(generate).toBeEnabled();
  await expect(generate).toHaveText('Adopt and retain source mesh');
  await generate.click();

  await expect.poll(() => page.evaluate(() =>
    globalThis.AnalysisWorkspace.getLafeaWorkbenchState()
      .stages['LAFEA.5'].retainedAnalysisMeshEvidenceV2?.qualification ?? null,
  )).toBe('PASS');

  const adopted = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.5'];
    return {
      nodes: stage.retainedAnalysisMeshEvidenceV2.mesh.nodes,
      elements: stage.retainedAnalysisMeshEvidenceV2.mesh.elements,
      sourceNodes: stage.retainedShellMidsurfaceEvidence.mesh.nodes,
      sourceElements: stage.retainedShellMidsurfaceEvidence.mesh.elements,
      plan: stage.lastAnalysisMeshPlan,
    };
  });
  expect(adopted.nodes).toEqual(adopted.sourceNodes);
  expect(adopted.elements).toEqual(adopted.sourceElements);
  expect(adopted.nodes).toHaveLength(bound.sourceNodeCount);
  expect(adopted.elements).toHaveLength(bound.sourceElementCount);
  expect(adopted.plan.generationMode).toBe('SOURCE_MESH_ADOPTION');
  expect(adopted.plan.characteristicLengthMin).toBeNull();
  expect(adopted.plan.characteristicLengthMedian).toBeNull();
  expect(adopted.plan.characteristicLengthMax).toBeNull();
});
