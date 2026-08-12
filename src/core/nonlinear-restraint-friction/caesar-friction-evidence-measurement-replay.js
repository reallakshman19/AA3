import {
  CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS,
  assessCaesarFrictionMicroModelEvidence,
} from './caesar-friction-micro-model-evidence-gate.js';
import {
  measureCaesarFrictionMicroModelRun,
} from './caesar-friction-micro-model-measurement.js';

const STATUS = Object.freeze({
  MEASURED_DIAGNOSTIC: 'MEASURED_DIAGNOSTIC',
  BLOCKED_EVIDENCE: 'BLOCKED_EVIDENCE',
});

export const CAESAR_FRICTION_EVIDENCE_REPLAY_STATUS = STATUS;

/**
 * Convert independently custodied CAESAR micro-model evidence into a
 * deterministic diagnostic measurement. The output never authorizes
 * production mechanics; it is suitable only for subsequent independent review.
 */
export function replayCaesarFrictionMicroModelEvidence(evidence) {
  const gate = assessCaesarFrictionMicroModelEvidence(evidence);
  if (gate.status !== CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.MEASUREMENT_READY) {
    return freezeResult({
      status: STATUS.BLOCKED_EVIDENCE,
      experimentId: gate.experimentId,
      evidenceGate: gate,
      measurement: null,
      traceMeasurements: null,
      authority: noAuthority(),
    });
  }

  const measurement = measureCaesarFrictionMicroModelRun({
    runId: evidence.runId ?? evidence.experimentId,
    normalUnit: evidence.configuration.normalUnit ?? [0, 1, 0],
    coefficientOfFriction: evidence.configuration.coefficientOfFriction,
    displacementM: evidence.finalOutput.displacementM,
    restraintReactionN: evidence.finalOutput.restraintReactionN,
  });

  const traceMeasurements = Array.isArray(evidence.iterationTrace)
    ? evidence.iterationTrace.map((row) => freezeTraceMeasurement(row, evidence.configuration.coefficientOfFriction))
    : [];

  Object.freeze(traceMeasurements);
  return freezeResult({
    status: STATUS.MEASURED_DIAGNOSTIC,
    experimentId: gate.experimentId,
    evidenceGate: gate,
    measurement,
    traceMeasurements,
    authority: noAuthority(),
  });
}

export function summarizeIndependentSlidePlateauEvidence(evidenceRuns) {
  if (!Array.isArray(evidenceRuns) || evidenceRuns.length === 0) {
    throw new TypeError('evidenceRuns must be a non-empty array.');
  }

  const replays = evidenceRuns.map(replayCaesarFrictionMicroModelEvidence);
  const blockers = [];
  for (const replay of replays) {
    if (replay.experimentId !== 'MM2_SLIDE_PLATEAU') blockers.push('MM2_SLIDE_PLATEAU_EVIDENCE_ONLY');
    if (replay.status !== STATUS.MEASURED_DIAGNOSTIC) blockers.push('ALL_EVIDENCE_MUST_PASS_MEASUREMENT_GATE');
  }

  const usable = replays.filter((replay) =>
    replay.status === STATUS.MEASURED_DIAGNOSTIC
    && replay.experimentId === 'MM2_SLIDE_PLATEAU');
  const ratios = usable
    .map((replay) => replay.measurement.frictionLimitRatio)
    .filter(Number.isFinite);
  const hashes = evidenceRuns
    .map((run) => String(run?.inputCustody?.sha256 ?? '').toLowerCase())
    .filter(Boolean);
  const normalForces = usable.map((replay) => replay.measurement.normalReactionMagnitudeN);

  const summary = ratios.length > 0
    ? numericSummary(ratios)
    : { count: 0, minimum: null, maximum: null, mean: null, range: null, relativeRangeToMean: null };
  const distinctInputCount = new Set(hashes).size;
  const distinctNormalForceCount = new Set(normalForces.map((value) => value.toPrecision(12))).size;

  Object.freeze(replays);
  return Object.freeze({
    status: blockers.length ? STATUS.BLOCKED_EVIDENCE : STATUS.MEASURED_DIAGNOSTIC,
    blockerCodes: Object.freeze([...new Set(blockers)].sort()),
    runCount: evidenceRuns.length,
    usableRunCount: usable.length,
    distinctInputCount,
    distinctNormalForceCount,
    repetitionDiagnostics: Object.freeze({
      atLeastThreeIndependentInputs: distinctInputCount >= 3,
      atLeastThreeDistinctNormalForces: distinctNormalForceCount >= 3,
    }),
    frictionLimitRatio: Object.freeze(summary),
    authority: noAuthority(),
  });
}

function freezeTraceMeasurement(row, coefficientOfFriction) {
  const normalMagnitude = Math.abs(Number(row.normalReactionN));
  const frictionMagnitude = Number(row.frictionReactionMagnitudeN);
  const coulombLimitN = coefficientOfFriction * normalMagnitude;
  return Object.freeze({
    iteration: row.iteration,
    restraintStatus: row.restraintStatus,
    converged: row.converged,
    normalReactionMagnitudeN: normalMagnitude,
    frictionReactionMagnitudeN: frictionMagnitude,
    coulombLimitN,
    frictionLimitRatio: coulombLimitN > 0 ? frictionMagnitude / coulombLimitN : null,
    tangentialDirection: Object.freeze([...row.tangentialDirection]),
  });
}

function numericSummary(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const range = maximum - minimum;
  return {
    count: values.length,
    minimum,
    maximum,
    mean,
    range,
    relativeRangeToMean: Math.abs(mean) > 0 ? range / Math.abs(mean) : null,
  };
}

function noAuthority() {
  return Object.freeze({
    productionMechanicsAuthorized: false,
    slideMultiplierAuthorized: false,
    stateHistorySemanticsAuthorized: false,
    gapContactSemanticsAuthorized: false,
  });
}

function freezeResult(value) {
  Object.freeze(value.authority);
  return Object.freeze(value);
}
