import { resolveSpringRate } from './restraint-spring-rate.js';
import {
  resolveRestraintTypeMutation,
  restraintTypeCodeLabel,
} from '../geometry/adapters/inputxml-restraint-type-mutation.js';
import {
  isCaesarUnsetSentinel,
  isUnfilledCaesarSlot,
} from '../geometry/adapters/caesar-unset-sentinel.js';
import {
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE as STRICT,
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE as APPROXIMATE,
  exactDisposition,
  approximationDisposition,
  unsupportedDisposition,
  nonlinearDisposition,
  invalidDisposition,
  inactiveDisposition,
} from './inputxml-model-health-profile.js';

export const NUMERIC_TOLERANCE = 1e-12;
const DIRECTION_TOLERANCE = 1e-9;
const RESTRAINT_DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const GENERIC_LINEARIZED_UNILATERAL_CODES = new Set(['13', '14', '15', '16', '17', '18']);
const EXACT_BIDIRECTIONAL_CODES = new Set(['2', '3', '5', '8', '9']);
const RESTRAINT_SLOT_IDENTITY_ATTRIBUTES = Object.freeze(['TYPE', 'NODE']);

export function classifyRestraint(attributes, element, segment, stiffnessToSi) {
  const unfilledSlot = isUnfilledCaesarSlot(attributes, RESTRAINT_SLOT_IDENTITY_ATTRIBUTES);
  const declaredType = attribute(attributes, ['TYPE']);
  const rawType = unfilledSlot ? null : declaredType;
  const mutation = resolveRestraintTypeMutation(rawType);
  const typeCode = mutation.typeCode;
  const nodeId = unfilledSlot
    ? null
    : normalizedNodeAttribute(attributes, ['NODE']) ?? element.toNodeId ?? element.fromNodeId ?? null;
  const direction = directionOf(attributes);
  const gap = caesarOptionalNumber(attributes, ['GAP', 'GAP1']);
  const friction = caesarOptionalNumber(attributes, ['FRIC_COEF', 'FRICTION', 'MU']);
  const connectingNodeId = normalizedNodeAttribute(attributes, ['CNODE', 'CONNECTING_NODE', 'NODE2']);
  const stiffness = caesarOptionalNumber(attributes, ['STIFF', 'STIFFNESS', 'K']);
  const targetDofs = targetDofsOf(typeCode, direction);
  const targetDof = targetDofs.length === RESTRAINT_DOFS.length ? 'ALL' : targetDofs[0] ?? null;
  const active = !unfilledSlot && (rawType !== null || nodeId !== null);
  return Object.freeze({
    active,
    unfilledSlot,
    rawType,
    typeCode,
    typeLabel: restraintTypeCodeLabel(typeCode),
    mutation,
    nodeId,
    targetDof,
    targetDofs: Object.freeze(targetDofs),
    direction,
    gapActive: finiteNonzero(gap),
    frictionActive: finitePositive(friction),
    connectingNodeActive: connectingNodeId !== null,
    connectingNodeId,
    finiteStiffnessActive: finitePositive(stiffness),
    ...resolveSpringRate(stiffness, stiffnessToSi),
    canonicalNodeRestraint: canonicalNodeRestraint(segment, nodeId),
  });
}

export function restraintDirectionalSpringDirection(classification) {
  if (!classification?.finiteStiffnessActive || classification.stiffnessValue === null) return null;
  if (!EXACT_BIDIRECTIONAL_CODES.has(classification.typeCode)) return null;
  if (!classification.direction?.valid || axisAlignedDirection(classification.direction)) return null;
  return Object.freeze([...classification.direction.unit]);
}

export function restraintDispositions(classification) {
  if (!classification.active) return both(inactiveDisposition());
  if (classification.typeCode === null || classification.typeLabel === null || classification.nodeId === null) {
    return both(invalidDisposition('MODEL_RESTRAINT_SOURCE_INVALID'));
  }
  if (classification.connectingNodeActive) {
    return both(unsupportedDisposition('MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED'));
  }

  const dropped = [];
  if (classification.gapActive) {
    dropped.push({ strict: 'MODEL_RESTRAINT_GAP_UNSUPPORTED', approximate: 'GENERIC_APPROX_GAP_CLOSED' });
  }
  if (classification.frictionActive) {
    dropped.push({ strict: 'MODEL_RESTRAINT_FRICTION_UNSUPPORTED', approximate: 'GENERIC_APPROX_FRICTION_IGNORED' });
  }
  const base = baseRestraintDispositions(classification);
  if (dropped.length === 0) return base;
  const approximate = base[APPROXIMATE];
  const compilable = approximate.disposition === 'IMPLEMENTED_EXACTLY'
    || approximate.disposition === 'IMPLEMENTED_WITH_DECLARED_APPROXIMATION';
  return {
    [STRICT]: nonlinearDisposition(dropped[0].strict),
    [APPROXIMATE]: compilable ? approximationDisposition(dropped[0].approximate) : approximate,
  };
}

const UNILATERAL_RESISTED_SIGN = Object.freeze({
  13: 1, 14: 1, 15: 1, 16: -1, 17: -1, 18: -1,
});

export function restraintUnilateralAction(classification) {
  const sign = UNILATERAL_RESISTED_SIGN[classification.typeCode] ?? null;
  if (sign === null) return null;
  if (classification.targetDofs.length !== 1) return null;
  return Object.freeze({ dof: classification.targetDofs[0], resistedSign: sign });
}

