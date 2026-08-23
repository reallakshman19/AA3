#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaEffectiveValueCandidate,
  resolveNonFeaEffectiveValues,
} from '../src/workspace/project-data/non-fea-effective-value-resolver.js';
import {
  AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js';
import {
  computeAuthorizedEmpiricalLoadInputSemanticHash,
} from '../src/workspace/engineering-loads/authorized-empirical-load-input.js';
import {
  buildAuthorizedEmpiricalLoadProfile,
} from '../src/workspace/engineering-loads/authorized-empirical-load-execution.js';
import {
  createAuthorizedEmpiricalEffectiveExecutionProjection,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js';
import {
  AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_REQUEST_SCHEMA,
  calculateAuthorizedEmpiricalLoadExecutionV2,
} from '../src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';

const HASHES = Object.freeze({
  dataset: '1'.repeat(64),
  lineList: '2'.repeat(64),
  pipingClass: '3'.repeat(64),
  componentWeight: '4'.repeat(64),
});
const SH = Object.freeze({
  baseline: 'fnv1a64:1111111111111111',
  readinessEvaluation: 'fnv1a64:2222222222222222',
  readiness: 'fnv1a64:3333333333333333',
  handoff: 'fnv1a64:4444444444444444',
  payload: 'fnv1a64:5555555555555555',
  configuration: 'fnv1a64:6666666666666666',
  line: 'fnv1a64:7777777777777777',
});

const authorizedInput = makeAuthorizedInput();
const dataset = makeDataset();
const profile = makeProfile();
const supportSiteModel = makeSupportSiteModel();
const routePartitionModel = makeRoutePartitionModel();
const masterData = {
  lineList: { sourceHash: HASHES.lineList },
  pipingClass: { sourceHash: HASHES.pipingClass },
  weight: { sourceHash: HASHES.componentWeight },
};
const compatibilityProfile = buildAuthorizedEmpiricalLoadProfile(profile, authorizedInput);
const projection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput,
  dataset,
  profile: compatibilityProfile,
});

const v2 = execute(EMPIRICAL_LOAD_METHOD, 'V2-EFFECTIVE');
const v3 = execute(EMPIRICAL_LOAD_COG_METHOD, 'V3-EFFECTIVE');
for (const receipt of [v2, v3]) {
  assert.equal(receipt.status, 'CALCULATED');
  assert.equal(receipt.effectiveExecutionProjectionSemanticHash, projection.semanticHash);
  assert.equal(receipt.ephemeralProfileSemanticHash, projection.projectedProfileSemanticHash);
  assert.equal(receipt.distribution.loadCases[0].status, 'CALCULATED');
  assert.equal(receipt.distribution.loadCases[0].equilibrium.passed, true);
  assert.equal(receipt.distribution.loadCases[0].excludedInputs.length, 0);
  const contribution = receipt.distribution.loadCases[0].contributionLedger[0];
  assert.equal(contribution.entityId, 'pipe-1');
  assert.equal(contribution.formula.outsideDiameterMm, 100);
  assert.equal(contribution.formula.insideDiameterMm, 90);
  assert(contribution.formula.projectDataSources.every((row) => (
    row.evidence?.source === 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER'
  )));
}
assert.equal(v2.executedMethod, EMPIRICAL_LOAD_METHOD);
assert.equal(v3.executedMethod, EMPIRICAL_LOAD_COG_METHOD);
assert.notEqual(
  v2.ephemeralProfileSemanticHash,
  semanticHash(compatibilityProfile),
  'V2 must not execute from the compatibility overlay when a ledger is present',
);

const pipe = v2.distribution.loadCases[0].contributionLedger[0];
const expectedMetalKg = Math.PI * ((100 ** 2) - (90 ** 2)) / 4e6 * 7850;
const expectedFluidKg = Math.PI * (90 ** 2) / 4e6 * 800;
assert.ok(Math.abs(pipe.formula.metalKg - expectedMetalKg) < 1e-12);
assert.equal(pipe.formula.insulationKg, 0);
assert.ok(Math.abs(pipe.formula.fluidKg - expectedFluidKg) < 1e-12);
assert.ok(Math.abs(pipe.massKg - (expectedMetalKg + expectedFluidKg)) < 1e-12);

