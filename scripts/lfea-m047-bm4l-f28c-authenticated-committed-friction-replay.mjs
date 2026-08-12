import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  applyDiagonalScalingToMatrix,
  applyDiagonalScalingToVector,
  diagonalScaleFactors,
  undoDiagonalScaling,
} from '../src/core/lafea-linear-solve/diagonal-scaling.js';
import {
  sparseCholeskyFactorize,
  sparseCholeskySolve,
} from '../src/core/lafea-linear-solve/sparse-cholesky.js';

const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);
const GOVERNED_QUANTITIES = new Set([
  'DISPLACEMENT',
  'ROTATION',
  'FORCE',
  'MOMENT',
  'GLOBAL_END_FORCE_FROM',
  'GLOBAL_END_FORCE_TO',
  'GLOBAL_END_MOMENT_FROM',
  'GLOBAL_END_MOMENT_TO',
]);
const EXPECTED_RESTRAINT_ROW_PROJECTION_SHA256 = '7af58e11640346880910a2bd0a54fcae6b7f8ee418be26fe0165fbc018732bc5';
const PIVOT_TOLERANCE = 1e-12;

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = /^--([^=]+)=(.*)$/.exec(arg);
  if (!match) throw new Error(`Expected --name=value argument, got ${arg}`);
  return [match[1], match[2]];
}));
for (const required of ['actual', 'report', 'provenance', 'bm4nl', 'contract', 'out']) {
  if (!args[required]) throw new Error(`Missing --${required}=...`);
}

const actual = readJson(args.actual);
const report = readJson(args.report);
const provenance = readJson(args.provenance);
const bm4nl = readJson(args.bm4nl);
const contract = readJson(args.contract);

validateCustody({ actual, provenance, bm4nl, contract });
const l13 = requireReportCase(report, 'L13');
const l6 = requireReportCase(report, 'L6');
const endpointEquivalence = {
  case17ToL13: compareProductEndpoint(bm4nl.outputDisplacements, 17, l13.referenceRows),
  case19ToL6: compareProductEndpoint(bm4nl.outputDisplacements, 19, l6.referenceRows),
};
if (endpointEquivalence.case17ToL13.comparedComponentCount !== 582
  || endpointEquivalence.case19ToL6.comparedComponentCount !== 582) {
  throw new Error(`Expected 582 governed displacement/rotation endpoint components per case; got ${JSON.stringify(endpointEquivalence)}.`);
}
if (endpointEquivalence.case17ToL13.maximumAbsoluteDifference > 1e-10
  || endpointEquivalence.case19ToL6.maximumAbsoluteDifference > 1e-10) {
  throw new Error(`BM4_NL endpoint identity check failed: ${JSON.stringify(endpointEquivalence)}.`);
}

const restraintProjection = requireRestraintProjection(provenance);
const frictionRows = restraintProjection.rows.filter((row) => Number(row.FRIC_COEF) > 0);
if (frictionRows.length !== contract.replay.frictionSiteCount) {
  throw new Error(`Expected ${contract.replay.frictionSiteCount} positive-friction ACCDB rows, got ${frictionRows.length}.`);
}
const frictionNodeIds = [...new Set(frictionRows.map((row) => String(row.NODE_NUM)))].sort(compareText);
if (frictionNodeIds.length !== 26) throw new Error(`Expected 26 unique friction nodes, got ${frictionNodeIds.length}.`);

const case17RigidY = requireRigidYRows(bm4nl.outputRestraints, 17, frictionNodeIds);
const case19RigidY = requireRigidYRows(bm4nl.outputRestraints, 19, frictionNodeIds);
const maximumCase19TangentialForceN = Math.max(...case19RigidY.flatMap((row) => [Math.abs(row.FX), Math.abs(row.FZ)]));
if (maximumCase19TangentialForceN !== 0) {
  throw new Error(`BM4_NL friction-off case 19 has nonzero Rigid Y tangential force ${maximumCase19TangentialForceN} N.`);
}
validateWithdrawnCandidate(case17RigidY, contract.withdrawnCandidate);

