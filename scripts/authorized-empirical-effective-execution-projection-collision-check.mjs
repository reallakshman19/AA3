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
  createAuthorizedEmpiricalEffectiveExecutionProjection,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js';

const SH = Object.freeze({
  baseline: 'fnv1a64:1111111111111111',
  readinessEvaluation: 'fnv1a64:2222222222222222',
  readiness: 'fnv1a64:3333333333333333',
  handoff: 'fnv1a64:4444444444444444',
  payload: 'fnv1a64:5555555555555555',
  configuration: 'fnv1a64:6666666666666666',
  line1: 'fnv1a64:7777777777777777',
  line2: 'fnv1a64:8888888888888888',
  component1: 'fnv1a64:9999999999999999',
  component2: 'fnv1a64:aaaaaaaaaaaaaaaa',
});

const authorizedInput = makeAuthorizedInput();
const dataset = makeDataset();
const profile = makeProfile();
const datasetBefore = structuredClone(dataset);
const profileBefore = structuredClone(profile);

const projection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput,
  dataset,
  profile,
});
assert.equal(projection.schema, 'authorized-empirical-effective-execution-projection/v1');
assert.equal(projection.lineMappings.length, 2);
assert.equal(projection.componentMappings.length, 2);
assert.equal(projection.effectiveValueLedgerSemanticHash, authorizedInput.effectiveValueLedger.semanticHash);

const sections = projection.profile.loadCalculation.pipeSectionProperties.value;
const material = projection.profile.loadCalculation.materialDensitiesKgPerM3.value;
const insulation = projection.profile.loadCalculation.insulationDensitiesKgPerM3.value;
const weights = projection.profile.loadCalculation.componentWeightsKg.value;

assert.notEqual(sections['L-1'].materialCode, sections['L-2'].materialCode,
  'same original material code must not collapse target-level density authority');
assert.equal(material[sections['L-1'].materialCode], 7850);
assert.equal(material[sections['L-2'].materialCode], 8000);
assert.notEqual(sections['L-1'].insulationCode, sections['L-2'].insulationCode,
  'same original insulation code must not collapse target-level density authority');
assert.equal(insulation[sections['L-1'].insulationCode], 120);
assert.equal(insulation[sections['L-2'].insulationCode], 135);
assert.equal(projection.profile.loadCalculation.operatingFluidDensitiesKgPerM3.value['L-1'], 800);
assert.equal(projection.profile.loadCalculation.operatingFluidDensitiesKgPerM3.value['L-2'], 850);

const valve1 = projection.dataset.entities.find((row) => row.entityId === 'valve-1');
const valve2 = projection.dataset.entities.find((row) => row.entityId === 'valve-2');
assert.notEqual(valve1.properties.attributes.CATALOG_KEY, valve2.properties.attributes.CATALOG_KEY,
  'same original catalog key must not collapse target-level component mass authority');
assert.equal(weights[valve1.properties.attributes.CATALOG_KEY], 10);
assert.equal(weights[valve2.properties.attributes.CATALOG_KEY], 20);
assert.equal(dataset.entities.find((row) => row.entityId === 'valve-1').properties.attributes.CATALOG_KEY, 'CV-1');
assert.equal(dataset.entities.find((row) => row.entityId === 'valve-2').properties.attributes.CATALOG_KEY, 'CV-1');

for (const field of [
  'pipeSectionProperties',
  'materialDensitiesKgPerM3',
  'operatingFluidDensitiesKgPerM3',
  'hydroFluidDensitiesKgPerM3',
  'insulationDensitiesKgPerM3',
  'componentWeightsKg',
]) {
  assert.equal(
    projection.profile.loadCalculation[field].evidence.source,
    'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER',
  );
  assert.equal(
    projection.profile.loadCalculation[field].evidence.sourceSemanticHash,
    authorizedInput.effectiveValueLedger.semanticHash,
  );
}

assert.deepEqual(dataset, datasetBefore, 'execution projection mutated the source dataset');
assert.deepEqual(profile, profileBefore, 'execution projection mutated the source Project Data profile');
assert.equal(projection.projectedDatasetSemanticHash, semanticHash(projection.dataset));
assert.equal(projection.projectedProfileSemanticHash, semanticHash(projection.profile));

const missingComponentDataset = structuredClone(dataset);
missingComponentDataset.entities = missingComponentDataset.entities.filter((row) => row.entityId !== 'valve-2');
assert.throws(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput,
    dataset: missingComponentDataset,
    profile,
  }),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_COMPONENT_TARGET_AMBIGUOUS'
    && error.details?.candidateEntityIds?.length === 0,
);

