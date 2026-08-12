#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CASE_IDS = Object.freeze(['L3', 'L14']);
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);
const BEND_ID_PATTERN = /^ACCDB-BEND-(\d+)\.E(\d+)$/u;
const SOURCE_ENTITY_PATTERN = /^INPUT_ELEMENT:(\d+)\|([^|]+)->([^|]+)\|$/u;

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const actual = args.get('--actual');
  const report = args.get('--report');
  const out = args.get('--out');
  if (!actual || !report || !out) {
    throw new TypeError('Usage: --actual <bm4l-actual.json> --report <bm4l-report.json> --out <bend-effective-stiffness.json>.');
  }
  const unknown = [...args.keys()].filter((key) => !['--actual', '--report', '--out'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return Object.freeze({ actualPath: resolve(actual), reportPath: resolve(report), outPath: resolve(out) });
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return Object.is(number, -0) ? 0 : number;
}
function vector(value, length, field) {
  if (!Array.isArray(value) || value.length !== length) throw new TypeError(`${field} must have ${length} entries.`);
  return value.map((entry, index) => finite(entry, `${field}[${index}]`));
}
function matrixFlat(value, size, field) {
  const flat = vector(value, size * size, field);
  return Array.from({ length: size }, (_, row) => flat.slice(row * size, (row + 1) * size));
}
function flatten(matrix) { return matrix.flat().map(clean); }
function clean(value) { return Math.abs(value) < 1e-14 ? 0 : Number(value); }
function compareText(left, right) { return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0; }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function norm(value) { return Math.hypot(...value); }
function scale(value, factor) { return value.map((entry) => entry * factor); }
function subtract(left, right) { return left.map((entry, index) => entry - right[index]); }
function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}
function unit(value, field) {
  const length = norm(value);
  if (!(length > 1e-12)) throw new TypeError(`${field} is degenerate.`);
  return scale(value, 1 / length);
}
function angleRadians(left, right) {
  const cosine = Math.max(-1, Math.min(1, dot(unit(left, 'left vector'), unit(right, 'right vector'))));
  return Math.acos(cosine);
}
function degrees(radians) { return radians * 180 / Math.PI; }

function zeros(rows, columns = rows) { return Array.from({ length: rows }, () => new Array(columns).fill(0)); }
function transpose(A) { return A[0].map((_, column) => A.map((row) => row[column])); }
function multiply(A, B) {
  const result = zeros(A.length, B[0].length);
  for (let row = 0; row < A.length; row += 1) {
    for (let inner = 0; inner < B.length; inner += 1) {
      const a = A[row][inner];
      if (a === 0) continue;
      for (let column = 0; column < B[0].length; column += 1) result[row][column] += a * B[inner][column];
    }
  }
  return result;
}
function submatrix(A, rows, columns) { return rows.map((row) => columns.map((column) => A[row][column])); }
function subtractMatrix(A, B) { return A.map((row, i) => row.map((value, j) => value - B[i][j])); }
function maxSymmetryResidual(A) {
  let maximum = 0;
  for (let row = 0; row < A.length; row += 1) {
    for (let column = row + 1; column < A.length; column += 1) {
      maximum = Math.max(maximum, Math.abs(A[row][column] - A[column][row]));
    }
  }
  return maximum;
}
function solveMany(A, B, field) {
  const n = A.length;
  if (n === 0) return [];
  const rhsColumns = B[0].length;
  const augmented = A.map((row, i) => [...row, ...B[i]]);
  let matrixScale = 0;
  for (const row of A) for (const value of row) matrixScale = Math.max(matrixScale, Math.abs(value));
  const pivotFloor = Math.max(1e-18, matrixScale * 1e-14);
  for (let pivot = 0; pivot < n; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row;
    }
    if (!(Math.abs(augmented[best][pivot]) > pivotFloor)) {
      throw new Error(`${field} is singular near pivot ${pivot}; |pivot|=${Math.abs(augmented[best][pivot])}, floor=${pivotFloor}.`);
    }
    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    for (let column = pivot; column < n + rhsColumns; column += 1) augmented[pivot][column] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      if (factor === 0) continue;
      for (let column = pivot; column < n + rhsColumns; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }
  return augmented.map((row) => row.slice(n));
}
function inverse(A, field) {
  const identity = zeros(A.length);
  for (let index = 0; index < A.length; index += 1) identity[index][index] = 1;
  return solveMany(A, identity, field);
}