const mechanics = actual?.mechanics?.cases?.L6;
if (!mechanics || mechanics.analysisNodeCount !== 323 || mechanics.recoveryLedger?.length !== 322) {
  throw new Error('Fresh BM4_L L6 mechanics ledger is missing the exact 323-node / 322-element reconstruction.');
}
const state = reconstructLinearState({
  recoveryLedger: mechanics.recoveryLedger,
  restraintRows: restraintProjection.rows,
  configurationAuthority: report.configurationAuthority,
});
if (state.nodes.length !== 323 || state.springByDof.size !== 51) {
  throw new Error(`Expected 323 analysis nodes and 51 grounded springs; got ${state.nodes.length} and ${state.springByDof.size}.`);
}

const replayLoad = new Array(state.dofCount).fill(0);
for (const row of case17RigidY) {
  const nodeBase = state.nodeIndex.get(String(row.NODE)) * 6;
  replayLoad[nodeBase] += -Number(row.FX);
  replayLoad[nodeBase + 2] += -Number(row.FZ);
}
const committedVectorSha256 = sha256Json(case17RigidY.map((row) => ({
  nodeId: String(row.NODE), fxN: Number(row.FX), fyN: Number(row.FY), fzN: Number(row.FZ),
})));

const displacementIncrement = solveScaledSpd(state.matrix, replayLoad);
const solvedDisplacement = state.u6.map((value, index) => value + displacementIncrement[index]);
const solveResidual = vectorSubtract(symmetricMatVec(state.matrix, displacementIncrement), replayLoad);
const maximumAbsoluteIncrementalSolveResidualN = Math.max(...solveResidual.map(Math.abs));
if (maximumAbsoluteIncrementalSolveResidualN > 2e-6) {
  throw new Error(`Committed-load incremental solve residual ${maximumAbsoluteIncrementalSolveResidualN} exceeds 2e-6.`);
}

const recovered = recoverElementActions(mechanics.recoveryLedger, solvedDisplacement, state.nodeIndex);
const replayLoadByNodeDof = new Map();
for (const row of case17RigidY) {
  replayLoadByNodeDof.set(`${String(row.NODE)}:UX`, -Number(row.FX));
  replayLoadByNodeDof.set(`${String(row.NODE)}:UZ`, -Number(row.FZ));
}
const generated = buildGovernedActualMap({
  actualL6Rows: actual.cases.L6.rows,
  solvedDisplacement,
  nodeIndex: state.nodeIndex,
  springByDof: state.springByDof,
  replayLoadByNodeDof,
  recovered,
});
const comparison = compareGovernedRows(l13.referenceRows, generated, report.tolerances);
if (comparison.total !== contract.replay.governedDenominator) {
  throw new Error(`Governed denominator drifted: ${comparison.total} != ${contract.replay.governedDenominator}.`);
}
if (comparison.passed !== contract.replay.independentlyPrecomputedExpectedPassed
  || comparison.failed !== contract.replay.independentlyPrecomputedExpectedFailed) {
  throw new Error(
    `Fresh artifact replay produced ${comparison.passed}/${comparison.total}, expected `
    + `${contract.replay.independentlyPrecomputedExpectedPassed}/${contract.replay.governedDenominator}.`,
  );
}