const ambiguousComponentDataset = structuredClone(dataset);
ambiguousComponentDataset.entities.find((row) => row.entityId === 'valve-2').sourceEntityId = 'src-valve-001';
assert.throws(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput,
    dataset: ambiguousComponentDataset,
    profile,
  }),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_COMPONENT_TARGET_AMBIGUOUS'
    && error.details?.candidateEntityIds?.length === 2,
);

const wrongUnitInput = makeAuthorizedInput({
  candidateTransform(candidate) {
    if (candidate.fieldId === 'PIPE_OUTER_DIAMETER' && candidate.targetId === 'line:002') {
      return { ...candidate, value: 0.2191, unit: 'm' };
    }
    return candidate;
  },
});
assert.throws(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput: wrongUnitInput,
    dataset,
    profile,
  }),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_EXECUTION_UNIT_UNSUPPORTED',
);

console.log(JSON.stringify({
  status: 'PASS',
  schema: projection.schema,
  semanticHash: projection.semanticHash,
  sameMaterialCodeDifferentEffectiveDensities: [
    material[sections['L-1'].materialCode],
    material[sections['L-2'].materialCode],
  ],
  sameInsulationCodeDifferentEffectiveDensities: [
    insulation[sections['L-1'].insulationCode],
    insulation[sections['L-2'].insulationCode],
  ],
  sameCatalogDifferentEffectiveMassesKg: [
    weights[valve1.properties.attributes.CATALOG_KEY],
    weights[valve2.properties.attributes.CATALOG_KEY],
  ],
  sourceDatasetImmutable: true,
  sourceProfileImmutable: true,
  missingIdentityFailsClosed: true,
  ambiguousIdentityFailsClosed: true,
  unitMismatchFailsClosed: true,
}, null, 2));

function makeAuthorizedInput({ candidateTransform = (row) => row } = {}) {
  const candidates = effectiveCandidates().map(candidateTransform).map(createNonFeaEffectiveValueCandidate);
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
        outsideDiameterMm: 168.3,
        wallThicknessMm: 7.11,
        materialCode: 'MAT-1',
        insulationCode: 'INS-1',
        insulationThicknessMm: 25,
      },
      'L-2': {
        outsideDiameterMm: 219.1,
        wallThicknessMm: 8.18,
        materialCode: 'MAT-1',
        insulationCode: 'INS-1',
        insulationThicknessMm: 25,
      },
    },
    materialDensitiesKgPerM3: { 'MAT-1': 7850 },
    operatingFluidDensitiesKgPerM3: { 'L-1': 800, 'L-2': 850 },
    hydroFluidDensitiesKgPerM3: { 'L-1': 1000, 'L-2': 1000 },
    insulationDensitiesKgPerM3: { 'INS-1': 120 },
    componentWeightsKg: { 'CV-1': 10 },
  };
  const draft = {
    schema: 'authorized-empirical-load-input/v1',
    intakeId: 'effective-projection-intake',
    projectId: 'effective-projection-project',
    baselineId: 'effective-projection-baseline',
    baselineRevision: 1,
    baselineSemanticHash: SH.baseline,
    readinessEvaluationSemanticHash: SH.readinessEvaluation,
    readinessSemanticHash: SH.readiness,
    handoffSemanticHash: SH.handoff,
    projectionPayloadSemanticHash: SH.payload,
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: SH.configuration,
    createdAt: '2026-08-22T10:15:00.000Z',
    lineBindings: [
      { targetId: 'line:001', sourceRecordId: 'src-line-001', lineKey: 'L-1', projectionRecordSemanticHash: SH.line1 },
      { targetId: 'line:002', sourceRecordId: 'src-line-002', lineKey: 'L-2', projectionRecordSemanticHash: SH.line2 },
    ],
    componentBindings: [
      { targetId: 'component:001', sourceRecordId: 'src-valve-001', lineKey: 'L-1', catalogKey: 'CV-1', projectionRecordSemanticHash: SH.component1 },
      { targetId: 'component:002', sourceRecordId: 'src-valve-002', lineKey: 'L-2', catalogKey: 'CV-1', projectionRecordSemanticHash: SH.component2 },
    ],
    loadCalculationOverlay,
    overlaySemanticHash: semanticHash(loadCalculationOverlay),
    effectiveValueLedger,
    summary: {
      lineCount: 2,
      componentCount: 2,
      materialCodeCount: 1,
      insulationCodeCount: 1,
      componentCatalogCount: 1,
    },
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return {
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadInputSemanticHash(draft),
  };
}

