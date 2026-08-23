#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
  projectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaEffectiveValueCandidate,
  resolveNonFeaEffectiveValues,
} from '../src/workspace/project-data/non-fea-effective-value-resolver.js';
import {
  AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js';
import {
  createAuthorizedEmpiricalEffectiveExecutionProjection,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js';
import {
  computeAuthorizedEmpiricalLoadInputSemanticHash,
} from '../src/workspace/engineering-loads/authorized-empirical-load-input.js';
import {
  AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_REQUEST_SCHEMA,
  buildAuthorizedEmpiricalLoadProfile,
  calculateAuthorizedEmpiricalLoadExecution,
} from '../src/workspace/engineering-loads/authorized-empirical-load-execution.js';

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
  lineRecord: 'fnv1a64:7777777777777777',
  componentRecord: 'fnv1a64:8888888888888888',
});

const ledger = makeLedger();
const authorizedInput = makeAuthorizedInput(ledger);
const profile = makeProfile();
const dataset = makeDataset();
const profileBefore = JSON.stringify(profile);
const datasetBefore = JSON.stringify(dataset);
const compatibilityProfile = buildAuthorizedEmpiricalLoadProfile(profile, authorizedInput);
const projection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput,
  dataset,
  profile: compatibilityProfile,
});

assert.equal(JSON.stringify(profile), profileBefore, 'source Project Data profile mutated');
assert.equal(JSON.stringify(dataset), datasetBefore, 'source execution dataset mutated');
assert.notEqual(projection.profile, profile);
assert.notEqual(projection.dataset, dataset);
assert.equal(Object.isFrozen(projection.profile), true);
assert.equal(Object.isFrozen(projection.dataset), true);
assert.equal(Object.isFrozen(projection), true);

const sections = projectDataValue(projection.profile, 'loadCalculation.pipeSectionProperties');
const material = projectDataValue(projection.profile, 'loadCalculation.materialDensitiesKgPerM3');
const operating = projectDataValue(projection.profile, 'loadCalculation.operatingFluidDensitiesKgPerM3');
const hydro = projectDataValue(projection.profile, 'loadCalculation.hydroFluidDensitiesKgPerM3');
const insulation = projectDataValue(projection.profile, 'loadCalculation.insulationDensitiesKgPerM3');
const weights = projectDataValue(projection.profile, 'loadCalculation.componentWeightsKg');

assert.deepEqual(sections, {
  'L-1': {
    outsideDiameterMm: 100,
    wallThicknessMm: 5,
    materialCode: 'EFFECTIVE_MATERIAL:LINE:L-1',
    insulationCode: 'EFFECTIVE_INSULATION:LINE:L-1',
    insulationThicknessMm: 10,
  },
});
assert.deepEqual(material, { 'EFFECTIVE_MATERIAL:LINE:L-1': 7850 });
assert.deepEqual(operating, { 'L-1': 800 });
assert.deepEqual(hydro, { 'L-1': 1000 });
assert.deepEqual(insulation, { 'EFFECTIVE_INSULATION:LINE:L-1': 120 });
assert.deepEqual(weights, { 'EFFECTIVE_COMPONENT:COMPONENT:VALVE-1': 10 });
for (const map of [sections, material, operating, hydro, insulation, weights]) {
  assert.equal(Object.hasOwn(map, 'DEFAULT'), false, 'effective execution projection emitted DEFAULT selector');
}
assert.equal(
  projection.profile.loadCalculation.pipeSectionProperties.evidence.source,
  'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER',
);
assert.equal(
  projection.profile.loadCalculation.componentWeightsKg.evidence.sourceSemanticHash,
  ledger.semanticHash,
);
const projectedValve = projection.dataset.entities.find((row) => row.entityId === 'valve-1');
assert.equal(projectedValve.properties.attributes.CATALOG_KEY, 'EFFECTIVE_COMPONENT:COMPONENT:VALVE-1');
assert.equal(dataset.entities.find((row) => row.entityId === 'valve-1').properties.attributes.CATALOG_KEY, 'LEGACY-CATALOG');

