import { expect, test } from '@playwright/test';
import { destroyStage17, mountStage17 } from './helpers/lafea-stage17-playwright.js';

test('A17 golden: source → mesh → authorize → solve → verify → compare → dossier', async ({ page }) => {
  const initial = await mountStage17(page, { buildSha: 'a'.repeat(40), targetElementLength: 25 });
  expect(initial.lifecycleBinding).toBe('CURRENT');
  expect(initial.meshState).toBe('CURRENT_PASS');
  expect(initial.releaseState).toBe('RELEASE_NOT_QUALIFIED');

  const result = await page.evaluate(() => {
    const { controller, api } = globalThis.__A17__;
    api.authorizeAndRun(controller);
    const first = controller.listRunHistory().at(-1);
    api.refineAndRun(controller, 12.5);
    const second = controller.listRunHistory().at(-1);
    api.refineAndRun(controller, 6.25);
    const third = controller.listRunHistory().at(-1);
    const convergence = api.evaluateHistoryEnergyConvergence(
      controller, [first.runId, second.runId, third.runId], [25, 12.5, 6.25],
    );
    const retainedVerification = api.retainVerificationDiagnostic(controller, convergence);
    const verifiedSnapshot = controller.captureCurrentRunEvidence();
    const comparison = controller.compareRunHistoryEntries(first.runId, third.runId);
    const dossier = controller.createRunEvidenceDossier(verifiedSnapshot.runId);
    const stage = controller.getState().stages['LAFEA.3'];
    return {
      historyCount: controller.listRunHistory().length,
      executionStatus: stage.execution?.status ?? null,
      resultReady: stage.lifecycleReadiness.resultReady,
      releaseState: stage.lifecycleReadiness.releaseState,
      convergenceStatus: convergence.status,
      convergenceReasons: convergence.reasons,
      verificationBinding: retainedVerification?.projection?.bindingStatus ?? 'NOT_RETAINED_PASS',
      comparisonStatus: comparison.status,
      comparisonHasEnergy: comparison.quantities.some((row) => row.quantityId === 'TOTAL_STRAIN_ENERGY'),
      dossierCustody: dossier.calculationIdentity.custody,
      dossierTraceCount: dossier.trace.length,
      dossierReleaseQualified: dossier.release.releaseQualified,
      dossierPromotesRelease: dossier.release.currentReleaseAuthorityGrantedByDossier,
    };
  });

  expect(result.executionStatus).toBe('QUALIFIED');
  expect(result.resultReady).toBe(true);
  expect(['PASS', 'BLOCKED']).toContain(result.convergenceStatus);
  expect(result.comparisonStatus).not.toBe('NON_COMPARABLE');
  expect(result.comparisonHasEnergy).toBe(true);
  expect(result.dossierCustody).toBe('CURRENT_RUN_SNAPSHOT');
  expect(result.dossierTraceCount).toBeGreaterThan(5);
  expect(result.dossierReleaseQualified).toBe(false);
  expect(result.dossierPromotesRelease).toBe(false);
  expect(result.releaseState).toBe('RELEASE_NOT_QUALIFIED');
  await destroyStage17(page);
});

test('A17 failure: stale source/profile revokes current solve and mesh authority', async ({ page }) => {
  await mountStage17(page);
  const result = await page.evaluate(() => {
    const { controller, api } = globalThis.__A17__;
    api.authorizeAndRun(controller);
    const historic = controller.listRunHistory()[0];
    api.changeSourceMaterial(controller);
    const afterSource = controller.getState().stages['LAFEA.3'];
    controller.bindAnalysisMeshProfile(api.meshProfile(30));
    const afterProfile = controller.getState().stages['LAFEA.3'];
    return {
      historicRunStillPresent: controller.getRunHistoryEntry(historic.runId).runId === historic.runId,
      sourceExecution: afterSource.execution,
      sourceAuthorization: afterSource.orchestration.sections.AUTHORIZATION.state,
      profileMeshEvidence: controller.selectRetainedAnalysisMeshEvidenceV2(),
      profileRelease: afterProfile.lifecycleReadiness.releaseState,
    };
  });
  expect(result.historicRunStillPresent).toBe(true);
  expect(result.sourceExecution).toBeNull();
  expect(result.sourceAuthorization).toBe('BLOCKED');
  expect(result.profileMeshEvidence).toBeNull();
  expect(result.profileRelease).toBe('RELEASE_NOT_QUALIFIED');
  await destroyStage17(page);
});

