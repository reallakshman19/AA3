const STATUS = Object.freeze({
  READY_FOR_ENGINEERING_REVIEW: 'STATE_TRACE_READY_FOR_ENGINEERING_REVIEW',
  BLOCKED_EVIDENCE: 'BLOCKED_EVIDENCE',
});

const EXACT_ACCDB_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const FRICTION_NODES = Object.freeze([
  '20030','20090','20170','20250','20350','20390','20440','20520','20550',
  '20580','20710','21470','21480','21610','21740','21800','21860','21930',
  '22020','22070','22120','22140','22220','22260','22310','22370',
]);
const GAP_KEYS = Object.freeze([
  'GAP:20030:0,0,-1:25',
  'GAP:20390:-1,0,0:5',
  'GAP:21480:0,0,1:25',
  'GAP:21480:1,0,0:10',
  'GAP:21640:1,0,0:10',
  'GAP:22310:0,0,-1:10',
]);
const CONTACT_STATES = new Set(['OPEN', 'CLOSED', 'ACTIVE', 'INACTIVE', 'NOT_APPLICABLE']);
const FRICTION_STATES = new Set(['STICK', 'SLIDING', 'NOT_APPLICABLE']);
const STATE_EVENT_TYPES = new Set(['CONTACT_STATE_CHANGE', 'FRICTION_STATE_CHANGE']);
const CAPTURE_MODES = new Set([
  'INCORE_SOLVER_AND_ACTIVE_BOUNDARY_CONDITIONS',
  'EQUIVALENT_EXACT_BUILD_PRODUCT_TRACE',
]);

export const BM4L_L13_STATE_TRACE_EVIDENCE_STATUS = STATUS;

/**
 * Validate exact-build CAESAR II L13 nonlinear state-trace evidence.
 *
 * Passing this gate authorizes engineering review of product-observed state
 * transitions only. It never authorizes production mechanics or a new L13
 * accuracy percentage by itself.
 */