export function restraintApproximationCodes(classification) {
  const codes = [];
  if (classification.gapActive) codes.push('GENERIC_APPROX_GAP_CLOSED');
  if (classification.frictionActive) codes.push('GENERIC_APPROX_FRICTION_IGNORED');
  if (classification.finiteStiffnessActive) codes.push('DRAFT_SPRING_SUPPORT_NO_REFERENCE');
  const base = baseRestraintDispositions(classification)[APPROXIMATE];
  if (base.disposition === 'IMPLEMENTED_WITH_DECLARED_APPROXIMATION' && base.limitationCode) {
    codes.push(base.limitationCode);
  }
  return Object.freeze(codes);
}

function baseRestraintDispositions(classification) {
  if (classification.typeCode === '0') return both(exactDisposition());
  const singleAxis = classification.direction.valid && classification.targetDofs.length === 1;
  if (EXACT_BIDIRECTIONAL_CODES.has(classification.typeCode)) {
    if (!singleAxis) return both(invalidDisposition('MODEL_RESTRAINT_DIRECTION_INVALID'));
    if (!axisAlignedDirection(classification.direction)) {
      if (restraintDirectionalSpringDirection(classification) !== null) return both(exactDisposition());
      return both(unsupportedDisposition('MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED'));
    }
    return both(exactDisposition());
  }
  if (GENERIC_LINEARIZED_UNILATERAL_CODES.has(classification.typeCode)) {
    if (!singleAxis) return both(invalidDisposition('MODEL_RESTRAINT_DIRECTION_INVALID'));
    if (!axisAlignedDirection(classification.direction)) {
      return {
        [STRICT]: nonlinearDisposition('MODEL_RESTRAINT_UNILATERAL_UNSUPPORTED'),
        [APPROXIMATE]: unsupportedDisposition('MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED'),
      };
    }
    return {
      [STRICT]: nonlinearDisposition('MODEL_RESTRAINT_UNILATERAL_UNSUPPORTED'),
      [APPROXIMATE]: approximationDisposition('GENERIC_APPROX_UNILATERAL_LINEARIZED'),
    };
  }
  return both(unsupportedDisposition('MODEL_RESTRAINT_TYPE_NOT_COMPILED'));
}

function targetDofsOf(typeCode, direction) {
  if (typeCode === '0') return [...RESTRAINT_DOFS];
  if (!direction.valid || direction.dominantAxis === null) return [];
  return [direction.dominantAxis];
}

function directionOf(attributes) {
  const vector = [
    numericAttribute(attributes, ['XCOSINE']),
    numericAttribute(attributes, ['YCOSINE']),
    numericAttribute(attributes, ['ZCOSINE']),
  ];
  if (vector.every((value) => value === null)) {
    return Object.freeze({ vector: Object.freeze(vector), valid: false, dominantAxis: null });
  }
  if (!vector.every((value) => value !== null)) {
    return Object.freeze({ vector: Object.freeze(vector), valid: false, dominantAxis: null });
  }
  const magnitude = Math.hypot(...vector);
  if (!(magnitude > NUMERIC_TOLERANCE)) {
    return Object.freeze({ vector: Object.freeze(vector), magnitude, valid: false, dominantAxis: null });
  }
  const unit = vector.map((value) => value / magnitude);
  const absolute = unit.map(Math.abs);
  const dominantIndex = absolute.indexOf(Math.max(...absolute));
  return Object.freeze({
    vector: Object.freeze(vector),
    unit: Object.freeze(unit),
    magnitude,
    valid: Math.abs(magnitude - 1) <= DIRECTION_TOLERANCE,
    dominantAxis: ['UX', 'UY', 'UZ'][dominantIndex],
  });
}

function axisAlignedDirection(direction) {
  if (!direction.valid || !Array.isArray(direction.unit)) return false;
  const absolute = direction.unit.map(Math.abs);
  const maximum = Math.max(...absolute);
  const dominantIndex = absolute.indexOf(maximum);
  return maximum >= 1 - DIRECTION_TOLERANCE
    && absolute.every((value, index) => index === dominantIndex || value <= DIRECTION_TOLERANCE);
}

function canonicalNodeRestraint(segment, nodeId) {
  if (!segment || nodeId === null) return null;
  if (String(segment.startNodeId) === String(nodeId)) return 'START_NODE';
  if (String(segment.endNodeId) === String(nodeId)) return 'END_NODE';
  return 'UNBOUND_NODE';
}

function attribute(attributes, names) {
  for (const name of names) {
    const key = Object.keys(attributes ?? {}).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (key !== undefined) {
      const text = String(attributes[key] ?? '').trim();
      return text.length > 0 ? text : null;
    }
  }
  return null;
}

export function numericAttribute(attributes, names) {
  const value = attribute(attributes, names);
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function caesarOptionalNumber(attributes, names) {
  const value = numericAttribute(attributes, names);
  return isCaesarUnsetSentinel(value) ? null : value;
}

export function normalizedNodeAttribute(attributes, names) {
  const value = attribute(attributes, names);
  if (value === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (isCaesarUnsetSentinel(number)) return null;
  return String(number);
}

function finitePositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > NUMERIC_TOLERANCE;
}

function finiteNonzero(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) > NUMERIC_TOLERANCE;
}

function both(disposition) {
  return Object.freeze({ [STRICT]: disposition, [APPROXIMATE]: disposition });
}
