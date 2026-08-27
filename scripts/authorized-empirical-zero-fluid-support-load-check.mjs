#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
  validateProjectDataProfile,
} from '../src/workspace/project-data/project-data-contract.js';
import { NON_FEA_FLUID_FILL_POLICY_SCHEMA } from '../src/workspace/project-data/non-fea-fluid-fill-policy.js';
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
  EMPIRICAL_LOAD_METHOD,
  resolveProjectDataDensity,
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
const supportSiteModel = makeSupportSiteModel();
const routePartitionModel = makeRoutePartitionModel();
const masterData = {
  lineList: { sourceHash: HASHES.lineList },
  pipingClass: { sourceHash: HASHES.pipingClass },
  weight: { sourceHash: HASHES.componentWeight },
};

const full = execute(1, 'FULL');
const half = execute(0.5, 'HALF');
const zero = execute(0, 'ZERO');

for (const receipt of [full, half, zero]) {
  assert.equal(receipt.status, 'CALCULATED');
  const loadCase = receipt.distribution.loadCases[0];
  assert.equal(loadCase.loadCaseId, 'OPE');
  assert.equal(loadCase.status, 'CALCULATED');
  assert.equal(loadCase.equilibrium.passed, true);
  assert.equal(loadCase.excludedInputs.length, 0);
  assert.equal(loadCase.blockers.length, 0);
  assert.equal(loadCase.contributionLedger.length, 1);
  assert.equal(loadCase.contributionLedger[0].entityId, 'pipe-1');
}

const fullPipe = contribution(full);
const halfPipe = contribution(half);
const zeroPipe = contribution(zero);
const expectedFullFluidKg = Math.PI * (90 ** 2) / 4e6 * 800;
const expectedMetalKg = Math.PI * ((100 ** 2) - (90 ** 2)) / 4e6 * 7850;

assert.ok(Math.abs(fullPipe.formula.fluidKg - expectedFullFluidKg) < 1e-12);
assert.ok(Math.abs(halfPipe.formula.fluidKg - expectedFullFluidKg * 0.5) < 1e-12);
assert.equal(zeroPipe.formula.fluidKg, 0);
assert.equal(halfPipe.formula.fluidKg / fullPipe.formula.fluidKg, 0.5);
assert.equal(zeroPipe.formula.fluidKg / fullPipe.formula.fluidKg, 0);
assert.ok(Math.abs(fullPipe.formula.metalKg - expectedMetalKg) < 1e-12);
assert.equal(halfPipe.formula.metalKg, fullPipe.formula.metalKg);
assert.equal(zeroPipe.formula.metalKg, fullPipe.formula.metalKg);
assert.equal(fullPipe.formula.insulationKg, 0);
assert.equal(halfPipe.formula.insulationKg, 0);
assert.equal(zeroPipe.formula.insulationKg, 0);

const zeroSource = zeroPipe.formula.projectDataSources.find((row) => (
  row.projectDataPath === 'loadCalculation.operatingFluidDensitiesKgPerM3'
));
assert.ok(zeroSource);
assert.equal(zeroSource.resolutionAuthority, 'AUTHORIZED_ZERO_FLUID_COMPOSITION');
assert.equal(zeroSource.fallbackUsed, false);
assert.equal(zeroSource.zeroFluid, true);
assert.equal(zeroSource.densityKgPerM3, 0);
assert.equal(zeroSource.rawDensityKgPerM3, 800);
assert.equal(zeroSource.fillFraction, 0);
assert.ok(zeroSource.rawDensitySemanticHash);
assert.ok(zeroSource.fillPolicySemanticHash);
assert.ok(zeroSource.compositionSemanticHash);

const zeroProfile = makeProfile(0);
const compatibilityProfile = buildAuthorizedEmpiricalLoadProfile(zeroProfile, authorizedInput);
const zeroProjection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput,
  dataset,
  profile: compatibilityProfile,
});
const zeroEntry = zeroProjection.profile.loadCalculation.operatingFluidDensitiesKgPerM3;
const exactZero = resolveProjectDataDensity(
  { ...zeroEntry.value, DEFAULT: 999 },
  'L-1',
  zeroEntry.evidence,
);
assert.equal(exactZero.densityKgPerM3, 0,
  'authorized exact zero must win before any positive DEFAULT fallback');
assert.equal(exactZero.selector, 'L-1');
assert.equal(exactZero.fallbackUsed, false);
assert.equal(exactZero.authority, 'AUTHORIZED_ZERO_FLUID_COMPOSITION');

assert.equal(resolveProjectDataDensity({ 'L-1': 0, DEFAULT: 0 }, 'L-1'), null,
  'naked/default zero density must remain unusable');
const nakedZeroWithPositiveDefault = resolveProjectDataDensity({ 'L-1': 0, DEFAULT: 999 }, 'L-1');
assert.equal(nakedZeroWithPositiveDefault.densityKgPerM3, 999,
  'legacy naked zero remains unresolved and may only follow the existing positive DEFAULT rule');