export function assessBm4lL13StateTraceEvidence(evidence) {
  const blockers = [];
  const source = evidence?.source ?? {};
  const product = evidence?.product ?? {};
  const custody = evidence?.inputCustody ?? {};
  const iterations = Array.isArray(evidence?.iterations) ? evidence.iterations : [];

  if (evidence?.schema !== 'm047-bm4l-l13-state-trace/v1') blockers.push('STATE_TRACE_SCHEMA_V1_REQUIRED');
  if (String(source.benchmarkId ?? '').toUpperCase() !== 'BM4_L') blockers.push('BM4_L_BENCHMARK_REQUIRED');
  if (String(source.caseId ?? '').toUpperCase() !== 'L13') blockers.push('L13_CASE_REQUIRED');
  if (source.capturedFromProduct !== true) blockers.push('EXACT_PRODUCT_CAPTURE_REQUIRED');
  if (!CAPTURE_MODES.has(String(source.captureMode ?? ''))) blockers.push('SUPPORTED_PRODUCT_CAPTURE_MODE_REQUIRED');
  if (source.finalResponseUsedToSelectState === true) blockers.push('FINAL_RESPONSE_STATE_SELECTION_PROHIBITED');

  if (String(product.name ?? '').toUpperCase() !== 'CAESAR II') blockers.push('CAESAR_PRODUCT_REQUIRED');
  if (String(product.version ?? '') !== '14.00.00.0910') blockers.push('CAESAR_VERSION_14_00_00_0910_REQUIRED');
  if (String(product.build ?? '') !== '231113') blockers.push('CAESAR_BUILD_231113_REQUIRED');

  if (String(custody.accdbSha256 ?? '').toLowerCase() !== EXACT_ACCDB_SHA256) {
    blockers.push('PINNED_BM4_L_ACCDB_SHA256_REQUIRED');
  }
  if (!isSha256(custody.traceSha256)) blockers.push('TRACE_SHA256_REQUIRED');
  if (!requiredString(custody.traceFileName)) blockers.push('TRACE_FILENAME_REQUIRED');

  if (iterations.length < 2) blockers.push('MULTI_ITERATION_TRACE_REQUIRED');
  if (iterations.length && !sequentialIterations(iterations)) blockers.push('SEQUENTIAL_ITERATIONS_REQUIRED');
  if (iterations.length && iterations.at(-1)?.converged !== true) blockers.push('FINAL_CONVERGED_ITERATION_REQUIRED');

  const requiredFrictionKeys = new Set(FRICTION_NODES.map((node) => `FRICTION:${node}`));
  const requiredGapKeys = new Set(GAP_KEYS);

  for (const iteration of iterations) {
    validateIteration(iteration, blockers, requiredFrictionKeys, requiredGapKeys);
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const transitions = uniqueBlockers.length ? emptyTransitions() : deriveTransitions(iterations);

  return freezeResult({
    status: uniqueBlockers.length ? STATUS.BLOCKED_EVIDENCE : STATUS.READY_FOR_ENGINEERING_REVIEW,
    blockerCodes: uniqueBlockers,
    custody: {
      benchmarkId: String(source.benchmarkId ?? ''),
      caseId: String(source.caseId ?? ''),
      captureMode: String(source.captureMode ?? ''),
      accdbSha256: String(custody.accdbSha256 ?? ''),
      traceSha256: String(custody.traceSha256 ?? ''),
      iterationCount: iterations.length,
      frictionSiteCountRequired: FRICTION_NODES.length,
      gapRowCountRequired: GAP_KEYS.length,
    },
    transitions,
    authority: {
      stateTraceMeasurementAuthorized: uniqueBlockers.length === 0,
      engineeringReviewRequired: true,
      frictionStateHistorySemanticsAuthorized: false,
      gapContactSemanticsAuthorized: false,
      productionMechanicsAuthorized: false,
      l13RescoreAuthorized: false,
    },
  });
}

function validateIteration(iteration, blockers, requiredFrictionKeys, requiredGapKeys) {
  if (!Number.isInteger(iteration?.iteration) || iteration.iteration < 1) {
    blockers.push('VALID_ITERATION_NUMBER_REQUIRED');
  }
  if (typeof iteration?.converged !== 'boolean') blockers.push('ITERATION_CONVERGENCE_FLAG_REQUIRED');
  if (!Number.isInteger(iteration?.unconvergedRestraintCount) || iteration.unconvergedRestraintCount < 0) {
    blockers.push('UNCONVERGED_RESTRAINT_COUNT_REQUIRED');
  }
  const rows = Array.isArray(iteration?.restraints) ? iteration.restraints : [];
  const keys = new Set(rows.map((row) => String(row?.restraintKey ?? '')));
  if (![...requiredFrictionKeys].every((key) => keys.has(key))) blockers.push('ALL_26_FRICTION_SITES_REQUIRED_EACH_ITERATION');
  if (![...requiredGapKeys].every((key) => keys.has(key))) blockers.push('ALL_6_GAP_ROWS_REQUIRED_EACH_ITERATION');
  if (keys.size !== rows.length) blockers.push('DUPLICATE_RESTRAINT_KEY_IN_ITERATION');

  for (const row of rows) validateRow(row, blockers);
  if (iteration?.stateEvents !== undefined) validateStateEvents(iteration.stateEvents, blockers, keys);
}

function validateRow(row, blockers) {
  const key = String(row?.restraintKey ?? '');
  if (!key) blockers.push('RESTRAINT_KEY_REQUIRED');
  if (!CONTACT_STATES.has(String(row?.contactState ?? ''))) blockers.push('VALID_CONTACT_STATE_REQUIRED');
  if (!FRICTION_STATES.has(String(row?.frictionState ?? ''))) blockers.push('VALID_FRICTION_STATE_REQUIRED');

  if (key.startsWith('FRICTION:')) {
    if (!Number.isFinite(row?.normalReactionN)) blockers.push('FRICTION_NORMAL_REACTION_REQUIRED');
    if (!Number.isFinite(row?.frictionResistanceN)) blockers.push('FRICTION_RESISTANCE_REQUIRED');
    if (row?.frictionState === 'SLIDING' && !unitVector3(row?.frictionDirectionGlobal)) {
      blockers.push('SLIDING_DIRECTION_VECTOR_REQUIRED');
    }
    if (row?.firstTransitionReferenceDirectionGlobal !== undefined
      && row.firstTransitionReferenceDirectionGlobal !== null
      && !unitVector3(row.firstTransitionReferenceDirectionGlobal)) {
      blockers.push('FIRST_TRANSITION_REFERENCE_DIRECTION_MUST_BE_UNIT_VECTOR');
    }
  }
}

function validateStateEvents(events, blockers, validKeys) {
  if (!Array.isArray(events)) {
    blockers.push('STATE_EVENTS_ARRAY_REQUIRED_WHEN_PRESENT');
    return;
  }
  let previousOrdinal = 0;
  const seenOrdinals = new Set();
  for (const event of events) {
    if (!Number.isInteger(event?.ordinal) || event.ordinal < 1) {
      blockers.push('STATE_EVENT_POSITIVE_ORDINAL_REQUIRED');
    } else {
      if (event.ordinal <= previousOrdinal) blockers.push('STATE_EVENTS_MUST_BE_STRICTLY_ORDERED');
      if (seenOrdinals.has(event.ordinal)) blockers.push('DUPLICATE_STATE_EVENT_ORDINAL');
      previousOrdinal = event.ordinal;
      seenOrdinals.add(event.ordinal);
    }
    const key = String(event?.restraintKey ?? '');
    if (!validKeys.has(key)) blockers.push('STATE_EVENT_RESTRAINT_KEY_MUST_MATCH_ITERATION_ROW');
    const eventType = String(event?.eventType ?? '');
    if (!STATE_EVENT_TYPES.has(eventType)) blockers.push('VALID_STATE_EVENT_TYPE_REQUIRED');
    if (eventType === 'CONTACT_STATE_CHANGE') {
      if (!CONTACT_STATES.has(String(event?.from ?? '')) || !CONTACT_STATES.has(String(event?.to ?? ''))) {
        blockers.push('VALID_CONTACT_STATE_EVENT_ENDPOINTS_REQUIRED');
      }
    }
    if (eventType === 'FRICTION_STATE_CHANGE') {
      if (!FRICTION_STATES.has(String(event?.from ?? '')) || !FRICTION_STATES.has(String(event?.to ?? ''))) {
        blockers.push('VALID_FRICTION_STATE_EVENT_ENDPOINTS_REQUIRED');
      }
    }
    if (event?.from === event?.to) blockers.push('STATE_EVENT_MUST_CHANGE_STATE');
  }
}

function deriveTransitions(iterations) {
  const contact = [];
  const friction = [];
  const forceUpdates = [];
  const subIterationStateEvents = [];
  for (const iteration of iterations) {
    for (const event of iteration.stateEvents ?? []) {
      subIterationStateEvents.push(Object.freeze({
        iteration: iteration.iteration,
        ordinal: event.ordinal,
        restraintKey: event.restraintKey,
        eventType: event.eventType,
        from: event.from,
        to: event.to,
      }));
    }
  }
  for (let i = 1; i < iterations.length; i += 1) {
    const previous = new Map(iterations[i - 1].restraints.map((row) => [row.restraintKey, row]));
    for (const row of iterations[i].restraints) {
      const prior = previous.get(row.restraintKey);
      if (!prior) continue;
      if (row.contactState !== prior.contactState) {
        contact.push(Object.freeze({
          iteration: iterations[i].iteration,
          restraintKey: row.restraintKey,
          from: prior.contactState,
          to: row.contactState,
        }));
      }
      if (row.frictionState !== prior.frictionState) {
        friction.push(Object.freeze({
          iteration: iterations[i].iteration,
          restraintKey: row.restraintKey,
          from: prior.frictionState,
          to: row.frictionState,
        }));
      }
      if (row.restraintKey.startsWith('FRICTION:')) {
        forceUpdates.push(Object.freeze({
          iteration: iterations[i].iteration,
          restraintKey: row.restraintKey,
          normalForceRelativeChange: relativeChange(prior.normalReactionN, row.normalReactionN),
          frictionResistanceRelativeChange: relativeChange(prior.frictionResistanceN, row.frictionResistanceN),
          directionChangeDeg: directionChangeDeg(prior.frictionDirectionGlobal, row.frictionDirectionGlobal),
        }));
      }
    }
  }
  return Object.freeze({
    contactStateChanges: Object.freeze(contact),
    frictionStateChanges: Object.freeze(friction),
    perIterationFrictionUpdates: Object.freeze(forceUpdates),
    subIterationStateEvents: Object.freeze(subIterationStateEvents),
  });
}

function sequentialIterations(iterations) {
  return iterations.every((row, index) => row?.iteration === index + 1);
}
function relativeChange(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(b - a) / Math.max(Math.abs(a), 1e-12);
}
function directionChangeDeg(a, b) {
  if (!unitVector3(a) || !unitVector3(b)) return null;
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(dot) * 180 / Math.PI;
}
function unitVector3(value) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) return false;
  return Math.abs(Math.hypot(...value) - 1) <= 1e-9;
}
function isSha256(value) { return /^[a-f0-9]{64}$/i.test(String(value ?? '')); }
function requiredString(value) { return String(value ?? '').trim().length > 0; }
function emptyTransitions() {
  return Object.freeze({
    contactStateChanges: Object.freeze([]),
    frictionStateChanges: Object.freeze([]),
    perIterationFrictionUpdates: Object.freeze([]),
    subIterationStateEvents: Object.freeze([]),
  });
}
function freezeResult(value) {
  Object.freeze(value.blockerCodes);
  Object.freeze(value.custody);
  Object.freeze(value.authority);
  return Object.freeze(value);
}
