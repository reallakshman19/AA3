export function bilinearNoExtrapolation(xKnots, yKnots, grid, x, y) {
  validateKnots(xKnots, 'diameterRatio');
  validateKnots(yKnots, 'diameterThicknessRatio');
  validateGrid(grid, xKnots.length, yKnots.length);
  const xb = bracket(xKnots, x, 'diameterRatio');
  const yb = bracket(yKnots, y, 'diameterThicknessRatio');
  const q11 = grid[xb.lowerIndex][yb.lowerIndex];
  const q12 = grid[xb.lowerIndex][yb.upperIndex];
  const q21 = grid[xb.upperIndex][yb.lowerIndex];
  const q22 = grid[xb.upperIndex][yb.upperIndex];
  const lower = lerp(q11, q21, xb.weight);
  const upper = lerp(q12, q22, xb.weight);
  const value = lerp(lower, upper, yb.weight);
  return freeze({
    value,
    evidence: {
      interpolationPolicyId: 'BILINEAR_NO_EXTRAPOLATION',
      x: xb,
      y: yb,
      cornerValues: { q11, q12, q21, q22 },
      intermediateValues: { lower, upper },
      result: value,
    },
  });
}

export function bracket(knots, value, axisId) {
  if (!Number.isFinite(value)) throw interpolationError('CORRELATION_AXIS_NON_FINITE', axisId);
  const minimum = knots[0];
  const maximum = knots.at(-1);
  if (value < minimum || value > maximum) {
    const error = interpolationError('OUTSIDE_CORRELATION_DOMAIN', axisId);
    error.domain = { minimum, maximum, value };
    throw error;
  }
  const exactIndex = knots.findIndex((knot) => Object.is(knot, value) || knot === value);
  if (exactIndex >= 0) {
    return freeze({
      axisId, value,
      lowerIndex: exactIndex, upperIndex: exactIndex,
      lowerKnot: knots[exactIndex], upperKnot: knots[exactIndex], weight: 0,
      exactKnot: true,
    });
  }
  for (let index = 0; index < knots.length - 1; index += 1) {
    const lowerKnot = knots[index];
    const upperKnot = knots[index + 1];
    if (value > lowerKnot && value < upperKnot) {
      return freeze({
        axisId, value,
        lowerIndex: index, upperIndex: index + 1,
        lowerKnot, upperKnot,
        weight: (value - lowerKnot) / (upperKnot - lowerKnot),
        exactKnot: false,
      });
    }
  }
  throw interpolationError('CORRELATION_BRACKET_NOT_FOUND', axisId);
}

function lerp(a, b, weight) {
  return a + (b - a) * weight;
}

function validateKnots(knots, axisId) {
  if (!Array.isArray(knots) || knots.length < 2) throw interpolationError('CORRELATION_AXIS_KNOTS_REQUIRED', axisId);
  knots.forEach((value, index) => {
    if (!Number.isFinite(value)) throw interpolationError('CORRELATION_AXIS_KNOT_NON_FINITE', `${axisId}[${index}]`);
    if (index && value <= knots[index - 1]) throw interpolationError('CORRELATION_AXIS_NOT_STRICTLY_INCREASING', axisId);
  });
}

function validateGrid(grid, xCount, yCount) {
  if (!Array.isArray(grid) || grid.length !== xCount) throw interpolationError('CORRELATION_GRID_X_SIZE_MISMATCH', 'coefficients');
  grid.forEach((row, xIndex) => {
    if (!Array.isArray(row) || row.length !== yCount) throw interpolationError('CORRELATION_GRID_Y_SIZE_MISMATCH', `coefficients[${xIndex}]`);
    row.forEach((value, yIndex) => {
      if (!Number.isFinite(value)) throw interpolationError('CORRELATION_GRID_NON_FINITE', `coefficients[${xIndex}][${yIndex}]`);
    });
  });
}

function interpolationError(code, path) {
  const error = new Error(code);
  error.code = code;
  error.path = path;
  return error;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
