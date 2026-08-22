#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  COMMON_ENRICHED_CANDIDATE_SCHEMA,
  COMMON_ENRICHED_CANDIDATE_STATUS,
  COMMON_ENRICHED_CONSUMER_HANDOFF_DECISION_SCHEMA,
  COMMON_ENRICHED_CONSUMER_HANDOFF_SCHEMA,
  COMMON_ENRICHED_CONSUMER_POLICY_SCHEMA,
  COMMON_ENRICHED_CONSUMER_PROJECTION_BUILD_SCHEMA,
  COMMON_ENRICHED_CONSUMER_PROJECTION_FIELD_SCHEMA,
  COMMON_ENRICHED_CONSUMER_PROJECTION_POLICY_SCHEMA,
  COMMON_ENRICHED_CONSUMER_READINESS_EVALUATION_SCHEMA,
  COMMON_ENRICHED_CONSUMER_REQUIREMENT_SCHEMA,
  COMMON_ENRICHED_PUBLICATION_DECISION_SCHEMA,
  COMMON_ENRICHED_PUBLICATION_ORCHESTRATION_SCHEMA,
  COMMON_ENRICHED_SOURCE_BINDING_SCHEMA,
  COMMON_ENRICHED_TARGET_RECORD_SCHEMA,
  createCommonEnrichedConsumerHandoff,
  createCommonEnrichedConsumerProjectionDescriptor,
  createCommonEnrichedConsumerProjectionPayload,
  createCommonEnrichedPropertiesCandidate,
  createCommonEnrichedTargetRecord,
  evaluateCommonEnrichedConsumerReadiness,
  orchestrateCommonEnrichedPublication,
} from '../src/core/common-enriched-properties/index.js';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  authorityFromCommonEnrichedSourceKind,
  createAuthorizedEmpiricalEffectiveValueLedger,
  findAuthorizedEmpiricalEffectiveValue,
  requireAuthorizedEmpiricalEffectiveValueLedger,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js';

const FIELD_SCHEMA = 'common-enriched-properties-field/v1';
const PROJECT = 'PROJECT-EFFECTIVE-LEDGER';
const MODEL_HASH = semanticHash({ model: PROJECT });
const HASH = Object.freeze({
  model: '1'.repeat(64),
  lineList: '2'.repeat(64),
  material: '3'.repeat(64),
  fluid: '4'.repeat(64),
  insulation: '5'.repeat(64),
  componentWeight: '6'.repeat(64),
  review: '7'.repeat(64),
});

assert.equal(authorityFromCommonEnrichedSourceKind('MODEL'), 'SOURCE_EXPLICIT');
assert.equal(authorityFromCommonEnrichedSourceKind('LINE_LIST'), 'EXACT_APPROVED_MASTER');
assert.equal(authorityFromCommonEnrichedSourceKind('PIPING_CLASS'), 'EXACT_APPROVED_MASTER');
assert.equal(authorityFromCommonEnrichedSourceKind('MATERIAL_REGISTER'), 'EXACT_APPROVED_MASTER');
assert.equal(authorityFromCommonEnrichedSourceKind('FLUID_REGISTER'), 'EXACT_APPROVED_MASTER');
assert.equal(authorityFromCommonEnrichedSourceKind('INSULATION_REGISTER'), 'EXACT_APPROVED_MASTER');
assert.equal(authorityFromCommonEnrichedSourceKind('COMPONENT_WEIGHT_MASTER'), 'EXACT_APPROVED_MASTER');
assert.equal(authorityFromCommonEnrichedSourceKind('DERIVATION_POLICY'), 'CONFIGURED_DERIVATION');
assert.equal(authorityFromCommonEnrichedSourceKind('MANUAL_REVIEW'), 'ACCEPTED_OVERRIDE');
assert.throws(
  () => authorityFromCommonEnrichedSourceKind('NONE'),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_SOURCE_KIND_UNSUPPORTED',
);