const masterData = {
  lineList: { sourceHash: HASHES.lineList },
  pipingClass: { sourceHash: HASHES.pipingClass },
  weight: { sourceHash: HASHES.componentWeight },
};
const execution = calculateAuthorizedEmpiricalLoadExecution({
  schema: AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_REQUEST_SCHEMA,
  executionId: 'effective-execution-001',
  executedAt: '2026-08-22T09:30:00.000Z',
  authorizedInput,
  dataset,
  profile,
  supportSiteModel: makeSupportSiteModel(),
  routePartitionModel: makeRoutePartitionModel(),
  masterData,
});
assert.equal(execution.status, 'CALCULATED');
assert.equal(execution.effectiveExecutionProjectionSemanticHash, projection.semanticHash);
assert.equal(execution.distribution.loadCases.length, 1);
assert.equal(execution.distribution.loadCases[0].loadCaseId, 'OPE');
assert.equal(execution.distribution.loadCases[0].equilibrium.passed, true);
assert.equal(execution.distribution.loadCases[0].excludedInputs.length, 0);
assert.equal(execution.distribution.loadCases[0].contributionLedger.length, 2);

const pipe = execution.distribution.loadCases[0].contributionLedger.find((row) => row.entityId === 'pipe-1');
const valve = execution.distribution.loadCases[0].contributionLedger.find((row) => row.entityId === 'valve-1');
assert.ok(pipe);
assert.ok(valve);
const expectedMetalKg = Math.PI * ((100 ** 2) - (90 ** 2)) / 4e6 * 7850;
const expectedInsulationKg = Math.PI * ((120 ** 2) - (100 ** 2)) / 4e6 * 120;
const expectedFluidKg = Math.PI * (90 ** 2) / 4e6 * 800;
assert.ok(Math.abs(pipe.formula.metalKg - expectedMetalKg) < 1e-12);
assert.ok(Math.abs(pipe.formula.insulationKg - expectedInsulationKg) < 1e-12);
assert.ok(Math.abs(pipe.formula.fluidKg - expectedFluidKg) < 1e-12);
assert.equal(valve.massKg, 10);
assert.equal(pipe.formula.outsideDiameterMm, 100);
assert.equal(pipe.formula.insideDiameterMm, 90);
assert(pipe.formula.projectDataSources.every((row) => (
  row.evidence?.source === 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER'
)));
assert(valve.formula.projectDataSources.every((row) => (
  row.evidence?.source === 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER'
)));

const changedLedger = makeLedger({ wallThicknessMm: 6 });
const changedInput = makeAuthorizedInput(changedLedger);
const changedProjection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: changedInput,
  dataset,
  profile: buildAuthorizedEmpiricalLoadProfile(profile, changedInput),
});
assert.notEqual(changedProjection.semanticHash, projection.semanticHash,
  'selected effective-value change must change execution projection hash');
assert.equal(projectDataValue(changedProjection.profile, 'loadCalculation.pipeSectionProperties')['L-1'].wallThicknessMm, 6);

const ambiguousDataset = structuredClone(dataset);
ambiguousDataset.entities.push({
  entityId: 'valve-duplicate',
  entityType: 'VALVE',
  lineKey: 'L-1',
  sourceEntityId: 'VALVE-SRC',
  jsonPointer: '/items/2',
  componentReference: 'VALVE-DUP',
  properties: { attributes: { CATALOG_KEY: 'LEGACY-DUPLICATE' } },
});
assert.throws(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput,
    dataset: ambiguousDataset,
    profile: compatibilityProfile,
  }),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_COMPONENT_TARGET_AMBIGUOUS',
);

const badUnitLedger = makeLedger({ componentWeightUnit: 'lb' });
const badUnitInput = makeAuthorizedInput(badUnitLedger);
assert.throws(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput: badUnitInput,
    dataset,
    profile: buildAuthorizedEmpiricalLoadProfile(profile, badUnitInput),
  }),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_EXECUTION_UNIT_UNSUPPORTED',
);