const output = {
  schema: 'm047-bm4l-f28c-authenticated-committed-friction-replay/v1',
  benchmarkId: 'BM4_L',
  status: 'PASS_AUTHENTICATED_COMMITTED_VECTOR_DIAGNOSTIC_REPLAY',
  custody: {
    bm4lAccdbSha256: actual.sourceAccdbSha256,
    bm4lInputRestraintsRowProjectionSha256: restraintProjection.rowsSha256,
    bm4NlCommonCommit: bm4nl.commonCommit,
    bm4NlZipGitBlobSha: bm4nl.zipGitBlobSha,
    bm4NlAccdbSha256: bm4nl.accdbSha256,
    committedCase17RigidYVectorSha256: committedVectorSha256,
    frictionSiteCount: frictionNodeIds.length,
    frictionNodeIds,
    maximumCase19TangentialForceN,
  },
  endpointEquivalence,
  systemReconstruction: {
    analysisNodeCount: state.nodes.length,
    dofCount: state.dofCount,
    analysisElementCount: mechanics.recoveryLedger.length,
    groundedSpringCount: state.springByDof.size,
    pivotTolerance: PIVOT_TOLERANCE,
    maximumAbsoluteIncrementalSolveResidualN,
  },
  replayMechanics: {
    source: 'AUTHENTICATED_BM4_NL_CASE17_RIGID_Y_XZ_COMMITTED_PRODUCT_VECTOR',
    pipeTangentialLoadRule: contract.replay.pipeTangentialLoadRule,
    restraintForceReportingRule: contract.replay.restraintForceReportingRule,
    normalForceOrStateHistoryInferredFromBm4lScore: false,
    gapStateSelectedFromBm4lScore: false,
    comparatorChanged: false,
    toleranceChanged: false,
  },
  historicalDiagnostic: {
    passed: contract.replay.historicalDiagnosticPassed,
    failed: contract.replay.governedDenominator - contract.replay.historicalDiagnosticPassed,
    total: contract.replay.governedDenominator,
    passRatePercent: 100 * contract.replay.historicalDiagnosticPassed / contract.replay.governedDenominator,
  },
  authenticatedCommittedVectorDiagnostic: comparison,
  improvement: {
    additionalPassingRows: comparison.passed - contract.replay.historicalDiagnosticPassed,
    percentagePointIncrease:
      comparison.passRatePercent - 100 * contract.replay.historicalDiagnosticPassed / contract.replay.governedDenominator,
  },
  withdrawnCandidate: contract.withdrawnCandidate,
  authority: {
    independentCommittedStateEvidenceAccepted: true,
    predictiveNonlinearStateAlgorithmEstablished: false,
    productionMechanicsAuthorized: false,
    qualifiedL13AccuracyAuthorized: false,
    f29QualificationAuthorized: false,
    nextEngineeringTarget: 'LINEAR_STRUCTURAL_AND_RESULT_RECOVERY_RESIDUALS_PLUS_PREDICTIVE_NONLINEAR_STATE_ALGORITHM',
  },
};

fs.writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  status: output.status,
  endpointEquivalence: output.endpointEquivalence,
  score: {
    passed: comparison.passed,
    failed: comparison.failed,
    total: comparison.total,
    passRatePercent: comparison.passRatePercent,
  },
  improvement: output.improvement,
  qualifiedAccuracyClaimed: false,
}, null, 2));

