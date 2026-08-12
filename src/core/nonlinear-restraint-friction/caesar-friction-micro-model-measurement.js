const EPS = 1e-14;

/**
 * Measure one independent CAESAR friction micro-model result from final
 * displacement and restraint-reaction vectors. This function is diagnostic
 * only: it never promotes a measured value to solver authority.
 */
export function measureCaesarFrictionMicroModelRun(input) {
  const runId = requiredString(input?.runId, 'runId');
  const normalUnit = unitVector(input?.normalUnit, 'normalUnit');
  const displacementM = vector3(input?.displacementM, 'displacementM');
  const restraintReactionN = vector3(input?.restraintReactionN, 'restraintReactionN');
  const coefficientOfFriction = nonnegativeFinite(input?.coefficientOfFriction, 'coefficientOfFriction');

  const normalReactionSignedN = dot(restraintReactionN, normalUnit);
  const normalReactionMagnitudeN = Math.abs(normalReactionSignedN);
  const tangentialDisplacementM = projectTangent(displacementM, normalUnit);
  const tangentialReactionN = projectTangent(restraintReactionN, normalUnit);
  const tangentialDisplacementMagnitudeM = norm(tangentialDisplacementM);
  const tangentialReactionMagnitudeN = norm(tangentialReactionN);
  const coulombLimitN = coefficientOfFriction * normalReactionMagnitudeN;
  const frictionLimitRatio = coulombLimitN > 0
    ? tangentialReactionMagnitudeN / coulombLimitN
    : null;
  const effectiveTangentialStiffnessNPerM = tangentialDisplacementMagnitudeM > EPS
    ? tangentialReactionMagnitudeN / tangentialDisplacementMagnitudeM
    : null;
  const oppositionCosine = tangentialDisplacementMagnitudeM > EPS && tangentialReactionMagnitudeN > EPS
    ? -dot(tangentialReactionN, tangentialDisplacementM)
      / (tangentialReactionMagnitudeN * tangentialDisplacementMagnitudeM)
    : null;

  return freezeMeasurement({
    runId,
    normalUnit,
    coefficientOfFriction,
    displacementM,
    restraintReactionN,
    normalReactionSignedN,
    normalReactionMagnitudeN,
    tangentialDisplacementM,
    tangentialDisplacementMagnitudeM,
    tangentialReactionN,
    tangentialReactionMagnitudeN,
    coulombLimitN,
    frictionLimitRatio,
    effectiveTangentialStiffnessNPerM,
    oppositionCosine,
  });
}

export function compareCaesarFrictionMicroModelRuns(previous, current) {
  const a = measurementOrMeasure(previous);
  const b = measurementOrMeasure(current);
  const normalForceRelativeChange = a.normalReactionMagnitudeN > EPS
    ? Math.abs(b.normalReactionMagnitudeN - a.normalReactionMagnitudeN) / a.normalReactionMagnitudeN
    : null;
  const tangentialReactionDirectionChangeDeg = vectorAngleDeg(
    a.tangentialReactionN,
    b.tangentialReactionN,
  );
  const tangentialDisplacementDirectionChangeDeg = vectorAngleDeg(
    a.tangentialDisplacementM,
    b.tangentialDisplacementM,
  );
  const frictionLimitRatioChange = a.frictionLimitRatio !== null && b.frictionLimitRatio !== null
    ? b.frictionLimitRatio - a.frictionLimitRatio
    : null;

  return Object.freeze({
    previousRunId: a.runId,
    currentRunId: b.runId,
    normalForceRelativeChange,
    tangentialReactionDirectionChangeDeg,
    tangentialDisplacementDirectionChangeDeg,
    frictionLimitRatioChange,
  });
}

export function measureCaesarFrictionMicroModelSeries(runs) {
  if (!Array.isArray(runs) || runs.length === 0) {
    throw new TypeError('runs must be a non-empty array.');
  }
  const measurements = runs.map(measurementOrMeasure);
  const transitions = [];
  for (let index = 1; index < measurements.length; index += 1) {
    transitions.push(compareCaesarFrictionMicroModelRuns(
      measurements[index - 1],
      measurements[index],
    ));
  }
  Object.freeze(measurements);
  Object.freeze(transitions);
  return Object.freeze({ measurements, transitions });
}

function measurementOrMeasure(value) {
  return value?.normalReactionMagnitudeN !== undefined
    ? value
    : measureCaesarFrictionMicroModelRun(value);
}

function projectTangent(vector, normalUnit) {
  const normalComponent = dot(vector, normalUnit);
  return vector.map((value, index) => value - normalComponent * normalUnit[index]);
}

function vectorAngleDeg(a, b) {
  const magnitudeA = norm(a);
  const magnitudeB = norm(b);
  if (!(magnitudeA > EPS) || !(magnitudeB > EPS)) return null;
  const cosine = Math.max(-1, Math.min(1, dot(a, b) / (magnitudeA * magnitudeB)));
  return Math.acos(cosine) * 180 / Math.PI;
}

function vector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} must be an array of three finite numbers.`);
  }
  return value.map(Number);
}

function unitVector(value, label) {
  const vector = vector3(value, label);
  const magnitude = norm(vector);
  if (!(magnitude > EPS)) throw new TypeError(`${label} must have nonzero magnitude.`);
  return vector.map((entry) => entry / magnitude);
}

function requiredString(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function nonnegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be finite and >= 0.`);
  }
  return Number(value);
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function norm(vector) {
  return Math.hypot(...vector);
}

function freezeMeasurement(value) {
  for (const key of [
    'normalUnit',
    'displacementM',
    'restraintReactionN',
    'tangentialDisplacementM',
    'tangentialReactionN',
  ]) {
    Object.freeze(value[key]);
  }
  return Object.freeze(value);
}
