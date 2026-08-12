/**
 * Deterministic Coulomb-friction state mechanics for CAESAR ACCDB benchmarks.
 *
 * This module deliberately owns only nonlinear friction state and evidence.
 * Element formulation, physical load construction, constraints, recovery and
 * benchmark comparison remain in the qualified ACCDB mechanics stack.
 */

import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA,
  normalizeCaesarConfigurationAuthority,
  resolveCaesarConfigurationSetting,
  resolveCaesarConfigurationSettingTrace,
} from './caesar-configuration-authority.js';

export const CAESAR_FRICTION_SOLVER_PROFILE_SCHEMA = 'caesar-friction-solver-profile/v1';
export const CAESAR_FRICTION_STATE_SCHEMA = 'caesar-friction-restraint-state/v1';
export const CAESAR_FRICTION_STATES = Object.freeze(['STICK', 'SLIDE']);
export const CAESAR_FRICTION_DERIVED_CASES = Object.freeze(['L14', 'L15']);

/** Resolve model mu, case multiplier, effective mu and friction stiffness separately. */
export function resolveCaesarFrictionCaseSettings(authorityInput, caseIdInput, options = {}) {
  const authority = normalizeCaesarConfigurationAuthority(authorityInput);
  if (authority.schema !== CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA) {
    throw new TypeError('M047 Stage 2 friction requires caesar-configuration-authority/v2.');
  }
  const caseId = nonempty(caseIdInput, 'caseId');
  const derived = options.derived === true;
  const modelMu = resolveCaesarConfigurationSetting(authority, 'COEFFICIENT_OF_FRICTION_MU', caseId);
  if (modelMu.level !== 'MODEL_INPUT') {
    throw new TypeError(`${caseId} friction coefficient must resolve from MODEL_INPUT.`);
  }
  const frictionStiffness = resolveCaesarConfigurationSetting(authority, 'FRICT_STIF', caseId);
  const stiffness = convertCaesarFrictionStiffnessToSi(frictionStiffness.value, options.translationUnit ?? 'N./cm.');
  const base = {
    caseId,
    kind: derived ? 'DERIVED_ALGEBRAIC' : 'PRIMITIVE_NONLINEAR',
    modelCoefficient: modelMu,
    modelCoefficientTrace: resolveCaesarConfigurationSettingTrace(
      authority,
      'COEFFICIENT_OF_FRICTION_MU',
      caseId,
    ),
    frictionStiffness: deepFreeze({
      authority: frictionStiffness,
      displayedValue: frictionStiffness.value,
      siValueNPerM: stiffness,
      conversion: 'N_PER_CM_X_100_TO_N_PER_M',
    }),
  };
  if (derived) {
    return deepFreeze({
      ...base,
      frictionMultiplier: null,
      effectiveCoefficient: null,
      note: 'Derived algebraic combinations have no independent nonlinear friction settings.',
    });
  }
  const multiplier = resolveCaesarConfigurationSetting(authority, 'FRICTION_MULTIPLIER', caseId);
  const mu = finiteNonnegative(modelMu.value, 'COEFFICIENT_OF_FRICTION_MU');
  const m = finiteNonnegative(multiplier.value, 'FRICTION_MULTIPLIER');
  return deepFreeze({
    ...base,
    frictionMultiplier: multiplier,
    effectiveCoefficient: mu * m,
  });
}

export function convertCaesarFrictionStiffnessToSi(measurement, translationUnit) {
  if (!measurement || typeof measurement !== 'object' || Array.isArray(measurement)) {
    throw new TypeError('FRICT_STIF must be a displayed-unit measurement.');
  }
  if (measurement.unit !== 'DISPLAYED_CAESAR_UNITS') {
    throw new TypeError('FRICT_STIF authority must use DISPLAYED_CAESAR_UNITS.');
  }
  const value = positive(measurement.value, 'FRICT_STIF.value');
  if (translationUnit !== 'N./cm.') {
    throw new TypeError(`Unsupported ACCDB translational stiffness unit ${String(translationUnit)}.`);
  }
  return value * 100;
}