function reconstructLinearState({ recoveryLedger, restraintRows, configurationAuthority }) {
  const nodes = [];
  const nodeSeen = new Set();
  const uByNode = new Map();
  for (const entry of recoveryLedger) {
    const pairs = [
      [String(entry.nodeI), entry.jointDisplacement12.slice(0, 6)],
      [String(entry.nodeJ), entry.jointDisplacement12.slice(6, 12)],
    ];
    for (const [nodeId, vector] of pairs) {
      if (!nodeSeen.has(nodeId)) {
        nodeSeen.add(nodeId);
        nodes.push(nodeId);
      }
      const prior = uByNode.get(nodeId);
      if (prior && maximumAbsolute(vectorSubtract(prior, vector)) > 1e-10) {
        throw new Error(`Inconsistent retained L6 joint displacement for analysis node ${nodeId}.`);
      }
      if (!prior) uByNode.set(nodeId, vector.map(Number));
    }
  }
  const nodeIndex = new Map(nodes.map((nodeId, index) => [nodeId, index]));
  const dofCount = nodes.length * 6;
  const rows = Array.from({ length: dofCount }, () => new Map());
  for (const entry of recoveryLedger) {
    const globalDofs = [
      ...Array.from({ length: 6 }, (_value, dof) => nodeIndex.get(String(entry.nodeI)) * 6 + dof),
      ...Array.from({ length: 6 }, (_value, dof) => nodeIndex.get(String(entry.nodeJ)) * 6 + dof),
    ];
    const stiffness = entry.globalStiffness.map(Number);
    if (stiffness.length !== 144) throw new Error(`Element ${entry.elementId} lacks a 12x12 global stiffness matrix.`);
    for (let a = 0; a < 12; a += 1) {
      for (let b = 0; b < 12; b += 1) {
        const globalA = globalDofs[a];
        const globalB = globalDofs[b];
        if (globalA < globalB) continue;
        addLower(rows, globalA, globalB, stiffness[a * 12 + b]);
      }
    }
  }

  const defaults = configurationAuthority?.layers?.overallGlobalDefault?.settings;
  const trans = defaults?.DEFAULT_TRANS_RESTRAINT_STIFF;
  const rot = defaults?.DEFAULT_ROT_RESTRAINT_STIFF;
  if (trans?.unit !== 'DISPLAYED_CAESAR_UNITS' || rot?.unit !== 'DISPLAYED_CAESAR_UNITS') {
    throw new Error('Fresh report lacks displayed-unit CAESAR default restraint stiffness authority.');
  }
  const translationStiffness = Number(trans.value) * 100;
  const rotationStiffness = Number(rot.value) * 180 / Math.PI;
  const springByDof = new Map();
  for (const row of restraintRows) {
    const nodeId = String(row.NODE_NUM);
    const type = Number(row.RES_TYPEID);
    const constrainedDofs = type === 1 ? [...Array(6).keys()] : [dominantTranslationDof(row)];
    for (const dof of constrainedDofs) {
      const key = `${nodeId}:${DOFS[dof]}`;
      springByDof.set(key, dof < 3 ? translationStiffness : rotationStiffness);
    }
  }
  for (const [key, stiffness] of springByDof) {
    const [nodeId, dof] = key.split(':');
    const global = nodeIndex.get(nodeId) * 6 + DOFS.indexOf(dof);
    addLower(rows, global, global, stiffness);
  }
  const matrix = Object.freeze({
    size: dofCount,
    rows: Object.freeze(rows.map((row) => Object.freeze(new Map([...row].sort((a, b) => a[0] - b[0]))))),
  });
  const u6 = nodes.flatMap((nodeId) => uByNode.get(nodeId));
  return { nodes, nodeIndex, dofCount, matrix, u6, springByDof };
}

function solveScaledSpd(matrix, rhs) {
  const factors = diagonalScaleFactors(matrix);
  const scaledMatrix = applyDiagonalScalingToMatrix(matrix, factors);
  const scaledRhs = applyDiagonalScalingToVector(rhs, factors);
  const factor = sparseCholeskyFactorize(scaledMatrix, PIVOT_TOLERANCE);
  const scaledSolution = sparseCholeskySolve(factor, scaledRhs);
  return [...undoDiagonalScaling(scaledSolution, factors)];
}

function recoverElementActions(recoveryLedger, displacement, nodeIndex) {
  return recoveryLedger.map((entry) => {
    const joint = [
      ...displacement.slice(nodeIndex.get(String(entry.nodeI)) * 6, nodeIndex.get(String(entry.nodeI)) * 6 + 6),
      ...displacement.slice(nodeIndex.get(String(entry.nodeJ)) * 6, nodeIndex.get(String(entry.nodeJ)) * 6 + 6),
    ];
    const elastic = matrixVector12(entry.globalStiffness, joint);
    const qGlobal = elastic.map((value, index) => value
      - Number(entry.equivalentLoadGlobal[index])
      - Number(entry.initialStrainLoadGlobal[index]));
    return { entry, qGlobal };
  });
}

