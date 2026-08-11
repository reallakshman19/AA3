import { SharedAnalysisContractError } from '../shared-analysis-contract/errors.js';
import { cleanNumber, finiteNumber } from '../shared-analysis-contract/numeric.js';
import { exactKeys } from '../shared-analysis-contract/validation.js';
import {
  canonicalVector3,
  cross,
  dot,
  norm,
  scale,
} from '../shared-analysis-contract/vector3.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';

export const SUPPORT_ACTION_TRIAD_SCHEMA = 'linear-piping-support-action-triad/v1';
export const SUPPORT_ACTION_TRIAD_STATUS = Object.freeze({
  RESOLVED: 'RESOLVED',
  BLOCKED_AXIS_DEGENERATE: 'BLOCKED_AXIS_DEGENERATE',
});
export const SUPPORT_ACTION_TRIAD_REASON = Object.freeze({
  AXIAL_PARALLEL_TO_VERTICAL: 'AXIAL_PARALLEL_TO_VERTICAL',
});
export const SUPPORT_ACTION_TRIAD_INPUT_KEYS = Object.freeze([
  'forceGlobal',
  'tangentGlobal',
  'upGlobal',
  'parallelTolerance',
]);
export const SUPPORT_ACTION_TRIAD_KEYS = Object.freeze([
  'schema',
  'status',
  'reason',
  'parallelTolerance',
  'alignment',
  'forceGlobal',
  'axialUnit',
  'upUnit',
  'lateralUnit',
  'verticalUnit',
  'fAxial',
  'fLateral',
  'fVertical',
  'semanticHash',
]);

export class LinearPipingSupportActionTriadError extends SharedAnalysisContractError {
  constructor(message, code) {
    super(message, code);
    this.name = 'LinearPipingSupportActionTriadError';
  }
}

/**
 * Project a recovered global interface force into the engineering support-action
 * triad: axial along the pipe tangent, lateral normal to the gravity/tangent
 * plane, and vertical as gravity-up projected into the plane normal to axial.
 *
 * This package deliberately consumes forceGlobal. The frame-element forceLocal
 * e2/e3 axes are reference-vector construction artifacts and are not an
 * engineering lateral/vertical definition.
 */
export function projectSupportActionTriad(input) {
  exactKeys(input, SUPPORT_ACTION_TRIAD_INPUT_KEYS, 'supportActionTriadInput');
  const material = buildSupportActionTriad({
    forceGlobal: canonicalVector3(input.forceGlobal, 'supportActionTriadInput.forceGlobal'),
    tangentGlobal: canonicalVector3(input.tangentGlobal, 'supportActionTriadInput.tangentGlobal'),
    upGlobal: canonicalVector3(input.upGlobal, 'supportActionTriadInput.upGlobal'),
    parallelTolerance: requireParallelTolerance(input.parallelTolerance),
  });
  return sealSupportActionTriad(material);
}

export function requireSupportActionTriad(value) {
  exactKeys(value, SUPPORT_ACTION_TRIAD_KEYS, 'supportActionTriad');
  if (value.schema !== SUPPORT_ACTION_TRIAD_SCHEMA) {
    fail('supportActionTriad.schema is invalid.', 'SUPPORT_ACTION_TRIAD_SCHEMA_INVALID');
  }
  const expectedHash = computeSupportActionTriadSemanticHash(value);
  if (value.semanticHash !== expectedHash) {
    fail('supportActionTriad semantic hash is stale.', 'SUPPORT_ACTION_TRIAD_HASH_MISMATCH');
  }

  const forceGlobal = canonicalVector3(value.forceGlobal, 'supportActionTriad.forceGlobal');
  const axialUnit = canonicalVector3(value.axialUnit, 'supportActionTriad.axialUnit');
  const upUnit = canonicalVector3(value.upUnit, 'supportActionTriad.upUnit');
  const parallelTolerance = requireParallelTolerance(value.parallelTolerance);
  const expected = buildSupportActionTriad({
    forceGlobal,
    tangentGlobal: axialUnit,
    upGlobal: upUnit,
    parallelTolerance,
  });
  if (semanticHash(expected) !== semanticHash(withoutSemanticHash(value))) {
    fail('supportActionTriad content is inconsistent with its declared directions.', 'SUPPORT_ACTION_TRIAD_CONTENT_MISMATCH');
  }
  return deepFreeze({ ...value });
}

export function computeSupportActionTriadSemanticHash(value) {
  return semanticHash(withoutSemanticHash(value));
}

function buildSupportActionTriad({ forceGlobal, tangentGlobal, upGlobal, parallelTolerance }) {
  const axialUnit = normalizeDirection(tangentGlobal, 'tangentGlobal');
  const upUnit = normalizeDirection(upGlobal, 'upGlobal');
  const alignment = cleanNumber(Math.min(1, Math.abs(dot(axialUnit, upUnit))));
  const fAxial = dot(forceGlobal, axialUnit);

  if (alignment >= 1 - parallelTolerance) {
    return {
      schema: SUPPORT_ACTION_TRIAD_SCHEMA,
      status: SUPPORT_ACTION_TRIAD_STATUS.BLOCKED_AXIS_DEGENERATE,
      reason: SUPPORT_ACTION_TRIAD_REASON.AXIAL_PARALLEL_TO_VERTICAL,
      parallelTolerance,
      alignment,
      forceGlobal,
      axialUnit,
      upUnit,
      lateralUnit: null,
      verticalUnit: null,
      fAxial,
      fLateral: null,
      fVertical: null,
    };
  }

  const lateralUnit = normalizeDirection(cross(upUnit, axialUnit), 'lateralUnit');
  const verticalUnit = normalizeDirection(cross(axialUnit, lateralUnit), 'verticalUnit');
  return {
    schema: SUPPORT_ACTION_TRIAD_SCHEMA,
    status: SUPPORT_ACTION_TRIAD_STATUS.RESOLVED,
    reason: null,
    parallelTolerance,
    alignment,
    forceGlobal,
    axialUnit,
    upUnit,
    lateralUnit,
    verticalUnit,
    fAxial,
    fLateral: dot(forceGlobal, lateralUnit),
    fVertical: dot(forceGlobal, verticalUnit),
  };
}

function sealSupportActionTriad(material) {
  const draft = { ...material, semanticHash: semanticHash(material) };
  return requireSupportActionTriad(draft);
}

function withoutSemanticHash(value) {
  const { semanticHash: _semanticHash, ...projection } = value;
  return projection;
}

function requireParallelTolerance(value) {
  const tolerance = finiteNumber(value, 'supportActionTriad.parallelTolerance');
  if (!(tolerance > 0 && tolerance < 1)) {
    fail('parallelTolerance must be greater than zero and less than one.', 'SUPPORT_ACTION_TRIAD_TOLERANCE_INVALID');
  }
  return tolerance;
}

function normalizeDirection(vector, label) {
  const magnitude = norm(vector);
  if (!(magnitude > 0)) {
    fail(`${label} must have non-zero magnitude.`, 'SUPPORT_ACTION_TRIAD_DIRECTION_INVALID');
  }
  return scale(vector, 1 / magnitude);
}

function fail(message, code) {
  throw new LinearPipingSupportActionTriadError(message, code);
}
