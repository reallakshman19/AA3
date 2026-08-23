import { expect, test } from '@playwright/test';
import { destroyStage17, mountStage17 } from './helpers/lafea-stage17-playwright.js';

test('A17 failure: blocked T6 geometry qualification remains blocked', async ({ page }) => {
  await page.goto('/lafea.html');
  const result = await page.evaluate(async () => {
    const [{ generateLafeaLugPinholeT6Mesh }, qualification, custody, t6State, meshEvidence] = await Promise.all([
      import('/src/core/lafea-meshing/lug-pinhole-t6.js'),
      import('/src/workspace/lafea-bucket-01-mesh-qualification.js'),
      import('/src/workspace/lafea-t6-geometry-qualification-custody.js'),
      import('/src/workspace/lafea-t6-geometry-qualification-state.js'),
      import('/src/workspace/lafea-analysis-mesh-evidence.js'),
    ]);
    const HEAD = 'a'.repeat(40);
    const meshPackage = generateLafeaLugPinholeT6Mesh({
      schema: 'lafea-lug-pinhole-t6-mesh-spec/v1', meshIdentity: 'A17-BLOCKED-T6',
      center: { x: 2, y: -1 }, holeRadius: 1, outerRadius: 3,
      radialDivisions: 2, circumferentialDivisions: 16, startAngleDegrees: 11,
    });
    const evidence = qualification.qualifyLafeaBucket01Mesh({
      schema: qualification.LAFEA_BUCKET_01_MESH_QUALIFICATION_INPUT_SCHEMA,
      exactHeadSha: HEAD, meshPackageHash: `sha256:${'2'.repeat(64)}`,
      qualificationProfileHash: `sha256:${'f'.repeat(64)}`, meshPackage,
      tolerances: {
        areaRelative: 1e-20, holeRadiusRelative: 0.001, holeCenterOverRadius: 1e-12,
        criticalLigamentRelative: 0.0025, perimeterRelative: 0.001,
        boundaryDeviationOverRadius: 0.001, midsideOverReference: 1e-12,
        rotationalSymmetryOverReference: 1e-12, duplicateNodeDistance: 1e-12,
      },
    });
    const state = t6State.createLafeaT6GeometryQualificationState(['LAFEA.3'], { currentCandidateHeadSha: HEAD });
    const stage = {
      stageId: 'LAFEA.3', domainFirstProfileActive: false, shellMidsurfaceProfileActive: false,
      analysisMeshCustodyProjection: { canView: true, state: 'CURRENT_PASS' },
      retainedAnalysisMeshEvidence: {
        mesh: meshPackage.mesh,
        meshHash: meshEvidence.lafeaAnalysisMeshContentHash(meshPackage.mesh),
      },
    };
    const registered = state.register({
      schema: custody.LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA,
      stageId: 'LAFEA.3', evidence, meshPackage,
    }, stage);
    return { evidenceStatus: evidence.status, projection: registered.projection };
  });
  expect(result.evidenceStatus).toBe('BLOCKED');
  expect(result.projection.state).toBe('CURRENT_BLOCK');
  expect(result.projection.releaseQualified).toBe(false);
});

test('A17 failure: near-zero convergence is explicit and not relative-GCI qualified', async ({ page }) => {
  await page.goto('/lafea.html');
  const result = await page.evaluate(async () => {
    const { evaluateLafeaBucket01Convergence, LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA } = await import('/src/workspace/lafea-bucket-01-convergence.js');
    return evaluateLafeaBucket01Convergence({
      schema: LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA,
      quantityId: 'SIGMA_YY', samplingAuthority: 'FIXED_PHYSICAL_PROBE',
      locationId: 'A17-NEAR-ZERO', locationDefinitionHash: `sha256:${'b'.repeat(64)}`,
      units: 'MPa', meshSizes: [0.4, 0.2, 0.1], observations: [4, 1, 0.25e-12],
      gciTolerance: 0.005, minimumObservedOrder: 1.5,
      asymptoticRatioBounds: { minimum: 0.85, maximum: 1.15 },
    });
  });
  expect(result.status).toBe('BLOCKED');
  expect(result.fineGridGci).toBeNull();
  expect(result.reasons).toContain('FINE_OBSERVATION_NEAR_ZERO_FOR_RELATIVE_GCI');
});

test('A17 failure: failed solve cannot create current result or release', async ({ page }) => {
  await mountStage17(page, { unstable: true });
  const result = await page.evaluate(() => {
    const { controller } = globalThis.__A17__;
    let preflight = 'PASS';
    try { controller.store.prepareContinuumForRun(); } catch (error) { preflight = error.code ?? 'BLOCKED'; }
    const state = preflight === 'PASS' ? controller.run() : controller.getState();
    const stage = state.stages['LAFEA.3'];
    return {
      preflight,
      stateStatus: state.status,
      executionStatus: stage.execution?.status ?? null,
      resultReady: stage.lifecycleReadiness.resultReady,
      release: stage.lifecycleReadiness.releaseState,
      historyCount: controller.listRunHistory().length,
    };
  });
  expect(result.executionStatus).not.toBe('QUALIFIED');
  expect(result.resultReady).toBe(false);
  expect(result.release).toBe('RELEASE_NOT_QUALIFIED');
  expect(result.historyCount).toBe(0);
  await destroyStage17(page);
});

