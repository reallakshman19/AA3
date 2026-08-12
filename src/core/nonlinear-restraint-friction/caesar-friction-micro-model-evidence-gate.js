const STATUS = Object.freeze({
  MEASUREMENT_READY: 'MEASUREMENT_READY',
  BLOCKED_EVIDENCE: 'BLOCKED_EVIDENCE',
});

const TRACE_REQUIRED = new Set([
  'MM3_DIRECTION_CHANGE_TRACE',
  'MM4_NORMAL_FORCE_UPDATE_TRACE',
  'MM5_GAP_CONTACT_TRACE',
]);

const FINAL_EQUILIBRIUM_REQUIRED = new Set([
  'MM2_SLIDE_PLATEAU',
  'MM5_GAP_CONTACT_TRACE',
]);

const PINNED_FRICTION_STIFFNESS_N_PER_M = 175126835.24647635;
const KNOWN_BM4NL_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const KNOWN_BM4NL_FRICTION_DISABLED_CASES = new Set(['L19', 'L20']);

export const CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS = STATUS;

/**
 * Validate custody and observability for one independent CAESAR friction
 * experiment. This gate authorizes measurement only; it never promotes a
 * measured value or state rule into production mechanics authority.
 */
export function assessCaesarFrictionMicroModelEvidence(evidence) {
  const blockers = [];
  const experimentId = requiredStringOrNull(evidence?.experimentId);
  const source = evidence?.source ?? {};
  const product = evidence?.product ?? {};
  const configuration = evidence?.configuration ?? {};
  const inputCustody = evidence?.inputCustody ?? {};
  const finalOutput = evidence?.finalOutput ?? {};

  if (!experimentId || !/^MM[1-5]_/.test(experimentId)) blockers.push('EXPERIMENT_ID_REQUIRED');

  if (String(source.provenanceClass ?? '').toUpperCase() !== 'INDEPENDENT_MICRO_MODEL') {
    blockers.push('INDEPENDENT_MICRO_MODEL_PROVENANCE_REQUIRED');
  }
  if (String(source.benchmarkId ?? '').toUpperCase() === 'BM4_L') {
    blockers.push('BM4_L_RESPONSE_PROVENANCE_PROHIBITED');
  }
  if (isKnownFrictionDisabledBm4Nl(source)) {
    blockers.push('KNOWN_FRICTION_DISABLED_BM4_NL_CASE_PROHIBITED');
  }

  if (String(product.name ?? '').toUpperCase() !== 'CAESAR II') blockers.push('CAESAR_PRODUCT_IDENTITY_REQUIRED');
  if (String(product.version ?? '') !== '14.00.00.0910') blockers.push('CAESAR_VERSION_14_00_00_0910_REQUIRED');
  if (String(product.build ?? '') !== '231113') blockers.push('CAESAR_BUILD_231113_REQUIRED');

  if (!isSha256(inputCustody.sha256)) blockers.push('EXACT_INPUT_SHA256_REQUIRED');
  if (!requiredStringOrNull(inputCustody.fileName)) blockers.push('INPUT_FILENAME_REQUIRED');

  if (!(Number.isFinite(configuration.coefficientOfFriction) && configuration.coefficientOfFriction > 0)) {
    blockers.push('POSITIVE_FRICTION_COEFFICIENT_REQUIRED');
  }
  if (configuration.frictionMultiplier !== 1) blockers.push('FRICTION_MULTIPLIER_ONE_REQUIRED');
  if (configuration.frictionStiffnessNPerM !== PINNED_FRICTION_STIFFNESS_N_PER_M) {
    blockers.push('PINNED_FRICTION_STIFFNESS_175126835_24647635_N_PER_M_REQUIRED');
  }

  if (!vector3(finalOutput.displacementM)) blockers.push('FINAL_DISPLACEMENT_VECTOR_REQUIRED');
  if (!vector3(finalOutput.restraintReactionN)) blockers.push('FINAL_RESTRAINT_REACTION_VECTOR_REQUIRED');

  if (FINAL_EQUILIBRIUM_REQUIRED.has(experimentId)
    && finalOutput.globalEquilibriumPassed !== true) {
    blockers.push('FINAL_GLOBAL_EQUILIBRIUM_PROOF_REQUIRED');
  }

  const iterationTrace = Array.isArray(evidence?.iterationTrace) ? evidence.iterationTrace : [];
  if (TRACE_REQUIRED.has(experimentId)) {
    if (iterationTrace.length < 2) blockers.push('CAESAR_NONLINEAR_ITERATION_TRACE_REQUIRED');
    else if (!iterationTrace.every(validTraceRow)) blockers.push('CAESAR_NONLINEAR_ITERATION_TRACE_INCOMPLETE');
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const traceRequired = TRACE_REQUIRED.has(experimentId);
  const measurementClass = traceRequired ? 'ITERATION_STATE_MEASUREMENT' : 'FINAL_STATE_MEASUREMENT';

  return freezeResult({
    status: uniqueBlockers.length ? STATUS.BLOCKED_EVIDENCE : STATUS.MEASUREMENT_READY,
    experimentId,
    measurementClass,
    blockerCodes: uniqueBlockers,
    evidence: {
      independentMicroModel: String(source.provenanceClass ?? '').toUpperCase() === 'INDEPENDENT_MICRO_MODEL',
      traceRequired,
      traceRows: iterationTrace.length,
      finalOutputPresent: vector3(finalOutput.displacementM) && vector3(finalOutput.restraintReactionN),
      inputCustodyPresent: isSha256(inputCustody.sha256),
    },
    authority: {
      measurementAuthorized: uniqueBlockers.length === 0,
      productionMechanicsAuthorized: false,
      slideMultiplierAuthorized: false,
      stateHistorySemanticsAuthorized: false,
      gapContactSemanticsAuthorized: false,
    },
  });
}

function isKnownFrictionDisabledBm4Nl(source) {
  return String(source.accdbSha256 ?? '').toLowerCase() === KNOWN_BM4NL_ACCDB_SHA256
    && KNOWN_BM4NL_FRICTION_DISABLED_CASES.has(String(source.caseId ?? '').toUpperCase());
}

function validTraceRow(row) {
  return Number.isInteger(row?.iteration) && row.iteration >= 1
    && requiredStringOrNull(row?.restraintStatus)
    && Number.isFinite(row?.normalReactionN)
    && vector3(row?.tangentialDirection)
    && Number.isFinite(row?.frictionReactionMagnitudeN)
    && typeof row?.converged === 'boolean';
}

function vector3(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value ?? ''));
}

function requiredStringOrNull(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function freezeResult(value) {
  Object.freeze(value.blockerCodes);
  Object.freeze(value.evidence);
  Object.freeze(value.authority);
  return Object.freeze(value);
}
