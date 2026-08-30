#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  MODEL_SCHEMA,
  QUALIFICATION_PROFILE,
} from '../src/core/local-continuum/index.js';
import {
  PROFILE_KINDS,
  canonicalProfile,
  defaultProfileFields,
  qualifiedMeshQualityPolicyForStage,
} from '../src/core/lafea-profile-contract/index.js';
import {
  createLafeaContinuumConvergenceStudyDefinition,
  deriveLafeaContinuumConvergenceMeshProfile,
} from '../src/workspace/lafea-continuum-convergence-study.js';
import { LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA } from '../src/workspace/lafea-continuum-geometry-intake.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';
import { createBm005AuditReport } from './lafea.3-bm005-report-contract.mjs';

const STAGE_ID = 'LAFEA.3';
const CHECK_ID = 'lafea.3-bm005-ordinary-route';
const benchmarkDefinition = readJson(
  '../validation/lafea-benchmark-data/BM005/benchmark.json',
);
const oracleSourceRegistry = readJson(
  '../validation/lafea-benchmark-data/BM005/sources/source-registry.json',
);
requireFrozenDefinition(benchmarkDefinition, oracleSourceRegistry);

const source = sourceDocument(benchmarkDefinition);
const composition = requireLafeaStageComposition(STAGE_ID);
const normalizedSource = composition.normalizeDocument(source);
const authority = issueLafeaSourceAuthority(
  STAGE_ID,
  normalizedSource,
  'LAFEA3_BM005_LAME_ORDINARY_ROUTE',
);
const profile = frozenMeshProfile(benchmarkDefinition);
const store = createLafeaWorkbenchStore({
  initialStage: STAGE_ID,
  initialDocument: normalizedSource,
  initialSourceHash: authority.sourceHash,
});