function buildGovernedActualMap({
  actualL6Rows,
  solvedDisplacement,
  nodeIndex,
  springByDof,
  replayLoadByNodeDof,
  recovered,
}) {
  const map = new Map();
  const sourceEntityBySourceId = new Map();
  for (const row of actualL6Rows) {
    const entityId = String(row.entityId);
    const match = /^INPUT_ELEMENT:([^|]+)\|/.exec(entityId);
    if (match) sourceEntityBySourceId.set(match[1], entityId);
  }

  const sourceGroups = new Map();
  for (const action of recovered) {
    const sourceId = String(action.entry.sourceElementId);
    if (!sourceGroups.has(sourceId)) sourceGroups.set(sourceId, []);
    sourceGroups.get(sourceId).push(action);
  }

  for (const [nodeId, index] of nodeIndex) {
    DOFS.forEach((dof, dofIndex) => {
      const quantity = dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION';
      map.set(rowKey('NODE', nodeId, quantity, dof), clean(solvedDisplacement[index * 6 + dofIndex]));
    });
  }

  const restraintNodeIds = new Set([...springByDof.keys()].map((key) => key.split(':')[0]));
  for (const nodeId of restraintNodeIds) {
    DOFS.forEach((dof, dofIndex) => {
      const springStiffness = springByDof.get(`${nodeId}:${dof}`) ?? 0;
      const springReaction = -springStiffness * solvedDisplacement[nodeIndex.get(nodeId) * 6 + dofIndex];
      const committedTangential = replayLoadByNodeDof.get(`${nodeId}:${dof}`) ?? 0;
      const quantity = dof.startsWith('U') ? 'FORCE' : 'MOMENT';
      map.set(rowKey('NODE', nodeId, quantity, dof), clean(springReaction + committedTangential));
    });
  }

  for (const [sourceId, actions] of sourceGroups) {
    const entityId = sourceEntityBySourceId.get(sourceId);
    if (!entityId) throw new Error(`No retained source-result entity ID for source element ${sourceId}.`);
    appendSourceAction(map, entityId, 'FROM', actions[0].qGlobal.slice(0, 6));
    appendSourceAction(map, entityId, 'TO', actions.at(-1).qGlobal.slice(6, 12));
  }
  return map;
}

function appendSourceAction(map, entityId, end, vector) {
  FORCE_COMPONENTS.forEach((component, index) => {
    map.set(rowKey('ELEMENT', entityId, `GLOBAL_END_FORCE_${end}`, component), clean(vector[index]));
  });
  MOMENT_COMPONENTS.forEach((component, index) => {
    map.set(rowKey('ELEMENT', entityId, `GLOBAL_END_MOMENT_${end}`, component), clean(vector[index + 3]));
  });
}

function compareGovernedRows(referenceRows, generated, tolerances) {
  const governed = referenceRows.filter((row) => GOVERNED_QUANTITIES.has(row.quantity));
  const byQuantity = {};
  const failures = [];
  let passed = 0;
  for (const ref of governed) {
    const key = rowKey(ref.entityKind, ref.entityId, ref.quantity, ref.component);
    if (!generated.has(key)) throw new Error(`Generated replay lacks governed row ${key}.`);
    const actualValue = generated.get(key);
    const referenceValue = Number(ref.value);
    const tolerance = tolerances[ref.quantity];
    if (!tolerance || tolerance.comparisonMode !== 'LITERAL_RELATIVE_WITH_ZERO_ABSOLUTE') {
      throw new Error(`Unsupported comparator for ${ref.quantity}.`);
    }
    const absoluteDifference = Math.abs(actualValue - referenceValue);
    const relativeDifference = referenceValue === 0 ? null : absoluteDifference / Math.abs(referenceValue);
    const ok = referenceValue === 0
      ? absoluteDifference <= Number(tolerance.zeroReferenceAbsolute)
      : relativeDifference < Number(tolerance.relative);
    if (!byQuantity[ref.quantity]) byQuantity[ref.quantity] = { passed: 0, failed: 0, total: 0 };
    byQuantity[ref.quantity].total += 1;
    if (ok) {
      passed += 1;
      byQuantity[ref.quantity].passed += 1;
    } else {
      byQuantity[ref.quantity].failed += 1;
      failures.push({
        entityKind: ref.entityKind,
        entityId: String(ref.entityId),
        quantity: ref.quantity,
        component: ref.component,
        referenceValue,
        actualValue,
        absoluteDifference,
        relativeDifference,
      });
    }
  }
  const total = governed.length;
  return {
    passed,
    failed: total - passed,
    total,
    passRatePercent: 100 * passed / total,
    byQuantity,
    failures,
  };
}