console.log(JSON.stringify({
  status: 'PASS',
  effectiveExecutionProjectionSemanticHash: projection.semanticHash,
  v2SemanticHash: v2.semanticHash,
  v3SemanticHash: v3.semanticHash,
  v2Method: v2.executedMethod,
  v3Method: v3.executedMethod,
  outsideDiameterMm: pipe.formula.outsideDiameterMm,
  insideDiameterMm: pipe.formula.insideDiameterMm,
  metalKg: pipe.formula.metalKg,
  fluidKg: pipe.formula.fluidKg,
  compatibilityOverlayBypassed: true,
}, null, 2));

function execute(method, suffix) {
  return calculateAuthorizedEmpiricalLoadExecutionV2({
    schema: AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_REQUEST_SCHEMA,
    executionId: `EXEC-${suffix}`,
    executedAt: '2026-08-22T10:30:00.000Z',
    method,
    authorizedInput,
    dataset,
    profile,
    supportSiteModel,
    routePartitionModel,
    masterData,
  });
}

function makeAuthorizedInput() {
  const effective = resolveNonFeaEffectiveValues({
    candidates: [
      lineCandidate('PIPE_OUTER_DIAMETER', 100, 'mm'),
      lineCandidate('PIPE_WALL_THICKNESS', 5, 'mm'),
      lineCandidate('MATERIAL_DENSITY', 7850, 'kg/m3'),
      lineCandidate('OPERATING_FLUID_DENSITY', 800, 'kg/m3'),
      lineCandidate('HYDRO_FLUID_DENSITY', 1000, 'kg/m3'),
      lineCandidate('INSULATION_THICKNESS', 0, 'mm'),
    ],
  });
  assert.equal(effective.status, 'RESOLVED');
  const ledgerMaterial = {
    schema: AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
    handoffSemanticHash: SH.handoff,
    baselineSemanticHash: SH.baseline,
    resolutionSemanticHash: effective.semanticHash,
    status: effective.status,
    rows: effective.rows,
    summary: effective.summary,
  };
  const effectiveValueLedger = Object.freeze({
    ...ledgerMaterial,
    semanticHash: semanticHash(ledgerMaterial),
  });

  // Deliberately wrong compatibility-overlay values. The ledger projection must
  // replace these before V2/V3 calculation.
  const loadCalculationOverlay = {
    pipeSectionProperties: {
      'L-1': {
        outsideDiameterMm: 20,
        wallThicknessMm: 1,
        materialCode: 'LEGACY-MAT',
        insulationCode: null,
        insulationThicknessMm: 0,
      },
    },
    materialDensitiesKgPerM3: { 'LEGACY-MAT': 100 },
    operatingFluidDensitiesKgPerM3: { 'L-1': 100 },
    hydroFluidDensitiesKgPerM3: { 'L-1': 100 },
    insulationDensitiesKgPerM3: {},
    componentWeightsKg: {},
  };
  const draft = {
    schema: 'authorized-empirical-load-input/v1',
    intakeId: 'V2-EFFECTIVE-INPUT',
    projectId: 'V2-EFFECTIVE-PROJECT',
    baselineId: 'V2-EFFECTIVE-BASELINE',
    baselineRevision: 1,
    baselineSemanticHash: SH.baseline,
    readinessEvaluationSemanticHash: SH.readinessEvaluation,
    readinessSemanticHash: SH.readiness,
    handoffSemanticHash: SH.handoff,
    projectionPayloadSemanticHash: SH.payload,
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: SH.configuration,
    createdAt: '2026-08-22T10:29:00.000Z',
    lineBindings: [{
      targetId: 'LINE:L-1',
      sourceRecordId: 'PIPE-SRC',
      lineKey: 'L-1',
      projectionRecordSemanticHash: SH.line,
    }],
    componentBindings: [],
    loadCalculationOverlay,
    overlaySemanticHash: semanticHash(loadCalculationOverlay),
    effectiveValueLedger,
    summary: {
      lineCount: 1,
      componentCount: 0,
      materialCodeCount: 1,
      insulationCodeCount: 0,
      componentCatalogCount: 0,
    },
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return Object.freeze({
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadInputSemanticHash(draft),
  });
}

function lineCandidate(fieldId, value, unit) {
  return createNonFeaEffectiveValueCandidate({
    candidateId: `LINE:L-1:${fieldId}`,
    targetKind: 'LINE',
    targetId: 'LINE:L-1',
    fieldId,
    value,
    unit,
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: `MASTER:L-1:${fieldId}`,
    evidence: { source: 'V2 effective execution fixture' },
  });
}

function makeProfile() {
  const empty = createEmptyProjectDataProfile();
  const source = (value, sourceKey, sourceHash) => createEvidenceValue(
    value,
    { source: 'FIXTURE_CONTROLLED_SOURCE', sourceKey, sourceHash },
    true,
  );
  const approved = (value, label) => createEvidenceValue(value, { source: label }, true);
  return {
    ...empty,
    projectId: 'V2-EFFECTIVE-PROJECT',
    revision: 1,
    updatedAt: '2026-08-22T10:28:00.000Z',
    sourcesAndUnits: {
      ...empty.sourcesAndUnits,
      lineListSource: source({ sha256: HASHES.lineList }, 'lineList', HASHES.lineList),
      pipingClassSource: source({ sha256: HASHES.pipingClass }, 'pipingClass', HASHES.pipingClass),
      componentWeightSource: source({ sha256: HASHES.componentWeight }, 'componentWeight', HASHES.componentWeight),
    },
    topology: {
      ...empty.topology,
      portMatchToleranceMm: approved(1, 'FIXTURE_TOPOLOGY'),
      supportSiteGroupingToleranceMm: approved(1, 'FIXTURE_TOPOLOGY'),
      autoCarrierCoincidenceToleranceMm: approved(1, 'FIXTURE_TOPOLOGY'),
      routeJoiningRules: approved({ mode: 'EXACT' }, 'FIXTURE_TOPOLOGY'),
      supportTypeCapabilities: approved({ REST: { vertical: true } }, 'FIXTURE_TOPOLOGY'),
    },
    loadCalculation: {
      ...empty.loadCalculation,
      gravityMPerS2: approved(9.81, 'FIXTURE_LOAD_POLICY'),
      loadFactor: approved(1, 'FIXTURE_LOAD_POLICY'),
      equilibriumTolerances: approved({ forceN: 1e-8, momentNmm: 1e-5 }, 'FIXTURE_LOAD_POLICY'),
      activeLoadCases: approved(['OPE'], 'FIXTURE_LOAD_POLICY'),
    },
  };
}

function makeDataset() {
  const sharedBase = {
    schema: 'shared-piping-model/v1',
    units: { length: 'mm', force: 'N', mass: 'kg' },
    components: [],
    supports: [],
  };
  return {
    schema: 'analysis-workspace-dataset/v1',
    datasetId: 'V2-EFFECTIVE-DATASET',
    version: 1,
    sourceSha256: HASHES.dataset,
    sharedModel: { ...sharedBase, semanticHash: semanticHash(sharedBase) },
    entities: [{
      entityId: 'pipe-1',
      entityType: 'PIPE',
      lineKey: 'L-1',
      sourceEntityId: 'PIPE-SRC',
      jsonPointer: '/items/0',
      componentReference: 'PIPE-1',
      properties: {},
    }],
  };
}

function makeSupportSiteModel() {
  const site = (siteId, x) => ({
    siteId,
    tags: [siteId],
    positionMm: { x, y: 0, z: 0 },
    assemblyIds: [`assembly-${siteId}`],
    memberEntityIds: [`support-${siteId}`],
    assemblies: [{ members: [{ sourceType: 'REST' }] }],
  });
  return { schema: 'support-site-model/v1', sites: [site('S-0', 0), site('S-1', 1000)] };
}

function makeRoutePartitionModel() {
  return {
    schema: 'route-partition-model/v1',
    routes: [{
      routeId: 'R-1',
      status: 'READY',
      blockers: [],
      physicalEdgeIds: ['pipe-1'],
      entityChainages: [{
        entityId: 'pipe-1',
        startMm: 0,
        endMm: 1000,
        pointMm: 500,
        sourceStartChainageMm: 0,
        sourceEndChainageMm: 1000,
      }],
    }],
    edges: [{
      entityId: 'pipe-1',
      entityType: 'PIPE',
      lengthMm: 1000,
      pointComponent: false,
      topologyCarrier: false,
      startMm: { x: 0, y: 0, z: 0 },
      endMm: { x: 1000, y: 0, z: 0 },
    }],
  };
}