function addElementMatrix(global, local, nodeI, nodeJ) {
  const map = [
    ...Array.from({ length: 6 }, (_, index) => nodeI * 6 + index),
    ...Array.from({ length: 6 }, (_, index) => nodeJ * 6 + index),
  ];
  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 12; column += 1) global[map[row]][map[column]] += local[row][column];
  }
}

function chainBendElements(entries, bendId) {
  const byNodeI = new Map(entries.map((entry) => [String(entry.nodeI), entry]));
  const nodeJSet = new Set(entries.map((entry) => String(entry.nodeJ)));
  const starts = entries.filter((entry) => !nodeJSet.has(String(entry.nodeI)));
  if (starts.length !== 1) throw new Error(`${bendId} has ${starts.length} chain starts.`);
  const ordered = [];
  const seen = new Set();
  let current = starts[0];
  while (current) {
    if (seen.has(current.elementId)) throw new Error(`${bendId} contains a chain cycle.`);
    seen.add(current.elementId);
    ordered.push(current);
    current = byNodeI.get(String(current.nodeJ)) ?? null;
  }
  if (ordered.length !== entries.length) throw new Error(`${bendId} chain covers ${ordered.length}/${entries.length} elements.`);
  return ordered;
}

function condenseBend(entries, bendId) {
  const ordered = chainBendElements(entries, bendId);
  const nodes = [String(ordered[0].nodeI), ...ordered.map((entry) => String(entry.nodeJ))];
  const nodeIndex = new Map(nodes.map((nodeId, index) => [nodeId, index]));
  const K = zeros(nodes.length * 6);
  for (const entry of ordered) {
    addElementMatrix(
      K,
      matrixFlat(entry.globalStiffness, 12, `${bendId}:${entry.elementId}.globalStiffness`),
      nodeIndex.get(String(entry.nodeI)),
      nodeIndex.get(String(entry.nodeJ)),
    );
  }
  const boundary = [...Array.from({ length: 6 }, (_, index) => index), ...Array.from({ length: 6 }, (_, index) => (nodes.length - 1) * 6 + index)];
  const boundarySet = new Set(boundary);
  const internal = Array.from({ length: K.length }, (_, index) => index).filter((index) => !boundarySet.has(index));
  const Kbb = submatrix(K, boundary, boundary);
  let condensed = Kbb;
  if (internal.length > 0) {
    const Kbi = submatrix(K, boundary, internal);
    const Kib = submatrix(K, internal, boundary);
    const Kii = submatrix(K, internal, internal);
    const X = solveMany(Kii, Kib, `${bendId}.Kii`);
    condensed = subtractMatrix(Kbb, multiply(Kbi, X));
  }
  return Object.freeze({ ordered, nodes, condensed });
}

function bendCanonicalFrame(ordered, bendId) {
  const nearX = unit(vector(ordered[0].localAxes?.x, 3, `${bendId}.nearX`), `${bendId}.nearX`);
  const farX = unit(vector(ordered.at(-1).localAxes?.x, 3, `${bendId}.farX`), `${bendId}.farX`);
  let planeNormal = unit(cross(nearX, farX), `${bendId}.planeNormal`);
  const existingNearZ = ordered[0].localAxes?.z ? unit(vector(ordered[0].localAxes.z, 3, `${bendId}.nearZ`), `${bendId}.nearZ`) : null;
  if (existingNearZ && dot(planeNormal, existingNearZ) < 0) planeNormal = scale(planeNormal, -1);
  const nearY = unit(cross(planeNormal, nearX), `${bendId}.nearY`);
  const farY = unit(cross(planeNormal, farX), `${bendId}.farY`);
  const nearR = [nearX, nearY, planeNormal];
  const farR = [farX, farY, planeNormal];
  const segmentTurnAngles = [];
  for (let index = 1; index < ordered.length; index += 1) {
    segmentTurnAngles.push(angleRadians(ordered[index - 1].localAxes.x, ordered[index].localAxes.x));
  }
  const medianTurn = [...segmentTurnAngles].sort((a, b) => a - b)[Math.floor(segmentTurnAngles.length / 2)] ?? 0;
  const centralAngleRadians = angleRadians(nearX, farX) + medianTurn;
  return Object.freeze({
    nearR,
    farR,
    nearTangent: nearX,
    farTangent: farX,
    planeNormal,
    centralAngleDegrees: degrees(centralAngleRadians),
    medianChordTurnDegrees: degrees(medianTurn),
  });
}