console.log(JSON.stringify({
  status: 'PASS',
  projectionSemanticHash: projection.semanticHash,
  executionSemanticHash: execution.semanticHash,
  effectiveExecutionProjectionSemanticHash: execution.effectiveExecutionProjectionSemanticHash,
  pipeMassKg: pipe.massKg,
  valveMassKg: valve.massKg,
  defaultSelectorsEmitted: false,
  sourceProfileImmutable: JSON.stringify(profile) === profileBefore,
  sourceDatasetImmutable: JSON.stringify(dataset) === datasetBefore,
}, null, 2));

function makeLedger({ wallThicknessMm = 5, componentWeightUnit = 'kg' } = {}) {
  const candidates = [
    lineCandidate('PIPE_OUTER_DIAMETER', 100, 'mm', 'EXACT_APPROVED_MASTER'),
    lineCandidate('PIPE_WALL_THICKNESS', wallThicknessMm, 'mm', 'ACCEPTED_OVERRIDE'),
    lineCandidate('MATERIAL_DENSITY', 7850, 'kg/m3', 'EXACT_APPROVED_MASTER'),
    lineCandidate('OPERATING_FLUID_DENSITY', 800, 'kg/m3', 'EXACT_APPROVED_MASTER'),
    lineCandidate('HYDRO_FLUID_DENSITY', 1000, 'kg/m3', 'EXACT_APPROVED_MASTER'),
    lineCandidate('INSULATION_THICKNESS', 10, 'mm', 'EXACT_APPROVED_MASTER'),
    lineCandidate('INSULATION_DENSITY', 120, 'kg/m3', 'EXACT_APPROVED_MASTER'),
    createNonFeaEffectiveValueCandidate({
      candidateId: `COMPONENT:VALVE-1:COMPONENT_WEIGHT:${componentWeightUnit}`,
      targetKind: 'COMPONENT',
      targetId: 'COMPONENT:VALVE-1',
      fieldId: 'COMPONENT_WEIGHT',
      value: 10,
      unit: componentWeightUnit,
      authority: 'EXACT_APPROVED_MASTER',
      sourceId: 'WEIGHT-MASTER:VALVE-1',
      evidence: { source: 'fixture weight master' },
    }),
  ];
  const resolved = resolveNonFeaEffectiveValues({ candidates });
  assert.equal(resolved.status, 'RESOLVED');
  const material = {
    schema: AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
    handoffSemanticHash: SH.handoff,
    baselineSemanticHash: SH.baseline,
    resolutionSemanticHash: resolved.semanticHash,
    status: resolved.status,
    rows: resolved.rows,
    summary: resolved.summary,
  };
  return Object.freeze({ ...material, semanticHash: semanticHash(material) });
}

function lineCandidate(fieldId, value, unit, authority) {
  return createNonFeaEffectiveValueCandidate({
    candidateId: `LINE:L-1:${fieldId}:${authority}`,
    targetKind: 'LINE',
    targetId: 'LINE:L-1',
    fieldId,
    value,
    unit,
    authority,
    sourceId: `${authority}:L-1:${fieldId}`,
    evidence: { source: 'fixture effective authority' },
  });
}

