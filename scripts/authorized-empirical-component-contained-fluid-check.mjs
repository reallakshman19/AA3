#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  getNonFeaFieldDefinition,
} from '../src/workspace/project-data/non-fea-field-registry.js';
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
  createAuthorizedEmpiricalEffectiveExecutionProjection,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js';
import {
  AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_REQUEST_SCHEMA,
  calculateAuthorizedEmpiricalLoadExecutionV2,
} from '../src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js';
import {
  EMPIRICAL_LOAD_METHOD,
  calculateSupportLoadDistribution,
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
  component: 'fnv1a64:8888888888888888',
});

for (const fieldId of ['COMPONENT_OPERATING_FLUID_WEIGHT', 'COMPONENT_HYDRO_FLUID_WEIGHT']) {
  const definition = getNonFeaFieldDefinition(fieldId);
  assert.ok(definition, `${fieldId} must be registered`);
  assert.equal(definition.canonicalUnit, 'kg');
  assert.equal(definition.defaultEligible, true);
  assert.ok(definition.methods.includes('WEIGHT_AND_GRAVITY'));
  assert.ok(definition.authorityPath.includes('PROJECT_CONFIGURED_DEFAULT'));
  assert.ok(definition.authorityPath.includes('PRODUCT_DEFAULT'));
}

const dataset = makeDataset();
const profile = makeProfile();
const supportSiteModel = makeSupportSiteModel();
const routePartitionModel = makeRoutePartitionModel();
const masterData = {
  lineList: { sourceHash: HASHES.lineList },
  pipingClass: { sourceHash: HASHES.pipingClass },
  weight: { sourceHash: HASHES.componentWeight },
};

const absentInput = makeAuthorizedInput({});
const contentInput = makeAuthorizedInput({ opeKg: 8, hydKg: 10 });
const zeroInput = makeAuthorizedInput({ opeKg: 0, hydKg: 0 });

const absentProjection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: absentInput,
  dataset,
  profile,
});
const contentProjection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: contentInput,
  dataset,
  profile,
});
const zeroProjection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: zeroInput,
  dataset,
  profile,
});

const selector = 'EFFECTIVE_COMPONENT:COMPONENT:VALVE-1';
assert.equal(absentProjection.profile.loadCalculation.componentWeightsKg.value[selector], 100);
assert.equal(contentProjection.profile.loadCalculation.componentWeightsKg.value[selector], 100,
  'contained fluid must not mutate the dry component-weight map');
assert.equal(zeroProjection.profile.loadCalculation.componentWeightsKg.value[selector], 100);
assert.deepEqual(absentProjection.profile.loadCalculation.componentOperatingFluidWeightsKg.value, {},
  'absence must remain absence rather than fabricated zero evidence');
assert.deepEqual(absentProjection.profile.loadCalculation.componentHydroFluidWeightsKg.value, {});
assert.equal(contentProjection.profile.loadCalculation.componentOperatingFluidWeightsKg.value[selector], 8);
assert.equal(contentProjection.profile.loadCalculation.componentHydroFluidWeightsKg.value[selector], 10);
assert.equal(zeroProjection.profile.loadCalculation.componentOperatingFluidWeightsKg.value[selector], 0,
  'explicit zero must remain an exact selected engineering value');
assert.equal(zeroProjection.profile.loadCalculation.componentHydroFluidWeightsKg.value[selector], 0);
assert.equal(contentProjection.componentContentCompositionRows.length, 2);
assert.equal(zeroProjection.componentContentCompositionRows.length, 2);
assert.equal(absentProjection.componentContentCompositionRows.length, 0);
assert.ok(contentProjection.componentMappings[0].selectedContentSemanticHashes.length === 2);
assert.notEqual(contentProjection.componentMappings[0].selectedSemanticHash,
  contentProjection.componentMappings[0].selectedContentSemanticHashes[0],
  'dry and content authority hashes must remain separate');