/** Evaluate one restraint under the CAESAR stiffness-method stick/slide law. */
export function evaluateCaesarFrictionRestraint(input) {
  const restraintId = nonempty(input.restraintId, 'restraintId');
  const normal = unit3(input.normalDirection, 'normalDirection');
  const displacement = vector3(input.relativeTangentialDisplacement, 'relativeTangentialDisplacement');
  const tangential = rejectNormal(displacement, normal);
  const normalReaction = finite(input.normalReaction, 'normalReaction');
  const mu = finiteNonnegative(input.effectiveCoefficient, 'effectiveCoefficient');
  const kf = positive(input.frictionStiffnessNPerM, 'frictionStiffnessNPerM');
  const boundary = finiteNonnegative(input.boundaryForceN ?? 0, 'boundaryForceN');
  const cap = mu * Math.abs(normalReaction);
  const trialForce = scale3(tangential, -kf);
  const trialMagnitude = norm3(trialForce);
  const previousState = input.previousState === undefined || input.previousState === null
    ? null
    : frictionState(input.previousState);
  const state = trialMagnitude <= cap + boundary ? 'STICK' : 'SLIDE';
  let slipDirection = null;
  let appliedForce;
  let tangentStiffnessNPerM;
  if (state === 'STICK') {
    appliedForce = trialForce;
    tangentStiffnessNPerM = kf;
  } else {
    const magnitude = norm3(tangential);
    if (!(magnitude > 0)) {
      throw new TypeError(`${restraintId} is classified SLIDE without a nonzero tangential direction.`);
    }
    slipDirection = scale3(tangential, 1 / magnitude);
    appliedForce = scale3(slipDirection, -cap);
    tangentStiffnessNPerM = 0;
  }
  const residuals = frictionResiduals({
    state,
    appliedForce,
    relativeTangentialDisplacement: tangential,
    slipDirection,
    normalReaction,
    effectiveCoefficient: mu,
    frictionStiffnessNPerM: kf,
  });
  return deepFreeze({
    schema: CAESAR_FRICTION_STATE_SCHEMA,
    restraintId,
    normalDirection: normal,
    relativeTangentialDisplacement: tangential,
    signedNormalReaction: normalReaction,
    normalReactionMagnitude: Math.abs(normalReaction),
    effectiveCoefficient: mu,
    frictionStiffnessNPerM: kf,
    coulombCapN: cap,
    trialTangentialSpringForce: trialForce,
    trialTangentialSpringForceMagnitudeN: trialMagnitude,
    state,
    previousState,
    stateChanged: previousState !== null && previousState !== state,
    appliedFrictionForce: appliedForce,
    slipDirection,
    tangentStiffnessNPerM,
    assemblyMode: state === 'STICK' ? 'INSERT_TANGENTIAL_STIFFNESS' : 'CAPPED_OPPOSING_LOAD',
    residuals,
  });
}

/** Constitutive/cap/direction residuals independent of global iteration tolerances. */
export function frictionResiduals(input) {
  const state = frictionState(input.state);
  const force = vector3(input.appliedForce, 'appliedForce');
  const displacement = vector3(
    input.relativeTangentialDisplacement,
    'relativeTangentialDisplacement',
  );
  const normalReaction = finite(input.normalReaction, 'normalReaction');
  const mu = finiteNonnegative(input.effectiveCoefficient, 'effectiveCoefficient');
  const kf = positive(input.frictionStiffnessNPerM, 'frictionStiffnessNPerM');
  const cap = mu * Math.abs(normalReaction);
  if (state === 'STICK') {
    const constitutive = add3(force, scale3(displacement, kf));
    return deepFreeze({
      stickConstitutiveVectorN: constitutive,
      stickConstitutiveNormN: norm3(constitutive),
      capViolationN: Math.max(0, norm3(force) - cap),
      slideMagnitudeResidualN: null,
      slideVectorResidualN: null,
      directionCosine: null,
      directionOpposesSlip: null,
    });
  }
  const direction = unit3(input.slipDirection, 'slipDirection');
  const vectorResidual = add3(force, scale3(direction, cap));
  const forceMagnitude = norm3(force);
  const directionCosine = forceMagnitude === 0 ? null : dot3(force, direction) / forceMagnitude;
  return deepFreeze({
    stickConstitutiveVectorN: null,
    stickConstitutiveNormN: null,
    capViolationN: Math.max(0, forceMagnitude - cap),
    slideMagnitudeResidualN: Math.abs(forceMagnitude - cap),
    slideVectorResidualN: norm3(vectorResidual),
    directionCosine,
    directionOpposesSlip: directionCosine !== null && directionCosine <= 0,
  });
}

/**
 * Run the deterministic active-set loop around a supplied qualified linear
 * assembly/solve callback. The callback owns the base FEA mechanics; this
 * controller owns only friction tangent/load terms and state evolution.
 */
