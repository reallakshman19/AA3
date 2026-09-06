import { createXorShift32 } from './lafea-uq-reference-correlated-gaussian.mjs';

export class SensitivityValidationError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'SensitivityValidationError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, path, message) => {
  throw new SensitivityValidationError(code, path, message);
};

const finiteNumber = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail('NON_NUMERIC_ENTRY', path, 'value must be a finite number');
  }
};

const sameStringSet = (left, right) => (
  left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index])
);

const validateIds = (variableIds, path = '$.variableIds') => {
  if (!Array.isArray(variableIds) || variableIds.length === 0) {
    fail('MISSING_VARIABLE_ID', path, 'variableIds must be a non-empty array');
  }
  const seen = new Set();
  variableIds.forEach((id, index) => {
    if (typeof id !== 'string' || id.length === 0) fail('MISSING_VARIABLE_ID', `${path}[${index}]`, 'variable identifier is missing');
    if (seen.has(id)) fail('DUPLICATE_VARIABLE_ID', `${path}[${index}]`, `duplicate variable identifier: ${id}`);
    seen.add(id);
  });
};

function validateCore({ variableIds, designOrder, expectedVariableIds, distributions, model }) {
  validateIds(variableIds);
  validateIds(expectedVariableIds, '$.expectedVariableIds');
  if (!sameStringSet(variableIds, expectedVariableIds)) {
    fail('VARIABLE_ID_SET_MISMATCH', '$.variableIds', 'variableIds must contain exactly the frozen reference variable set');
  }
  if (!Array.isArray(designOrder) || JSON.stringify(designOrder) !== JSON.stringify(variableIds)) {
    fail('VARIABLE_ORDER_MISMATCH', '$.designOrder', 'designOrder must match the declared variableIds order');
  }

  if (!Array.isArray(distributions) || distributions.length !== variableIds.length) {
    fail('DISTRIBUTION_DIMENSION_MISMATCH', '$.distributions', 'one distribution is required per variable');
  }
  const distributionMap = new Map();
  distributions.forEach((distribution, index) => {
    const path = `$.distributions[${index}]`;
    if (!distribution || typeof distribution !== 'object') fail('INVALID_DISTRIBUTION', path, 'distribution must be an object');
    const { variableId, family, minimum, maximum } = distribution;
    if (!expectedVariableIds.includes(variableId)) fail('UNKNOWN_VARIABLE_ID', `${path}.variableId`, 'distribution references an unknown variable');
    if (distributionMap.has(variableId)) fail('DUPLICATE_VARIABLE_ID', `${path}.variableId`, 'distribution variable identifier is duplicated');
    if (family !== 'UNIFORM') fail('UNSUPPORTED_DISTRIBUTION', `${path}.family`, 'reference sensitivity engine supports UNIFORM only');
    finiteNumber(minimum, `${path}.minimum`);
    finiteNumber(maximum, `${path}.maximum`);
    if (!(minimum < maximum)) fail('INVALID_BOUNDS', path, 'uniform minimum must be less than maximum');
    distributionMap.set(variableId, { minimum, maximum });
  });
  if (!sameStringSet([...distributionMap.keys()], expectedVariableIds)) {
    fail('DISTRIBUTION_DIMENSION_MISMATCH', '$.distributions', 'distribution variables must match the frozen variable set');
  }

  if (!model || typeof model !== 'object') fail('INVALID_MODEL', '$.model', 'model must be an object');
  finiteNumber(model.intercept, '$.model.intercept');
  if (!Array.isArray(model.linearTerms)) fail('INVALID_MODEL', '$.model.linearTerms', 'linearTerms must be an array');
  const linearIds = new Set();
  model.linearTerms.forEach((term, index) => {
    const path = `$.model.linearTerms[${index}]`;
    if (!term || typeof term !== 'object') fail('INVALID_MODEL', path, 'linear term must be an object');
    if (!expectedVariableIds.includes(term.variableId)) fail('UNKNOWN_MODEL_VARIABLE', `${path}.variableId`, 'linear term references an unknown variable');
    if (linearIds.has(term.variableId)) fail('DUPLICATE_MODEL_TERM', `${path}.variableId`, 'duplicate linear term');
    finiteNumber(term.coefficient, `${path}.coefficient`);
    linearIds.add(term.variableId);
  });
  if (!sameStringSet([...linearIds], expectedVariableIds)) {
    fail('MODEL_DIMENSION_MISMATCH', '$.model.linearTerms', 'reference model requires exactly one linear term per frozen variable');
  }

  if (!Array.isArray(model.interactionTerms)) fail('INVALID_MODEL', '$.model.interactionTerms', 'interactionTerms must be an array');
  const interactionKeys = new Set();
  model.interactionTerms.forEach((term, index) => {
    const path = `$.model.interactionTerms[${index}]`;
    if (!term || !Array.isArray(term.variableIds) || term.variableIds.length !== 2) {
      fail('INVALID_INTERACTION_TERM', path, 'interaction term must contain exactly two variable identifiers');
    }
    const [left, right] = term.variableIds;
    if (left === right || !expectedVariableIds.includes(left) || !expectedVariableIds.includes(right)) {
      fail('UNKNOWN_MODEL_VARIABLE', `${path}.variableIds`, 'interaction term must reference two distinct frozen variables');
    }
    finiteNumber(term.coefficient, `${path}.coefficient`);
    const key = [left, right].sort().join(':');
    if (interactionKeys.has(key)) fail('DUPLICATE_MODEL_TERM', `${path}.variableIds`, 'duplicate interaction term');
    interactionKeys.add(key);
  });

  return { distributionMap };
}