assert.throws(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput: makeAuthorizedInput({ opeKg: -1 }),
    dataset,
    profile,
  }),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_EXECUTION_VALUE_INVALID',
  'negative component content must fail before gravity execution',
);

const absent = execute(absentInput, 'ABSENT');
const content = execute(contentInput, 'CONTENT');
const zero = execute(zeroInput, 'ZERO');

for (const receipt of [absent, content, zero]) {
  assert.equal(receipt.status, 'CALCULATED');
  assert.equal(receipt.distribution.status, 'CALCULATED');
  assert.equal(receipt.distribution.loadCases.length, 3);
  for (const loadCase of receipt.distribution.loadCases) {
    assert.equal(loadCase.status, 'CALCULATED');
    assert.equal(loadCase.equilibrium.passed, true);
    assert.equal(loadCase.excludedInputs.length, 0);
  }
}

const expectedContentMass = Object.freeze({ EMPTY: 100, OPE: 108, HYD: 110 });
for (const loadCaseId of ['EMPTY', 'OPE', 'HYD']) {
  const absentValve = contributionFor(absent, loadCaseId, 'valve-1');
  const contentValve = contributionFor(content, loadCaseId, 'valve-1');
  const zeroValve = contributionFor(zero, loadCaseId, 'valve-1');
  const absentPipe = contributionFor(absent, loadCaseId, 'pipe-1');
  const contentPipe = contributionFor(content, loadCaseId, 'pipe-1');

  assert.equal(absentValve.massKg, 100,
    `${loadCaseId}: absent content evidence must preserve dry component mass`);
  assert.equal(contentValve.massKg, expectedContentMass[loadCaseId],
    `${loadCaseId}: contained-fluid mass composition must match independent arithmetic`);
  assert.equal(zeroValve.massKg, 100,
    `${loadCaseId}: explicit zero content must add exactly zero mass`);
  assert.equal(contentValve.chainageMm, absentValve.chainageMm,
    `${loadCaseId}: contained fluid must not move the component application point`);
  assert.deepEqual(allocationFractions(contentValve), allocationFractions(absentValve),
    `${loadCaseId}: support allocation fractions must remain unchanged`);
  assert.ok(Math.abs(contentPipe.massKg - absentPipe.massKg) < 1e-12,
    `${loadCaseId}: component content must not change PIPE mass`);
  assert.deepEqual(allocationFractions(contentPipe), allocationFractions(absentPipe),
    `${loadCaseId}: component content must not change PIPE allocation`);

  if (loadCaseId === 'EMPTY') {
    assert.equal(Object.hasOwn(contentValve.formula, 'containedFluidMassKg'), false,
      'EMPTY must remain dry-only');
  } else {
    assert.equal(contentValve.formula.dryComponentMassKg, 100);
    assert.equal(contentValve.formula.containedFluidMassKg, loadCaseId === 'OPE' ? 8 : 10);
    assert.equal(contentValve.formula.rule,
      'COMPONENT_CASE_MASS=DRY_POINT_MASS+OPTIONAL_AUTHORIZED_CONTAINED_FLUID');
  }
}

const forgedProfile = structuredClone(contentProjection.profile);
forgedProfile.loadCalculation.componentOperatingFluidWeightsKg.approved = false;
const forgedDistribution = calculateSupportLoadDistribution({
  dataset: contentProjection.dataset,
  profile: forgedProfile,
  supportSiteModel,
  routePartitionModel,
  masterData,
});
const forgedOpe = forgedDistribution.loadCases.find((row) => row.loadCaseId === 'OPE');
assert.equal(forgedOpe.status, 'FAILED');
assert.ok(forgedOpe.excludedInputs.some((row) => row.code === 'UNAPPROVED_COMPONENT_CONTENT_MASS'),
  'a content map without approved source evidence must fail closed');

assert.notEqual(contentProjection.semanticHash, absentProjection.semanticHash,
  'component content evidence must change effective execution identity');