function endpointTransform(frame) {
  const T = zeros(12);
  for (let block = 0; block < 2; block += 1) {
    const R = block === 0 ? frame.nearR : frame.farR;
    for (let subblock = 0; subblock < 2; subblock += 1) {
      const offset = block * 6 + subblock * 3;
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) T[offset + row][offset + column] = R[row][column];
      }
    }
  }
  return T;
}

function transformCondensedToEndpointLocal(Kglobal, frame) {
  const T = endpointTransform(frame);
  return multiply(multiply(T, Kglobal), transpose(T));
}

function complianceSummary(Klocal, bendId) {
  const far = Array.from({ length: 6 }, (_, index) => 6 + index);
  const Kfar = submatrix(Klocal, far, far);
  const Cfar = inverse(Kfar, `${bendId}.fixedNearFarEndStiffness`);
  const diagonal = Object.fromEntries(DOFS.map((dof, index) => [dof, clean(Cfar[index][index])]));
  const coupling = [];
  for (let row = 0; row < 6; row += 1) {
    for (let column = row + 1; column < 6; column += 1) {
      const denominator = Math.sqrt(Math.abs(Cfar[row][row] * Cfar[column][column]));
      coupling.push(Object.freeze({
        a: DOFS[row],
        b: DOFS[column],
        value: clean(Cfar[row][column]),
        normalizedMagnitude: denominator > 0 ? Math.abs(Cfar[row][column]) / denominator : null,
      }));
    }
  }
  coupling.sort((left, right) => (right.normalizedMagnitude ?? -1) - (left.normalizedMagnitude ?? -1));
  const probes = DOFS.map((dof, dofIndex) => Object.freeze({
    prescribedFarDof: dof,
    prescribedValue: 1,
    endpointLocalAction: Object.freeze(Klocal.map((row) => clean(row[6 + dofIndex]))),
  }));
  return Object.freeze({
    fixedNearFarEndStiffness: Object.freeze(flatten(Kfar)),
    fixedNearFarEndCompliance: Object.freeze(flatten(Cfar)),
    diagonalCompliance: Object.freeze(diagonal),
    namedCompliance: Object.freeze({
      axialTranslation: clean(Cfar[0][0]),
      inPlaneTranslation: clean(Cfar[1][1]),
      outOfPlaneTranslation: clean(Cfar[2][2]),
      torsionalRotation: clean(Cfar[3][3]),
      outOfPlaneBendingRotationAboutInPlaneAxis: clean(Cfar[4][4]),
      inPlaneBendingRotationAboutPlaneNormal: clean(Cfar[5][5]),
    }),
    strongestCouplings: Object.freeze(coupling.slice(0, 8)),
    unitFarEndDofProbes: Object.freeze(probes),
  });
}

function qualificationCase(report, caseId) {
  const found = report.qualification?.cases?.find((entry) => entry.caseId === caseId);
  if (!found) throw new Error(`Qualification report lacks ${caseId}.`);
  return found;
}

function uniqueSourceEntity(rows, sourceElementId) {
  const matches = [...new Set(rows
    .filter((row) => row.entityKind === 'ELEMENT' && String(row.entityId).startsWith(`INPUT_ELEMENT:${sourceElementId}|`))
    .map((row) => String(row.entityId)))];
  if (matches.length !== 1) throw new Error(`Source element ${sourceElementId} resolves ${matches.length} source entities.`);
  const parsed = SOURCE_ENTITY_PATTERN.exec(matches[0]);
  if (!parsed) throw new Error(`Source entity ${matches[0]} does not match the canonical input-element form.`);
  return Object.freeze({ entityId: matches[0], fromNode: parsed[2], toNode: parsed[3] });
}