export function runDeterministicCaesarFrictionActiveSet(input) {
  if (typeof input?.solveIteration !== 'function') {
    throw new TypeError('solveIteration must be a function supplied by the qualified FEA adapter.');
  }
  if (!Array.isArray(input.restraints) || input.restraints.length === 0) {
    throw new TypeError('At least one friction restraint is required.');
  }
  const profile = normalizeConvergenceProfile(input.profile);
  const maximumIterations = positiveInteger(input.maximumIterations ?? 100, 'maximumIterations');
  const boundaryForceN = finiteNonnegative(input.boundaryForceN ?? 0, 'boundaryForceN');
  const restraints = input.restraints.map((entry, index) => deepFreeze({
    restraintId: nonempty(entry.restraintId, `restraints[${index}].restraintId`),
    normalDirection: unit3(entry.normalDirection, `restraints[${index}].normalDirection`),
    effectiveCoefficient: finiteNonnegative(
      entry.effectiveCoefficient,
      `restraints[${index}].effectiveCoefficient`,
    ),
    frictionStiffnessNPerM: positive(
      entry.frictionStiffnessNPerM,
      `restraints[${index}].frictionStiffnessNPerM`,
    ),
  }));
  if (new Set(restraints.map((entry) => entry.restraintId)).size !== restraints.length) {
    throw new TypeError('Friction restraint IDs must be unique.');
  }
  let states = new Map(restraints.map((entry) => [entry.restraintId, deepFreeze({
    restraintId: entry.restraintId,
    state: 'STICK',
    appliedFrictionForce: Object.freeze([0, 0, 0]),
    slipDirection: null,
  })]));
  const ledger = [];
  for (let iteration = 1; iteration <= maximumIterations; iteration += 1) {
    const assemblyTerms = restraints.map((restraint) =>
      frictionAssemblyTerm(restraint, states.get(restraint.restraintId)));
    const solved = input.solveIteration(deepFreeze({
      iteration,
      assemblyTerms,
      priorStates: Object.freeze([...states.values()]),
    }));
    if (!solved || typeof solved !== 'object') {
      throw new TypeError(`solveIteration ${iteration} did not return an iteration result.`);
    }
    const tangentialById = valueMap(solved.relativeTangentialDisplacements, 'relativeTangentialDisplacements');
    const normalById = valueMap(solved.normalReactions, 'normalReactions');
    const nextStates = restraints.map((restraint) => evaluateCaesarFrictionRestraint({
      restraintId: restraint.restraintId,
      normalDirection: restraint.normalDirection,
      relativeTangentialDisplacement: requiredMapValue(
        tangentialById,
        restraint.restraintId,
        'relativeTangentialDisplacements',
      ),
      normalReaction: requiredMapValue(normalById, restraint.restraintId, 'normalReactions'),
      effectiveCoefficient: restraint.effectiveCoefficient,
      frictionStiffnessNPerM: restraint.frictionStiffnessNPerM,
      boundaryForceN,
      previousState: states.get(restraint.restraintId).state,
    }));
    const convergence = evaluateCaesarFrictionConvergence({
      profile: input.profile,
      states: nextStates,
      displacementUpdateNorm: solved.displacementUpdateNorm,
      reactionUpdateNorm: solved.reactionUpdateNorm,
      equilibriumForceResidualN: solved.equilibriumForceResidualN,
      equilibriumMomentResidualNm: solved.equilibriumMomentResidualNm,
    });
    const row = deepFreeze({
      iteration,
      assemblyTerms,
      states: nextStates,
      convergence,
      solverEvidence: solved.solverEvidence ?? null,
    });
    ledger.push(row);
    states = new Map(nextStates.map((state) => [state.restraintId, state]));
    if (convergence.status === 'PASS') {
      return deepFreeze({
        status: 'CONVERGED',
        iterations: iteration,
        profile,
        finalStates: nextStates,
        ledger,
      });
    }
  }
  return deepFreeze({
    status: 'BLOCKED_MAX_ITERATIONS',
    iterations: maximumIterations,
    profile,
    finalStates: Object.freeze([...states.values()]),
    ledger,
  });
}

export function frictionAssemblyTerm(restraintInput, stateInput) {
  const restraintId = nonempty(restraintInput.restraintId, 'restraintId');
  const normal = unit3(restraintInput.normalDirection, 'normalDirection');
  const kf = positive(restraintInput.frictionStiffnessNPerM, 'frictionStiffnessNPerM');
  const state = frictionState(stateInput?.state ?? 'STICK');
  if (state === 'STICK') {
    const projector = tangentialProjector3(normal);
    return deepFreeze({
      restraintId,
      state,
      mode: 'INSERT_TANGENTIAL_STIFFNESS',
      tangentialStiffness3x3NPerM: projector.map((value) => clean(value * kf)),
      cappedLoadVectorN: Object.freeze([0, 0, 0]),
    });
  }
  return deepFreeze({
    restraintId,
    state,
    mode: 'CAPPED_OPPOSING_LOAD',
    tangentialStiffness3x3NPerM: Object.freeze(new Array(9).fill(0)),
    cappedLoadVectorN: Object.freeze(vector3(stateInput.appliedFrictionForce, 'appliedFrictionForce')),
  });
}

