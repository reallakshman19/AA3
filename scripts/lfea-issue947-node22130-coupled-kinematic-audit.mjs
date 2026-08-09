#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const MM_TO_M = 1e-3;
const KPA_TO_PA = 1e3;
const RIGID_WALL_MULTIPLIER = 10;
const KAPPA = 0.5;
const DOFS = Object.freeze(['UX','UY','UZ','RX','RY','RZ']);
const ACTION_FLOORS = Object.freeze([50,50,50,5,5,5,50,50,50,5,5,5]);
const CHANNELS = Object.freeze({
  axial: Object.freeze({ dofs: ['UX'], actions: [0,6] }),
  torsion: Object.freeze({ dofs: ['RX'], actions: [3,9] }),
  inPlaneY_RZ: Object.freeze({ dofs: ['UY','RZ'], actions: [1,5,7,11] }),
  outOfPlaneZ_RY: Object.freeze({ dofs: ['UZ','RY'], actions: [2,4,8,10] }),
});

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.reconstruction) {
  throw new TypeError('Usage: node scripts/lfea-issue947-node22130-coupled-kinematic-audit.mjs --package <canonical-package.json> --reconstruction <two-sided-rz.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
const reconstruction = JSON.parse(readFileSync(args.reconstruction, 'utf8'));
requirePinnedInputs(pkg, reconstruction);

const sourceRows = new Map(pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
  .map((row) => [String(row.ELEMENTID), row]));
const e79 = requireSourceRow(sourceRows, '79');
const e80 = requireSourceRow(sourceRows, '80');
assert.equal(String(e79.FROM_NODE), '22125');
assert.equal(String(e79.TO_NODE), '22130');
assert.ok(Number(e79.RIGID_PTR) > 0, 'E79 must remain the adjacent rigid element.');
assert.equal(String(e80.FROM_NODE), '22130');
assert.equal(String(e80.TO_NODE), '22140');
assert.equal(Number(e80.RIGID_PTR), 0, 'E80 must remain ordinary pipe.');

const coordinates = sourceCoordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const exportedShared = sharedNodeDofs(pkg.references.L19.rows, '22130');
const records = {
  E79: elementRecord({
    label: 'E79', row: e79, rigid: true, sharedEnd: 'J',
    reconstruction: reconstruction.inference.E79,
  }),
  E80: elementRecord({
    label: 'E80', row: e80, rigid: false, sharedEnd: 'I',
    reconstruction: reconstruction.inference.E80,
  }),
};

const maxSensitivityRelativeError = Math.max(
  records.E79.rzSensitivityParity.maxRelativeError,
  records.E80.rzSensitivityParity.maxRelativeError,
);
const sensitivityParityPass = maxSensitivityRelativeError <= 1e-10;
assert.ok(sensitivityParityPass,
  `Source-derived stiffness sensitivity no longer matches production-faithful RZ evidence: ${maxSensitivityRelativeError}`);

const originalRz = {
  E79: Number(reconstruction.inference.E79.inferredDof),
  E80: Number(reconstruction.inference.E80.inferredDof),
};
const originalAgreement = agreement(originalRz.E79, originalRz.E80);
const originalGatePass = originalAgreement.relativeDifference <= 0.01;
assert.equal(originalGatePass, false,
  'This audit is only admissible while reproducing the unresolved single-RZ gate; investigate evidence drift instead of silently changing the baseline.');

const coupledRz = {
  E79: records.E79.channels.inPlaneY_RZ.inferred.RZ,
  E80: records.E80.channels.inPlaneY_RZ.inferred.RZ,
};
const coupledRzAgreement = agreement(coupledRz.E79, coupledRz.E80);
const coupledRzGatePass = coupledRzAgreement.relativeDifference <= 0.01;

const commonInPlane = commonFit([
  { record: records.E79, channelName: 'inPlaneY_RZ' },
  { record: records.E80, channelName: 'inPlaneY_RZ' },
], exportedShared);
const commonInPlanePass = commonInPlane.maxCorrectedNormalizedAbs <= 0.1;
const e79OutOfPlanePass = records.E79.channels.outOfPlaneZ_RY.correctedNormalizedMaxAbs <= 0.1;

const output = {
  schema: 'lfea-issue947-node22130-coupled-kinematic-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  purpose: 'DIAGNOSTIC_ONLY_SOURCE_DERIVED_COUPLED_DOF_RECONSTRUCTION_NO_PRODUCTION_OR_REFERENCE_MUTATION',
  governingMechanics: {
    relation: 'r_e(delta)=r_e(0)+S_e*delta; delta*=-(S^T W S)^-1 S^T W r',
    beamChannels: {
      axial: 'UX <-> FX',
      torsion: 'RX <-> MX',
      inPlaneY_RZ: '[UY,RZ] <-> [FY,MZ]',
      outOfPlaneZ_RY: '[UZ,RY] <-> [FZ,MY]',
    },
    interpretation: 'For a straight circular 3D frame the translation and rotation in each bending plane are coupled constitutively. A one-DOF RZ inverse solve is biased whenever the companion UY output carries any residual error.',
    weighting: 'Existing benchmark action scales only: max(|CAESAR action|, 50 N force floor or 5 N*m moment floor). No tolerance or acceptance limit is changed.',
  },
  sourceDerivedStiffness: {
    E79: records.E79.stiffnessEvidence,
    E80: records.E80.stiffnessEvidence,
    rzSensitivityParity: {
      E79: records.E79.rzSensitivityParity,
      E80: records.E80.rzSensitivityParity,
      maxRelativeError: maxSensitivityRelativeError,
    },
  },
  originalSingleRzGate: {
    E79: originalRz.E79,
    E80: originalRz.E80,
    ...originalAgreement,
    fixedRelativeLimit: 0.01,
    status: originalGatePass ? 'PASS' : 'FAIL',
    disposition: 'RETAINED_AS_FALSIFICATION_OF_THE_ONE_DOF_INVERSE_ASSUMPTION; THE LIMIT IS NOT RELAXED.',
  },
  coupledChannelFits: {
    E79: records.E79.channels,
    E80: records.E80.channels,
  },
  coupledInPlaneRzAgreement: {
    E79: coupledRz.E79,
    E80: coupledRz.E80,
    ...coupledRzAgreement,
    fixedRelativeLimit: 0.01,
    status: coupledRzGatePass ? 'PASS' : 'FAIL',
  },
  commonSharedInPlanePair: commonInPlane,
  gates: {
    sourceDerivedSensitivityMatchesProductionFaithfulEvidence: sensitivityParityPass ? 'PASS' : 'FAIL',
    originalSingleRzAgreementRemainsFailClosed: !originalGatePass ? 'PASS' : 'FAIL',
    independentCoupledRzAgreementWithinUnchangedOnePercent: coupledRzGatePass ? 'PASS' : 'FAIL',
    oneCommonUyRzPairClosesBothElementsWithinExistingTenPercentActionGate: commonInPlanePass ? 'PASS' : 'FAIL',
    e79RzInsensitiveFzMyResidualClosesUnderCoupledUzRy: e79OutOfPlanePass ? 'PASS' : 'FAIL',
  },
  classification: sensitivityParityPass && !originalGatePass && coupledRzGatePass
    && commonInPlanePass && e79OutOfPlanePass
    ? 'NODE22130_SINGLE_RZ_MISS_EXPLAINED_BY_COUPLED_BENDING_KINEMATICS'
    : 'NODE22130_KINEMATIC_CUSTODY_REMAINS_UNRESOLVED',
  falsificationResult: originalGatePass
    ? 'NOT_APPLICABLE_BASELINE_DRIFT'
    : 'The hypothesis that RZ can be inferred with UY frozen is falsified: solving the governing [UY,RZ] bending pair changes the two-sided RZ disagreement from the retained 1.0196556% failure to the coupled value reported above without changing the 1.0% limit.',
  falsificationRule: 'Do not close the node-22130 gate if source-derived RZ sensitivity fails production-faithful parity, if the coupled E79/E80 RZ values still differ by more than 1%, if a single common [UY,RZ] pair leaves either element above the existing 10% action gate, or if E79 FZ/MY cannot be explained by the independent [UZ,RY] channel.',
  limitations: [
    'This is an inverse kinematic custody diagnostic, not a production solver change.',
    'It does not declare the CAESAR UY, UZ, RY or RZ rows universally inaccurate; it only demonstrates that the one-DOF RZ reconstruction is not mechanically separable from UY for this pinned witness.',
    'Torsional RX is a decoupled channel and is reported but is not used to qualify the RZ bending-plane conclusion.',
    'The current production rigid Timoshenko stiffness is held fixed; the separate all-rigid EB-vs-Timoshenko audit remains the authority for that architecture question.',
  ],
  nextGate: 'UPDATE_QUALIFICATION_STATUS_THEN_CONTINUE_E36_PRODUCTION_DESCENDANT_CONDENSATION_AND_NODE20390_UZ_WITH_NODE22130_RZ_NO_LONGER_USED_AS_A_ONE_DOF_TUNING_TARGET',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 node 22130 coupled kinematic audit: ${output.classification}`);

function elementRecord({ label, row, rigid, sharedEnd, reconstruction: evidence }) {
  if (!evidence || !Array.isArray(evidence.exportedResidual) || !Array.isArray(evidence.referenceAction)) {
    throw new TypeError(`${label} reconstruction evidence is incomplete.`);
  }
  const parity = reconstruction.productionParity?.[label];
  assert.ok(parity && Number(parity.maxAbsResidual) <= 1e-3,
    `${label} production-parity prerequisite is not satisfied.`);
  const pointI = requireCoordinate(coordinates, row.FROM_NODE);
  const pointJ = requireCoordinate(coordinates, row.TO_NODE);
  const stiffness = sourceDerivedGlobalStiffness(row, pointI, pointJ, rigid);
  const start = sharedEnd === 'I' ? 0 : 6;
  const rzColumn = stiffness.matrix.map((line) => line[start + DOFS.indexOf('RZ')]);
  const productionRzColumn = evidence.sensitivityPerRadian.map(Number);
  const parityResidual = rzColumn.map((value, index) => value - productionRzColumn[index]);
  const parityRelative = parityResidual.map((value, index) =>
    Math.abs(value) / Math.max(Math.abs(productionRzColumn[index]), 1));
  const channels = {};
  for (const [name, definition] of Object.entries(CHANNELS)) {
    channels[name] = fitChannel({
      label,
      stiffness: stiffness.matrix,
      sharedStart: start,
      dofNames: definition.dofs,
      actionIndices: definition.actions,
      exportedResidual: evidence.exportedResidual.map(Number),
      referenceAction: evidence.referenceAction.map(Number),
      exportedShared,
    });
  }
  return {
    label,
    sharedEnd,
    stiffnessEvidence: {
      lengthM: stiffness.length,
      rigid,
      outerDiameterM: stiffness.outerDiameter,
      innerDiameterM: stiffness.innerDiameter,
      wallThicknessM: stiffness.wallThickness,
      phiXY: stiffness.phiXY,
      phiXZ: stiffness.phiXZ,
      shearDeformation: true,
      shearCorrectionFactorY: KAPPA,
      shearCorrectionFactorZ: KAPPA,
    },
    rzSensitivityParity: {
      maxAbsResidual: Math.max(...parityResidual.map(Math.abs)),
      maxRelativeError: Math.max(...parityRelative),
    },
    channels,
  };
}

function fitChannel(input) {
  const cols = input.dofNames.map((name) => input.sharedStart + DOFS.indexOf(name));
  const exported = input.dofNames.map((name) => input.exportedShared[DOFS.indexOf(name)]);
  const scales = input.actionIndices.map((index) =>
    Math.max(Math.abs(input.referenceAction[index]), ACTION_FLOORS[index]));
  const sensitivity = input.actionIndices.map((actionIndex, rowIndex) =>
    cols.map((col) => input.stiffness[actionIndex][col] / scales[rowIndex]));
  const normalizedResidual = input.actionIndices.map((actionIndex, rowIndex) =>
    input.exportedResidual[actionIndex] / scales[rowIndex]);
  const solved = weightedLeastSquaresCorrection(sensitivity, normalizedResidual);
  const corrected = normalizedResidual.map((value, rowIndex) =>
    value + dot(sensitivity[rowIndex], solved.delta));
  const inferred = Object.fromEntries(input.dofNames.map((name, index) => [name, exported[index] + solved.delta[index]]));
  return {
    dofs: input.dofNames,
    actionIndices: input.actionIndices,
    exported: Object.fromEntries(input.dofNames.map((name, index) => [name, exported[index]])),
    correction: Object.fromEntries(input.dofNames.map((name, index) => [name, solved.delta[index]])),
    inferred,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    correctedNormalizedResidualL2: Math.hypot(...corrected),
    correctedNormalizedMaxAbs: Math.max(...corrected.map(Math.abs)),
    rank: solved.rank,
    conditionNumber: solved.conditionNumber,
  };
}

function commonFit(entries, shared) {
  const channelName = entries[0].channelName;
  const definition = CHANNELS[channelName];
  const normal = zeroMatrix(definition.dofs.length);
  const rhs = new Array(definition.dofs.length).fill(0);
  const prepared = [];
  for (const { record } of entries) {
    const label = record.label;
    const source = reconstruction.inference[label];
    const row = label === 'E79' ? e79 : e80;
    const rigid = label === 'E79';
    const pointI = requireCoordinate(coordinates, row.FROM_NODE);
    const pointJ = requireCoordinate(coordinates, row.TO_NODE);
    const stiffness = sourceDerivedGlobalStiffness(row, pointI, pointJ, rigid).matrix;
    const start = record.sharedEnd === 'I' ? 0 : 6;
    const cols = definition.dofs.map((name) => start + DOFS.indexOf(name));
    const scales = definition.actions.map((index) =>
      Math.max(Math.abs(Number(source.referenceAction[index])), ACTION_FLOORS[index]));
    const A = definition.actions.map((actionIndex, rowIndex) =>
      cols.map((col) => stiffness[actionIndex][col] / scales[rowIndex]));
    const b = definition.actions.map((actionIndex, rowIndex) =>
      Number(source.exportedResidual[actionIndex]) / scales[rowIndex]);
    accumulateNormal(normal, rhs, A, b);
    prepared.push({ label, A, b });
  }
  const solved = solveNormal(normal, rhs.map((value) => -value));
  const exported = definition.dofs.map((name) => shared[DOFS.indexOf(name)]);
  let maxCorrectedNormalizedAbs = 0;
  const perElement = {};
  for (const item of prepared) {
    const corrected = item.b.map((value, rowIndex) => value + dot(item.A[rowIndex], solved.solution));
    maxCorrectedNormalizedAbs = Math.max(maxCorrectedNormalizedAbs, ...corrected.map(Math.abs));
    perElement[item.label] = {
      correctedNormalizedResidualL2: Math.hypot(...corrected),
      correctedNormalizedMaxAbs: Math.max(...corrected.map(Math.abs)),
    };
  }
  return {
    dofs: definition.dofs,
    correction: Object.fromEntries(definition.dofs.map((name, index) => [name, solved.solution[index]])),
    inferred: Object.fromEntries(definition.dofs.map((name, index) => [name, exported[index] + solved.solution[index]])),
    conditionNumber: solved.conditionNumber,
    rank: solved.rank,
    perElement,
    maxCorrectedNormalizedAbs,
    fixedExistingActionLimit: 0.1,
    status: maxCorrectedNormalizedAbs <= 0.1 ? 'PASS' : 'FAIL',
  };
}

function sourceDerivedGlobalStiffness(row, pointI, pointJ, rigid) {
  const delta = pointJ.map((value, index) => value - pointI[index]);
  const length = Math.hypot(...delta);
  const x = delta.map((value) => value / length);
  const reference = [0,0,1];
  const projection = dot(reference, x);
  const yRaw = reference.map((value, index) => value - projection * x[index]);
  const yNorm = Math.hypot(...yRaw);
  assert.ok(yNorm > 1e-12, `Source E${row.ELEMENTID} reference vector is parallel to local x.`);
  const y = yRaw.map((value) => value / yNorm);
  const z = cross(x, y);
  const axes = [x,y,z];

  const enteredOutside = Number(row.DIAMETER) * MM_TO_M;
  const enteredWall = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = enteredOutside - 2 * enteredWall;
  const wallThickness = rigid ? RIGID_WALL_MULTIPLIER * enteredWall : enteredWall;
  const outerDiameter = rigid ? innerDiameter + 2 * wallThickness : enteredOutside;
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  const polarMoment = 2 * secondMoment;
  const elasticModulus = Number(row.MODULUS) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  const shearModulus = elasticModulus / (2 * (1 + poissonRatio));
  const phiXY = 12 * elasticModulus * secondMoment / (shearModulus * KAPPA * area * length ** 2);
  const phiXZ = phiXY;
  const local = frameLocalStiffness({
    elasticModulus, shearModulus, area, secondMomentY: secondMoment,
    secondMomentZ: secondMoment, polarMoment, length, phiXY, phiXZ,
  });
  const transform = transformationMatrix(axes);
  return {
    matrix: multiply(transpose(transform), multiply(local, transform)),
    length, outerDiameter, innerDiameter, wallThickness, phiXY, phiXZ,
  };
}

function frameLocalStiffness(p) {
  const K = zeroMatrix(12);
  const sym = (i,j,value) => { K[i][j] = value; K[j][i] = value; };
  const axial = p.elasticModulus * p.area / p.length;
  sym(0,0,axial); sym(6,6,axial); sym(0,6,-axial);
  const torsion = p.shearModulus * p.polarMoment / p.length;
  sym(3,3,torsion); sym(9,9,torsion); sym(3,9,-torsion);
  const setBending = (uI,rI,uJ,rJ,I,phi,rotationSign) => {
    const a = 12 * p.elasticModulus * I / ((1 + phi) * p.length ** 3);
    const b = 6 * p.elasticModulus * I / ((1 + phi) * p.length ** 2);
    const c = (4 + phi) * p.elasticModulus * I / ((1 + phi) * p.length);
    const d = (2 - phi) * p.elasticModulus * I / ((1 + phi) * p.length);
    sym(uI,uI,a); sym(uI,uJ,-a); sym(rI,rI,c); sym(rI,rJ,d); sym(uJ,uJ,a); sym(rJ,rJ,c);
    sym(uI,rI,rotationSign * b);
    sym(uI,rJ,rotationSign * b);
    sym(rI,uJ,-rotationSign * b);
    sym(uJ,rJ,-rotationSign * b);
  };
  setBending(1,5,7,11,p.secondMomentZ,p.phiXY,+1);
  setBending(2,4,8,10,p.secondMomentY,p.phiXZ,-1);
  return K;
}

function weightedLeastSquaresCorrection(A, b) {
  const normal = zeroMatrix(A[0].length);
  const rhs = new Array(A[0].length).fill(0);
  accumulateNormal(normal, rhs, A, b);
  const solved = solveNormal(normal, rhs.map((value) => -value));
  return { delta: solved.solution, rank: solved.rank, conditionNumber: solved.conditionNumber };
}

function accumulateNormal(normal, rhs, A, b) {
  for (let row = 0; row < A.length; row += 1) {
    for (let i = 0; i < A[row].length; i += 1) {
      rhs[i] += A[row][i] * b[row];
      for (let j = 0; j < A[row].length; j += 1) normal[i][j] += A[row][i] * A[row][j];
    }
  }
}

function solveNormal(normal, rhs) {
  const n = rhs.length;
  if (n === 1) {
    assert.ok(normal[0][0] > 0, 'Scalar normal equation is singular.');
    return { solution: [rhs[0] / normal[0][0]], rank: 1, conditionNumber: 1 };
  }
  if (n !== 2) throw new TypeError('This diagnostic only solves one- and two-DOF channels.');
  const a = normal[0][0]; const b = normal[0][1]; const c = normal[1][1];
  const det = a * c - b * b;
  assert.ok(det > 0, `Two-DOF normal equation is singular or indefinite: det=${det}.`);
  const solution = [(c * rhs[0] - b * rhs[1]) / det, (-b * rhs[0] + a * rhs[1]) / det];
  const trace = a + c;
  const discriminant = Math.sqrt(Math.max(0, (a-c) ** 2 + 4 * b * b));
  const lambdaMax = 0.5 * (trace + discriminant);
  const lambdaMin = 0.5 * (trace - discriminant);
  assert.ok(lambdaMin > 0, 'Two-DOF sensitivity lost rank.');
  return { solution, rank: 2, conditionNumber: Math.sqrt(lambdaMax / lambdaMin) };
}

function agreement(left, right) {
  const mean = 0.5 * (left + right);
  const absoluteDifference = Math.abs(left - right);
  return {
    mean,
    absoluteDifference,
    relativeDifference: absoluteDifference / Math.max(Math.abs(mean), 1e-15),
  };
}

function sharedNodeDofs(rows, nodeId) {
  return DOFS.map((dof) => {
    const quantity = dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION';
    const row = rows.find((entry) => entry.entityKind === 'NODE'
      && String(entry.entityId) === String(nodeId)
      && entry.quantity === quantity && entry.component === dof);
    if (!row) throw new TypeError(`Missing ${nodeId}:${dof}.`);
    return Number(row.value);
  });
}

function sourceCoordinateIndex(rows) {
  const out = new Map();
  for (const row of rows) {
    setCoordinate(out, row.FROM_NODE, [row.FROM_NODE_X,row.FROM_NODE_Y,row.FROM_NODE_Z]);
    setCoordinate(out, row.TO_NODE, [row.TO_NODE_X,row.TO_NODE_Y,row.TO_NODE_Z]);
  }
  return out;
}
function setCoordinate(index, id, valuesMm) {
  const point = valuesMm.map((value) => Number(value) * MM_TO_M);
  const key = String(id);
  const prior = index.get(key);
  if (prior) assert.ok(Math.hypot(...prior.map((value, i) => value - point[i])) <= 1e-9, `Coordinate drift at ${key}.`);
  index.set(key, point);
}
function requireCoordinate(index, id) {
  const value = index.get(String(id));
  if (!value) throw new TypeError(`Missing coordinate ${id}.`);
  return value;
}
function requireSourceRow(index, id) {
  const value = index.get(String(id));
  if (!value) throw new TypeError(`Missing source element E${id}.`);
  return value;
}

function transformationMatrix(axes) {
  const T = zeroMatrix(12);
  for (let block = 0; block < 4; block += 1) {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) T[block*3+row][block*3+col] = axes[row][col];
    }
  }
  return T;
}
function zeroMatrix(n) { return Array.from({length:n}, () => new Array(n).fill(0)); }
function transpose(A) { return A[0].map((_v,j) => A.map((row) => row[j])); }
function multiply(A,B) {
  return A.map((row) => B[0].map((_v,j) => row.reduce((sum,value,k) => sum + value * B[k][j], 0)));
}
function dot(a,b) { return a.reduce((sum,value,index) => sum + value * b[index], 0); }
function cross(a,b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }

function requirePinnedInputs(packageValue, reconstructionValue) {
  assert.equal(packageValue?.schema, 'caesar-accdb-benchmark-package/v1');
  assert.equal(packageValue?.source?.sha256, EXPECTED_SOURCE_SHA256);
  assert.equal(packageValue?.cases?.find((entry) => entry.caseId === 'L19')?.formula, 'W+P1');
  assert.equal(reconstructionValue?.schema, 'lfea-issue947-node22130-two-sided-rz-reconstruction/v1');
  assert.equal(reconstructionValue?.sourceAccdbSha256, EXPECTED_SOURCE_SHA256);
  assert.equal(reconstructionValue?.caseId, 'L19');
}
function parseArgs(argv) {
  const out = { package: null, reconstruction: null, out: null };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]; const value = argv[i+1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') out.package = value;
    else if (key === '--reconstruction') out.reconstruction = value;
    else if (key === '--out') out.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return out;
}