const line = createCommonEnrichedTargetRecord({
  schema: COMMON_ENRICHED_TARGET_RECORD_SCHEMA,
  targetId: 'LINE:L-100',
  targetKind: 'LINE',
  sourceModelHash: MODEL_HASH,
  sourceRecordId: 'L-100',
  lineKey: 'L-100',
  fields: [
    field('fluid.hydroDensityKgM3', 1000, 'kg/m3', 'FLUID_REGISTER', 'fluid', HASH.fluid),
    field('fluid.operatingDensityKgM3', 850, 'kg/m3', 'FLUID_REGISTER', 'fluid', HASH.fluid),
    field('insulation.densityKgM3', 160, 'kg/m3', 'INSULATION_REGISTER', 'insulation', HASH.insulation),
    field('insulation.thicknessMm', 50, 'mm', 'LINE_LIST', 'lineList', HASH.lineList),
    field('material.densityKgM3', 7850, 'kg/m3', 'MATERIAL_REGISTER', 'material', HASH.material),
    field('pipe.outsideDiameterMm', 168.3, 'mm', 'MODEL', 'model', HASH.model),
    field('pipe.wallThicknessMm', 7.11, 'mm', 'MANUAL_REVIEW', 'review', HASH.review, 'REVIEW-42'),
  ].sort(byField),
});
const component = createCommonEnrichedTargetRecord({
  schema: COMMON_ENRICHED_TARGET_RECORD_SCHEMA,
  targetId: 'COMPONENT:VALVE-1',
  targetKind: 'COMPONENT',
  sourceModelHash: MODEL_HASH,
  sourceRecordId: 'VALVE-1',
  lineKey: 'L-100',
  fields: [
    field('component.weightKg', 42, 'kg', 'COMPONENT_WEIGHT_MASTER', 'weightMaster', HASH.componentWeight),
  ],
});

const sourceSnapshots = [
  sourceBinding('model', HASH.model),
  sourceBinding('lineList', HASH.lineList),
  sourceBinding('material', HASH.material),
  sourceBinding('fluid', HASH.fluid),
  sourceBinding('insulation', HASH.insulation),
  sourceBinding('weightMaster', HASH.componentWeight),
  sourceBinding('review', HASH.review),
].sort((a, b) => ascii(a.sourceKey, b.sourceKey));

const candidate = createCommonEnrichedPropertiesCandidate({
  schema: COMMON_ENRICHED_CANDIDATE_SCHEMA,
  candidateId: 'CAND-EFFECTIVE-LEDGER',
  projectId: PROJECT,
  revision: 3,
  createdAt: '2026-08-22T09:00:00.000Z',
  status: COMMON_ENRICHED_CANDIDATE_STATUS,
  sourceModelHash: MODEL_HASH,
  sourceSnapshots,
  targetRecords: [component, line].sort((a, b) => ascii(a.targetId, b.targetId)),
  reviewLedgerHash: semanticHash({ review: 'EFFECTIVE-LEDGER' }),
});
const baseline = orchestrateCommonEnrichedPublication({
  schema: COMMON_ENRICHED_PUBLICATION_ORCHESTRATION_SCHEMA,
  transactionId: 'PUB-EFFECTIVE-LEDGER',
  candidate,
  decision: {
    schema: COMMON_ENRICHED_PUBLICATION_DECISION_SCHEMA,
    decisionId: 'DEC-PUB-EFFECTIVE-LEDGER',
    candidateSemanticHash: candidate.semanticHash,
    decision: 'APPROVE',
    authorityId: 'AUTHORITY:ENGINEERING',
    decidedAt: '2026-08-22T09:01:00.000Z',
    evidenceHash: candidate.reviewLedgerHash,
  },
  previousBaseline: null,
  publicationIdentity: {
    baselineId: 'BASE-EFFECTIVE-LEDGER',
    publishedAt: '2026-08-22T09:02:00.000Z',
  },
}).baseline;