assert.notEqual(content.semanticHash, absent.semanticHash,
  'component content evidence must change execution identity');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_COMPONENT_CONTAINED_FLUID',
  dryComponentMassKg: 100,
  operatingContainedFluidKg: 8,
  hydroContainedFluidKg: 10,
  expectedCaseMassKg: expectedContentMass,
  emptyRemainsDry: true,
  absenceRemainsUnprojected: true,
  explicitZeroPreserved: true,
  negativeRejected: true,
  unapprovedContentRejected: true,
  dryWeightMapInvariant: true,
  pipeMassInvariant: true,
  applicationPointInvariant: true,
  allocationFractionsInvariant: true,
  equilibriumClosed: true,
}, null, 2));

function execute(authorizedInput, suffix) {
  return calculateAuthorizedEmpiricalLoadExecutionV2({
    schema: AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_REQUEST_SCHEMA,
    executionId: `EXEC-COMPONENT-CONTENT-${suffix}`,
    executedAt: '2026-08-25T17:30:00.000Z',
    method: EMPIRICAL_LOAD_METHOD,
    authorizedInput,
    dataset,
    profile,
    supportSiteModel,
    routePartitionModel,
    masterData,
  });
}

function contributionFor(receipt, loadCaseId, entityId) {
  const loadCase = receipt.distribution.loadCases.find((row) => row.loadCaseId === loadCaseId);
  assert.ok(loadCase, `missing ${loadCaseId}`);
  const contribution = loadCase.contributionLedger.find((row) => row.entityId === entityId);
  assert.ok(contribution, `missing ${loadCaseId}:${entityId}`);
  return contribution;
}

function allocationFractions(contribution) {
  return contribution.allocations.map((row) => row.verticalForceN / contribution.verticalForceN);
}

function makeAuthorizedInput({ opeKg, hydKg } = {}) {
  const candidates = [
    lineCandidate('PIPE_OUTER_DIAMETER', 100, 'mm'),
    lineCandidate('PIPE_WALL_THICKNESS', 5, 'mm'),
    lineCandidate('MATERIAL_DENSITY', 7850, 'kg/m3'),
    lineCandidate('OPERATING_FLUID_DENSITY', 800, 'kg/m3'),
    lineCandidate('HYDRO_FLUID_DENSITY', 1000, 'kg/m3'),
    lineCandidate('INSULATION_THICKNESS', 0, 'mm'),
    componentCandidate('COMPONENT_WEIGHT', 100, 'kg', 'EXACT_APPROVED_MASTER'),
  ];
  if (opeKg !== undefined) {
    candidates.push(componentCandidate(
      'COMPONENT_OPERATING_FLUID_WEIGHT', opeKg, 'kg', 'PROJECT_CONFIGURED_DEFAULT'));
  }
  if (hydKg !== undefined) {
    candidates.push(componentCandidate(
      'COMPONENT_HYDRO_FLUID_WEIGHT', hydKg, 'kg', 'PROJECT_CONFIGURED_DEFAULT'));
  }
  const effective = resolveNonFeaEffectiveValues({ candidates });
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
    componentWeightsKg: { 'LEGACY-VALVE': 1 },
  };
  const draft = {
    schema: 'authorized-empirical-load-input/v1',
    intakeId: 'COMPONENT-CONTENT-INPUT',
    projectId: 'COMPONENT-CONTENT-PROJECT',
    baselineId: 'COMPONENT-CONTENT-BASELINE',
    baselineRevision: 1,
    baselineSemanticHash: SH.baseline,
    readinessEvaluationSemanticHash: SH.readinessEvaluation,
    readinessSemanticHash: SH.readiness,
    handoffSemanticHash: SH.handoff,
    projectionPayloadSemanticHash: SH.payload,
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: SH.configuration,
    createdAt: '2026-08-25T17:29:00.000Z',
    lineBindings: [{
      targetId: 'LINE:L-1',
      sourceRecordId: 'PIPE-SRC',
      lineKey: 'L-1',
      projectionRecordSemanticHash: SH.line,
    }],
    componentBindings: [{
      targetId: 'COMPONENT:VALVE-1',
      sourceRecordId: 'VALVE-SRC',
      lineKey: 'L-1',
      catalogKey: 'LEGACY-VALVE',
      projectionRecordSemanticHash: SH.component,
    }],
    loadCalculationOverlay,
    overlaySemanticHash: semanticHash(loadCalculationOverlay),
    effectiveValueLedger,
    summary: {
      lineCount: 1,
      componentCount: 1,
      materialCodeCount: 1,
      insulationCodeCount: 0,
      componentCatalogCount: 1,
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
    evidence: { source: 'Component-contained-fluid qualification line master' },
  });
}