function validateSobolPlan(samplePlan) {
  if (!samplePlan || typeof samplePlan !== 'object') fail('INVALID_SAMPLE_PLAN', '$.samplePlan', 'samplePlan must be an object');
  if (samplePlan.estimator !== 'JANSEN_COMPLEMENT_FIRST_AND_TOTAL') {
    fail('UNSUPPORTED_ESTIMATOR', '$.samplePlan.estimator', 'unsupported Sobol estimator');
  }
  if (!Number.isInteger(samplePlan.seedUint32) || samplePlan.seedUint32 <= 0 || samplePlan.seedUint32 > 0xffffffff) {
    fail('INVALID_RANDOM_SEED', '$.samplePlan.seedUint32', 'seedUint32 must be a nonzero unsigned 32-bit integer');
  }
  if (!Number.isInteger(samplePlan.finalSampleCount) || samplePlan.finalSampleCount < 2) {
    fail('INVALID_SAMPLE_PLAN', '$.samplePlan.finalSampleCount', 'finalSampleCount must be an integer >= 2');
  }
  if (!Number.isInteger(samplePlan.blockCount) || samplePlan.blockCount < 2) {
    fail('INVALID_SAMPLE_PLAN', '$.samplePlan.blockCount', 'blockCount must be an integer >= 2');
  }
  if (samplePlan.finalSampleCount % samplePlan.blockCount !== 0) {
    fail('INVALID_SAMPLE_PLAN', '$.samplePlan.blockCount', 'blockCount must divide finalSampleCount exactly');
  }
  const samplesPerBlock = samplePlan.finalSampleCount / samplePlan.blockCount;
  if (samplePlan.samplesPerBlock !== samplesPerBlock) {
    fail('INVALID_SAMPLE_PLAN', '$.samplePlan.samplesPerBlock', 'samplesPerBlock must equal finalSampleCount / blockCount');
  }
}

export function evaluatePolynomialModel(model, values) {
  let output = model.intercept;
  for (const term of model.linearTerms) output += term.coefficient * values[term.variableId];
  for (const term of model.interactionTerms) {
    output += term.coefficient * values[term.variableIds[0]] * values[term.variableIds[1]];
  }
  if (!Number.isFinite(output)) fail('NON_FINITE_MODEL_VALUE', '$.modelOutput', 'model evaluation produced a non-finite value');
  return output;
}