export function compareDeterministicCaesarFrictionRuns(leftInput, rightInput) {
  const left = requireConvergedRun(leftInput, 'left');
  const right = requireConvergedRun(rightInput, 'right');
  const leftSignature = runDeterminismSignature(left);
  const rightSignature = runDeterminismSignature(right);
  return deepFreeze({
    status: leftSignature === rightSignature ? 'PASS' : 'FAIL',
    leftSignature,
    rightSignature,
    identical: leftSignature === rightSignature,
  });
}

/** Reject a stationary iteration if any nonlinear physics gate remains open. */
export function evaluateCaesarFrictionConvergence(input) {
  const profile = normalizeConvergenceProfile(input.profile);
  const states = Array.isArray(input.states) ? input.states : [];
  if (states.length === 0) throw new TypeError('Friction convergence requires restraint states.');
  const displacementUpdateNorm = finiteNonnegative(input.displacementUpdateNorm, 'displacementUpdateNorm');
  const reactionUpdateNorm = finiteNonnegative(input.reactionUpdateNorm, 'reactionUpdateNorm');
  const equilibriumForceResidualN = finiteNonnegative(
    input.equilibriumForceResidualN,
    'equilibriumForceResidualN',
  );
  const equilibriumMomentResidualNm = finiteNonnegative(
    input.equilibriumMomentResidualNm,
    'equilibriumMomentResidualNm',
  );
  const gates = {
    activeSetStable: states.every((state) => state.stateChanged === false),
    displacementUpdate: displacementUpdateNorm <= profile.displacementUpdateNorm,
    reactionUpdate: reactionUpdateNorm <= profile.reactionUpdateNorm,
    frictionCap: states.every((state) => state.residuals.capViolationN <= profile.capResidualN),
    stickConstitutive: states.every((state) => state.state !== 'STICK'
      || state.residuals.stickConstitutiveNormN <= profile.stickResidualN),
    slideMagnitude: states.every((state) => state.state !== 'SLIDE'
      || state.residuals.slideMagnitudeResidualN <= profile.slideResidualN),
    slideDirection: states.every((state) => state.state !== 'SLIDE'
      || (state.residuals.directionOpposesSlip
        && state.residuals.directionCosine <= -1 + profile.directionCosineTolerance)),
    forceEquilibrium: equilibriumForceResidualN <= profile.equilibriumForceN,
    momentEquilibrium: equilibriumMomentResidualNm <= profile.equilibriumMomentNm,
    deterministicRepeat: input.deterministicRepeat === undefined
      ? null
      : input.deterministicRepeat === true,
  };
  const requiredGates = Object.values(gates).filter((value) => value !== null);
  return deepFreeze({
    status: requiredGates.every(Boolean) ? 'PASS' : 'FAIL',
    gates: deepFreeze(gates),
    metrics: deepFreeze({
      displacementUpdateNorm,
      reactionUpdateNorm,
      equilibriumForceResidualN,
      equilibriumMomentResidualNm,
    }),
  });
}

/** Algebraically combine already-converged result rows; never performs a solve. */
export function combineCaesarAlgebraicResultRows(input) {
  const caseId = nonempty(input.caseId, 'caseId');
  const minuendCaseId = nonempty(input.minuendCaseId, 'minuendCaseId');
  const subtrahendCaseId = nonempty(input.subtrahendCaseId, 'subtrahendCaseId');
  const left = indexRows(input.minuendRows, 'minuendRows');
  const right = indexRows(input.subtrahendRows, 'subtrahendRows');
  const leftKeys = [...left.keys()].sort(compareText);
  const rightKeys = [...right.keys()].sort(compareText);
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key, index) => key !== rightKeys[index])) {
    throw new TypeError(`${caseId} algebraic operands do not expose identical result-row identities.`);
  }
  const rows = leftKeys.map((key) => {
    const a = left.get(key);
    const b = right.get(key);
    if (a.unit !== b.unit) throw new TypeError(`${caseId} algebraic operands disagree on ${key} units.`);
    return deepFreeze({ ...a, value: clean(Number(a.value) - Number(b.value)) });
  });
  return deepFreeze({
    caseId,
    formula: `${caseId}=${minuendCaseId}-${subtrahendCaseId}`,
    combinationMethod: 'ALG',
    solvePerformed: false,
    sourceCases: Object.freeze([minuendCaseId, subtrahendCaseId]),
    rows,
  });
}