assert.equal(nakedZeroWithPositiveDefault.fallbackUsed, true);

const forgedProfile = structuredClone(zeroProjection.profile);
forgedProfile.loadCalculation.operatingFluidDensitiesKgPerM3
  .evidence.fluidCompositionBySelector['L-1'].compositionSemanticHash = 'fnv1a64:ffffffffffffffff';
const forgedAudit = validateProjectDataProfile(forgedProfile, 'authorizedGravityLoads', masterHashes());
assert.equal(forgedAudit.valid, false,
  'mismatched zero-fluid receipt must fail Project Data validation before calculation');
assert(forgedAudit.errors.some((row) => row.code === 'NON_POSITIVE_ENGINEERING_VALUE'));

const nakedProfile = structuredClone(zeroProjection.profile);
nakedProfile.loadCalculation.operatingFluidDensitiesKgPerM3.value['L-1'] = 0;
const nakedAudit = validateProjectDataProfile(nakedProfile, 'authorizedGravityLoads', masterHashes());
assert.equal(nakedAudit.valid, false,
  'numeric zero must not inherit zero-fluid authority from the map-level evidence');
assert(nakedAudit.errors.some((row) => row.code === 'NON_POSITIVE_ENGINEERING_VALUE'));

for (const receipt of [full, half, zero]) {
  const equilibrium = receipt.distribution.loadCases[0].equilibrium;
  assert.ok(Math.abs(equilibrium.forceResidualN) <= 1e-8);
  assert.ok(Math.abs(equilibrium.momentResidualNmm) <= 1e-5);
}

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_NATIVE_ZERO_FLUID_SUPPORT_LOAD',
  rawDensityKgPerM3: 800,
  fullFluidKg: fullPipe.formula.fluidKg,
  halfFluidKg: halfPipe.formula.fluidKg,
  zeroFluidKg: zeroPipe.formula.fluidKg,
  ratio: [1, 0.5, 0],
  metalMassInvariant: zeroPipe.formula.metalKg === fullPipe.formula.metalKg,
  insulationMassInvariant: true,
  exactZeroPrecedesDefault: true,
  nakedZeroRejected: true,
  forgedReceiptRejected: true,
  equilibriumClosedAllCases: true,
}, null, 2));

function execute(fillFraction, suffix) {
  return calculateAuthorizedEmpiricalLoadExecutionV2({
    schema: AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_REQUEST_SCHEMA,
    executionId: `EXEC-ZERO-FLUID-${suffix}`,
    executedAt: '2026-08-25T13:50:00.000Z',
    method: EMPIRICAL_LOAD_METHOD,
    authorizedInput,
    dataset,
    profile: makeProfile(fillFraction),
    supportSiteModel,
    routePartitionModel,
    masterData,
  });
}

function contribution(receipt) {
  return receipt.distribution.loadCases[0].contributionLedger[0];
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
    intakeId: 'ZERO-FLUID-INPUT',
    projectId: 'ZERO-FLUID-PROJECT',
    baselineId: 'ZERO-FLUID-BASELINE',
    baselineRevision: 1,
    baselineSemanticHash: SH.baseline,
    readinessEvaluationSemanticHash: SH.readinessEvaluation,
    readinessSemanticHash: SH.readiness,
    handoffSemanticHash: SH.handoff,
    projectionPayloadSemanticHash: SH.payload,
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: SH.configuration,
    createdAt: '2026-08-25T13:49:00.000Z',
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
    evidence: { source: 'zero-fluid effective execution fixture' },
  });
}

function makeProfile(fillFraction) {
  const empty = createEmptyProjectDataProfile();
  const source = (value, sourceKey, sourceHash) => createEvidenceValue(
    value,
    { source: 'FIXTURE_CONTROLLED_SOURCE', sourceKey, sourceHash },
    true,
  );
  const approved = (value, label) => createEvidenceValue(value, { source: label }, true);
  const phase = fillFraction === 0 ? 'EMPTY' : fillFraction === 1 ? 'LIQUID' : 'MIXED';
  return {
    ...empty,
    projectId: 'ZERO-FLUID-PROJECT',
    revision: 1,
    updatedAt: '2026-08-25T13:48:00.000Z',
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
    thermoMechanicalBasis: {
      ...empty.thermoMechanicalBasis,
      fluidPhaseAndFillState: approved({
        schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
        cases: {
          OPE: { fillFraction, phase },
          HYD: 'LIQUID_FULL',
        },
      }, 'ZERO_FLUID_FILL_POLICY'),
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
    datasetId: 'ZERO-FLUID-DATASET',
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

function masterHashes() {
  return {
    dataset: HASHES.dataset,
    lineList: HASHES.lineList,
    pipingClass: HASHES.pipingClass,
    componentWeight: HASHES.componentWeight,
  };
}