function compareProductEndpoint(rows, lcaseNum, referenceRows) {
  const source = new Map(rows
    .filter((row) => Number(row.LCASE_NUM) === lcaseNum)
    .map((row) => [String(row.NODE), row]));
  let count = 0;
  let maximumAbsoluteDifference = 0;
  let maximumRelativeDifference = 0;
  for (const ref of referenceRows.filter((row) => row.quantity === 'DISPLACEMENT' || row.quantity === 'ROTATION')) {
    const row = source.get(String(ref.entityId));
    if (!row) continue;
    const actual = productDofValue(row, ref.component);
    const expected = Number(ref.value);
    const difference = Math.abs(actual - expected);
    const relative = expected === 0 ? 0 : difference / Math.abs(expected);
    count += 1;
    maximumAbsoluteDifference = Math.max(maximumAbsoluteDifference, difference);
    maximumRelativeDifference = Math.max(maximumRelativeDifference, relative);
  }
  return { comparedComponentCount: count, maximumAbsoluteDifference, maximumRelativeDifference };
}

function productDofValue(row, component) {
  if (component === 'UX') return Number(row.DX) * 0.001;
  if (component === 'UY') return Number(row.DY) * 0.001;
  if (component === 'UZ') return Number(row.DZ) * 0.001;
  if (component === 'RX') return Number(row.RX) * Math.PI / 180;
  if (component === 'RY') return Number(row.RY) * Math.PI / 180;
  if (component === 'RZ') return Number(row.RZ) * Math.PI / 180;
  throw new Error(`Unsupported product displacement component ${component}.`);
}

function requireRigidYRows(rows, lcaseNum, nodeIds) {
  return nodeIds.map((nodeId) => {
    const matches = rows.filter((row) =>
      Number(row.LCASE_NUM) === lcaseNum
      && String(row.NODE) === nodeId
      && String(row.TYPE) === 'Rigid Y');
    if (matches.length !== 1) throw new Error(`Expected one case ${lcaseNum} Rigid Y row at node ${nodeId}; got ${matches.length}.`);
    return matches[0];
  });
}

function validateCustody({ actual, provenance, bm4nl, contract }) {
  if (contract.schema !== 'm047-bm4l-f28c-authenticated-committed-friction-contract/v1') {
    throw new Error('F2.8c contract v1 required.');
  }
  if (actual.sourceAccdbSha256 !== contract.sources.bm4lAccdbSha256) {
    throw new Error(`BM4_L actual source hash mismatch: ${actual.sourceAccdbSha256}.`);
  }
  if (provenance?.source?.accdb?.sha256 !== contract.sources.bm4lAccdbSha256
    && provenance?.source?.sha256 !== contract.sources.bm4lAccdbSha256) {
    const text = JSON.stringify(provenance?.source ?? {});
    if (!text.includes(contract.sources.bm4lAccdbSha256)) {
      throw new Error('Fresh BM4_L provenance is not bound to the pinned ACCDB SHA-256.');
    }
  }
  if (bm4nl.commonCommit !== contract.sources.bm4NlCommonCommit
    || bm4nl.zipGitBlobSha !== contract.sources.bm4NlZipGitBlob
    || bm4nl.accdbSha256 !== contract.sources.bm4NlAccdbSha256) {
    throw new Error('BM4_NL exact-source custody does not match the F2.8c contract.');
  }
  if (bm4nl.policy?.readOnly !== true || bm4nl.policy?.bm4lReferenceUsedToSelectState !== false) {
    throw new Error('BM4_NL extraction policy must be read-only and independent of BM4_L response selection.');
  }
}