const projectionFields = [
  projection('hydroFluidDensityKgM3', 'LINE', 'fluid.hydroDensityKgM3'),
  projection('operatingFluidDensityKgM3', 'LINE', 'fluid.operatingDensityKgM3'),
  projection('insulationDensityKgM3', 'LINE', 'insulation.densityKgM3'),
  projection('insulationThicknessMm', 'LINE', 'insulation.thicknessMm'),
  projection('materialDensityKgM3', 'LINE', 'material.densityKgM3'),
  projection('outsideDiameterMm', 'LINE', 'pipe.outsideDiameterMm'),
  projection('wallThicknessMm', 'LINE', 'pipe.wallThicknessMm'),
  projection('weightKg', 'COMPONENT', 'component.weightKg'),
].sort((a, b) => ascii(a.outputField, b.outputField));
const requirements = projectionFields.map((row) => requirement(row.targetKind, row.sourceField))
  .sort((a, b) => ascii(a.requirementId, b.requirementId));
const configurationHash = semanticHash({ consumer: 'EMPIRICAL_LOADS', requirements });
const evaluation = evaluateCommonEnrichedConsumerReadiness({
  schema: COMMON_ENRICHED_CONSUMER_READINESS_EVALUATION_SCHEMA,
  evaluationId: 'READY-EFFECTIVE-LEDGER',
  baseline,
  currentSourceModelHash: MODEL_HASH,
  currentSourceSnapshots: sourceSnapshots,
  policies: [
    policy('EMPIRICAL_LOADS', true, requirements, configurationHash),
    policy('ENRICHED_STAGED_JSON_EXPORT', false, []),
    policy('LFEA_HANDOFF', false, []),
  ],
});
const readiness = evaluation.readiness.find((row) => row.consumer === 'EMPIRICAL_LOADS');
assert.equal(readiness.status, 'READY');
const payload = createCommonEnrichedConsumerProjectionPayload({
  schema: COMMON_ENRICHED_CONSUMER_PROJECTION_BUILD_SCHEMA,
  payloadId: 'PAYLOAD-EFFECTIVE-LEDGER',
  baseline,
  readinessEvaluation: evaluation,
  policy: {
    schema: COMMON_ENRICHED_CONSUMER_PROJECTION_POLICY_SCHEMA,
    consumer: 'EMPIRICAL_LOADS',
    payloadSchema: 'advanced-analysis-empirical-load-input/v1',
    adapterVersion: readiness.adapterVersion,
    configurationHash: readiness.configurationHash,
    fields: projectionFields,
  },
  createdAt: '2026-08-22T09:03:00.000Z',
});
const handoff = createCommonEnrichedConsumerHandoff({
  schema: COMMON_ENRICHED_CONSUMER_HANDOFF_SCHEMA,
  handoffId: 'HANDOFF-EFFECTIVE-LEDGER',
  consumer: 'EMPIRICAL_LOADS',
  baseline,
  readinessEvaluation: evaluation,
  payload: createCommonEnrichedConsumerProjectionDescriptor(payload),
  decision: {
    schema: COMMON_ENRICHED_CONSUMER_HANDOFF_DECISION_SCHEMA,
    decisionId: 'DEC-HANDOFF-EFFECTIVE-LEDGER',
    consumer: 'EMPIRICAL_LOADS',
    baselineSemanticHash: baseline.semanticHash,
    readinessSemanticHash: readiness.semanticHash,
    payloadSemanticHash: payload.semanticHash,
    decision: 'AUTHORIZE',
    authorityId: 'AUTHORITY:EMPIRICAL-GATEKEEPER',
    decidedAt: '2026-08-22T09:04:00.000Z',
    evidenceHash: semanticHash({ handoff: payload.semanticHash }),
  },
});

const ledger = createAuthorizedEmpiricalEffectiveValueLedger(handoff);
assert.deepEqual(requireAuthorizedEmpiricalEffectiveValueLedger(ledger), ledger);
assert.equal(ledger.status, 'RESOLVED');
assert.equal(ledger.summary.rowCount, 8);
assert.equal(ledger.summary.resolvedCount, 8);
assert.equal(ledger.handoffSemanticHash, handoff.semanticHash);
assert.equal(ledger.baselineSemanticHash, baseline.semanticHash);