test('A17 failure: conflicting current mesh evidence is rejected', async ({ page }) => {
  await mountStage17(page);
  const result = await page.evaluate(() => {
    const { controller } = globalThis.__A17__;
    const original = structuredClone(controller.selectRetainedAnalysisMeshEvidenceV2());
    const firstId = original.mesh.elements[0].elementId;
    controller.refineAnalysisMesh({
      commandId: 'A17-CONFLICT-REFINE', targetType: 'ELEMENT', targetIds: [firstId],
      targetElementLength: 12.5, lengthUnit: 'mm', reason: 'A17 conflict fixture',
    });
    let code = null;
    try { controller.store.recoverAnalysisMeshEvidenceV2(original); } catch (error) { code = error.code; }
    return { code, release: controller.getState().stages['LAFEA.3'].lifecycleReadiness.releaseState };
  });
  expect(result.code).toBe('LAFEA_ANALYSIS_MESH_V2_RECOVERY_CONFLICTING_REPLAY');
  expect(result.release).toBe('RELEASE_NOT_QUALIFIED');
  await destroyStage17(page);
});

test('A17 failure: build/head mismatch remains explicit and cannot qualify release', async ({ page }) => {
  await mountStage17(page, { buildSha: 'a'.repeat(40) });
  const result = await page.evaluate(async () => {
    const { controller, api } = globalThis.__A17__;
    api.authorizeAndRun(controller);
    const left = controller.getRunHistoryEntry(controller.listRunHistory()[0].runId);
    const otherRoot = document.createElement('main'); document.body.append(otherRoot);
    const other = api.mountQualifiedLafea3(otherRoot, { buildSha: 'b'.repeat(40) });
    api.authorizeAndRun(other.controller);
    const right = other.controller.getRunHistoryEntry(other.controller.listRunHistory()[0].runId);
    const { compareLafeaRunHistoryEntries } = await import('/src/workspace/lafea-run-comparison.js');
    const comparison = compareLafeaRunHistoryEntries(left, right);
    const dossier = other.controller.createRunEvidenceDossier(right.runId);
    other.controller.destroy();
    return {
      sameBuild: comparison.identity.build.same,
      leftBuild: comparison.identity.build.left,
      rightBuild: comparison.identity.build.right,
      releaseQualified: dossier.release.releaseQualified,
      promotesRelease: dossier.release.currentReleaseAuthorityGrantedByDossier,
    };
  });
  expect(result.sameBuild).toBe(false);
  expect(result.leftBuild).not.toBe(result.rightBuild);
  expect(result.releaseQualified).toBe(false);
  expect(result.promotesRelease).toBe(false);
  await destroyStage17(page);
});

test('A17 failure: stale mesh after profile replacement revokes execution', async ({ page }) => {
  await mountStage17(page);
  const result = await page.evaluate(() => {
    const { controller, api } = globalThis.__A17__;
    api.authorizeAndRun(controller);
    const oldMesh = controller.listRunHistory()[0].meshHash;
    controller.bindAnalysisMeshProfile(api.meshProfile(30));
    const stage = controller.getState().stages['LAFEA.3'];
    return {
      oldMesh,
      retainedMesh: controller.selectRetainedAnalysisMeshEvidenceV2(),
      execution: stage.execution,
      authorization: stage.orchestration.sections.AUTHORIZATION.state,
      release: stage.lifecycleReadiness.releaseState,
    };
  });
  expect(result.oldMesh).toMatch(/^sha256:/);
  expect(result.retainedMesh).toBeNull();
  expect(result.execution).toBeNull();
  expect(result.authorization).toBe('BLOCKED');
  expect(result.release).toBe('RELEASE_NOT_QUALIFIED');
  await destroyStage17(page);
});

test('A17 failure: selecting historic run cannot promote current authority', async ({ page }) => {
  await mountStage17(page);
  const result = await page.evaluate(() => {
    const { controller, api } = globalThis.__A17__;
    api.authorizeAndRun(controller);
    const first = controller.listRunHistory()[0];
    api.refineAndRun(controller, 12.5);
    const currentBefore = controller.getState().stages['LAFEA.3'];
    const before = {
      sourceHash: currentBefore.sourceAuthority.sourceHash,
      meshHash: currentBefore.analysisMeshCustodyProjection.meshHash,
      executionHash: currentBefore.execution.compiledExecutionHash,
      release: currentBefore.lifecycleReadiness.releaseState,
    };
    const historic = controller.getRunHistoryEntry(first.runId);
    const dossier = controller.createRunEvidenceDossier(first.runId);
    const currentAfter = controller.getState().stages['LAFEA.3'];
    const after = {
      sourceHash: currentAfter.sourceAuthority.sourceHash,
      meshHash: currentAfter.analysisMeshCustodyProjection.meshHash,
      executionHash: currentAfter.execution.compiledExecutionHash,
      release: currentAfter.lifecycleReadiness.releaseState,
    };
    return {
      historicRunId: historic.runId, before, after,
      dossierCustody: dossier.calculationIdentity.custody,
      dossierPromotesRelease: dossier.release.currentReleaseAuthorityGrantedByDossier,
    };
  });
  expect(result.historicRunId).toBeTruthy();
  expect(result.after).toEqual(result.before);
  expect(result.dossierCustody).toBe('HISTORIC_RUN_SNAPSHOT');
  expect(result.dossierPromotesRelease).toBe(false);
  await destroyStage17(page);
});