try {
  const registration = store.registerContinuumGeometryIntake(
    declaration(benchmarkDefinition),
  );
  assert.equal(registration.status, 'CURRENT');
  assert.equal(registration.analysisDomainProjection.state, 'CURRENT_PASS');
  assert.equal(registration.analysisGeometryProjection.state, 'CURRENT_PASS');

  store.bindAnalysisMeshProfile(profile, STAGE_ID);
  const generated = store.generateAnalysisMesh({}, STAGE_ID);
  assert.equal(generated.evidence.qualification, 'PASS');
  assert.equal(generated.summary.elementFamily, benchmarkDefinition.mesh.elementFamily);
  assert.equal(generated.summary.strategy, benchmarkDefinition.mesh.requiredStrategy);
  assert.equal(
    generated.evidence.mesh.elements.every(
      (row) => row.elementType === benchmarkDefinition.mesh.elementFamily,
    ),
    true,
  );

  const preflight = store.prepareContinuumForRun();
  assert.equal(preflight.projection.state, 'CURRENT_PASS');
  assert.equal(preflight.projection.usableForAuthorization, true);
  store.run();
  const oneMeshStage = store.getState().stages[STAGE_ID];
  assert.equal(oneMeshStage.execution.status, 'QUALIFIED');
  assert.equal(oneMeshStage.lifecycle.artifacts.RECOVERY.status, 'CURRENT');
  assert.equal(oneMeshStage.lifecycle.artifacts.RECOVERY.qualification, 'PASS');
  assert.equal(oneMeshStage.lifecycleReadiness.resultReady, false,
    'one qualified mesh must not publish LAFEA.3 Results');
  assert.ok(oneMeshStage.lifecycleReadiness.blockingReasons
    .includes('LAFEA3_CONVERGENCE_NOT_CURRENT_AND_QUALIFIED'));

  const convergence = store.runContinuumConvergenceStudy(
    convergenceRequest(benchmarkDefinition),
  );
  const publicationQualified = convergence.study.usableForResultPublication === true;
  const expectedConvergenceState = publicationQualified ? 'CURRENT_PASS' : 'CURRENT_BLOCK';
  assert.equal(convergence.status, expectedConvergenceState);
  assert.equal(convergence.projection.state, expectedConvergenceState);
  assert.equal(convergence.resultReady, publicationQualified);
  assert.equal(convergence.releaseQualified, false);

  const finalStage = store.getState().stages[STAGE_ID];
  assert.equal(
    finalStage.lifecycleReadiness.resultState,
    publicationQualified ? 'RESULT_READY' : 'RESULT_NOT_READY',
  );
  assert.equal(finalStage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');
  assert.equal(
    finalStage.lifecycle.artifacts.CONVERGENCE.status,
    publicationQualified ? 'CURRENT' : 'BLOCKED',
  );
  assert.equal(
    finalStage.lifecycle.artifacts.CONVERGENCE.qualification,
    publicationQualified ? 'PASS' : 'BLOCK',
  );
  assert.equal(finalStage.execution.runtimeSolverDiagnostics?.terminationState, 'CONVERGED');

  const meshMetadata = replayMeshMetadata(
    benchmarkDefinition,
    normalizedSource,
    authority.sourceHash,
    profile,
    convergence,
  );
  const negativeControl = runNegativeControl(
    benchmarkDefinition,
    normalizedSource,
    authority.sourceHash,
  );
  const repository = repositoryState();
  const rows = convergence.study.levels.map((row) => ({
    levelId: row.levelId,
    h: row.h,
    meshProfileHash: row.meshProfileHash,
    meshHash: row.meshHash,
    solverModelHash: row.solverModelHash,
    executionHash: row.executionHash,
    recoveryHash: row.recoveryHash,
    probeEvidenceHash: row.probeEvidenceHash,
    value: row.authoritativeValue,
    units: row.authoritativeUnits,
    meshMetadata: meshMetadata.get(row.levelId),
  }));

  const report = createBm005AuditReport({
    benchmarkDefinition,
    oracleSourceRegistry,
    candidateHeadSha: repository.head,
    cleanTree: repository.cleanTree,
    lineage: {
      sourceHash: convergence.study.sourceHash,
      analysisDomainHash: convergence.study.analysisDomainHash,
      analysisGeometryHash: convergence.study.analysisGeometryHash,
      baseMeshProfileHash: convergence.study.baseMeshProfileHash,
      convergenceDefinitionHash: convergence.study.definitionHash,
    },
    observations: rows,
    convergence: convergence.study.convergenceEvidence,
    solverDiagnostics: finalStage.execution.runtimeSolverDiagnostics,
    negativeControl,
    resultPublicationQualified: finalStage.lifecycleReadiness.resultReady,
    qualificationEvidence: {
      command: 'node scripts/lafea.3-bm005-ordinary-route-check.mjs',
      observation: 'LOCAL_EXECUTION',
      exactHead: repository.head,
      oneMeshExecutionStatus: oneMeshStage.execution.status,
      convergenceStatus: convergence.status,
      convergenceClassification: convergence.study.classification,
      finalResultState: finalStage.lifecycleReadiness.resultState,
      meshReplayCount: meshMetadata.size,
    },
    diagnostics: reportDiagnostics(finalStage, convergence),
  });
  assert.equal(report.authority.releaseQualified, false);
  assert.equal(report.authority.coreFeaCompletionProven, false);
  assert.equal(
    report.status,
    report.authority.benchmarkQualified && report.authority.resultPublicationQualified
      ? 'PASS' : 'FAIL',
  );

  console.log(JSON.stringify({
    check: CHECK_ID,
    status: report.status,
    report,
  }, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
} finally {
  store.destroy();
}

function convergenceRequest(definition) {
  const { polarCoordinate: _polar, ...probe } = definition.probe;
  return {
    schema: 'lafea-continuum-convergence-study-request/v1',
    studyId: `${definition.benchmarkId}/DISPLACEMENT-CONVERGENCE`,
    probe,
    levels: definition.mesh.levels.map((row) => ({ ...row })),
  };
}

function replayMeshMetadata(definition, normalizedSource, sourceHash, baseProfile, convergence) {
  const request = convergenceRequest(definition);
  const studyDefinition = createLafeaContinuumConvergenceStudyDefinition(request);
  const expectedByLevel = new Map(convergence.study.levels.map((row) => [row.levelId, row]));
  const metadata = new Map();
  for (const level of definition.mesh.levels) {
    const levelProfile = deriveLafeaContinuumConvergenceMeshProfile(
      baseProfile,
      studyDefinition,
      level,
    );
    const replay = createLafeaWorkbenchStore({
      initialStage: STAGE_ID,
      initialDocument: normalizedSource,
      initialSourceHash: sourceHash,
    });
    try {
      replay.registerContinuumGeometryIntake(declaration(definition));
      replay.bindAnalysisMeshProfile(levelProfile, STAGE_ID);
      const generated = replay.generateAnalysisMesh({}, STAGE_ID);
      const expected = expectedByLevel.get(level.levelId);
      assert.ok(expected, `missing convergence receipt for ${level.levelId}`);
      assert.equal(levelProfile.semanticHash, expected.meshProfileHash);
      assert.equal(generated.evidence.meshHash, expected.meshHash,
        `deterministic mesh replay mismatch at ${level.levelId}`);
      assert.equal(generated.summary.elementFamily, definition.mesh.elementFamily);
      assert.equal(generated.summary.strategy, definition.mesh.requiredStrategy);
      metadata.set(level.levelId, {
        elementFamily: generated.summary.elementFamily,
        strategy: generated.summary.strategy,
        nodeCount: generated.evidence.mesh.nodes.length,
        elementCount: generated.evidence.mesh.elements.length,
        quality: {
          status: generated.evidence.quality.worstStatus,
          warningElementCount: generated.evidence.quality.warningElementIds?.length ?? 0,
          blockingElementCount: generated.evidence.quality.blockingElementIds?.length ?? 0,
          gateResults: structuredClone(generated.evidence.quality.gateResults ?? []),
        },
      });
    } finally {
      replay.destroy();
    }
  }
  return metadata;
}

function runNegativeControl(definition, normalizedSource, sourceHash) {
  const negative = definition.negativeControl;
  const removed = new Set(negative.mutation.removeAttachmentIds);
  const attachments = definition.model.attachments.filter(
    (row) => !removed.has(row.attachmentId),
  );
  assert.equal(
    attachments.length,
    definition.model.attachments.length - removed.size,
    'negative control must remove exactly the frozen restraint attachment set',
  );
  const store = createLafeaWorkbenchStore({
    initialStage: STAGE_ID,
    initialDocument: normalizedSource,
    initialSourceHash: sourceHash,
  });
  try {
    store.registerContinuumGeometryIntake(declaration(definition, attachments));
    store.bindAnalysisMeshProfile(frozenMeshProfile(definition), STAGE_ID);
    const generated = store.generateAnalysisMesh({}, STAGE_ID);
    assert.equal(generated.evidence.qualification, 'PASS');
    let actualBoundary = 'preflight';
    let actualErrorCode = null;
    try {
      const preflight = store.prepareContinuumForRun();
      if (preflight?.projection?.state !== 'CURRENT_PASS') {
        actualErrorCode = diagnosticCode(store.getState());
      } else {
        actualBoundary = 'solver';
        store.run();
        actualErrorCode = diagnosticCode(store.getState());
      }
    } catch (error) {
      actualErrorCode = error?.code ?? error?.message ?? 'UNKNOWN_ERROR';
    }
    assert.ok(actualErrorCode, 'negative control must fail closed with a retained diagnostic');
    return {
      negativeCaseId: negative.negativeCaseId,
      actualBoundary,
      actualErrorCode,
    };
  } finally {
    store.destroy();
  }
}

function diagnosticCode(state) {
  return state?.diagnostics?.[0]?.code
    ?? state?.stages?.[STAGE_ID]?.execution?.diagnostics?.[0]?.code
    ?? null;
}

function reportDiagnostics(stage, convergence) {
  const values = [];
  if (convergence.status !== 'CURRENT_PASS') {
    values.push(...(convergence.study.publicationReasons ?? []));
  }
  if (stage.lifecycleReadiness?.resultReady !== true) {
    values.push(...(stage.lifecycleReadiness?.blockingReasons ?? []));
  }
  return [...new Set(values.map((value) => String(value)))];
}

function declaration(definition, attachments = definition.model.attachments) {
  return {
    schema: LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA,
    geometry: structuredClone(definition.model.geometry),
    applicationRef: `${definition.benchmarkId}/ORDINARY-ROUTE`,
    regionId: 'REGION-1',
    materialRef: definition.model.material.materialId,
    attachments: structuredClone(attachments),
    producerRef: `${definition.benchmarkId}/QUALIFICATION`,
    temperatureUnit: 'C',
  };
}

function frozenMeshProfile(definition) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  const policy = qualifiedMeshQualityPolicyForStage(STAGE_ID);
  if (!policy?.fields) throw new TypeError('BM005_MESH_QUALITY_POLICY_REQUIRED');
  const fields = policy.fields;
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: definition.mesh.profileIdentity,
    sourceRevision: definition.mesh.sourceRevision,
    semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: definition.mesh.elementFamily,
      globalTargetSize: definition.mesh.levels[0].h,
      adjacentSizeRatioMax: fields.adjacentSizeRatioMax,
      aspectRatioWarn: fields.aspectRatioWarn,
      aspectRatioBlock: fields.aspectRatioBlock,
      scaledJacobianWarn: fields.scaledJacobianWarn,
      scaledJacobianBlock: fields.scaledJacobianBlock,
      adaptiveLevels: fields.adaptiveLevelsMinimum,
    },
  });
}

