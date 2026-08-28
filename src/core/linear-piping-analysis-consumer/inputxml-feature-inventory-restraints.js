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
// Every mirrored direction of a one-way support is the same linearization:
// +Y (14) and -Y (17) differ only in which sign of travel is free, and the
// linearized form restrains the DOF in both. Restricting this to +Y/+Z made
// a -Y support BLOCK while its mirror image was accepted.
const GENERIC_LINEARIZED_UNILATERAL_CODES = new Set(['13', '14', '15', '16', '17', '18']);
// Bidirectional single-DOF restraints that inputxml-linear-structural-constraints.js
// already compiles exactly today as kind:'NODAL_RESTRAINT', behavior:'FIXED'.
// X/Y/Z are plain translations; LIM (8) and GUI (9) are double-acting stops
// along their declared axis, structurally identical to a plain translation
// restraint once any declared gap is handled separately below.
const EXACT_BIDIRECTIONAL_CODES = new Set(['2', '3', '5', '8', '9']);
// A RESTRAINT record is an unused fixed-width-array slot only when both its
// identity attributes (which restraint, and on which node) carry the
// sentinel. A row declaring one but not the other is genuinely malformed and
// still falls through to MODEL_RESTRAINT_SOURCE_INVALID below, so this does
// not weaken the fail-closed contract. See caesar-unset-sentinel.js for why
// this can't be a blanket "every field is sentinel" test (BM4 alone has 56
// unused slots that carry non-sentinel 0.000000 direction cosines).
const RESTRAINT_SLOT_IDENTITY_ATTRIBUTES = Object.freeze(['TYPE', 'NODE']);

export function classifyRestraint(attributes, element, segment) {
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
    // The value, not only the fact of it: LINEAR_SPRING consumes the rate.
    stiffnessValue: finitePositive(stiffness) ? Number(stiffness) : null,
    canonicalNodeRestraint: canonicalNodeRestraint(segment, nodeId),
  });
}

export function restraintDispositions(classification) {
  if (!classification.active) return both(inactiveDisposition());
  if (classification.typeCode === null || classification.typeLabel === null || classification.nodeId === null) {
    return both(invalidDisposition('MODEL_RESTRAINT_SOURCE_INVALID'));
  }
  // A connected-node restraint retargets the reaction onto another node, which
  // no single-node constraint can express, so it stays terminal.
  if (classification.connectingNodeActive) {
    return both(unsupportedDisposition('MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED'));
  }
  /*
   * A declared finite stiffness is exact, not an approximation: the solver
   * carries LINEAR_SPRING and assembles the declared rate onto the restrained
   * DOF. It falls through to the type branch below -- the direction still has
   * to be representable -- and only the emitted behavior changes.
   */

  // Gap and friction are NOT terminal. Both leave the restrained DOF intact and
  // only drop a nonlinear effect, which is exactly the linear idealisation this
  // repository's own ACCDB linear path already performs -- restraintConstraints()
  // in caesar-accdb-linear-solve.js builds the restraint without ever reading
  // FRIC_COEF or GAP. STRICT still refuses them; the disclosed-approximation
  // profile restrains the DOF and declares what was dropped. Evaluating them
  // ahead of the type branch (as this function previously did) also meant a
  // supported one-way support carrying friction never reached its own
  // linearization at all.
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
    // Dropping a nonlinear effect cannot rescue a restraint whose underlying
    // type this consumer still cannot compile -- that stays blocked.
    [APPROXIMATE]: compilable ? approximationDisposition(dropped[0].approximate) : approximate,
  };
}

// CAESAR's one-way restraint codes name the direction the support acts IN:
// 13/14/15 are +X/+Y/+Z, 16/17/18 are -X/-Y/-Z. A "+Y" support can only push
// the pipe up, so the reaction it applies to the structure is positive on that
// axis and never negative. Linearizing it as a bidirectional FIXED DOF removes
// that restriction, which is exactly the approximation
// GENERIC_APPROX_UNILATERAL_LINEARIZED discloses -- and the sign recorded here
// is what lets a later review notice when the solved reaction actually
// violates it.
const UNILATERAL_RESISTED_SIGN = Object.freeze({
  13: 1, 14: 1, 15: 1, 16: -1, 17: -1, 18: -1,
});

/**
 * For a one-way restraint, the DOF it acts on and the sign of the reaction it
 * is physically able to apply. Null for anything bidirectional.
 */
export function restraintUnilateralAction(classification) {
  const sign = UNILATERAL_RESISTED_SIGN[classification.typeCode] ?? null;
  if (sign === null) return null;
  if (classification.targetDofs.length !== 1) return null;
  return Object.freeze({ dof: classification.targetDofs[0], resistedSign: sign });
}

/** Every distinct approximation this restraint relies on, for disclosure. */
export function restraintApproximationCodes(classification) {
  const codes = [];
  if (classification.gapActive) codes.push('GENERIC_APPROX_GAP_CLOSED');
  if (classification.frictionActive) codes.push('GENERIC_APPROX_FRICTION_IGNORED');
  // Exact mechanics, unvalidated: benchmarks/LFEA/SPRING_DRAFT/PROVENANCE.md.
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
    // A skewed axis would need the restraint resolved onto a declared local
    // basis; collapsing it onto a dominant global axis would silently move the
    // reaction, so it stays refused rather than approximated.
    if (!axisAlignedDirection(classification.direction)) {
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

/**
 * Node-id attribute, or null when absent or carrying the CAESAR unset
 * sentinel. CNODE/CONNECTING_NODE/NODE2 in particular are declared on every
 * restraint record and read -1.0101 to mean "no connecting node" — before
 * this, that sentinel was returned as the literal node id "-1.0101", which
 * made every restraint with no gap/friction declared but a filled (sentinel)
 * CNODE resolve to connectingNodeActive=true and block on
 * MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED. On BM4, 14 of 46 real
 * restraints have no connecting node at all and were misrouted this way.
 */
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