function normalizeConvergenceProfile(value) {
  if (!value || value.schema !== CAESAR_FRICTION_SOLVER_PROFILE_SCHEMA) {
    throw new TypeError(`Unsupported friction solver profile ${String(value?.schema)}.`);
  }
  return deepFreeze({
    displacementUpdateNorm: finiteNonnegative(value.displacementUpdateNorm, 'displacementUpdateNorm'),
    reactionUpdateNorm: finiteNonnegative(value.reactionUpdateNorm, 'reactionUpdateNorm'),
    capResidualN: finiteNonnegative(value.capResidualN, 'capResidualN'),
    stickResidualN: finiteNonnegative(value.stickResidualN, 'stickResidualN'),
    slideResidualN: finiteNonnegative(value.slideResidualN, 'slideResidualN'),
    directionCosineTolerance: finiteNonnegative(
      value.directionCosineTolerance,
      'directionCosineTolerance',
    ),
    equilibriumForceN: finiteNonnegative(value.equilibriumForceN, 'equilibriumForceN'),
    equilibriumMomentNm: finiteNonnegative(value.equilibriumMomentNm, 'equilibriumMomentNm'),
  });
}

function indexRows(rows, field) {
  if (!Array.isArray(rows)) throw new TypeError(`${field} must be an array.`);
  const index = new Map();
  rows.forEach((row, rowIndex) => {
    const key = [row?.entityKind, row?.entityId, row?.quantity, row?.component].map(String).join('|');
    if (index.has(key)) throw new TypeError(`${field}[${rowIndex}] duplicates ${key}.`);
    if (!Number.isFinite(Number(row?.value))) throw new TypeError(`${field}[${rowIndex}].value must be finite.`);
    index.set(key, row);
  });
  return index;
}

function tangentialProjector3(normal) {
  return [
    1 - normal[0] * normal[0], -normal[0] * normal[1], -normal[0] * normal[2],
    -normal[1] * normal[0], 1 - normal[1] * normal[1], -normal[1] * normal[2],
    -normal[2] * normal[0], -normal[2] * normal[1], 1 - normal[2] * normal[2],
  ];
}
function valueMap(value, field) {
  if (value instanceof Map) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} must be a Map or object keyed by restraint ID.`);
  }
  return new Map(Object.entries(value));
}
function requiredMapValue(map, key, field) {
  if (!map.has(key)) throw new TypeError(`${field} is missing restraint ${key}.`);
  return map.get(key);
}
function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new TypeError(`${field} must be a positive integer.`);
  return number;
}
function requireConvergedRun(value, field) {
  if (!value || value.status !== 'CONVERGED' || !Array.isArray(value.ledger)) {
    throw new TypeError(`${field} must be a converged friction run.`);
  }
  return value;
}
function runDeterminismSignature(run) {
  return JSON.stringify({
    iterations: run.iterations,
    states: run.ledger.map((row) => row.states.map((state) => ({
      restraintId: state.restraintId,
      state: state.state,
      normalReactionMagnitude: state.normalReactionMagnitude,
      appliedFrictionForce: state.appliedFrictionForce,
      slipDirection: state.slipDirection,
    }))),
  });
}

function rejectNormal(vector, normal) {
  return add3(vector, scale3(normal, -dot3(vector, normal)));
}
function frictionState(value) {
  const state = nonempty(value, 'state').toUpperCase();
  if (!CAESAR_FRICTION_STATES.includes(state)) throw new TypeError(`Unsupported friction state ${state}.`);
  return state;
}
function vector3(value, field) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((entry) => !Number.isFinite(Number(entry)))) {
    throw new TypeError(`${field} must contain three finite components.`);
  }
  return value.map(Number);
}
function unit3(value, field) {
  const vector = vector3(value, field);
  const magnitude = norm3(vector);
  if (!(magnitude > 0)) throw new TypeError(`${field} must be nonzero.`);
  return scale3(vector, 1 / magnitude);
}
function add3(left, right) { return left.map((value, index) => value + right[index]); }
function scale3(value, factor) { return value.map((entry) => clean(entry * factor)); }
function dot3(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function norm3(value) { return Math.hypot(...value); }
function positive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${field} must be finite and positive.`);
  return number;
}
function finiteNonnegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${field} must be finite and nonnegative.`);
  return number;
}
function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return number;
}
function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} must be nonempty.`);
  return text;
}
function clean(value) { return Object.is(value, -0) || Math.abs(value) < 1e-14 ? 0 : value; }
function compareText(left, right) { return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0; }