const sampleMean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const sampleStandardDeviation = (values, mean = sampleMean(values)) => {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
};

const aggregateBlocks = (values) => {
  const mean = sampleMean(values);
  const standardDeviation = sampleStandardDeviation(values, mean);
  return { mean, standardDeviation, standardError: standardDeviation / Math.sqrt(values.length) };
};

export function runMorrisAdditiveReference({ variableIds, designOrder, expectedVariableIds, distributions, model, morrisPlan }) {
  const { distributionMap } = validateCore({ variableIds, designOrder, expectedVariableIds, distributions, model });
  if (!morrisPlan || typeof morrisPlan !== 'object') fail('INVALID_MORRIS_PLAN', '$.morrisPlan', 'morrisPlan must be an object');
  finiteNumber(morrisPlan.delta, '$.morrisPlan.delta');
  if (!(morrisPlan.delta > 0)) fail('INVALID_MORRIS_STEP', '$.morrisPlan.delta', 'Morris delta must be positive');
  if (!morrisPlan.basePoint || typeof morrisPlan.basePoint !== 'object') fail('INVALID_MORRIS_PLAN', '$.morrisPlan.basePoint', 'basePoint must be an object');
  expectedVariableIds.forEach((id) => {
    finiteNumber(morrisPlan.basePoint[id], `$.morrisPlan.basePoint.${id}`);
    const { minimum, maximum } = distributionMap.get(id);
    if (morrisPlan.basePoint[id] < minimum || morrisPlan.basePoint[id] > maximum) {
      fail('MORRIS_POINT_OUT_OF_BOUNDS', `$.morrisPlan.basePoint.${id}`, 'Morris base point lies outside the input domain');
    }
    if (morrisPlan.basePoint[id] + morrisPlan.delta > maximum) {
      fail('INVALID_MORRIS_STEP', '$.morrisPlan.delta', 'Morris positive step leaves the input domain');
    }
  });
  if (!Array.isArray(morrisPlan.trajectoryOrders) || morrisPlan.trajectoryOrders.length === 0) {
    fail('INVALID_MORRIS_PLAN', '$.morrisPlan.trajectoryOrders', 'at least one trajectory order is required');
  }
  if (morrisPlan.trajectoryCount !== morrisPlan.trajectoryOrders.length) {
    fail('INVALID_MORRIS_PLAN', '$.morrisPlan.trajectoryCount', 'trajectoryCount must match trajectoryOrders length');
  }

  const effects = Object.fromEntries(expectedVariableIds.map((id) => [id, []]));
  for (let trajectoryIndex = 0; trajectoryIndex < morrisPlan.trajectoryOrders.length; trajectoryIndex += 1) {
    const order = morrisPlan.trajectoryOrders[trajectoryIndex];
    if (!Array.isArray(order) || !sameStringSet(order, expectedVariableIds) || new Set(order).size !== expectedVariableIds.length) {
      fail('INVALID_MORRIS_DESIGN', `$.morrisPlan.trajectoryOrders[${trajectoryIndex}]`, 'each trajectory order must be a permutation of the frozen variables');
    }
    let current = { ...morrisPlan.basePoint };
    for (const id of order) {
      const before = evaluatePolynomialModel(model, current);
      const next = { ...current, [id]: current[id] + morrisPlan.delta };
      const after = evaluatePolynomialModel(model, next);
      effects[id].push((after - before) / morrisPlan.delta);
      current = next;
    }
  }

  const mu = {};
  const muStar = {};
  const sigma = {};
  expectedVariableIds.forEach((id) => {
    mu[id] = sampleMean(effects[id]);
    muStar[id] = sampleMean(effects[id].map(Math.abs));
    sigma[id] = sampleStandardDeviation(effects[id], mu[id]);
  });
  const rankingDescending = [...expectedVariableIds].sort((left, right) => muStar[right] - muStar[left] || left.localeCompare(right));
  return { effects, mu, muStar, sigma, rankingDescending };
}