function sourceDocument(definition) {
  const material = definition.model.material;
  const t = definition.model.thickness;
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: definition.benchmarkId,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: definition.sourceBenchmarkRef,
      sourceVersion: 'BM005-FROZEN/V1',
      adapterIdentity: 'LAFEA3_BM005_ORDINARY_ROUTE',
      adapterVersion: '1',
    },
    units: { ...definition.model.units },
    formulation: definition.model.formulation,
    materials: [{
      ...material,
      sourceReference: `${definition.sourceClaimId}/MATERIAL`,
    }],
    nodes: [
      sourceNode('A', 0, 0), sourceNode('B', 2, 0), sourceNode('C', 2, 2), sourceNode('D', 0, 2),
      sourceNode('E', 1, 0), sourceNode('F', 2, 1), sourceNode('G', 1, 2), sourceNode('H', 0, 1),
    ],
    elements: [{
      elementId: 'SOURCE-Q8-SEED',
      elementType: 'Q8',
      nodeIds: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      materialId: material.materialId,
      thickness: t,
      sourceReference: `${definition.sourceClaimId}/SOURCE-Q8-SEED`,
    }],
    elementTypePolicy: {
      allowT3Fallback: false,
      sourceReference: `${definition.sourceClaimId}/Q8_ONLY`,
    },
    constraints: [],
    loadCases: [{
      loadCaseId: definition.model.physicalCaseId,
      nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [],
      temperatureLoads: [], imposedDisplacements: [],
      sourceReference: `${definition.sourceClaimId}/CASE/${definition.model.physicalCaseId}`,
    }],
    resultRequests: { loadCaseIds: [definition.model.physicalCaseId] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: ['BM005_SOURCE_SEED_GEOMETRY_REPLACED_BY_GOVERNED_ANALYSIS_GEOMETRY'],
  };
}

