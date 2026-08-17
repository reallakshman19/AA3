import { compilePhysicalLoadCase } from '../linear-fea-load-case/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';

export function gravityPrimitive(binding, authority, direction, prepared) {
  const magnitude = authority.lineForcePerLength;
  const intensity = Object.freeze({
    fx: direction.x * magnitude,
    fy: direction.y * magnitude,
    fz: direction.z * magnitude,
  });
  return Object.freeze({
    schema: 'fea-linear-load-primitive/v1',
    primitiveId: `${binding.elementId}-W`,
    kind: 'DISTRIBUTED_LOAD',
    sourceEvidence: sourceEvidence({
      sourceId: authority.sourceEvidence.sourceId,
      sourceRevision: prepared.semanticHash,
      authoritySemanticHash: authority.semanticHash,
      gravityDirection: direction,
    }),
    elementId: binding.elementId,
    basis: 'GLOBAL',
    variation: 'UNIFORM',
    startIntensity: intensity,
    endIntensity: intensity,
    units: { distributedForce: 'N/m', length: 'm' },
  });
}

export function pressurePrimitive(binding, authority, prepared) {
  return Object.freeze({
    schema: 'fea-linear-load-primitive/v1',
    primitiveId: `${binding.elementId}-P1`,
    kind: 'PRESSURE',
    sourceEvidence: sourceEvidence({
      sourceId: authority.sourceEvidence.sourceId,
      sourceRevision: prepared.semanticHash,
      authoritySemanticHash: authority.semanticHash,
    }),
    elementId: binding.elementId,
    pressure: authority.pressure,
    pressureBasis: authority.pressureBasis,
    authorizedEffects: authority.authorizedEffects,
  });
}

export function thermalPrimitive(binding, authority, prepared) {
  return Object.freeze({
    schema: 'fea-linear-load-primitive/v1',
    primitiveId: `${binding.elementId}-T1`,
    kind: 'TEMPERATURE',
    sourceEvidence: sourceEvidence({
      sourceId: authority.sourceEvidence.sourceId,
      sourceRevision: prepared.semanticHash,
      authoritySemanticHash: authority.semanticHash,
    }),
    elementId: binding.elementId,
    operatingTemperature: authority.operatingTemperature,
    installationTemperature: authority.installationTemperature,
    stiffnessEvaluationMaterialStateId: binding.materialStateId,
    thermalStrainProfileId: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',
  });
}

export function caseRecord({
  structural,
  loadCaseProfile,
  modelReference,
  caseToken,
  caseRole,
  primitives,
  loadCaseClass,
  label,
  description,
}) {
  const caseId = `${structural.modelId}-${caseToken}`;
  const loadCase = compilePhysicalLoadCase({
    loadCaseId: caseId,
    loadCaseClass,
    presentation: { label, description },
    modelReference,
    primitives,
    profile: loadCaseProfile,
  });
  return Object.freeze({
    caseId,
    caseRole,
    primitiveIds: Object.freeze(loadCase.primitives.map((row) => row.primitiveId)),
    loadCase,
  });
}

export function loadLedgerRow(value) {
  return Object.freeze({
    ...value,
    primitiveIds: Object.freeze(value.primitiveIds),
    caseIds: Object.freeze([]),
    evidence: Object.freeze(value.evidence),
  });
}

export function indexPrimitiveCases(cases) {
  const index = new Map();
  for (const row of cases) {
    for (const primitiveId of row.primitiveIds) {
      if (!index.has(primitiveId)) index.set(primitiveId, []);
      index.get(primitiveId).push(row.caseId);
    }
  }
  return index;
}

export function physicalCaseError(code, message, data) {
  const error = new Error(message);
  error.name = 'InputXmlLinearPhysicalCasePreparationError';
  error.code = code;
  error.data = data;
  return error;
}

export function safePhysicalId(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/gu, '-');
}

export function uniqueAscii(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort(compareAscii);
}

export function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sourceEvidence(value) {
  return Object.freeze({
    sourceId: String(value.sourceId),
    sourceRevision: String(value.sourceRevision),
    sourceSemanticHash: semanticHash(value),
  });
}
