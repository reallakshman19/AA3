import assert from 'node:assert/strict';

export function createS3Checks(acceptance) {
  function compare(checks, label, actual, expected) {
    const absoluteError = Math.abs(actual - expected);
    const limit = acceptance.linearRelationRelativeTolerance
      * Math.max(acceptance.linearRelationScaleFloor, Math.abs(expected));
    checks.push({ label, actual, expected, absoluteError, limit, accepted: absoluteError <= limit });
  }

  function gate(checks, label, actualMagnitude, limit) {
    checks.push({
      label,
      actual: actualMagnitude,
      expected: 0,
      absoluteError: actualMagnitude,
      limit,
      accepted: actualMagnitude <= limit,
    });
  }

  function gateLower(checks, label, actual, lowerExclusive) {
    checks.push({
      label,
      actual,
      expected: `>${lowerExclusive}`,
      absoluteError: null,
      limit: null,
      accepted: actual > lowerExclusive,
    });
  }

  function compareVectors(checks, label, actual, base, factor) {
    actual.forEach((value, index) => compare(checks, `${label}[${index}]`, value, factor * base[index]));
  }

  function compareSumVectors(checks, label, actual, left, right) {
    actual.forEach((value, index) => compare(checks, `${label}[${index}]`, value, left[index] + right[index]));
  }

  function compareDisplacements(checks, actual, base, factor) {
    const baseByNode = new Map(base.nodalDisplacements.map((row) => [row.nodeId, row]));
    actual.nodalDisplacements.forEach((row) => {
      const expected = baseByNode.get(row.nodeId);
      compare(checks, `${row.nodeId}.ux`, row.ux, factor * expected.ux);
      compare(checks, `${row.nodeId}.uy`, row.uy, factor * expected.uy);
    });
  }

  function compareSumDisplacements(checks, actual, left, right) {
    const leftByNode = new Map(left.nodalDisplacements.map((row) => [row.nodeId, row]));
    const rightByNode = new Map(right.nodalDisplacements.map((row) => [row.nodeId, row]));
    actual.nodalDisplacements.forEach((row) => {
      compare(
        checks,
        `${row.nodeId}.ux`,
        row.ux,
        leftByNode.get(row.nodeId).ux + rightByNode.get(row.nodeId).ux,
      );
      compare(
        checks,
        `${row.nodeId}.uy`,
        row.uy,
        leftByNode.get(row.nodeId).uy + rightByNode.get(row.nodeId).uy,
      );
    });
  }

  function compareElementStress(checks, actual, base, factor) {
    const baseById = new Map(base.elementResults.map((row) => [row.elementId, row]));
    actual.elementResults.forEach((row) => {
      compareStress(checks, row.elementId, row.stress, baseById.get(row.elementId).stress, factor);
    });
  }

  function compareSumElementStress(checks, actual, left, right) {
    const leftById = new Map(left.elementResults.map((row) => [row.elementId, row]));
    const rightById = new Map(right.elementResults.map((row) => [row.elementId, row]));
    actual.elementResults.forEach((row) => {
      const a = leftById.get(row.elementId).stress;
      const b = rightById.get(row.elementId).stress;
      for (const key of ['sigmaX', 'sigmaY', 'sigmaZ', 'tauXY']) {
        compare(checks, `${row.elementId}.${key}`, row.stress[key], a[key] + b[key]);
      }
    });
  }

  function compareStress(checks, elementId, actual, base, factor) {
    for (const key of ['sigmaX', 'sigmaY', 'sigmaZ', 'tauXY']) {
      compare(checks, `${elementId}.${key}`, actual[key], factor * base[key]);
    }
  }

  function compareReactions(checks, actual, base, factor) {
    const baseByDof = new Map(base.supportReactions.map((row) => [row.dofIdentity, row.value]));
    actual.supportReactions.forEach((row) => {
      compare(checks, `reaction.${row.dofIdentity}`, row.value, factor * baseByDof.get(row.dofIdentity));
    });
  }

  function compareSumReactions(checks, actual, left, right) {
    const leftByDof = new Map(left.supportReactions.map((row) => [row.dofIdentity, row.value]));
    const rightByDof = new Map(right.supportReactions.map((row) => [row.dofIdentity, row.value]));
    actual.supportReactions.forEach((row) => compare(
      checks,
      `reaction.${row.dofIdentity}`,
      row.value,
      leftByDof.get(row.dofIdentity) + rightByDof.get(row.dofIdentity),
    ));
  }

  return {
    compare,
    gate,
    gateLower,
    compareVectors,
    compareSumVectors,
    compareDisplacements,
    compareSumDisplacements,
    compareElementStress,
    compareSumElementStress,
    compareReactions,
    compareSumReactions,
  };
}