function componentCandidate(fieldId, value, unit, authority) {
  return createNonFeaEffectiveValueCandidate({
    candidateId: `COMPONENT:VALVE-1:${fieldId}`,
    targetKind: 'COMPONENT',
    targetId: 'COMPONENT:VALVE-1',
    fieldId,
    value,
    unit,
    authority,
    sourceId: `${authority}:COMPONENT:VALVE-1:${fieldId}`,
    evidence: authority === 'PROJECT_CONFIGURED_DEFAULT'
      ? {
        source: 'Project configured component-content fixture',
        defaultId: `DEFAULT:${fieldId}`,
        basis: 'Focused component-contained-fluid qualification',
      }
      : { source: 'Component dry-mass qualification master' },
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
    projectId: 'COMPONENT-CONTENT-PROJECT',
    revision: 1,
    updatedAt: '2026-08-25T17:28:00.000Z',
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
      activeLoadCases: approved(['EMPTY', 'OPE', 'HYD'], 'FIXTURE_LOAD_POLICY'),
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
    datasetId: 'COMPONENT-CONTENT-DATASET',
    version: 1,
    sourceSha256: HASHES.dataset,
    sharedModel: { ...sharedBase, semanticHash: semanticHash(sharedBase) },
    entities: [
      {
        entityId: 'pipe-1',
        entityType: 'PIPE',
        lineKey: 'L-1',
        sourceEntityId: 'PIPE-SRC',
        jsonPointer: '/items/0',
        componentReference: 'PIPE-1',
        properties: {},
      },
      {
        entityId: 'valve-1',
        entityType: 'VALVE',
        lineKey: 'L-1',
        sourceEntityId: 'VALVE-SRC',
        jsonPointer: '/items/1',
        componentReference: 'VALVE-1',
        properties: { attributes: { CATALOG_KEY: 'LEGACY-VALVE' } },
      },
    ],
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
      physicalEdgeIds: ['pipe-1', 'valve-1'],
      entityChainages: [
        {
          entityId: 'pipe-1',
          startMm: 0,
          endMm: 1000,
          pointMm: 500,
          sourceStartChainageMm: 0,
          sourceEndChainageMm: 1000,
        },
        {
          entityId: 'valve-1',
          startMm: 500,
          endMm: 500,
          pointMm: 500,
          sourceStartChainageMm: 500,
          sourceEndChainageMm: 500,
        },
      ],
    }],
    edges: [
      {
        entityId: 'pipe-1',
        entityType: 'PIPE',
        lengthMm: 1000,
        pointComponent: false,
        topologyCarrier: false,
        startMm: { x: 0, y: 0, z: 0 },
        endMm: { x: 1000, y: 0, z: 0 },
      },
      {
        entityId: 'valve-1',
        entityType: 'VALVE',
        lengthMm: 0,
        pointComponent: true,
        topologyCarrier: false,
        startMm: { x: 500, y: 0, z: 0 },
        endMm: { x: 500, y: 0, z: 0 },
      },
    ],
  };
}