export function runSobolReference({ variableIds, designOrder, expectedVariableIds, distributions, model, samplePlan }) {
  const { distributionMap } = validateCore({ variableIds, designOrder, expectedVariableIds, distributions, model });
  validateSobolPlan(samplePlan);
  const canonicalIds = [...expectedVariableIds];
  const nextUniform = createXorShift32(samplePlan.seedUint32);
  const blocks = [];

  for (let blockIndex = 0; blockIndex < samplePlan.blockCount; blockIndex += 1) {
    let sum = 0;
    let sumSquares = 0;
    let combinedCount = 0;
    const firstComplementNumerator = Object.fromEntries(canonicalIds.map((id) => [id, 0]));
    const totalNumerator = Object.fromEntries(canonicalIds.map((id) => [id, 0]));

    for (let sampleIndex = 0; sampleIndex < samplePlan.samplesPerBlock; sampleIndex += 1) {
      const a = {};
      const b = {};
      for (const id of canonicalIds) {
        const { minimum, maximum } = distributionMap.get(id);
        a[id] = minimum + (maximum - minimum) * nextUniform();
        b[id] = minimum + (maximum - minimum) * nextUniform();
      }
      const yA = evaluatePolynomialModel(model, a);
      const yB = evaluatePolynomialModel(model, b);
      sum += yA + yB;
      sumSquares += yA ** 2 + yB ** 2;
      combinedCount += 2;
      for (const id of canonicalIds) {
        const ab = { ...a, [id]: b[id] };
        const yAB = evaluatePolynomialModel(model, ab);
        totalNumerator[id] += (yA - yAB) ** 2;
        firstComplementNumerator[id] += (yB - yAB) ** 2;
      }
    }

    const mean = sum / combinedCount;
    const variance = (sumSquares - combinedCount * mean ** 2) / (combinedCount - 1);
    if (!(variance > 0) || !Number.isFinite(variance)) fail('INVALID_OUTPUT_VARIANCE', '$.sobol.variance', 'Sobol output variance must be finite and positive');
    const firstOrder = {};
    const total = {};
    for (const id of canonicalIds) {
      total[id] = totalNumerator[id] / (2 * samplePlan.samplesPerBlock * variance);
      firstOrder[id] = 1 - firstComplementNumerator[id] / (2 * samplePlan.samplesPerBlock * variance);
    }
    const pairInteractionX1X2 = ((total.X1 - firstOrder.X1) + (total.X2 - firstOrder.X2)) / 2;
    blocks.push({ variance, firstOrder, total, pairInteractionX1X2 });
  }

  const variance = aggregateBlocks(blocks.map((block) => block.variance));
  const firstOrder = {};
  const total = {};
  canonicalIds.forEach((id) => {
    firstOrder[id] = aggregateBlocks(blocks.map((block) => block.firstOrder[id]));
    total[id] = aggregateBlocks(blocks.map((block) => block.total[id]));
  });
  const pairInteractionX1X2 = aggregateBlocks(blocks.map((block) => block.pairInteractionX1X2));
  return {
    finalSampleCount: samplePlan.finalSampleCount,
    blockCount: samplePlan.blockCount,
    samplesPerBlock: samplePlan.samplesPerBlock,
    variance,
    firstOrder,
    total,
    pairInteractionX1X2,
  };
}

export function assertReferenceAuthority(authority) {
  if (!authority || authority.referenceSensitivityExecutionAuthorized !== true) {
    fail('REFERENCE_AUTHORITY_REQUIRED', '$.authority.referenceSensitivityExecutionAuthorized', 'reference sensitivity execution must be explicitly authorized');
  }
  const forbiddenTrue = [
    'productionStatisticalExecutionAuthorized',
    'productionSensitivityAuthorized',
    'productionReliabilityTargetAuthorized',
    'codeQualificationAuthorized',
    'releaseAuthorityGranted',
    'temperatureAuthorityGranted',
  ];
  forbiddenTrue.forEach((key) => {
    if (authority[key] !== false) fail('PRODUCTION_AUTHORITY_LEAKAGE', `$.authority.${key}`, `${key} must remain false in the reference case`);
  });
}