function rowIndex(rows) {
  return new Map(rows.map((row) => [[row.entityKind, row.entityId, row.quantity, row.component].join('|'), row]));
}
function requiredRow(index, entityKind, entityId, quantity, component) {
  const key = [entityKind, entityId, quantity, component].join('|');
  const row = index.get(key);
  if (!row) throw new Error(`Missing qualification row ${key}.`);
  if (row.referenceValue === null || row.referenceValue === undefined) throw new Error(`Qualification row ${key} has no reference value.`);
  return row;
}
function rotate3(R, value) { return R.map((row) => dot(row, value)); }
function localSix(R, value) { return [...rotate3(R, value.slice(0, 3)), ...rotate3(R, value.slice(3, 6))].map(clean); }
function sourceEndActionResidual(index, source, end, R) {
  const forceQuantity = `GLOBAL_END_FORCE_${end}`;
  const momentQuantity = `GLOBAL_END_MOMENT_${end}`;
  const forceRows = FORCE_COMPONENTS.map((component) => requiredRow(index, 'ELEMENT', source.entityId, forceQuantity, component));
  const momentRows = MOMENT_COMPONENTS.map((component) => requiredRow(index, 'ELEMENT', source.entityId, momentQuantity, component));
  const referenceGlobal = [...forceRows.map((row) => finite(row.referenceValue, row.identity)), ...momentRows.map((row) => finite(row.referenceValue, row.identity))];
  const actualGlobal = [...forceRows.map((row) => finite(row.actualValue, row.identity)), ...momentRows.map((row) => finite(row.actualValue, row.identity))];
  const correctionGlobal = subtract(referenceGlobal, actualGlobal);
  const correctionLocal = localSix(R, correctionGlobal);
  const failCount = [...forceRows, ...momentRows].filter((row) => row.status === 'FAIL').length;
  const finiteRelative = [...forceRows, ...momentRows].map((row) => Number(row.relativeError)).filter(Number.isFinite);
  return Object.freeze({
    referenceGlobal: Object.freeze(referenceGlobal.map(clean)),
    actualGlobal: Object.freeze(actualGlobal.map(clean)),
    requiredCorrectionGlobal: Object.freeze(correctionGlobal.map(clean)),
    requiredCorrectionLocal: Object.freeze(correctionLocal),
    localComponentLabels: Object.freeze(['AXIAL_FORCE', 'IN_PLANE_SHEAR', 'OUT_OF_PLANE_SHEAR', 'TORSION', 'OUT_OF_PLANE_BENDING_MOMENT', 'IN_PLANE_BENDING_MOMENT']),
    forceCorrectionNormN: norm(correctionLocal.slice(0, 3)),
    momentCorrectionNormNm: norm(correctionLocal.slice(3, 6)),
    failCount,
    maximumReportedRelativeError: finiteRelative.length > 0 ? Math.max(...finiteRelative) : null,
  });
}
function nodeKinematicResidual(index, nodeId, R) {
  const displacementRows = ['UX', 'UY', 'UZ'].map((component) => requiredRow(index, 'NODE', nodeId, 'DISPLACEMENT', component));
  const rotationRows = ['RX', 'RY', 'RZ'].map((component) => requiredRow(index, 'NODE', nodeId, 'ROTATION', component));
  const referenceGlobal = [...displacementRows.map((row) => finite(row.referenceValue, row.identity)), ...rotationRows.map((row) => finite(row.referenceValue, row.identity))];
  const actualGlobal = [...displacementRows.map((row) => finite(row.actualValue, row.identity)), ...rotationRows.map((row) => finite(row.actualValue, row.identity))];
  const correctionGlobal = subtract(referenceGlobal, actualGlobal);
  const correctionLocal = localSix(R, correctionGlobal);
  return Object.freeze({
    requiredCorrectionGlobal: Object.freeze(correctionGlobal.map(clean)),
    requiredCorrectionLocal: Object.freeze(correctionLocal),
    localComponentLabels: Object.freeze(['AXIAL_TRANSLATION', 'IN_PLANE_TRANSLATION', 'OUT_OF_PLANE_TRANSLATION', 'TORSIONAL_ROTATION', 'OUT_OF_PLANE_BENDING_ROTATION', 'IN_PLANE_BENDING_ROTATION']),
    translationCorrectionNormM: norm(correctionLocal.slice(0, 3)),
    rotationCorrectionNormRad: norm(correctionLocal.slice(3, 6)),
    failCount: [...displacementRows, ...rotationRows].filter((row) => row.status === 'FAIL').length,
  });
}
function residualForCase(report, caseId, sourceElementId, frame) {
  const comparisonRows = qualificationCase(report, caseId).comparison.rows;
  const index = rowIndex(comparisonRows);
  const source = uniqueSourceEntity(comparisonRows, sourceElementId);
  return Object.freeze({
    caseId,
    source,
    from: sourceEndActionResidual(index, source, 'FROM', frame.nearR),
    to: sourceEndActionResidual(index, source, 'TO', frame.farR),
    sourceNodeKinematics: Object.freeze({
      from: nodeKinematicResidual(index, source.fromNode, frame.nearR),
      to: nodeKinematicResidual(index, source.toNode, frame.farR),
    }),
    scopeNote: 'SOURCE_ELEMENT_FROM_END_MAY_INCLUDE_INCOMING_STRAIGHT; TO END COINCIDES WITH BEND FAR POINT FOR BM4_L BENDS.',
  });
}
function maxVectorDifference(left, right) {
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}
function l3L14Identity(l3, l14) {
  return Object.freeze({
    sourceFromActionLocalMaxDifference: maxVectorDifference(l3.from.requiredCorrectionLocal, l14.from.requiredCorrectionLocal),
    sourceToActionLocalMaxDifference: maxVectorDifference(l3.to.requiredCorrectionLocal, l14.to.requiredCorrectionLocal),
    sourceFromKinematicLocalMaxDifference: maxVectorDifference(l3.sourceNodeKinematics.from.requiredCorrectionLocal, l14.sourceNodeKinematics.from.requiredCorrectionLocal),
    sourceToKinematicLocalMaxDifference: maxVectorDifference(l3.sourceNodeKinematics.to.requiredCorrectionLocal, l14.sourceNodeKinematics.to.requiredCorrectionLocal),
  });
}