function effectiveCandidates() {
  const rows = [];
  addLine(rows, 'line:001', {
    od: 168.3,
    wall: 7.11,
    material: 7850,
    insulationThickness: 25,
    insulationDensity: 120,
    operating: 800,
    hydro: 1000,
  }, 'EXACT_APPROVED_MASTER');
  addLine(rows, 'line:002', {
    od: 219.1,
    wall: 8.18,
    material: 8000,
    insulationThickness: 25,
    insulationDensity: 135,
    operating: 850,
    hydro: 1000,
  }, 'ACCEPTED_OVERRIDE');
  rows.push(candidate('component:001', 'COMPONENT', 'COMPONENT_WEIGHT', 10, 'kg', 'EXACT_APPROVED_MASTER'));
  rows.push(candidate('component:002', 'COMPONENT', 'COMPONENT_WEIGHT', 20, 'kg', 'ACCEPTED_OVERRIDE'));
  return rows;
}

function addLine(rows, targetId, values, authority) {
  rows.push(candidate(targetId, 'LINE', 'PIPE_OUTER_DIAMETER', values.od, 'mm', authority));
  rows.push(candidate(targetId, 'LINE', 'PIPE_WALL_THICKNESS', values.wall, 'mm', authority));
  rows.push(candidate(targetId, 'LINE', 'MATERIAL_DENSITY', values.material, 'kg/m3', authority));
  rows.push(candidate(targetId, 'LINE', 'INSULATION_THICKNESS', values.insulationThickness, 'mm', authority));
  rows.push(candidate(targetId, 'LINE', 'INSULATION_DENSITY', values.insulationDensity, 'kg/m3', authority));
  rows.push(candidate(targetId, 'LINE', 'OPERATING_FLUID_DENSITY', values.operating, 'kg/m3', authority));
  rows.push(candidate(targetId, 'LINE', 'HYDRO_FLUID_DENSITY', values.hydro, 'kg/m3', authority));
}

function candidate(targetId, targetKind, fieldId, value, unit, authority) {
  return {
    candidateId: `${targetId}:${fieldId}:${authority}`,
    targetKind,
    targetId,
    fieldId,
    value,
    unit,
    authority,
    sourceId: `${authority}:${targetId}:${fieldId}`,
    evidence: { source: 'effective-execution-collision-falsifier' },
  };
}

function makeDataset() {
  return {
    datasetId: 'effective-projection-dataset',
    version: 1,
    sourceSha256: '1'.repeat(64),
    entities: [
      entity('pipe-1', 'PIPE', 'L-1', 'src-line-001', {}),
      entity('pipe-2', 'PIPE', 'L-2', 'src-line-002', {}),
      entity('valve-1', 'VALVE', 'L-1', 'src-valve-001', { CATALOG_KEY: 'CV-1' }),
      entity('valve-2', 'VALVE', 'L-2', 'src-valve-002', { CATALOG_KEY: 'CV-1' }),
    ],
  };
}

function entity(entityId, entityType, lineKey, sourceEntityId, attributes) {
  return {
    entityId,
    entityType,
    lineKey,
    sourceEntityId,
    jsonPointer: `/entities/${entityId}`,
    componentReference: entityId,
    properties: { attributes },
  };
}

function makeProfile() {
  const profile = createEmptyProjectDataProfile();
  const sentinel = (value, field) => createEvidenceValue(
    value,
    { source: 'RAW_PROJECT_DATA_SENTINEL', field },
    true,
  );
  return {
    ...profile,
    projectId: 'effective-projection-project',
    loadCalculation: {
      ...profile.loadCalculation,
      pipeSectionProperties: sentinel({ RAW: { outsideDiameterMm: 999, wallThicknessMm: 1 } }, 'pipeSectionProperties'),
      materialDensitiesKgPerM3: sentinel({ RAW: 999 }, 'materialDensitiesKgPerM3'),
      operatingFluidDensitiesKgPerM3: sentinel({ RAW: 999 }, 'operatingFluidDensitiesKgPerM3'),
      hydroFluidDensitiesKgPerM3: sentinel({ RAW: 999 }, 'hydroFluidDensitiesKgPerM3'),
      insulationDensitiesKgPerM3: sentinel({ RAW: 999 }, 'insulationDensitiesKgPerM3'),
      componentWeightsKg: sentinel({ RAW: 999 }, 'componentWeightsKg'),
    },
  };
}