const od = findAuthorizedEmpiricalEffectiveValue(ledger, 'LINE', 'LINE:L-100', 'PIPE_OUTER_DIAMETER');
const wall = findAuthorizedEmpiricalEffectiveValue(ledger, 'LINE', 'LINE:L-100', 'PIPE_WALL_THICKNESS');
const material = findAuthorizedEmpiricalEffectiveValue(ledger, 'LINE', 'LINE:L-100', 'MATERIAL_DENSITY');
const componentWeight = findAuthorizedEmpiricalEffectiveValue(ledger, 'COMPONENT', 'COMPONENT:VALVE-1', 'COMPONENT_WEIGHT');
assert.equal(od.value, 168.3);
assert.equal(od.unit, 'mm');
assert.equal(od.authority, 'SOURCE_EXPLICIT');
assert.equal(wall.value, 7.11);
assert.equal(wall.authority, 'ACCEPTED_OVERRIDE');
assert.equal(wall.evidence.reviewEventId, 'REVIEW-42');
assert.equal(material.authority, 'EXACT_APPROVED_MASTER');
assert.equal(componentWeight.authority, 'EXACT_APPROVED_MASTER');
assert.equal(componentWeight.evidence.scope.targetId, 'COMPONENT:VALVE-1');

const tampered = structuredClone(ledger);
tampered.rows[0].selected.value = 999;
assert.throws(
  () => requireAuthorizedEmpiricalEffectiveValueLedger(tampered),
  (error) => error?.code === 'EMPIRICAL_EFFECTIVE_VALUE_LEDGER_HASH_MISMATCH',
);

console.log(JSON.stringify({
  status: 'PASS',
  schema: ledger.schema,
  semanticHash: ledger.semanticHash,
  rowCount: ledger.summary.rowCount,
  odAuthority: od.authority,
  wallAuthority: wall.authority,
  materialAuthority: material.authority,
  componentWeightAuthority: componentWeight.authority,
}, null, 2));

function field(name, value, unit, sourceKind, sourceKey, sourceHash, reviewEventId = null) {
  return {
    schema: FIELD_SCHEMA,
    field: name,
    value,
    unit,
    status: 'RESOLVED_EXACT',
    sourceKind,
    sourceKey,
    sourceHash,
    locator: `${sourceKey}:${name}`,
    matchMethod: 'EXACT_KEY',
    confidence: 1,
    policyId: null,
    policyHash: null,
    reviewEventId,
    approved: true,
    diagnostics: [],
  };
}

function sourceBinding(sourceKey, sourceHash) {
  return {
    schema: COMMON_ENRICHED_SOURCE_BINDING_SCHEMA,
    sourceKey,
    sourceHash,
    snapshotSemanticHash: semanticHash({ sourceKey, sourceHash }),
  };
}

function projection(outputField, targetKind, sourceField) {
  return {
    schema: COMMON_ENRICHED_CONSUMER_PROJECTION_FIELD_SCHEMA,
    outputField,
    targetKind,
    sourceField,
    allowNotApplicable: false,
  };
}

function requirement(targetKind, fieldName) {
  return {
    schema: COMMON_ENRICHED_CONSUMER_REQUIREMENT_SCHEMA,
    requirementId: `${targetKind}:${fieldName}`,
    targetKind,
    field: fieldName,
    allowNotApplicable: false,
  };
}

function policy(consumer, configured, requirements, configurationHash = semanticHash({ consumer, configured, requirements })) {
  return {
    schema: COMMON_ENRICHED_CONSUMER_POLICY_SCHEMA,
    consumer,
    configured,
    adapterVersion: '1.0.0',
    configurationHash,
    requirements,
  };
}

function byField(a, b) { return ascii(a.field, b.field); }
function ascii(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
