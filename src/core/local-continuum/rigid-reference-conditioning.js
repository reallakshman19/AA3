const RANK_EPSILON_FACTOR = 256;

/**
 * Removes a best-fit 2D rigid translation/rotation from prescribed scalar
 * displacement constraints before the partition solve. In exact linear
 * elasticity K*r = 0 for a rigid field r, so solving the correction field
 * and adding r back afterward is mechanically invariant while avoiding a
 * cancellation-dominated prescribed-displacement RHS.
 *
 * The conditioner is deliberately rank-safe: unless the constrained scalar
 * DOFs span all three in-plane rigid modes, it returns the original
 * constraints and a zero reference so the legacy partition path is exact.
 */
export function rigidReferenceConditioning(model, dofs, constraints) {
  const zeroReference = Array(dofs.length).fill(0);
  if (constraints.indices.length < 3) {
    return inactive(constraints, zeroReference);
  }

  const nodeMap = new Map(model.nodes.map((node) => [node.nodeId, node]));
  const rows = [];
  const participatingNodes = new Map();
  for (let position = 0; position < constraints.indices.length; position += 1) {
    const dofIndex = constraints.indices[position];
    const identity = dofs[dofIndex];
    const split = identity?.lastIndexOf(':') ?? -1;
    if (split <= 0) return inactive(constraints, zeroReference);
    const nodeId = identity.slice(0, split);
    const axis = identity.slice(split + 1);
    if (axis !== 'UX' && axis !== 'UY') return inactive(constraints, zeroReference);
    const node = nodeMap.get(nodeId);
    if (!node) return inactive(constraints, zeroReference);
    participatingNodes.set(nodeId, node);
    rows.push({ node, axis, value: constraints.values[position] });
  }

  const nodes = [...participatingNodes.values()];
  if (nodes.length < 2) return inactive(constraints, zeroReference);
  const centroidX = compensatedSum(nodes.map((node) => node.x)) / nodes.length;
  const centroidY = compensatedSum(nodes.map((node) => node.y)) / nodes.length;
  const geometryScale = Math.max(
    0,
    ...nodes.map((node) => Math.hypot(node.x - centroidX, node.y - centroidY)),
  );
  if (!(geometryScale > 0) || !Number.isFinite(geometryScale)) {
    return inactive(constraints, zeroReference);
  }

  const normal = Array.from({ length: 3 }, () => Array(3).fill(0));
  const rightHandSide = Array(3).fill(0);
  for (const row of rows) {
    const dx = (row.node.x - centroidX) / geometryScale;
    const dy = (row.node.y - centroidY) / geometryScale;
    const coefficients = row.axis === 'UX'
      ? [1, 0, -dy]
      : [0, 1, dx];
    for (let left = 0; left < 3; left += 1) {
      rightHandSide[left] += coefficients[left] * row.value;
      for (let right = 0; right < 3; right += 1) {
        normal[left][right] += coefficients[left] * coefficients[right];
      }
    }
  }

  const parameters = solveFullRankThreeByThree(normal, rightHandSide);
  if (!parameters) return inactive(constraints, zeroReference);
  const [translationXAtCentroid, translationYAtCentroid, scaledRotation] = parameters;
  const rotation = scaledRotation / geometryScale;
  if (![translationXAtCentroid, translationYAtCentroid, rotation].every(Number.isFinite)) {
    return inactive(constraints, zeroReference);
  }

  const referenceVector = dofs.map((identity) => {
    const split = identity.lastIndexOf(':');
    const node = nodeMap.get(identity.slice(0, split));
    const axis = identity.slice(split + 1);
    const dx = node.x - centroidX;
    const dy = node.y - centroidY;
    return axis === 'UX'
      ? translationXAtCentroid - rotation * dy
      : translationYAtCentroid + rotation * dx;
  });
  if (maximumAbsolute(referenceVector) === 0) {
    return inactive(constraints, zeroReference);
  }

  return {
    active: true,
    referenceVector,
    constraints: {
      indices: constraints.indices,
      values: constraints.values.map((value, position) => (
        value - referenceVector[constraints.indices[position]]
      )),
      indexSet: constraints.indexSet,
    },
  };
}

function inactive(constraints, referenceVector) {
  return { active: false, referenceVector, constraints };
}

function solveFullRankThreeByThree(matrix, rightHandSide) {
  const augmented = matrix.map((row, index) => [...row, rightHandSide[index]]);
  const scale = Math.max(1, maximumAbsolute(matrix.flat()));
  const rankLimit = Number.EPSILON * RANK_EPSILON_FACTOR * scale;
  for (let column = 0; column < 3; column += 1) {
    let pivotRow = column;
    let pivotMagnitude = Math.abs(augmented[column][column]);
    for (let row = column + 1; row < 3; row += 1) {
      const magnitude = Math.abs(augmented[row][column]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }
    if (!(pivotMagnitude > rankLimit)) return null;
    if (pivotRow !== column) {
      [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
    }
    const pivot = augmented[column][column];
    for (let row = column + 1; row < 3; row += 1) {
      const factor = augmented[row][column] / pivot;
      for (let entry = column; entry < 4; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }
  const solution = Array(3).fill(0);
  for (let row = 2; row >= 0; row -= 1) {
    let value = augmented[row][3];
    for (let column = row + 1; column < 3; column += 1) {
      value -= augmented[row][column] * solution[column];
    }
    const pivot = augmented[row][row];
    if (!(Math.abs(pivot) > rankLimit)) return null;
    solution[row] = value / pivot;
  }
  return solution.every(Number.isFinite) ? solution : null;
}

function compensatedSum(values) {
  let sum = 0;
  let compensation = 0;
  for (const term of values) {
    const next = sum + term;
    compensation += Math.abs(sum) >= Math.abs(term)
      ? (sum - next) + term
      : (term - next) + sum;
    sum = next;
  }
  return sum + compensation;
}

function maximumAbsolute(values) {
  return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
}
