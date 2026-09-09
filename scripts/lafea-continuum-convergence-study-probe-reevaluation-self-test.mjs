#!/usr/bin/env node
/**
 * Regression control for the double-normalized probe bug in
 * runContinuumConvergenceStudy. createLafeaContinuumConvergenceStudyDefinition
 * normalizes the raw probe via createLafeaContinuumPhysicalProbe and stores the
 * *normalized* result (which carries an added probeIdentityHash field) as
 * definition.probe. lafea-continuum-convergence-workbench.js then fed that
 * already-normalized object straight into evaluateContinuumPhysicalProbe, which
 * re-runs createLafeaContinuumPhysicalProbe on it — but that function is not
 * idempotent (its exactKeys check rejects its own probeIdentityHash-bearing
 * output), so every convergence-study probe evaluation crashed with
 * LAFEA_G4_PROBE_KEYS_INVALID. Reuses BM005's real, frozen benchmark fixture
 * (the actual production trigger) rather than inventing a new one.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA } from '../src/workspace/lafea-continuum-geometry-intake.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';

const STAGE_ID = 'LAFEA.3';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = read('validation/lafea-benchmark-data/BM005/benchmark.json');

const source = sourceDocument(definition);
const composition = requireLafeaStageComposition(STAGE_ID);
const normalizedSource = composition.normalizeDocument(source);
const authority = issueLafeaSourceAuthority(
  STAGE_ID,
  normalizedSource,
  'LAFEA3_BM005_LAME_ORDINARY_ROUTE',
);
const profile = frozenMeshProfile(definition);
const store = createLafeaWorkbenchStore({
  initialStage: STAGE_ID,
  initialDocument: normalizedSource,
  initialSourceHash: authority.sourceHash,
});

try {
  store.registerContinuumGeometryIntake(declaration(definition));
  store.bindAnalysisMeshProfile(profile, STAGE_ID);
  store.generateAnalysisMesh({}, STAGE_ID);
  store.prepareContinuumForRun();
  store.run();

  const convergence = store.runContinuumConvergenceStudy(convergenceRequest(definition));

  assert.ok(
    ['CURRENT_PASS', 'CURRENT_BLOCK'].includes(convergence.status),
    `expected a real convergence status, got ${convergence.status}`,
  );
  assert.equal(
    convergence.study.levels.length,
    definition.mesh.levels.length,
    'expected every requested mesh level to produce a convergence-study level receipt',
  );
  assert.ok(
    convergence.study.levels.every((row) => /^sha256:[0-9a-f]{64}$/u.test(row.probeEvidenceHash)),
    'expected every level to carry a real probe-evidence hash',
  );

  console.log(JSON.stringify({
    schema: 'lafea-continuum-convergence-study-probe-reevaluation-self-test/v1',
    status: 'PASS',
    benchmarkId: definition.benchmarkId,
    convergenceStatus: convergence.status,
    levelCount: convergence.study.levels.length,
  }));
} finally {
  store.destroy();
}

function convergenceRequest(value) {
  const { polarCoordinate: _polar, ...probe } = value.probe;
  return {
    schema: 'lafea-continuum-convergence-study-request/v1',
    studyId: `${value.benchmarkId}/DISPLACEMENT-CONVERGENCE`,
    probe,
    levels: value.mesh.levels.map((row) => ({ ...row })),
  };
}

function declaration(value) {
  return {
    schema: LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA,
    geometry: structuredClone(value.model.geometry),
    applicationRef: `${value.benchmarkId}/ORDINARY-ROUTE`,
    regionId: 'REGION-1',
    materialRef: value.model.material.materialId,
    attachments: structuredClone(value.model.attachments),
    producerRef: `${value.benchmarkId}/QUALIFICATION`,
    temperatureUnit: 'C',
  };
}

function frozenMeshProfile(value) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  const policy = qualifiedMeshQualityPolicyForStage(STAGE_ID);
  const fields = policy.fields;
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: value.mesh.profileIdentity,
    sourceRevision: value.mesh.sourceRevision,
    semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: value.mesh.elementFamily,
      globalTargetSize: value.mesh.levels[0].h,
      adjacentSizeRatioMax: fields.adjacentSizeRatioMax,
      aspectRatioWarn: fields.aspectRatioWarn,
      aspectRatioBlock: fields.aspectRatioBlock,
      scaledJacobianWarn: fields.scaledJacobianWarn,
      scaledJacobianBlock: fields.scaledJacobianBlock,
      adaptiveLevels: fields.adaptiveLevelsMinimum,
    },
  });
}

function sourceDocument(value) {
  const material = value.model.material;
  const t = value.model.thickness;
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: value.benchmarkId,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: value.sourceBenchmarkRef,
      sourceVersion: 'BM005-FROZEN/V1',
      adapterIdentity: 'LAFEA3_BM005_ORDINARY_ROUTE',
      adapterVersion: '1',
    },
    units: { ...value.model.units },
    formulation: value.model.formulation,
    materials: [{
      ...material,
      sourceReference: `${value.sourceClaimId}/MATERIAL`,
    }],
    nodes: [
      node('A', 0, 0), node('B', 2, 0), node('C', 2, 2), node('D', 0, 2),
      node('E', 1, 0), node('F', 2, 1), node('G', 1, 2), node('H', 0, 1),
    ],
    elements: [{
      elementId: 'SOURCE-Q8-SEED',
      elementType: 'Q8',
      nodeIds: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      materialId: material.materialId,
      thickness: t,
      sourceReference: `${value.sourceClaimId}/SOURCE-Q8-SEED`,
    }],
    elementTypePolicy: {
      allowT3Fallback: false,
      sourceReference: `${value.sourceClaimId}/Q8_ONLY`,
    },
    constraints: [],
    loadCases: [{
      loadCaseId: value.model.physicalCaseId,
      nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [],
      temperatureLoads: [], imposedDisplacements: [],
      sourceReference: `${value.sourceClaimId}/CASE/${value.model.physicalCaseId}`,
    }],
    resultRequests: { loadCaseIds: [value.model.physicalCaseId] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: ['BM005_SOURCE_SEED_GEOMETRY_REPLACED_BY_GOVERNED_ANALYSIS_GEOMETRY'],
  };
}

function node(nodeId, x, y) {
  return { nodeId, x, y, sourceReference: `BM005_SOURCE_NODE#${nodeId}` };
}

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