test('A17 failure: visible preflight veto is diagnostic, non-mutating and non-throwing', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await mountStage17(page, { includeTemperature: true });

  const root = page.locator('#a17-root');
  const before = await page.evaluate(() => {
    const stage = globalThis.__A17__.controller.getState().stages['LAFEA.3'];
    return {
      meshHash: stage.retainedAnalysisMeshEvidenceV2.meshHash,
      artifactHash: stage.retainedAnalysisMeshEvidenceV2.artifactHash,
      preflight: stage.retainedContinuumPreflightEvidence,
    };
  });
  expect(before.preflight).toBeNull();

  const advance = root.locator('[data-role="lafea-discretization-advance"]');
  await expect(advance).toBeVisible();
  await expect(advance).toBeEnabled();
  await expect(advance).toHaveText('Advance to numerical preflight');
  await advance.click();

  const solve = root.locator('[data-role="lafea-solve-readiness"]');
  await expect(solve).toBeVisible();
  await expect(root.locator('[data-role="lafea-solve-readiness-primary"]'))
    .toContainText(/temperature semantics not qualified/i);
  const solveEvidence = root.locator('[data-role="lafea-solve-readiness-evidence"]');
  await expect(solveEvidence).not.toHaveAttribute('open', '');
  await solveEvidence.locator('summary').click();
  const diagnostics = solveEvidence.locator('[data-role="lafea-diagnostics"]');
  await expect(diagnostics).toBeVisible();
  await expect(diagnostics).toContainText(
    'LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED',
  );
  await expect(root.locator('[data-role="lafea-overview-run"]')).toBeDisabled();

  const after = await page.evaluate(() => {
    const state = globalThis.__A17__.controller.getState();
    const stage = state.stages['LAFEA.3'];
    return {
      status: state.status,
      diagnosticCode: state.diagnostics[0]?.code ?? null,
      meshHash: stage.retainedAnalysisMeshEvidenceV2.meshHash,
      artifactHash: stage.retainedAnalysisMeshEvidenceV2.artifactHash,
      preflight: stage.retainedContinuumPreflightEvidence,
      execution: stage.execution,
      resultReady: stage.lifecycleReadiness.resultReady,
      release: stage.lifecycleReadiness.releaseState,
    };
  });
  expect(after.status).toBe('FAILED');
  expect(after.diagnosticCode).toBe(
    'LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED',
  );
  expect(after.meshHash).toBe(before.meshHash);
  expect(after.artifactHash).toBe(before.artifactHash);
  expect(after.preflight).toBeNull();
  expect(after.execution).toBeNull();
  expect(after.resultReady).toBe(false);
  expect(after.release).toBe('RELEASE_NOT_QUALIFIED');
  expect(pageErrors).toEqual([]);
  await destroyStage17(page);
});

test('A17 failure: stale verification is retained only as stale evidence', async ({ page }) => {
  await mountStage17(page);
  const result = await page.evaluate(async () => {
    const { controller, api } = globalThis.__A17__;
    api.authorizeAndRun(controller);
    const { evaluateLafeaBucket01Convergence, LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA } = await import('/src/workspace/lafea-bucket-01-convergence.js');
    const evidence = evaluateLafeaBucket01Convergence({
      schema: LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA,
      quantityId: 'SIGMA_YY', samplingAuthority: 'FIXED_PHYSICAL_PROBE',
      locationId: 'A17-STALE-VERIFY', locationDefinitionHash: `sha256:${'c'.repeat(64)}`,
      units: 'MPa', meshSizes: [0.4, 0.2, 0.1], observations: [4e-12, 1e-12, 0.25e-12],
      gciTolerance: 0.005, minimumObservedOrder: 1.5,
      asymptoticRatioBounds: { minimum: 0.85, maximum: 1.15 },
    });
    const registered = api.retainVerificationDiagnostic(controller, evidence);
    api.changeSourceMaterial(controller);
    const projection = controller.buildNumericalVerificationProjection('LAFEA.3');
    return {
      before: registered.projection.bindingStatus,
      after: projection.bindingStatus,
      reasons: projection.reasons,
      release: controller.getState().stages['LAFEA.3'].lifecycleReadiness.releaseState,
    };
  });
  expect(result.before).toBe('DIAGNOSTIC');
  expect(result.after).toBe('STALE');
  expect(result.reasons.some((reason) => reason.includes('STALE'))).toBe(true);
  expect(result.release).toBe('RELEASE_NOT_QUALIFIED');
  await destroyStage17(page);
});

test('A17 failure: invalid release record is rejected fail closed', async ({ page }) => {
  await mountStage17(page);
  const result = await page.evaluate(() => {
    const { controller } = globalThis.__A17__;
    let code = null;
    try { controller.registerTemplateReleaseRecord({ schema: 'invalid-release' }, 'LAFEA.3'); }
    catch (error) { code = error.code ?? error.message; }
    const release = controller.buildReleaseBindingProjection('LAFEA.3');
    return { code, release };
  });
  expect(result.code).toBeTruthy();
  expect(result.release.bindingStatus).toBe('ABSENT');
  expect(result.release.releaseQualified).toBe(false);
  await destroyStage17(page);
});