function makeAuthorizedInput(effectiveValueLedger) {
  const loadCalculationOverlay = {
    pipeSectionProperties: {
      'L-1': {
        outsideDiameterMm: 20,
        wallThicknessMm: 1,
        materialCode: 'LEGACY-MAT',
        insulationCode: 'LEGACY-INS',
        insulationThicknessMm: 1,
      },
    },
    materialDensitiesKgPerM3: { 'LEGACY-MAT': 100 },
    operatingFluidDensitiesKgPerM3: { 'L-1': 100 },
    hydroFluidDensitiesKgPerM3: { 'L-1': 100 },
    insulationDensitiesKgPerM3: { 'LEGACY-INS': 10 },
    componentWeightsKg: { 'LEGACY-CATALOG': 1 },
  };
  const draft = {
    schema: 'authorized-empirical-load-input/v1',
    intakeId: 'effective-intake-001',
    projectId: 'project-effective-001',
    baselineId: 'baseline-effective-001',
    baselineRevision: 1,
    baselineSemanticHash: SH.baseline,
    readinessEvaluationSemanticHash: SH.readinessEvaluation,
    readinessSemanticHash: SH.readiness,
    handoffSemanticHash: SH.handoff,
    projectionPayloadSemanticHash: SH.payload,
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: SH.configuration,
    createdAt: '2026-08-22T09:29:00.000Z',
    lineBindings: [{
      targetId: 'LINE:L-1',
      sourceRecordId: 'PIPE-SRC',
      lineKey: 'L-1',
      projectionRecordSemanticHash: SH.lineRecord,
    }],
    componentBindings: [{
      targetId: 'COMPONENT:VALVE-1',
      sourceRecordId: 'VALVE-SRC',
      lineKey: 'L-1',
      catalogKey: 'LEGACY-CATALOG',
      projectionRecordSemanticHash: SH.componentRecord,
    }],
    loadCalculationOverlay,
    overlaySemanticHash: semanticHash(loadCalculationOverlay),
    effectiveValueLedger,
    summary: {
      lineCount: 1,
      componentCount: 1,
      materialCodeCount: 1,
      insulationCodeCount: 1,
      componentCatalogCount: 1,
    },
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return Object.freeze({
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadInputSemanticHash(draft),
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
    projectId: 'project-effective-001',
    revision: 4,
    updatedAt: '2026-08-22T09:28:00.000Z',
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
      materialDensitiesKgPerM3: approved({ 'RAW-MATERIAL': 1 }, 'RAW_PROJECT_DATA_SENTINEL'),
      pipeSectionProperties: approved({ 'RAW-LINE': { outsideDiameterMm: 10, wallThicknessMm: 1, materialCode: 'RAW-MATERIAL', insulationCode: 'RAW-INS', insulationThicknessMm: 1 } }, 'RAW_PROJECT_DATA_SENTINEL'),
      operatingFluidDensitiesKgPerM3: approved({ 'RAW-LINE': 1 }, 'RAW_PROJECT_DATA_SENTINEL'),
      hydroFluidDensitiesKgPerM3: approved({ 'RAW-LINE': 1 }, 'RAW_PROJECT_DATA_SENTINEL'),
      insulationDensitiesKgPerM3: approved({ 'RAW-INS': 1 }, 'RAW_PROJECT_DATA_SENTINEL'),
      componentWeightsKg: approved({ 'RAW-COMP': 1 }, 'RAW_PROJECT_DATA_SENTINEL'),
      equilibriumTolerances: approved({ forceN: 1e-8, momentNmm: 1e-5 }, 'FIXTURE_LOAD_POLICY'),
      activeLoadCases: approved(['OPE'], 'FIXTURE_LOAD_POLICY'),
    },
  };
}

function makeDataset() {
  return {
    datasetId: 'dataset-effective-001',
    version: 1,
    sourceSha256: HASHES.dataset,
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
        properties: { attributes: { CATALOG_KEY: 'LEGACY-CATALOG' } },
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
        { entityId: 'pipe-1', startMm: 0, endMm: 1000, pointMm: 500, sourceStartChainageMm: 0, sourceEndChainageMm: 1000 },
        { entityId: 'valve-1', startMm: 500, endMm: 500, pointMm: 500, sourceStartChainageMm: 500, sourceEndChainageMm: 500 },
      ],
    }],
    edges: [
      { entityId: 'pipe-1', entityType: 'PIPE', lengthMm: 1000, pointComponent: false, topologyCarrier: false, startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 1000, y: 0, z: 0 } },
      { entityId: 'valve-1', entityType: 'VALVE', lengthMm: 0, pointComponent: true, topologyCarrier: false, startMm: { x: 500, y: 0, z: 0 }, endMm: { x: 500, y: 0, z: 0 } },
    ],
  };
}