function requireRestraintProjection(provenance) {
  const table = provenance.tables?.find?.((entry) => entry.name === 'INPUT_RESTRAINTS');
  const projection = table?.retainedRowProjection;
  if (!projection || projection.rowCount !== 46 || projection.rows?.length !== 46) {
    throw new Error('Fresh BM4_L provenance lacks the exact 46-row INPUT_RESTRAINTS projection.');
  }
  if (projection.rowsSha256 !== EXPECTED_RESTRAINT_ROW_PROJECTION_SHA256) {
    throw new Error(`INPUT_RESTRAINTS projection SHA-256 drifted: ${projection.rowsSha256}.`);
  }
  return projection;
}

function validateWithdrawnCandidate(case17Rows, withdrawn) {
  if (withdrawn.status !== 'WITHDRAWN_CUSTODY_MISMATCH') throw new Error('PR #1078 must remain explicitly withdrawn.');
  const witness = case17Rows.find((row) => String(row.NODE) === String(withdrawn.witnessNode));
  if (!witness) throw new Error('Authenticated withdrawal witness node is absent.');
  const authenticated = [Number(witness.FX), Number(witness.FY), Number(witness.FZ)];
  const expected = withdrawn.authenticatedCase17RigidY.map(Number);
  if (maximumAbsolute(vectorSubtract(authenticated, expected)) > 1e-9) {
    throw new Error(`Authenticated case-17 withdrawal witness drifted: ${JSON.stringify(authenticated)}.`);
  }
  if (maximumAbsolute(vectorSubtract(authenticated, withdrawn.withdrawnFixture.map(Number))) < 100) {
    throw new Error('Withdrawn PR #1078 fixture unexpectedly matches authenticated product evidence.');
  }
}

function requireReportCase(report, caseId) {
  const row = report.cases?.find?.((entry) => entry.caseId === caseId);
  if (!row) throw new Error(`Fresh BM4_L report lacks case ${caseId}.`);
  return row;
}

function dominantTranslationDof(row) {
  const values = [Number(row.XCOSINE), Number(row.YCOSINE), Number(row.ZCOSINE)].map(Math.abs);
  const maximum = Math.max(...values);
  if (!(maximum > 0)) throw new Error(`Restraint at node ${row.NODE_NUM} has no direction cosine.`);
  return values.indexOf(maximum);
}

function addLower(rows, row, column, value) {
  if (value === 0) return;
  rows[row].set(column, (rows[row].get(column) ?? 0) + Number(value));
}

function symmetricMatVec(matrix, vector) {
  const result = new Array(matrix.size).fill(0);
  for (let row = 0; row < matrix.size; row += 1) {
    for (const [column, value] of matrix.rows[row]) {
      result[row] += value * vector[column];
      if (column !== row) result[column] += value * vector[row];
    }
  }
  return result;
}

function matrixVector12(flatMatrix, vector) {
  const result = new Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) {
    let sum = 0;
    for (let column = 0; column < 12; column += 1) sum += Number(flatMatrix[row * 12 + column]) * vector[column];
    result[row] = sum;
  }
  return result;
}

function rowKey(entityKind, entityId, quantity, component) {
  return `${entityKind}|${String(entityId)}|${quantity}|${component}`;
}
function vectorSubtract(left, right) { return left.map((value, index) => Number(value) - Number(right[index])); }
function maximumAbsolute(values) { return values.length === 0 ? 0 : Math.max(...values.map((value) => Math.abs(Number(value)))); }
function clean(value) { return Object.is(value, -0) || Math.abs(value) < 1e-12 ? 0 : value; }
function compareText(left, right) { return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0; }
function sha256Json(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function readJson(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