function hashNumbers(values) {
  const hash = createHash('sha256');
  for (const value of values) hash.update(`${Number(value).toPrecision(17)}\n`, 'utf8');
  return hash.digest('hex');
}

function build(actual, report) {
  if (actual?.schema !== 'lfea-accdb-benchmark-actual/v1') throw new TypeError(`Unexpected actual schema ${String(actual?.schema)}.`);
  if (report?.schema !== 'lfea-caesar-accdb-benchmark-report/v1') throw new TypeError(`Unexpected report schema ${String(report?.schema)}.`);
  const l3Ledger = actual.mechanics?.cases?.L3?.recoveryLedger;
  if (!Array.isArray(l3Ledger)) throw new TypeError('Actual mechanics L3 recoveryLedger is required.');
  const groups = new Map();
  for (const entry of l3Ledger) {
    const match = BEND_ID_PATTERN.exec(String(entry.elementId));
    if (!match) continue;
    const bendId = `ACCDB-BEND-${Number(match[1])}`;
    if (!groups.has(bendId)) groups.set(bendId, []);
    groups.get(bendId).push(entry);
  }
  if (groups.size === 0) throw new Error('No bend arc analysis elements were found in L3 recovery evidence.');
  const bends = [...groups.entries()].map(([bendId, entries]) => {
    const { ordered, nodes, condensed } = condenseBend(entries, bendId);
    const sourceIds = [...new Set(ordered.map((entry) => String(entry.sourceElementId)))];
    if (sourceIds.length !== 1) throw new Error(`${bendId} resolves ${sourceIds.length} source element IDs.`);
    const frame = bendCanonicalFrame(ordered, bendId);
    const local = transformCondensedToEndpointLocal(condensed, frame);
    const residuals = Object.fromEntries(CASE_IDS.map((caseId) => [caseId, residualForCase(report, caseId, sourceIds[0], frame)]));
    const compliance = complianceSummary(local, bendId);
    return Object.freeze({
      bendId,
      bendPointer: Number(BEND_ID_PATTERN.exec(String(ordered[0].elementId))[1]),
      sourceElementId: sourceIds[0],
      segmentCount: ordered.length,
      analysisElementIds: Object.freeze(ordered.map((entry) => String(entry.elementId))),
      arcNearNodeId: nodes[0],
      arcFarNodeId: nodes.at(-1),
      frame: Object.freeze({
        nearTangentGlobal: Object.freeze(frame.nearTangent.map(clean)),
        farTangentGlobal: Object.freeze(frame.farTangent.map(clean)),
        planeNormalGlobal: Object.freeze(frame.planeNormal.map(clean)),
        centralAngleDegrees: frame.centralAngleDegrees,
        medianChordTurnDegrees: frame.medianChordTurnDegrees,
        basisRule: 'X_TANGENT__Z_BEND_PLANE_NORMAL__Y_Z_CROSS_X_V1',
      }),
      operator: Object.freeze({
        globalCondensedStiffness12x12: Object.freeze(flatten(condensed)),
        endpointLocalCondensedStiffness12x12: Object.freeze(flatten(local)),
        endpointLocalStiffnessSha256: hashNumbers(flatten(local)),
        maximumGlobalSymmetryResidual: maxSymmetryResidual(condensed),
        maximumEndpointLocalSymmetryResidual: maxSymmetryResidual(local),
        ...compliance,
      }),
      residuals: Object.freeze(residuals),
      l3L14Identity: l3L14Identity(residuals.L3, residuals.L14),
    });
  }).sort((left, right) => left.bendPointer - right.bendPointer);

  const ranking = [...bends].sort((left, right) => right.residuals.L3.to.momentCorrectionNormNm - left.residuals.L3.to.momentCorrectionNormNm)
    .map((bend) => Object.freeze({
      bendId: bend.bendId,
      sourceElementId: bend.sourceElementId,
      l3FarEndForceCorrectionNormN: bend.residuals.L3.to.forceCorrectionNormN,
      l3FarEndMomentCorrectionNormNm: bend.residuals.L3.to.momentCorrectionNormNm,
      l3FarEndActionFailCount: bend.residuals.L3.to.failCount,
      l3FarNodeTranslationCorrectionNormM: bend.residuals.L3.sourceNodeKinematics.to.translationCorrectionNormM,
      l3FarNodeRotationCorrectionNormRad: bend.residuals.L3.sourceNodeKinematics.to.rotationCorrectionNormRad,
    }));
  const maxIdentity = Math.max(...bends.flatMap((bend) => Object.values(bend.l3L14Identity)));
  return Object.freeze({
    schema: 'lfea-m047-bm4l-bend-effective-stiffness/v1',
    sourceAccdbSha256: actual.sourceAccdbSha256,
    scope: Object.freeze({
      operatorCase: 'L3',
      residualCases: CASE_IDS,
      bendCount: bends.length,
      productionMechanicsChanged: false,
      purpose: 'CONDENSE_EXISTING_BEND_ARC_OPERATOR_AND_DECOMPOSE_CAESAR_RESIDUALS_BY_LOCAL_PHYSICAL_MODE',
    }),
    conventions: Object.freeze({
      correctionSign: 'REFERENCE_MINUS_ACTUAL',
      localForceMomentOrder: ['AXIAL_FORCE', 'IN_PLANE_SHEAR', 'OUT_OF_PLANE_SHEAR', 'TORSION', 'OUT_OF_PLANE_BENDING_MOMENT', 'IN_PLANE_BENDING_MOMENT'],
      localKinematicOrder: ['AXIAL_TRANSLATION', 'IN_PLANE_TRANSLATION', 'OUT_OF_PLANE_TRANSLATION', 'TORSIONAL_ROTATION', 'OUT_OF_PLANE_BENDING_ROTATION', 'IN_PLANE_BENDING_ROTATION'],
      fixedNearComplianceMeaning: 'NEAR_ENDPOINT_FIXED; INVERSE_OF_FAR_ENDPOINT_6X6_STIFFNESS_BLOCK',
    }),
    bends: Object.freeze(bends),
    l3RankingByFarEndMomentCorrection: Object.freeze(ranking),
    integrity: Object.freeze({
      l3L14MaximumResidualDecompositionDifference: maxIdentity,
      status: maxIdentity <= 1e-8 ? 'PASS' : 'FAIL',
    }),
    status: maxIdentity <= 1e-8 ? 'PASS' : 'FAIL',
  });
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const result = build(readJson(args.actualPath), readJson(args.reportPath));
  mkdirSync(dirname(args.outPath), { recursive: true });
  writeFileSync(args.outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(JSON.stringify({
    schema: result.schema,
    status: result.status,
    bendCount: result.bends.length,
    topL3Bends: result.l3RankingByFarEndMomentCorrection.slice(0, 5),
    out: args.outPath,
  }, null, 2));
  process.stdout.write('\n');
  if (result.status !== 'PASS') process.exitCode = 1;
}

main();