export function conditioningEvidence(row, checks, { gate, gateLower }) {
  const value = conditioningObservation(row);
  if (value.method === 'DETERMINISTIC_CHOLESKY') {
    assert.ok(value.pivotCount > 0, 'Cholesky evidence requires retained pivots');
    gateLower(checks, 'conditioning.minimumPivot', value.minimumPivot, value.pivotTolerance);
  } else if (value.method === 'DETERMINISTIC_JACOBI_PCG') {
    gateLower(checks, 'conditioning.minimumDiagonal', value.minimumDiagonal, value.diagonalTolerance);
    gate(checks, 'conditioning.finalResidual', value.finalResidualInfinity, value.convergenceTarget);
  } else {
    assert.fail(`unexpected solver method for S3 conditioning evidence: ${value.method}`);
  }
  return value;
}

export function conditioningObservation(row) {
  const value = row.solverEvidence;
  if (value.method === 'DETERMINISTIC_CHOLESKY') {
    return {
      method: value.method,
      pivotCount: value.pivots.length,
      pivotScale: value.pivotScale,
      pivotTolerance: value.pivotTolerance,
      minimumPivot: value.minimumPivot,
      maximumPivot: value.maximumPivot,
      pivotRatio: value.pivotRatio,
      iterativeRefinement: value.iterativeRefinement ?? null,
    };
  }
  return {
    method: value.method,
    minimumDiagonal: value.minimumDiagonal ?? null,
    maximumDiagonal: value.maximumDiagonal ?? null,
    diagonalRatio: value.diagonalRatio ?? null,
    diagonalTolerance: value.diagonalTolerance ?? null,
    initialResidualInfinity: value.initialResidualInfinity ?? null,
    finalResidualInfinity: value.finalResidualInfinity ?? null,
    convergenceTarget: value.convergenceTarget ?? null,
    iterations: value.iterations ?? null,
  };
}

export function finalizeChecks(checks, observation) {
  const failed = checks.filter((row) => !row.accepted);
  return {
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    observation,
    checks,
    maximumAbsoluteError: Math.max(0, ...checks.map((row) => row.absoluteError ?? 0)),
    failedCheckCount: failed.length,
  };
}

export function displacementVectorFor(row, dofOrdering) {
  const byNode = new Map(row.nodalDisplacements.map((item) => [item.nodeId, item]));
  return dofOrdering.map((identity) => {
    const separator = identity.lastIndexOf(':');
    const nodeId = identity.slice(0, separator);
    const dof = identity.slice(separator + 1);
    const displacement = byNode.get(nodeId);
    return dof === 'UX' ? displacement.ux : displacement.uy;
  });
}

export function vectorTotals(dofOrdering, values) {
  return values.reduce((out, value, index) => {
    if (dofOrdering[index].endsWith(':UX')) out.x += value;
    else out.y += value;
    return out;
  }, { x: 0, y: 0 });
}

export function reactionTotals(reactions) {
  return reactions.reduce((out, row) => {
    if (row.dofIdentity.endsWith(':UX')) out.x += row.value;
    else out.y += row.value;
    return out;
  }, { x: 0, y: 0 });
}

export function nodalCase(loadCaseId, loads) {
  return {
    loadCaseId,
    nodalForces: loads.map((row) => ({ ...row, sourceReference: `FORCE#${row.loadId}` })),
    edgeTractions: [],
    pressureLoads: [],
    bodyForces: [],
    temperatureLoads: [],
    imposedDisplacements: [],
    sourceReference: `CASE#${loadCaseId}`,
  };
}

export function caseBy(result, loadCaseId) {
  const row = result.loadCaseResults.find((item) => item.loadCaseId === loadCaseId);
  assert.ok(row, `missing load case ${loadCaseId}`);
  return row;
}

export function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}