function sourceNode(nodeId, x, y) {
  return { nodeId, x, y, sourceReference: `BM005_SOURCE_NODE#${nodeId}` };
}

function repositoryState() {
  const head = git(['rev-parse', 'HEAD']);
  const porcelain = git(['status', '--porcelain', '--untracked-files=no']);
  assert.match(head, /^[0-9a-f]{40}$/u);
  return { head, cleanTree: porcelain === '' };
}

function git(args) {
  return execFileSync('git', args, {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

function requireFrozenDefinition(definition, sourceRegistry) {
  assert.equal(definition.schema, 'lafea3-bm005-benchmark-definition/v1');
  assert.equal(definition.benchmarkId, 'BM-005-LAME-CONT-CYL-01');
  assert.equal(definition.stageId, STAGE_ID);
  assert.equal(definition.mesh.elementFamily, 'Q8');
  assert.equal(definition.mesh.levels.length >= 4, true);
  assert.equal(definition.mesh.requiredDistinctMeshCount, definition.mesh.levels.length);
  assert.equal(definition.freezePolicy.definitionFrozenBeforeObservations, true);
  assert.equal(definition.freezePolicy.productionOutputMayModifyOracle, false);
  assert.equal(definition.freezePolicy.productionOutputMayModifyMeshLadder, false);
  assert.equal(definition.freezePolicy.productionOutputMayModifyProbe, false);
  assert.equal(definition.freezePolicy.productionOutputMayModifyAcceptance, false);
  assert.equal(definition.acceptance.rawMeshMaximumStressMayQualifyConvergence, false);
  assert.equal(definition.acceptance.releaseQualified, false);
  assert.equal(Array.isArray(definition.limitations) && definition.limitations.length > 0, true);
  assert.equal(sourceRegistry.benchmarkId, definition.benchmarkId);
  assert.equal(sourceRegistry.oracleDerivation.productionResultUsed, false);
  assert.equal(sourceRegistry.custodyPolicy.productionOutputMayModifyOracle, false);
  assert.ok(sourceRegistry.sources.some((row) => row.role === 'independentOracle'
    && row.publisher && row.edition && row.year && row.section
    && row.pages?.length && row.equationIdentifiers?.length));
  requireConvergencePolicyBinding(definition);
  requireLameOracleReconstruction(definition);
}

function requireConvergencePolicyBinding(definition) {
  const study = createLafeaContinuumConvergenceStudyDefinition(convergenceRequest(definition));
  const actual = study.publicationPolicy;
  const frozen = definition.convergencePolicy;
  for (const key of [
    'policyId', 'revision', 'refinementRatio', 'gciSafetyFactor',
    'nearZeroAbsolute', 'orderStabilityRelativeTolerance', 'authorityBasis',
  ]) {
    assert.equal(actual[key], frozen[key], `BM-005 convergence policy drift at ${key}`);
  }
  assert.equal(
    frozen.requiredClassification,
    definition.acceptance.requireConvergenceClassification,
  );
}

function requireLameOracleReconstruction(definition) {
  const { oracle, model, probe } = definition;
  const ri = oracle.innerRadius;
  const ro = oracle.outerRadius;
  const pi = oracle.internalPressure;
  const denominator = ro ** 2 - ri ** 2;
  const a = pi * ri ** 2 / denominator;
  const b = pi * ri ** 2 * ro ** 2 / denominator;
  const r = probe.polarCoordinate.radius;
  const theta = probe.polarCoordinate.thetaDegrees * Math.PI / 180;
  const sigmaRadial = a - b / r ** 2;
  const sigmaHoop = a + b / r ** 2;
  const displacement = (
    (1 - model.material.poissonRatio) * a * r
    + (1 + model.material.poissonRatio) * b / r
  ) / model.material.elasticModulus;
  assertNearly(a, oracle.A_MPa, 1e-12, 'Lamé A');
  assertNearly(b, oracle.B_MPa_mm2, 1e-9, 'Lamé B');
  assertNearly(sigmaRadial, oracle.fixedProbeExpected.sigmaRadialMPa, 1e-12, 'probe sigma_r');
  assertNearly(sigmaHoop, oracle.fixedProbeExpected.sigmaHoopMPa, 1e-12, 'probe sigma_theta');
  assertNearly(
    displacement,
    oracle.fixedProbeExpected.displacementMagnitudeMm,
    1e-15,
    'probe displacement',
  );
  assertNearly(r * Math.cos(theta), probe.physicalCoordinate.x, 1e-12, 'probe x');
  assertNearly(r * Math.sin(theta), probe.physicalCoordinate.y, 1e-12, 'probe y');
  assertNearly(a - b / ri ** 2, oracle.boundaryExpected.sigmaRadialInnerMPa, 1e-12, 'inner sigma_r');
  assertNearly(a + b / ri ** 2, oracle.boundaryExpected.sigmaHoopInnerMPa, 1e-12, 'inner sigma_theta');
  assertNearly(a - b / ro ** 2, oracle.boundaryExpected.sigmaRadialOuterMPa, 1e-12, 'outer sigma_r');
  assertNearly(a + b / ro ** 2, oracle.boundaryExpected.sigmaHoopOuterMPa, 1e-12, 'outer sigma_theta');
}

function assertNearly(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} mismatch: expected ${expected}, reconstructed ${actual}`,
  );
}
