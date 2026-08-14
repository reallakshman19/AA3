/** Conservation acceptance evidence for an LAFEA.5 footprint transfer operator. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_FOOTPRINT_TRANSFER_QUALIFICATION_V3_SCHEMA =
  'lafea-footprint-transfer-qualification/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'hostMeshContentHash', 'footprintHash', 'transferOperatorHash',
  'lengthUnit', 'forceUnit', 'momentUnit', 'signConvention', 'referencePoint',
  'targetResultantForce', 'targetResultantMoment', 'discreteResultantForce',
  'discreteResultantMoment', 'footprintMeasure', 'mappedFootprintMeasure',
  'outsideHostMeasure', 'forceAbsTolerance', 'forceRelTolerance',
  'momentAbsTolerance', 'momentRelTolerance', 'supportAbsTolerance',
]);

export function qualifyLafeaFootprintTransferV3(value) {
  exact(value, KEYS, 'LAFEA_FOOTPRINT_TRANSFER_V3_KEYS_INVALID');
  const record = {
    schema: exactText(value.schema, LAFEA_FOOTPRINT_TRANSFER_QUALIFICATION_V3_SCHEMA, 'SCHEMA'),
    stageId: exactText(value.stageId, 'LAFEA.5', 'STAGE_ID'),
    hostMeshContentHash: sha256(value.hostMeshContentHash, 'HOST_MESH_CONTENT_HASH'),
    footprintHash: sha256(value.footprintHash, 'FOOTPRINT_HASH'),
    transferOperatorHash: sha256(value.transferOperatorHash, 'TRANSFER_OPERATOR_HASH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'), forceUnit: text(value.forceUnit, 'FORCE_UNIT'),
    momentUnit: text(value.momentUnit, 'MOMENT_UNIT'), signConvention: text(value.signConvention, 'SIGN_CONVENTION'),
    referencePoint: vector(value.referencePoint, 'REFERENCE_POINT'),
    targetResultantForce: vector(value.targetResultantForce, 'TARGET_RESULTANT_FORCE'),
    targetResultantMoment: vector(value.targetResultantMoment, 'TARGET_RESULTANT_MOMENT'),
    discreteResultantForce: vector(value.discreteResultantForce, 'DISCRETE_RESULTANT_FORCE'),
    discreteResultantMoment: vector(value.discreteResultantMoment, 'DISCRETE_RESULTANT_MOMENT'),
    footprintMeasure: finiteNonNegative(value.footprintMeasure, 'FOOTPRINT_MEASURE'),
    mappedFootprintMeasure: finiteNonNegative(value.mappedFootprintMeasure, 'MAPPED_FOOTPRINT_MEASURE'),
    outsideHostMeasure: finiteNonNegative(value.outsideHostMeasure, 'OUTSIDE_HOST_MEASURE'),
    forceAbsTolerance: finiteNonNegative(value.forceAbsTolerance, 'FORCE_ABS_TOLERANCE'),
    forceRelTolerance: finiteNonNegative(value.forceRelTolerance, 'FORCE_REL_TOLERANCE'),
    momentAbsTolerance: finiteNonNegative(value.momentAbsTolerance, 'MOMENT_ABS_TOLERANCE'),
    momentRelTolerance: finiteNonNegative(value.momentRelTolerance, 'MOMENT_REL_TOLERANCE'),
    supportAbsTolerance: finiteNonNegative(value.supportAbsTolerance, 'SUPPORT_ABS_TOLERANCE'),
  };
  const forceResidual = norm(sub(record.discreteResultantForce, record.targetResultantForce));
  const momentResidual = norm(sub(record.discreteResultantMoment, record.targetResultantMoment));
  const forceLimit = record.forceAbsTolerance + record.forceRelTolerance * norm(record.targetResultantForce);
  const momentLimit = record.momentAbsTolerance + record.momentRelTolerance * norm(record.targetResultantMoment);
  const supportResidual = Math.abs(record.mappedFootprintMeasure - record.footprintMeasure);
  const checks = freeze([
    check('RESULTANT_FORCE', forceResidual, forceLimit),
    check('RESULTANT_MOMENT', momentResidual, momentLimit),
    check('FOOTPRINT_SUPPORT_MEASURE', supportResidual, record.supportAbsTolerance),
    check('OUTSIDE_HOST_MEASURE', record.outsideHostMeasure, record.supportAbsTolerance),
  ]);
  const core = freeze({
    ...record, forceResidual, forceLimit, momentResidual, momentLimit, supportResidual, checks,
    qualification: checks.some((row) => row.status === 'BLOCK') ? 'BLOCK' : 'PASS',
  });
  return freeze({
    ...core,
    qualificationHash: canonicalLafeaSha256({
      schema: 'lafea-footprint-transfer-qualification-hash-input/v3', evidence: core,
    }),
    engineeringAuthority: false,
  });
}
function check(metric, value, limit) { return freeze({ metric, value, limit, status: value <= limit ? 'PASS' : 'BLOCK' }); }
function sub(a, b) { return a.map((value, index) => value - b[index]); }
function norm(value) { return Math.hypot(...value); }
function vector(value, field) { if (!Array.isArray(value) || value.length !== 3 || value.some((component) => !Number.isFinite(component))) fail(`LAFEA_FOOTPRINT_TRANSFER_V3_${field}_INVALID`); return freeze(value.map((component) => Object.is(component, -0) ? 0 : component)); }
function exact(value, keys, errorCode) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(errorCode); }
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_FOOTPRINT_TRANSFER_V3_${field}_INVALID`); return value.trim(); }
function exactText(value, expected, field) { if (value !== expected) fail(`LAFEA_FOOTPRINT_TRANSFER_V3_${field}_INVALID`); return value; }
function sha256(value, field) { const out = text(value, field); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_FOOTPRINT_TRANSFER_V3_${field}_INVALID`); return out; }
function finiteNonNegative(value, field) { if (!Number.isFinite(value) || value < 0) fail(`LAFEA_FOOTPRINT_TRANSFER_V3_${field}_INVALID`); return value; }
function fail(errorCode) { const error = new TypeError(errorCode); error.code = errorCode; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
