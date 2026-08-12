const DEFAULT_NORMAL_UNIT = Object.freeze([0, 1, 0]);
const EPS = 1e-12;

/**
 * Build a benchmark-scoped committed tangential friction load replay from an
 * independently retained CAESAR OUTPUT_RESTRAINTS case.
 *
 * The source rows are CAESAR restraint reactions (pipe on restraint). The
 * returned vectors are applied loads on the pipe, so the sign is reversed.
 * Only the tangent-plane component is returned; the normal restraint remains
 * owned by the structural support operator.
 *
 * This function intentionally does not infer STICK/SLIDING, contact state,
 * normal-force history, or proprietary iteration ordering from the force
 * values. It replays an independently observed committed state only.
 */
export function buildCommittedTangentialFrictionReplay(input) {
  const rows = requireRows(input?.rows);
  const frictionNodeIds = normalizeNodeIds(input?.frictionNodeIds);
  const normalUnit = unitVector(input?.normalUnit ?? DEFAULT_NORMAL_UNIT, 'normalUnit');
  const expectedCaseNumber = requireInteger(input?.expectedCaseNumber, 'expectedCaseNumber');
  const expectedType = requiredText(input?.expectedType ?? 'Rigid Y', 'expectedType');

  const byNode = new Map();
  for (const row of rows) {
    const caseNumber = requireInteger(row?.caseNumber, 'row.caseNumber');
    if (caseNumber !== expectedCaseNumber) continue;
    if (requiredText(row?.type, 'row.type') !== expectedType) continue;
    const nodeId = requiredText(row?.nodeId, 'row.nodeId');
    if (byNode.has(nodeId)) {
      throw new TypeError(`duplicate committed restraint row for node ${nodeId}.`);
    }
    byNode.set(nodeId, normalizeReactionRow(row, normalUnit));
  }

  const loads = [];
  for (const nodeId of frictionNodeIds) {
    const row = byNode.get(nodeId);
    if (!row) {
      throw new TypeError(
        `committed restraint evidence omitted friction node ${nodeId} for case ${expectedCaseNumber}.`,
      );
    }
    loads.push(Object.freeze({
      nodeId,
      sourceReactionN: row.sourceReactionN,
      supportOnPipeReactionN: row.supportOnPipeReactionN,
      appliedTangentialLoadN: row.tangentialLoadN,
      removedNormalComponentN: row.normalComponentN,
      sourceType: expectedType,
      sourceCaseNumber: expectedCaseNumber,
    }));
  }

  const extraOutputNodes = [...byNode.keys()]
    .filter((nodeId) => !frictionNodeIds.includes(nodeId))
    .sort(numericText);

  return Object.freeze({
    schema: 'caesar-committed-tangential-friction-replay/v1',
    sourceConvention: 'PIPE_ON_RESTRAINT_REACTION',
    appliedConvention: 'SUPPORT_ON_PIPE_LOAD',
    signScale: -1,
    normalUnit,
    frictionNodeCount: loads.length,
    frictionNodeIds,
    loads: Object.freeze(loads),
    ignoredSameTypeNonFrictionNodeIds: Object.freeze(extraOutputNodes),
    policy: Object.freeze({
      tangentialComponentsOnly: true,
      normalSupportOperatorUnchanged: true,
      stateClassificationInferredFromOutput: false,
      iterationHistoryInferredFromOutput: false,
      comparatorOrReferenceUsedByReplay: false,
    }),
  });
}

/**
 * Verify an independent same-formula zero-friction control. This is a source
 * identity gate: the same restraint rows must carry no tangential reaction.
 */
export function verifyZeroFrictionTangentialControl(input) {
  const rows = requireRows(input?.rows);
  const expectedCaseNumber = requireInteger(input?.expectedCaseNumber, 'expectedCaseNumber');
  const expectedType = requiredText(input?.expectedType ?? 'Rigid Y', 'expectedType');
  const normalUnit = unitVector(input?.normalUnit ?? DEFAULT_NORMAL_UNIT, 'normalUnit');
  const toleranceN = nonnegativeFinite(input?.toleranceN ?? 1e-9, 'toleranceN');
  const checked = [];

  for (const row of rows) {
    if (requireInteger(row?.caseNumber, 'row.caseNumber') !== expectedCaseNumber) continue;
    if (requiredText(row?.type, 'row.type') !== expectedType) continue;
    const normalized = normalizeReactionRow(row, normalUnit);
    const magnitude = norm(normalized.tangentialLoadN);
    if (magnitude > toleranceN) {
      throw new TypeError(
        `zero-friction control node ${row.nodeId} has ${magnitude} N tangential reaction.`,
      );
    }
    checked.push(requiredText(row?.nodeId, 'row.nodeId'));
  }
  if (checked.length === 0) throw new TypeError('zero-friction control contained no matching rows.');

  return Object.freeze({
    schema: 'caesar-zero-friction-tangential-control/v1',
    caseNumber: expectedCaseNumber,
    type: expectedType,
    rowCount: checked.length,
    nodeIds: Object.freeze(checked.sort(numericText)),
    maximumAllowedTangentialReactionN: toleranceN,
    status: 'PASS',
  });
}

function normalizeReactionRow(row, normalUnit) {
  const sourceReactionN = vector3(row?.forceN, 'row.forceN');
  const supportOnPipeReactionN = freezeVector(sourceReactionN.map((value) => -value));
  const normalScalar = dot(supportOnPipeReactionN, normalUnit);
  const normalComponentN = freezeVector(normalUnit.map((value) => normalScalar * value));
  const tangentialLoadN = freezeVector(
    supportOnPipeReactionN.map((value, index) => value - normalComponentN[index]),
  );
  if (Math.abs(dot(tangentialLoadN, normalUnit)) > EPS * Math.max(1, norm(tangentialLoadN))) {
    throw new TypeError('projected committed friction load is not tangent to the restraint plane.');
  }
  return Object.freeze({
    sourceReactionN,
    supportOnPipeReactionN,
    normalComponentN,
    tangentialLoadN,
  });
}

function requireRows(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('rows must be a non-empty array.');
  }
  return value;
}

function normalizeNodeIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('frictionNodeIds must be a non-empty array.');
  }
  const rows = value.map((entry) => requiredText(entry, 'frictionNodeId')).sort(numericText);
  if (new Set(rows).size !== rows.length) throw new TypeError('frictionNodeIds must be unique.');
  return Object.freeze(rows);
}

function unitVector(value, label) {
  const vector = vector3(value, label);
  const magnitude = norm(vector);
  if (!(magnitude > EPS)) throw new TypeError(`${label} must have nonzero magnitude.`);
  return freezeVector(vector.map((entry) => entry / magnitude));
}

function vector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} must contain exactly three finite numbers.`);
  }
  return value.map(Number);
}

function requireInteger(value, label) {
  if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer.`);
  return value;
}

function nonnegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be finite and >= 0.`);
  return Number(value);
}

function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function numericText(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b));
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function norm(vector) {
  return Math.hypot(...vector);
}

function freezeVector(value) {
  return Object.freeze(value.map((entry) => Object.is(entry, -0) ? 0 : entry));
}
